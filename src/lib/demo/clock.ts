// デモ用の時刻(先生の筋だけが読む「いま」)。本物の時計は読まない。
// 値はモックのデータ(lib/mock/announcements.ts の設計書発表会: 締切 10/14 23:59・開催日 10/15・
// タイムテーブルの最初の発表 13:00)と矛盾しないように置く。

export type DemoClockPresetId = "accepting" | "afterDeadline" | "onTheDay";

export type DemoClockPreset = {
  id: DemoClockPresetId;
  // 帯のボタンに出す短い名前。
  label: string;
  // 「いま」の値(JST のオフセット付き ISO 8601)。
  at: string;
};

export const DEMO_CLOCK_PRESETS: DemoClockPreset[] = [
  // 場面 1: 受付中(締切 10/14 23:59 の 2 日前)。Nova・Lumen はまだ出していない。
  { id: "accepting", label: "10/12 受付中", at: "2026-10-12T10:00:00+09:00" },
  // 場面 2: 締切後・発表前(全チーム提出済み。発表の開始 13:00 より前)。
  { id: "afterDeadline", label: "10/15 12:30 締切後", at: "2026-10-15T12:30:00+09:00" },
  // 場面 3: 当日(最初の発表 13:00〜13:12 の途中)。
  { id: "onTheDay", label: "10/15 13:05 当日", at: "2026-10-15T13:05:00+09:00" },
];

export const DEFAULT_DEMO_CLOCK_PRESET_ID: DemoClockPresetId = "accepting";

export function isDemoClockPresetId(value: unknown): value is DemoClockPresetId {
  return DEMO_CLOCK_PRESETS.some((p) => p.id === value);
}

export function getDemoClockPreset(id: DemoClockPresetId): DemoClockPreset {
  return DEMO_CLOCK_PRESETS.find((p) => p.id === id) ?? DEMO_CLOCK_PRESETS[0];
}

// --- JST の暦の計算(モックの日時はすべて +09:00 で持っている) ---

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-10-15" と "13:00" から、その日時(JST)のミリ秒を作る。
export function jstDateTimeMs(date: string, time = "00:00"): number {
  return new Date(`${date}T${time}:00+09:00`).getTime();
}

// ミリ秒を JST の暦日の通し番号にする(日数の差を数えるため)。
export function jstDayNumber(ms: number): number {
  return Math.floor((ms + JST_OFFSET_MS) / DAY_MS);
}

// 暦日で何日先か(10/12 から見た 10/14 23:59 は 2)。過ぎていれば負。
export function jstDaysUntil(fromMs: number, toMs: number): number {
  return jstDayNumber(toMs) - jstDayNumber(fromMs);
}

export function addDaysMs(ms: number, days: number): number {
  return ms + days * DAY_MS;
}

// "13:05" ↔ 分
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const clockFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// 帯の「いま」の表示(例: 10/15(木) 13:05)。
export function formatDemoClock(ms: number): string {
  return clockFormatter.format(new Date(ms));
}
