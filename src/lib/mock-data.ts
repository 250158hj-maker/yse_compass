// モック画面用のダミーデータ。DB/API実装前の仮データであり、Prisma導入時に型はスキーマへ移行する想定。

export type Role = "teacher" | "student";

export type AnnouncementPhase = "企画" | "設計" | "試作" | "最終";

export type Announcement = {
  id: string;
  phase: AnnouncementPhase;
  title: string;
  period: string;
  submissionDeadline: string;
  status: "受付中" | "開催予定" | "終了";
  materialSlots: { name: string; required: boolean }[];
};

export type SubmissionStatus = "未提出" | "提出済み" | "差し戻し";

export type Material = {
  id: string;
  name: string;
  status: SubmissionStatus;
  updatedAt: string;
  driveUrl: string | null;
};

export type CommentLabel = "感想" | "批評" | "その他";

export type Comment = {
  id: string;
  authorName: string;
  label: CommentLabel;
  body: string;
  likeCount: number;
  postedAt: string;
  replies: {
    id: string;
    authorName: string;
    body: string;
    postedAt: string;
  }[];
};

export type Team = {
  id: string;
  name: string;
  projectTitle: string;
  className: string;
  members: string[];
  summary: string;
  announcementId: string;
  submissionStatus: SubmissionStatus;
  likeCount: number;
  materials: Material[];
  comments: Comment[];
};

export const announcements: Announcement[] = [
  {
    id: "kikaku",
    phase: "企画",
    title: "コンテンツ企画書発表会",
    period: "2026-07-17",
    submissionDeadline: "2026-07-16 17:00",
    status: "終了",
    materialSlots: [
      { name: "企画書", required: true },
      { name: "発表スライド", required: true },
    ],
  },
  {
    id: "sekkei",
    phase: "設計",
    title: "設計書発表会",
    period: "2026-10-15",
    submissionDeadline: "2026-10-14 17:00",
    status: "受付中",
    materialSlots: [
      { name: "設計書", required: true },
      { name: "発表スライド", required: true },
      { name: "画面設計書", required: false },
    ],
  },
  {
    id: "shisaku",
    phase: "試作",
    title: "試作品版発表会",
    period: "2026-12-17",
    submissionDeadline: "2026-12-16 17:00",
    status: "開催予定",
    materialSlots: [
      { name: "試作品デモ資料", required: true },
      { name: "発表スライド", required: true },
    ],
  },
  {
    id: "saishu",
    phase: "最終",
    title: "最終発表会",
    period: "2027-02-09",
    submissionDeadline: "2027-02-08 17:00",
    status: "開催予定",
    materialSlots: [
      { name: "最終概要集", required: true },
      { name: "発表スライド", required: true },
      { name: "補足資料", required: false },
    ],
  },
];

export const teams: Team[] = [
  {
    id: "team-cheers",
    name: "Cheers",
    projectTitle: "YSE Compass",
    className: "3年A組",
    members: ["水戸匠", "鈴木和明", "蒲山由梨花"],
    summary:
      "卒業制作の発表会運営を効率化し、成果を学校の資産として蓄積するプラットフォーム。提出状況の一元管理と、発表への反応の可視化を目指す。",
    announcementId: "sekkei",
    submissionStatus: "提出済み",
    likeCount: 12,
    materials: [
      {
        id: "m1",
        name: "設計書",
        status: "提出済み",
        updatedAt: "2026-10-10 14:20",
        driveUrl: "https://drive.google.com/mock/cheers-design",
      },
      {
        id: "m2",
        name: "発表スライド",
        status: "提出済み",
        updatedAt: "2026-10-12 09:00",
        driveUrl: "https://drive.google.com/mock/cheers-slide",
      },
      { id: "m3", name: "画面設計書", status: "未提出", updatedAt: "-", driveUrl: null },
    ],
    comments: [
      {
        id: "c1",
        authorName: "生徒A",
        label: "感想",
        body: "提出状況が一目でわかるのが良いと思いました。運営の負荷が減りそうです。",
        likeCount: 4,
        postedAt: "2026-10-13 10:15",
        replies: [
          {
            id: "r1",
            authorName: "水戸匠",
            body: "ありがとうございます。次は検索機能も強化したいです。",
            postedAt: "2026-10-13 11:00",
          },
        ],
      },
      {
        id: "c2",
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
    id: "team-nova",
    name: "Nova",
    projectTitle: "学校行事タイムライン共有アプリ",
    className: "3年B組",
    members: ["山田太郎", "佐藤花子"],
    summary: "学校行事の当日進行をリアルタイムに共有し、タイムテーブル管理の手作業をなくすアプリ。",
    announcementId: "sekkei",
    submissionStatus: "差し戻し",
    likeCount: 5,
    materials: [
      {
        id: "m4",
        name: "設計書",
        status: "差し戻し",
        updatedAt: "2026-10-09 18:00",
        driveUrl: "https://drive.google.com/mock/nova-design",
      },
      { id: "m5", name: "発表スライド", status: "未提出", updatedAt: "-", driveUrl: null },
    ],
    comments: [],
  },
  {
    id: "team-lumen",
    name: "Lumen",
    projectTitle: "部活動記録アーカイブシステム",
    className: "3年C組",
    members: ["田中一郎", "高橋美咲", "伊藤健"],
    summary: "部活動の活動記録・成果物を年度をまたいで蓄積し、後輩が参照できるアーカイブシステム。",
    announcementId: "sekkei",
    submissionStatus: "未提出",
    likeCount: 0,
    materials: [
      { id: "m6", name: "設計書", status: "未提出", updatedAt: "-", driveUrl: null },
      { id: "m7", name: "発表スライド", status: "未提出", updatedAt: "-", driveUrl: null },
    ],
    comments: [],
  },
  {
    id: "team-orbit",
    name: "Orbit",
    projectTitle: "図書室蔵書レコメンドサービス",
    className: "3年A組",
    members: ["中村涼", "小林葵"],
    summary: "貸出履歴をもとに次に読む本をレコメンドし、図書室の利用促進につなげるサービス。",
    announcementId: "kikaku",
    submissionStatus: "提出済み",
    likeCount: 8,
    materials: [
      {
        id: "m8",
        name: "企画書",
        status: "提出済み",
        updatedAt: "2026-07-15 16:00",
        driveUrl: "https://drive.google.com/mock/orbit-plan",
      },
      {
        id: "m9",
        name: "発表スライド",
        status: "提出済み",
        updatedAt: "2026-07-16 10:00",
        driveUrl: "https://drive.google.com/mock/orbit-slide",
      },
    ],
    comments: [],
  },
];

export function getAnnouncementById(id: string) {
  return announcements.find((a) => a.id === id);
}

export function getTeamById(id: string) {
  return teams.find((t) => t.id === id);
}

export function getTeamsByAnnouncement(announcementId: string) {
  return teams.filter((t) => t.announcementId === announcementId);
}
