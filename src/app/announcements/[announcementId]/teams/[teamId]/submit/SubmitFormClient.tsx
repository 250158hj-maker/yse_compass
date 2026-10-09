"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge, LateBadge } from "@/components/ui/Badge";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Button } from "@/components/ui/Button";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { useSession } from "@/context/SessionContext";
import { isOwnTeam } from "@/lib/session-helpers";
import { isValidUrl } from "@/lib/url";
import { formatDateTime } from "@/lib/format";
import { formatSubmittedAt, getSubmission, getTemplateById, getYearById, isLateSubmission } from "@/lib/mock";
import type { Announcement, Material, Team } from "@/lib/types";

export function SubmitFormClient({ announcement: a, team }: { announcement: Announcement; team: Team }) {
  const { currentUser } = useSession();
  const submission = getSubmission(a.id, team.id);
  const [materials, setMaterials] = useState<Material[]>(submission?.materials ?? []);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries((submission?.materials ?? []).map((m) => [m.id, m.driveUrl ?? ""]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // レンダー中に Date.now() を呼べない(React Compiler の純粋性)ため、開いた時点の時刻を保持する。
  const [openedAt] = useState(() => Date.now());
  const pastDeadline = openedAt > new Date(a.submissionDeadline).getTime();

  const allowed = isOwnTeam(currentUser, team.id);
  // 年度アーカイブ後は編集できない(読み取り専用。04-screen.md §4-4・requirements.md §3-4)。
  const readOnly = getYearById(a.yearId)?.status === "アーカイブ済み";

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "ホーム", href: "/" },
        { label: "発表会一覧", href: "/announcements" },
        { label: a.title, href: `/announcements/${a.id}` },
        { label: "資料提出" },
      ]}
    />
  );

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl">
        {breadcrumbs}
        <PageHeader title="資料提出" meta={`${team.name} / ${a.title}`} />
        <div className="mt-6">
          <InlineNotice tone="warning">
            この操作は発表する生徒(自チームのメンバー)のみ行えます。
          </InlineNotice>
        </div>
        <Link href={`/announcements/${a.id}/teams/${team.id}`} className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          発表詳細へ戻る →
        </Link>
      </div>
    );
  }

  function submitMaterial(materialId: string) {
    const url = drafts[materialId]?.trim() ?? "";
    if (!isValidUrl(url)) {
      setErrors((prev) => ({ ...prev, [materialId]: "http:// または https:// で始まる正しいURLを入力してください。" }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[materialId];
      return next;
    });
    const now = new Date().toISOString();
    // 初回提出日時は最初の提出でだけ入れ、差し替えでは動かさない(H-6)。
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === materialId
          ? { ...m, status: "提出済み", driveUrl: url, firstSubmittedAt: m.firstSubmittedAt ?? now, updatedAt: now }
          : m
      )
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {breadcrumbs}
      <PageHeader title="資料提出" meta={`${team.name} / ${a.title}・締切 ${formatDateTime(a.submissionDeadline)}`} />

      <div className="mt-4">
        {readOnly ? (
          <InlineNotice tone="warning">年度がアーカイブ済みのため、提出・差し替えはできません(閲覧のみ)。</InlineNotice>
        ) : (
          <InlineNotice tone="info">締切を過ぎても提出・差し替えできます。</InlineNotice>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {/* 概要集はアプリ内で管理する(概要の入力から作る)ので、ドライブのリンクは求めない。 */}
        {materials.filter((m) => m.name !== "概要集").map((material) => {
          const late = isLateSubmission(a.submissionDeadline, material.firstSubmittedAt);
          const submittedAtText = formatSubmittedAt(a.submissionDeadline, material);
          const slot = a.materialSlots.find((s) => s.name === material.name);
          const template = slot?.templateId ? getTemplateById(slot.templateId) : null;
          return (
            <Card key={material.id} className="shadow-sm shadow-slate-900/5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{material.name}</p>
                    {slot && <Badge tone={slot.required ? "rose" : "slate"}>{slot.required ? "必須" : "任意"}</Badge>}
                  </div>
                  {template && (
                    <a
                      href={template.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-brand-600 hover:underline"
                    >
                      テンプレートを開く →
                    </a>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1">
                  <StatusBadge status={material.status} />
                  {late && <LateBadge />}
                </span>
              </div>
              <FormField
                label="資料のリンク(Google Drive 等)"
                htmlFor={`url-${material.id}`}
                error={errors[material.id]}
                hint={readOnly ? undefined : "URLの形式のみ検証します。リンク先の閲覧権限は別途ご確認ください。"}
              >
                <input
                  id={`url-${material.id}`}
                  type="url"
                  className={`${fieldClassName} disabled:bg-slate-50 disabled:text-slate-500`}
                  placeholder="https://docs.google.com/..."
                  value={drafts[material.id] ?? ""}
                  disabled={readOnly}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [material.id]: e.target.value }))}
                />
              </FormField>
              {submittedAtText && <p className="mb-3 text-xs text-slate-400">初回提出 {submittedAtText}</p>}
              {!readOnly && pastDeadline && !material.firstSubmittedAt && (
                <div className="mb-3">
                  <InlineNotice tone="warning">締切を過ぎているため、提出すると遅延として記録されます。</InlineNotice>
                </div>
              )}
              {!readOnly && (
                <Button variant="primary" onClick={() => submitMaterial(material.id)}>
                  {material.status === "提出済み" ? "差し替える" : "提出する"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <Link href={`/announcements/${a.id}/teams/${team.id}`} className="mt-6 inline-block text-sm text-brand-600 hover:underline">
        発表詳細へ戻る →
      </Link>
    </div>
  );
}
