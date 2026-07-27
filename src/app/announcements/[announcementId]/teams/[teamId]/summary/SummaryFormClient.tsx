"use client";

import { useState } from "react";
import { RoleGate, RoleRestrictedNotice } from "@/components/ui/RoleGate";
import { formatDateTimeNow } from "@/lib/format";
import type { Announcement, Submission, Team } from "@/lib/types";

export default function SummaryFormClient({
  announcement,
  team,
  submission,
}: {
  announcement: Announcement;
  team: Team;
  submission: Submission;
}) {
  const existing = submission.summary;
  const [background, setBackground] = useState(existing?.background ?? "");
  const [opening, setOpening] = useState(existing?.opening ?? "");
  const [closing, setClosing] = useState(existing?.closing ?? "");
  const [techUsed, setTechUsed] = useState(existing?.techUsed.join("、") ?? "");
  const [onePageBody, setOnePageBody] = useState(existing?.onePageBody ?? "");
  const [submittedAt, setSubmittedAt] = useState(existing?.submittedAt ?? null);

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
        <h1 className="text-2xl font-bold text-slate-900">概要入力フォーム</h1>
        <p className="mt-1 text-sm text-slate-500">
          {team.name} ／ {announcement.title}
        </p>
        <p className="mt-2 rounded-lg bg-brand-50 px-4 py-3 text-xs text-brand-700">
          概要はシステム定義の統一レイアウトで概要集に掲載されます。フォント・レイアウトの個別調整はできません。
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500">背景・動機</label>
              <textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">起(取り組みの発端)</label>
              <textarea
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">結(成果・結論)</label>
              <textarea
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">使用技術(読点区切り・検索対象になります)</label>
              <input
                value={techUsed}
                onChange={(e) => setTechUsed(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">1ページ集約本文</label>
              <textarea
                value={onePageBody}
                onChange={(e) => setOnePageBody(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSubmittedAt(formatDateTimeNow())}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                提出する
              </button>
              {submittedAt && <span className="text-xs text-emerald-600">提出済み(最終更新 {submittedAt})</span>}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">プレビュー(統一レイアウト)</p>
            <div className="mt-2 aspect-[210/297] w-full overflow-y-auto rounded-lg border border-slate-300 bg-white p-6 text-xs shadow-sm">
              <p className="text-sm font-bold text-slate-900">{team.projectTitle}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{team.name} ／ {team.members.join("、")}</p>
              <p className="mt-3 whitespace-pre-wrap text-slate-700">{background || "(背景・動機は未入力)"}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-slate-500">起</p>
                  <p className="whitespace-pre-wrap text-slate-700">{opening || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500">結</p>
                  <p className="whitespace-pre-wrap text-slate-700">{closing || "-"}</p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-slate-700">{onePageBody || "(本文は未入力)"}</p>
              <p className="mt-3 text-[10px] text-slate-400">
                使用技術：{techUsed || "(未入力)"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
