import Link from "next/link";
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
      <BackLink href={`/teacher/events/${eventId}`} label="発表会詳細に戻る" />
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">タイムテーブル管理</h1>
      <p className="mt-1 text-gray-600">
        {event.phase}発表会（{event.deadline}）当日の発表順・時間・会場を管理します。
      </p>
      <p className="mt-1 text-sm text-gray-500">
        当日の進行（発表中の切り替え）は
        <Link href={`/teacher/events/${eventId}/live`} className="ml-1 font-semibold text-brand-blue hover:underline">
          当日進行・入れ替え操作
        </Link>
        から行ってください。
      </p>

      <div className="mt-6">
        <TimetableEditor eventId={eventId} initialSlots={slots} teams={eventTeams} />
      </div>
    </div>
  );
}
