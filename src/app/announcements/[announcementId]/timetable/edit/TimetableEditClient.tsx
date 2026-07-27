"use client";

import { useState } from "react";
import { RoleGate, TeacherOnlyNotice } from "@/components/ui/RoleGate";
import type { Announcement, Team, TimetableSlot } from "@/lib/types";

let breakIdSeq = 0;
function nextBreakId() {
  breakIdSeq += 1;
  return `new-break-${breakIdSeq}`;
}

function withOrder(slots: TimetableSlot[]): TimetableSlot[] {
  return slots.map((s, i) => ({ ...s, order: i + 1 }));
}

export default function TimetableEditClient({
  announcement,
  teams,
  initialSlots,
}: {
  announcement: Announcement;
  teams: Team[];
  initialSlots: TimetableSlot[];
}) {
  const [slots, setSlots] = useState<TimetableSlot[]>(withOrder(initialSlots));
  const [saved, setSaved] = useState(false);

  function move(index: number, direction: -1 | 1) {
    setSlots((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return withOrder(next);
    });
  }

  function updateField(id: string, patch: Partial<TimetableSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? ({ ...s, ...patch } as TimetableSlot) : s)));
  }

  function removeSlot(id: string) {
    setSlots((prev) => withOrder(prev.filter((s) => s.id !== id)));
  }

  function addBreak() {
    setSlots((prev) =>
      withOrder([
        ...prev,
        { id: nextBreakId(), order: 0, startTime: "12:00", durationMin: 10, isBreak: true, breakLabel: "休憩" },
      ]),
    );
  }

  function teamName(teamId: string) {
    return teams.find((t) => t.id === teamId)?.name ?? teamId;
  }

  return (
    <RoleGate allow={["teacher"]} fallback={<div className="mx-auto max-w-6xl px-6 py-16"><TeacherOnlyNotice /></div>}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">タイムテーブル編集</h1>
        <p className="mt-1 text-sm text-slate-500">{announcement.title}</p>
        <p className="mt-2 rounded-lg bg-brand-50 px-4 py-3 text-xs text-brand-700">
          この発表順は概要集の生成順にもそのまま使われます。並び替えの際はご注意ください。
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {slots.map((slot, index) => (
            <div key={slot.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-xs text-slate-400 disabled:opacity-30">
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === slots.length - 1}
                  className="text-xs text-slate-400 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <span className="w-6 text-center text-xs text-slate-400">{slot.order}</span>

              {slot.isBreak ? (
                <input
                  value={slot.breakLabel}
                  onChange={(e) => updateField(slot.id, { breakLabel: e.target.value })}
                  className="flex-1 rounded-lg border border-dashed border-slate-300 px-3 py-1 text-sm"
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-slate-800">{teamName(slot.teamId)}</span>
              )}

              <input
                value={slot.startTime}
                onChange={(e) => updateField(slot.id, { startTime: e.target.value })}
                className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
              />
              <input
                type="number"
                value={slot.durationMin}
                onChange={(e) => updateField(slot.id, { durationMin: Number(e.target.value) })}
                className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs"
              />
              <span className="text-xs text-slate-400">分</span>

              <button
                type="button"
                onClick={() => removeSlot(slot.id)}
                className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
              >
                削除
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={addBreak} className="text-xs font-medium text-brand-600 hover:underline">
            ＋休憩枠を挿入
          </button>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSaved(true)}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            保存する
          </button>
          {saved && <span className="text-xs text-emerald-600">保存しました(モックのため実データには反映されません)</span>}
        </div>
      </div>
    </RoleGate>
  );
}
