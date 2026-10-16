import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTeamById } from "@/lib/mock";
import type { Timetable } from "@/lib/types";

// 発表会詳細(埋め込み)とタイムテーブル画面(単独ページ)の両方から使う共通の行表示。
// チーム枠は発表詳細(チーム×発表会)へのリンクにする。
export function TimetableRows({
  timetable,
  announcementId,
}: {
  timetable: Timetable | null;
  announcementId: string;
}) {
  const slots = timetable ? [...timetable.slots].sort((x, y) => x.order - y.order) : [];

  if (slots.length === 0) {
    return <EmptyState message="タイムテーブルはまだ作成されていません。" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {slots.map((slot) => {
        const isCurrent = !slot.isBreak && slot.teamId === timetable?.currentPresentingTeamId;
        const team = !slot.isBreak ? getTeamById(slot.teamId) : null;
        const rowClassName = `flex items-center justify-between rounded-lg border p-4 ${
          isCurrent ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
        } ${slot.isBreak ? "opacity-70" : ""}`;

        const rowContent = (
          <>
            <div className="flex items-center gap-3">
              <span className="w-16 text-sm font-medium text-slate-500">{slot.startTime}</span>
              <span className="font-medium text-slate-900">
                {slot.isBreak ? slot.breakLabel : (team?.name ?? "(不明なチーム)")}
              </span>
              {!slot.isBreak && team && <span className="text-sm text-slate-400">{team.projectTitle}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{slot.durationMin}分</span>
              {isCurrent && <Badge tone="rose">発表中</Badge>}
            </div>
          </>
        );

        if (!slot.isBreak && team) {
          return (
            <Link
              key={slot.id}
              href={`/announcements/${announcementId}/teams/${team.id}`}
              className={`${rowClassName} hover:border-brand-300`}
            >
              {rowContent}
            </Link>
          );
        }

        return (
          <div key={slot.id} className={rowClassName}>
            {rowContent}
          </div>
        );
      })}
    </div>
  );
}
