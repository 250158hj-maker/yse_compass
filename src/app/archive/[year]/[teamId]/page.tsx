import { notFound } from "next/navigation";
import { getAnnouncementsByYear, getSubmission, getTeamById, getYearById } from "@/lib/mock";
import { CommentLabelBadge, PhaseBadge } from "@/components/ui/Badge";

export default async function ArchivedWorkDetailPage({
  params,
}: {
  params: Promise<{ year: string; teamId: string }>;
}) {
  const { year: yearId, teamId } = await params;
  const year = getYearById(yearId);
  const team = getTeamById(teamId);
  if (!year || year.status !== "アーカイブ済み" || !team || team.yearId !== year.id || team.publishPermission !== "許可") {
    notFound();
  }

  const announcements = getAnnouncementsByYear(year.id);
  const timeline = announcements.map((a) => ({ announcement: a, submission: getSubmission(a.id, team.id) }));
  const latestSummary = [...timeline].reverse().find((t) => t.submission?.summary)?.submission?.summary ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium text-brand-600">{year.label}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{team.projectTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {team.name} ／ メンバー：{team.members.join("、")}
      </p>

      {latestSummary && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold text-slate-400">概要</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{latestSummary.onePageBody}</p>
          <p className="mt-3 text-xs text-slate-400">使用技術：{latestSummary.techUsed.join(" / ")}</p>
        </section>
      )}

      <section className="mt-8 flex flex-col gap-6">
        {timeline.map(({ announcement, submission }) => (
          <div key={announcement.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <PhaseBadge phase={announcement.phase} />
              <p className="font-semibold text-slate-900">{announcement.title}</p>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              {submission?.materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{m.name}</span>
                  {m.driveUrl ? (
                    <a href={m.driveUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      別タブで開く
                    </a>
                  ) : (
                    <span className="text-xs text-slate-300">未提出</span>
                  )}
                </div>
              ))}
            </div>

            {submission && submission.comments.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-400">当時のコメント</p>
                <div className="mt-2 flex flex-col gap-2">
                  {submission.comments.map((c) => (
                    <div key={c.id} className="text-sm">
                      <span className="font-medium text-slate-800">{c.authorName}</span>
                      <span className="ml-2 inline-block align-middle">
                        <CommentLabelBadge label={c.label} />
                      </span>
                      <p className="text-slate-600">{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      <p className="mt-6 text-xs text-slate-400">
        ※ アーカイブ済み作品への新規コメント投稿は現時点で未対応です(投稿範囲は今後の検討事項)。
      </p>
    </div>
  );
}
