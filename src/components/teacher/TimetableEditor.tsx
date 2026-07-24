"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { useTimetableStore } from "@/lib/timetable-store";
import type { Team, TimetableSlot } from "@/lib/mock-data";

interface EditableFields {
  teamId: string;
  startTime: string;
  endTime: string;
  location: string;
}

export function TimetableEditor({
  eventId,
  initialSlots,
  teams,
}: {
  eventId: string;
  initialSlots: TimetableSlot[];
  teams: Team[];
}) {
  const [slots, setSlots] = useTimetableStore(eventId, initialSlots);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<EditableFields | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newTeamId, setNewTeamId] = useState(teams[0]?.id ?? "");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newLocation, setNewLocation] = useState("体育館");

  function teamName(teamId: string): string {
    return teams.find((t) => t.id === teamId)?.name ?? "(不明なチーム)";
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamId || !newStartTime || !newEndTime) return;
    setSlots((prev) => [
      ...prev,
      {
        id: `tt-new-${prev.length + 1}-${Date.now()}`,
        eventId,
        teamId: newTeamId,
        startTime: newStartTime,
        endTime: newEndTime,
        location: newLocation,
      },
    ]);
    setNewStartTime("");
    setNewEndTime("");
    setIsAdding(false);
  }

  function startEdit(slot: TimetableSlot) {
    setEditingId(slot.id);
    setEditFields({
      teamId: slot.teamId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
    });
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editFields) return;
    setSlots((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...editFields } : s)));
    setEditingId(null);
    setEditFields(null);
  }

  function handleDelete(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  function handleDrop(targetId: string) {
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    setSlots((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((s) => s.id === draggedId);
      const toIndex = next.findIndex((s) => s.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedId(null);
  }

  return (
    <div>
      {slots.length > 0 && (
        <p className="text-sm text-gray-500">カードをドラッグすると発表順を入れ替えられます。</p>
      )}

      <div className="mt-3 grid gap-2">
        {slots.map((slot, index) =>
          editingId === slot.id && editFields ? (
            <Card key={slot.id}>
              <form onSubmit={handleSaveEdit} className="flex flex-wrap items-center gap-2">
                <select
                  value={editFields.teamId}
                  onChange={(e) => setEditFields({ ...editFields, teamId: e.target.value })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={editFields.startTime}
                  onChange={(e) => setEditFields({ ...editFields, startTime: e.target.value })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="text-gray-400">〜</span>
                <input
                  type="time"
                  value={editFields.endTime}
                  onChange={(e) => setEditFields({ ...editFields, endTime: e.target.value })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <input
                  value={editFields.location}
                  onChange={(e) => setEditFields({ ...editFields, location: e.target.value })}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <button type="submit" className="text-sm font-semibold text-brand-blue hover:underline">
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-sm text-gray-500 hover:underline"
                >
                  キャンセル
                </button>
              </form>
            </Card>
          ) : (
            <Card
              key={slot.id}
              draggable
              onDragStart={() => setDraggedId(slot.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverId !== slot.id) setDragOverId(slot.id);
              }}
              onDragLeave={() => setDragOverId((cur) => (cur === slot.id ? null : cur))}
              onDrop={() => handleDrop(slot.id)}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              className={`flex cursor-grab items-center gap-3 transition active:cursor-grabbing ${
                draggedId === slot.id ? "opacity-40" : ""
              } ${
                dragOverId === slot.id && draggedId !== slot.id
                  ? "border-brand-blue ring-2 ring-brand-blue/30"
                  : ""
              }`}
            >
              <span className="select-none text-lg leading-none text-gray-300" aria-hidden="true">
                ⠿
              </span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{teamName(slot.teamId)}</p>
                <p className="text-sm text-gray-500">
                  {slot.startTime} 〜 {slot.endTime} ・ {slot.location}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => startEdit(slot)}
                  className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(slot.id)}
                  className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            </Card>
          )
        )}
        {slots.length === 0 && (
          <p className="py-4 text-center text-gray-500">まだ枠が登録されていません。</p>
        )}
      </div>

      {isAdding ? (
        <Card className="mt-3">
          <form className="flex flex-wrap items-center gap-2" onSubmit={handleAdd}>
            <select
              value={newTeamId}
              onChange={(e) => setNewTeamId(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              type="time"
              required
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <span className="text-gray-400">〜</span>
            <input
              type="time"
              required
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              placeholder="会場"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-cyan"
            >
              追加する
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              閉じる
            </button>
          </form>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="mt-3 rounded-full border border-dashed border-gray-300 px-4 py-2 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          ＋ 枠を追加
        </button>
      )}
    </div>
  );
}
