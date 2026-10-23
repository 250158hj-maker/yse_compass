"use server";

import { auth } from "@/auth";
import { isId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { SubmissionError, listTeamSubmissions, submitMaterial, type SubmissionErrorCode } from "@/lib/data/submissions";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-4。規則と認可の本体は lib/data/submissions.ts にある（一次防衛線）。ここは、サインイン済みのロールを
// 取り出して渡し、SubmissionError を画面が扱える結果に直すだけの薄い層。
// ロールはサインイン時にトークンへ載せた値で、解除の即時性は保証しない（H-30）。

export type SubmissionActionResult<T> = { ok: true; data: T } | { ok: false; code: SubmissionErrorCode | "unauthenticated" };

// 引数の形だけを確かめる（Server Action は画面の型を通らずに直接呼べるため）。値の規則はデータ層が確かめる。ロールの判定はここに足さない。
async function run<T>(valid: boolean, fn: (actor: Actor) => Promise<T>): Promise<SubmissionActionResult<T>> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "unauthenticated" };
  if (!valid) return { ok: false, code: "invalid_input" };
  try {
    return { ok: true, data: await fn({ userId: session.user.id, role: session.user.role }) };
  } catch (e) {
    if (e instanceof SubmissionError) return { ok: false, code: e.code };
    throw e;
  }
}

export async function submitMaterialAction(teamId: number, slotId: number, url: string) {
  return run(isId(teamId) && isId(slotId) && typeof url === "string", (actor) => submitMaterial(prisma, actor, teamId, slotId, url));
}

export async function listTeamSubmissionsAction(teamId: number, occasionId: number) {
  return run(isId(teamId) && isId(occasionId), (actor) => listTeamSubmissions(prisma, actor, teamId, occasionId));
}
