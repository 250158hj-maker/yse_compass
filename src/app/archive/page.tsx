"use client";

import { useState } from "react";
import Link from "next/link";
import { getArchivedYears, searchArchive } from "@/lib/mock";

export default function ArchivePage() {
  const years = getArchivedYears();
  const [keyword, setKeyword] = useState("");
  const results = searchArchive(keyword);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">アーカイブ</h1>
      <p className="mt-1 text-sm text-slate-500">
        過年度の卒業制作を「年度→作品名」で辿れます。公開許可のある作品のみ表示されます。
      </p>

      <div className="mt-4">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="キーワードで検索(例：Next.js、図書室 など)"
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-400">
          検索対象：年度・チーム名・作品名・概要本文・使用技術欄(Drive実体の本文検索はしません)
        </p>
      </div>

      {keyword.trim() && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold text-slate-500">検索結果({results.length}件)</h2>
          <div className="mt-2 flex flex-col gap-2">
            {results.map((r) => (
              <Link
                key={r.team.id}
                href={`/archive/${r.team.yearId}/${r.team.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-brand-300"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.team.projectTitle}</p>
                  <p className="text-xs text-slate-400">{r.yearLabel} ／ {r.team.name}</p>
                </div>
                <span className="text-xs text-slate-400">一致：{r.matchedIn}</span>
              </Link>
            ))}
            {results.length === 0 && <p className="text-sm text-slate-400">該当する作品がありません。</p>}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-500">年度一覧</h2>
        <div className="mt-3 flex flex-col gap-2">
          {years.map((year) => (
            <Link
              key={year.id}
              href={`/archive/${year.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-brand-300"
            >
              <span className="text-sm font-medium text-slate-800">{year.label}</span>
              <span className="text-xs text-slate-400">作品一覧を見る →</span>
            </Link>
          ))}
          {years.length === 0 && <p className="text-sm text-slate-400">アーカイブ済みの年度はまだありません。</p>}
        </div>
      </section>
    </div>
  );
}
