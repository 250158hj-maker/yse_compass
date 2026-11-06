import { notFound } from "next/navigation";
import { getTeamById } from "@/lib/mock";
import { TeamDetailClient } from "./TeamDetailClient";
import { CreatedTeamDetailClient } from "./CreatedTeamDetailClient";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const team = getTeamById(teamId);
  // 先生がこのデモで作ったチームはブラウザ側の状態にしか無いので、クライアントで補う(無ければそこで notFound)。
  if (!team) {
    if (teamId.startsWith("created-team-")) return <CreatedTeamDetailClient teamId={teamId} />;
    notFound();
  }

  return <TeamDetailClient team={team} />;
}
