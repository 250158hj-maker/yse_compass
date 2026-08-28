"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { useSession } from "@/context/SessionContext";
import { isOwnTeam } from "@/lib/session-helpers";
import { formatDateTime } from "@/lib/format";
import { getSubmission } from "@/lib/mock";
import type { Announcement, SummaryEntry, Team } from "@/lib/types";

export function SummaryFormClient({ announcement: a, team }: { announcement: Announcement; team: Team }) {
  const { currentUser } = useSession();
  const submission = getSubmission(a.id, team.id);
  const [summary, setSummary] = useState<SummaryEntry | null>(submission?.summary ?? null);

  const [background, setBackground] = useState(summary?.background ?? "");
  const [techUsedText, setTechUsedText] = useState(summary?.techUsed.join("、") ?? "");
  const [opening, setOpening] = useState(summary?.opening ?? "");
  const [closing, setClosing] = useState(summary?.closing ?? "");
  const [onePageBody, setOnePageBody] = useState(summary?.onePageBody ?? "");

  const allowed = isOwnTeam(currentUser, team.id);

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "ホーム", href: "/" },
        { label: "発表会一覧", href: "/announcements" },
        { label: a.title, href: `/announcements/${a.id}` },
        { label: "概要入力" },
      ]}
    />
  );

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl">
        {breadcrumbs}
        <PageHeader title="概要入力" meta={`${team.name} / ${a.title}`} />
        <div className="mt-6">
          <InlineNotice tone="warning">
            この操作は発表する生徒(自チームのメンバー)のみ行えます。
          </InlineNotice>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSummary({
      background,
      techUsed: techUsedText
        .split(/[、,]/)
        .map((t) => t.trim())
        .filter(Boolean),
      opening,
      closing,
      onePageBody,
      submittedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      {breadcrumbs}
      <PageHeader
        title="概要入力"
        meta={
          <>
            <span>{a.title}</span>
            {summary && <Badge tone="emerald">提出済み</Badge>}
          </>
        }
      />

      <div className="mt-4">
        <InlineNotice tone="info">
          概要はシステム統一レイアウトで概要集に束ねられます。フォント・レイアウトの個別調整はできません。
        </InlineNotice>
      </div>

      {summary && (
        <p className="mt-2 text-xs text-slate-400">最終提出 {formatDateTime(summary.submittedAt)}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col">
        <FormField
          label="背景・動機"
          htmlFor="background"
          required
          hint="なぜこの制作に取り組んだのか。渡部先生は背景・動機の明確さを重視します。"
        >
          <textarea
            id="background"
            required
            rows={3}
            className={fieldClassName}
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          />
        </FormField>

        <FormField label="使用技術" htmlFor="techUsed" hint="読点(、)またはカンマ区切りで入力してください。アーカイブ検索の対象になります。">
          <input
            id="techUsed"
            className={fieldClassName}
            placeholder="Next.js、TypeScript、PostgreSQL"
            value={techUsedText}
            onChange={(e) => setTechUsedText(e.target.value)}
          />
        </FormField>

        <FormField label="起(オープニング)" htmlFor="opening" required hint="発表の起点となる一文。">
          <textarea
            id="opening"
            required
            rows={2}
            className={fieldClassName}
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
        </FormField>

        <FormField label="結(クロージング)" htmlFor="closing" required hint="発表の締めとなる一文。">
          <textarea
            id="closing"
            required
            rows={2}
            className={fieldClassName}
            value={closing}
            onChange={(e) => setClosing(e.target.value)}
          />
        </FormField>

        <FormField
          label="1ページ本文"
          htmlFor="onePageBody"
          required
          hint="概要集の1ページに収まる分量で。プレゼン資料からの抜粋を推奨します。"
        >
          <textarea
            id="onePageBody"
            required
            rows={6}
            className={fieldClassName}
            value={onePageBody}
            onChange={(e) => setOnePageBody(e.target.value)}
          />
        </FormField>

        <Button type="submit" variant="primary" className="self-start">
          {summary ? "概要を更新する" : "概要を提出する"}
        </Button>
      </form>

      <Link href={`/announcements/${a.id}/teams/${team.id}`} className="mt-6 inline-block text-sm text-brand-600 hover:underline">
        発表詳細へ戻る →
      </Link>
    </div>
  );
}
