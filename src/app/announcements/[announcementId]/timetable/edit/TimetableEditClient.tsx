"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { fieldClassName } from "@/components/ui/FormField";
import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";
import { getTeamsByYear } from "@/lib/mock";
import type { Announcement, Timetable, TimetableSlot } from "@/lib/types";

let localIdCounter = 0;
function newLocalId() {
  localIdCounter += 1;
  return `tt-local-${localIdCounter}`;
}

export function TimetableEditClient({
  announcement: a,
  timetable,
}: {
  announcement: Announcement;
  timetable: Timetable | null;
}) {
  const teams = getTeamsByYear(a.yearId);
  const [slots, setSlots] = useState<TimetableSlot[]>(timetable?.slots ?? []);
  const [currentPresentingTeamId, setCurrentPresentingTeamId] = useState<string | null>(
    timetable?.currentPresentingTeamId ?? null
  );
  const [saved, setSaved] = useState(false);

  const ordered = [...slots].sort((x, y) => x.order - y.order);

  function updateSlot(id: string, patch: Partial<TimetableSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? ({ ...s, ...patch } as TimetableSlot) : s)));
    setSaved(false);
  }

  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    if (!slots.find((s) => s.id === id && !s.isBreak && s.teamId === currentPresentingTeamId)) return;
    setCurrentPresentingTeamId(null);
  }

  function move(id: string, direction: -1 | 1) {
    const index = ordered.findIndex((s) => s.id === id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const reordered = [...ordered];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSlots(reordered.map((s, i) => ({ ...s, order: i + 1 })));
    setSaved(false);
  }

  function addPresentationSlot() {
    const firstTeam = teams[0];
    if (!firstTeam) return;
    setSlots((prev) => [
      ...prev,
      {
        id: newLocalId(),
        teamId: firstTeam.id,
        order: prev.length + 1,
        startTime: "09:00",
        durationMin: 10,
        isBreak: false,
      },
    ]);
    setSaved(false);
  }

  function addBreakSlot() {
    setSlots((prev) => [
      ...prev,
      {
        id: newLocalId(),
        order: prev.length + 1,
        startTime: "09:00",
        durationMin: 10,
        isBreak: true,
        breakLabel: "休憩",
      },
    ]);
    setSaved(false);
  }

  return (
    <RoleGate allow={["teacher"]} fallback={<TeacherOnlyNotice />}>
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "発表会一覧", href: "/announcements" },
            { label: a.title, href: `/announcements/${a.id}` },
            { label: "タイムテーブル編集" },
          ]}
        />
        <PageHeader eyebrow={a.title} title="タイムテーブル編集" meta={<PhaseBadge phase={a.phase} />} />

        <div className="mt-4">
          <InlineNotice tone="info">
            発表中の切り替えは先生の手動操作です。時刻連動の自動進行はありません。
          </InlineNotice>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {ordered.map((slot, index) => (
            <div key={slot.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(slot.id, -1)}
                  disabled={index === 0}
                  className="text-xs text-slate-400 hover:text-brand-600 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(slot.id, 1)}
                  disabled={index === ordered.length - 1}
                  className="text-xs text-slate-400 hover:text-brand-600 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>

              <input
                type="time"
                className={`${fieldClassName} w-28`}
                value={slot.startTime}
                onChange={(e) => updateSlot(slot.id, { startTime: e.target.value })}
              />
              <input
                type="number"
                min={1}
                className={`${fieldClassName} w-20`}
                value={slot.durationMin}
                onChange={(e) => updateSlot(slot.id, { durationMin: Number(e.target.value) })}
              />
              <span className="text-xs text-slate-400">分</span>

              {slot.isBreak ? (
                <input
                  className={`${fieldClassName} flex-1`}
                  value={slot.breakLabel}
                  onChange={(e) => updateSlot(slot.id, { breakLabel: e.target.value })}
                />
              ) : (
                <select
                  className={`${fieldClassName} flex-1`}
                  value={slot.teamId}
                  onChange={(e) => updateSlot(slot.id, { teamId: e.target.value })}
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}

              {!slot.isBreak && (
                <Button
                  variant={currentPresentingTeamId === slot.teamId ? "primary" : "secondary"}
                  onClick={() =>
                    setCurrentPresentingTeamId((prev) => (prev === slot.teamId ? null : slot.teamId))
                  }
                >
                  {currentPresentingTeamId === slot.teamId ? "発表中" : "発表中にする"}
                </Button>
              )}

              <button
                type="button"
                onClick={() => removeSlot(slot.id)}
                aria-label="削除"
                className="ml-auto text-slate-400 hover:text-rose-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={addPresentationSlot} disabled={teams.length === 0}>
            + 発表枠を追加
          </Button>
          <Button variant="secondary" onClick={addBreakSlot}>
            + 休憩を追加
          </Button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button variant="primary" onClick={() => setSaved(true)}>
            保存する
          </Button>
          {saved && <Badge tone="emerald">保存しました(モック内のみ)</Badge>}
        </div>
      </div>
    </RoleGate>
  );
}
