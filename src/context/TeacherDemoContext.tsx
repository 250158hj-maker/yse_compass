"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useDemoClock } from "@/context/DemoClockContext";
import { getAnnouncementById, getTeamsByYear, getTimetableFor } from "@/lib/mock";
import {
  buildBookletEntries,
  deriveAnnouncementPeriod,
  deriveTeacherNextAction,
  moveSlot,
  pickTeacherFocusAnnouncement,
  nextTeamId,
  sortSlots,
  teamIdAtTime,
  type AnnouncementPeriod,
  type BookletEntry,
  type TeacherNextAction,
} from "@/lib/demo/teacher-derived";
import { readStorage, removeStorage, writeStorage } from "@/lib/demo/storage";
import type { Announcement, Team, Timetable, TimetableSlot } from "@/lib/types";

// 先生の画面(ホーム・ハブ・SC-07・SC-08・SC-11)が同じものを読み書きする、デモ用の共有状態。
//
// - 持つのは「先生が操作で変えた差分」だけ。何も操作していない発表会は、モックのデータ
//   (lib/mock/announcements.ts の timetables・isPublished)をそのまま初期値として読む。
// - タイムテーブルの currentPresentingTeamId(モックに直書きの "team-cheers")は読まない。
//   発表中は「当日に入ったら時刻に合う枠が初期値、先生が手で進めたらその値」で決める。
// - ブラウザ(localStorage)に保存する。読み書きに失敗してもメモリ上の状態で動く。

const STORAGE_KEY = "yse-compass-demo-teacher-v1";

type PresentingOverride = {
  teamId: string | null;
  // 「次の発表へ」で最後のチームを終えた。
  finished: boolean;
  // 操作したときのデモ用の時刻。時刻(プリセット)が変わったら、この上書きは無効になり初期値に戻る。
  setAt: string;
};

type TimetableOverride = {
  // 保存済みの並び(無ければモックの並び)。
  slots?: TimetableSlot[];
  // SC-08 で編集中・未保存の並び。
  draft?: TimetableSlot[];
  // SC-08 で保存した時刻(= 発表順を確定した)。
  confirmedAt?: string;
  presenting?: PresentingOverride;
};

type TeacherDemoState = {
  timetables: Record<string, TimetableOverride>;
  published: Record<string, boolean>;
  bookletGeneratedAt: Record<string, string>;
};

const EMPTY_STATE: TeacherDemoState = { timetables: {}, published: {}, bookletGeneratedAt: {} };

function isTeacherDemoState(value: unknown): value is TeacherDemoState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.timetables === "object" &&
    v.timetables !== null &&
    typeof v.published === "object" &&
    v.published !== null &&
    typeof v.bookletGeneratedAt === "object" &&
    v.bookletGeneratedAt !== null
  );
}

type TeacherDemoContextValue = {
  state: TeacherDemoState;
  update: (fn: (prev: TeacherDemoState) => TeacherDemoState) => void;
  reset: () => void;
};

const TeacherDemoContext = createContext<TeacherDemoContextValue | null>(null);

export function TeacherDemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TeacherDemoState>(EMPTY_STATE);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const stored = readStorage(STORAGE_KEY, isTeacherDemoState);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setState(stored);
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    // 復元前に書くと、保存済みの値を空の状態で上書きしてしまう。
    if (!hasHydrated) return;
    writeStorage(STORAGE_KEY, state);
  }, [state, hasHydrated]);

  function reset() {
    setState(EMPTY_STATE);
    removeStorage(STORAGE_KEY);
  }

  return (
    <TeacherDemoContext.Provider value={{ state, update: setState, reset }}>{children}</TeacherDemoContext.Provider>
  );
}

function useTeacherDemoContext(): TeacherDemoContextValue {
  const ctx = useContext(TeacherDemoContext);
  if (!ctx) {
    throw new Error("Teacher demo hooks must be used within a TeacherDemoProvider");
  }
  return ctx;
}

function patchTimetable(
  prev: TeacherDemoState,
  announcementId: string,
  fn: (t: TimetableOverride) => TimetableOverride,
): TeacherDemoState {
  return {
    ...prev,
    timetables: { ...prev.timetables, [announcementId]: fn(prev.timetables[announcementId] ?? {}) },
  };
}

// ------------------------------------------------------------
// タイムテーブル(SC-07・SC-08・SC-11・ホーム・ハブ)
// ------------------------------------------------------------

export type UseTimetableResult = {
  // モックにタイムテーブルがあるか(無い発表会では slots は空)。
  hasTimetable: boolean;
  // 保存済みの並び(order 順)。SC-07・SC-11・ホーム・ハブはこれを読む。
  slots: TimetableSlot[];
  // SC-08 で表示する並び(未保存の編集があればそれ、無ければ保存済み)。
  draftSlots: TimetableSlot[];
  isDirty: boolean;
  // SC-08: 1 つ前後と入れ替える(未保存。開始時刻は先頭から積み直す)。
  move: (slotId: string, direction: -1 | 1) => void;
  // SC-08: 未保存の並びを丸ごと差し替える(時刻・所要・休憩の編集を自前で行う画面向け。開始時刻の積み直しはしない。
  // 積み直したいときは lib/demo/teacher-derived.ts の reflowSlots を通してから渡す)。
  setDraftSlots: (slots: TimetableSlot[]) => void;
  // SC-08: 未保存の並びを保存し、発表順を確定する(confirmedAt にいまの時刻を記録)。
  save: () => void;
  discard: () => void;
  // SC-07: 当日の入れ替え。保存を挟まずにすぐ反映する(いまの発表中は動かさない)。
  moveNow: (slotId: string, direction: -1 | 1) => void;
  orderConfirmed: boolean;
  confirmedAt: string | null;
  // いまの時期(受付中 / 締切後 / 当日 / 終了)。
  period: AnnouncementPeriod;
  // いま発表中のチーム。当日以外は常に null。
  currentPresentingTeamId: string | null;
  // 当日に「次の発表へ」で最後のチームを終えた。
  presentationsFinished: boolean;
  setPresenting: (teamId: string | null) => void;
  // 次の発表へ(だれもいなければ先頭へ、最後の次は終了)。
  next: () => void;
  // TimetableRows などにそのまま渡せる形(currentPresentingTeamId は上の導出値)。無ければ null。
  timetable: Timetable | null;
};

export function useTimetable(announcementId: string): UseTimetableResult {
  const { state, update } = useTeacherDemoContext();
  const { nowMs, nowIso } = useDemoClock();
  const announcement = getAnnouncementById(announcementId);
  const base = getTimetableFor(announcementId);
  const override = state.timetables[announcementId] ?? {};

  const slots = sortSlots(override.slots ?? base?.slots ?? []);
  const draftSlots = sortSlots(override.draft ?? slots);
  const period: AnnouncementPeriod = announcement
    ? deriveAnnouncementPeriod(announcement, slots, nowMs)
    : "受付中";

  // 上書きは「同じ時刻(プリセット)の中で操作したもの」だけ有効。時刻を切り替えたら初期値に戻る。
  const presenting = override.presenting?.setAt === nowIso ? override.presenting : undefined;
  const initialTeamId = announcement ? teamIdAtTime(announcement, slots, nowMs) : null;
  const onTheDay = period === "当日";
  const currentPresentingTeamId = onTheDay ? (presenting ? presenting.teamId : initialTeamId) : null;
  const presentationsFinished = onTheDay && !!presenting?.finished;

  function setPresentingOverride(teamId: string | null, finished = false) {
    update((prev) =>
      patchTimetable(prev, announcementId, (t) => ({ ...t, presenting: { teamId, finished, setAt: nowIso } })),
    );
  }

  return {
    hasTimetable: !!base,
    slots,
    draftSlots,
    isDirty: !!override.draft,
    move: (slotId, direction) =>
      update((prev) =>
        patchTimetable(prev, announcementId, (t) => ({ ...t, draft: moveSlot(t.draft ?? t.slots ?? slots, slotId, direction) })),
      ),
    setDraftSlots: (next) => update((prev) => patchTimetable(prev, announcementId, (t) => ({ ...t, draft: next }))),
    save: () =>
      update((prev) =>
        patchTimetable(prev, announcementId, (t) => {
          const { draft, ...rest } = t;
          return { ...rest, slots: draft ?? t.slots ?? slots, confirmedAt: nowIso };
        }),
      ),
    discard: () =>
      update((prev) =>
        patchTimetable(prev, announcementId, (t) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { draft, ...rest } = t;
          return rest;
        }),
      ),
    moveNow: (slotId, direction) =>
      update((prev) =>
        patchTimetable(prev, announcementId, (t) => ({
          ...t,
          slots: moveSlot(t.slots ?? slots, slotId, direction),
          // 並べ替えで時刻が動いても、いま発表中のチームはそのままにする(時刻連動の自動進行はしない)。
          presenting:
            onTheDay && !presenting
              ? { teamId: currentPresentingTeamId, finished: false, setAt: nowIso }
              : t.presenting,
        })),
      ),
    orderConfirmed: !!override.confirmedAt,
    confirmedAt: override.confirmedAt ?? null,
    period,
    currentPresentingTeamId,
    presentationsFinished,
    setPresenting: (teamId) => setPresentingOverride(teamId),
    next: () => {
      if (presentationsFinished) return;
      const nextId = nextTeamId(slots, currentPresentingTeamId);
      setPresentingOverride(nextId, currentPresentingTeamId !== null && nextId === null);
    },
    timetable: base ? { announcementId, slots, currentPresentingTeamId } : null,
  };
}

// ------------------------------------------------------------
// 公開(ハブの工程表 ⑥・ホーム)
// ------------------------------------------------------------

export type UsePublishResult = {
  isPublished: boolean;
  publish: () => void;
  unpublish: () => void;
  setPublished: (value: boolean) => void;
};

export function usePublish(announcementId: string): UsePublishResult {
  const { state, update } = useTeacherDemoContext();
  const base = getAnnouncementById(announcementId)?.isPublished ?? false;
  const isPublished = state.published[announcementId] ?? base;
  function setPublished(value: boolean) {
    update((prev) => ({ ...prev, published: { ...prev.published, [announcementId]: value } }));
  }
  return { isPublished, publish: () => setPublished(true), unpublish: () => setPublished(false), setPublished };
}

// ------------------------------------------------------------
// 概要集(SC-11・ハブの工程表)
// ------------------------------------------------------------

export type UseBookletResult = {
  // 保存済みの発表順に並べた、いまの時点で提出済みの概要。
  entries: BookletEntry[];
  // 概要が未提出のチーム(発表順)。
  missing: Team[];
  // SC-11 で「生成」した時刻(デモ用の時刻)。
  generatedAt: string | null;
  markGenerated: () => void;
};

export function useBooklet(announcementId: string): UseBookletResult {
  const { state, update } = useTeacherDemoContext();
  const { nowMs, nowIso } = useDemoClock();
  const { slots } = useTimetable(announcementId);
  const announcement = getAnnouncementById(announcementId);
  const { entries, missing } = announcement
    ? buildBookletEntries(announcement, slots, nowMs)
    : { entries: [], missing: [] };
  return {
    entries,
    missing,
    generatedAt: state.bookletGeneratedAt[announcementId] ?? null,
    markGenerated: () =>
      update((prev) => ({ ...prev, bookletGeneratedAt: { ...prev.bookletGeneratedAt, [announcementId]: nowIso } })),
  };
}

// ------------------------------------------------------------
// 先生のホームの「次にやること」
// ------------------------------------------------------------

export function useTeacherNextAction(announcementId: string): TeacherNextAction | null {
  const { nowMs } = useDemoClock();
  const timetable = useTimetable(announcementId);
  const { isPublished } = usePublish(announcementId);
  const { generatedAt } = useBooklet(announcementId);
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) return null;
  return deriveTeacherNextAction({
    announcement,
    teams: getTeamsByYear(announcement.yearId),
    period: timetable.period,
    nowMs,
    orderConfirmed: timetable.orderConfirmed,
    bookletGenerated: !!generatedAt,
    presentingTeamId: timetable.currentPresentingTeamId,
    presentationsFinished: timetable.presentationsFinished,
    isPublished,
  });
}

// 先生のホームが扱う発表会(まだ終了していない最初のもの)。発表会ごとの保存済みの並びを見て時期を決める。
export function useTeacherFocusAnnouncement(announcements: Announcement[]): Announcement | null {
  const { state } = useTeacherDemoContext();
  const { nowMs } = useDemoClock();
  return pickTeacherFocusAnnouncement(
    announcements,
    (id) => state.timetables[id]?.slots ?? getTimetableFor(id)?.slots ?? [],
    nowMs,
  );
}

// デモを最初からやり直す(並び・発表中・公開・概要集の生成をすべてモックの初期値へ)。
export function useTeacherDemoReset(): () => void {
  return useTeacherDemoContext().reset;
}
