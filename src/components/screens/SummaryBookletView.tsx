import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PrintButton } from "@/components/ui/PrintButton";
import { getEvent, getSummaryBooklet } from "@/lib/mock-data";

export function SummaryBookletView({
  eventId,
  teamHref = (teamId: string) => `/student/teams/${teamId}`,
  editHref,
}: {
  eventId: string;
  teamHref?: (teamId: string) => string;
  editHref?: string;
}) {
  const event = getEvent(eventId);
  if (!event) notFound();

  const entries = getSummaryBooklet(eventId);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:block">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">概要集</h1>
          <p className="mt-1 text-gray-600">
            {event.phase}発表会（{event.deadline}）提出済みの概要集用サマリーを発表順にまとめたものです。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {editHref && (
            <Link
              href={editHref}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:border-brand-blue hover:text-brand-blue"
            >
              整形・編集する
            </Link>
          )}
          <PrintButton />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {entries.map((entry, index) => (
          <Card key={entry.team.id} className="break-inside-avoid">
            <div className="flex items-baseline gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                {index + 1}
              </span>
              <div>
                <Link href={teamHref(entry.team.id)} className="font-semibold text-gray-900 hover:underline print:no-underline print:pointer-events-none">
                  {entry.team.workTitle}
                </Link>
                <p className="text-xs text-gray-400">{entry.team.name}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">{entry.team.summary}</p>
            <div className="mt-3">
              {entry.submission?.linkUrl ? (
                <a
                  href={entry.submission.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:border-gray-500 hover:bg-gray-50 print:hidden"
                >
                  概要集を開く ↗
                </a>
              ) : (
                <span className="text-sm text-gray-400">概要集用サマリーは未提出です</span>
              )}
            </div>
          </Card>
        ))}
        {entries.length === 0 && (
          <p className="text-gray-500">対象となるチームがまだ登録されていません。</p>
        )}
      </div>
    </div>
  );
}
