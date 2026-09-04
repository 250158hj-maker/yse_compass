"use client";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardLink } from "@/components/ui/Card";
import { PhaseBadge, Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { useSession } from "@/context/SessionContext";
import { isTeacher, isOwnTeam } from "@/lib/session-helpers";
import { getCurrentYear, getAnnouncementsByYear, getTeamsByYear, getSubmission } from "@/lib/mock";

export default function AnnouncementsPage() {
  const { currentUser } = useSession();
  const year = getCurrentYear();
  const announcements = year ? getAnnouncementsByYear(year.id) : [];
  const teams = year ? getTeamsByYear(year.id) : [];

  const teacher = isTeacher(currentUser);
  const ownTeam = teams.find((t) => isOwnTeam(currentUser, t.id)) ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "発表会一覧" }]} />
      <PageHeader title="発表会一覧" meta={year?.label} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {announcements.map((a) => {
          // 提出側(先生・自チームあり)はテンプレ確認等のため非公開でも開ける。閲覧する生徒だけ非公開は開けない。
          const viewable = teacher || !!ownTeam || a.isPublished;
          const submittedCount = teams.filter((team) => {
            const submission = getSubmission(a.id, team.id);
            const required = a.materialSlots.filter((s) => s.required);
            return (
              submission &&
              required.every((slot) => submission.materials.find((m) => m.name === slot.name)?.status === "提出済み")
            );
          }).length;

          const content = (
            <>
              <div className="flex items-center justify-between">
                <PhaseBadge phase={a.phase} />
                <Badge tone={a.isPublished ? "emerald" : "slate"}>
                  {a.isPublished ? "公開中" : "非公開"}
                </Badge>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{a.title}</p>
              <p className="mt-1 text-sm text-slate-500">開催日 {formatDate(a.period)}</p>
              <p className="mt-1 text-xs text-slate-400">
                締切 {formatDate(a.submissionDeadline)}
                {(teacher || ownTeam) && `・提出完了 ${submittedCount}/${teams.length} チーム`}
              </p>
            </>
          );

          if (!viewable) {
            return (
              <div
                key={a.id}
                aria-disabled
                className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-slate-400"
              >
                {content}
              </div>
            );
          }

          return (
            <CardLink key={a.id} href={`/announcements/${a.id}`}>
              {content}
            </CardLink>
          );
        })}
      </div>
    </div>
  );
}
