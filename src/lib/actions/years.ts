"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { YearError, setupFiscalYear, type Actor, type SetupYearInput, type YearErrorCode } from "@/lib/data/years";

// 対応: docs/requirements.md §3-1。規則と認可の本体は lib/data/years.ts にある（一次防衛線）。ここは、サインイン済みのロールを
// 取り出して渡し、YearError を画面が扱える結果に直すだけの薄い層。
// ロールはサインイン時にトークンへ載せた値で、解除の即時性は保証しない（H-30）。

export type YearActionResult<T> = { ok: true; data: T } | { ok: false; code: YearErrorCode | "unauthenticated" };

// 引数の形だけを確かめる（Server Action は画面の型を通らずに直接呼べるため）。値の規則はデータ層が確かめる。ロールの判定はここに足さない。
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

async function run<T>(valid: boolean, fn: (actor: Actor) => Promise<T>): Promise<YearActionResult<T>> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "unauthenticated" };
  if (!valid) return { ok: false, code: "invalid_input" };
  try {
    return { ok: true, data: await fn({ role: session.user.role }) };
  } catch (e) {
    if (e instanceof YearError) return { ok: false, code: e.code };
    throw e;
  }
}

export async function setupYearAction(input: SetupYearInput) {
  const valid = isObject(input) && Number.isInteger(input.year) && Array.isArray(input.classNames) && input.classNames.every((n) => typeof n === "string");
  return run(valid, (actor) => setupFiscalYear(prisma, actor, input));
}
