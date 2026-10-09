"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useSession } from "@/context/SessionContext";
import { isTeacher, isOwnTeam } from "@/lib/session-helpers";
import {
  formatSubmittedAt,
  getAnnouncementsByYear,
  getArchivedYears,
  getCurrentYear,
  getSubmission,
  getTeamById,
  getTeamsByYear,
  getTemplateById,
  getTimetableFor,
  isLateSubmission,
  users,
} from "@/lib/mock";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card, CardLink } from "@/components/ui/Card";
import { Badge, LateBadge, PhaseBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { TimetableRows } from "@/components/timetable/TimetableRows";
import { formatDateTime, formatShortDate } from "@/lib/format";
import type { Announcement, Team, Timetable } from "@/lib/types";

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

// ホームの開閉できる見出し。閉じていても見出し横の補足(件数など)とリンクは見える。
function ToggleHeading({
  open,
  onToggle,
  controls,
  children,
  aside,
  action,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string;
  children: ReactNode;
  aside?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={controls}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-90" : ""}`}
          >
            <path d="M5 3l4 4-4 4" />
          </svg>
          {children}
        </button>
        {aside}
      </div>
      {action}
    </div>
  );
}

// ホームに出す発表会は、発表中のもの → 開催前でタイムテーブルがあるもの → タイムテーブルがある最後のもの、の順に選ぶ。
function pickFeatured(announcements: Announcement[]): Announcement | null {
  const withTimetable = announcements.filter((a) => getTimetableFor(a.id));
  return (
    withTimetable.find((a) => getTimetableFor(a.id)?.currentPresentingTeamId) ??
    withTimetable.find((a) => a.status !== "終了") ??
    withTimetable[withTimetable.length - 1] ??
    null
  );
}

// ホームの「発表の進行」には、発表中の前 1 組・後 2 組だけを出す(全体はタイムテーブル画面)。
// 発表中の人がいなければ先頭から 3 組。間にある休憩は一緒に出す。
function nearbySlots(timetable: Timetable): Timetable {
  const slots = [...timetable.slots].sort((x, y) => x.order - y.order);
  const teamIdx = slots.flatMap((slot, i) => (slot.isBreak ? [] : [i]));
  const current = teamIdx.findIndex((i) => {
    const slot = slots[i];
    return !slot.isBreak && slot.teamId === timetable.currentPresentingTeamId;
  });
  const [from, to] = current === -1 ? [0, 2] : [Math.max(current - 1, 0), current + 2];
  const picked = teamIdx.slice(from, to + 1);
  if (picked.length === 0) return { ...timetable, slots: [] };
  return { ...timetable, slots: slots.slice(picked[0], picked[picked.length - 1] + 1) };
}

// 進行と発表一覧を、1 つの一覧にまとめる(チーム枠が発表詳細へのリンクを兼ねる)。
function ProgressSection({ announcement: a, teacher }: { announcement: Announcement; teacher: boolean }) {
  const [open, setOpen] = useState(false);
  const timetable = getTimetableFor(a.id);
  return (
    <section className="mt-8">
      <ToggleHeading
        open={open}
        onToggle={() => setOpen((v) => !v)}
        controls="home-progress"
        action={
          <Link href={`/announcements/${a.id}/timetable`} className="text-sm text-brand-600 hover:underline">
            タイムテーブルを見る →
          </Link>
        }
      >
        発表の進行({a.title})
      </ToggleHeading>
      {open && (
        <div id="home-progress">
          {!a.isPublished && !teacher && (
            <div className="mb-3">
              <InlineNotice tone="info">資料は先生の公開操作後に閲覧できます。</InlineNotice>
            </div>
          )}
          {!a.isPublished && teacher && (
            <div className="mb-3">
              <InlineNotice tone="warning">
                非公開のため、生徒にはまだ資料が表示されていません(先生によるプレビューです)。
              </InlineNotice>
            </div>
          )}
          {timetable && a.status === "終了" ? (
            <InlineNotice tone="info">この発表会の発表は終了しました。全体はタイムテーブルで見られます。</InlineNotice>
          ) : (
            <TimetableRows timetable={timetable && nearbySlots(timetable)} announcementId={a.id} />
          )}
        </div>
      )}
    </section>
  );
}

// 通知を送らない(2026-07-24 決定)ので、締切と未提出の可視化はこの一覧が最後の砦。必須枠の未提出だけを強調する(H-15)。
function OwnTeamSlots({ announcements, team }: { announcements: Announcement[]; team: Team }) {
  const rows = announcements.map((a) => {
    const submission = getSubmission(a.id, team.id);
    const slots = a.materialSlots.map((slot) => {
      const material = submission?.materials.find((m) => m.name === slot.name);
      const submitted = material?.status === "提出済み";
      return {
        slot,
        material,
        template: slot.templateId ? getTemplateById(slot.templateId) : null,
        submitted,
        missingRequired: slot.required && !submitted,
        late: material ? isLateSubmission(a.submissionDeadline, material.firstSubmittedAt) : false,
      };
    });
    return { announcement: a, slots };
  });
  const missingCount = rows.reduce((sum, row) => sum + row.slots.filter((s) => s.missingRequired).length, 0);

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-500">自チームの提出すべき資料枠({team.name})</h2>
        <span className="flex items-center gap-2 text-sm text-slate-500">
          必須枠の未提出
          <Badge tone={missingCount > 0 ? "rose" : "emerald"}>{missingCount}件</Badge>
        </span>
      </div>
      <div id="home-own-slots" className="grid gap-3 md:grid-cols-2">
        {rows.map(({ announcement: a, slots }) => (
          <Card key={a.id} className="shadow-sm shadow-slate-900/5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PhaseBadge phase={a.phase} />
                <Link href={`/announcements/${a.id}`} className="font-semibold text-slate-900 hover:text-brand-700">
                  {a.title}
                </Link>
              </div>
              <span className="text-xs text-slate-500">締切 {formatDateTime(a.submissionDeadline)}</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {slots.map(({ slot, material, template, missingRequired, late }) => {
                const submittedAtText = material ? formatSubmittedAt(a.submissionDeadline, material) : null;
                return (
                  <li
                    key={slot.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm ${
                      missingRequired ? "bg-rose-50 ring-1 ring-rose-200" : "bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={missingRequired ? "font-semibold text-rose-700" : "text-slate-700"}>
                        {slot.name}
                      </span>
                      <Badge tone={slot.required ? "rose" : "slate"}>{slot.required ? "必須" : "任意"}</Badge>
                    </span>
                    <span className="flex items-center gap-2">
                      {submittedAtText && <span className="text-xs text-slate-400">{submittedAtText}</span>}
                      <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                        <StatusBadge status={material?.status ?? "未提出"} />
                        {late && <LateBadge />}
                      </span>
                    </span>
                    {template && (
                      <a
                        href={template.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="basis-full text-sm text-brand-600 hover:underline"
                      >
                        テンプレートを開く →
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/announcements/${a.id}/teams/${team.id}/submit`}>
                <Button variant="primary">プレゼン資料を提出</Button>
              </Link>
              <Link href={`/announcements/${a.id}/teams/${team.id}/summary`}>
                <Button variant="secondary">概要を入力</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
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
    <CardLink
      href={href}
      className="flex items-center gap-4 shadow-sm shadow-slate-900/5 hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-500/20"
    >
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
  icon,
  iconColor,
}: {
  href: string;
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
  iconColor: string;
}) {
  return (
    <CardLink
      href={href}
      className="flex items-center gap-4 shadow-sm shadow-slate-900/5 hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-500/20"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{value}</p>
        <p className="mt-1 text-xs text-slate-400">{caption}</p>
      </div>
    </CardLink>
  );
}

// ホームのStatTile/RingTileで使うアイコン(丸背景)。全ロール共通。
function AnnounceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 3a1 1 0 0 1 1 1v1.1a6 6 0 0 1 5 5.9v3.3l1.3 1.5a.9.9 0 0 1-.7 1.5H5.4a.9.9 0 0 1-.7-1.5L6 14.3V11a6 6 0 0 1 5-5.9V4a1 1 0 0 1 1-1Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5" />
      <path d="M14.8 14.3c2.1.4 3.7 2.2 3.7 4.7" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3.5" y="5.5" width="17" height="4" rx="1" />
      <path d="M5 9.5V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M10 13.5h4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3M16 3v3" />
    </svg>
  );
}

function PermissionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 3.3 19 6v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-2.7Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function UsersAdminIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    </svg>
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
  const featured = pickFeatured(announcements);
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
            href={`/announcements/${presenting.announcement.id}/teams/${presenting.timetable!.currentPresentingTeamId}`}
            className="text-xs font-semibold text-rose-700 underline underline-offset-2"
          >
            発表を見る
          </Link>
        </div>
      )}

      {featured && <ProgressSection announcement={featured} teacher={teacher} />}

      {!teacher && ownTeam && <OwnTeamSlots announcements={announcements} team={ownTeam} />}

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
                icon={<TeamIcon />}
                iconColor="bg-violet-50 text-violet-500"
              />
              <StatTile
                href="/archive"
                label="アーカイブ"
                value={`${archivedYears.length}年度分`}
                caption="過去の卒業制作を検索・閲覧"
                icon={<ArchiveIcon />}
                iconColor="bg-slate-100 text-slate-500"
              />
              <StatTile
                href="/admin/years"
                label="年度管理"
                value={year.label}
                caption="年度の開始・アーカイブ操作"
                icon={<CalendarIcon />}
                iconColor="bg-brand-50 text-brand-600"
              />
              <StatTile
                href="/admin/publish-permissions"
                label="公開許可管理"
                value={`${permissionSetCount}/${archivedTeams.length}件設定済み`}
                caption="卒業生の公開許可を管理"
                icon={<PermissionIcon />}
                iconColor="bg-brand-50 text-brand-600"
              />
              <StatTile
                href="/admin/users"
                label="ユーザー管理"
                value={`${users.length}アカウント`}
                caption="ロールの確認・変更"
                icon={<UsersAdminIcon />}
                iconColor="bg-brand-50 text-brand-600"
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
                icon={<AnnounceIcon />}
                iconColor="bg-brand-50 text-brand-600"
              />
              <StatTile
                href="/teams"
                label="チーム"
                value={`${teams.length}チーム`}
                caption="他チームの発表を見る"
                icon={<TeamIcon />}
                iconColor="bg-violet-50 text-violet-500"
              />
              <StatTile
                href="/archive"
                label="アーカイブ"
                value={`${archivedYears.length}年度分`}
                caption="過去の卒業制作を検索・閲覧"
                icon={<ArchiveIcon />}
                iconColor="bg-slate-100 text-slate-500"
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
              icon={<AnnounceIcon />}
              iconColor="bg-brand-50 text-brand-600"
            />
            <StatTile
              href="/teams"
              label="チーム"
              value={`${teams.length}チーム`}
              caption="発表チームを見る"
              icon={<TeamIcon />}
              iconColor="bg-violet-50 text-violet-500"
            />
            <StatTile
              href="/archive"
              label="アーカイブ"
              value={`${archivedYears.length}年度分`}
              caption="過去の卒業制作を検索・閲覧"
              icon={<ArchiveIcon />}
              iconColor="bg-slate-100 text-slate-500"
            />
          </div>
        )}
      </section>
    </div>
  );
}
