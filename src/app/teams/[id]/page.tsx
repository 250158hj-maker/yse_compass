import { notFound } from "next/navigation";
import { getAnnouncementById, getTeamById } from "@/lib/mock-data";
import TeamDetailClient from "./TeamDetailClient";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = getTeamById(id);

  if (!team) {
    notFound();
  }

  const announcement = getAnnouncementById(team.announcementId);

  return <TeamDetailClient team={team} announcement={announcement} />;
}
