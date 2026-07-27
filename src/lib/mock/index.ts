import type { Submission, Team } from "@/lib/types";

export * from "@/lib/mock/years";
export * from "@/lib/mock/teams";
export * from "@/lib/mock/announcements";
export * from "@/lib/mock/submissions";
export * from "@/lib/mock/users";

import { years } from "@/lib/mock/years";
import { teams } from "@/lib/mock/teams";
import { announcements, templates, timetables } from "@/lib/mock/announcements";
import { submissions } from "@/lib/mock/submissions";
import { users } from "@/lib/mock/users";

// ロール切替モックにおいて「自チーム(S1視点)」として固定するチームID
export const MOCK_PRESENTER_TEAM_ID = "team-cheers";

export function getYearById(id: string) {
  return years.find((y) => y.id === id);
}

export function getCurrentYear() {
  return years.find((y) => y.status === "進行中");
}

export function getArchivedYears() {
  return years.filter((y) => y.status === "アーカイブ済み");
}

export function getAnnouncementById(id: string) {
  return announcements.find((a) => a.id === id);
}

export function getAnnouncementsByYear(yearId: string) {
  return announcements.filter((a) => a.yearId === yearId);
}

export function getTeamById(id: string) {
  return teams.find((t) => t.id === id);
}

export function getTeamsByYear(yearId: string) {
  return teams.filter((t) => t.yearId === yearId);
}

export function getPublishedWorksForYear(yearId: string) {
  return teams.filter((t) => t.yearId === yearId && t.publishPermission === "許可");
}

export function getTemplateById(id: string) {
  return templates.find((t) => t.id === id);
}

export function getTimetable(announcementId: string) {
  return timetables.find((t) => t.announcementId === announcementId);
}

export function getSubmission(announcementId: string, teamId: string) {
  return submissions.find((s) => s.announcementId === announcementId && s.teamId === teamId);
}

export function getSubmissionsForAnnouncement(announcementId: string) {
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) return [];
  return getTeamsByYear(announcement.yearId)
    .map((team) => {
      const submission = getSubmission(announcementId, team.id);
      return submission ? { team, submission } : null;
    })
    .filter((entry): entry is { team: Team; submission: Submission } => entry !== null);
}

export function getUsers() {
  return users;
}

// 締切超過(=遅延)かどうかを提出日時と締切の比較で導出する。第3の状態は持たない。
export function isLateSubmission(updatedAt: string | null, deadline: string): boolean {
  if (!updatedAt) return false;
  return new Date(updatedAt.replace(" ", "T")).getTime() > new Date(deadline.replace(" ", "T")).getTime();
}

export function getOverallSubmissionStatus(submission: Submission): "未提出" | "提出済み" {
  const hasAnySubmitted = submission.materials.some((m) => m.status === "提出済み");
  return hasAnySubmitted ? "提出済み" : "未提出";
}

export type ArchiveSearchResult = {
  team: Team;
  yearLabel: string;
  matchedIn: string;
};

// アーカイブ検索：基本メタデータ＋概要の構造化データ(本文・使用技術欄)のみを対象とする(Drive実体検索はしない)
export function searchArchive(keyword: string): ArchiveSearchResult[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return [];

  const results: ArchiveSearchResult[] = [];
  for (const year of getArchivedYears()) {
    for (const team of getPublishedWorksForYear(year.id)) {
      const haystacks: { label: string; value: string }[] = [
        { label: "チーム名", value: team.name },
        { label: "作品名", value: team.projectTitle },
        { label: "年度", value: year.label },
      ];
      const relatedSubmissions = submissions.filter((s) => s.teamId === team.id);
      for (const submission of relatedSubmissions) {
        if (submission.summary) {
          haystacks.push({ label: "概要本文", value: submission.summary.onePageBody });
          haystacks.push({ label: "使用技術", value: submission.summary.techUsed.join(" ") });
        }
      }

      const hit = haystacks.find((h) => h.value.toLowerCase().includes(q));
      if (hit) {
        results.push({ team, yearLabel: year.label, matchedIn: hit.label });
      }
    }
  }
  return results;
}
