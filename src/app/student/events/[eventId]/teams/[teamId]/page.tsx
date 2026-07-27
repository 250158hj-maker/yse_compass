import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { PresentationDetailView } from "@/components/screens/PresentationDetailView";
import { events, getEvent, getMyTeam, getStudent, teams } from "@/lib/mock-data";
import { getCurrentStudentId } from "@/lib/current-user";

export function generateStaticParams() {
  return events.flatMap((event) =>
    teams.filter((t) => t.year === event.year).map((team) => ({ eventId: event.id, teamId: team.id }))
  );
}

export default async function StudentPresentationDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; teamId: string }>;
}) {
  const { eventId, teamId } = await params;
  if (!getEvent(eventId)) notFound();

  const studentId = await getCurrentStudentId();
  const student = getStudent(studentId)!;
  const myTeam = getMyTeam(studentId);

  return (
    <div>
      <BackLink href={`/student/events/${eventId}`} label="発表会詳細に戻る" />
      <div className="mt-4">
        <PresentationDetailView
          eventId={eventId}
          teamId={teamId}
          role="student"
          viewerName={student.name}
          viewerTeamId={myTeam?.id ?? null}
        />
      </div>
    </div>
  );
}
