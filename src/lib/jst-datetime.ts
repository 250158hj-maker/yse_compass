// 日時入力欄（<input type="datetime-local">）と、絶対時刻（ISO 文字列・Date）の変換。日時は日本時間で表示・入力する（decisions.md 2026-10-20・H-39 の決着。
// lib/format.ts と同じ理由で、実行環境のタイムゾーンに依らせない）。日本は夏時間が無いので、固定の +09:00 で足りる。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// ISO 文字列 → 入力欄の値（"YYYY-MM-DDTHH:mm"。日本時間）。空・未設定は ""。
export function toJstInputValue(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + JST_OFFSET_MS).toISOString().slice(0, 16);
}

// 入力欄の値（日本時間）→ Date。空は null（未設定）。形が合わないときも null にせず、無効な Date を返して、関数に invalid_input で拒ませる。
export function fromJstInputValue(value: string): Date | null {
  if (value === "") return null;
  return new Date(`${value}:00+09:00`);
}
