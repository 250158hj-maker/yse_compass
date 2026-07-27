import { notFound } from "next/navigation";
import { getAnnouncementsByYear, getCurrentYear, getSubmission, getTeamById } from "@/lib/mock";
import TeamDetailClient from "./TeamDetailClient";

export default async function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const team = getTeamById(teamId);
  const year = getCurrentYear();
  if (!team || !year || team.yearId !== year.id) notFound();

  const announcements = getAnnouncementsByYear(year.id);
  const timeline = announcements.map((a) => ({ announcement: a, submission: getSubmission(a.id, team.id) }));

  return <TeamDetailClient team={team} timeline={timeline} />;
}
