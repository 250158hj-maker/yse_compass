import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { LiveOperationView, type OperationEntry } from "@/components/teacher/LiveOperationView";
import { events, getEvent, getPresentationLink, getTeam, getTimetable } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function TeacherLiveOperationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  if (!event) notFound();

  const slots = getTimetable(eventId);
  const initialEntries: OperationEntry[] = slots
    .map((slot) => {
      const team = getTeam(slot.teamId);
      if (!team) return null;
      return { slot, team, presentationLink: getPresentationLink(eventId, team.id) };
    })
    .filter((e): e is OperationEntry => e !== null);

  return (
    <div>
      <BackLink href="/teacher/events" label="発表会一覧に戻る" />
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">当日進行・入れ替え操作</h1>
      <p className="mt-1 text-gray-600">
        {event.phase}発表会（{event.deadline}）。チームの入れ替え時に、次の発表資料をすぐに開けます。実際の進行が予定時刻とずれる場合は、下のボタンや一覧から手動で進めてください。
      </p>

      <div className="mt-6">
        <LiveOperationView eventId={eventId} event={event} initialEntries={initialEntries} />
      </div>
    </div>
  );
}
