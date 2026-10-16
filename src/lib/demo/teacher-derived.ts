// 先生の筋(デモ動画の区間 A)のための導出。すべて「いま」(デモ用の時刻・ミリ秒)を引数で受け取る純粋関数。
//
// - 本物の時計(Date.now / 引数なしの new Date())は読まない。
// - 手書きの Announcement.status と Material.status は読まない(時刻から導く)。
// - 既存の導出(lib/mock/derived.ts)は書き換えず、生徒の画面は従来どおりそちらを読む。

import { getSubmission, getTeamById } from "@/lib/mock";
import { getTeacherDemoPatch } from "@/lib/mock/teacher-demo";
import { addDaysMs, jstDateTimeMs, jstDaysUntil, minutesToTime, timeToMinutes } from "@/lib/demo/clock";
import type { Announcement, Material, Submission, SummaryEntry, Team, TimetableSlot } from "@/lib/types";

export type TeamSlot = Extract<TimetableSlot, { isBreak: false }>;

// ------------------------------------------------------------
// 発表会の時期
// ------------------------------------------------------------

// 正典に無い区分(設計メモ「正典の隙間の候補」)。デモの導出の中だけで使う。
export type AnnouncementPeriod = "受付中" | "締切後" | "当日" | "終了";

// 時期を分ける締切。いまのモックは発表会に 1 つの締切(submissionDeadline)しか持たない。
// 資料枠ごとに締切を持つようになったら、「必須の資料枠の締切のうち最も遅いもの」をここで返す
// (どれか 1 つでも受付中の必須枠が残っていれば、発表会としては受付中と読む)。
export function getPeriodDeadlineMs(announcement: Announcement): number {
  return new Date(announcement.submissionDeadline).getTime();
}

export function sortSlots(slots: TimetableSlot[]): TimetableSlot[] {
  return [...slots].sort((x, y) => x.order - y.order);
}

export function teamSlotsInOrder(slots: TimetableSlot[]): TeamSlot[] {
  return sortSlots(slots).filter((s): s is TeamSlot => !s.isBreak);
}

// 当日の発表の開始時刻。タイムテーブルの最も早い開始時刻(休憩も含めた全枠)。枠が無ければ開催日の 0:00。
export function getPresentationStartMs(announcement: Announcement, slots: TimetableSlot[]): number {
  if (slots.length === 0) return jstDateTimeMs(announcement.period);
  const earliest = Math.min(...slots.map((s) => timeToMinutes(s.startTime)));
  return jstDateTimeMs(announcement.period, minutesToTime(earliest));
}

// 締切前 = 受付中 / 締切後で当日の発表の開始前 = 締切後 / 開催日当日で開始以降 = 当日 / 開催日の翌日 0:00 以降 = 終了。
export function deriveAnnouncementPeriod(
  announcement: Announcement,
  slots: TimetableSlot[],
  nowMs: number,
): AnnouncementPeriod {
  const dayEnd = addDaysMs(jstDateTimeMs(announcement.period), 1);
  if (nowMs >= dayEnd) return "終了";
  if (nowMs < getPeriodDeadlineMs(announcement)) return "受付中";
  if (nowMs < getPresentationStartMs(announcement, slots)) return "締切後";
  return "当日";
}

// 締切まで暦日で何日か(10/12 から見て 10/14 23:59 は 2)。
export function daysUntilDeadline(announcement: Announcement, nowMs: number): number {
  return jstDaysUntil(nowMs, getPeriodDeadlineMs(announcement));
}

// ------------------------------------------------------------
// 提出(いまの時点のスナップショット)
// ------------------------------------------------------------

function atOrBefore(iso: string | null, nowMs: number): boolean {
  return iso !== null && new Date(iso).getTime() <= nowMs;
}

export function isMaterialSubmittedAt(material: Pick<Material, "firstSubmittedAt"> | null | undefined, nowMs: number) {
  return !!material && atOrBefore(material.firstSubmittedAt, nowMs);
}

export function isSummarySubmittedAt(summary: SummaryEntry | null | undefined, nowMs: number): boolean {
  return !!summary && atOrBefore(summary.submittedAt, nowMs);
}

// 資料 1 件を「いま」の時点に巻き戻す。まだ出していなければ未提出・日時なし、出していれば提出済み。
// 差し替え(updatedAt)がまだ先なら、初回提出の時点の値に戻す。
function snapshotMaterial(material: Material, nowMs: number): Material {
  if (!atOrBefore(material.firstSubmittedAt, nowMs)) {
    return { ...material, status: "未提出", firstSubmittedAt: null, updatedAt: null, driveUrl: null };
  }
  const updatedAt = atOrBefore(material.updatedAt, nowMs) ? material.updatedAt : material.firstSubmittedAt;
  return { ...material, status: "提出済み", updatedAt };
}

// submissions.ts のレコードに、先生用の補い(lib/mock/teacher-demo.ts)を重ね、「いま」の時点に巻き戻した写し。
// 返す Submission の status・日時は「いま」に合わせて作り直してあるので、StatusBadge・formatSubmittedAt・
// isLateSubmission など既存の部品にそのまま渡せる。元のレコードは変えない。
export function snapshotSubmission(announcementId: string, teamId: string, nowMs: number): Submission | null {
  const base = getSubmission(announcementId, teamId);
  if (!base) return null;
  const patch = getTeacherDemoPatch(announcementId, teamId);
  const materials = base.materials.map((m) => {
    const p = patch?.materials?.[m.name];
    return snapshotMaterial(p ? { ...m, ...p } : m, nowMs);
  });
  const summary = patch?.summary ?? base.summary;
  return {
    ...base,
    materials,
    summary: isSummarySubmittedAt(summary, nowMs) ? summary : null,
  };
}

export type MissingRequired = {
  // 必須の資料枠の未提出(チーム × 枠)の件数。
  count: number;
  // 未提出の必須枠が 1 つでもあるチーム(チームの並びのまま)。
  teams: Team[];
};

// 必須の資料枠のうち、いまの時点で未提出の件数(SC-06 の「必須枠の未提出」と同じ数え方。H-15)。
export function countMissingRequired(announcement: Announcement, teams: Team[], nowMs: number): MissingRequired {
  const required = announcement.materialSlots.filter((s) => s.required);
  let count = 0;
  const missingTeams: Team[] = [];
  for (const team of teams) {
    const snap = snapshotSubmission(announcement.id, team.id, nowMs);
    const missing = required.filter(
      (slot) => snap?.materials.find((m) => m.name === slot.name)?.status !== "提出済み",
    ).length;
    count += missing;
    if (missing > 0) missingTeams.push(team);
  }
  return { count, teams: missingTeams };
}

// ------------------------------------------------------------
// タイムテーブル
// ------------------------------------------------------------

// 並びを詰め直す: order を 1 から振り直し、開始時刻を先頭の開始時刻から所要時間の順に積み直す。
// (SC-08 で順番を入れ替えると、各枠が元の開始時刻を持ったままでは時刻が前後してしまうため)
export function reflowSlots(slots: TimetableSlot[]): TimetableSlot[] {
  const sorted = sortSlots(slots);
  if (sorted.length === 0) return sorted;
  let cursor = Math.min(...sorted.map((s) => timeToMinutes(s.startTime)));
  return sorted.map((slot, i) => {
    const next = { ...slot, order: i + 1, startTime: minutesToTime(cursor) } as TimetableSlot;
    cursor += slot.durationMin;
    return next;
  });
}

// 並びの中で 1 つ前後と入れ替え、詰め直す。端なら何もしない。
export function moveSlot(slots: TimetableSlot[], slotId: string, direction: -1 | 1): TimetableSlot[] {
  const sorted = sortSlots(slots);
  const index = sorted.findIndex((s) => s.id === slotId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sorted.length) return slots;
  [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  return reflowSlots(sorted.map((s, i) => ({ ...s, order: i + 1 }) as TimetableSlot));
}

// 「次の発表へ」: 並びで次のチーム。だれも発表中でなければ先頭、最後のチームの次は null(全発表の終了)。
export function nextTeamId(slots: TimetableSlot[], currentTeamId: string | null): string | null {
  const teamSlots = teamSlotsInOrder(slots);
  if (currentTeamId === null) return teamSlots[0]?.teamId ?? null;
  const index = teamSlots.findIndex((s) => s.teamId === currentTeamId);
  if (index < 0) return teamSlots[0]?.teamId ?? null;
  return teamSlots[index + 1]?.teamId ?? null;
}

// ------------------------------------------------------------
// 概要集
// ------------------------------------------------------------

export type BookletEntry = { team: Team; summary: SummaryEntry };

// 発表順(保存済みのタイムテーブル)に、いまの時点で提出済みの概要を束ねる。未提出のチームは missing に分ける。
export function buildBookletEntries(
  announcement: Announcement,
  slots: TimetableSlot[],
  nowMs: number,
): { entries: BookletEntry[]; missing: Team[] } {
  const entries: BookletEntry[] = [];
  const missing: Team[] = [];
  for (const slot of teamSlotsInOrder(slots)) {
    const team = getTeamById(slot.teamId);
    if (!team) continue;
    const summary = snapshotSubmission(announcement.id, team.id, nowMs)?.summary ?? null;
    if (summary) entries.push({ team, summary });
    else missing.push(team);
  }
  return { entries, missing };
}

// ------------------------------------------------------------
// 先生のホームの「次にやること」
// ------------------------------------------------------------

// 先生のホームが扱う発表会: 年度の発表会(回種別の順)のうち、まだ終了していない最初のもの。
// すべて終了していれば、最後のもの。
export function pickTeacherFocusAnnouncement(
  announcements: Announcement[],
  slotsOf: (announcementId: string) => TimetableSlot[],
  nowMs: number,
): Announcement | null {
  return (
    announcements.find((a) => deriveAnnouncementPeriod(a, slotsOf(a.id), nowMs) !== "終了") ??
    announcements[announcements.length - 1] ??
    null
  );
}

export type TeacherNextAction =
  // 場面 1: 資料の回収中。締切までの日数と、必須枠の未提出。
  | { kind: "collect"; daysLeft: number; missing: MissingRequired }
  // 場面 2: 締切後・発表前。発表順を確定して概要集を作る(確定済みなら概要集だけ)。
  | { kind: "prepare"; orderConfirmed: boolean; bookletGenerated: boolean; missing: MissingRequired }
  // 場面 3: 当日に入ったが、先生がまだ発表を開始していない(発表中は時刻からは決めない)。
  // startTime は先頭の発表枠の開始予定時刻。
  | { kind: "start"; startTime: string | null }
  // 場面 3: 当日の進行中(先生が開始した後)。
  | { kind: "run"; presentingTeamId: string | null }
  // 発表が終わって(当日で全発表を終えた、または終了)、まだ公開していない。
  | { kind: "publish" }
  // やることなし(公開済みで終了)。
  | { kind: "none" };

export function deriveTeacherNextAction(input: {
  announcement: Announcement;
  teams: Team[];
  slots: TimetableSlot[];
  period: AnnouncementPeriod;
  nowMs: number;
  orderConfirmed: boolean;
  bookletGenerated: boolean;
  presentingTeamId: string | null;
  // 当日に先生が発表を開始したか(TeacherDemoContext の presentationsStarted)。
  presentationsStarted: boolean;
  // 当日に「次の発表へ」で最後のチームを終えたか(TeacherDemoContext の finished)。
  presentationsFinished: boolean;
  isPublished: boolean;
}): TeacherNextAction {
  const { announcement, teams, period, nowMs } = input;
  switch (period) {
    case "受付中":
      return {
        kind: "collect",
        daysLeft: daysUntilDeadline(announcement, nowMs),
        missing: countMissingRequired(announcement, teams, nowMs),
      };
    case "締切後":
      return {
        kind: "prepare",
        orderConfirmed: input.orderConfirmed,
        bookletGenerated: input.bookletGenerated,
        missing: countMissingRequired(announcement, teams, nowMs),
      };
    case "当日":
      if (input.presentationsFinished) return input.isPublished ? { kind: "none" } : { kind: "publish" };
      if (!input.presentationsStarted) {
        return { kind: "start", startTime: teamSlotsInOrder(input.slots)[0]?.startTime ?? null };
      }
      return { kind: "run", presentingTeamId: input.presentingTeamId };
    case "終了":
      return input.isPublished ? { kind: "none" } : { kind: "publish" };
  }
}
