import type { SubmissionActionResult } from "@/lib/actions/submissions";

type Code = Extract<SubmissionActionResult<unknown>, { ok: false }>["code"];

// 概要の保存（SC-10）の Action が返す失敗の印を、画面に出す日本語にする。資料の提出（SC-09）と同じ印を使うが、意味が違う
// （invalid_input は、リンクの形式ではなく、自由な欄の見出しなど）ので、文言は別に持つ。値の規則と認可は、データ層（lib/data/summaries.ts）が持つ。
const messages: Record<Code, string> = {
  unauthenticated: "サインインが切れています。もう一度サインインしてください。",
  forbidden: "この操作は発表する生徒（自チームのメンバー）のみ行えます。",
  invalid_input: "入力を確かめてください（自由な欄の見出しは空にできません）。",
  slot_not_found: "概要の枠が見つかりません。画面を読み込み直してください。",
  occasion_not_found: "発表会が見つかりません。画面を読み込み直してください。",
  summary_slot: "概要の保存で、予期しない状態になりました。画面を読み込み直してください。",
  year_archived: "年度がアーカイブ済みのため、提出・更新はできません。",
  empty_summary: "すべての欄が空です。1 つ以上の欄を入力してください。",
};

export function summaryErrorMessage(code: Code): string {
  return messages[code];
}
