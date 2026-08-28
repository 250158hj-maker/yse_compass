"use client";

import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import { isTeacher, isOwnTeam } from "@/lib/session-helpers";
import {
  getAnnouncementsByYear,
  getCurrentYear,
  getSubmission,
  getTeamById,
  getTeamsByYear,
  getTimetableFor,
  isLateSubmission,
} from "@/lib/mock";
import { Badge, LateBadge, PhaseBadge, StatusBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";

export default function HomePage() {
  const { currentUser } = useSession();
  const year = getCurrentYear();

  if (!currentUser || !year) {
    return <EmptyState message="進行中の年度がありません。" />;
  }

  const announcements = getAnnouncementsByYear(year.id);
  const teams = getTeamsByYear(year.id);
  const ownTeam = teams.find((t) => isOwnTeam(currentUser, t.id)) ?? null;

  const presenting = announcements
    .map((a) => ({ announcement: a, timetable: getTimetableFor(a.id) }))
    .find((entry) => entry.timetable?.currentPresentingTeamId);

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

      {isTeacher(currentUser) && (
        <section className="mt-8">
          <SectionHeading>当年度の発表会サマリ</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {announcements.map((a) => {
              const submittedCount = teams.filter((team) => {
                const submission = getSubmission(a.id, team.id);
                const required = a.materialSlots.filter((s) => s.required);
                return (
                  submission &&
                  required.every(
                    (slot) => submission.materials.find((m) => m.name === slot.name)?.status === "提出済み"
                  )
                );
              }).length;

              return (
                <CardLink key={a.id} href={`/announcements/${a.id}`}>
                  <div className="flex items-center justify-between">
                    <PhaseBadge phase={a.phase} />
                    <Badge tone={a.isPublished ? "emerald" : "slate"}>
                      {a.isPublished ? "公開中" : "非公開"}
                    </Badge>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">{a.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    提出 {submittedCount}/{teams.length} チーム・締切 {formatDateTime(a.submissionDeadline)}
                  </p>
                </CardLink>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/admin/years" className="text-brand-600 hover:underline">
              年度管理へ
            </Link>
            <Link href="/admin/publish-permissions" className="text-brand-600 hover:underline">
              公開許可管理へ
            </Link>
            <Link href="/admin/users" className="text-brand-600 hover:underline">
              ユーザー管理へ
            </Link>
          </div>
        </section>
      )}

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
        <SectionHeading>{isTeacher(currentUser) ? "発表会一覧" : "聴講できる発表会"}</SectionHeading>
        <div className="flex flex-col gap-3">
          {announcements.map((a) => {
            const viewable = a.isPublished || isTeacher(currentUser);
            return (
              <Link
                key={a.id}
                href={viewable ? `/announcements/${a.id}` : "#"}
                aria-disabled={!viewable}
                className={`flex items-center justify-between rounded-lg border p-5 ${
                  viewable
                    ? "border-slate-200 bg-white hover:border-brand-300"
                    : "pointer-events-none border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <PhaseBadge phase={a.phase} />
                  <span className="font-semibold">{a.title}</span>
                </div>
                <span className="text-xs">{a.isPublished ? "公開中" : "非公開"}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
