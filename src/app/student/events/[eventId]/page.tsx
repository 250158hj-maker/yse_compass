import { notFound } from "next/navigation";
import { EventHubView } from "@/components/screens/EventHubView";
import { events, getEvent, getMyTeam } from "@/lib/mock-data";
import { getCurrentStudentId } from "@/lib/current-user";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function StudentEventHubPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!getEvent(eventId)) notFound();

  const studentId = await getCurrentStudentId();
  const myTeam = getMyTeam(studentId);

  return (
    <EventHubView
      eventId={eventId}
      role="student"
      viewerTeamId={myTeam?.id ?? null}
      teamHref={(teamId) => `/student/events/${eventId}/teams/${teamId}`}
      timetableHref={`/student/events/${eventId}/timetable`}
      submitHref={`/student/events/${eventId}/submit`}
      summaryHref={`/student/events/${eventId}/summary`}
    />
  );
}
