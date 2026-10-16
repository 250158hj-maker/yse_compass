import { notFound } from "next/navigation";
import { getAnnouncementById, getTeamById } from "@/lib/mock";
import { SummaryFormClient } from "./SummaryFormClient";

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ announcementId: string; teamId: string }>;
}) {
  const { announcementId, teamId } = await params;
  const announcement = getAnnouncementById(announcementId);
  const team = getTeamById(teamId);
  if (!announcement || !team) notFound();

  return <SummaryFormClient announcement={announcement} team={team} />;
}
