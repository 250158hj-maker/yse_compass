"use server";

import { auth } from "@/auth";
import { isId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { TeamError, addMember, createTeam, renameMember, setLeader, updateTeam, type Actor, type CreateTeamInput, type TeamErrorCode } from "@/lib/data/teams";

// 対応: docs/requirements.md §3-8。規則と認可の本体は lib/data/teams.ts にある（一次防衛線）。ここは、サインイン済みのロールを
// 取り出して渡し、TeamError を画面が扱える結果に直すだけの薄い層。
// ロールはサインイン時にトークンへ載せた値で、解除の即時性は保証しない（H-30）。

// 引数の形だけを確かめる（Server Action は画面の型を通らずに直接呼べるため）。値の範囲や規則はデータ層が確かめる。ロールの判定はここに足さない。
export type TeamActionResult<T> = { ok: true; data: T } | { ok: false; code: TeamErrorCode | "unauthenticated" };

const isText = (x: unknown): x is string => typeof x === "string";
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isOptional = (x: unknown, check: (v: unknown) => boolean) => x === undefined || check(x);

async function run<T>(valid: boolean, fn: (actor: Actor) => Promise<T>): Promise<TeamActionResult<T>> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "unauthenticated" };
  if (!valid) return { ok: false, code: "invalid_input" };
  try {
    return { ok: true, data: await fn({ userId: session.user.id, role: session.user.role }) };
  } catch (e) {
    if (e instanceof TeamError) return { ok: false, code: e.code };
    throw e;
  }
}

export async function createTeamAction(input: CreateTeamInput) {
  const valid =
    isObject(input) &&
    isId(input.classId) &&
    isText(input.name) &&
    isOptional(input.workTitle, (v) => v === null || isText(v)) &&
    Array.isArray(input.members) &&
    input.members.every(isText) &&
    isOptional(input.leaderIndex, Number.isInteger);
  return run(valid, (actor) => createTeam(prisma, actor, input));
}

export async function updateTeamAction(teamId: number, input: { name?: string; workTitle?: string | null }) {
  const valid = isId(teamId) && isObject(input) && isOptional(input.name, isText) && isOptional(input.workTitle, (v) => v === null || isText(v));
  return run(valid, (actor) => updateTeam(prisma, actor, teamId, input));
}

export async function addMemberAction(teamId: number, name: string) {
  return run(isId(teamId) && isText(name), (actor) => addMember(prisma, actor, teamId, name));
}

export async function renameMemberAction(memberId: number, name: string) {
  return run(isId(memberId) && isText(name), (actor) => renameMember(prisma, actor, memberId, name));
}

export async function setLeaderAction(teamId: number, memberId: number | null) {
  return run(isId(teamId) && (memberId === null || isId(memberId)), (actor) => setLeader(prisma, actor, teamId, memberId));
}
