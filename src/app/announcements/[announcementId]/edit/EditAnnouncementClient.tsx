"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";
import { templates } from "@/lib/mock";
import type { Announcement, MaterialSlot } from "@/lib/types";

let localIdCounter = 0;
function newLocalId() {
  localIdCounter += 1;
  return `slot-local-${localIdCounter}`;
}

export function EditAnnouncementClient({ announcement: a }: { announcement: Announcement }) {
  const router = useRouter();
  const [title, setTitle] = useState(a.title);
  const [period, setPeriod] = useState(a.period);
  const [submissionDeadline, setSubmissionDeadline] = useState(a.submissionDeadline.slice(0, 16));
  const [materialSlots, setMaterialSlots] = useState<MaterialSlot[]>(a.materialSlots);
  const [saved, setSaved] = useState(false);

  const relatedTemplates = templates.filter((t) => t.relatedPhase === a.phase);

  function updateSlot(id: string, patch: Partial<MaterialSlot>) {
    setMaterialSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setSaved(false);
  }

  function removeSlot(id: string) {
    setMaterialSlots((prev) => prev.filter((s) => s.id !== id));
    setSaved(false);
  }

  function addSlot() {
    setMaterialSlots((prev) => [...prev, { id: newLocalId(), name: "", required: true, templateId: null }]);
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  return (
    <RoleGate allow={["teacher"]} fallback={<TeacherOnlyNotice />}>
      <div className="mx-auto max-w-2xl">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "発表会一覧", href: "/announcements" },
            { label: a.title, href: `/announcements/${a.id}` },
            { label: "編集" },
          ]}
        />
        <PageHeader eyebrow="発表会編集" title={a.title} meta={<PhaseBadge phase={a.phase} />} />

        <div className="mt-4">
          <InlineNotice tone="info">
            回種別(企画/設計/試作/最終)は固定です。日程・資料枠のみ編集できます。
          </InlineNotice>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col">
          <FormField label="発表会名" htmlFor="title" required>
            <input
              id="title"
              required
              className={fieldClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>

          <FormField label="開催日" htmlFor="period" required>
            <input
              id="period"
              type="date"
              required
              className={fieldClassName}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </FormField>

          <FormField label="提出締切" htmlFor="deadline" required hint="締切はソフトデッドラインです。超過提出はブロックされず、遅延として可視化されます。">
            <input
              id="deadline"
              type="datetime-local"
              required
              className={fieldClassName}
              value={submissionDeadline}
              onChange={(e) => setSubmissionDeadline(e.target.value)}
            />
          </FormField>

          <div className="mb-2 mt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">資料枠</span>
            <Button type="button" variant="secondary" onClick={addSlot}>
              + 資料枠を追加
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {materialSlots.map((slot) => (
              <div key={slot.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <input
                    className={fieldClassName}
                    placeholder="資料枠の名称(例: 企画書)"
                    value={slot.name}
                    onChange={(e) => updateSlot(slot.id, { name: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(slot.id)}
                    aria-label="削除"
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={slot.required}
                      onChange={(e) => updateSlot(slot.id, { required: e.target.checked })}
                    />
                    必須
                  </label>
                  <select
                    className={`${fieldClassName} flex-1`}
                    value={slot.templateId ?? ""}
                    onChange={(e) => updateSlot(slot.id, { templateId: e.target.value || null })}
                  >
                    <option value="">テンプレートなし</option>
                    {relatedTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button type="submit" variant="primary">
              保存する
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push(`/announcements/${a.id}`)}>
              発表会詳細へ戻る
            </Button>
            {saved && <Badge tone="emerald">保存しました(モック内のみ)</Badge>}
          </div>
        </form>
      </div>
    </RoleGate>
  );
}
