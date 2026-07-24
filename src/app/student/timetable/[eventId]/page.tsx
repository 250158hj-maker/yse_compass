import { TimetableView } from "@/components/screens/TimetableView";
import { events } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function StudentTimetablePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <TimetableView eventId={eventId} />;
}
