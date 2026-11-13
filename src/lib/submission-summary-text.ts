import type { OccasionSubmissionSummary } from "@/lib/data/submission-summary";

// 提出状況サマリ（SC-02（先生）・SC-03）の文言。2 つの画面が同じ言い方で出すよう、ここ 1 か所に置く。
// 文言と置き場所は、実装の PR が決める（decisions.md 2026-10-30・H-66 の ②）。数えられないとき（チーム 0 件・必須の資料枠が 0 件）は、数を出さず、理由を示す。
// 判定は関数（getSubmissionSummaries）が行う。ここは、返った結果の種類ごとに、文言を選ぶだけ。
const LABEL = "提出完了";

// 数の意味（マウスを載せたときの補助。スマホでは出ないので、補助にとどめる）。
export const SUBMISSION_SUMMARY_HINT = "必須の資料がすべて提出済みのチームの数";

export function submissionSummaryText(s: OccasionSubmissionSummary | undefined): string {
  if (!s) return "";
  if (s.kind === "no_teams") return `${LABEL} ― チーム未登録`;
  if (s.kind === "no_required_slots") return `${LABEL} ― 必須の資料枠なし`;
  return `${LABEL} ${s.submittedTeams} / ${s.totalTeams} チーム`;
}
