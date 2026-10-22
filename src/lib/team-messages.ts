import type { TeamActionResult } from "@/lib/actions/teams";

type Code = Extract<TeamActionResult<unknown>, { ok: false }>["code"];

const messages: Record<Code, string> = {
  unauthenticated: "サインインが切れています。もう一度サインインしてください。",
  forbidden: "この操作は先生だけができます。",
  invalid_input: "入力を確かめてください（チーム名・氏名は空にできません）。",
  class_not_found: "選んだクラスが見つかりません。画面を読み込み直してください。",
  year_archived: "アーカイブ済みの年度には、チームを作れません。",
  team_not_found: "チームが見つかりません。画面を読み込み直してください。",
  member_not_found: "メンバーが見つかりません。画面を読み込み直してください。",
  duplicate_team_name: "同じクラスに、同じ名前のチームがあります。",
  leader_not_in_team: "リーダーにできるのは、そのチームのメンバーだけです。",
};

export function teamErrorMessage(code: Code): string {
  return messages[code];
}
