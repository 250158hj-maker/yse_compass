"use client";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardLink } from "@/components/ui/Card";
import { PhaseBadge, Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { useSession } from "@/context/SessionContext";
import { isTeacher, isOwnTeam } from "@/lib/session-helpers";
import { getCurrentYear, getAnnouncementsByYear, getTeamsByYear, getSubmission } from "@/lib/mock";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-4 w-4 shrink-0",
  "aria-hidden": true,
} as const;

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

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
          const showProgress = (teacher || !!ownTeam) && teams.length > 0;
          const percent = teams.length > 0 ? Math.round((submittedCount / teams.length) * 100) : 0;

          const content = (
            <>
              <div className="flex items-center justify-between">
                <PhaseBadge phase={a.phase} />
                <Badge tone={a.isPublished ? "emerald" : "slate"}>
                  {a.isPublished ? "公開中" : "非公開"}
                </Badge>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-900">{a.title}</p>
              <dl className="mt-3 space-y-1.5 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <dt className="flex items-center gap-1.5 text-slate-400">
                    <CalendarIcon />
                    開催日
                  </dt>
                  <dd>{formatDate(a.period)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="flex items-center gap-1.5 text-slate-400">
                    <ClockIcon />
                    締切
                  </dt>
                  <dd>{formatDate(a.submissionDeadline)}</dd>
                </div>
              </dl>
              {showProgress && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>提出完了</span>
                    <span className="font-medium text-slate-700">
                      {submittedCount}/{teams.length} チーム
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="提出完了のチーム数"
                  >
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )}
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
                <p className="mt-4 text-xs text-slate-400">公開されるまで閲覧できません。</p>
              </div>
            );
          }

          return (
            <CardLink
              key={a.id}
              href={`/announcements/${a.id}`}
              className="shadow-sm shadow-slate-900/5 hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-500/20"
            >
              {content}
            </CardLink>
          );
        })}
      </div>
    </div>
  );
}
