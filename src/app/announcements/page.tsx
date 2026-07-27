import Link from "next/link";
import { getAnnouncementsByYear, getCurrentYear, getSubmissionsForAnnouncement } from "@/lib/mock";
import { PhaseBadge } from "@/components/ui/Badge";

export default function AnnouncementsPage() {
  const year = getCurrentYear();
  if (!year) return null;

  const announcements = getAnnouncementsByYear(year.id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium text-brand-600">{year.label}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">発表会一覧</h1>
      <p className="mt-2 text-sm text-slate-500">
        年度セットアップにより生成された4回の発表会(企画・設計・試作・最終)です。
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {announcements.map((a) => {
          const entries = getSubmissionsForAnnouncement(a.id);
          const submittedCount = entries.filter((e) => e.submission.materials.some((m) => m.status === "提出済み")).length;
          return (
            <Link
              key={a.id}
              href={`/announcements/${a.id}`}
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <PhaseBadge phase={a.phase} />
                  <span className="font-semibold text-slate-900">{a.title}</span>
                </div>
                <span className="text-xs text-slate-400">{a.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                <span>開催日：{a.period}</span>
                <span>提出締切：{a.submissionDeadline}</span>
                <span>提出 {submittedCount}/{entries.length} チーム</span>
                <span>{a.isPublished ? "資料公開中" : "資料非公開"}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
