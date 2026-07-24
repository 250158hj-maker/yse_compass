"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { readStoredTimetable } from "@/lib/timetable-store";
import {
  getPresentationLink,
  getTeam,
  resolveTimetableStatus,
  type PresentationEvent,
  type Team,
  type TimetableSlot,
} from "@/lib/mock-data";

export interface OperationEntry {
  slot: TimetableSlot;
  team: Team;
  presentationLink: string | null;
}

function buildEntries(eventId: string, slots: TimetableSlot[]): OperationEntry[] {
  return slots
    .map((slot) => {
      const team = getTeam(slot.teamId);
      if (!team) return null;
      return { slot, team, presentationLink: getPresentationLink(eventId, team.id) };
    })
    .filter((e): e is OperationEntry => e !== null);
}

function pickCurrentId(event: PresentationEvent, entries: OperationEntry[]): string | null {
  const inProgress = entries.find((e) => resolveTimetableStatus(event, e.slot) === "進行中");
  return (inProgress ?? entries[0])?.slot.id ?? null;
}

export function LiveOperationView({
  eventId,
  event,
  initialEntries,
}: {
  eventId: string;
  event: PresentationEvent;
  initialEntries: OperationEntry[];
}) {
  const [items, setItems] = useState(initialEntries);
  const [currentId, setCurrentId] = useState<string | null>(() => pickCurrentId(event, initialEntries));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredTimetable(eventId);
    if (!stored) return;
    const rebuilt = buildEntries(eventId, stored);
    // Hydrating from localStorage (edits made on the timetable management page) after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(rebuilt);
    setCurrentId(pickCurrentId(event, rebuilt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const currentIndex = items.findIndex((e) => e.slot.id === currentId);
  const current = currentIndex >= 0 ? items[currentIndex] : undefined;
  const next = currentIndex >= 0 ? items[currentIndex + 1] : undefined;

  function goPrev() {
    if (currentIndex > 0) setCurrentId(items[currentIndex - 1].slot.id);
  }

  function goNext() {
    if (currentIndex >= 0 && currentIndex < items.length - 1) setCurrentId(items[currentIndex + 1].slot.id);
  }

  function handleDrop(targetId: string) {
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((e) => e.slot.id === draggedId);
      const toIndex = next.findIndex((e) => e.slot.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedId(null);
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card accent="orange" className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">現在発表中</p>
          {current ? (
            <>
              <h2 className="mt-2 text-2xl font-extrabold text-gray-900">{current.team.workTitle}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {current.team.name} ・ {current.slot.startTime} 〜 {current.slot.endTime}
              </p>
              {current.presentationLink ? (
                <a
                  href={current.presentationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block rounded-full bg-brand-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  発表資料を開く
                </a>
              ) : (
                <p className="mt-4 text-sm text-gray-400">発表資料が未提出です</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-gray-400">発表はまだ開始していません</p>
          )}
        </Card>

        <Card accent="teal" className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-teal">次の発表</p>
          {next ? (
            <>
              <h2 className="mt-2 text-2xl font-extrabold text-gray-900">{next.team.workTitle}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {next.team.name} ・ {next.slot.startTime} 〜 {next.slot.endTime}
              </p>
              {next.presentationLink ? (
                <a
                  href={next.presentationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block rounded-full border border-brand-teal px-6 py-2 text-sm font-bold text-brand-teal hover:bg-brand-teal/5"
                >
                  先に資料を確認する
                </a>
              ) : (
                <p className="mt-4 text-sm text-gray-400">発表資料が未提出です</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-gray-400">これで最後のチームです</p>
          )}
        </Card>
      </div>

      <div className="mt-4 flex justify-center gap-3">
        <button
          type="button"
          disabled={currentIndex <= 0}
          onClick={goPrev}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ◀ 前のチームに戻す
        </button>
        <button
          type="button"
          disabled={currentIndex === -1 || currentIndex >= items.length - 1}
          onClick={goNext}
          className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-cyan disabled:cursor-not-allowed disabled:opacity-40"
        >
          次のチームへ進める ▶
        </button>
      </div>

      {items.length > 0 && (
        <p className="mt-6 text-sm text-gray-500">
          カードをドラッグすると、実際の進行に合わせて順番を入れ替えられます。
        </p>
      )}
      <div className="mt-3 grid gap-2">
        {items.map((entry, i) => (
          <Card
            key={entry.slot.id}
            draggable
            onDragStart={() => setDraggedId(entry.slot.id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverId !== entry.slot.id) setDragOverId(entry.slot.id);
            }}
            onDragLeave={() => setDragOverId((cur) => (cur === entry.slot.id ? null : cur))}
            onDrop={() => handleDrop(entry.slot.id)}
            onDragEnd={() => {
              setDraggedId(null);
              setDragOverId(null);
            }}
            className={`flex cursor-grab items-center gap-3 py-3 transition active:cursor-grabbing ${
              i === currentIndex ? "bg-brand-orange/5" : ""
            } ${draggedId === entry.slot.id ? "opacity-40" : ""} ${
              dragOverId === entry.slot.id && draggedId !== entry.slot.id
                ? "border-brand-blue ring-2 ring-brand-blue/30"
                : ""
            }`}
          >
            <span className="select-none text-lg leading-none text-gray-300" aria-hidden="true">
              ⠿
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {entry.team.workTitle}
                <span className="ml-2 text-xs text-gray-400">{entry.team.name}</span>
              </p>
              <p className="text-sm text-gray-500">
                {entry.slot.startTime} 〜 {entry.slot.endTime}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentId(entry.slot.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                i === currentIndex
                  ? "bg-brand-orange text-white"
                  : "border border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {i === currentIndex ? "現在" : "選択"}
            </button>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="py-4 text-center text-gray-500">タイムテーブルがまだ登録されていません。</p>
        )}
      </div>
    </div>
  );
}
