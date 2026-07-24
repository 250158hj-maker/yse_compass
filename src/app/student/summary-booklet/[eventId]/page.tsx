import { SummaryBookletView } from "@/components/screens/SummaryBookletView";
import { events } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function StudentSummaryBookletPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <SummaryBookletView eventId={eventId} teamHref={(teamId) => `/student/teams/${teamId}`} />;
}
