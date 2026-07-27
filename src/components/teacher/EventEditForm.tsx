"use client";

import { useState } from "react";
import type { PresentationEvent } from "@/lib/mock-data";

/** SC-05 の日程編集。回種別（企画/設計/試作/最終）の変更・追加はできない。 */
export function EventEditForm({ event }: { event: PresentationEvent }) {
  const [deadline, setDeadline] = useState(event.deadline);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(true);
      }}
    >
      <div>
        <label className="block text-xs font-medium text-gray-500">締切日</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => {
            setDeadline(e.target.value);
            setSaved(false);
          }}
          className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-cyan"
      >
        保存する
      </button>
      {saved && <span className="text-xs text-emerald-600">保存しました（モック）</span>}
    </form>
  );
}
