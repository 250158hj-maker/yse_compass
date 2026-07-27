"use client";

import { useState } from "react";
import { RoleGate, TeacherOnlyNotice } from "@/components/ui/RoleGate";
import { PhaseBadge } from "@/components/ui/Badge";
import type { Announcement, MaterialSlot, Template } from "@/lib/types";

let slotIdSeq = 0;
function nextSlotId() {
  slotIdSeq += 1;
  return `new-slot-${slotIdSeq}`;
}

export default function EditAnnouncementClient({
  announcement,
  templates,
}: {
  announcement: Announcement;
  templates: Template[];
}) {
  const [title, setTitle] = useState(announcement.title);
  const [period, setPeriod] = useState(announcement.period);
  const [deadline, setDeadline] = useState(announcement.submissionDeadline);
  const [slots, setSlots] = useState<MaterialSlot[]>(announcement.materialSlots);
  const [saved, setSaved] = useState(false);

  function updateSlot(id: string, patch: Partial<MaterialSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  function addSlot() {
    setSlots((prev) => [...prev, { id: nextSlotId(), name: "新しい資料枠", required: false, templateId: null }]);
  }

  return (
    <RoleGate allow={["teacher"]} fallback={<div className="mx-auto max-w-6xl px-6 py-16"><TeacherOnlyNotice /></div>}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-2">
          <PhaseBadge phase={announcement.phase} />
          <h1 className="text-2xl font-bold text-slate-900">発表会編集</h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          回種別(企画/設計/試作/最終)は固定4種のため変更できません。発表会自体の新規作成は年度セットアップ(年度管理)から行います。
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500">名称</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500">開催日</label>
              <input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500">提出締切</label>
              <input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500">資料枠</h2>
            <button type="button" onClick={addSlot} className="text-xs font-medium text-brand-600 hover:underline">
              ＋資料枠を追加
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {slots.map((slot) => (
              <div key={slot.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex gap-2">
                  <input
                    value={slot.name}
                    onChange={(e) => updateSlot(slot.id, { name: e.target.value })}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(slot.id)}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    削除
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={slot.required}
                      onChange={(e) => updateSlot(slot.id, { required: e.target.checked })}
                    />
                    必須
                  </label>
                  <label className="flex items-center gap-1">
                    テンプレート：
                    <select
                      value={slot.templateId ?? ""}
                      onChange={(e) => updateSlot(slot.id, { templateId: e.target.value || null })}
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    >
                      <option value="">なし</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

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
