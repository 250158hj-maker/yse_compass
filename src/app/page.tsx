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
  users,
} from "@/lib/mock";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatShortDate } from "@/lib/format";
import type { Announcement, Team } from "@/lib/types";

function isFullySubmitted(announcement: Announcement, teamId: string): boolean {
  const submission = getSubmission(announcement.id, teamId);
  const required = announcement.materialSlots.filter((s) => s.required);
  return (
    !!submission && required.every((slot) => submission.materials.find((m) => m.name === slot.name)?.status === "提出済み")
  );
}

function findNextUrgent(announcements: Announcement[], isDone: (a: Announcement) => boolean): Announcement | null {
  return announcements.find((a) => !isDone(a)) ?? null;
}

function RingTile({
  href,
  label,
  percent,
  caption,
}: {
  href: string;
  label: string;
  percent: number;
  caption: string;
}) {
  return (
    <CardLink href={href} className="flex items-center gap-4">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(#1a73e8 0% ${percent}%, #e2e8f0 ${percent}% 100%)` }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand-700">
          {percent}%
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">{caption}</p>
      </div>
    </CardLink>
  );
}

function StatTile({
  href,
  label,
  value,
  caption,
  accent,
}: {
  href: string;
  label: string;
  value: string;
  caption: string;
  accent: string;
}) {
  return (
    <CardLink href={href} className={`rounded-r-lg rounded-l-none border-l-4 ${accent}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{caption}</p>
    </CardLink>
  );
}

function teacherRing(announcements: Announcement[], teams: Team[]) {
  const totalSlots = announcements.length * teams.length;
  const totalSubmitted = announcements.reduce(
    (sum, a) => sum + teams.filter((t) => isFullySubmitted(a, t.id)).length,
    0
  );
  const percent = totalSlots === 0 ? 0 : Math.round((totalSubmitted / totalSlots) * 100);
  const urgent = findNextUrgent(announcements, (a) => teams.every((t) => isFullySubmitted(a, t.id)));
  const caption = urgent
    ? `${totalSubmitted}/${totalSlots}完了・${urgent.title}が${
        new Date() > new Date(urgent.submissionDeadline) ? "締切超過" : "締切間近"
      }`
    : `${totalSubmitted}/${totalSlots}完了・すべて提出済み`;
  return { percent, caption };
}

function ownTeamRing(announcements: Announcement[], ownTeamId: string) {
  const doneCount = announcements.filter((a) => isFullySubmitted(a, ownTeamId)).length;
  const percent = announcements.length === 0 ? 0 : Math.round((doneCount / announcements.length) * 100);
  const urgent = findNextUrgent(announcements, (a) => isFullySubmitted(a, ownTeamId));
  const caption = urgent
    ? `${doneCount}/${announcements.length}回完了・次は${urgent.title}(締切${formatShortDate(urgent.submissionDeadline)})`
    : `${doneCount}/${announcements.length}回完了・すべて提出済み`;
  return { percent, caption };
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
  const archivedYears = getArchivedYears();
  const publishedCount = announcements.filter((a) => a.isPublished).length;

  const presenting = announcements
    .map((a) => ({ announcement: a, timetable: getTimetableFor(a.id) }))
    .find((entry) => entry.timetable?.currentPresentingTeamId);

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

        {teacher && (
          <>
            <RingTile href="/announcements" label="発表会の提出進捗" {...teacherRing(announcements, teams)} />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <StatTile
                href="/teams"
                label="チーム"
                value={`${teams.length}チーム`}
                caption="メンバー・提出資料を見る"
                accent="border-l-violet-500"
              />
              <StatTile
                href="/archive"
                label="アーカイブ"
                value={`${archivedYears.length}年度分`}
                caption="過去の卒業制作を検索・閲覧"
                accent="border-l-slate-500"
              />
              <StatTile
                href="/admin/years"
                label="年度管理"
                value={year.label}
                caption="年度の開始・アーカイブ操作"
                accent="border-l-brand-600"
              />
              <StatTile
                href="/admin/publish-permissions"
                label="公開許可管理"
                value={`${permissionSetCount}/${archivedTeams.length}件設定済み`}
                caption="卒業生の公開許可を管理"
                accent="border-l-brand-600"
              />
              <StatTile
                href="/admin/users"
                label="ユーザー管理"
                value={`${users.length}アカウント`}
                caption="ロールの確認・変更"
                accent="border-l-brand-600"
              />
            </div>
          </>
        )}

        {!teacher && ownTeam && (
          <>
            <RingTile
              href={`/teams/${ownTeam.id}`}
              label={`自チームの提出状況(${ownTeam.name})`}
              {...ownTeamRing(announcements, ownTeam.id)}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <StatTile
                href="/announcements"
                label="発表会"
                value={`${announcements.length}件`}
                caption={`${publishedCount}件公開中`}
                accent="border-l-brand-600"
              />
              <StatTile
                href="/teams"
                label="チーム"
                value={`${teams.length}チーム`}
                caption="他チームの発表を見る"
                accent="border-l-violet-500"
              />
              <StatTile
                href="/archive"
                label="アーカイブ"
                value={`${archivedYears.length}年度分`}
                caption="過去の卒業制作を検索・閲覧"
                accent="border-l-slate-500"
              />
            </div>
          </>
        )}

        {!teacher && !ownTeam && (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              href="/announcements"
              label="発表会"
              value={`${announcements.length}件`}
              caption={`${publishedCount}件公開中`}
              accent="border-l-brand-600"
            />
            <StatTile
              href="/teams"
              label="チーム"
              value={`${teams.length}チーム`}
              caption="発表チームを見る"
              accent="border-l-violet-500"
            />
            <StatTile
              href="/archive"
              label="アーカイブ"
              value={`${archivedYears.length}年度分`}
              caption="過去の卒業制作を検索・閲覧"
              accent="border-l-slate-500"
            />
          </div>
        )}
      </section>
    </div>
  );
}
