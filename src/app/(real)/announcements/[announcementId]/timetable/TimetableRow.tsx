import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import type { getTimetable } from "@/lib/data/timetable";

export type TimetableRowData = Awaited<ReturnType<typeof getTimetable>>["rows"][number];

// タイムテーブルの 1 行。「発表中」「発表済み」「自チーム」は getTimetable が判定して返したものをそのまま写す（画面で判定しない）。
// チーム名は発表詳細（SC-12）へのリンク。leading は行の左（並び替えのつまみ）、trailing は行の右（先生の操作）。
export function TimetableRow({
  row,
  occasionId,
  leading,
  trailing,
}: {
  row: TimetableRowData;
  occasionId: number;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const tone = row.isCurrent ? "border-rose-300 bg-rose-50" : row.isOwnTeam ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white";
  return (
    <div className={`flex items-center gap-2 rounded-lg border p-4 ${tone}`}>
      {leading}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="w-8 text-sm font-medium text-slate-500">{row.displayOrder ?? "—"}</span>
        <Link href={`/announcements/${occasionId}/teams/${row.teamId}`} className="font-medium text-slate-900 hover:underline">
          {row.teamName}
        </Link>
        {row.isCurrent && <Badge tone="rose">発表中</Badge>}
        {row.isDone && <Badge tone="slate">発表済み</Badge>}
        {row.isOwnTeam && <Badge tone="brand">自チーム</Badge>}
      </div>
      {trailing}
    </div>
  );
}
