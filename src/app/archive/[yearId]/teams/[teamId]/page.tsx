import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge, CommentLabelBadge, PhaseBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { getAnnouncementsByYear, getSubmission, getTeamById, getYearById } from "@/lib/mock";

export default async function ArchiveWorkDetailPage({
  params,
}: {
  params: Promise<{ yearId: string; teamId: string }>;
}) {
  const { yearId, teamId } = await params;
  const year = getYearById(yearId);
  const team = getTeamById(teamId);
  // 公開許可のない作品はアーカイブに表示しない(既定は非表示・要件定義書 §3-7)。
  // URL直打ちでも同じ制御を効かせるため、一覧側の絞り込みに加えてここでも判定する。
  if (!year || !team || team.yearId !== yearId || team.publishPermission !== "許可") {
    notFound();
  }

  const announcements = getAnnouncementsByYear(yearId);
  const rounds = announcements.map((a) => ({ announcement: a, submission: getSubmission(a.id, teamId) }));
  const finalSummary = rounds.find((r) => r.announcement.phase === "最終")?.submission?.summary ?? null;
  const roundsWithComments = rounds.filter((r) => (r.submission?.comments.length ?? 0) > 0);

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "アーカイブ", href: "/archive" },
          { label: `${year.label}卒業制作`, href: `/archive/${yearId}` },
          { label: team.projectTitle },
        ]}
      />
      <PageHeader
        eyebrow={`${year.label}卒業制作`}
        title={team.projectTitle}
        meta={
          <>
            <Badge tone="slate">{team.className}</Badge>
            <span>{team.name}チーム</span>
            <span>メンバー: {team.members.join("・")}</span>
          </>
        }
      />

      {finalSummary && (
        <section className="mt-6">
          <SectionHeading>概要</SectionHeading>
          <Card>
            <p className="text-sm leading-relaxed text-slate-700">{finalSummary.onePageBody}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {finalSummary.techUsed.map((tech) => (
                <Badge key={tech} tone="brand">
                  {tech}
                </Badge>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section className="mt-8">
        <SectionHeading>発表資料(4回分)</SectionHeading>
        <div className="flex flex-col gap-3">
          {rounds.map(({ announcement: a, submission }) => (
            <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <PhaseBadge phase={a.phase} />
                <span className="text-sm font-medium text-slate-900">{a.title}</span>
              </div>
              {!submission || submission.materials.length === 0 ? (
                <p className="text-xs text-slate-400">資料の提出はありませんでした。</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {submission.materials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{m.name}</span>
                      {m.driveUrl ? (
                        <a
                          href={m.driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline"
                        >
                          資料を開く →
                        </a>
                      ) : (
                        <Badge tone="slate">未提出</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading>当時のコメント</SectionHeading>
        {roundsWithComments.length === 0 ? (
          <EmptyState message="コメントは投稿されませんでした。" />
        ) : (
          <div className="flex flex-col gap-4">
            {roundsWithComments.map(({ announcement: a, submission }) => (
              <div key={a.id}>
                <div className="mb-2 flex items-center gap-2">
                  <PhaseBadge phase={a.phase} />
                  <span className="text-xs text-slate-400">{a.title}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {submission!.comments.map((comment) => (
                    <Card key={comment.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{comment.authorName}</span>
                          <CommentLabelBadge label={comment.label} />
                        </div>
                        <span className="text-xs text-slate-400">{formatDateTime(comment.postedAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{comment.body}</p>
                      {comment.replies.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2 border-l-2 border-slate-100 pl-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id}>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-slate-900">{reply.authorName}</span>
                                <span className="text-xs text-slate-400">{formatDateTime(reply.postedAt)}</span>
                              </div>
                              <p className="text-sm text-slate-700">{reply.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
