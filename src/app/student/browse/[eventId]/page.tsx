import { BrowseEventsView } from "@/components/screens/BrowseEventsView";
import { events } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function StudentBrowsePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <BrowseEventsView eventId={eventId} teamHref={(teamId) => `/student/teams/${teamId}`} />;
}
