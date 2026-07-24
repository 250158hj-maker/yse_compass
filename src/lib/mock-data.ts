// モック画面用のダミーデータ。DB/API実装前の仮データであり、Prisma導入時に型はスキーマへ移行する想定。
//
// Team は発表会に依存しない固定情報。Submission が「発表会×チーム」ごとの
// 提出資料・コメントを持つ。同じチームでも発表会が違えばコメントも資料も別になる。

export type Role = "teacher" | "student2" | "student1";

export const roleLabels: Record<Role, string> = {
  teacher: "先生",
  student2: "生徒(2年・発表側)",
  student1: "生徒(1年・視聴側)",
};

export type AnnouncementPhase = "企画" | "設計" | "試作" | "最終";

export const phaseStyle: Record<AnnouncementPhase, string> = {
  企画: "bg-sky-100 text-sky-700",
  設計: "bg-cyan-100 text-cyan-700",
  試作: "bg-amber-100 text-amber-700",
  最終: "bg-teal-100 text-teal-700",
};

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
};

export type Submission = {
  announcementId: string;
  teamId: string;
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
  },
  {
    id: "team-nova",
    name: "Nova",
    projectTitle: "学校行事タイムライン共有アプリ",
    className: "3年B組",
    members: ["山田太郎", "佐藤花子"],
    summary: "学校行事の当日進行をリアルタイムに共有し、タイムテーブル管理の手作業をなくすアプリ。",
  },
  {
    id: "team-lumen",
    name: "Lumen",
    projectTitle: "部活動記録アーカイブシステム",
    className: "3年C組",
    members: ["田中一郎", "高橋美咲", "伊藤健"],
    summary: "部活動の活動記録・成果物を年度をまたいで蓄積し、後輩が参照できるアーカイブシステム。",
  },
];

function material(
  id: string,
  name: string,
  status: SubmissionStatus,
  updatedAt: string,
  driveUrl: string | null,
): Material {
  return { id, name, status, updatedAt, driveUrl };
}

const noMaterial = (id: string, name: string) => material(id, name, "未提出", "-", null);

export const submissions: Submission[] = [
  // --- 企画(終了): cheers/novaは提出済み、lumenは未提出のまま終了 ---
  {
    announcementId: "kikaku",
    teamId: "team-cheers",
    submissionStatus: "提出済み",
    likeCount: 9,
    materials: [
      material("kikaku-cheers-1", "企画書", "提出済み", "2026-07-15 13:00", "https://drive.google.com/mock/cheers-kikaku-plan"),
      material("kikaku-cheers-2", "発表スライド", "提出済み", "2026-07-16 09:30", "https://drive.google.com/mock/cheers-kikaku-slide"),
    ],
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
    submissionStatus: "提出済み",
    likeCount: 4,
    materials: [
      material("kikaku-nova-1", "企画書", "提出済み", "2026-07-14 17:20", "https://drive.google.com/mock/nova-kikaku-plan"),
      material("kikaku-nova-2", "発表スライド", "提出済み", "2026-07-15 20:00", "https://drive.google.com/mock/nova-kikaku-slide"),
    ],
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
    submissionStatus: "未提出",
    likeCount: 0,
    materials: [noMaterial("kikaku-lumen-1", "企画書"), noMaterial("kikaku-lumen-2", "発表スライド")],
    comments: [],
  },

  // --- 設計(受付中): cheersは提出済み、novaは差し戻し、lumenは未提出 ---
  {
    announcementId: "sekkei",
    teamId: "team-cheers",
    submissionStatus: "提出済み",
    likeCount: 12,
    materials: [
      material("sekkei-cheers-1", "設計書", "提出済み", "2026-10-10 14:20", "https://drive.google.com/mock/cheers-sekkei-design"),
      material("sekkei-cheers-2", "発表スライド", "提出済み", "2026-10-12 09:00", "https://drive.google.com/mock/cheers-sekkei-slide"),
      noMaterial("sekkei-cheers-3", "画面設計書"),
    ],
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
    submissionStatus: "差し戻し",
    likeCount: 5,
    materials: [
      material("sekkei-nova-1", "設計書", "差し戻し", "2026-10-09 18:00", "https://drive.google.com/mock/nova-sekkei-design"),
      noMaterial("sekkei-nova-2", "発表スライド"),
      noMaterial("sekkei-nova-3", "画面設計書"),
    ],
    comments: [],
  },
  {
    announcementId: "sekkei",
    teamId: "team-lumen",
    submissionStatus: "未提出",
    likeCount: 0,
    materials: [
      noMaterial("sekkei-lumen-1", "設計書"),
      noMaterial("sekkei-lumen-2", "発表スライド"),
      noMaterial("sekkei-lumen-3", "画面設計書"),
    ],
    comments: [],
  },

  // --- 試作(開催予定): 未開始のため全チーム未提出・コメントなし ---
  {
    announcementId: "shisaku",
    teamId: "team-cheers",
    submissionStatus: "未提出",
    likeCount: 0,
    materials: [noMaterial("shisaku-cheers-1", "試作品デモ資料"), noMaterial("shisaku-cheers-2", "発表スライド")],
    comments: [],
  },
  {
    announcementId: "shisaku",
    teamId: "team-nova",
    submissionStatus: "未提出",
    likeCount: 0,
    materials: [noMaterial("shisaku-nova-1", "試作品デモ資料"), noMaterial("shisaku-nova-2", "発表スライド")],
    comments: [],
  },
  {
    announcementId: "shisaku",
    teamId: "team-lumen",
    submissionStatus: "未提出",
    likeCount: 0,
    materials: [noMaterial("shisaku-lumen-1", "試作品デモ資料"), noMaterial("shisaku-lumen-2", "発表スライド")],
    comments: [],
  },

  // --- 最終(開催予定): 未開始のため全チーム未提出・コメントなし ---
  {
    announcementId: "saishu",
    teamId: "team-cheers",
    submissionStatus: "未提出",
    likeCount: 0,
    materials: [
      noMaterial("saishu-cheers-1", "最終概要集"),
      noMaterial("saishu-cheers-2", "発表スライド"),
      noMaterial("saishu-cheers-3", "補足資料"),
    ],
    comments: [],
  },
  {
    announcementId: "saishu",
    teamId: "team-nova",
    submissionStatus: "未提出",
    likeCount: 0,
    materials: [
      noMaterial("saishu-nova-1", "最終概要集"),
      noMaterial("saishu-nova-2", "発表スライド"),
      noMaterial("saishu-nova-3", "補足資料"),
    ],
    comments: [],
  },
  {
    announcementId: "saishu",
    teamId: "team-lumen",
    submissionStatus: "未提出",
    likeCount: 0,
    materials: [
      noMaterial("saishu-lumen-1", "最終概要集"),
      noMaterial("saishu-lumen-2", "発表スライド"),
      noMaterial("saishu-lumen-3", "補足資料"),
    ],
    comments: [],
  },
];

export type TemplateFormat = "Google ドキュメント" | "Google スライド" | "Word" | "PowerPoint";

export type Template = {
  id: string;
  name: string;
  relatedPhase: AnnouncementPhase;
  format: TemplateFormat;
  url: string;
};

export const templates: Template[] = [
  {
    id: "tpl-kikaku-plan",
    name: "企画書テンプレート",
    relatedPhase: "企画",
    format: "Google ドキュメント",
    url: "https://drive.google.com/mock/template-kikaku-plan",
  },
  {
    id: "tpl-sekkei-design",
    name: "設計書テンプレート",
    relatedPhase: "設計",
    format: "Word",
    url: "https://drive.google.com/mock/template-sekkei-design",
  },
  {
    id: "tpl-sekkei-screen",
    name: "画面設計書テンプレート",
    relatedPhase: "設計",
    format: "Google スライド",
    url: "https://drive.google.com/mock/template-sekkei-screen",
  },
  {
    id: "tpl-shisaku-demo",
    name: "試作品デモ資料テンプレート",
    relatedPhase: "試作",
    format: "PowerPoint",
    url: "https://drive.google.com/mock/template-shisaku-demo",
  },
  {
    id: "tpl-saishu-summary",
    name: "最終概要集テンプレート",
    relatedPhase: "最終",
    format: "Word",
    url: "https://drive.google.com/mock/template-saishu-summary",
  },
  {
    id: "tpl-slide-common",
    name: "発表スライドテンプレート",
    relatedPhase: "最終",
    format: "Google スライド",
    url: "https://drive.google.com/mock/template-slide-common",
  },
];

export function getAnnouncementById(id: string) {
  return announcements.find((a) => a.id === id);
}

export function getTeamById(id: string) {
  return teams.find((t) => t.id === id);
}

export function getSubmission(announcementId: string, teamId: string) {
  return submissions.find(
    (s) => s.announcementId === announcementId && s.teamId === teamId,
  );
}

export function getSubmissionsForAnnouncement(announcementId: string) {
  return teams
    .map((team) => {
      const submission = getSubmission(announcementId, team.id);
      return submission ? { team, submission } : null;
    })
    .filter((entry): entry is { team: Team; submission: Submission } => entry !== null);
}
