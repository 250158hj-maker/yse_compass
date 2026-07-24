import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { TimetableStatusBadge } from "@/components/ui/Badge";
import {
  getAllPublishedMaterialsForTeam,
  getEvent,
  getTeam,
  getTimetable,
  resolveTimetableStatus,
} from "@/lib/mock-data";

export function TimetableView({
  eventId,
  teamHref = (teamId: string) => `/student/teams/${teamId}`,
}: {
  eventId: string;
  teamHref?: (teamId: string) => string;
}) {
  const event = getEvent(eventId);
  if (!event) notFound();

  const slots = getTimetable(eventId);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">タイムテーブル</h1>
      <p className="mt-1 text-gray-600">
        {event.phase}発表会（{event.deadline}）の発表順・時間です。作品名から発表資料や概要集にアクセスできます。
      </p>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">時間</th>
              <th className="py-2 pr-4">作品名</th>
              <th className="py-2 pr-4">状態</th>
              <th className="py-2 pr-4">資料</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const team = getTeam(slot.teamId);
              const materials = team ? getAllPublishedMaterialsForTeam(team.id) : [];
              return (
                <tr key={slot.id} className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-medium text-gray-900">
                    {slot.startTime} 〜 {slot.endTime}
                  </td>
                  <td className="py-3 pr-4">
                    {team ? (
                      <Link href={teamHref(team.id)} className="font-medium text-gray-900 hover:underline">
                        {team.workTitle}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-900">(不明な作品)</span>
                    )}
                    <p className="text-xs text-gray-400">{team?.name ?? "(不明なチーム)"}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <TimetableStatusBadge status={resolveTimetableStatus(event, slot)} />
                  </td>
                  <td className="py-3 pr-4">
                    {materials.length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {materials.map(({ slot: materialSlot, submission }) => (
                          <li key={materialSlot.id}>
                            <a
                              href={submission.linkUrl ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:border-gray-500 hover:bg-gray-50"
                            >
                              {materialSlot.kind} ↗
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-gray-400">未公開</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {slots.length === 0 && (
          <p className="py-4 text-center text-gray-500">タイムテーブルはまだ公開されていません。</p>
        )}
      </Card>
    </div>
  );
}
