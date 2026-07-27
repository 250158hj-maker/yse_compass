// モック画面用の型定義。DB/API実装前の仮スキーマであり、Prisma導入時にスキーマへ移行する想定。
// 出典: docs/requirements.md, docs/screens.md

export type Role = "teacher" | "presenter" | "viewer";

export const roleLabels: Record<Role, string> = {
  teacher: "先生",
  presenter: "生徒(発表側 / S1)",
  viewer: "生徒(視聴側 / S2)",
};

export type Year = {
  id: string;
  label: string;
  status: "進行中" | "アーカイブ済み";
};

export type AnnouncementPhase = "企画" | "設計" | "試作" | "最終";

export type MaterialSlot = {
  id: string;
  name: string;
  required: boolean;
  templateId: string | null;
};

export type Announcement = {
  id: string;
  yearId: string;
  phase: AnnouncementPhase;
  title: string;
  period: string;
  submissionDeadline: string;
  status: "受付中" | "開催予定" | "終了";
  isPublished: boolean;
  materialSlots: MaterialSlot[];
};

export type TemplateFormat = "Google ドキュメント" | "Google スライド" | "Word" | "PowerPoint";

export type Template = {
  id: string;
  name: string;
  relatedPhase: AnnouncementPhase;
  format: TemplateFormat;
  url: string;
};

export type TimetableSlot = {
  id: string;
  teamId: string;
  order: number;
  startTime: string;
  durationMin: number;
  isBreak: false;
} | {
  id: string;
  order: number;
  startTime: string;
  durationMin: number;
  isBreak: true;
  breakLabel: string;
};

export type Timetable = {
  announcementId: string;
  slots: TimetableSlot[];
  currentPresentingTeamId: string | null;
};

export type PublishPermissionStatus = "未設定" | "許可" | "拒否";

export type Team = {
  id: string;
  yearId: string;
  name: string;
  projectTitle: string;
  className: string;
  members: string[];
  leaderName: string;
  summary: string;
  publishPermission: PublishPermissionStatus;
};

export type SubmissionStatus = "未提出" | "提出済み";

export type Material = {
  id: string;
  name: string;
  status: SubmissionStatus;
  updatedAt: string | null;
  driveUrl: string | null;
};

export type SummaryEntry = {
  background: string;
  techUsed: string[];
  opening: string;
  closing: string;
  onePageBody: string;
  submittedAt: string;
};

export type CommentLabel = "感想" | "批評" | "その他";

export type Reply = {
  id: string;
  authorName: string;
  authorRole: Role;
  body: string;
  postedAt: string;
};

export type Comment = {
  id: string;
  authorName: string;
  label: CommentLabel;
  body: string;
  likeCount: number;
  postedAt: string;
  replies: Reply[];
};

export type Submission = {
  announcementId: string;
  teamId: string;
  likeCount: number;
  materials: Material[];
  summary: SummaryEntry | null;
  comments: Comment[];
};

export type AppUser = {
  id: string;
  name: string;
  role: "teacher" | "student";
  className: string | null;
  teamId: string | null;
};
