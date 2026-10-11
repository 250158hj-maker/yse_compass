"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useDemoClock } from "@/context/DemoClockContext";
import { useSession } from "@/context/SessionContext";
import type { DemoClockPresetId } from "@/lib/demo/clock";
import { getAnnouncementById, getTeamsByYear, getTimetableFor, users } from "@/lib/mock";
import {
  buildBookletEntries,
  deriveAnnouncementPeriod,
  deriveTeacherNextAction,
  moveSlot,
  pickTeacherFocusAnnouncement,
  nextTeamId,
  sortSlots,
  teamSlotsInOrder,
  type AnnouncementPeriod,
  type BookletEntry,
  type TeacherNextAction,
} from "@/lib/demo/teacher-derived";
import { readStorage, removeStorage, writeStorage } from "@/lib/demo/storage";
import { createdTeamToTeam, type CreatedTeam, type NewTeamInput } from "@/lib/demo/team-create";
import type { Announcement, AppUser, Team, Timetable, TimetableSlot } from "@/lib/types";

// 先生の画面(ホーム・ハブ・SC-07・SC-08・SC-11)が同じものを読み書きする、デモ用の共有状態。
//
// - 持つのは「先生が操作で変えた差分」だけ。何も操作していない発表会は、モックのデータ
//   (lib/mock/announcements.ts の timetables・isPublished)をそのまま初期値として読む。
// - タイムテーブルの currentPresentingTeamId(モックに直書きの "team-cheers")は読まない。
//   発表中は先生の操作(「最初の発表を開始」「次の発表へ」)だけで決める。当日に入っても、先生が開始するまでは null。
//   (glossary.md 末尾の注記:状態遷移は先生の明示操作を正とし、時刻・条件による自動遷移は持たない)
// - ブラウザ(localStorage)に保存する。読み書きに失敗してもメモリ上の状態で動く。
// - SC-20(先生の登録・解除)と SC-13(チーム作成)の操作もここに持つ。どちらも先生の画面にだけ反映し、
//   ログイン中のロール(SessionContext)・生徒の画面・提出状況などの導出には流さない。

const STORAGE_KEY = "yse-compass-demo-teacher-v1";

// 先生が当日の進行に手を入れた記録。これがあること = 先生が発表を開始したこと。
type PresentingOverride = {
  teamId: string | null;
  // 「次の発表へ」で最後のチームを終えた。
  finished: boolean;
  // 操作したときのデモ用の時刻。時刻(プリセット)を切り替えるとこの上書き自体を消す(useSwitchDemoClockPreset)。
  // 消し損ねた保存値(別のタブで時刻だけ変わった等)に備え、いまの時刻と食い違う上書きは読むときにも無視する。
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
  // SC-20: 先生ホワイトリストに載っている利用者の id(登録順)。無ければモックの users のロールが初期値。
  // 後から足したキーなので省略可(足す前に保存された値にも無い)。
  teacherRoster?: string[];
  // SC-13: このデモで先生が作ったチーム(作成順)。省略可(同上)。
  createdTeams?: CreatedTeam[];
};

const EMPTY_STATE: TeacherDemoState = { timetables: {}, published: {}, bookletGeneratedAt: {} };

function isRecord(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function isTeacherDemoState(value: unknown): value is TeacherDemoState {
  if (!isRecord(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    isRecord(v.timetables) &&
    isRecord(v.published) &&
    isRecord(v.bookletGeneratedAt) &&
    // 後から足したキーは、無くてもよい(古い保存値を弾かない)。あるときだけ形を見る。
    (v.teacherRoster === undefined ||
      (Array.isArray(v.teacherRoster) && v.teacherRoster.every((id) => typeof id === "string"))) &&
    (v.createdTeams === undefined || (Array.isArray(v.createdTeams) && v.createdTeams.every(isCreatedTeam)))
  );
}

function isCreatedTeam(value: unknown): value is CreatedTeam {
  if (!isRecord(value)) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.yearId === "string" &&
    typeof t.name === "string" &&
    typeof t.className === "string" &&
    typeof t.projectTitle === "string" &&
    typeof t.leaderName === "string" &&
    Array.isArray(t.members) &&
    t.members.every((m) => typeof m === "string")
  );
}

type TeacherDemoContextValue = {
  // 保存値の復元が済んだか。作ったチームの詳細のように、保存値に無ければ「見つからない」と出す画面が待つ。
  hasHydrated: boolean;
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
    <TeacherDemoContext.Provider value={{ hasHydrated, state, update: setState, reset }}>
      {children}
    </TeacherDemoContext.Provider>
  );
}

function useTeacherDemoContext(): TeacherDemoContextValue {
  const ctx = useContext(TeacherDemoContext);
  if (!ctx) {
    throw new Error("Teacher demo hooks must be used within a TeacherDemoProvider");
  }
  return ctx;
}

// 時刻(プリセット)を切り替えたときに呼ぶ: 全発表会の「発表中」の上書きを消し、当日の進行を開始前に戻す。
// 発表順・確定・概要集の生成・公開の記録は残す(消すのは「最初から」)。
function clearPresenting(prev: TeacherDemoState): TeacherDemoState {
  const entries = Object.entries(prev.timetables);
  if (!entries.some(([, t]) => t.presenting)) return prev;
  return {
    ...prev,
    timetables: Object.fromEntries(
      entries.map(([id, t]) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { presenting, ...rest } = t;
        return [id, rest];
      }),
    ),
  };
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
  // いま発表中のチーム。当日以外は常に null。当日でも、先生が開始するまでは null(時刻からは決めない)。
  currentPresentingTeamId: string | null;
  // 当日に先生が「最初の発表を開始」(または「次の発表へ」)を押したか。
  presentationsStarted: boolean;
  // 当日に「次の発表へ」で最後のチームを終えた。
  presentationsFinished: boolean;
  setPresenting: (teamId: string | null) => void;
  // SC-07: 最初の発表を開始(先頭の発表枠のチームを発表中にする)。
  start: () => void;
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

  // 上書きは「同じ時刻(プリセット)の中で操作したもの」だけ有効。時刻を切り替えたら開始前に戻る
  // (撮り直しで場面 3 に戻ったとき、前回の進行が残らないようにするため)。
  // 消すのは切り替えの操作(useSwitchDemoClockPreset)。プリセットの時刻は固定値なので、setAt の照合だけでは
  // 13:05 → 12:30 → 13:05 と戻したときに前回の上書きが有効に戻ってしまう。ここの照合は消し損ねに備えた保険。
  const presenting = override.presenting?.setAt === nowIso ? override.presenting : undefined;
  const onTheDay = period === "当日";
  const presentationsStarted = onTheDay && !!presenting;
  const currentPresentingTeamId = presentationsStarted ? presenting!.teamId : null;
  const presentationsFinished = presentationsStarted && !!presenting!.finished;

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
          // 並べ替えで時刻が動いても、いま発表中のチームはそのまま(発表中は時刻からは決めない)。
          slots: moveSlot(t.slots ?? slots, slotId, direction),
        })),
      ),
    orderConfirmed: !!override.confirmedAt,
    confirmedAt: override.confirmedAt ?? null,
    period,
    currentPresentingTeamId,
    presentationsStarted,
    presentationsFinished,
    setPresenting: (teamId) => setPresentingOverride(teamId),
    start: () => setPresentingOverride(teamSlotsInOrder(slots)[0]?.teamId ?? null),
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
    slots: timetable.slots,
    period: timetable.period,
    nowMs,
    orderConfirmed: timetable.orderConfirmed,
    bookletGenerated: !!generatedAt,
    presentingTeamId: timetable.currentPresentingTeamId,
    presentationsStarted: timetable.presentationsStarted,
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

// デモ用の時刻(プリセット)を切り替える。帯のプリセットのボタンはこれを使う。
// 時刻を切り替えたら当日の進行(発表中の上書き)を必ず消す。同じプリセットを押し直しても消す(撮り直しの起点)。
export function useSwitchDemoClockPreset(): (id: DemoClockPresetId) => void {
  const { update } = useTeacherDemoContext();
  const { setPreset } = useDemoClock();
  return (id) => {
    setPreset(id);
    update(clearPresenting);
  };
}

// ------------------------------------------------------------
// 先生の登録・解除(SC-20)
// ------------------------------------------------------------
//
// 正典: decisions.md 2026-09-06(H-11 決着)・04-screen.md SC-20。
// - 先生の追加はこの画面だけ。登録できるのは一度サインインした利用者だけ(H-26 の先行方針「初回サインイン後の昇格のみ」)。
//   モックでは users のうち、いま先生でない人が候補。メールを入力して事前登録する手段は持たない。
// - 自分自身は解除できない。これでホワイトリストは空にならないので、「最後の 1 人か」を判定する分岐は持たない
//   (04-screen.md SC-20「できないこと」)。
// - ログイン中のロール(SessionContext のペルソナ)は変えない。ここで先生に上げた生徒でログインしても生徒のまま。

export type UseTeacherRosterResult = {
  // 先生として登録されている利用者(登録順)。
  teachers: AppUser[];
  // 先生として登録できる利用者(サインイン済みで、いま先生でない人)。
  candidates: AppUser[];
  // 解除できるか(自分自身は解除できない)。
  canUnregister: (userId: string) => boolean;
  register: (userId: string) => void;
  unregister: (userId: string) => void;
};

const BASE_TEACHER_IDS = users.filter((u) => u.role === "teacher").map((u) => u.id);

export function useTeacherRoster(): UseTeacherRosterResult {
  const { state, update } = useTeacherDemoContext();
  const { currentUser } = useSession();
  const ids = state.teacherRoster ?? BASE_TEACHER_IDS;
  const teachers = ids.map((id) => users.find((u) => u.id === id)).filter((u): u is AppUser => !!u);
  const candidates = users.filter((u) => !ids.includes(u.id));
  const canUnregister = (userId: string) => userId !== currentUser?.id && ids.includes(userId);
  return {
    teachers,
    candidates,
    canUnregister,
    register: (userId) =>
      update((prev) => {
        const current = prev.teacherRoster ?? BASE_TEACHER_IDS;
        if (current.includes(userId) || !users.some((u) => u.id === userId)) return prev;
        return { ...prev, teacherRoster: [...current, userId] };
      }),
    unregister: (userId) => {
      if (!canUnregister(userId)) return;
      update((prev) => ({
        ...prev,
        teacherRoster: (prev.teacherRoster ?? BASE_TEACHER_IDS).filter((id) => id !== userId),
      }));
    },
  };
}

// ------------------------------------------------------------
// チームの作成(SC-13)と、作ったチームの詳細(SC-14)
// ------------------------------------------------------------
//
// 作ったチームは先生の SC-13 の一覧と、そのチームの SC-14 にだけ出す。提出状況・タイムテーブル・概要集・
// ホームの件数・生徒の画面には流さない(区間 B・C を変えないため)。

export type UseCreatedTeamsResult = {
  hasHydrated: boolean;
  // 作ったチーム(作成順)。画面にそのまま渡せる Team の形(summary は空・公開許可は未設定)。
  teams: Team[];
  getById: (teamId: string) => Team | null;
  create: (input: NewTeamInput) => Team;
};

export function useCreatedTeams(): UseCreatedTeamsResult {
  const { hasHydrated, state, update } = useTeacherDemoContext();
  const created = state.createdTeams ?? [];
  const teams = created.map(createdTeamToTeam);
  return {
    hasHydrated,
    teams,
    getById: (teamId) => teams.find((t) => t.id === teamId) ?? null,
    create: (input) => {
      // 削除の操作は無いので、件数からの連番で重ならない(「最初から」で 1 に戻る)。
      const team: CreatedTeam = { id: `created-team-${created.length + 1}`, ...input };
      update((prev) => ({ ...prev, createdTeams: [...(prev.createdTeams ?? []), team] }));
      return createdTeamToTeam(team);
    },
  };
}

// デモを最初からやり直す(並び・発表中・公開・概要集の生成・先生の登録・作ったチームをすべてモックの初期値へ)。
export function useTeacherDemoReset(): () => void {
  return useTeacherDemoContext().reset;
}
