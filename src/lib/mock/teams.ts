import type { Team } from "@/lib/types";

export const teams: Team[] = [
  // --- 2026年度(進行中) ---
  {
    id: "team-cheers",
    yearId: "year-2026",
    name: "Cheers",
    projectTitle: "YSE Compass",
    className: "3年A組",
    members: ["水戸匠", "鈴木和明", "蒲山由梨花"],
    leaderName: "水戸匠",
    summary:
      "卒業制作の発表会運営を効率化し、成果を学校の資産として蓄積するプラットフォーム。提出状況の一元管理と、発表への反応の可視化を目指す。",
    publishPermission: "未設定",
  },
  {
    id: "team-nova",
    yearId: "year-2026",
    name: "Nova",
    projectTitle: "学校行事タイムライン共有アプリ",
    className: "3年B組",
    members: ["山田太郎", "佐藤花子"],
    leaderName: "山田太郎",
    summary: "学校行事の当日進行をリアルタイムに共有し、タイムテーブル管理の手作業をなくすアプリ。",
    publishPermission: "未設定",
  },
  {
    id: "team-lumen",
    yearId: "year-2026",
    name: "Lumen",
    projectTitle: "部活動記録アーカイブシステム",
    className: "3年C組",
    members: ["田中一郎", "高橋美咲", "伊藤健"],
    leaderName: "田中一郎",
    summary: "部活動の活動記録・成果物を年度をまたいで蓄積し、後輩が参照できるアーカイブシステム。",
    publishPermission: "未設定",
  },

  // --- 2025年度(アーカイブ済み) ---
  {
    id: "team-orbit",
    yearId: "year-2025",
    name: "Orbit",
    projectTitle: "図書室蔵書検索アプリ",
    className: "3年A組",
    members: ["中村悠", "小林葵"],
    leaderName: "中村悠",
    summary: "図書室の蔵書を横断検索し、貸出状況を可視化するアプリ。司書の在庫確認業務を削減する。",
    publishPermission: "許可",
  },
  {
    id: "team-sprout",
    yearId: "year-2025",
    name: "Sprout",
    projectTitle: "委員会活動記録ノート",
    className: "3年B組",
    members: ["渡辺陸", "斎藤美月", "森田蓮"],
    leaderName: "渡辺陸",
    summary: "各委員会の活動記録を月次でまとめ、次年度の引き継ぎ資料として残すノートアプリ。",
    publishPermission: "拒否",
  },
  {
    id: "team-drift",
    yearId: "year-2025",
    name: "Drift",
    projectTitle: "文化祭シフト管理ツール",
    className: "3年C組",
    members: ["清水悠真"],
    leaderName: "清水悠真",
    summary: "文化祭の模擬店シフトを自動割り当てし、希望調整の手作業を減らすツール。",
    publishPermission: "未設定",
  },
];
