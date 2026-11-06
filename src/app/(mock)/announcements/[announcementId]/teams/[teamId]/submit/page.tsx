import { notFound } from "next/navigation";
import { getAnnouncementById, getTeamById } from "@/lib/mock";
import { SubmitFormClient } from "./SubmitFormClient";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ announcementId: string; teamId: string }>;
}) {
  const { announcementId, teamId } = await params;
  const announcement = getAnnouncementById(announcementId);
  const team = getTeamById(teamId);
  if (!announcement || !team) notFound();

  return <SubmitFormClient announcement={announcement} team={team} />;
}
