"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CardLink } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClassName } from "@/components/ui/FormField";
import { getArchivedYears, searchArchive } from "@/lib/mock";

export default function ArchivePage() {
  const archivedYears = getArchivedYears();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const results = trimmed ? searchArchive(trimmed) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "アーカイブ" }]} />
      <PageHeader
        title="アーカイブ"
        meta="過年度の卒業制作を年度・キーワードで振り返れます"
      />

      <div className="mt-6">
        <input
          type="search"
          className={fieldClassName}
          placeholder="キーワードで検索(チーム名・作品名・使用技術・概要本文)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">
          検索対象はメタデータと概要の構造化データのみです。Drive資料本文は検索できません。
        </p>
      </div>

      {trimmed ? (
        <section className="mt-8">
          <SectionHeading>検索結果({results.length}件)</SectionHeading>
          {results.length === 0 ? (
            <EmptyState message="該当する公開許可済みの作品が見つかりませんでした。" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map(({ team, yearLabel }) => (
                <CardLink key={team.id} href={`/archive/${team.yearId}/teams/${team.id}`}>
                  <Badge tone="slate">{yearLabel}</Badge>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{team.projectTitle}</p>
                  <p className="text-sm text-slate-500">
                    {team.name}({team.className})
                  </p>
                </CardLink>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="mt-8">
          <SectionHeading>年度から探す</SectionHeading>
          {archivedYears.length === 0 ? (
            <EmptyState message="アーカイブ済みの年度はまだありません。" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {archivedYears.map((year) => (
                <CardLink key={year.id} href={`/archive/${year.id}`}>
                  <p className="text-lg font-semibold text-slate-900">{year.label}卒業制作</p>
                  <p className="mt-1 text-xs text-slate-400">作品一覧を見る →</p>
                </CardLink>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
