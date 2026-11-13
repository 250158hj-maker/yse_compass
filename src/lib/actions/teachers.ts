"use server";

import { auth } from "@/auth";
import { isId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { TeacherError, listTeacherRoster, registerTeacher, unregisterTeacher, type TeacherErrorCode } from "@/lib/data/teachers";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-6・design/04-screen.md SC-20。規則と認可の本体は lib/data/teachers.ts にある（一次防衛線）。ここは、サインイン済みのロールを取り出して渡し、
// TeacherError を画面が扱える結果に直すだけの薄い層（lib/actions/years.ts と同じ形）。ロールはサインイン時にトークンへ載せた値で、解除の即時性は保証しない（H-30）。

export type TeacherActionResult<T> = { ok: true; data: T } | { ok: false; code: TeacherErrorCode | "unauthenticated" };

// 引数の形だけを確かめる（Server Action は画面の型を通らずに直接呼べるため）。値の規則はデータ層が確かめる。ロールの判定はここに足さない。
async function run<T>(valid: boolean, fn: (actor: Actor) => Promise<T>): Promise<TeacherActionResult<T>> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "unauthenticated" };
  if (!valid) return { ok: false, code: "invalid_input" };
  try {
    return { ok: true, data: await fn({ userId: session.user.id, role: session.user.role }) };
  } catch (e) {
    if (e instanceof TeacherError) return { ok: false, code: e.code };
    throw e;
  }
}

export async function listTeacherRosterAction() {
  return run(true, (actor) => listTeacherRoster(prisma, actor));
}

export async function registerTeacherAction(userId: number) {
  return run(isId(userId), (actor) => registerTeacher(prisma, actor, userId));
}

export async function unregisterTeacherAction(userId: number) {
  return run(isId(userId), (actor) => unregisterTeacher(prisma, actor, userId));
}
