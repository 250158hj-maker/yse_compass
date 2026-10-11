// タイムテーブルの時刻の導出(SC-08・SC-07 の先生の画面)。すべて純粋関数。
//
// 入力(先生が手で決めるもの)は 4 つだけ:
//   ① 最初の発表の開始時刻(1 つ) ② 1 チームの発表時間(全チーム一律で 1 つ)
//   ③ 休憩(挟む位置と長さ) ④ 発表順
// それ以外の時刻(2 枠目以降の開始・各枠の終了)はすべて導出する。規則は 1 つ:
//   次の枠の開始 = 前の枠の開始 + 前の枠の長さ
//   (チームの枠の長さ = 一律の発表時間、休憩の枠の長さ = その休憩の長さ)
// 枠が持っている startTime と、チームの枠の durationMin は読まない(導出で上書きする)。
//
// 正典との関係:時刻枠の中身(開始時刻・所要時間をどう持つか)は未決 H-20。ここはその一つの答えを先に描いている。

import { minutesToTime, timeToMinutes } from "@/lib/demo/clock";
import type { TimetableSlot } from "@/lib/types";

// 1 チームの発表時間の初期値。hearing の「発表は 10 分、質疑と準備を含めて 15 分」。
export const DEFAULT_TEAM_DURATION_MIN = 15;
// 「＋ 休憩を挟む」で足す休憩の長さの初期値。
export const DEFAULT_BREAK_DURATION_MIN = 10;
// 入力できる長さの範囲(分)。
export const MIN_DURATION_MIN = 1;
export const MAX_DURATION_MIN = 180;

export type ScheduleSettings = {
  // 最初の枠の開始時刻("HH:MM")。
  startTime: string;
  // 1 チームの発表時間(分)。全チームで一律。
  teamDurationMin: number;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTimeString(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function isValidDuration(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= MIN_DURATION_MIN && value <= MAX_DURATION_MIN
  );
}

export function isScheduleSettings(value: unknown): value is ScheduleSettings {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return isTimeString(v.startTime) && isValidDuration(v.teamDurationMin);
}

function sortByOrder(slots: TimetableSlot[]): TimetableSlot[] {
  return [...slots].sort((x, y) => x.order - y.order);
}

// 入力の初期値:開始時刻はデータの先頭の枠の開始時刻、発表時間は 15 分。
export function defaultSchedule(slots: TimetableSlot[], fallbackStartTime = "13:00"): ScheduleSettings {
  const first = sortByOrder(slots)[0];
  return {
    startTime: first && isTimeString(first.startTime) ? first.startTime : fallbackStartTime,
    teamDurationMin: DEFAULT_TEAM_DURATION_MIN,
  };
}

// 並び(order 順)と入力から、全部の枠の時刻を導出する。order は 1 から振り直す。
export function applySchedule(slots: TimetableSlot[], settings: ScheduleSettings): TimetableSlot[] {
  let cursor = timeToMinutes(settings.startTime);
  return sortByOrder(slots).map((slot, i) => {
    const durationMin = slot.isBreak ? slot.durationMin : settings.teamDurationMin;
    const next = { ...slot, order: i + 1, startTime: minutesToTime(cursor), durationMin } as TimetableSlot;
    cursor += durationMin;
    return next;
  });
}

// 枠の終了時刻(= 開始 + 長さ)。
export function slotEndTime(slot: Pick<TimetableSlot, "startTime" | "durationMin">): string {
  return minutesToTime(timeToMinutes(slot.startTime) + slot.durationMin);
}

// 並びの中で from 番目の枠を to 番目(動かした後の位置)へ移す。order を振り直す(時刻は applySchedule で導く)。
// 範囲外・同じ位置なら元の配列をそのまま返す。
export function reorderSlots(slots: TimetableSlot[], fromIndex: number, toIndex: number): TimetableSlot[] {
  const sorted = sortByOrder(slots);
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= sorted.length ||
    toIndex >= sorted.length
  ) {
    return slots;
  }
  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved);
  return sorted.map((s, i) => ({ ...s, order: i + 1 }) as TimetableSlot);
}

// id で指した枠を to 番目へ移す。
export function reorderSlotById(slots: TimetableSlot[], slotId: string, toIndex: number): TimetableSlot[] {
  const from = sortByOrder(slots).findIndex((s) => s.id === slotId);
  if (from < 0) return slots;
  return reorderSlots(slots, from, toIndex);
}

// 休憩の id。保存済みの並びと重ならないよう、いまある "tt-break-<n>" の最大 + 1 にする
// (再読み込みでカウンタが戻っても、保存値の id と重ならない)。
function nextBreakId(slots: TimetableSlot[]): string {
  const max = slots.reduce((acc, s) => {
    const m = /^tt-break-(\d+)$/.exec(s.id);
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `tt-break-${max + 1}`;
}

// index 番目の枠の後ろに休憩を挟む(index = -1 なら先頭)。
export function insertBreakAfter(
  slots: TimetableSlot[],
  index: number,
  durationMin = DEFAULT_BREAK_DURATION_MIN,
): TimetableSlot[] {
  const sorted = sortByOrder(slots);
  const at = Math.max(0, Math.min(index + 1, sorted.length));
  const breakSlot: TimetableSlot = {
    id: nextBreakId(sorted),
    order: at + 1,
    startTime: "00:00",
    durationMin,
    isBreak: true,
    breakLabel: "休憩",
  };
  sorted.splice(at, 0, breakSlot);
  return sorted.map((s, i) => ({ ...s, order: i + 1 }) as TimetableSlot);
}

// 休憩を外す。チームの枠は外さない(チームの枠はその発表会の全チームで固定)。
export function removeBreak(slots: TimetableSlot[], slotId: string): TimetableSlot[] {
  const target = slots.find((s) => s.id === slotId);
  if (!target || !target.isBreak) return slots;
  return sortByOrder(slots.filter((s) => s.id !== slotId)).map((s, i) => ({ ...s, order: i + 1 }) as TimetableSlot);
}

// 休憩の長さを変える。範囲外の値・チームの枠には何もしない。
export function setBreakDuration(slots: TimetableSlot[], slotId: string, durationMin: number): TimetableSlot[] {
  if (!isValidDuration(durationMin)) return slots;
  return slots.map((s) => (s.id === slotId && s.isBreak ? { ...s, durationMin } : s));
}
