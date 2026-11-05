"use server";

import { auth } from "@/auth";
import { isId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { TimetableError, setCurrentPresentation, setDisplayOrders, type DisplayOrderUpdate, type TimetableErrorCode } from "@/lib/data/timetable";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-10。規則と認可の本体は lib/data/timetable.ts にある（一次防衛線）。ここは、サインイン済みのロールを
// 取り出して渡し、TimetableError を画面が扱える結果に直すだけの薄い層。読み取り（getTimetable）は Server Component がデータ層を直接呼ぶので、ここには無い。
// 発表順の更新は SC-07・SC-08 の共通の入口 1 つ（decisions.md 2026-10-26・H-48）。拒否の理由は presentation_locked で、画面が文言に結びつける。
// ロールはサインイン時にトークンへ載せた値で、解除の即時性は保証しない（H-30）。

export type TimetableActionResult<T> = { ok: true; data: T } | { ok: false; code: TimetableErrorCode | "unauthenticated" };

// 引数の形だけを確かめる（Server Action は画面の型を通らずに直接呼べるため）。値の規則はデータ層が確かめる。ロールの判定はここに足さない。
async function run<T>(valid: boolean, fn: (actor: Actor) => Promise<T>): Promise<TimetableActionResult<T>> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "unauthenticated" };
  if (!valid) return { ok: false, code: "invalid_input" };
  try {
    return { ok: true, data: await fn({ userId: session.user.id, role: session.user.role }) };
  } catch (e) {
    if (e instanceof TimetableError) return { ok: false, code: e.code };
    throw e;
  }
}

export async function setDisplayOrdersAction(occasionId: number, updates: DisplayOrderUpdate[]) {
  return run(isId(occasionId) && Array.isArray(updates), (actor) => setDisplayOrders(prisma, actor, occasionId, updates));
}

export async function setCurrentPresentationAction(occasionId: number, presentationId: number | null) {
  return run(isId(occasionId) && (presentationId === null || isId(presentationId)), (actor) => setCurrentPresentation(prisma, actor, occasionId, presentationId));
}
