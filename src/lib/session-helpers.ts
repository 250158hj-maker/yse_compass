import type { AppUser } from "@/lib/types";

export function isTeacher(user: AppUser | null): boolean {
  return user?.role === "teacher";
}

// S1(発表側)/S2(聴講側)はDB上のロールではなく、閲覧中のチームが自チームか否かの文脈で決まる。
export function isOwnTeam(user: AppUser | null, teamId: string): boolean {
  return user?.role === "student" && user.teamId === teamId;
}
