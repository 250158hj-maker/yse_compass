import { notFound } from "next/navigation";
import { EventHubView } from "@/components/screens/EventHubView";
import { events, getEvent } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function TeacherEventHubPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!getEvent(eventId)) notFound();

  return (
    <EventHubView
      eventId={eventId}
      role="teacher"
      teamHref={(teamId) => `/teacher/events/${eventId}/teams/${teamId}`}
      timetableHref={`/teacher/events/${eventId}/live`}
      timetableEditHref={`/teacher/events/${eventId}/timetable`}
      editHref={`/teacher/events/${eventId}/edit`}
      submissionsHref={`/teacher/events/${eventId}/submissions`}
      summaryBookletHref={`/teacher/events/${eventId}/summary-booklet`}
    />
  );
}
