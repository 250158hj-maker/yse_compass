import type { TimetableActionResult } from "@/lib/actions/timetable";

type Code = Extract<TimetableActionResult<unknown>, { ok: false }>["code"];

// タイムテーブルの Action が返す失敗の印を、画面に出す日本語にする。規則と認可は、データ層（lib/data/timetable.ts）が持つ。
const messages: Record<Code, string> = {
  unauthenticated: "サインインが切れています。もう一度サインインしてください。",
  forbidden: "この操作は先生のみ行えます。",
  invalid_input: "入力を確かめてください。",
  occasion_not_found: "発表会が見つかりません。画面を読み込み直してください。",
  presentation_not_found: "発表が見つかりません。画面を読み込み直してください。",
  presentation_locked: "発表中と、それより前の行は動かせません。画面を読み込み直してください。",
  duplicate_order: "発表順が重なりました。画面を読み込み直してください。",
};

export function timetableErrorMessage(code: Code): string {
  return messages[code];
}
