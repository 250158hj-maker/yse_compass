import type { SubmissionActionResult } from "@/lib/actions/submissions";

type Code = Extract<SubmissionActionResult<unknown>, { ok: false }>["code"];

// 提出・概要の Action が返す失敗の印を、画面に出す日本語にする。値の規則と認可は、データ層（lib/data/submissions.ts など）が持つ。
const messages: Record<Code, string> = {
  unauthenticated: "サインインが切れています。もう一度サインインしてください。",
  forbidden: "この操作は発表する生徒（自チームのメンバー）のみ行えます。",
  invalid_input: "https:// で始まる正しいURLを入力してください。",
  slot_not_found: "資料枠が見つかりません。画面を読み込み直してください。",
  occasion_not_found: "発表会が見つかりません。画面を読み込み直してください。",
  summary_slot: "概要は、概要入力の画面から提出してください。",
  year_archived: "年度がアーカイブ済みのため、提出・差し替えはできません。",
  empty_summary: "入力を確かめてください。",
};

export function submissionErrorMessage(code: Code): string {
  return messages[code];
}
