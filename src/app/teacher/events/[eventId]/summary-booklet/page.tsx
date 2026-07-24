import { BackLink } from "@/components/ui/BackLink";
import { SummaryBookletView } from "@/components/screens/SummaryBookletView";
import { events } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function TeacherSummaryBookletPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <div>
      <div className="print:hidden">
        <BackLink href="/teacher/events" label="発表会一覧に戻る" />
      </div>
      <div className="mt-3 print:mt-0">
        <SummaryBookletView
          eventId={eventId}
          teamHref={(teamId) => `/teacher/teams/${teamId}`}
          editHref={`/teacher/events/${eventId}/summary-booklet/edit`}
        />
      </div>
    </div>
  );
}
