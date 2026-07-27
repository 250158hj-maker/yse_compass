"use client";

import Link from "next/link";
import { useRole } from "@/context/RoleContext";
import {
  MOCK_PRESENTER_TEAM_ID,
  getAnnouncementsByYear,
  getCurrentYear,
  getSubmission,
  getTeamById,
  getTeamsByYear,
  getTimetable,
  isLateSubmission,
} from "@/lib/mock";
import { LateBadge, PhaseBadge, StatusBadge } from "@/components/ui/Badge";

export default function HomePage() {
  const { role } = useRole();
  const year = getCurrentYear();

  if (!year) {
    return <p className="mx-auto max-w-6xl px-6 py-16 text-slate-500">進行中の年度がありません。</p>;
  }

  const announcements = getAnnouncementsByYear(year.id);
  const teams = getTeamsByYear(year.id);

  const ongoing = announcements
    .map((a) => ({ announcement: a, timetable: getTimetable(a.id) }))
    .find((entry) => entry.timetable?.currentPresentingTeamId);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium text-brand-600">{year.label}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">ホーム</h1>

      {ongoing && (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-sm font-medium text-rose-700">
            いま発表中：{getTeamById(ongoing.timetable!.currentPresentingTeamId!)?.name}
            (「{ongoing.announcement.title}」)
          </p>
          <Link
            href={`/announcements/${ongoing.announcement.id}/timetable`}
            className="text-xs font-semibold text-rose-700 underline underline-offset-2"
          >
            タイムテーブルを見る
          </Link>
        </div>
      )}

      {role === "teacher" && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-500">当年度の発表会サマリ</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {announcements.map((a) => {
              const entries = teams.map((team) => getSubmission(a.id, team.id));
              const submittedCount = entries.filter((s) => s?.materials.some((m) => m.status === "提出済み")).length;
              return (
                <Link
                  key={a.id}
                  href={`/announcements/${a.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-300"
                >
                  <div className="flex items-center justify-between">
                    <PhaseBadge phase={a.phase} />
                    <span className="text-xs text-slate-400">{a.status}</span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">{a.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    提出 {submittedCount}/{teams.length} チーム・締切 {a.submissionDeadline}
                  </p>
                </Link>
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

      {role === "presenter" && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-500">
            自チームの提出状況(Cheers)
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {announcements.map((a) => {
              const submission = getSubmission(a.id, MOCK_PRESENTER_TEAM_ID);
              if (!submission) return null;
              return (
                <Link
                  key={a.id}
                  href={`/announcements/${a.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PhaseBadge phase={a.phase} />
                      <span className="font-semibold text-slate-900">{a.title}</span>
                    </div>
                    <span className="text-xs text-slate-400">締切 {a.submissionDeadline}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {submission.materials.map((m) => {
                      const late = isLateSubmission(m.updatedAt, a.submissionDeadline);
                      return (
                        <span key={m.id} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs">
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

      {role === "viewer" && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-500">聴講できる発表会</h2>
          <div className="mt-3 flex flex-col gap-3">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href={a.isPublished ? `/announcements/${a.id}` : "#"}
                aria-disabled={!a.isPublished}
                className={`flex items-center justify-between rounded-lg border p-5 ${
                  a.isPublished
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
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
