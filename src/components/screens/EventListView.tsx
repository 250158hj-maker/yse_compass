import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { events, getSubmissionMatrix, materialSlots, type EventPhase } from "@/lib/mock-data";

const PHASE_ORDER: EventPhase[] = ["企画", "設計", "試作", "最終"];

/** SC-03 発表会一覧（当年度）。新規作成ボタンは置かない（正規入口は年度一括セットアップ＝SC-19）。 */
export function EventListView({ year, basePath }: { year: number; basePath: string }) {
  const yearEvents = [...events]
    .filter((e) => e.year === year)
    .sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase));

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{year}年度 発表会一覧</h1>
      <p className="mt-1 text-gray-600">企画・設計・試作・最終の4回。各発表会の詳細から提出・公開・進行を確認できます。</p>

      <div className="mt-6 grid gap-4">
        {yearEvents.map((event) => {
          const slots = materialSlots.filter((s) => s.eventId === event.id);
          const cells = slots.length > 0 ? getSubmissionMatrix(event.id) : [];
          const teamIds = [...new Set(cells.map((c) => c.team.id))];
          const doneTeams = teamIds.filter((teamId) =>
            cells.filter((c) => c.team.id === teamId).every((c) => c.status === "提出済み")
          ).length;

          return (
            <Link key={event.id} href={`${basePath}/${event.id}`} className="block">
              <Card accent="blue" className="transition hover:border-brand-cyan">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{event.phase}発表会</h2>
                    <p className="mt-0.5 text-sm text-gray-500">締切: {event.deadline}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {teamIds.length > 0 && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        提出 {doneTeams}/{teamIds.length} チーム
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        event.published ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {event.published ? "公開中" : "非公開"}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
