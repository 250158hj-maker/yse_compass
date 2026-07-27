"use client";

import { useState } from "react";
import type { MaterialSlot } from "@/lib/mock-data";

interface EditableFields {
  kind: string;
  deadline: string;
  formType: MaterialSlot["formType"];
}

export function MaterialSlotManager({
  eventId,
  eventLabel,
  initialSlots,
}: {
  eventId: string;
  eventLabel: string;
  initialSlots: MaterialSlot[];
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<EditableFields | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newKind, setNewKind] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newFormType, setNewFormType] = useState<MaterialSlot["formType"]>("link");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newKind.trim() || !newDeadline) return;
    setSlots((prev) => [
      ...prev,
      {
        id: `slot-new-${prev.length + 1}-${Date.now()}`,
        eventId,
        kind: newKind.trim(),
        deadline: newDeadline,
        formType: newFormType,
      },
    ]);
    setNewKind("");
    setNewDeadline("");
    setNewFormType("link");
    setIsAdding(false);
  }

  function startEdit(slot: MaterialSlot) {
    setEditingId(slot.id);
    setEditFields({ kind: slot.kind, deadline: slot.deadline, formType: slot.formType });
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

  return (
    <div>
      {slots.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {slots.map((slot) =>
            editingId === slot.id && editFields ? (
              <li key={slot.id}>
                <form
                  onSubmit={handleSaveEdit}
                  className="flex items-center gap-1 rounded-md border border-brand-blue bg-white px-2 py-1"
                >
                  <input
                    autoFocus
                    value={editFields.kind}
                    onChange={(e) => setEditFields({ ...editFields, kind: e.target.value })}
                    className="w-24 rounded border border-gray-200 px-1 py-0.5 text-sm focus:border-gray-400 focus:outline-none"
                  />
                  <input
                    type="date"
                    value={editFields.deadline}
                    onChange={(e) => setEditFields({ ...editFields, deadline: e.target.value })}
                    className="rounded border border-gray-200 px-1 py-0.5 text-sm focus:border-gray-400 focus:outline-none"
                  />
                  <select
                    value={editFields.formType}
                    onChange={(e) =>
                      setEditFields({ ...editFields, formType: e.target.value as MaterialSlot["formType"] })
                    }
                    className="rounded border border-gray-200 px-1 py-0.5 text-sm focus:border-gray-400 focus:outline-none"
                  >
                    <option value="link">リンク登録</option>
                    <option value="summary">概要フォーム</option>
                  </select>
                  <button type="submit" className="text-xs font-semibold text-brand-blue hover:underline">
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    キャンセル
                  </button>
                </form>
              </li>
            ) : (
              <li
                key={slot.id}
                className="flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1 text-gray-600"
              >
                <span>
                  {slot.kind}（{slot.formType === "summary" ? "概要フォーム" : "リンク登録"}・締切 {slot.deadline}）
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(slot)}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(slot.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  削除
                </button>
              </li>
            )
          )}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-400">資料枠はまだ定義されていません。</p>
      )}

      {isAdding ? (
        <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={handleAdd}>
          <span className="text-xs text-gray-400">{eventLabel}に追加：</span>
          <input
            type="text"
            required
            placeholder="種類（例: 発表資料）"
            value={newKind}
            onChange={(e) => setNewKind(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
          <input
            type="date"
            required
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
          <select
            value={newFormType}
            onChange={(e) => setNewFormType(e.target.value as MaterialSlot["formType"])}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="link">リンク登録</option>
            <option value="summary">概要フォーム</option>
          </select>
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
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="mt-3 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          ＋ 資料枠を追加
        </button>
      )}
    </div>
  );
}
