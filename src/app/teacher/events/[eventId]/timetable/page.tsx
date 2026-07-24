import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { TimetableEditor } from "@/components/teacher/TimetableEditor";
import { events, getEvent, getTimetable, teams } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function TeacherTimetablePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  if (!event) notFound();

  const slots = getTimetable(eventId);
  const eventTeams = teams.filter((t) => t.year === event.year);

  return (
    <div>
      <BackLink href="/teacher/events" label="発表会一覧に戻る" />
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">タイムテーブル管理</h1>
      <p className="mt-1 text-gray-600">
        {event.phase}発表会（{event.deadline}）当日の発表順・時間・会場を管理します。
      </p>

      <div className="mt-6">
        <TimetableEditor eventId={eventId} initialSlots={slots} teams={eventTeams} />
      </div>
    </div>
  );
}
