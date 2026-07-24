import Link from "next/link";
import { notFound } from "next/navigation";
import {
  announcements,
  getAnnouncementById,
  getSubmissionsForAnnouncement,
  phaseStyle,
  type SubmissionStatus,
} from "@/lib/mock-data";

const statusStyle: Record<SubmissionStatus, string> = {
  未提出: "bg-slate-100 text-slate-500",
  提出済み: "bg-emerald-100 text-emerald-700",
  差し戻し: "bg-rose-100 text-rose-600",
};

export default async function AnnouncementTeamsPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);

  if (!announcement) {
    notFound();
  }

  const entries = getSubmissionsForAnnouncement(announcementId);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/announcements" className="text-sm text-slate-400 hover:text-sky-600">
        ← 発表会一覧に戻る
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${phaseStyle[announcement.phase]}`}>
          {announcement.phase}
        </span>
        <h1 className="text-2xl font-bold text-slate-900">{announcement.title}</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        開催日 {announcement.period} ・ 提出締切 {announcement.submissionDeadline}
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-px text-sm font-medium">
        {announcements.map((a) => (
          <Link
            key={a.id}
            href={`/announcements/${a.id}`}
            className={`whitespace-nowrap border-b-2 px-3 py-2 ${
              a.id === announcement.id
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {a.phase}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-slate-400">{entries.length} チーム</p>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ team, submission }) => (
          <Link
            key={team.id}
            href={`/announcements/${announcement.id}/teams/${team.id}`}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{team.className}</span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyle[submission.submissionStatus]}`}
              >
                {submission.submissionStatus}
              </span>
            </div>

            <h2 className="mt-3 text-base font-bold text-slate-900">{team.projectTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{team.name}</p>

            <p className="mt-3 line-clamp-2 text-sm text-slate-500">{team.summary}</p>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>メンバー {team.members.length}名</span>
              <span>♡ {submission.likeCount}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
