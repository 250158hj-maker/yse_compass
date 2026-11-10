import type { SlotActionResult } from "@/lib/actions/slots";

type Code = Extract<SlotActionResult<unknown>, { ok: false }>["code"];

// 公開・公開解除・日程と資料枠の編集など、発表会と資料枠の操作が失敗したときの文言。ここに無いコードは、まとめて下の一般の文にする。
const GENERIC = "操作できませんでした。画面を読み込み直して、もう一度お試しください。";

const messages: Partial<Record<Code, string>> = {
  unauthenticated: "サインインが切れています。もう一度サインインしてください。",
  forbidden: "この操作は先生だけができます。",
  occasion_not_found: "発表会が見つかりません。画面を読み込み直してください。",
  slot_not_found: "資料枠が見つかりません。画面を読み込み直してください。",
  invalid_input: "入力を確かめてください。種類は空にできません。リンクは https:// で始まる形で入力してください。",
  summary_slot_exists: "概要の枠は、1 つの発表会に 1 つだけです。",
  summary_slot_locked: "概要の枠は、種類を変えることも、削除することもできません。",
  slot_has_submissions: "すでに提出がある資料枠は削除できません。",
};

export function slotErrorMessage(code: Code): string {
  return messages[code] ?? GENERIC;
}
