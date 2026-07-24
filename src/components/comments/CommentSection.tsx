"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { CURRENT_EVENT_ID } from "@/lib/constants";
import { getEvent, type Comment, type CommentLabel } from "@/lib/mock-data";

const labels: CommentLabel[] = ["感想", "批評", "その他"];
type NameMode = "実名" | "ニックネーム" | "匿名";

interface CommentGroup {
  eventId: string;
  eventLabel: string;
  deadline: string;
  comments: Comment[];
}

function groupByEvent(comments: Comment[]): CommentGroup[] {
  const groups = new Map<string, CommentGroup>();
  for (const comment of comments) {
    const event = getEvent(comment.eventId);
    const group = groups.get(comment.eventId) ?? {
      eventId: comment.eventId,
      eventLabel: event ? `${event.year}年度 ${event.phase}発表会` : "(不明な発表会)",
      deadline: event?.deadline ?? "",
      comments: [],
    };
    group.comments.push(comment);
    groups.set(comment.eventId, group);
  }
  return [...groups.values()].sort((a, b) => b.deadline.localeCompare(a.deadline));
}

export function CommentSection({
  teamId,
  teamName,
  viewerName = "あなた",
  initialComments,
}: {
  teamId: string;
  teamName: string;
  viewerName?: string;
  initialComments: Comment[];
}) {
  const [items, setItems] = useState(initialComments);
  const [filter, setFilter] = useState<CommentLabel | "すべて">("すべて");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [body, setBody] = useState("");
  const [label, setLabel] = useState<CommentLabel>("感想");
  const [nameMode, setNameMode] = useState<NameMode>("実名");
  const [nickname, setNickname] = useState("");

  const [mineCommentIds, setMineCommentIds] = useState<Set<string>>(new Set());
  const [mineReplyIds, setMineReplyIds] = useState<Set<string>>(new Set());

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState("");

  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editingReply, setEditingReply] = useState<{ commentId: string; replyId: string } | null>(null);
  const [editReplyBody, setEditReplyBody] = useState("");

  const visible = items.filter((c) => filter === "すべて" || c.label === filter);
  const groups = groupByEvent(visible);
  const currentEvent = getEvent(CURRENT_EVENT_ID);

  function toggleLike(id: string) {
    setLikedIds((prev) => {
      const next = new Set(prev);
      const delta = next.has(id) ? -1 : 1;
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setItems((cur) => cur.map((c) => (c.id === id ? { ...c, likes: c.likes + delta } : c)));
      return next;
    });
  }

  function resolveAuthorDisplay(): string {
    if (nameMode === "実名") return viewerName;
    if (nameMode === "ニックネーム") return nickname.trim() || "名無しの生徒";
    return "匿名の生徒";
  }

  function handleDeleteComment(commentId: string) {
    setItems((prev) => prev.filter((c) => c.id !== commentId));
  }

  function handleSaveCommentEdit(commentId: string) {
    if (!editCommentBody.trim()) return;
    setItems((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, body: editCommentBody.trim() } : c))
    );
    setEditingCommentId(null);
  }

  function handleSubmitReply(commentId: string) {
    if (!replyBody.trim()) return;
    const replyId = `rp-new-${Date.now()}`;
    setItems((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...c.replies,
                { id: replyId, authorDisplay: teamName, body: replyBody.trim(), createdAt: new Date().toISOString() },
              ],
            }
          : c
      )
    );
    setMineReplyIds((prev) => new Set(prev).add(replyId));
    setReplyBody("");
    setReplyingId(null);
  }

  function handleDeleteReply(commentId: string, replyId: string) {
    setItems((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) } : c
      )
    );
  }

  function handleSaveReplyEdit(commentId: string, replyId: string) {
    if (!editReplyBody.trim()) return;
    setItems((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: c.replies.map((r) => (r.id === replyId ? { ...r, body: editReplyBody.trim() } : r)),
            }
          : c
      )
    );
    setEditingReply(null);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 text-sm">
        {(["すべて", ...labels] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setFilter(l)}
            className={`rounded-full px-3 py-1 ring-1 ring-inset ${
              filter === l ? "bg-brand-blue text-white ring-brand-blue" : "bg-white text-gray-600 ring-gray-300"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex flex-wrap items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          if (nameMode === "ニックネーム" && !nickname.trim()) return;
          const id = `cm-new-${Date.now()}`;
          setItems((prev) => [
            {
              id,
              teamId,
              eventId: CURRENT_EVENT_ID,
              label,
              authorDisplay: resolveAuthorDisplay(),
              body,
              likes: 0,
              createdAt: new Date().toISOString(),
              replies: [],
            },
            ...prev,
          ]);
          setMineCommentIds((prev) => new Set(prev).add(id));
          setBody("");
        }}
      >
        <select
          value={label}
          onChange={(e) => setLabel(e.target.value as CommentLabel)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {labels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={nameMode}
          onChange={(e) => setNameMode(e.target.value as NameMode)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="実名">実名（{viewerName}）</option>
          <option value="ニックネーム">ニックネーム</option>
          <option value="匿名">匿名</option>
        </select>
        {nameMode === "ニックネーム" && (
          <input
            type="text"
            required
            placeholder="表示するニックネーム"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
        )}
        <input
          type="text"
          placeholder="コメントを入力"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-w-[16rem] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-cyan"
        >
          投稿する
        </button>
      </form>
      {currentEvent && (
        <p className="mt-1 text-xs text-gray-400">
          投稿は{currentEvent.year}年度 {currentEvent.phase}発表会のコメントとして記録されます。
        </p>
      )}

      <div className="mt-4 space-y-6">
        {groups.map((group) => (
          <div key={group.eventId}>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              {group.eventLabel}
              {group.deadline && <span className="text-xs font-normal text-gray-400">{group.deadline}</span>}
            </h3>
            <div className="mt-2 grid gap-3">
              {group.comments.map((comment) => (
                <Card key={comment.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{comment.authorDisplay}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 ring-1 ring-inset ring-gray-300">
                      {comment.label}
                    </span>
                  </div>

                  {editingCommentId === comment.id ? (
                    <form
                      className="mt-2 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveCommentEdit(comment.id);
                      }}
                    >
                      <input
                        autoFocus
                        value={editCommentBody}
                        onChange={(e) => setEditCommentBody(e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none"
                      />
                      <button type="submit" className="text-sm font-semibold text-brand-blue hover:underline">
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCommentId(null)}
                        className="text-sm text-gray-500 hover:underline"
                      >
                        キャンセル
                      </button>
                    </form>
                  ) : (
                    <p className="mt-2 text-sm text-gray-700">{comment.body}</p>
                  )}

                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleLike(comment.id)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                        likedIds.has(comment.id) ? "bg-pink-50 text-pink-600" : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      いいね {comment.likes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyingId((cur) => (cur === comment.id ? null : comment.id))}
                      className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      返信する
                    </button>
                    {mineCommentIds.has(comment.id) && editingCommentId !== comment.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditCommentBody(comment.body);
                          }}
                          className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                        >
                          削除
                        </button>
                      </>
                    )}
                  </div>

                  {comment.replies.length > 0 && (
                    <ul className="mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
                      {comment.replies.map((reply) =>
                        editingReply?.commentId === comment.id && editingReply.replyId === reply.id ? (
                          <li key={reply.id} className="flex gap-2">
                            <input
                              autoFocus
                              value={editReplyBody}
                              onChange={(e) => setEditReplyBody(e.target.value)}
                              className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveReplyEdit(comment.id, reply.id)}
                              className="text-xs font-semibold text-brand-blue hover:underline"
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingReply(null)}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              キャンセル
                            </button>
                          </li>
                        ) : (
                          <li key={reply.id} className="text-sm text-gray-600">
                            <span className="font-medium text-gray-800">{reply.authorDisplay}: </span>
                            {reply.body}
                            {mineReplyIds.has(reply.id) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReply({ commentId: comment.id, replyId: reply.id });
                                    setEditReplyBody(reply.body);
                                  }}
                                  className="ml-2 text-xs text-gray-400 hover:text-gray-700"
                                >
                                  編集
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReply(comment.id, reply.id)}
                                  className="ml-1 text-xs text-red-400 hover:text-red-600"
                                >
                                  削除
                                </button>
                              </>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                  )}

                  {replyingId === comment.id && (
                    <form
                      className="mt-2 flex gap-2 border-l-2 border-gray-200 pl-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmitReply(comment.id);
                      }}
                    >
                      <input
                        autoFocus
                        type="text"
                        placeholder={`${teamName}として返信を入力`}
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold text-white hover:bg-brand-cyan"
                      >
                        送信
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingId(null);
                          setReplyBody("");
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        キャンセル
                      </button>
                    </form>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="text-sm text-gray-400">該当するコメントはありません。</p>}
      </div>
    </div>
  );
}
