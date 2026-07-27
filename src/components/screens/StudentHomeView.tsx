import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { events, getMyTeam, getTeamSubmissions, getTimetable, resolveTimetableStatus, teams } from "@/lib/mock-data";
import { CURRENT_YEAR } from "@/lib/constants";

/** SC-02 ホーム（生徒）。通知送信を持たないため、締切の可視化はこの画面が最後の砦。 */
export function StudentHomeView({ studentId }: { studentId: string }) {
  const myTeam = getMyTeam(studentId);
  const now = new Date();
  const yearEvents = events.filter((e) => e.year === CURRENT_YEAR);

  const liveEntry = yearEvents
    .flatMap((event) => getTimetable(event.id).map((slot) => ({ event, slot })))
    .find(({ event, slot }) => resolveTimetableStatus(event, slot, now) === "進行中");

  const upcomingEvent = [...yearEvents]
    .filter((e) => new Date(e.deadline) >= now)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">ホーム</h1>

      {liveEntry && (
        <Card accent="orange" className="mt-4">
          <p className="text-sm font-semibold text-brand-orange">いま発表中</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {teams.find((t) => t.id === liveEntry.slot.teamId)?.name}
          </p>
          <Link
            href={`/student/events/${liveEntry.event.id}/timetable`}
            className="mt-2 inline-block text-sm font-semibold text-brand-orange hover:underline"
          >
            タイムテーブルを見る →
          </Link>
        </Card>
      )}

      {upcomingEvent && (
        <Card accent="blue" className="mt-4">
          <p className="text-sm text-gray-500">直近の発表会</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {upcomingEvent.year}年度 {upcomingEvent.phase}発表会（締切 {upcomingEvent.deadline}）
          </p>
          <Link
            href={`/student/events/${upcomingEvent.id}`}
            className="mt-2 inline-block text-sm font-semibold text-brand-blue hover:underline"
          >
            発表会詳細を見る →
          </Link>
        </Card>
      )}

      {myTeam ? (
        <Card className="mt-4">
          <h2 className="font-semibold text-gray-900">提出すべき資料</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {yearEvents.flatMap((event) =>
              getTeamSubmissions(event.id, myTeam.id, now).map((row) => (
                <li
                  key={`${event.id}-${row.slot.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="text-gray-800">
                    {event.phase}発表会・{row.slot.kind}
                    <span className="ml-2 text-gray-400">締切 {row.slot.deadline}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={row.status} />
                    <Link
                      href={`/student/events/${event.id}`}
                      className="text-xs font-semibold text-brand-blue hover:underline"
                    >
                      発表会へ →
                    </Link>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      ) : (
        <Card className="mt-4">
          <p className="text-sm text-gray-600">
            現在チームに所属していません。発表会一覧から公開済みの発表を見たり、アーカイブを検索できます。
          </p>
          <Link href="/student/events" className="mt-2 inline-block text-sm font-semibold text-brand-blue hover:underline">
            発表会一覧を見る →
          </Link>
        </Card>
      )}
    </div>
  );
}
