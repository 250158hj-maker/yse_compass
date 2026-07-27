"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { searchTeams } from "@/lib/mock-data";

export function ArchiveSearch({ basePath }: { basePath: string }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchTeams(query), [query]);

  return (
    <div>
      <input
        type="search"
        placeholder="年度・チーム名・作品名・使用技術などでキーワード検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none sm:w-96"
      />

      {query.trim() && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((team) => (
            <Link key={team.id} href={`${basePath}/${team.year}/${team.id}`}>
              <Card accent="teal" className="flex h-full flex-col transition hover:border-gray-400 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{team.workTitle}</h3>
                  <span className="shrink-0 text-xs text-gray-400">{team.year}年度</span>
                </div>
                <p className="text-xs text-gray-400">{team.name}</p>
                <p className="mt-2 flex-1 text-sm text-gray-600">{team.summary}</p>
              </Card>
            </Link>
          ))}
          {results.length === 0 && <p className="text-sm text-gray-400">該当する作品が見つかりませんでした。</p>}
        </div>
      )}
    </div>
  );
}
