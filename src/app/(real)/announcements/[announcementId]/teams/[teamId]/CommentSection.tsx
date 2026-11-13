"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { deleteCommentAction, editCommentAction, postCommentAction, type CommentActionResult } from "@/lib/actions/comments";
import { commentErrorMessage } from "@/lib/comment-messages";
import type { listPresentationComments } from "@/lib/data/comments";
import { formatDateTime } from "@/lib/format";
import { CommentLikeButton } from "./LikeButtons";

type Data = Awaited<ReturnType<typeof listPresentationComments>>;
type CommentItem = Data["comments"][number];
type ReplyItem = CommentItem["replies"][number];

// 見た目は置き換え前のモックのコメント欄のまま（ラベルは付けない：decisions.md 2026-11-05。返信の「先生」の印は、データ層が返信者のロールを返さないので出さない）。
// 誰に何を出すかは、データ層が返す canPost・canReply・canEdit・canDelete・canLike に従う。画面で権限の判定をしない。
// 保存は Server Action。成功したらサーバー側の表示を読み込み直す。
export function CommentSection({ teamId, occasionId, data }: { teamId: number; occasionId: number; data: Data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newBody, setNewBody] = useState("");
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  function run(action: () => Promise<CommentActionResult<unknown>>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(commentErrorMessage(result.code));
        return;
      }
      setError(null);
      onSuccess?.();
      router.refresh();
    });
  }

  function post() {
    run(
      () => postCommentAction(teamId, occasionId, newBody),
      () => setNewBody(""),
    );
  }
  function reply(parentId: number) {
    run(
      () => postCommentAction(teamId, occasionId, replyDraft, parentId),
      () => {
        setReplyDraft("");
        setReplyingId(null);
      },
    );
  }
  function saveEdit(commentId: number) {
    run(
      () => editCommentAction(commentId, editDraft),
      () => setEditingId(null),
    );
  }

  function renderBody(item: CommentItem | ReplyItem) {
    const showMenu = !item.isDeleted && (item.canEdit || item.canDelete) && editingId !== item.id;
    return (
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700"
          aria-hidden
        >
          {item.authorName ? item.authorName.charAt(0) : "・"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="font-medium text-slate-900">{item.authorName ?? ""}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {formatDateTime(item.createdAt.toISOString())}
                {item.editedAt && !item.isDeleted && "(編集済み)"}
              </span>
              {showMenu && (
                <div className="relative">
                  <button
                    type="button"
                    aria-label="コメントのメニュー"
                    aria-expanded={menuOpenId === item.id}
                    onClick={() => setMenuOpenId((v) => (v === item.id ? null : item.id))}
                    className="rounded px-1.5 text-base leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    …
                  </button>
                  {menuOpenId === item.id && (
                    <div className="absolute right-0 z-10 mt-1 w-24 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-md shadow-slate-900/10">
                      {item.canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenId(null);
                            setEditingId(item.id);
                            setEditDraft(item.body ?? "");
                          }}
                          className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                        >
                          編集
                        </button>
                      )}
                      {item.canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenId(null);
                            setDeleteTarget(item.id);
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
          {editingId === item.id ? (
            <div className="mt-2">
              <label htmlFor={`edit-${item.id}`} className="sr-only">
                コメントを編集
              </label>
              <textarea id={`edit-${item.id}`} className={fieldClassName} rows={2} value={editDraft} onChange={(e) => setEditDraft(e.target.value)} />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditingId(null)}>
                  キャンセル
                </Button>
                <Button variant="primary" onClick={() => saveEdit(item.id)} disabled={!editDraft.trim() || pending}>
                  保存
                </Button>
              </div>
            </div>
          ) : item.isDeleted ? (
            <p className="mt-2 text-sm italic text-slate-400">このコメントは削除されました</p>
          ) : (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{item.body}</p>
          )}
        </div>
      </div>
    );
  }

  const total = data.comments.length;

  return (
    <section className="mt-8">
      <SectionHeading>コメント({total})</SectionHeading>

      {error && (
        <div className="mb-3">
          <InlineNotice tone="danger">{error}</InlineNotice>
        </div>
      )}

      {data.canPost ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
          <label htmlFor="new-comment" className="sr-only">
            コメントを入力
          </label>
          <textarea
            id="new-comment"
            className={fieldClassName}
            rows={2}
            placeholder="コメントを入力(実名で表示されます)"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="primary" onClick={post} disabled={!newBody.trim() || pending}>
              投稿する
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <InlineNotice tone="info">アーカイブ済みの年度のため、コメントは書き込めません。</InlineNotice>
        </div>
      )}

      {total === 0 ? (
        <EmptyState message="まだコメントがありません。" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.comments.map((comment) => (
            <Card key={comment.id} className="shadow-sm shadow-slate-900/5">
              {renderBody(comment)}
              <div className="mt-3 flex flex-wrap items-center gap-3 pl-11">
                {!comment.isDeleted && <CommentLikeButton commentId={comment.id} liked={comment.likedByMe} count={comment.likeCount} canLike={comment.canLike} />}
                {comment.canReply && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingId((v) => (v === comment.id ? null : comment.id));
                      setReplyDraft("");
                    }}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    返信する
                  </button>
                )}
              </div>

              {comment.replies.length > 0 && (
                <div className="ml-11 mt-3 flex flex-col gap-3 border-l-2 border-slate-100 pl-4">
                  {comment.replies.map((r) => (
                    <div key={r.id}>
                      {renderBody(r)}
                      <div className="mt-2 pl-11">
                        {!r.isDeleted && <CommentLikeButton commentId={r.id} liked={r.likedByMe} count={r.likeCount} canLike={r.canLike} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {comment.canReply && replyingId === comment.id && (
                <div className="ml-11 mt-3 flex gap-2">
                  <label htmlFor={`reply-${comment.id}`} className="sr-only">
                    返信を入力
                  </label>
                  <input id={`reply-${comment.id}`} className={fieldClassName} placeholder="返信を入力" value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} />
                  <Button variant="primary" onClick={() => reply(comment.id)} disabled={!replyDraft.trim() || pending}>
                    送信
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const id = deleteTarget;
          if (id === null) return;
          run(() => deleteCommentAction(id));
        }}
        title="コメントを削除します"
        description="削除すると、このコメントは「このコメントは削除されました」と表示されます。返信は残ります。"
        confirmLabel="削除する"
        confirmVariant="danger"
      />
    </section>
  );
}
