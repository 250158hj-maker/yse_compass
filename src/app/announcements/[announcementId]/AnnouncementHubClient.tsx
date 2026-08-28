"use client";

import Link from "next/link";
import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge, PhaseBadge, StatusBadge, LateBadge } from "@/components/ui/Badge";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RoleGate } from "@/components/session/RoleGate";
import { useSession } from "@/context/SessionContext";
import { isTeacher, isOwnTeam } from "@/lib/session-helpers";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  getYearById,
  getTemplateById,
  getTeamsByYear,
  getSubmission,
  isLateSubmission,
} from "@/lib/mock";
import type { Announcement } from "@/lib/types";

export function AnnouncementHubClient({ announcement: a }: { announcement: Announcement }) {
  const { currentUser } = useSession();
  const year = getYearById(a.yearId);
  const teams = getTeamsByYear(a.yearId);
  const teacher = isTeacher(currentUser);
  const ownTeam = teams.find((t) => isOwnTeam(currentUser, t.id)) ?? null;

  const [isPublished, setIsPublished] = useState(a.isPublished);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "発表会一覧", href: "/announcements" },
          { label: a.title },
        ]}
      />
      <PageHeader
        eyebrow={year?.label}
        title={a.title}
        meta={
          <>
            <PhaseBadge phase={a.phase} />
            <span>開催日 {formatDate(a.period)}</span>
            <span>提出締切 {formatDateTime(a.submissionDeadline)}</span>
            <Badge tone={isPublished ? "emerald" : "slate"}>{isPublished ? "公開中" : "非公開"}</Badge>
          </>
        }
        actions={
          <RoleGate allow={["teacher"]}>
            <Button
              variant={isPublished ? "secondary" : "primary"}
              onClick={() => setConfirmOpen(true)}
            >
              {isPublished ? "公開を解除する" : "公開する"}
            </Button>
          </RoleGate>
        }
      />

      <RoleGate allow={["teacher"]}>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href={`/announcements/${a.id}/edit`} className="text-brand-600 hover:underline">
            発表会編集
          </Link>
          <Link href={`/announcements/${a.id}/submissions`} className="text-brand-600 hover:underline">
            提出状況一覧
          </Link>
          <Link href={`/announcements/${a.id}/timetable/edit`} className="text-brand-600 hover:underline">
            タイムテーブル編集
          </Link>
          <Link href={`/announcements/${a.id}/summary-booklet`} className="text-brand-600 hover:underline">
            概要集生成
          </Link>
        </div>
      </RoleGate>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 flex flex-col gap-6">
          <div>
            <SectionHeading>資料枠</SectionHeading>
            <div className="flex flex-col gap-2">
              {a.materialSlots.map((slot) => {
                const template = slot.templateId ? getTemplateById(slot.templateId) : null;
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div>
                      <span className="font-medium text-slate-900">{slot.name}</span>
                      {slot.required && <span className="ml-2 text-xs text-rose-600">必須</span>}
                    </div>
                    {template && (
                      <a
                        href={template.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-600 hover:underline"
                      >
                        テンプレートを開く →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <SectionHeading
              action={
                <Link href={`/announcements/${a.id}/timetable`} className="text-sm text-brand-600 hover:underline">
                  タイムテーブルを見る →
                </Link>
              }
            >
              進行
            </SectionHeading>
            <p className="text-sm text-slate-500">発表順・時刻・当日の進行状況を確認できます。</p>
          </div>

          <div>
            <SectionHeading>発表一覧</SectionHeading>
            {!isPublished && !teacher && (
              <InlineNotice tone="info">資料は先生の公開操作後に閲覧できます。</InlineNotice>
            )}
            {!isPublished && teacher && (
              <>
                <InlineNotice tone="warning">
                  非公開のため、生徒にはまだ表示されていません(先生によるプレビューです)。
                </InlineNotice>
                <div className="mt-3 flex flex-col gap-2">
                  {teams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/announcements/${a.id}/teams/${team.id}`}
                      className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300"
                    >
                      {team.name}({team.projectTitle})
                    </Link>
                  ))}
                </div>
              </>
            )}
            {isPublished && (
              <div className="flex flex-col gap-2">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/announcements/${a.id}/teams/${team.id}`}
                    className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300"
                  >
                    {team.name}({team.projectTitle})
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {ownTeam && (
          <div>
            <Card>
              <SectionHeading>自チームの提出状況({ownTeam.name})</SectionHeading>
              <div className="flex flex-col gap-2">
                {a.materialSlots.map((slot) => {
                  const submission = getSubmission(a.id, ownTeam.id);
                  const material = submission?.materials.find((m) => m.name === slot.name);
                  const late = material ? isLateSubmission(a.submissionDeadline, material.updatedAt) : false;
                  return (
                    <div key={slot.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{slot.name}</span>
                      <span className="flex items-center gap-1">
                        <StatusBadge status={material?.status ?? "未提出"} />
                        {late && <LateBadge />}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Link href={`/announcements/${a.id}/teams/${ownTeam.id}/submit`}>
                  <Button variant="primary" className="w-full">
                    資料を提出する
                  </Button>
                </Link>
                <Link href={`/announcements/${a.id}/teams/${ownTeam.id}/summary`}>
                  <Button variant="secondary" className="w-full">
                    概要を入力する
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setIsPublished((v) => !v)}
        title={isPublished ? "公開を解除しますか?" : "発表会を公開しますか?"}
        description={
          isPublished
            ? "公開を解除すると、聴く生徒からは資料が見えなくなります。"
            : "発表会単位で資料が一括公開され、聴く生徒が閲覧できるようになります。"
        }
        confirmLabel={isPublished ? "公開を解除する" : "公開する"}
        confirmVariant={isPublished ? "danger" : "primary"}
      />
    </div>
  );
}
