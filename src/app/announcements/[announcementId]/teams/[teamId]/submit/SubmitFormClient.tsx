"use client";

import { useState } from "react";
import { RoleGate, RoleRestrictedNotice } from "@/components/ui/RoleGate";
import { LateBadge, StatusBadge } from "@/components/ui/Badge";
import { isLateSubmission } from "@/lib/mock";
import { formatDateTimeNow } from "@/lib/format";
import type { Announcement, Submission, Team } from "@/lib/types";

type FieldState = {
  id: string;
  name: string;
  required: boolean;
  url: string;
  status: "未提出" | "提出済み";
  updatedAt: string | null;
  error: string | null;
};

const URL_PATTERN = /^https?:\/\/.+/;

export default function SubmitFormClient({
  announcement,
  team,
  submission,
}: {
  announcement: Announcement;
  team: Team;
  submission: Submission;
}) {
  const [fields, setFields] = useState<FieldState[]>(
    submission.materials.map((m) => ({
      id: m.id,
      name: m.name,
      required: announcement.materialSlots.find((s) => s.name === m.name)?.required ?? false,
      url: m.driveUrl ?? "",
      status: m.status,
      updatedAt: m.updatedAt,
      error: null,
    })),
  );

  function handleSave(id: string) {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (!URL_PATTERN.test(f.url)) {
          return { ...f, error: "URLの形式が正しくありません(http:// または https:// から入力してください)" };
        }
        return { ...f, status: "提出済み", updatedAt: formatDateTimeNow(), error: null };
      }),
    );
  }

  return (
    <RoleGate
      allow={["presenter"]}
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-16">
          <RoleRestrictedNotice message="この画面は発表する生徒(自チーム)向けです。「生徒(発表側)」を選択してください。" />
        </div>
      }
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">資料提出フォーム</h1>
        <p className="mt-1 text-sm text-slate-500">
          {team.name} ／ {announcement.title} ／ 締切 {announcement.submissionDeadline}
        </p>
        <p className="mt-3 rounded-lg bg-brand-50 px-4 py-3 text-xs text-brand-700">
          締切を過ぎても提出・差し替えできます。締切超過の提出は提出状況一覧に「遅延」として記録されます。
        </p>

        <div className="mt-6 flex flex-col gap-5">
          {fields.map((f) => {
            const late = isLateSubmission(f.updatedAt, announcement.submissionDeadline);
            return (
              <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-800">
                    {f.name}
                    {f.required && <span className="ml-1 text-xs text-rose-500">必須</span>}
                  </label>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={f.status} />
                    {late && <LateBadge />}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="url"
                    value={f.url}
                    onChange={(e) =>
                      setFields((prev) => prev.map((p) => (p.id === f.id ? { ...p, url: e.target.value } : p)))
                    }
                    placeholder="https://drive.google.com/..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleSave(f.id)}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    保存(上書き)
                  </button>
                </div>
                {f.error && <p className="mt-1 text-xs text-rose-600">{f.error}</p>}
                {f.updatedAt && <p className="mt-1 text-xs text-slate-400">最終更新：{f.updatedAt}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </RoleGate>
  );
}
