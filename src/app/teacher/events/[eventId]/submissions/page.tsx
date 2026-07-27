import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { BackLink } from "@/components/ui/BackLink";
import { events, getEvent, getSubmissionMatrix, materialSlots, teams } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function TeacherSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ onlyMissing?: string }>;
}) {
  const { eventId } = await params;
  const { onlyMissing } = await searchParams;
  const event = getEvent(eventId);
  if (!event) notFound();

  const slots = materialSlots.filter((slot) => slot.eventId === eventId);
  const cells = getSubmissionMatrix(eventId);
  const showOnlyMissing = onlyMissing === "1";
  const yearTeams = teams.filter((t) => t.year === event.year);

  const visibleTeams = showOnlyMissing
    ? yearTeams.filter((team) =>
        cells.some((cell) => cell.team.id === team.id && cell.status !== "提出済み")
      )
    : yearTeams;

  const fullySubmittedCount = yearTeams.filter((team) =>
    slots.every(
      (slot) => cells.find((c) => c.team.id === team.id && c.slot.id === slot.id)?.status === "提出済み"
    )
  ).length;

  return (
    <div>
      <BackLink href={`/teacher/events/${eventId}`} label="発表会詳細に戻る" />
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">提出状況一覧</h1>
      <p className="mt-1 text-gray-600">
        {event.phase}発表会（締切: {event.deadline}）のチーム別提出状況です。
      </p>
      <p className="mt-2 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">
          {fullySubmittedCount} / {yearTeams.length}
        </span>{" "}
        チームが全資料提出済み
      </p>

      <div className="mt-4 flex gap-2 text-sm">
        <a
          href={`/teacher/events/${eventId}/submissions`}
          className={`rounded-full px-3 py-1 ring-1 ring-inset ${
            !showOnlyMissing ? "bg-brand-blue text-white ring-brand-blue" : "bg-white text-gray-600 ring-gray-300"
          }`}
        >
          すべて表示
        </a>
        <a
          href={`/teacher/events/${eventId}/submissions?onlyMissing=1`}
          className={`rounded-full px-3 py-1 ring-1 ring-inset ${
            showOnlyMissing ? "bg-brand-blue text-white ring-brand-blue" : "bg-white text-gray-600 ring-gray-300"
          }`}
        >
          未提出のみ
        </a>
      </div>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">チーム</th>
              {slots.map((slot) => (
                <th key={slot.id} className="py-2 pr-4">
                  {slot.kind}
                  <div className="font-normal text-gray-400">締切 {slot.deadline}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleTeams.map((team) => (
              <tr key={team.id} className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium text-gray-900">{team.name}</td>
                {slots.map((slot) => {
                  const cell = cells.find((c) => c.slot.id === slot.id && c.team.id === team.id);
                  return (
                    <td key={slot.id} className="py-3 pr-4">
                      {cell ? (
                        <div className="flex items-center gap-2">
                          <StatusBadge status={cell.status} />
                          {cell.linkUrl && (
                            <a
                              href={cell.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-brand-blue hover:underline"
                            >
                              開く ↗
                            </a>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {visibleTeams.length === 0 && (
          <p className="py-4 text-center text-gray-500">未提出のチームはありません。</p>
        )}
      </Card>
    </div>
  );
}
