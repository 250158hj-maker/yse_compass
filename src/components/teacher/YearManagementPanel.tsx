"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { YearState } from "@/lib/mock-data";

/** SC-19 年度管理。年度のライフサイクルの入口（セットアップ）と出口（アーカイブ）を1画面に集約する。 */
export function YearManagementPanel({ initialYears }: { initialYears: YearState[] }) {
  const [years, setYears] = useState(initialYears);
  const [isStarting, setIsStarting] = useState(false);
  const [newYear, setNewYear] = useState("");

  function handleStartYear(e: React.FormEvent) {
    e.preventDefault();
    const year = Number(newYear);
    if (!year || years.some((y) => y.year === year)) return;
    setYears((prev) => [{ year, status: "進行中", archived: false }, ...prev]);
    setNewYear("");
    setIsStarting(false);
  }

  function toggleArchive(year: number) {
    setYears((prev) =>
      prev.map((y) =>
        y.year === year ? { ...y, archived: !y.archived, status: y.archived ? "進行中" : "アーカイブ済み" } : y
      )
    );
  }

  return (
    <div>
      <Card accent="blue">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">年度を開始</h2>
          {!isStarting && (
            <button
              type="button"
              onClick={() => setIsStarting(true)}
              className="rounded-full bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-cyan"
            >
              新しい年度をセットアップ
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-600">
          企画・設計・試作・最終の4発表会と、定番の資料枠構成を一括生成します（回種別の追加・変更はできません）。
        </p>
        {isStarting && (
          <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={handleStartYear}>
            <input
              type="number"
              required
              placeholder="西暦（例: 2027）"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-cyan"
            >
              セットアップする
            </button>
            <button
              type="button"
              onClick={() => setIsStarting(false)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              閉じる
            </button>
          </form>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="font-semibold text-gray-900">年度一覧</h2>
        <ul className="mt-3 divide-y divide-gray-100">
          {years.map((y) => (
            <li key={y.year} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="font-medium text-gray-900">{y.year}年度</span>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    y.archived ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {y.status}
                </span>
                <button
                  type="button"
                  onClick={() => toggleArchive(y.year)}
                  className="text-xs font-semibold text-brand-blue hover:underline"
                >
                  {y.archived ? "アーカイブを解除する" : "年度をアーカイブする"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
