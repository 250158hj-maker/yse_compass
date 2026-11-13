import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { deleteComment, editComment, listPresentationComments, MAX_COMMENT_LENGTH, postComment, setCommentLike, setPresentationLike } from "@/lib/data/comments";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は presentation-detail.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。

type Db = Parameters<typeof listPresentationComments>[0] & Parameters<typeof createTeam>[0] & Parameters<typeof setupFiscalYear>[0] & Pick<PrismaClient, "user" | "fiscalYear" | "eventOccasion" | "$transaction">;

class Rollback extends Error {}

let prisma: PrismaClient;

beforeAll(() => {
  if (!process.env.DATABASE_URL) return;
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 10 }) });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

async function inTransaction(fn: (db: Db) => Promise<void>) {
  try {
    await prisma.$transaction(async (tx) => {
      await fn(tx as unknown as Db);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

const admin: Actor = { userId: "1", role: "teacher" };

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "CommentError", code });
}

// 年度を作り、チーム 2 つ（それぞれメンバー 1 人をサインイン済みの生徒に結びつける）と、先生の利用者を用意する。発表会は公開前のまま。
async function setup(db: Db, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, admin, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const make = async (name: string, email: string) => {
    const team = await createTeam(db, admin, { classId: klass.id, name, members: ["山田", "鈴木"] });
    const user = await db.user.create({ data: { email, name: `${name}の生徒`, role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    return { teamId: team.id, actor: { userId: String(user.id), role: "student" } as Actor };
  };
  const own = await make(`チームA${year}`, `a${year}@example.invalid`);
  const other = await make(`チームB${year}`, `b${year}@example.invalid`);
  const teacherUser = await db.user.create({ data: { email: `t${year}@example.invalid`, name: "先生", role: "teacher" } });
  const teacher: Actor = { userId: String(teacherUser.id), role: "teacher" };
  return { occasionId: occasion.id, own, other, teacher, publish: () => db.eventOccasion.update({ where: { id: occasion.id }, data: { isPublished: true } }) };
}

describeDb("コメントの閲覧と投稿", () => {
  it("公開前は先生と自チームの生徒だけが見て投稿でき、聴く生徒（別チーム）は forbidden", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9941);
      await postComment(db, s.own.actor, s.own.teamId, s.occasionId, "自チームから");
      await postComment(db, s.teacher, s.own.teamId, s.occasionId, "先生から");
      const forTeacher = await listPresentationComments(db, s.teacher, s.own.teamId, s.occasionId);
      expect(forTeacher.comments.map((c) => c.body)).toEqual(["自チームから", "先生から"]);
      expect((await listPresentationComments(db, s.own.actor, s.own.teamId, s.occasionId)).comments).toHaveLength(2);
      await expectError(listPresentationComments(db, s.other.actor, s.own.teamId, s.occasionId), "forbidden");
      await expectError(postComment(db, s.other.actor, s.own.teamId, s.occasionId, "入れない"), "forbidden");
    });
  });

  it("公開後は聴く生徒も投稿できるが、返信はできない。自チームと先生は返信できる", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9942);
      await s.publish();
      const { id } = await postComment(db, s.other.actor, s.own.teamId, s.occasionId, "感想です");
      await expectError(postComment(db, s.other.actor, s.own.teamId, s.occasionId, "返信", id), "forbidden");
      await postComment(db, s.own.actor, s.own.teamId, s.occasionId, "ありがとう", id);
      await postComment(db, s.teacher, s.own.teamId, s.occasionId, "よかった", id);
      const list = await listPresentationComments(db, s.other.actor, s.own.teamId, s.occasionId);
      expect(list.comments).toHaveLength(1);
      expect(list.comments[0]).toMatchObject({ authorName: "チームB9942の生徒", canReply: false, canEdit: true, canDelete: true });
      expect(list.comments[0].replies.map((r) => r.body)).toEqual(["ありがとう", "よかった"]);
      const forOwn = await listPresentationComments(db, s.own.actor, s.own.teamId, s.occasionId);
      expect(forOwn.comments[0]).toMatchObject({ canReply: true, canEdit: false, canDelete: false });
      expect(forOwn.comments[0].replies[0]).toMatchObject({ canReply: false, canEdit: true });
    });
  });

  it("返信の親は、同じ発表の・最上位の・削除されていないコメントに限る。ラベルは付かない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9943);
      await s.publish();
      const parent = await postComment(db, s.own.actor, s.own.teamId, s.occasionId, "親");
      const reply = await postComment(db, s.own.actor, s.own.teamId, s.occasionId, "返信", parent.id);
      await expectError(postComment(db, s.own.actor, s.own.teamId, s.occasionId, "返信への返信", reply.id), "invalid_input");
      const elsewhere = await postComment(db, s.other.actor, s.other.teamId, s.occasionId, "別の発表");
      await expectError(postComment(db, s.own.actor, s.own.teamId, s.occasionId, "越境", elsewhere.id), "invalid_input");
      await expectError(postComment(db, s.own.actor, s.own.teamId, s.occasionId, "親なし", 2_000_000_000), "comment_not_found");
      await deleteComment(db, s.own.actor, parent.id);
      await expectError(postComment(db, s.own.actor, s.own.teamId, s.occasionId, "削除済みへ", parent.id), "invalid_input");
      expect((await db.comment.findUniqueOrThrow({ where: { id: parent.id } })).label).toBeNull();
    });
  });

  it("本文は前後の空白を除き、空・長すぎるものは invalid_input", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9944);
      await postComment(db, s.own.actor, s.own.teamId, s.occasionId, "  前後に空白  ");
      expect((await listPresentationComments(db, s.own.actor, s.own.teamId, s.occasionId)).comments[0].body).toBe("前後に空白");
      await expectError(postComment(db, s.own.actor, s.own.teamId, s.occasionId, "   "), "invalid_input");
      await expectError(postComment(db, s.own.actor, s.own.teamId, s.occasionId, "あ".repeat(MAX_COMMENT_LENGTH + 1)), "invalid_input");
      await postComment(db, s.own.actor, s.own.teamId, s.occasionId, "あ".repeat(MAX_COMMENT_LENGTH));
    });
  });

  it("ロールが不明・利用者に結びつかない・引数が不正・発表が無いときは拒む", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9945);
      await expectError(listPresentationComments(db, { userId: "1", role: "other" as never }, s.own.teamId, s.occasionId), "forbidden");
      await expectError(postComment(db, { userId: "abc", role: "teacher" }, s.own.teamId, s.occasionId, "本文"), "forbidden");
      await expectError(listPresentationComments(db, s.teacher, 0, s.occasionId), "invalid_input");
      await expectError(listPresentationComments(db, s.teacher, s.own.teamId, 2_000_000_000), "occasion_not_found");
    });
  });
});

describeDb("コメントの編集・削除", () => {
  it("編集できるのは投稿者本人だけで、編集日時が入る。削除済みは編集できない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9946);
      await s.publish();
      const { id } = await postComment(db, s.other.actor, s.own.teamId, s.occasionId, "元の本文");
      await expectError(editComment(db, s.own.actor, id, "他人の編集"), "forbidden");
      await expectError(editComment(db, s.teacher, id, "先生の編集"), "forbidden");
      expect((await db.comment.findUniqueOrThrow({ where: { id } })).editedAt).toBeNull();
      await editComment(db, s.other.actor, id, "直した本文");
      const row = await db.comment.findUniqueOrThrow({ where: { id } });
      expect(row.body).toBe("直した本文");
      expect(row.editedAt).not.toBeNull();
      await deleteComment(db, s.other.actor, id);
      await expectError(editComment(db, s.other.actor, id, "削除後"), "comment_not_found");
      await expectError(editComment(db, s.other.actor, id, ""), "invalid_input");
    });
  });

  it("削除は投稿者と先生だけ。行は残り、返信も残り、本文・投稿者名・いいねは返さない。2 回目は何もしない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9947);
      await s.publish();
      const { id } = await postComment(db, s.other.actor, s.own.teamId, s.occasionId, "消される本文");
      await postComment(db, s.own.actor, s.own.teamId, s.occasionId, "残る返信", id);
      await setCommentLike(db, s.own.actor, id, true);
      await expectError(deleteComment(db, s.own.actor, id), "forbidden");
      await deleteComment(db, s.teacher, id);
      await deleteComment(db, s.teacher, id);
      expect((await db.comment.findUniqueOrThrow({ where: { id } })).isDeleted).toBe(true);
      const list = await listPresentationComments(db, s.own.actor, s.own.teamId, s.occasionId);
      expect(list.comments[0]).toMatchObject({ id, isDeleted: true, body: null, authorName: null, editedAt: null, likeCount: 0, likedByMe: false, canEdit: false, canDelete: false, canLike: false, canReply: false });
      expect(list.comments[0].replies.map((r) => r.body)).toEqual(["残る返信"]);
    });
  });

  it("存在しないコメントは comment_not_found。見られない発表のコメントは forbidden", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9948);
      const { id } = await postComment(db, s.own.actor, s.own.teamId, s.occasionId, "公開前");
      await expectError(deleteComment(db, s.teacher, 2_000_000_000), "comment_not_found");
      await expectError(deleteComment(db, s.teacher, 0), "invalid_input");
      await expectError(deleteComment(db, s.other.actor, id), "forbidden");
      await expectError(setCommentLike(db, s.other.actor, id, true), "forbidden");
    });
  });
});

describeDb("いいね", () => {
  it("発表へのいいねは、付ける・外すとも 2 回呼んでも結果が同じで、件数と likedByMe に出る", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9949);
      await s.publish();
      expect(await setPresentationLike(db, s.other.actor, s.own.teamId, s.occasionId, true)).toEqual({ liked: true, likeCount: 1 });
      expect(await setPresentationLike(db, s.other.actor, s.own.teamId, s.occasionId, true)).toEqual({ liked: true, likeCount: 1 });
      expect(await setPresentationLike(db, s.teacher, s.own.teamId, s.occasionId, true)).toEqual({ liked: true, likeCount: 2 });
      expect((await listPresentationComments(db, s.other.actor, s.own.teamId, s.occasionId)).presentation).toEqual({ likeCount: 2, likedByMe: true, canLike: true });
      expect(await setPresentationLike(db, s.other.actor, s.own.teamId, s.occasionId, false)).toEqual({ liked: false, likeCount: 1 });
      expect(await setPresentationLike(db, s.other.actor, s.own.teamId, s.occasionId, false)).toEqual({ liked: false, likeCount: 1 });
      expect((await listPresentationComments(db, s.other.actor, s.own.teamId, s.occasionId)).presentation.likedByMe).toBe(false);
      await expectError(setPresentationLike(db, s.other.actor, s.own.teamId, s.occasionId, "yes" as never), "invalid_input");
    });
  });

  it("コメントへのいいねも同じ。自分のコメントにも付けられる", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9950);
      await s.publish();
      const { id } = await postComment(db, s.other.actor, s.own.teamId, s.occasionId, "いいねされる");
      expect(await setCommentLike(db, s.other.actor, id, true)).toEqual({ liked: true, likeCount: 1 });
      expect(await setCommentLike(db, s.own.actor, id, true)).toEqual({ liked: true, likeCount: 2 });
      expect(await setCommentLike(db, s.own.actor, id, true)).toEqual({ liked: true, likeCount: 2 });
      const [c] = (await listPresentationComments(db, s.own.actor, s.own.teamId, s.occasionId)).comments;
      expect(c).toMatchObject({ likeCount: 2, likedByMe: true });
      expect(await setCommentLike(db, s.own.actor, id, false)).toEqual({ liked: false, likeCount: 1 });
      await deleteComment(db, s.other.actor, id);
      await expectError(setCommentLike(db, s.own.actor, id, true), "comment_not_found");
    });
  });
});

describeDb("アーカイブ済みの年度", () => {
  it("生徒は読めず（occasion_not_found）、先生は読めるが書き込めない（year_archived）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9951);
      await s.publish();
      const { id } = await postComment(db, s.other.actor, s.own.teamId, s.occasionId, "アーカイブ前");
      await db.fiscalYear.update({ where: { year: 9951 }, data: { isArchived: true } });
      await expectError(listPresentationComments(db, s.other.actor, s.own.teamId, s.occasionId), "occasion_not_found");
      await expectError(postComment(db, s.own.actor, s.own.teamId, s.occasionId, "書けない"), "occasion_not_found");
      const forTeacher = await listPresentationComments(db, s.teacher, s.own.teamId, s.occasionId);
      expect(forTeacher.comments[0]).toMatchObject({ body: "アーカイブ前", canDelete: false, canLike: false, canReply: false });
      expect(forTeacher).toMatchObject({ canPost: false, presentation: { canLike: false } });
      await expectError(postComment(db, s.teacher, s.own.teamId, s.occasionId, "先生も書けない"), "year_archived");
      await expectError(deleteComment(db, s.teacher, id), "year_archived");
      await expectError(setPresentationLike(db, s.teacher, s.own.teamId, s.occasionId, true), "year_archived");
    });
  });
});
