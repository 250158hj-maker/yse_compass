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
import { formatDateTime, formatShortDate } from "@/lib/format";
import type { Announcement, Team } from "@/lib/types";

const toneBarColor: Record<BadgeTone, string> = {
  emerald: "#059669",
  amber: "#f59e0b",
  rose: "#e11d48",
  slate: "#94a3b8",
  brand: "#1a73e8",
};

const toneTextClass: Record<BadgeTone, string> = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  rose: "text-rose-600",
  slate: "text-slate-500",
  brand: "text-brand-700",
};

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
  const ratio = teams.length === 0 ? 0 : submittedCount / teams.length;
  const tone: BadgeTone = allSubmitted ? "emerald" : pastDeadline ? "rose" : "amber";

  const label = allSubmitted
    ? `提出 ${submittedCount}/${teams.length} チーム(全チーム提出済み)`
    : `提出 ${submittedCount}/${teams.length} チーム・未提出あり${pastDeadline ? "(締切超過)" : ""}`;

  const compactLabel = allSubmitted
    ? `${submittedCount}/${teams.length}・締切済`
    : pastDeadline
      ? `${submittedCount}/${teams.length}・締切超過`
      : `${submittedCount}/${teams.length}・締切${formatShortDate(announcement.submissionDeadline)}`;

  return { tone, label, compactLabel, submittedCount, ratio, allSubmitted, pastDeadline };
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

  const announcementSummaries = announcements.map((a) => ({ announcement: a, summary: submissionSummary(a, teams) }));
  const totalSubmitted = announcementSummaries.reduce((sum, { summary }) => sum + summary.submittedCount, 0);
  const totalSlots = announcements.length * teams.length;
  const completionPercent = totalSlots === 0 ? 0 : Math.round((totalSubmitted / totalSlots) * 100);
  const incompleteCount = totalSlots - totalSubmitted;
  const nextUrgent = announcementSummaries.find(({ summary }) => !summary.allSubmitted);

  const archivedYears = getArchivedYears();
  const archivedTeams = archivedYears.flatMap((y) => getTeamsByYear(y.id));
  const permissionSetCount = archivedTeams.filter((t) => t.publishPermission !== "未設定").length;

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

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#1a73e8 0% ${completionPercent}%, #e2e8f0 ${completionPercent}% 100%)`,
              }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-700">
                {completionPercent}%
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">全体の提出進捗(チーム×発表会)</p>
              <p className="mt-0.5 text-base font-semibold text-slate-900">
                {totalSubmitted}/{totalSlots} 完了
                {nextUrgent && `・${nextUrgent.announcement.title}が${nextUrgent.summary.pastDeadline ? "締切超過" : "締切間近"}`}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {announcementSummaries.map(({ announcement: a, summary }) => (
              <div key={a.id}>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-medium text-brand-700">{a.phase}</span>{" "}
                    <span className="text-slate-700">{a.title}</span>
                  </span>
                  <span className={toneTextClass[summary.tone]}>{summary.compactLabel}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${summary.ratio * 100}%`, backgroundColor: toneBarColor[summary.tone] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <CardLink href="/teams" className="rounded-r-lg rounded-l-none border-l-4 border-l-violet-500">
            <p className="text-xs text-slate-500">チーム</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{teams.length}チーム</p>
            <div className="mt-2 flex gap-1">
              {teams.map((t) => (
                <span key={t.id} className="h-1.5 flex-1 rounded-full bg-violet-500" />
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">メンバー・提出資料をまとめて見る</p>
          </CardLink>

          <CardLink href="/archive" className="rounded-r-lg rounded-l-none border-l-4 border-l-slate-500">
            <p className="text-xs text-slate-500">アーカイブ</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{archivedYears.length}年度分</p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-500" />
            <p className="mt-2 text-xs text-slate-400">過去の卒業制作を検索・閲覧する</p>
          </CardLink>

          <CardLink href="/announcements" className="rounded-r-lg rounded-l-none border-l-4 border-l-amber-500">
            <p className="text-xs text-slate-500">未提出</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{incompleteCount}件</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${totalSlots === 0 ? 0 : (incompleteCount / totalSlots) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">提出状況・締切を確認する</p>
          </CardLink>
        </div>

        {teacher && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <CardLink href="/admin/years" className="rounded-r-lg rounded-l-none border-l-4 border-l-brand-600">
              <p className="text-xs text-slate-500">年度管理</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {year.label}・{year.status}
              </p>
              <p className="mt-2 text-xs text-slate-400">年度の開始・アーカイブ操作</p>
            </CardLink>

            <CardLink
              href="/admin/publish-permissions"
              className="rounded-r-lg rounded-l-none border-l-4 border-l-brand-600"
            >
              <p className="text-xs text-slate-500">公開許可管理</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {permissionSetCount}/{archivedTeams.length}件設定済み
              </p>
              <p className="mt-2 text-xs text-slate-400">卒業生の公開許可を管理する</p>
            </CardLink>

            <CardLink href="/admin/users" className="rounded-r-lg rounded-l-none border-l-4 border-l-brand-600">
              <p className="text-xs text-slate-500">ユーザー管理</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{users.length}アカウント</p>
              <p className="mt-2 text-xs text-slate-400">ロールの確認・変更</p>
            </CardLink>
          </div>
        )}
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
          {announcementSummaries.map(({ announcement: a, summary }) => {
            const viewable = a.isPublished || teacher;
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
                {teacher && (
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
