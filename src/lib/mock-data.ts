export type EventPhase = "企画" | "設計" | "試作" | "最終";

export type SubmissionStatus = "未提出" | "提出済み" | "期限切れ";

export type CommentLabel = "感想" | "批評" | "その他";

export interface PresentationEvent {
  id: string;
  phase: EventPhase;
  year: number;
  deadline: string; // ISO date
}

export interface Team {
  id: string;
  name: string;
  workTitle: string; // 作品名
  summary: string;
  order: number; // 発表順
  year: number;
  likes: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  name: string;
  role: "リーダー" | "メンバー";
}

export interface Student {
  id: string;
  name: string;
  teamId: string | null;
}

export interface Teacher {
  id: string;
  name: string;
  tier: "主任" | "担当";
  parentId: string | null;
}

export interface CommentReply {
  id: string;
  authorDisplay: string;
  body: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  teamId: string;
  eventId: string;
  label: CommentLabel;
  authorDisplay: string;
  body: string;
  likes: number;
  createdAt: string;
  replies: CommentReply[];
}

export interface MaterialSlot {
  id: string;
  eventId: string;
  kind: string; // 資料の種類（例: 発表資料、補足資料）
  deadline: string; // ISO date
}

export interface Submission {
  id: string;
  slotId: string;
  teamId: string;
  linkUrl: string | null;
  submittedAt: string | null;
  published: boolean;
}

export interface TimetableSlot {
  id: string;
  eventId: string;
  teamId: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  location: string;
}

export type TimetableSlotStatus = "予定" | "進行中" | "終了";

export interface Template {
  id: string;
  name: string;
  kind: "概要集" | "発表資料" | "その他";
  description: string;
  fileUrl: string;
  updatedAt: string;
}

export const events: PresentationEvent[] = [
  { id: "ev-1", phase: "企画", year: 2026, deadline: "2026-07-17" },
  { id: "ev-2", phase: "設計", year: 2026, deadline: "2026-10-15" },
  { id: "ev-3", phase: "試作", year: 2026, deadline: "2026-12-17" },
  { id: "ev-4", phase: "最終", year: 2026, deadline: "2027-02-09" },
  { id: "ev-2025-final", phase: "最終", year: 2025, deadline: "2026-02-10" },
];

export const teams: Team[] = [
  { id: "team-1", name: "チームAlpha", workTitle: "わすれものマネージャー", summary: "校内の忘れ物管理を効率化するアプリ", order: 1, year: 2026, likes: 12 },
  { id: "team-2", name: "チームBravo", workTitle: "プレイログ", summary: "部活動の練習記録を可視化するツール", order: 2, year: 2026, likes: 7 },
  { id: "team-3", name: "チームCharlie", workTitle: "学食コミルくん", summary: "学食の混雑状況をリアルタイム共有するサービス", order: 3, year: 2026, likes: 3 },
  { id: "team-4", name: "チームDelta", workTitle: "選挙割", summary: "生徒会選挙のオンライン投票システム", order: 4, year: 2026, likes: 9 },
  { id: "team-5", name: "チームEcho", workTitle: "としょQ", summary: "図書室の蔵書検索・貸出管理システム", order: 1, year: 2025, likes: 5 },
];

export const teamMembers: TeamMember[] = [
  { id: "mem-1", teamId: "team-1", name: "佐藤", role: "リーダー" },
  { id: "mem-2", teamId: "team-1", name: "鈴木", role: "メンバー" },
  { id: "mem-3", teamId: "team-2", name: "高橋", role: "リーダー" },
  { id: "mem-4", teamId: "team-2", name: "田中", role: "メンバー" },
  { id: "mem-5", teamId: "team-2", name: "伊藤", role: "メンバー" },
  { id: "mem-6", teamId: "team-3", name: "渡辺", role: "リーダー" },
  { id: "mem-7", teamId: "team-4", name: "山本", role: "リーダー" },
  { id: "mem-8", teamId: "team-4", name: "中村", role: "メンバー" },
  { id: "mem-9", teamId: "team-5", name: "小林", role: "リーダー" },
];

export const students: Student[] = [
  { id: "stu-sato", name: "佐藤", teamId: "team-1" },
  { id: "stu-yamada", name: "山田", teamId: null },
];

export const teachers: Teacher[] = [
  { id: "t-tomi", name: "冨永先生", tier: "主任", parentId: null },
  { id: "t-mito", name: "水戸先生", tier: "担当", parentId: "t-tomi" },
];

export const comments: Comment[] = [
  {
    id: "cm-1",
    teamId: "team-1",
    eventId: "ev-2",
    label: "感想",
    authorDisplay: "聴講生徒A",
    body: "忘れ物管理、日常で困っていたので便利そうです！",
    likes: 5,
    createdAt: "2026-10-16T10:00:00",
    replies: [
      { id: "rp-1", authorDisplay: "チームAlpha", body: "ありがとうございます、通知機能も追加予定です！", createdAt: "2026-10-16T11:30:00" },
    ],
  },
  {
    id: "cm-2",
    teamId: "team-1",
    eventId: "ev-2",
    label: "批評",
    authorDisplay: "聴講生徒B",
    body: "登録の手間がどれくらいか気になりました。もう少し自動化できませんか？",
    likes: 2,
    createdAt: "2026-10-16T10:20:00",
    replies: [],
  },
  {
    id: "cm-3",
    teamId: "team-2",
    eventId: "ev-2",
    label: "その他",
    authorDisplay: "聴講生徒C",
    body: "他の部活でも使えそうなので、汎用化に期待しています。",
    likes: 3,
    createdAt: "2026-10-16T10:45:00",
    replies: [],
  },
  {
    id: "cm-4",
    teamId: "team-1",
    eventId: "ev-1",
    label: "感想",
    authorDisplay: "聴講生徒D",
    body: "企画段階から忘れ物管理に着目していたのが良いと思いました。",
    likes: 1,
    createdAt: "2026-07-18T09:15:00",
    replies: [],
  },
];

export const materialSlots: MaterialSlot[] = [
  { id: "slot-1", eventId: "ev-2", kind: "発表資料", deadline: "2026-10-10" },
  { id: "slot-2", eventId: "ev-2", kind: "補足資料", deadline: "2026-10-12" },
  { id: "slot-3", eventId: "ev-2", kind: "概要集用サマリー", deadline: "2026-10-13" },
];

export const submissions: Submission[] = [
  { id: "sub-1", slotId: "slot-1", teamId: "team-1", linkUrl: "https://drive.google.com/team1-slides", submittedAt: "2026-10-08", published: true },
  { id: "sub-2", slotId: "slot-2", teamId: "team-1", linkUrl: null, submittedAt: null, published: false },
  { id: "sub-3", slotId: "slot-3", teamId: "team-1", linkUrl: "https://drive.google.com/team1-summary", submittedAt: "2026-10-09", published: true },

  { id: "sub-4", slotId: "slot-1", teamId: "team-2", linkUrl: "https://drive.google.com/team2-slides", submittedAt: "2026-10-09", published: true },
  { id: "sub-5", slotId: "slot-2", teamId: "team-2", linkUrl: "https://drive.google.com/team2-appendix", submittedAt: "2026-10-11", published: false },
  { id: "sub-6", slotId: "slot-3", teamId: "team-2", linkUrl: null, submittedAt: null, published: false },

  { id: "sub-7", slotId: "slot-1", teamId: "team-3", linkUrl: null, submittedAt: null, published: false },
  { id: "sub-8", slotId: "slot-2", teamId: "team-3", linkUrl: null, submittedAt: null, published: false },
  { id: "sub-9", slotId: "slot-3", teamId: "team-3", linkUrl: null, submittedAt: null, published: false },

  { id: "sub-10", slotId: "slot-1", teamId: "team-4", linkUrl: "https://drive.google.com/team4-slides", submittedAt: "2026-10-07", published: true },
  { id: "sub-11", slotId: "slot-2", teamId: "team-4", linkUrl: "https://drive.google.com/team4-appendix", submittedAt: "2026-10-07", published: true },
  { id: "sub-12", slotId: "slot-3", teamId: "team-4", linkUrl: "https://drive.google.com/team4-summary", submittedAt: "2026-10-07", published: true },
];

export const templates: Template[] = [
  {
    id: "tpl-1",
    name: "概要集テンプレート",
    kind: "概要集",
    description: "1ページに収まる分量でまとめる概要集用のテンプレートです。プレゼン資料からの抜粋で構成してください。",
    fileUrl: "/templates/gaiyoshu-template.md",
    updatedAt: "2026-07-20",
  },
  {
    id: "tpl-2",
    name: "発表資料アウトラインテンプレート",
    kind: "発表資料",
    description: "発表資料の構成（起承転結）の目安となるアウトラインです。ページ数は発表時間に合わせて調整してください。",
    fileUrl: "/templates/happyou-outline-template.md",
    updatedAt: "2026-07-20",
  },
];

export const timetableSlots: TimetableSlot[] = [
  { id: "tt-1", eventId: "ev-2", teamId: "team-1", startTime: "09:00", endTime: "09:15", location: "体育館" },
  { id: "tt-2", eventId: "ev-2", teamId: "team-2", startTime: "09:15", endTime: "09:30", location: "体育館" },
  { id: "tt-3", eventId: "ev-2", teamId: "team-3", startTime: "09:30", endTime: "09:45", location: "体育館" },
  { id: "tt-4", eventId: "ev-2", teamId: "team-4", startTime: "09:45", endTime: "10:00", location: "体育館" },
];

function resolveStatus(slot: MaterialSlot, submission: Submission | undefined, now: Date): SubmissionStatus {
  if (submission?.linkUrl) return "提出済み";
  if (new Date(slot.deadline) < now) return "期限切れ";
  return "未提出";
}

export interface SubmissionCell {
  slot: MaterialSlot;
  team: Team;
  submission: Submission | undefined;
  status: SubmissionStatus;
}

export function getSubmissionMatrix(eventId: string, now: Date = new Date()): SubmissionCell[] {
  const slots = materialSlots.filter((s) => s.eventId === eventId);
  const cells: SubmissionCell[] = [];
  for (const slot of slots) {
    for (const team of teams) {
      const submission = submissions.find((s) => s.slotId === slot.id && s.teamId === team.id);
      cells.push({ slot, team, submission, status: resolveStatus(slot, submission, now) });
    }
  }
  return cells;
}

export interface TeamSubmissionRow {
  slot: MaterialSlot;
  submission: Submission | undefined;
  status: SubmissionStatus;
}

export function getTeamSubmissions(eventId: string, teamId: string, now: Date = new Date()): TeamSubmissionRow[] {
  return materialSlots
    .filter((s) => s.eventId === eventId)
    .map((slot) => {
      const submission = submissions.find((s) => s.slotId === slot.id && s.teamId === teamId);
      return { slot, submission, status: resolveStatus(slot, submission, now) };
    });
}

export interface PublishedTeamMaterial {
  team: Team;
  materials: { slot: MaterialSlot; submission: Submission }[];
}

export function getPublishedMaterials(eventId: string): PublishedTeamMaterial[] {
  return teams
    .map((team) => {
      const materials = materialSlots
        .filter((slot) => slot.eventId === eventId)
        .flatMap((slot) => {
          const submission = submissions.find(
            (s) => s.slotId === slot.id && s.teamId === team.id && s.published && s.linkUrl
          );
          return submission ? [{ slot, submission }] : [];
        });
      return { team, materials };
    })
    .filter((entry) => entry.materials.length > 0)
    .sort((a, b) => a.team.order - b.team.order);
}

export function getEvent(eventId: string): PresentationEvent | undefined {
  return events.find((e) => e.id === eventId);
}

export function getTeam(teamId: string): Team | undefined {
  return teams.find((t) => t.id === teamId);
}

export function getStudent(studentId: string): Student | undefined {
  return students.find((s) => s.id === studentId);
}

export function getTeacher(teacherId: string): Teacher | undefined {
  return teachers.find((t) => t.id === teacherId);
}

export function getMyTeam(studentId: string): Team | null {
  const student = getStudent(studentId);
  if (!student?.teamId) return null;
  return getTeam(student.teamId) ?? null;
}

export function getTeamMembers(teamId: string): TeamMember[] {
  return teamMembers.filter((m) => m.teamId === teamId);
}

export function getComments(teamId: string): Comment[] {
  return comments.filter((c) => c.teamId === teamId);
}

export interface TeamMaterial {
  event: PresentationEvent;
  slot: MaterialSlot;
  submission: Submission;
}

export function getAllPublishedMaterialsForTeam(teamId: string): TeamMaterial[] {
  return submissions
    .filter((s) => s.teamId === teamId && s.published && s.linkUrl)
    .flatMap((submission) => {
      const slot = materialSlots.find((s) => s.id === submission.slotId);
      if (!slot) return [];
      const event = events.find((e) => e.id === slot.eventId);
      if (!event) return [];
      return [{ event, slot, submission }];
    });
}

export function getArchivedEvents(now: Date = new Date()): PresentationEvent[] {
  return events
    .filter((e) => new Date(e.deadline) < now)
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
}

export function getTimetable(eventId: string): TimetableSlot[] {
  return timetableSlots
    .filter((t) => t.eventId === eventId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function resolveTimetableStatus(
  event: PresentationEvent,
  slot: TimetableSlot,
  now: Date = new Date()
): TimetableSlotStatus {
  const start = new Date(`${event.deadline}T${slot.startTime}:00`);
  const end = new Date(`${event.deadline}T${slot.endTime}:00`);
  if (now < start) return "予定";
  if (now < end) return "進行中";
  return "終了";
}

export function getPresentationLink(eventId: string, teamId: string): string | null {
  const slot = materialSlots.find((s) => s.eventId === eventId && s.kind === "発表資料");
  if (!slot) return null;
  const submission = submissions.find((s) => s.slotId === slot.id && s.teamId === teamId);
  return submission?.linkUrl ?? null;
}

export interface GaiyoshuContent {
  teamId: string;
  background: string;
  proposal: string;
  outlook: string;
}

export const gaiyoshuContents: GaiyoshuContent[] = [
  {
    teamId: "team-1",
    background:
      "教室や体育館での忘れ物が多く、先生が届け出を紙で管理していて発見・返却に時間がかかっていた。",
    proposal:
      "忘れ物を写真付きで登録し、生徒がアプリから検索・申請できるようにした。先生側は一覧管理と返却済みチェックのみで済む。",
    outlook: "紛失防止のため、貴重品タグとの連携や卒業アルバム委員会での活用を検討している。",
  },
  {
    teamId: "team-4",
    background: "生徒会選挙の投票が紙集計で開票に時間がかかり、投票率も伸び悩んでいた。",
    proposal:
      "スマートフォンから投票できるオンライン投票システムを構築し、集計を自動化。二重投票防止のため学校アカウントでログインする。",
    outlook: "文化祭の企画投票など、選挙以外の校内投票にも展開したい。",
  },
];

export function getGaiyoshuContent(teamId: string): GaiyoshuContent | undefined {
  return gaiyoshuContents.find((g) => g.teamId === teamId);
}

export interface SummaryBookletEntry {
  team: Team;
  slot: MaterialSlot | undefined;
  submission: Submission | undefined;
  content: GaiyoshuContent | undefined;
}

export function getSummaryBooklet(eventId: string): SummaryBookletEntry[] {
  const event = getEvent(eventId);
  const slot = materialSlots.find((s) => s.eventId === eventId && s.kind === "概要集用サマリー");
  const relevantTeams = teams.filter((t) => t.year === event?.year);

  const timetable = getTimetable(eventId);
  const orderedTeams =
    timetable.length > 0
      ? timetable
          .map((tt) => relevantTeams.find((t) => t.id === tt.teamId))
          .filter((t): t is Team => Boolean(t))
      : [...relevantTeams].sort((a, b) => a.order - b.order);

  return orderedTeams.map((team) => ({
    team,
    slot,
    submission: slot ? submissions.find((s) => s.slotId === slot.id && s.teamId === team.id) : undefined,
    content: getGaiyoshuContent(team.id),
  }));
}

export function searchTeams(keyword: string): Team[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return [];
  return teams.filter(
    (t) => t.name.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q)
  );
}
