import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { BackLink } from "@/components/ui/BackLink";
import { PublishTable } from "@/components/teacher/PublishTable";
import { events, getEvent, materialSlots, submissions, teams } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function PublishPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  if (!event) notFound();

  const slots = materialSlots.filter((s) => s.eventId === eventId);
  const rows = slots.flatMap((slot) =>
    teams.flatMap((team) => {
      const submission = submissions.find(
        (s) => s.slotId === slot.id && s.teamId === team.id && s.linkUrl
      );
      return submission ? [{ team, slot, submission }] : [];
    })
  );

  return (
    <div>
      <BackLink href="/teacher/events" label="発表会一覧に戻る" />
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">資料公開・配信</h1>
      <p className="mt-1 text-gray-600">
        {event.phase}発表会で提出された資料を確認し、生徒への公開・非公開を切り替えます。
      </p>

      <Card className="mt-6 overflow-x-auto">
        {rows.length > 0 ? (
          <PublishTable rows={rows} />
        ) : (
          <p className="py-4 text-center text-gray-500">まだ提出された資料はありません。</p>
        )}
      </Card>
    </div>
  );
}
