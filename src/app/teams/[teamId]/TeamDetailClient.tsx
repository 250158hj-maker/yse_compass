"use client";

import Link from "next/link";
import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge, PhaseBadge, PublishPermissionBadge } from "@/components/ui/Badge";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Button } from "@/components/ui/Button";
import { RoleGate } from "@/components/session/RoleGate";
import { useSession } from "@/context/SessionContext";
import { isOwnTeam } from "@/lib/session-helpers";
import { getAnnouncementsByYear, getSubmission, getYearById } from "@/lib/mock";
import type { Team } from "@/lib/types";

export function TeamDetailClient({ team }: { team: Team }) {
  const { currentUser } = useSession();
  const year = getYearById(team.yearId);
  const announcements = getAnnouncementsByYear(team.yearId);
  const allEnded = announcements.length > 0 && announcements.every((a) => a.status === "終了");
  const ownTeam = isOwnTeam(currentUser, team.id);
  const [publishPermission, setPublishPermission] = useState(team.publishPermission);

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "チーム一覧", href: "/teams" },
          { label: team.name },
        ]}
      />
      <PageHeader
        eyebrow={year?.label}
        title={`${team.name}(${team.projectTitle})`}
        meta={
          <>
            <Badge tone="slate">{team.className}</Badge>
            <span>リーダー: {team.leaderName}</span>
          </>
        }
      />

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <SectionHeading>発表会ごとの提出状況</SectionHeading>
          <div className="flex flex-col gap-3">
            {announcements.map((a) => {
              const submission = getSubmission(a.id, team.id);
              const required = a.materialSlots.filter((s) => s.required);
              const submittedRequired =
                submission?.materials.filter(
                  (m) => required.some((s) => s.name === m.name) && m.status === "提出済み"
                ).length ?? 0;
              return (
                <Link
                  key={a.id}
                  href={`/announcements/${a.id}/teams/${team.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300"
                >
                  <div className="flex items-center gap-2">
                    <PhaseBadge phase={a.phase} />
                    <span className="font-medium text-slate-900">{a.title}</span>
                  </div>
                  <span className="text-sm text-slate-500">
                    必須資料 {submittedRequired}/{required.length} 提出済み
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <SectionHeading>メンバー</SectionHeading>
            <ul className="flex flex-col gap-1 text-sm text-slate-700">
              {team.members.map((member) => (
                <li key={member}>
                  {member}
                  {member === team.leaderName && (
                    <span className="ml-1 text-xs text-brand-600">(リーダー)</span>
                  )}
                </li>
              ))}
            </ul>
            <RoleGate allow={["teacher"]}>
              <Button variant="secondary" className="mt-3 w-full">
                メンバー編集
              </Button>
            </RoleGate>
          </Card>

          <Card>
            <SectionHeading>公開許可(アーカイブ)</SectionHeading>
            <div className="mb-3">
              <PublishPermissionBadge status={publishPermission} />
            </div>
            {!allEnded && (
              <InlineNotice tone="info">全発表会終了後に設定できるようになります。</InlineNotice>
            )}
            {allEnded && (ownTeam || currentUser?.role === "teacher") && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500">
                  アーカイブでの作品公開に同意しますか?(同意者: チーム代表者)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => setPublishPermission("許可")}
                    disabled={publishPermission === "許可"}
                  >
                    許可する
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setPublishPermission("拒否")}
                    disabled={publishPermission === "拒否"}
                  >
                    拒否する
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
