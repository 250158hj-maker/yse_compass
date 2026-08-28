"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge, LateBadge } from "@/components/ui/Badge";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Button } from "@/components/ui/Button";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { useSession } from "@/context/SessionContext";
import { isOwnTeam } from "@/lib/session-helpers";
import { isValidUrl } from "@/lib/url";
import { formatDateTime } from "@/lib/format";
import { getSubmission, isLateSubmission } from "@/lib/mock";
import type { Announcement, Material, Team } from "@/lib/types";

export function SubmitFormClient({ announcement: a, team }: { announcement: Announcement; team: Team }) {
  const { currentUser } = useSession();
  const submission = getSubmission(a.id, team.id);
  const [materials, setMaterials] = useState<Material[]>(submission?.materials ?? []);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries((submission?.materials ?? []).map((m) => [m.id, m.driveUrl ?? ""]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allowed = isOwnTeam(currentUser, team.id);

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
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === materialId ? { ...m, status: "提出済み", driveUrl: url, updatedAt: new Date().toISOString() } : m
      )
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {breadcrumbs}
      <PageHeader title="資料提出" meta={`${team.name} / ${a.title}・締切 ${formatDateTime(a.submissionDeadline)}`} />

      <div className="mt-4">
        <InlineNotice tone="info">
          締切を過ぎても提出・差し替えできます。ただし遅延として提出状況一覧に表示されます。
        </InlineNotice>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {materials.map((material) => {
          const late = isLateSubmission(a.submissionDeadline, material.updatedAt);
          return (
            <Card key={material.id}>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium text-slate-900">{material.name}</p>
                <span className="flex items-center gap-1">
                  <StatusBadge status={material.status} />
                  {late && <LateBadge />}
                </span>
              </div>
              <FormField
                label="資料のリンク(Google Drive 等)"
                htmlFor={`url-${material.id}`}
                error={errors[material.id]}
                hint="URLの形式のみ検証します。リンク先の閲覧権限は別途ご確認ください。"
              >
                <input
                  id={`url-${material.id}`}
                  type="url"
                  className={fieldClassName}
                  placeholder="https://docs.google.com/..."
                  value={drafts[material.id] ?? ""}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [material.id]: e.target.value }))}
                />
              </FormField>
              {material.updatedAt && (
                <p className="mb-3 text-xs text-slate-400">最終更新 {formatDateTime(material.updatedAt)}</p>
              )}
              <Button variant="primary" onClick={() => submitMaterial(material.id)}>
                {material.status === "提出済み" ? "差し替える" : "提出する"}
              </Button>
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
