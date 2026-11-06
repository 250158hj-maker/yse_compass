"use client";

import { notFound } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useCreatedTeams } from "@/context/TeacherDemoContext";
import { isTeacher } from "@/lib/session-helpers";
import { TeamDetailClient } from "./TeamDetailClient";

// モックのデータに無いチーム id のとき、先生がこのデモで作ったチーム(先生の共有状態)から補って SC-14 を出す。
// 作ったチームは先生にだけ見せる。生徒・見つからない id は、これまでどおり「見つからない」。
export function CreatedTeamDetailClient({ teamId }: { teamId: string }) {
  const { currentUser } = useSession();
  const { hasHydrated, getById } = useCreatedTeams();
  // 保存値の復元前は、作ったチームがまだ読めていない。
  if (!hasHydrated) return null;
  const team = isTeacher(currentUser) ? getById(teamId) : null;
  if (!team) notFound();
  // 作ったチームには提出が無く、発表詳細(SC-12)もモックのデータしか読まないので、発表会の行はリンクにしない。
  return <TeamDetailClient team={team} linkPresentations={false} />;
}
