"use client";

import Link from "next/link";
import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RoleGate } from "@/components/session/RoleGate";
import { TeacherAnnouncementHub } from "@/components/teacher/TeacherAnnouncementHub";
import { useSession } from "@/context/SessionContext";
import { isTeacher } from "@/lib/session-helpers";
import { formatDate, formatDateTime } from "@/lib/format";
import { getYearById, getTeamsByYear } from "@/lib/mock";
import type { Announcement } from "@/lib/types";

export function AnnouncementHubClient({ announcement: a }: { announcement: Announcement }) {
  const { currentUser } = useSession();
  const year = getYearById(a.yearId);
  const teams = getTeamsByYear(a.yearId);
  const teacher = isTeacher(currentUser);

  const [isPublished, setIsPublished] = useState(a.isPublished);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 先生は工程表の画面(デモ用の時刻・共有状態に繋いだもの)を見る。以下は生徒の画面で、描画は変えていない
  // (動画の区間 B・C)。ヘッダの公開ボタンは RoleGate で生徒には出ないが、DOM を変えないために残してある。
  if (teacher) return <TeacherAnnouncementHub announcement={a} />;

  // 生徒は(提出する生徒も)発表一覧(チーム一覧)を見る。提出と進行はホームに集約した。
  const isPureViewer = !teacher;

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

      <div className="mt-6">
        <div className="flex flex-col gap-6">
          {isPureViewer && (
            <div>
              <SectionHeading>発表一覧</SectionHeading>
              {!isPublished ? (
                <InlineNotice tone="info">資料は先生の公開操作後に閲覧できます。</InlineNotice>
              ) : (
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
          )}
        </div>
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
