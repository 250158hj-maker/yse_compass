import type { CommentActionResult } from "@/lib/actions/comments";

type Code = Extract<CommentActionResult<unknown>, { ok: false }>["code"];

// コメント・いいね（SC-12）の失敗を、画面に出す日本語にする。コードの種類は lib/data/comments.ts の CommentErrorCode と Action の unauthenticated。
// invalid_input の「1〜2,000 字」は H-76 の先行方針の値（字数は仮）。決着して変わったら、ここも直す。
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
