import { notFound } from "next/navigation";
import { getAnnouncementById, getSubmission, getTeamById, getTeamsByYear, getTimetable } from "@/lib/mock";
import SummaryBookletClient from "./SummaryBookletClient";

export default async function SummaryBookletPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  const timetable = getTimetable(announcementId);
  const orderedTeamIds = timetable
    ? timetable.slots.filter((s) => !s.isBreak).map((s) => s.teamId)
    : getTeamsByYear(announcement.yearId).map((t) => t.id);

  const entries = orderedTeamIds
    .map((teamId) => {
      const team = getTeamById(teamId);
      const submission = getSubmission(announcementId, teamId);
      return team && submission ? { team, submission } : null;
    })
    .filter((e): e is { team: NonNullable<ReturnType<typeof getTeamById>>; submission: NonNullable<ReturnType<typeof getSubmission>> } => e !== null);

  return <SummaryBookletClient announcement={announcement} entries={entries} />;
}
