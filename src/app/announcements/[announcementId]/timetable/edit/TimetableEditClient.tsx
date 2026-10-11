"use client";

import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { fieldClassName } from "@/components/ui/FormField";
import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";
import { NextStep, backToHub } from "@/components/flow/NextStep";
import { useTimetable } from "@/context/TeacherDemoContext";
import { reflowSlots } from "@/lib/demo/teacher-derived";
import { formatDateTime } from "@/lib/format";
import { getTeamsByYear } from "@/lib/mock";
import type { Announcement, TimetableSlot } from "@/lib/types";

let localIdCounter = 0;
function newLocalId() {
  localIdCounter += 1;
  return `tt-local-${localIdCounter}`;
}

// SC-08 タイムテーブル編集(発表順の確定)。
// 並びは先生の共有状態(useTimetable)の未保存の並び(draftSlots)で編集し、「保存する」で発表順を確定する。
// 保存した並びは SC-07・SC-11・ホーム・ハブが読む。
// 当日の進行(発表中の切り替え・当日の入れ替え)は SC-07 で行う(04-screen.md の SC-07)ので、ここには置かない。
export function TimetableEditClient({ announcement: a }: { announcement: Announcement }) {
  const teams = getTeamsByYear(a.yearId);
  const { hasTimetable, draftSlots, isDirty, move, setDraftSlots, save, discard, orderConfirmed, confirmedAt } =
    useTimetable(a.id);

  const ordered = draftSlots;
  const saved = orderConfirmed && !isDirty;

  function updateSlot(id: string, patch: Partial<TimetableSlot>) {
    setDraftSlots(ordered.map((s) => (s.id === id ? ({ ...s, ...patch } as TimetableSlot) : s)));
  }

  function removeSlot(id: string) {
    setDraftSlots(reflowSlots(ordered.filter((s) => s.id !== id)));
  }

  function addPresentationSlot() {
    const firstTeam = teams[0];
    if (!firstTeam) return;
    setDraftSlots(
      reflowSlots([
        ...ordered,
        { id: newLocalId(), teamId: firstTeam.id, order: ordered.length + 1, startTime: "09:00", durationMin: 10, isBreak: false },
      ]),
    );
  }

  function addBreakSlot() {
    setDraftSlots(
      reflowSlots([
        ...ordered,
        { id: newLocalId(), order: ordered.length + 1, startTime: "09:00", durationMin: 10, isBreak: true, breakLabel: "休憩" },
      ]),
    );
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
        <PageHeader
          eyebrow={a.title}
          title="タイムテーブル編集"
          meta={
            <>
              <PhaseBadge phase={a.phase} />
              {saved ? <Badge tone="emerald">発表順は確定済み</Badge> : <Badge tone="slate">発表順は未確定</Badge>}
            </>
          }
        />

        <div className="mt-4">
          <InlineNotice tone="info">
            ▲▼で発表順を入れ替え、「保存する」で確定します。概要集はこの順で作られます。当日の進行(発表中の切り替え)は
            <Link href={`/announcements/${a.id}/timetable`} className="font-medium underline underline-offset-2">
              タイムテーブル画面
            </Link>
            で行います。
          </InlineNotice>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {ordered.map((slot, index) => (
            <div
              key={slot.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(slot.id, -1)}
                  disabled={index === 0}
                  aria-label="1 つ上へ"
                  className="text-sm text-slate-400 hover:text-brand-600 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(slot.id, 1)}
                  disabled={index === ordered.length - 1}
                  aria-label="1 つ下へ"
                  className="text-sm text-slate-400 hover:text-brand-600 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>

              {/* fieldClassName は w-full を持つので、幅は外側の箱で決める(入力欄が行いっぱいに広がらないように) */}
              <div className="w-32 shrink-0">
                <input
                  type="time"
                  aria-label="開始時刻"
                  className={fieldClassName}
                  value={slot.startTime}
                  onChange={(e) => updateSlot(slot.id, { startTime: e.target.value })}
                />
              </div>
              <div className="w-20 shrink-0">
                <input
                  type="number"
                  min={1}
                  aria-label="所要時間(分)"
                  className={fieldClassName}
                  value={slot.durationMin}
                  onChange={(e) => updateSlot(slot.id, { durationMin: Number(e.target.value) })}
                />
              </div>
              <span className="text-xs text-slate-400">分</span>

              <div className="min-w-0 flex-1">
                {slot.isBreak ? (
                  <input
                    aria-label="休憩の名前"
                    className={fieldClassName}
                    value={slot.breakLabel}
                    onChange={(e) => updateSlot(slot.id, { breakLabel: e.target.value })}
                  />
                ) : (
                  <select
                    aria-label="発表するチーム"
                    className={fieldClassName}
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
              </div>

              <button
                type="button"
                onClick={() => removeSlot(slot.id)}
                aria-label="削除"
                className="text-slate-400 hover:text-rose-600"
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

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={save} disabled={!hasTimetable && ordered.length === 0}>
            保存する
          </Button>
          {isDirty && (
            <Button variant="secondary" onClick={discard}>
              変更を取り消す
            </Button>
          )}
          {isDirty && <span className="text-xs text-slate-400">未保存の変更があります</span>}
        </div>

        {saved && (
          <div className="mt-4">
            <InlineNotice tone="info">
              発表順を確定しました{confirmedAt ? `(${formatDateTime(confirmedAt)})` : ""}。概要集はこの順で作られます。
            </InlineNotice>
          </div>
        )}

        <NextStep
          description={
            saved ? "発表順が確定しました。次は、この順で概要集を作ります。" : "発表順を保存すると、概要集の作成へ進めます。"
          }
          next={saved ? { href: `/announcements/${a.id}/summary-booklet`, label: "次へ：概要集を作る →" } : null}
          back={backToHub(a.id)}
        />
      </div>
    </RoleGate>
  );
}
