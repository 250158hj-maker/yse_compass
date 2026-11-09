import type { AppUser } from "@/lib/types";

// ログイン切り替えの検証観点を先生と生徒の 2 つに絞るため、アカウントはこの 2 件のみを保持する。
// 生徒の「提出する／閲覧する」は、モックの人物では分けない（本実装では、チームへの登録で決まるため）。
// チーム・コメント等のモックデータ(mock/teams.ts, mock/submissions.ts等)は氏名を文字列として
// 保持しており本配列のidを参照しないため、アカウント数を絞っても他データには影響しない。
export const users: AppUser[] = [
  { id: "user-tominaga", name: "冨永先生", role: "teacher", className: null, teamId: null },
  { id: "user-mito", name: "水戸匠", role: "student", className: "IG21", teamId: "team-cheers" },
];
