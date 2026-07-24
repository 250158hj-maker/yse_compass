import { BackLink } from "@/components/ui/BackLink";
import { TeamDetailView } from "@/components/screens/TeamDetailView";
import { getCurrentStudentId } from "@/lib/current-user";
import { getStudent, teams } from "@/lib/mock-data";

export function generateStaticParams() {
  return teams.map((team) => ({ teamId: team.id }));
}

export default async function StudentTeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const currentStudentId = await getCurrentStudentId();
  const viewerName = getStudent(currentStudentId)?.name;
  return (
    <div>
      <BackLink href="/student" label="トップに戻る" />
      <div className="mt-3">
        <TeamDetailView teamId={teamId} viewerName={viewerName} />
      </div>
    </div>
  );
}
