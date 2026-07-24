import { BackLink } from "@/components/ui/BackLink";
import { TeamDetailView } from "@/components/screens/TeamDetailView";
import { getCurrentTeacherId } from "@/lib/current-teacher";
import { getTeacher, teams } from "@/lib/mock-data";

export function generateStaticParams() {
  return teams.map((team) => ({ teamId: team.id }));
}

export default async function TeacherTeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const currentTeacherId = await getCurrentTeacherId();
  const viewerName = getTeacher(currentTeacherId)?.name;
  return (
    <div>
      <BackLink href="/teacher/teams" label="チーム一覧に戻る" />
      <div className="mt-3">
        <TeamDetailView teamId={teamId} viewerName={viewerName} />
      </div>
    </div>
  );
}
