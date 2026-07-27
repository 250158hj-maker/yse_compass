import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { TimetableView } from "@/components/screens/TimetableView";
import { events, getEvent } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function StudentTimetablePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!getEvent(eventId)) notFound();

  return (
    <div>
      <BackLink href={`/student/events/${eventId}`} label="発表会詳細に戻る" />
      <div className="mt-3">
        <TimetableView eventId={eventId} teamHref={(teamId) => `/student/events/${eventId}/teams/${teamId}`} />
      </div>
    </div>
  );
}
