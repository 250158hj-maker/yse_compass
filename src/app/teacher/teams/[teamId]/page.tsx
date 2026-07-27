import { BackLink } from "@/components/ui/BackLink";
import { TeamOverviewView } from "@/components/screens/TeamOverviewView";
import { teams } from "@/lib/mock-data";

export function generateStaticParams() {
  return teams.map((team) => ({ teamId: team.id }));
}

export default async function TeacherTeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return (
    <div>
      <BackLink href="/teacher/teams" label="チーム一覧に戻る" />
      <div className="mt-3">
        <TeamOverviewView
          teamId={teamId}
          role="teacher"
          eventDetailHref={(eventId) => `/teacher/events/${eventId}/teams/${teamId}`}
          canManageConsent
        />
      </div>
    </div>
  );
}
