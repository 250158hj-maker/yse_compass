import type { SlotActionResult } from "@/lib/actions/slots";

type Code = Extract<SlotActionResult<unknown>, { ok: false }>["code"];

// 公開・公開解除など、発表会と資料枠の操作が失敗したときの文言。ここに無いコードは、まとめて下の一般の文にする。
const GENERIC = "操作できませんでした。画面を読み込み直して、もう一度お試しください。";

const messages: Partial<Record<Code, string>> = {
  unauthenticated: "サインインが切れています。もう一度サインインしてください。",
  forbidden: "この操作は先生だけができます。",
  occasion_not_found: "発表会が見つかりません。画面を読み込み直してください。",
};

export function slotErrorMessage(code: Code): string {
  return messages[code] ?? GENERIC;
}
