import type { Material, Submission } from "@/lib/types";

function material(
  id: string,
  name: string,
  status: Material["status"],
  updatedAt: string | null,
  driveUrl: string | null,
): Material {
  return { id, name, status, updatedAt, driveUrl };
}

const noMaterial = (id: string, name: string) => material(id, name, "未提出", null, null);

export const submissions: Submission[] = [
  // ============ 2026年度 / 企画(終了・公開済み) ============
  {
    announcementId: "kikaku",
    teamId: "team-cheers",
    likeCount: 9,
    materials: [
      material("kikaku-cheers-1", "企画書", "提出済み", "2026-07-15 13:00", "https://drive.google.com/mock/cheers-kikaku-plan"),
      material("kikaku-cheers-2", "発表スライド", "提出済み", "2026-07-16 09:30", "https://drive.google.com/mock/cheers-kikaku-slide"),
    ],
    summary: {
      background: "発表会運営が冨永先生の手作業(スプレッドシート)に依存し、提出確認・タイムテーブル整形に工数がかかっている。",
      techUsed: ["Next.js", "TypeScript", "Tailwind CSS"],
      opening: "卒業制作の発表会運営を効率化し、成果を学校の資産として蓄積したい。",
      closing: "提出状況の一元管理と発表への反応の可視化を軸に、来年度以降も使える運営基盤を作る。",
      onePageBody:
        "YSE Compassは、発表会の資料提出・公開・コメントを一元管理するプラットフォーム。ファイル実体は持たずリンク管理に徹し、Google Drive運用を継承する。",
      submittedAt: "2026-07-16 09:40",
    },
    comments: [
      {
        id: "kikaku-cheers-c1",
        authorName: "生徒C",
        label: "感想",
        body: "運営側の負荷に着目した企画で説得力がありました。背景の説明が分かりやすかったです。",
        likeCount: 6,
        postedAt: "2026-07-16 15:00",
        replies: [
          {
            id: "kikaku-cheers-c1-r1",
            authorName: "水戸匠",
            authorRole: "presenter",
            body: "ありがとうございます。設計フェーズでは提出状況の見せ方をもっと詰めていきます。",
            postedAt: "2026-07-16 15:40",
          },
        ],
      },
      {
        id: "kikaku-cheers-c2",
        authorName: "生徒D",
        label: "批評",
        body: "生徒側の心理的障壁の解消がどう実現されるのか、次のフェーズでもっと知りたいです。",
        likeCount: 2,
        postedAt: "2026-07-16 16:20",
        replies: [],
      },
    ],
  },
  {
    announcementId: "kikaku",
    teamId: "team-nova",
    likeCount: 4,
    materials: [
      material("kikaku-nova-1", "企画書", "提出済み", "2026-07-14 17:20", "https://drive.google.com/mock/nova-kikaku-plan"),
      material("kikaku-nova-2", "発表スライド", "提出済み", "2026-07-15 20:00", "https://drive.google.com/mock/nova-kikaku-slide"),
    ],
    summary: {
      background: "学校行事のタイムテーブル変更が当日その場でしか共有されず、生徒に伝わりにくい。",
      techUsed: ["React Native", "Firebase"],
      opening: "行事の進行状況をスマホでリアルタイムに確認できるようにしたい。",
      closing: "タイムテーブル管理の手作業をなくし、行事委員の負担を減らす。",
      onePageBody: "学校行事の当日進行をリアルタイムに共有するアプリ。行事委員が進行状況を更新し、生徒がスマホで確認できる。",
      submittedAt: "2026-07-15 20:10",
    },
    comments: [
      {
        id: "kikaku-nova-c1",
        authorName: "生徒E",
        label: "感想",
        body: "タイムテーブル管理の課題は先生方も困っていそうなので良い着眼点だと思います。",
        likeCount: 3,
        postedAt: "2026-07-16 14:00",
        replies: [],
      },
    ],
  },
  {
    announcementId: "kikaku",
    teamId: "team-lumen",
    likeCount: 0,
    materials: [noMaterial("kikaku-lumen-1", "企画書"), noMaterial("kikaku-lumen-2", "発表スライド")],
    summary: null,
    comments: [],
  },

  // ============ 2026年度 / 設計(受付中) ============
  {
    announcementId: "sekkei",
    teamId: "team-cheers",
    likeCount: 12,
    materials: [
      material("sekkei-cheers-1", "設計書", "提出済み", "2026-10-10 14:20", "https://drive.google.com/mock/cheers-sekkei-design"),
      material("sekkei-cheers-2", "発表スライド", "提出済み", "2026-10-12 09:00", "https://drive.google.com/mock/cheers-sekkei-slide"),
      noMaterial("sekkei-cheers-3", "画面設計書"),
    ],
    summary: null,
    comments: [
      {
        id: "sekkei-cheers-c1",
        authorName: "生徒A",
        label: "感想",
        body: "提出状況が一目でわかるのが良いと思いました。運営の負荷が減りそうです。",
        likeCount: 4,
        postedAt: "2026-10-13 10:15",
        replies: [
          {
            id: "sekkei-cheers-c1-r1",
            authorName: "水戸匠",
            authorRole: "presenter",
            body: "ありがとうございます。次は検索機能も強化したいです。",
            postedAt: "2026-10-13 11:00",
          },
        ],
      },
      {
        id: "sekkei-cheers-c2",
        authorName: "生徒B",
        label: "批評",
        body: "資料のリンク切れが起きたときの対応方針も知りたいです。",
        likeCount: 1,
        postedAt: "2026-10-13 12:40",
        replies: [],
      },
    ],
  },
  {
    announcementId: "sekkei",
    teamId: "team-nova",
    likeCount: 5,
    materials: [
      // 締切(2026-10-14 17:00)超過で提出 → 遅延表示のサンプル
      material("sekkei-nova-1", "設計書", "提出済み", "2026-10-15 09:00", "https://drive.google.com/mock/nova-sekkei-design"),
      noMaterial("sekkei-nova-2", "発表スライド"),
      noMaterial("sekkei-nova-3", "画面設計書"),
    ],
    summary: null,
    comments: [],
  },
  {
    announcementId: "sekkei",
    teamId: "team-lumen",
    likeCount: 0,
    materials: [
      noMaterial("sekkei-lumen-1", "設計書"),
      noMaterial("sekkei-lumen-2", "発表スライド"),
      noMaterial("sekkei-lumen-3", "画面設計書"),
    ],
    summary: null,
    comments: [],
  },

  // ============ 2026年度 / 試作(開催予定・全チーム未提出) ============
  {
    announcementId: "shisaku",
    teamId: "team-cheers",
    likeCount: 0,
    materials: [noMaterial("shisaku-cheers-1", "試作品デモ資料"), noMaterial("shisaku-cheers-2", "発表スライド")],
    summary: null,
    comments: [],
  },
  {
    announcementId: "shisaku",
    teamId: "team-nova",
    likeCount: 0,
    materials: [noMaterial("shisaku-nova-1", "試作品デモ資料"), noMaterial("shisaku-nova-2", "発表スライド")],
    summary: null,
    comments: [],
  },
  {
    announcementId: "shisaku",
    teamId: "team-lumen",
    likeCount: 0,
    materials: [noMaterial("shisaku-lumen-1", "試作品デモ資料"), noMaterial("shisaku-lumen-2", "発表スライド")],
    summary: null,
    comments: [],
  },

  // ============ 2026年度 / 最終(開催予定・全チーム未提出) ============
  {
    announcementId: "saishu",
    teamId: "team-cheers",
    likeCount: 0,
    materials: [
      noMaterial("saishu-cheers-1", "最終概要集"),
      noMaterial("saishu-cheers-2", "発表スライド"),
      noMaterial("saishu-cheers-3", "補足資料"),
    ],
    summary: null,
    comments: [],
  },
  {
    announcementId: "saishu",
    teamId: "team-nova",
    likeCount: 0,
    materials: [
      noMaterial("saishu-nova-1", "最終概要集"),
      noMaterial("saishu-nova-2", "発表スライド"),
      noMaterial("saishu-nova-3", "補足資料"),
    ],
    summary: null,
    comments: [],
  },
  {
    announcementId: "saishu",
    teamId: "team-lumen",
    likeCount: 0,
    materials: [
      noMaterial("saishu-lumen-1", "最終概要集"),
      noMaterial("saishu-lumen-2", "発表スライド"),
      noMaterial("saishu-lumen-3", "補足資料"),
    ],
    summary: null,
    comments: [],
  },

  // ============ 2025年度(アーカイブ済み) / 最終 ============
  {
    announcementId: "2025-saishu",
    teamId: "team-orbit",
    likeCount: 15,
    materials: [
      material("2025-saishu-orbit-1", "最終概要集", "提出済み", "2026-02-04 10:00", "https://drive.google.com/mock/orbit-saishu-summary"),
      material("2025-saishu-orbit-2", "発表スライド", "提出済み", "2026-02-04 10:10", "https://drive.google.com/mock/orbit-saishu-slide"),
    ],
    summary: {
      background: "図書室の蔵書検索が館内端末のみで、貸出状況もその場でしか分からない。",
      techUsed: ["Next.js", "SQLite"],
      opening: "蔵書を横断検索し、貸出状況を可視化したい。",
      closing: "司書の在庫確認業務を削減し、生徒の利用体験も改善した。",
      onePageBody: "図書室の蔵書を横断検索し、貸出状況をリアルタイムに可視化するアプリ。",
      submittedAt: "2026-02-04 10:15",
    },
    comments: [
      {
        id: "2025-saishu-orbit-c1",
        authorName: "生徒F",
        label: "感想",
        body: "実際に図書室で使ってみたいと思いました。検索が速くて驚きました。",
        likeCount: 8,
        postedAt: "2026-02-06 15:30",
        replies: [],
      },
    ],
  },
  {
    announcementId: "2025-saishu",
    teamId: "team-sprout",
    likeCount: 3,
    materials: [
      material("2025-saishu-sprout-1", "最終概要集", "提出済み", "2026-02-05 16:00", "https://drive.google.com/mock/sprout-saishu-summary"),
      material("2025-saishu-sprout-2", "発表スライド", "提出済み", "2026-02-05 16:20", "https://drive.google.com/mock/sprout-saishu-slide"),
    ],
    summary: {
      background: "各委員会の活動記録が個人のノートに散在し、次年度への引き継ぎが難しい。",
      techUsed: ["Google Apps Script"],
      opening: "委員会活動の記録を月次でまとめたい。",
      closing: "引き継ぎ資料としてそのまま使える記録フォーマットを整備した。",
      onePageBody: "各委員会の活動記録を月次でまとめ、次年度への引き継ぎ資料として残すノートアプリ。",
      submittedAt: "2026-02-05 16:25",
    },
    comments: [],
  },
  {
    announcementId: "2025-saishu",
    teamId: "team-drift",
    likeCount: 2,
    materials: [
      material("2025-saishu-drift-1", "最終概要集", "提出済み", "2026-02-05 17:30", "https://drive.google.com/mock/drift-saishu-summary"),
      material("2025-saishu-drift-2", "発表スライド", "提出済み", "2026-02-05 17:40", "https://drive.google.com/mock/drift-saishu-slide"),
    ],
    summary: {
      background: "文化祭の模擬店シフトを手作業で調整し、希望調整に時間がかかっていた。",
      techUsed: ["Python"],
      opening: "シフトの自動割り当てで調整の手間を減らしたい。",
      closing: "希望をもとに自動割り当てを行うツールを完成させた。",
      onePageBody: "文化祭の模擬店シフトを自動割り当てし、希望調整の手作業を減らすツール。",
      submittedAt: "2026-02-05 17:45",
    },
    comments: [],
  },
];
