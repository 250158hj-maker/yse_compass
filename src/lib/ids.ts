// teams.id などの主キーは PostgreSQL の integer（serial）で、上限は 2147483647。
// 範囲を超える値を Prisma に渡すと例外になり、画面は 500 になる。外から来る ID は、DB に渡す前にここで形と範囲を確かめる。
export const MAX_ID = 2_147_483_647;

export function isId(x: unknown): x is number {
  return Number.isInteger(x) && (x as number) > 0 && (x as number) <= MAX_ID;
}

// URL のパラメータなど、文字列で来た ID を数にする。先頭の 0・符号・小数・空白・範囲外は null。
export function parseId(text: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(text)) return null;
  const id = Number(text);
  return isId(id) ? id : null;
}
