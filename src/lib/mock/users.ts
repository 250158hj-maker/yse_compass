import type { AppUser } from "@/lib/types";

export const users: AppUser[] = [
  { id: "user-tominaga", name: "冨永先生", role: "teacher", className: null, teamId: null },
  { id: "user-watanabe", name: "渡部先生", role: "teacher", className: null, teamId: null },

  { id: "user-mito", name: "水戸匠", role: "student", className: "3年A組", teamId: "team-cheers" },
  { id: "user-suzuki", name: "鈴木和明", role: "student", className: "3年A組", teamId: "team-cheers" },
  { id: "user-kabayama", name: "蒲山由梨花", role: "student", className: "3年A組", teamId: "team-cheers" },

  { id: "user-yamada", name: "山田太郎", role: "student", className: "3年B組", teamId: "team-nova" },
  { id: "user-sato", name: "佐藤花子", role: "student", className: "3年B組", teamId: "team-nova" },

  { id: "user-tanaka", name: "田中一郎", role: "student", className: "3年C組", teamId: "team-lumen" },
  { id: "user-takahashi", name: "高橋美咲", role: "student", className: "3年C組", teamId: "team-lumen" },
  { id: "user-ito", name: "伊藤健", role: "student", className: "3年C組", teamId: "team-lumen" },
];
