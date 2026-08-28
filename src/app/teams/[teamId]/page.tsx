import { notFound } from "next/navigation";
import { getTeamById } from "@/lib/mock";
import { TeamDetailClient } from "./TeamDetailClient";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const team = getTeamById(teamId);
  if (!team) notFound();

  return <TeamDetailClient team={team} />;
}
