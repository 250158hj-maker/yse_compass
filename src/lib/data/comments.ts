import type { PrismaClient } from "@/generated/prisma/client";
import { isId, parseId } from "@/lib/ids";
import { isMemberOf } from "@/lib/data/submissions";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-9（コメント・いいね）・design/04-screen.md SC-12（コメント投稿・返信スレッド・編集・削除・いいね）・decisions.md 2026-10-26（T-2 のうち編集・削除）・2026-11-05（ラベルは付けない）。
// 閲覧の可否は getPresentationDetail と同じ線引き: 先生は全年度／生徒は未アーカイブの年度だけ（外れたときは occasion_not_found。H-60 の先行方針）／公開前は先生と自チームの生徒だけ（H-45）。
// 認可の一次防衛線はここに置く（Server Action が先に弾いても、ここでも必ず確かめる）。先生は文脈判定を適用しない（ロールだけ。decisions.md 2026-09-26）。
// 先行方針（open-questions.md H-76。決着したら変わるのはここだけ）:
//   返信は 1 階層（親は最上位のコメントだけ）／削除済みのコメントには返信・編集・いいねができず、本文は返さない（行は消さない）／
//   本文は前後の空白を除いて 1〜2,000 字（字数は仮。UTF-16 の単位で数える）／自分のコメントや自チームへのいいねも制限しない／
//   公開前も、閲覧できる人（先生と自チームの生徒）は書ける。T-2 は先行方針を持たないので、T-2 が残す次の 3 点も、本項（H-76）の先行方針として置く:
//   アーカイブ済みの年度は、先生も含めて書き込めない／編集・削除の期間に期限は無い（年度をアーカイブするまで）／先生が削除した記録は持たない。
// 投稿者の表示名は users.name をそのまま返す。メンバー行の氏名（team_members.name）との関係は決まっていない（own-team.ts の注を参照）。ラベルは付けない（label は NULL のまま）。

type Db = Pick<PrismaClient, "presentation" | "teamMember" | "comment" | "presentationLike" | "commentLike">;

export type CommentErrorCode = "forbidden" | "invalid_input" | "occasion_not_found" | "comment_not_found" | "year_archived";

export class CommentError extends Error {
  constructor(readonly code: CommentErrorCode) {
    super(code);
    this.name = "CommentError";
  }
}

export const MAX_COMMENT_LENGTH = 2000;

type Context = { presentationId: number; isTeacher: boolean; isOwnTeam: boolean; isArchived: boolean; userId: number | null };

// その発表を、この主体が見られるか。見られれば、以降の判定に使う印を返す。
async function resolveContext(db: Db, actor: Actor, teamId: number, occasionId: number): Promise<Context> {
  if (actor.role !== "teacher" && actor.role !== "student") throw new CommentError("forbidden");
  if (!isId(teamId) || !isId(occasionId)) throw new CommentError("invalid_input");

  const presentation = await db.presentation.findUnique({
    where: { teamId_eventOccasionId: { teamId, eventOccasionId: occasionId } },
    select: { id: true, eventOccasion: { select: { isPublished: true, fiscalYear: { select: { isArchived: true } } } } },
  });
  if (!presentation) throw new CommentError("occasion_not_found");
  const isArchived = presentation.eventOccasion.fiscalYear.isArchived;
  const isTeacher = actor.role === "teacher";
  if (!isTeacher && isArchived) throw new CommentError("occasion_not_found");
  const isOwnTeam = !isTeacher && (await isMemberOf(db, actor, teamId));
  if (!isTeacher && !presentation.eventOccasion.isPublished && !isOwnTeam) throw new CommentError("forbidden");
  return { presentationId: presentation.id, isTeacher, isOwnTeam, isArchived, userId: parseId(actor.userId) };
}

// 書き込みには、実在する利用者の ID（FK）が要る。年度がアーカイブ済みなら、先生も書き込めない。
function requireWritable(ctx: Context): number {
  if (ctx.isArchived) throw new CommentError("year_archived");
  if (ctx.userId === null) throw new CommentError("forbidden");
  return ctx.userId;
}

function validBody(body: unknown): string {
  if (typeof body !== "string") throw new CommentError("invalid_input");
  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COMMENT_LENGTH) throw new CommentError("invalid_input");
  return trimmed;
}

// コメント ID から、その発表の文脈を引く。コメントが無ければ comment_not_found。あれば、発表を見られるかの判定（forbidden など）をここで通す。
async function resolveComment(db: Db, actor: Actor, commentId: number) {
  if (!isId(commentId)) throw new CommentError("invalid_input");
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, isDeleted: true, parentCommentId: true, presentation: { select: { teamId: true, eventOccasionId: true } } },
  });
  if (!comment) throw new CommentError("comment_not_found");
  const ctx = await resolveContext(db, actor, comment.presentation.teamId, comment.presentation.eventOccasionId);
  return { comment, ctx };
}

export async function listPresentationComments(db: Db, actor: Actor, teamId: number, occasionId: number) {
  const ctx = await resolveContext(db, actor, teamId, occasionId);
  // userId が null の主体は、いいねを付けていない（-1 はどの行にも当たらない）。
  const me = ctx.userId ?? -1;
  const canWrite = !ctx.isArchived && ctx.userId !== null;

  const [rows, presentationLikeCount, myPresentationLike] = await Promise.all([
    db.comment.findMany({
      where: { presentationId: ctx.presentationId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        parentCommentId: true,
        body: true,
        isDeleted: true,
        createdAt: true,
        editedAt: true,
        userId: true,
        user: { select: { name: true } },
        _count: { select: { likes: true } },
        likes: { where: { userId: me }, select: { id: true } },
      },
    }),
    db.presentationLike.count({ where: { presentationId: ctx.presentationId } }),
    db.presentationLike.findFirst({ where: { presentationId: ctx.presentationId, userId: me }, select: { id: true } }),
  ]);

  const toItem = (r: (typeof rows)[number], isTopLevel: boolean) => {
    const own = r.userId === ctx.userId;
    return {
      id: r.id,
      // 削除済みは、本文・投稿者名・いいねを返さない（「このコメントは削除されました」を出すだけ）。
      authorName: r.isDeleted ? null : r.user.name,
      body: r.isDeleted ? null : r.body,
      isDeleted: r.isDeleted,
      createdAt: r.createdAt,
      editedAt: r.isDeleted ? null : r.editedAt,
      likeCount: r.isDeleted ? 0 : r._count.likes,
      likedByMe: !r.isDeleted && r.likes.length > 0,
      canEdit: canWrite && !r.isDeleted && own,
      canDelete: canWrite && !r.isDeleted && (own || ctx.isTeacher),
      canLike: canWrite && !r.isDeleted,
      canReply: canWrite && isTopLevel && !r.isDeleted && (ctx.isTeacher || ctx.isOwnTeam),
    };
  };

  const topLevel = rows.filter((r) => r.parentCommentId === null);
  const comments = topLevel.map((t) => ({
    ...toItem(t, true),
    replies: rows.filter((r) => r.parentCommentId === t.id).map((r) => toItem(r, false)),
  }));

  return {
    presentation: { likeCount: presentationLikeCount, likedByMe: myPresentationLike !== null, canLike: canWrite },
    // 公開後の聴く生徒・自チーム・先生は、いずれも新規のコメントを投稿できる（返信は canReply）。
    canPost: canWrite,
    comments,
  };
}

export async function postComment(db: Db, actor: Actor, teamId: number, occasionId: number, body: string, parentCommentId?: number | null) {
  const ctx = await resolveContext(db, actor, teamId, occasionId);
  const text = validBody(body);
  const userId = requireWritable(ctx);

  let parentId: number | null = null;
  if (parentCommentId !== undefined && parentCommentId !== null) {
    if (!isId(parentCommentId)) throw new CommentError("invalid_input");
    // 返信できるのは、先生と自チームの生徒だけ（§3-9・SC-12 の 3 状態）。
    if (!ctx.isTeacher && !ctx.isOwnTeam) throw new CommentError("forbidden");
    const parent = await db.comment.findUnique({ where: { id: parentCommentId }, select: { presentationId: true, parentCommentId: true, isDeleted: true } });
    if (!parent) throw new CommentError("comment_not_found");
    // 返信の親は、同じ発表の最上位の、削除されていないコメントに限る（06 6-3 の注: アプリ層で守る）。
    if (parent.presentationId !== ctx.presentationId || parent.parentCommentId !== null || parent.isDeleted) throw new CommentError("invalid_input");
    parentId = parentCommentId;
  }

  const created = await db.comment.create({ data: { presentationId: ctx.presentationId, userId, parentCommentId: parentId, body: text }, select: { id: true } });
  return { id: created.id };
}

export async function editComment(db: Db, actor: Actor, commentId: number, body: string) {
  const { comment, ctx } = await resolveComment(db, actor, commentId);
  const text = validBody(body);
  const userId = requireWritable(ctx);
  if (comment.isDeleted) throw new CommentError("comment_not_found");
  if (comment.userId !== userId) throw new CommentError("forbidden");
  await db.comment.update({ where: { id: commentId }, data: { body: text, editedAt: new Date() } });
}

// 行は消さず、削除の印を付ける（返信は残る。decisions.md 2026-10-26）。削除済みへの 2 回目は、何もしない。
export async function deleteComment(db: Db, actor: Actor, commentId: number) {
  const { comment, ctx } = await resolveComment(db, actor, commentId);
  const userId = requireWritable(ctx);
  if (comment.userId !== userId && !ctx.isTeacher) throw new CommentError("forbidden");
  if (comment.isDeleted) return;
  await db.comment.update({ where: { id: commentId }, data: { isDeleted: true } });
}

// いいねの付け外しは、同じ操作を 2 回呼んでも結果が同じになる（付ける: あれば何もしない／外す: 無ければ何もしない）。
export async function setPresentationLike(db: Db, actor: Actor, teamId: number, occasionId: number, liked: boolean) {
  const ctx = await resolveContext(db, actor, teamId, occasionId);
  if (typeof liked !== "boolean") throw new CommentError("invalid_input");
  const userId = requireWritable(ctx);
  const where = { presentationId_userId: { presentationId: ctx.presentationId, userId } };
  if (liked) await db.presentationLike.upsert({ where, create: { presentationId: ctx.presentationId, userId }, update: {} });
  else await db.presentationLike.deleteMany({ where: { presentationId: ctx.presentationId, userId } });
  return { liked, likeCount: await db.presentationLike.count({ where: { presentationId: ctx.presentationId } }) };
}

export async function setCommentLike(db: Db, actor: Actor, commentId: number, liked: boolean) {
  const { comment, ctx } = await resolveComment(db, actor, commentId);
  if (typeof liked !== "boolean") throw new CommentError("invalid_input");
  const userId = requireWritable(ctx);
  if (comment.isDeleted) throw new CommentError("comment_not_found");
  const where = { commentId_userId: { commentId, userId } };
  if (liked) await db.commentLike.upsert({ where, create: { commentId, userId }, update: {} });
  else await db.commentLike.deleteMany({ where: { commentId, userId } });
  return { liked, likeCount: await db.commentLike.count({ where: { commentId } }) };
}
