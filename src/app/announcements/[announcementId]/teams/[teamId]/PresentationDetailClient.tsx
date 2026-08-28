"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge, CommentLabelBadge, PhaseBadge } from "@/components/ui/Badge";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Button } from "@/components/ui/Button";
import { LikeButton } from "@/components/ui/LikeButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClassName } from "@/components/ui/FormField";
import { useSession } from "@/context/SessionContext";
import { isOwnTeam, isTeacher } from "@/lib/session-helpers";
import { formatDateTime } from "@/lib/format";
import type { Announcement, Comment, CommentLabel, Reply, Submission, Team } from "@/lib/types";

const labelOptions: CommentLabel[] = ["感想", "批評", "その他"];

export function PresentationDetailClient({
  announcement: a,
  team,
  initialSubmission,
}: {
  announcement: Announcement;
  team: Team;
  initialSubmission: Submission;
}) {
  const { currentUser } = useSession();
  const [submission, setSubmission] = useState(initialSubmission);
  const [filter, setFilter] = useState<"すべて" | CommentLabel>("すべて");
  const [newBody, setNewBody] = useState("");
  const [newLabel, setNewLabel] = useState<CommentLabel>("感想");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);

  const teacher = isTeacher(currentUser);
  const ownTeam = isOwnTeam(currentUser, team.id);
  const canView = a.isPublished || teacher || ownTeam;
  const canReply = teacher || ownTeam;

  const visibleComments =
    filter === "すべて" ? submission.comments : submission.comments.filter((c) => c.label === filter);

  function postComment() {
    if (!currentUser || !newBody.trim()) return;
    const comment: Comment = {
      id: `cmt-local-${Date.now()}`,
      authorName: currentUser.name,
      label: newLabel,
      body: newBody.trim(),
      likeCount: 0,
      postedAt: new Date().toISOString(),
      replies: [],
    };
    setSubmission((prev) => ({ ...prev, comments: [comment, ...prev.comments] }));
    setNewBody("");
  }

  function postReply(commentId: string) {
    if (!currentUser) return;
    const body = replyDrafts[commentId]?.trim();
    if (!body) return;
    const reply: Reply = {
      id: `rep-local-${Date.now()}`,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      body,
      postedAt: new Date().toISOString(),
    };
    setSubmission((prev) => ({
      ...prev,
      comments: prev.comments.map((c) => (c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c)),
    }));
    setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
    setOpenReplyId(null);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "発表会一覧", href: "/announcements" },
          { label: a.title, href: `/announcements/${a.id}` },
          { label: team.name },
        ]}
      />
      <PageHeader
        eyebrow={a.title}
        title={`${team.name}(${team.projectTitle})`}
        meta={
          <>
            <PhaseBadge phase={a.phase} />
            <Badge tone="slate">{team.className}</Badge>
            <span>リーダー: {team.leaderName}</span>
          </>
        }
        actions={<LikeButton initialCount={submission.likeCount} />}
      />

      {!canView ? (
        <div className="mt-6">
          <InlineNotice tone="info">資料は先生の公開操作後に閲覧できます。</InlineNotice>
        </div>
      ) : (
        <>
          <section className="mt-6">
            <SectionHeading>資料</SectionHeading>
            {submission.materials.length === 0 ? (
              <EmptyState message="まだ資料が提出されていません。" />
            ) : (
              <div className="flex flex-col gap-2">
                {submission.materials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <span className="font-medium text-slate-900">{m.name}</span>
                    {m.driveUrl ? (
                      <a
                        href={m.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-600 hover:underline"
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
          </section>

          {submission.summary && (
            <section className="mt-8">
              <SectionHeading>概要</SectionHeading>
              <Card>
                <p className="text-sm leading-relaxed text-slate-700">{submission.summary.onePageBody}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {submission.summary.techUsed.map((tech) => (
                    <Badge key={tech} tone="brand">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </Card>
            </section>
          )}

          <section className="mt-8">
            <SectionHeading
              action={
                <div className="flex gap-1">
                  {(["すべて", ...labelOptions] as const).map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setFilter(label)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                        filter === label
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              コメント({submission.comments.length})
            </SectionHeading>

            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 flex gap-1">
                {labelOptions.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setNewLabel(label)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                      newLabel === label
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                className={fieldClassName}
                rows={2}
                placeholder="コメントを入力(実名で表示されます)"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <Button variant="primary" onClick={postComment} disabled={!newBody.trim()}>
                  投稿する
                </Button>
              </div>
            </div>

            {visibleComments.length === 0 ? (
              <EmptyState message="まだコメントがありません。" />
            ) : (
              <div className="flex flex-col gap-3">
                {visibleComments.map((comment) => (
                  <Card key={comment.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{comment.authorName}</span>
                        <CommentLabelBadge label={comment.label} />
                      </div>
                      <span className="text-xs text-slate-400">{formatDateTime(comment.postedAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{comment.body}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <LikeButton initialCount={comment.likeCount} size="sm" />
                      {canReply && (
                        <button
                          type="button"
                          onClick={() => setOpenReplyId((v) => (v === comment.id ? null : comment.id))}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          返信する
                        </button>
                      )}
                    </div>

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

                    {canReply && openReplyId === comment.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          className={fieldClassName}
                          placeholder="返信を入力"
                          value={replyDrafts[comment.id] ?? ""}
                          onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                        />
                        <Button variant="primary" onClick={() => postReply(comment.id)}>
                          送信
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>

          {ownTeam && (
            <div className="mt-8 flex flex-wrap gap-2">
              <Link href={`/announcements/${a.id}/teams/${team.id}/submit`}>
                <Button variant="primary">資料を提出する</Button>
              </Link>
              <Link href={`/announcements/${a.id}/teams/${team.id}/summary`}>
                <Button variant="secondary">概要を入力する</Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
