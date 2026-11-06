"use client";

import { useRef, useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge, CommentLabelBadge, PhaseBadge } from "@/components/ui/Badge";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LikeButton } from "@/components/ui/LikeButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClassName } from "@/components/ui/FormField";
import { useSession } from "@/context/SessionContext";
import { isOwnTeam, isTeacher } from "@/lib/session-helpers";
import { formatDateTime } from "@/lib/format";
import { formatSubmittedAt, materialHref } from "@/lib/mock";
import { MaterialLink } from "@/components/ui/MaterialLink";
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
  // 概要の資料枠はすぐ下の「概要」に同じ内容が出るので、資料の行には出さない。
  const presentationMaterials = submission.materials.filter((m) => m.name !== "概要");
  const [filter, setFilter] = useState<"すべて" | CommentLabel>("すべて");
  const [newBody, setNewBody] = useState("");
  const [newLabel, setNewLabel] = useState<CommentLabel>("感想");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  // コメントの「…」メニュー(T-2)。メニューの開閉・編集中のコメント・削除の確認の対象を、それぞれ 1 件ずつ持つ。
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // レンダー中扱いになる Date.now() を避け、返信の id は連番で振る(React Compiler の純粋性)。
  const replySeq = useRef(0);

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
      id: `rep-local-${(replySeq.current += 1)}`,
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

  function updateComment(commentId: string, patch: Partial<Comment>) {
    setSubmission((prev) => ({
      ...prev,
      comments: prev.comments.map((c) => (c.id === commentId ? { ...c, ...patch } : c)),
    }));
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditDraft(comment.body);
    setMenuOpenId(null);
  }

  // 編集は本文だけを直し、「編集済み」を付ける。編集の履歴は持たない(T-2 の決定が決めない点)。
  function saveEdit(commentId: string) {
    const body = editDraft.trim();
    if (!body) return;
    updateComment(commentId, { body, editedAt: new Date().toISOString() });
    setEditingId(null);
  }

  // 削除は行を消さず、削除の印を付ける。返信は残る(T-2 の決定③)。
  function confirmDelete() {
    if (deleteTargetId) updateComment(deleteTargetId, { isDeleted: true });
    setDeleteTargetId(null);
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

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-700">{team.summary}</p>

      {!canView ? (
        <div className="mt-6">
          <InlineNotice tone="info">資料は先生の公開操作後に閲覧できます。</InlineNotice>
        </div>
      ) : (
        <>
          <section className="mt-6">
            <SectionHeading>資料</SectionHeading>
            {presentationMaterials.length === 0 ? (
              <EmptyState message="まだ資料が提出されていません。" />
            ) : (
              <div className="flex flex-col gap-2">
                {presentationMaterials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{m.name}</span>
                      {formatSubmittedAt(a.submissionDeadline, m) && (
                        <span className="text-xs text-slate-400">
                          初回提出 {formatSubmittedAt(a.submissionDeadline, m)}
                        </span>
                      )}
                    </div>
                    {materialHref(a.id, team.id, m) ? (
                      <MaterialLink href={materialHref(a.id, team.id, m)!} className="text-sm text-brand-600 hover:underline">
                        資料を開く →
                      </MaterialLink>
                    ) : (
                      <Badge tone="slate">未提出</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {submission.summary && (
            <section id="summary" className="mt-8 scroll-mt-4">
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

            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
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
                {visibleComments.map((comment) => {
                  // 「…」メニュー: 自分のコメントは編集・削除、先生は他の人のコメントの削除(T-2・04 SC-12)。
                  // 「自分のコメント」は、モックでは名前の一致で見分ける(本実装では、データ層が返す)。削除済みには出さない。
                  const ownComment = !!currentUser && comment.authorName === currentUser.name;
                  const canEdit = ownComment;
                  const canDelete = ownComment || teacher;
                  const showMenu = !comment.isDeleted && (canEdit || canDelete) && editingId !== comment.id;
                  return (
                  <Card key={comment.id} className="shadow-sm shadow-slate-900/5">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700"
                        aria-hidden
                      >
                        {comment.authorName.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{comment.authorName}</span>
                            <CommentLabelBadge label={comment.label} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {formatDateTime(comment.postedAt)}
                              {comment.editedAt && !comment.isDeleted && "(編集済み)"}
                            </span>
                            {showMenu && (
                              <div className="relative">
                                <button
                                  type="button"
                                  aria-label="コメントのメニュー"
                                  aria-expanded={menuOpenId === comment.id}
                                  onClick={() => setMenuOpenId((v) => (v === comment.id ? null : comment.id))}
                                  className="rounded px-1.5 text-base leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                  …
                                </button>
                                {menuOpenId === comment.id && (
                                  <div className="absolute right-0 z-10 mt-1 w-24 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-md shadow-slate-900/10">
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => startEdit(comment)}
                                        className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                                      >
                                        編集
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMenuOpenId(null);
                                          setDeleteTargetId(comment.id);
                                        }}
                                        className="block w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50"
                                      >
                                        削除
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {editingId === comment.id ? (
                          <div className="mt-2">
                            <textarea
                              className={fieldClassName}
                              rows={2}
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <Button variant="secondary" onClick={() => setEditingId(null)}>
                                キャンセル
                              </Button>
                              <Button variant="primary" onClick={() => saveEdit(comment.id)} disabled={!editDraft.trim()}>
                                保存
                              </Button>
                            </div>
                          </div>
                        ) : comment.isDeleted ? (
                          <p className="mt-2 text-sm italic text-slate-400">このコメントは削除されました</p>
                        ) : (
                          <p className="mt-2 text-sm leading-relaxed text-slate-700">{comment.body}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 pl-11">
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
                      <div className="ml-11 mt-3 flex flex-col gap-2 border-l-2 border-slate-100 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id}>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-slate-900">{reply.authorName}</span>
                              {reply.authorRole === "teacher" && <Badge tone="brand">先生</Badge>}
                              <span className="text-xs text-slate-400">{formatDateTime(reply.postedAt)}</span>
                            </div>
                            <p className="text-sm text-slate-700">{reply.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {canReply && openReplyId === comment.id && (
                      <div className="ml-11 mt-3 flex gap-2">
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
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="コメントを削除します"
        description="削除すると、このコメントは「このコメントは削除されました」と表示されます。返信は残ります。"
        confirmLabel="削除する"
        confirmVariant="danger"
      />
    </div>
  );
}
