import { announcements, timetables } from "@/lib/mock/announcements";
import { submissions } from "@/lib/mock/submissions";
import { teams } from "@/lib/mock/teams";
import { years } from "@/lib/mock/years";
import { formatDateTime } from "@/lib/format";
import type { Announcement, Material, Submission, Team } from "@/lib/types";

export function getSubmission(announcementId: string, teamId: string): Submission | null {
  return submissions.find((s) => s.announcementId === announcementId && s.teamId === teamId) ?? null;
}

export function getSubmissionsForAnnouncement(announcementId: string): Submission[] {
  return submissions.filter((s) => s.announcementId === announcementId);
}

// 遅延は第3の状態ではなく、初回提出日時と締切の比較による導出表示(要件定義書 §3-2・H-6)。
// 最終更新日時で比べると、期限内に出した資料を締切後に差し替えただけで遅延に化ける。
export function isLateSubmission(deadline: string, firstSubmittedAt: string | null): boolean {
  if (!firstSubmittedAt) return false;
  return new Date(firstSubmittedAt).getTime() > new Date(deadline).getTime();
}

// 締切後に差し替えがあるか(06-data.md 6-6 の導出式と同じ。初回提出のときは 2 つの日時が同じ値)。
export function isReplacedAfterDeadline(deadline: string, material: Material): boolean {
  if (!material.firstSubmittedAt || !material.updatedAt) return false;
  return (
    new Date(material.updatedAt).getTime() > new Date(deadline).getTime() &&
    material.updatedAt !== material.firstSubmittedAt
  );
}

// 初回提出日時を出し、締切後に差し替えがあれば最終更新日時も添える(requirements.md §3-2・§3-5)。
export function formatSubmittedAt(deadline: string, material: Material): string | null {
  if (!material.firstSubmittedAt) return null;
  const first = formatDateTime(material.firstSubmittedAt);
  if (!isReplacedAfterDeadline(deadline, material) || !material.updatedAt) return first;
  return `${first}(最終更新 ${formatDateTime(material.updatedAt)})`;
}

export function isAnnouncementFullySubmitted(announcement: Announcement): boolean {
  const requiredSlotIds = announcement.materialSlots.filter((slot) => slot.required).map((slot) => slot.id);
  const relevantSubmissions = getSubmissionsForAnnouncement(announcement.id);
  return relevantSubmissions.every((submission) =>
    requiredSlotIds.every((slotId) => {
      const material = submission.materials.find((m) => m.name === matSlotName(announcement, slotId));
      return material?.status === "提出済み";
    })
  );
}

function matSlotName(announcement: Announcement, slotId: string): string | undefined {
  return announcement.materialSlots.find((slot) => slot.id === slotId)?.name;
}

export function getTimetableFor(announcementId: string) {
  return timetables.find((t) => t.announcementId === announcementId) ?? null;
}

export type ArchiveSearchResult = {
  team: Team;
  yearLabel: string;
};

// 検索対象はメタデータ+概要の構造化データ(本文・使用技術欄)のみ。Drive実体の本文検索は行わない(要件定義書 §3-7)。
export function searchArchive(query: string): ArchiveSearchResult[] {
  const q = query.trim().toLowerCase();
  const visibleTeams = teams.filter((team) => team.publishPermission === "許可");

  const finalAnnouncementsByTeam = new Map<string, Announcement | null>();
  for (const team of visibleTeams) {
    const teamAnnouncements = announcements.filter((a) => a.yearId === team.yearId);
    const finalAnn = teamAnnouncements.find((a) => a.phase === "最終") ?? null;
    finalAnnouncementsByTeam.set(team.id, finalAnn);
  }

  const matched = visibleTeams.filter((team) => {
    if (!q) return true;
    const finalAnn = finalAnnouncementsByTeam.get(team.id);
    const submission = finalAnn ? getSubmission(finalAnn.id, team.id) : null;
    const haystack = [
      team.name,
      team.projectTitle,
      team.className,
      submission?.summary?.onePageBody ?? "",
      ...(submission?.summary?.techUsed ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  return matched.map((team) => ({
    team,
    yearLabel: years.find((y) => y.id === team.yearId)?.label ?? "",
  }));
}
