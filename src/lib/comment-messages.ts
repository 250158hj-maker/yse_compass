import type { CommentActionResult } from "@/lib/actions/comments";

type Code = Extract<CommentActionResult<unknown>, { ok: false }>["code"];

// コメント・いいね（SC-12）の失敗を、画面に出す日本語にする。コードの種類は lib/data/comments.ts の CommentErrorCode と Action の unauthenticated。
// invalid_input の「1〜2,000 字」は decisions.md 2026-11-19 で決めた本文の字数。字数を変えるときは、lib/data/comments.ts の MAX_COMMENT_LENGTH と、ここを一緒に直す。
const messages: Record<Code, string> = {
  unauthenticated: "サインインが切れています。もう一度サインインしてください。",
  forbidden: "この操作はできません。",
  invalid_input: "コメントは 1〜2,000 字で入力してください（空白だけは送れません）。",
  occasion_not_found: "この発表が見つかりません。画面を読み込み直してください。",
  comment_not_found: "このコメントはすでに削除されたか、見つかりません。画面を読み込み直してください。",
  year_archived: "アーカイブ済みの年度のため、書き込めません。",
};

export function commentErrorMessage(code: Code): string {
  return messages[code];
}
