import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MaterialSlotManager } from "@/components/teacher/MaterialSlotManager";
import { events, getSubmissionMatrix, materialSlots, teams } from "@/lib/mock-data";

const actionLinks = [
  { suffix: "submissions", label: "提出状況" },
  { suffix: "publish", label: "資料公開" },
  { suffix: "timetable", label: "タイムテーブル" },
  { suffix: "summary-booklet", label: "概要集を生成" },
  { suffix: "live", label: "当日進行・入れ替え" },
] as const;

export default function TeacherEventsPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">発表会・資料枠管理</h1>
      <p className="mt-1 text-gray-600">
        発表会（企画・設計・試作・最終）ごとに、提出対象となる資料枠（種類・締切）を定義します。
      </p>

      <div className="mt-6 grid gap-4">
        {events.map((event) => {
          const slots = materialSlots.filter((s) => s.eventId === event.id);
          const relevantTeams = teams.filter((t) => t.year === event.year);
          const cells = slots.length > 0 ? getSubmissionMatrix(event.id) : [];
          const missingCount = relevantTeams.filter((team) =>
            cells.some((cell) => cell.team.id === team.id && cell.status !== "提出済み")
          ).length;

          return (
            <Card key={event.id} accent="blue">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {event.year}年度 {event.phase}発表会
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500">締切: {event.deadline}</p>
                  {slots.length > 0 && (
                    <p className="mt-1 text-sm text-gray-600">
                      資料枠 {slots.length}件
                      {missingCount > 0 ? (
                        <span className="ml-2 rounded-full bg-brand-orange/10 px-2 py-0.5 text-xs font-semibold text-brand-orange">
                          未提出 {missingCount}チーム
                        </span>
                      ) : (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          全チーム提出済み
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {actionLinks.map((action) => (
                    <Link
                      key={action.suffix}
                      href={`/teacher/events/${event.id}/${action.suffix}`}
                      className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand-blue hover:text-brand-blue"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>

              <MaterialSlotManager
                eventId={event.id}
                eventLabel={`${event.year}年度 ${event.phase}発表会`}
                initialSlots={slots}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
