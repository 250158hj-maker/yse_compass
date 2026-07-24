"use client";

import Link from "next/link";
import { useRole } from "@/context/RoleContext";
import { announcements, templates, type Announcement } from "@/lib/mock-data";

const statusStyle: Record<Announcement["status"], string> = {
  受付中: "bg-emerald-100 text-emerald-700",
  開催予定: "bg-slate-100 text-slate-600",
  終了: "bg-slate-100 text-slate-400",
};

export default function AnnouncementsPage() {
  const { role } = useRole();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">発表会一覧</h1>
          <p className="mt-1 text-sm text-slate-500">
            年4回(企画・設計・試作・最終)の発表会と、提出対象となる資料枠を確認できます。
          </p>
        </div>
        {role === "teacher" && (
          <button
            type="button"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            発表会を作成
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {announcements.map((a) => (
          <Link
            key={a.id}
            href={`/announcements/${a.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {a.phase}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle[a.status]}`}
              >
                {a.status}
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">{a.title}</h2>

            <dl className="mt-4 space-y-1 text-sm text-slate-500">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-slate-400">開催日</dt>
                <dd>{a.period}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-slate-400">提出締切</dt>
                <dd>{a.submissionDeadline}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {a.materialSlots.map((slot) => (
                <span
                  key={slot.name}
                  className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600"
                >
                  {slot.name}
                  {slot.required && <span className="ml-1 text-rose-400">必須</span>}
                </span>
              ))}
            </div>

            <span className="mt-5 inline-block text-sm font-semibold text-slate-900">
              チーム一覧・提出状況を見る →
            </span>
          </Link>
        ))}
      </div>

      {(role === "teacher" || role === "student2") && (
        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-400">配布テンプレート</h2>
              <p className="mt-1 text-xs text-slate-400">
                各発表会で提出する資料のフォーマットです。ダウンロードして編集してください。
              </p>
            </div>
            {role === "teacher" && (
              <button
                type="button"
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                テンプレートを追加
              </button>
            )}
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {templates.map((tpl) => (
              <li key={tpl.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{tpl.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">{tpl.relatedPhase}</span>
                    <span>{tpl.format}</span>
                  </div>
                </div>
                <a
                  href={tpl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-slate-900 hover:underline"
                >
                  開く
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
