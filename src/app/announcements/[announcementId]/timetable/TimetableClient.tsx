"use client";

import { useState } from "react";
import { useRole } from "@/context/RoleContext";
import { RoleGate } from "@/components/ui/RoleGate";
import { MOCK_PRESENTER_TEAM_ID } from "@/lib/mock";
import type { Announcement, Team, TimetableSlot } from "@/lib/types";

export default function TimetableClient({
  announcement,
  initialCurrentPresentingTeamId,
  slotsWithTeam,
}: {
  announcement: Announcement;
  initialCurrentPresentingTeamId: string | null;
  slotsWithTeam: { slot: TimetableSlot; team: Team | null }[];
}) {
  const { role } = useRole();
  const [currentPresentingTeamId, setCurrentPresentingTeamId] = useState(initialCurrentPresentingTeamId);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  if (slotsWithTeam.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-slate-500">この発表会のタイムテーブルはまだ設定されていません。</p>
        <RoleGate allow={["teacher"]}>
          <a
            href={`/announcements/${announcement.id}/timetable/edit`}
            className="mt-3 inline-block text-sm text-brand-600 hover:underline"
          >
            タイムテーブルを編集する
          </a>
        </RoleGate>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">タイムテーブル</h1>
      <p className="mt-1 text-sm text-slate-500">{announcement.title}</p>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          進行はリアルタイム同期しません。最新の状態は下の更新ボタンで反映されます。
        </p>
        <button
          type="button"
          onClick={() => setRefreshedAt(new Date().toLocaleTimeString("ja-JP"))}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          更新
        </button>
      </div>
      {refreshedAt && <p className="mt-1 text-right text-xs text-slate-300">最終更新 {refreshedAt}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {slotsWithTeam.map(({ slot, team }) => {
          const isPresenting = !slot.isBreak && team?.id === currentPresentingTeamId;
          const isOwnTeam = role === "presenter" && team?.id === MOCK_PRESENTER_TEAM_ID;

          if (slot.isBreak) {
            return (
              <div key={slot.id} className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-center text-xs text-slate-400">
                {slot.startTime}〜({slot.durationMin}分) {slot.breakLabel}
              </div>
            );
          }

          return (
            <div
              key={slot.id}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                isPresenting
                  ? "border-rose-300 bg-rose-50"
                  : isOwnTeam
                    ? "border-brand-300 bg-brand-50"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {slot.order}. {team?.name}
                  {isOwnTeam && <span className="ml-2 text-xs text-brand-600">(自チーム)</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {slot.startTime}〜({slot.durationMin}分)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isPresenting && <span className="text-xs font-semibold text-rose-600">発表中</span>}
                <RoleGate allow={["teacher"]}>
                  <button
                    type="button"
                    onClick={() => setCurrentPresentingTeamId(team?.id ?? null)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    発表中にする
                  </button>
                </RoleGate>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
