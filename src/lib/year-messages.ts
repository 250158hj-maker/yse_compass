import type { YearActionResult } from "@/lib/actions/years";

type Code = Extract<YearActionResult<unknown>, { ok: false }>["code"];

const messages: Record<Code, string> = {
  unauthenticated: "サインインが切れています。もう一度サインインしてください。",
  forbidden: "この操作は先生だけができます。",
  invalid_input: "入力を確かめてください（年度は西暦 4 桁、クラス名は空にできず、50 字までで、重複もできません）。",
  duplicate_year: "同じ年度がすでにあります。",
  duplicate_class: "同じ名前のクラスがすでにあります。名前を入れ替える・順に変えるときは、保存を 2 回に分けてください。",
  year_not_found: "年度が見つかりません。画面を読み込み直してください。",
};

export function yearErrorMessage(code: Code): string {
  return messages[code];
}
