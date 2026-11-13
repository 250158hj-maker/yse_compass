"use server";

import { auth } from "@/auth";
import { isId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { CommentError, deleteComment, editComment, listPresentationComments, postComment, setCommentLike, setPresentationLike, type CommentErrorCode } from "@/lib/data/comments";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-9（コメント・いいね）・design/04-screen.md SC-12。規則と認可の本体は lib/data/comments.ts にある（一次防衛線）。ここは、サインイン済みのロールを取り出して渡し、
// CommentError を画面が扱える結果に直すだけの薄い層（lib/actions/submissions.ts と同じ形）。ロールはサインイン時にトークンへ載せた値で、解除の即時性は保証しない（H-30）。

export type CommentActionResult<T> = { ok: true; data: T } | { ok: false; code: CommentErrorCode | "unauthenticated" };

// 引数の形だけを確かめる（Server Action は画面の型を通らずに直接呼べるため）。値の規則はデータ層が確かめる。
async function run<T>(valid: boolean, fn: (actor: Actor) => Promise<T>): Promise<CommentActionResult<T>> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "unauthenticated" };
  if (!valid) return { ok: false, code: "invalid_input" };
  try {
    return { ok: true, data: await fn({ userId: session.user.id, role: session.user.role }) };
  } catch (e) {
    if (e instanceof CommentError) return { ok: false, code: e.code };
    throw e;
  }
}

export async function listPresentationCommentsAction(teamId: number, occasionId: number) {
  return run(isId(teamId) && isId(occasionId), (actor) => listPresentationComments(prisma, actor, teamId, occasionId));
}

export async function postCommentAction(teamId: number, occasionId: number, body: string, parentCommentId?: number | null) {
  const validParent = parentCommentId === undefined || parentCommentId === null || isId(parentCommentId);
  return run(isId(teamId) && isId(occasionId) && typeof body === "string" && validParent, (actor) => postComment(prisma, actor, teamId, occasionId, body, parentCommentId));
}

export async function editCommentAction(commentId: number, body: string) {
  return run(isId(commentId) && typeof body === "string", async (actor) => {
    await editComment(prisma, actor, commentId, body);
    return null;
  });
}

export async function deleteCommentAction(commentId: number) {
  return run(isId(commentId), async (actor) => {
    await deleteComment(prisma, actor, commentId);
    return null;
  });
}

export async function setPresentationLikeAction(teamId: number, occasionId: number, liked: boolean) {
  return run(isId(teamId) && isId(occasionId) && typeof liked === "boolean", (actor) => setPresentationLike(prisma, actor, teamId, occasionId, liked));
}

export async function setCommentLikeAction(commentId: number, liked: boolean) {
  return run(isId(commentId) && typeof liked === "boolean", (actor) => setCommentLike(prisma, actor, commentId, liked));
}
