import { notFound } from "next/navigation";
import { getAnnouncementById, getSubmission, getTeamById } from "@/lib/mock";
import { PresentationDetailClient } from "./PresentationDetailClient";

export default async function PresentationDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string; teamId: string }>;
}) {
  const { announcementId, teamId } = await params;
  const announcement = getAnnouncementById(announcementId);
  const team = getTeamById(teamId);
  if (!announcement || !team) notFound();

  const submission = getSubmission(announcementId, teamId) ?? {
    announcementId,
    teamId,
    likeCount: 0,
    materials: [],
    summary: null,
    comments: [],
  };

  return <PresentationDetailClient announcement={announcement} team={team} initialSubmission={submission} />;
}
