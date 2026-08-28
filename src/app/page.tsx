"use client";

import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import { isTeacher, isOwnTeam } from "@/lib/session-helpers";
import {
  getAnnouncementsByYear,
  getArchivedYears,
  getCurrentYear,
  getSubmission,
  getTeamById,
  getTeamsByYear,
  getTimetableFor,
  isLateSubmission,
  users,
} from "@/lib/mock";
import { Badge, LateBadge, PhaseBadge, StatusBadge, type BadgeTone } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { Announcement, Team, Year } from "@/lib/types";

type DashboardTile = { label: string; value: string; caption: string; href: string };

function buildDashboardTiles(year: Year, announcements: Announcement[], teams: Team[], teacher: boolean): DashboardTile[] {
  const publishedCount = announcements.filter((a) => a.isPublished).length;
  const archivedYears = getArchivedYears();

  const tiles: DashboardTile[] = [
    {
      label: "発表会",
      value: `${announcements.length}件${publishedCount > 0 ? `(${publishedCount}件公開中)` : ""}`,
      caption: "提出状況・締切を確認する",
      href: "/announcements",
    },
    {
      label: "チーム",
      value: `${teams.length}チーム`,
      caption: "メンバー・提出資料をまとめて見る",
      href: "/teams",
    },
    {
      label: "アーカイブ",
      value: `${archivedYears.length}年度分`,
      caption: "過去の卒業制作を検索・閲覧する",
      href: "/archive",
    },
  ];

  if (teacher) {
    const archivedTeams = archivedYears.flatMap((y) => getTeamsByYear(y.id));
    const permissionSetCount = archivedTeams.filter((t) => t.publishPermission !== "未設定").length;

    tiles.push(
      {
        label: "年度管理",
        value: year.label,
        caption: "年度の開始・アーカイブ操作",
        href: "/admin/years",
      },
      {
        label: "公開許可管理",
        value: `${permissionSetCount}/${archivedTeams.length}件設定済み`,
        caption: "卒業生の公開許可を管理する",
        href: "/admin/publish-permissions",
      },
      {
        label: "ユーザー管理",
        value: `${users.length}アカウント`,
        caption: "ロールの確認・変更",
        href: "/admin/users",
      }
    );
  }

  return tiles;
}

function submissionSummary(announcement: Announcement, teams: Team[]) {
  const submittedCount = teams.filter((team) => {
    const submission = getSubmission(announcement.id, team.id);
    const required = announcement.materialSlots.filter((s) => s.required);
    return (
      submission &&
      required.every((slot) => submission.materials.find((m) => m.name === slot.name)?.status === "提出済み")
    );
  }).length;

  const allSubmitted = submittedCount === teams.length;
  const pastDeadline = new Date() > new Date(announcement.submissionDeadline);
  const tone: BadgeTone = allSubmitted ? "emerald" : pastDeadline ? "rose" : "amber";
  const label = allSubmitted
    ? `提出 ${submittedCount}/${teams.length} チーム(全チーム提出済み)`
    : `提出 ${submittedCount}/${teams.length} チーム・未提出あり${pastDeadline ? "(締切超過)" : ""}`;

  return { tone, label };
}

export default function HomePage() {
  const { currentUser } = useSession();
  const year = getCurrentYear();

  if (!currentUser || !year) {
    return <EmptyState message="進行中の年度がありません。" />;
  }

  const teacher = isTeacher(currentUser);
  const announcements = getAnnouncementsByYear(year.id);
  const teams = getTeamsByYear(year.id);
  const ownTeam = teams.find((t) => isOwnTeam(currentUser, t.id)) ?? null;

  const presenting = announcements
    .map((a) => ({ announcement: a, timetable: getTimetableFor(a.id) }))
    .find((entry) => entry.timetable?.currentPresentingTeamId);

  const dashboardTiles = buildDashboardTiles(year, announcements, teams, teacher);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={year.label} title="ホーム" />

      {presenting && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-sm font-medium text-rose-700">
            いま発表中：{getTeamById(presenting.timetable!.currentPresentingTeamId!)?.name}
            (「{presenting.announcement.title}」)
          </p>
          <Link
            href={`/announcements/${presenting.announcement.id}/timetable`}
            className="text-xs font-semibold text-rose-700 underline underline-offset-2"
          >
            タイムテーブルを見る
          </Link>
        </div>
      )}

      <section className="mt-8">
        <SectionHeading>YSE Compassでできること</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-3">
          {dashboardTiles.map((tile) => (
            <CardLink key={tile.href} href={tile.href}>
              <p className="text-2xl font-bold text-brand-700">{tile.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{tile.label}</p>
              <p className="mt-1 text-xs text-slate-500">{tile.caption}</p>
            </CardLink>
          ))}
        </div>
      </section>

      {ownTeam && (
        <section className="mt-8">
          <SectionHeading>自チームの提出状況({ownTeam.name})</SectionHeading>
          <div className="flex flex-col gap-3">
            {announcements.map((a) => {
              const submission = getSubmission(a.id, ownTeam.id);
              if (!submission) return null;
              return (
                <Link
                  key={a.id}
                  href={`/announcements/${a.id}/teams/${ownTeam.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PhaseBadge phase={a.phase} />
                      <span className="font-semibold text-slate-900">{a.title}</span>
                    </div>
                    <span className="text-xs text-slate-400">締切 {formatDateTime(a.submissionDeadline)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {submission.materials.map((m) => {
                      const late = isLateSubmission(a.submissionDeadline, m.updatedAt);
                      return (
                        <span
                          key={m.id}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        >
                          {m.name}
                          <StatusBadge status={m.status} />
                          {late && <LateBadge />}
                        </span>
                      );
                    })}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <SectionHeading>{teacher ? "発表会一覧" : "聴講できる発表会"}</SectionHeading>
        <div className="flex flex-col gap-3">
          {announcements.map((a) => {
            const viewable = a.isPublished || teacher;
            const summary = teacher ? submissionSummary(a, teams) : null;
            return (
              <Link
                key={a.id}
                href={viewable ? `/announcements/${a.id}` : "#"}
                aria-disabled={!viewable}
                className={`rounded-lg border p-5 ${
                  viewable
                    ? "border-slate-200 bg-white hover:border-brand-300"
                    : "pointer-events-none border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <PhaseBadge phase={a.phase} />
                  <span className="font-semibold text-slate-900">{a.title}</span>
                  <Badge tone={a.isPublished ? "emerald" : "slate"}>{a.isPublished ? "公開中" : "非公開"}</Badge>
                </div>
                {summary && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span>締切 {formatDateTime(a.submissionDeadline)}</span>
                    <Badge tone={summary.tone}>{summary.label}</Badge>
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
