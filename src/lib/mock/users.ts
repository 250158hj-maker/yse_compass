import type { AppUser } from "@/lib/types";

// ログイン切り替えの検証観点を3ロールに絞るため、アカウントはこの3件のみを保持する。
// チーム・コメント等のモックデータ(mock/teams.ts, mock/submissions.ts等)は氏名を文字列として
// 保持しており本配列のidを参照しないため、アカウント数を絞っても他データには影響しない。
export const users: AppUser[] = [
  { id: "user-tominaga", name: "冨永先生", role: "teacher", className: null, teamId: null },
  { id: "user-mito", name: "水戸匠", role: "student", className: "IG21", teamId: "team-cheers" },
  { id: "user-viewer", name: "野村あかり", role: "student", className: "IG22", teamId: null },
];
