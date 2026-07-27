import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { GenerateBookletButton } from "@/components/teacher/GenerateBookletButton";
import { getEvent, getSummaryBooklet } from "@/lib/mock-data";

/** SC-11 概要集生成・プレビュー。手修正UIは持たない（内容は SC-10 の入力そのまま）。 */
export function SummaryBookletView({ eventId }: { eventId: string }) {
  const event = getEvent(eventId);
  if (!event) notFound();

  const entries = getSummaryBooklet(eventId);
  const missingCount = entries.filter((e) => !e.content).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:block">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">概要集</h1>
          <p className="mt-1 text-gray-600">
            {event.phase}発表会（{event.deadline}）。タイムテーブルの発表順に、各チームの概要入力（SC-10）を束ねたものです。
          </p>
          {missingCount > 0 && (
            <p className="mt-2 text-sm font-semibold text-brand-orange print:hidden">
              {missingCount}チームが概要未提出です。
            </p>
          )}
        </div>
        <div className="print:hidden">
          <GenerateBookletButton missingCount={missingCount} />
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
                <p className="font-semibold text-gray-900">{entry.team.workTitle}</p>
                <p className="text-xs text-gray-400">{entry.team.name}</p>
              </div>
            </div>
            {entry.content ? (
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  <span className="font-medium text-gray-700">背景・動機：</span>
                  {entry.content.background}
                </p>
                <p>
                  <span className="font-medium text-gray-700">起・結：</span>
                  {entry.content.kiKetsu}
                </p>
                <p className="whitespace-pre-wrap">
                  <span className="font-medium text-gray-700">1ページ集約：</span>
                  {entry.content.onePageDigest}
                </p>
                <p>
                  <span className="font-medium text-gray-700">使用技術：</span>
                  {entry.content.techUsed}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">概要は未提出です。</p>
            )}
          </Card>
        ))}
        {entries.length === 0 && <p className="text-gray-500">対象となるチームがまだ登録されていません。</p>}
      </div>
    </div>
  );
}
