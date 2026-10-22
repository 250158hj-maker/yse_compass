"use server";

import { auth } from "@/auth";
import { isId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { SlotError, addMaterialSlot, deleteMaterialSlot, updateMaterialSlot, updateOccasionDate, type NewSlotInput, type SlotErrorCode, type SlotPatch } from "@/lib/data/slots";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-1。規則と認可の本体は lib/data/slots.ts にある（一次防衛線）。ここは、サインイン済みのロールを
// 取り出して渡し、SlotError を画面が扱える結果に直すだけの薄い層。
// ロールはサインイン時にトークンへ載せた値で、解除の即時性は保証しない（H-30）。

export type SlotActionResult<T> = { ok: true; data: T } | { ok: false; code: SlotErrorCode | "unauthenticated" };

// 引数の形だけを確かめる（Server Action は画面の型を通らずに直接呼べるため）。値の規則はデータ層が確かめる。ロールの判定はここに足さない。
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

async function run<T>(valid: boolean, fn: (actor: Actor) => Promise<T>): Promise<SlotActionResult<T>> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "unauthenticated" };
  if (!valid) return { ok: false, code: "invalid_input" };
  try {
    return { ok: true, data: await fn({ userId: session.user.id, role: session.user.role }) };
  } catch (e) {
    if (e instanceof SlotError) return { ok: false, code: e.code };
    throw e;
  }
}

export async function addMaterialSlotAction(occasionId: number, input: NewSlotInput) {
  return run(isId(occasionId) && isObject(input), (actor) => addMaterialSlot(prisma, actor, occasionId, input));
}

export async function updateMaterialSlotAction(slotId: number, patch: SlotPatch) {
  return run(isId(slotId) && isObject(patch), (actor) => updateMaterialSlot(prisma, actor, slotId, patch));
}

export async function deleteMaterialSlotAction(slotId: number) {
  return run(isId(slotId), (actor) => deleteMaterialSlot(prisma, actor, slotId));
}

export async function updateOccasionDateAction(occasionId: number, eventDate: string | null) {
  return run(isId(occasionId) && (eventDate === null || typeof eventDate === "string"), (actor) => updateOccasionDate(prisma, actor, occasionId, eventDate));
}
