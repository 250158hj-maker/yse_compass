import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { deleteCommentAction, editCommentAction, listPresentationCommentsAction, postCommentAction, setCommentLikeAction, setPresentationLikeAction } from "@/lib/actions/comments";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// Server Action の薄い層だけを確かめる（規則は lib/data/comments.test.ts）。流儀は actions/submissions.test.ts と同じ。
const holder = vi.hoisted(() => ({ db: null as unknown as Record<string, unknown> }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => holder.db[key as string] }) }));

class Rollback extends Error {}

let client: PrismaClient;

beforeAll(() => {
  if (!process.env.DATABASE_URL) return;
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 10 }) });
});

afterAll(async () => {
  await client?.$disconnect();
});

beforeEach(() => {
  vi.mocked(auth).mockReset();
});

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

async function inTransaction(fn: (db: Tx) => Promise<void>) {
  try {
    await client.$transaction(async (tx) => {
      holder.db = tx as never;
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

function signInAs(user: { id: string; role: "teacher" | "student" } | null) {
  vi.mocked(auth).mockResolvedValue((user ? { user, expires: "" } : null) as never);
}

// 年度セットアップ → チーム 1 つ（メンバーをサインイン済みの生徒に結びつける）。発表会は公開前のまま。
async function setup(db: Tx, year: number) {
  const admin = { userId: "1", role: "teacher" } as const;
  const { id: fiscalYearId } = await setupFiscalYear(db, admin, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const team = await createTeam(db, admin, { classId: klass.id, name: `チーム${year}`, members: ["山田"] });
  const user = await db.user.create({ data: { email: `s${year}@example.invalid`, name: "山田", role: "student" } });
  await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
  const teacher = await db.user.create({ data: { email: `t${year}@example.invalid`, name: "先生", role: "teacher" } });
  return { teamId: team.id, occasionId: occasion.id, studentId: String(user.id), teacherId: String(teacher.id) };
}

describeDb("コメントの Server Action", () => {
  it("自チームの生徒は投稿・編集・削除・いいねでき、一覧に載る", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9961);
      signInAs({ id: s.studentId, role: "student" });
      const posted = await postCommentAction(s.teamId, s.occasionId, "最初のコメント");
      if (!posted.ok) throw new Error("post failed");
      expect(await editCommentAction(posted.data.id, "直した")).toEqual({ ok: true, data: null });
      expect(await setCommentLikeAction(posted.data.id, true)).toEqual({ ok: true, data: { liked: true, likeCount: 1 } });
      expect(await setPresentationLikeAction(s.teamId, s.occasionId, true)).toEqual({ ok: true, data: { liked: true, likeCount: 1 } });
      const list = await listPresentationCommentsAction(s.teamId, s.occasionId);
      if (!list.ok) throw new Error("list failed");
      expect(list.data.comments[0]).toMatchObject({ body: "直した", likeCount: 1, likedByMe: true });
      expect(list.data.comments[0].editedAt).not.toBeNull();
      expect(await deleteCommentAction(posted.data.id)).toEqual({ ok: true, data: null });
      expect(await db.comment.count({ where: { id: posted.data.id, isDeleted: true } })).toBe(1);
    });
  });

  it("未サインインは unauthenticated で、何も書かれない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9962);
      signInAs(null);
      const none = { ok: false, code: "unauthenticated" };
      expect(await listPresentationCommentsAction(s.teamId, s.occasionId)).toEqual(none);
      expect(await postCommentAction(s.teamId, s.occasionId, "本文")).toEqual(none);
      expect(await editCommentAction(1, "本文")).toEqual(none);
      expect(await deleteCommentAction(1)).toEqual(none);
      expect(await setPresentationLikeAction(s.teamId, s.occasionId, true)).toEqual(none);
      expect(await setCommentLikeAction(1, true)).toEqual(none);
      expect(await db.comment.count()).toBe(0);
    });
  });

  it("引数の形が不正なら invalid_input で、何も書かない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9963);
      signInAs({ id: s.studentId, role: "student" });
      const bad = { ok: false, code: "invalid_input" };
      expect(await postCommentAction("1" as never, s.occasionId, "本文")).toEqual(bad);
      expect(await postCommentAction(s.teamId, s.occasionId, null as never)).toEqual(bad);
      expect(await postCommentAction(s.teamId, s.occasionId, "本文", 0)).toEqual(bad);
      expect(await editCommentAction(1.5, "本文")).toEqual(bad);
      expect(await deleteCommentAction(0)).toEqual(bad);
      expect(await setPresentationLikeAction(s.teamId, s.occasionId, "yes" as never)).toEqual(bad);
      expect(await setCommentLikeAction(1, 1 as never)).toEqual(bad);
      expect(await db.comment.count()).toBe(0);
    });
  });

  it("規則違反はデータ層のコードで返る（聴く生徒の返信・見つからないコメント）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9964);
      await db.eventOccasion.update({ where: { id: s.occasionId }, data: { isPublished: true } });
      const outsider = await db.user.create({ data: { email: "o9964@example.invalid", name: "聴く人", role: "student" } });
      signInAs({ id: s.teacherId, role: "teacher" });
      const parent = await postCommentAction(s.teamId, s.occasionId, "先生の親コメント");
      if (!parent.ok) throw new Error("post failed");
      signInAs({ id: String(outsider.id), role: "student" });
      expect(await postCommentAction(s.teamId, s.occasionId, "返信", parent.data.id)).toEqual({ ok: false, code: "forbidden" });
      expect(await deleteCommentAction(2_000_000_000)).toEqual({ ok: false, code: "comment_not_found" });
    });
  });
});
