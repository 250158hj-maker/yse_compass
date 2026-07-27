import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { PresentationDetailView } from "@/components/screens/PresentationDetailView";
import { events, getEvent, getTeacher, teams } from "@/lib/mock-data";
import { getCurrentTeacherId } from "@/lib/current-teacher";

export function generateStaticParams() {
  return events.flatMap((event) =>
    teams.filter((t) => t.year === event.year).map((team) => ({ eventId: event.id, teamId: team.id }))
  );
}

export default async function TeacherPresentationDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; teamId: string }>;
}) {
  const { eventId, teamId } = await params;
  if (!getEvent(eventId)) notFound();

  const teacherId = await getCurrentTeacherId();
  const teacher = getTeacher(teacherId)!;

  return (
    <div>
      <BackLink href={`/teacher/events/${eventId}`} label="発表会詳細に戻る" />
      <div className="mt-4">
        <PresentationDetailView eventId={eventId} teamId={teamId} role="teacher" viewerName={teacher.name} />
      </div>
    </div>
  );
}
