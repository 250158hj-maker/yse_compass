import { notFound } from "next/navigation";
import { getAnnouncementById, getSubmission, getTeamById } from "@/lib/mock-data";
import TeamDetailClient from "./TeamDetailClient";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string; teamId: string }>;
}) {
  const { announcementId, teamId } = await params;

  const announcement = getAnnouncementById(announcementId);
  const team = getTeamById(teamId);
  const submission = getSubmission(announcementId, teamId);

  if (!announcement || !team || !submission) {
    notFound();
  }

  return (
    <TeamDetailClient announcement={announcement} team={team} submission={submission} />
  );
}
