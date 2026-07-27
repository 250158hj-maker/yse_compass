"use client";

import { useState } from "react";
import { RoleGate, TeacherOnlyNotice } from "@/components/ui/RoleGate";
import type { Announcement, Submission, Team } from "@/lib/types";

export default function SummaryBookletClient({
  announcement,
  entries,
}: {
  announcement: Announcement;
  entries: { team: Team; submission: Submission }[];
}) {
  const [skipMissing, setSkipMissing] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const missingTeams = entries.filter((e) => !e.submission.summary);
  const readyEntries = entries.filter((e) => e.submission.summary);
  const canGenerate = missingTeams.length === 0 || skipMissing;

  return (
    <RoleGate allow={["teacher"]} fallback={<div className="mx-auto max-w-6xl px-6 py-16"><TeacherOnlyNotice /></div>}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">概要集生成・プレビュー</h1>
        <p className="mt-1 text-sm text-slate-500">{announcement.title} ／ 発表順に束ねて生成します</p>

        {missingTeams.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p>未提出チームがあります：{missingTeams.map((e) => e.team.name).join("、")}</p>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={skipMissing} onChange={(e) => setSkipMissing(e.target.checked)} />
              未提出チームをスキップして生成することを了承する
            </label>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => setGeneratedAt(new Date().toLocaleString("ja-JP"))}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            PDFを生成(印刷プレビュー相当)
          </button>
          {generatedAt && <span className="text-xs text-emerald-600">生成しました({generatedAt})・何度でも再生成できます</span>}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {readyEntries.map(({ team, submission }, index) => (
            <div key={team.id} className="rounded-lg border border-slate-300 bg-white p-6 text-sm shadow-sm">
              <p className="text-xs text-slate-400">{index + 1}ページ目</p>
              <p className="mt-1 text-base font-bold text-slate-900">{team.projectTitle}</p>
              <p className="text-xs text-slate-400">{team.name} ／ {team.members.join("、")}</p>
              <p className="mt-3 whitespace-pre-wrap text-slate-700">{submission.summary?.onePageBody}</p>
              <p className="mt-3 text-xs text-slate-400">使用技術：{submission.summary?.techUsed.join(" / ")}</p>
            </div>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
