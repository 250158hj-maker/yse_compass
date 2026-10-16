import { announcements, templates, timetables } from "@/lib/mock/announcements";
import { submissions } from "@/lib/mock/submissions";
import { teams } from "@/lib/mock/teams";
import { users } from "@/lib/mock/users";
import { years } from "@/lib/mock/years";
import { ANNOUNCEMENT_PHASE_ORDER } from "@/lib/types";

export { years, teams, announcements, templates, timetables, submissions, users };
export * from "@/lib/mock/derived";

export function getYearById(id: string) {
  return years.find((y) => y.id === id) ?? null;
}

export function getCurrentYear() {
  return years.find((y) => y.status === "進行中") ?? null;
}

export function getArchivedYears() {
  return years.filter((y) => y.status === "アーカイブ済み");
}

export function getAnnouncementById(id: string) {
  return announcements.find((a) => a.id === id) ?? null;
}

export function getAnnouncementsByYear(yearId: string) {
  return announcements
    .filter((a) => a.yearId === yearId)
    .sort((a, b) => ANNOUNCEMENT_PHASE_ORDER.indexOf(a.phase) - ANNOUNCEMENT_PHASE_ORDER.indexOf(b.phase));
}

export function getTeamById(id: string) {
  return teams.find((t) => t.id === id) ?? null;
}

export function getTeamsByYear(yearId: string) {
  return teams.filter((t) => t.yearId === yearId);
}

export function getPublishedWorksForYear(yearId: string) {
  return teams.filter((t) => t.yearId === yearId && t.publishPermission === "許可");
}

export function getTemplateById(id: string) {
  return templates.find((t) => t.id === id) ?? null;
}

export function getUserById(id: string) {
  return users.find((u) => u.id === id) ?? null;
}
