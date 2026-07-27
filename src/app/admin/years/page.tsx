"use client";

import { useState } from "react";
import { RoleGate, TeacherOnlyNotice } from "@/components/ui/RoleGate";
import { years as initialYears } from "@/lib/mock";
import type { Year } from "@/lib/types";

let yearIdSeq = 0;

export default function YearsAdminPage() {
  const [years, setYears] = useState<Year[]>(initialYears);
  const [message, setMessage] = useState<string | null>(null);

  const hasOngoingYear = years.some((y) => y.status === "進行中");

  function toggleArchive(id: string) {
    setYears((prev) =>
      prev.map((y) => (y.id === id ? { ...y, status: y.status === "進行中" ? "アーカイブ済み" : "進行中" } : y)),
    );
  }

  function startNewYear() {
    yearIdSeq += 1;
    const label = `20${27 + yearIdSeq}年度卒業制作`;
    setYears((prev) => [{ id: `new-year-${yearIdSeq}`, label, status: "進行中" }, ...prev]);
    setMessage(`${label}を開始しました。4回の発表会(企画/設計/試作/最終)と定番の資料枠が一括生成されます(モック)。`);
  }

  return (
    <RoleGate allow={["teacher"]} fallback={<div className="mx-auto max-w-6xl px-6 py-16"><TeacherOnlyNotice /></div>}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">年度管理</h1>
        <p className="mt-1 text-sm text-slate-500">年度セットアップ・アーカイブ移行(可逆)を行います。</p>

        <button
          type="button"
          onClick={startNewYear}
          disabled={hasOngoingYear}
          className="mt-4 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          title={hasOngoingYear ? "進行中の年度がある間は新年度を開始できません" : undefined}
        >
          ＋年度を開始(一括セットアップ)
        </button>
        {message && <p className="mt-2 text-xs text-emerald-600">{message}</p>}

        <div className="mt-6 flex flex-col gap-2">
          {years.map((year) => (
            <div key={year.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{year.label}</p>
                <p className="text-xs text-slate-400">{year.status}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleArchive(year.id)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                {year.status === "進行中" ? "年度をアーカイブする" : "アーカイブを解除する"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
