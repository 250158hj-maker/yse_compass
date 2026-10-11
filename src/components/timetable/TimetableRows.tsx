import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTeamById } from "@/lib/mock";
import type { Timetable, TimetableSlot } from "@/lib/types";

// 発表会詳細(埋め込み)とタイムテーブル画面(単独ページ)の両方から使う共通の行表示。
// チーム枠は発表詳細(チーム×発表会)へのリンクにする。
// renderLeading(省略可・先生の SC-07 の当日の入れ替え用)を渡したときだけ、各行の左に操作を置く。
// 渡さないときの描画(生徒のホーム・生徒の SC-07・発表会詳細)は従来とまったく同じ。
export function TimetableRows({
  timetable,
  announcementId,
  renderLeading,
}: {
  timetable: Timetable | null;
  announcementId: string;
  renderLeading?: (slot: TimetableSlot, index: number, count: number) => ReactNode;
}) {
  const slots = timetable ? [...timetable.slots].sort((x, y) => x.order - y.order) : [];

  if (slots.length === 0) {
    return <EmptyState message="タイムテーブルはまだ作成されていません。" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {slots.map((slot, index) => {
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

        const row =
          !slot.isBreak && team ? (
            <Link
              key={slot.id}
              href={`/announcements/${announcementId}/teams/${team.id}`}
              className={`${rowClassName} hover:border-brand-300`}
            >
              {rowContent}
            </Link>
          ) : (
            <div key={slot.id} className={rowClassName}>
              {rowContent}
            </div>
          );

        if (!renderLeading) return row;

        return (
          <div key={slot.id} className="flex items-center gap-3">
            {renderLeading(slot, index, slots.length)}
            <div className="min-w-0 flex-1">{row}</div>
          </div>
        );
      })}
    </div>
  );
}
