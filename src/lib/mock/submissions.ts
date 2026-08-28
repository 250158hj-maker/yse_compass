import type { Submission } from "@/lib/types";

export const submissions: Submission[] = [
  // --- 2026年度 企画書発表会(終了・公開済み) ---
  {
    announcementId: "ann-2026-kikaku",
    teamId: "team-cheers",
    likeCount: 12,
    materials: [
      {
        id: "mat-k-cheers-slide",
        name: "企画書",
        status: "提出済み",
        updatedAt: "2026-07-15T21:40:00+09:00",
        driveUrl: "https://docs.google.com/presentation/d/cheers-kikaku/edit",
      },
      {
        id: "mat-k-cheers-sub",
        name: "補足資料",
        status: "提出済み",
        updatedAt: "2026-07-17T08:10:00+09:00",
        driveUrl: "https://docs.google.com/document/d/cheers-kikaku-sub/edit",
      },
    ],
    summary: {
      background: "卒業制作の運営が手作業に依存し、先生の負荷と生徒の心理的障壁が課題になっている。",
      techUsed: ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL"],
      opening: "提出状況の目視確認、概要集の手作業PDF化——卒業制作の運営には見えない負荷がある。",
      closing: "提出・資料の管理を自動化し、卒業制作の知的プロセスを学校の資産として蓄積する。",
      onePageBody:
        "YSE Compassは発表会運営のメタデータ(提出状況・資料リンク・コメント)を一元管理する学内向けプラットフォームです。資料の実体はGoogle Driveに置いたまま、システムは提出状況の可視化・資料公開・コメントによる議論を担います。",
      submittedAt: "2026-07-16T20:00:00+09:00",
    },
    comments: [
      {
        id: "cmt-k-1",
        authorName: "田中一郎",
        label: "感想",
        body: "提出状況が一目で分かるの、すごく便利そうです。うちのチームにも欲しい。",
        likeCount: 4,
        postedAt: "2026-07-17T10:05:00+09:00",
        replies: [
          {
            id: "rep-k-1-1",
            authorName: "水戸匠",
            authorRole: "student",
            body: "ありがとうございます!設計フェーズで実際に使えるところまで持っていきます。",
            postedAt: "2026-07-17T10:20:00+09:00",
          },
        ],
      },
      {
        id: "cmt-k-2",
        authorName: "冨永先生",
        label: "批評",
        body: "運営側の課題をよく捉えられている。本番環境の検討状況も次回教えてほしい。",
        likeCount: 6,
        postedAt: "2026-07-17T11:00:00+09:00",
        replies: [],
      },
    ],
  },
  {
    announcementId: "ann-2026-kikaku",
    teamId: "team-nova",
    likeCount: 5,
    materials: [
      {
        id: "mat-k-nova-slide",
        name: "企画書",
        status: "提出済み",
        updatedAt: "2026-07-14T18:00:00+09:00",
        driveUrl: "https://docs.google.com/presentation/d/nova-kikaku/edit",
      },
      { id: "mat-k-nova-sub", name: "補足資料", status: "未提出", updatedAt: null, driveUrl: null },
    ],
    summary: {
      background: "部活動・委員会の備品貸出が紙の貸出簿で管理され、在庫状況が分からない。",
      techUsed: ["React", "Firebase"],
      opening: "「今、卓球部のボールは何個空いている?」——それが分からないところから始まった。",
      closing: "在庫と予約をリアルタイムに可視化し、備品を巡る問い合わせをゼロにする。",
      onePageBody: "校内の備品予約をオンライン化し、貸出状況をリアルタイムに共有するシステムです。",
      submittedAt: "2026-07-16T19:30:00+09:00",
    },
    comments: [
      {
        id: "cmt-k-3",
        authorName: "蒲山由梨花",
        label: "感想",
        body: "備品予約、うちのクラスでも困ってたので助かります!",
        likeCount: 2,
        postedAt: "2026-07-17T12:00:00+09:00",
        replies: [],
      },
    ],
  },
  {
    announcementId: "ann-2026-kikaku",
    teamId: "team-lumen",
    likeCount: 1,
    materials: [
      {
        id: "mat-k-lumen-slide",
        name: "企画書",
        status: "提出済み",
        updatedAt: "2026-07-17T07:50:00+09:00",
        driveUrl: "https://docs.google.com/presentation/d/lumen-kikaku/edit",
      },
      { id: "mat-k-lumen-sub", name: "補足資料", status: "未提出", updatedAt: null, driveUrl: null },
    ],
    summary: null,
    comments: [],
  },

  // --- 2026年度 設計書発表会(受付中・未公開) ---
  {
    announcementId: "ann-2026-sekkei",
    teamId: "team-cheers",
    likeCount: 0,
    materials: [
      {
        id: "mat-s-cheers-doc",
        name: "設計書",
        status: "提出済み",
        updatedAt: "2026-08-18T22:00:00+09:00",
        driveUrl: "https://docs.google.com/document/d/cheers-sekkei/edit",
      },
      { id: "mat-s-cheers-er", name: "ER図", status: "未提出", updatedAt: null, driveUrl: null },
    ],
    summary: null,
    comments: [],
  },
  {
    announcementId: "ann-2026-sekkei",
    teamId: "team-nova",
    likeCount: 0,
    materials: [
      { id: "mat-s-nova-doc", name: "設計書", status: "未提出", updatedAt: null, driveUrl: null },
      { id: "mat-s-nova-er", name: "ER図", status: "未提出", updatedAt: null, driveUrl: null },
    ],
    summary: null,
    comments: [],
  },
  {
    announcementId: "ann-2026-sekkei",
    teamId: "team-lumen",
    likeCount: 0,
    materials: [
      { id: "mat-s-lumen-doc", name: "設計書", status: "未提出", updatedAt: null, driveUrl: null },
      { id: "mat-s-lumen-er", name: "ER図", status: "未提出", updatedAt: null, driveUrl: null },
    ],
    summary: null,
    comments: [],
  },

  // --- 2025年度 Aurora(公開許可あり) — 4回分の履歴 ---
  {
    announcementId: "ann-2025-kikaku",
    teamId: "team-aurora",
    likeCount: 3,
    materials: [
      {
        id: "mat-25k-aurora",
        name: "企画書",
        status: "提出済み",
        updatedAt: "2025-07-16T20:00:00+09:00",
        driveUrl: "https://docs.google.com/presentation/d/aurora-kikaku/edit",
      },
    ],
    summary: null,
    comments: [],
  },
  {
    announcementId: "ann-2025-sekkei",
    teamId: "team-aurora",
    likeCount: 2,
    materials: [
      {
        id: "mat-25s-aurora",
        name: "設計書",
        status: "提出済み",
        updatedAt: "2025-10-14T20:00:00+09:00",
        driveUrl: "https://docs.google.com/document/d/aurora-sekkei/edit",
      },
    ],
    summary: null,
    comments: [],
  },
  {
    announcementId: "ann-2025-shisaku",
    teamId: "team-aurora",
    likeCount: 4,
    materials: [
      {
        id: "mat-25t-aurora",
        name: "発表スライド",
        status: "提出済み",
        updatedAt: "2025-12-15T20:00:00+09:00",
        driveUrl: "https://docs.google.com/presentation/d/aurora-shisaku/edit",
      },
    ],
    summary: null,
    comments: [],
  },
  {
    announcementId: "ann-2025-saishu",
    teamId: "team-aurora",
    likeCount: 9,
    materials: [
      {
        id: "mat-25f-aurora",
        name: "発表スライド",
        status: "提出済み",
        updatedAt: "2026-02-08T20:00:00+09:00",
        driveUrl: "https://docs.google.com/presentation/d/aurora-saishu/edit",
      },
    ],
    summary: {
      background: "新入生が興味のある部活動を見つけられず、入部後のミスマッチも多かった。",
      techUsed: ["Next.js", "Supabase"],
      opening: "「入ってみたら想像と違った」——新入生の部活選びには情報が足りていない。",
      closing: "興味関心タグでのマッチングにより、入部後のミスマッチを減らす。",
      onePageBody: "新入生の興味関心タグと部活動の特徴タグを突き合わせ、相性の良い部活動を提案するアプリです。",
      submittedAt: "2026-02-08T19:00:00+09:00",
    },
    comments: [
      {
        id: "cmt-25f-1",
        authorName: "水戸匠",
        label: "感想",
        body: "マッチング結果の見せ方が分かりやすくて良いと思いました。",
        likeCount: 3,
        postedAt: "2026-02-09T10:00:00+09:00",
        replies: [
          {
            id: "rep-25f-1-1",
            authorName: "小林大和",
            authorRole: "student",
            body: "ありがとうございます!タグの粒度調整が一番苦労したところです。",
            postedAt: "2026-02-09T10:30:00+09:00",
          },
        ],
      },
    ],
  },
];
