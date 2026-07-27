import { BackLink } from "@/components/ui/BackLink";
import { TeamOverviewView } from "@/components/screens/TeamOverviewView";
import { getCurrentStudentId } from "@/lib/current-user";
import { getStudent, getTeamMembers, teams } from "@/lib/mock-data";

export function generateStaticParams() {
  return teams.map((team) => ({ teamId: team.id }));
}

export default async function StudentTeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const studentId = await getCurrentStudentId();
  const student = getStudent(studentId);

  const isLeader =
    student?.teamId === teamId &&
    getTeamMembers(teamId).some((m) => m.role === "リーダー" && m.name === student.name);

  return (
    <div>
      <BackLink href="/student/teams" label="チーム一覧に戻る" />
      <div className="mt-3">
        <TeamOverviewView
          teamId={teamId}
          role="student"
          eventDetailHref={(eventId) => `/student/events/${eventId}/teams/${teamId}`}
          canManageConsent={isLeader}
        />
      </div>
    </div>
  );
}
