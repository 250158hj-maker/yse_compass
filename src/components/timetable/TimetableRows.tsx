import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTeamById } from "@/lib/mock";
import type { Timetable, TimetableSlot } from "@/lib/types";

// 発表会詳細(埋め込み)とタイムテーブル画面(単独ページ)の両方から使う共通の行表示。
// チーム枠は発表詳細(チーム×発表会)へのリンクにする。
// 1 行の描画は TimetableSlotRow に切り出してあり、先生の SC-07 の当日の入れ替え(ドラッグ)も同じ行を使う。
// この一覧の描画(生徒のホーム・発表会詳細)は従来とまったく同じ。生徒の SC-07 だけ、showPresented で「発表済み」を添える。
// 「発表済み」は、発表中のチームより前の行(04 SC-07)。発表中のチームがいなければ、どの行にも出さない。
export function TimetableRows({
  timetable,
  announcementId,
  showPresented = false,
}: {
  timetable: Timetable | null;
  announcementId: string;
  showPresented?: boolean;
}) {
  const slots = timetable ? [...timetable.slots].sort((x, y) => x.order - y.order) : [];

  if (slots.length === 0) {
    return <EmptyState message="タイムテーブルはまだ作成されていません。" />;
  }

  const currentIndex = slots.findIndex((s) => !s.isBreak && s.teamId === timetable?.currentPresentingTeamId);

  return (
    <div className="flex flex-col gap-2">
      {slots.map((slot, index) => (
        <TimetableSlotRow
          key={slot.id}
          slot={slot}
          timetable={timetable}
          announcementId={announcementId}
          presented={showPresented && currentIndex >= 0 && index < currentIndex}
        />
      ))}
    </div>
  );
}

// タイムテーブルの 1 行。チーム枠は発表詳細へのリンク、休憩はリンクにしない。発表中のチームは rose で強調する。
// presented は SC-07(先生の当日の進行・生徒の表示)だけが渡す(発表を終えたチームに「発表済み」を添える)。省略時は従来どおり。
export function TimetableSlotRow({
  slot,
  timetable,
  announcementId,
  presented = false,
}: {
  slot: TimetableSlot;
  timetable: Timetable | null;
  announcementId: string;
  presented?: boolean;
}) {
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
        {presented && !slot.isBreak && !isCurrent && <Badge tone="slate">発表済み</Badge>}
      </div>
    </>
  );

  return !slot.isBreak && team ? (
    <Link href={`/announcements/${announcementId}/teams/${team.id}`} className={`${rowClassName} hover:border-brand-300`}>
      {rowContent}
    </Link>
  ) : (
    <div className={rowClassName}>{rowContent}</div>
  );
}
