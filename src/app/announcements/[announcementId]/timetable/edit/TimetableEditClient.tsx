"use client";

import { useState, type ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldClassName } from "@/components/ui/FormField";
import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";
import { NextStep, backToHub } from "@/components/flow/NextStep";
import { SortableList } from "@/components/timetable/SortableList";
import { useTimetable } from "@/context/TeacherDemoContext";
import {
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  insertBreakAfter,
  isTimeString,
  isValidDuration,
  removeBreak,
  setBreakDuration,
  slotEndTime,
} from "@/lib/demo/schedule";
import { formatDateTime } from "@/lib/format";
import { getTeamById } from "@/lib/mock";
import type { Announcement, TimetableSlot } from "@/lib/types";

// SC-08 タイムテーブル編集(発表順の確定)。入力は最小限・時刻はすべて導出する。
// - 手で入れるのは 4 つ:①最初の発表の開始時刻 ②1 チームの発表時間(全チーム一律) ③休憩(挟む位置と長さ) ④発表順(ドラッグ)。
// - 2 チーム目以降の時刻は「次の枠の開始 = 前の枠の開始 + 前の枠の長さ」で導く(lib/demo/schedule.ts)。チームの行の時刻は表示だけ。
// - チームの枠はその発表会の全チームで固定(チームを作ると発表が生成される)。枠の追加・チームの選択欄は置かない。
// - 編集は先生の共有状態(useTimetable)の未保存の並び・入力で行い、「保存する」で発表順を確定する。
//   保存した並びと時刻は SC-07・SC-11・ホーム・ハブが読む。当日の進行は SC-07 で行う(04-screen.md の SC-07)。
export function TimetableEditClient({ announcement: a }: { announcement: Announcement }) {
  const {
    hasTimetable,
    draftSlots,
    draftSchedule,
    setDraftSchedule,
    isDirty,
    reorder,
    setDraftSlots,
    save,
    discard,
    orderConfirmed,
    confirmedAt,
  } = useTimetable(a.id);

  const ordered = draftSlots;
  const saved = orderConfirmed && !isDirty;
  const teamNumbers = new Map<string, number>();
  ordered.forEach((s) => {
    if (!s.isBreak) teamNumbers.set(s.id, teamNumbers.size + 1);
  });

  function slotLabel(slot: TimetableSlot) {
    return slot.isBreak ? slot.breakLabel : (getTeamById(slot.teamId)?.name ?? "(不明なチーム)");
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

        {/* 入力(開始時刻・一律の発表時間)と「保存する」は見出しのすぐ下、並びの一覧の上に置く。1152×620(1440×900 の
            ウィンドウを 125% にした相当)でも、スクロールせずに入力・保存と、並びの先頭の 2 行が同じ画面に見えるようにするため。
            機能を説明するだけの文言・枠は置かない(水戸の指示 2026-10-12:開発フェーズの実装に入らないため)。
            置くのは入力欄のラベル・操作の結果(未保存・確定)・次の工程へのボタンだけ。 */}
        <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">開始時刻</span>
            <TimeInput value={draftSchedule.startTime} onCommit={(startTime) => setDraftSchedule({ startTime })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">1 チームの発表時間(全チーム一律)</span>
            <span className="flex items-center gap-2">
              <MinutesInput
                value={draftSchedule.teamDurationMin}
                onCommit={(teamDurationMin) => setDraftSchedule({ teamDurationMin })}
              />
              <span className="text-xs text-slate-400">分</span>
            </span>
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={save} disabled={!hasTimetable && ordered.length === 0}>
              保存する
            </Button>
            {isDirty && (
              <Button variant="secondary" onClick={discard}>
                変更を取り消す
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 min-h-5 text-xs text-slate-400" aria-live="polite">
          {isDirty ? (
            "未保存の変更があります"
          ) : saved && confirmedAt ? (
            <span className="text-sm text-slate-500">発表順を確定しました({formatDateTime(confirmedAt)})</span>
          ) : null}
        </p>

        <div className="mt-2">
          <SortableList
            items={ordered}
            getKey={(slot) => slot.id}
            getLabel={slotLabel}
            listLabel="発表順"
            className="flex flex-col gap-1"
            onMove={(_from, to, slot) => reorder(slot.id, to)}
            renderItem={({ item: slot, handle }) => (
              <EditRow
                slot={slot}
                handle={handle}
                number={teamNumbers.get(slot.id) ?? null}
                onBreakDuration={(min) => setDraftSlots(setBreakDuration(ordered, slot.id, min))}
                onRemove={() => setDraftSlots(removeBreak(ordered, slot.id))}
              />
            )}
            renderGap={(index) => {
              // 休憩はチームとチームの間にだけ挟める(休憩の隣にもう 1 つ休憩を足しても意味が無いので出さない)。
              const canInsert = !ordered[index].isBreak && !ordered[index + 1]?.isBreak;
              return (
                <div className="flex h-6 items-center justify-center">
                  {canInsert && (
                    <button
                      type="button"
                      onClick={() => setDraftSlots(insertBreakAfter(ordered, index))}
                      aria-label={`${slotLabel(ordered[index])} と ${slotLabel(ordered[index + 1])} の間に休憩を挟む`}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      ＋ 休憩を挟む
                    </button>
                  )}
                </div>
              );
            }}
          />
        </div>

        <NextStep
          next={saved ? { href: `/announcements/${a.id}/summary-booklet`, label: "次へ：概要集生成 →" } : null}
          back={backToHub(a.id)}
        />
      </div>
    </RoleGate>
  );
}

// 並びの 1 行。チームの行は時刻を表示するだけ(導出)。休憩の行は長さの入力と削除を持つ。
function EditRow({
  slot,
  handle,
  number,
  onBreakDuration,
  onRemove,
}: {
  slot: TimetableSlot;
  handle: ReactNode;
  number: number | null;
  onBreakDuration: (min: number) => void;
  onRemove: () => void;
}) {
  const time = (
    <span className="text-sm font-medium whitespace-nowrap text-slate-600 tabular-nums" data-slot-time="">
      {slot.startTime}〜{slotEndTime(slot)}
    </span>
  );

  if (slot.isBreak) {
    return (
      <div
        data-slot-id={slot.id}
        className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-1.5 pr-3 pl-1.5"
      >
        {handle}
        <span className="w-6" aria-hidden="true" />
        <span className="font-medium text-slate-600">{slot.breakLabel}</span>
        <span className="flex items-center gap-2">
          <MinutesInput value={slot.durationMin} onCommit={onBreakDuration} label="休憩の長さ(分)" compact />
          <span className="text-xs text-slate-400">分</span>
        </span>
        <span className="ml-auto">{time}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="この休憩を外す"
          className="rounded px-1 text-slate-400 hover:text-rose-600"
        >
          ✕
        </button>
      </div>
    );
  }

  const team = getTeamById(slot.teamId);
  return (
    <div
      data-slot-id={slot.id}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white py-1.5 pr-3 pl-1.5 shadow-sm shadow-slate-900/5"
    >
      {handle}
      <span className="w-6 text-center text-sm font-semibold text-slate-400 tabular-nums">{number}</span>
      <span className="font-medium whitespace-nowrap text-slate-900">{team?.name ?? "(不明なチーム)"}</span>
      {team && <span className="min-w-0 truncate text-sm text-slate-400">{team.projectTitle}</span>}
      <span className="ml-auto flex items-center gap-2">
        {time}
        <span className="w-10 text-right text-xs text-slate-400">{slot.durationMin}分</span>
      </span>
    </div>
  );
}

// 分の入力。打ちかけ(空欄など)の間は手元の文字だけを持ち、1〜180 の整数になったときだけ反映する。
// フォーカスを外したら、反映済みの値に戻す。外から値が変わったら(取り消しなど)、表示も合わせる。
function MinutesInput({
  value,
  onCommit,
  label,
  compact = false,
}: {
  value: number;
  onCommit: (value: number) => void;
  // 外側に <label> が無いときの名前。
  label?: string;
  compact?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(String(value));
  }
  return (
    <span className={`block ${compact ? "w-16" : "w-20"}`}>
      <input
        type="number"
        inputMode="numeric"
        min={MIN_DURATION_MIN}
        max={MAX_DURATION_MIN}
        step={1}
        aria-label={label}
        className={`${fieldClassName} ${compact ? "py-1!" : ""}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && isValidDuration(n)) onCommit(n);
        }}
        onBlur={() => setText(String(value))}
      />
    </span>
  );
}

// 時刻の入力。"HH:MM" になったときだけ反映する(空欄の間は手元の文字だけ)。
function TimeInput({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }
  return (
    <span className="block w-32">
      <input
        type="time"
        className={fieldClassName}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (isTimeString(e.target.value)) onCommit(e.target.value);
        }}
        onBlur={() => setText(value)}
      />
    </span>
  );
}
