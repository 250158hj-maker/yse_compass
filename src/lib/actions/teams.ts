"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TeamError, addMember, createTeam, renameMember, setLeader, updateTeam, type Actor, type CreateTeamInput, type TeamErrorCode } from "@/lib/data/teams";

// 対応: docs/requirements.md §3-8。規則と認可の本体は lib/data/teams.ts にある（一次防衛線）。ここは、サインイン済みのロールを
// 取り出して渡し、TeamError を画面が扱える結果に直すだけの薄い層。
// ロールはサインイン時にトークンへ載せた値で、解除の即時性は保証しない（H-30）。

export type TeamActionResult<T> = { ok: true; data: T } | { ok: false; code: TeamErrorCode | "unauthenticated" };

async function run<T>(fn: (actor: Actor) => Promise<T>): Promise<TeamActionResult<T>> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "unauthenticated" };
  try {
    return { ok: true, data: await fn({ role: session.user.role }) };
  } catch (e) {
    if (e instanceof TeamError) return { ok: false, code: e.code };
    throw e;
  }
}

export async function createTeamAction(input: CreateTeamInput) {
  return run((actor) => createTeam(prisma, actor, input));
}

export async function updateTeamAction(teamId: number, input: { name?: string; workTitle?: string | null }) {
  return run((actor) => updateTeam(prisma, actor, teamId, input));
}

export async function addMemberAction(teamId: number, name: string) {
  return run((actor) => addMember(prisma, actor, teamId, name));
}

export async function renameMemberAction(memberId: number, name: string) {
  return run((actor) => renameMember(prisma, actor, memberId, name));
}

export async function setLeaderAction(teamId: number, memberId: number | null) {
  return run((actor) => setLeader(prisma, actor, teamId, memberId));
}
