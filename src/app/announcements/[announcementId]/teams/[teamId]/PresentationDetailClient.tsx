"use client";

import { useState } from "react";
import { useRole } from "@/context/RoleContext";
import { RoleRestrictedNotice } from "@/components/ui/RoleGate";
import { CommentLabelBadge } from "@/components/ui/Badge";
import { MOCK_PRESENTER_TEAM_ID } from "@/lib/mock";
import { formatDateTimeNow } from "@/lib/format";
import type { Announcement, Comment, CommentLabel, Role, Submission, Team } from "@/lib/types";

const AUTHOR_NAME: Record<Role, string> = {
  teacher: "冨永先生",
  presenter: "水戸匠",
  viewer: "佐々木蒼",
};

const labelOptions: CommentLabel[] = ["感想", "批評", "その他"];

export default function PresentationDetailClient({
  announcement,
  team,
  submission,
}: {
  announcement: Announcement;
  team: Team;
  submission: Submission;
}) {
  const { role } = useRole();
  const isOwnTeam = team.id === MOCK_PRESENTER_TEAM_ID;
  const canView = announcement.isPublished || role === "teacher" || (role === "presenter" && isOwnTeam);

  const [likeCount, setLikeCount] = useState(submission.likeCount);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>(submission.comments);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [labelFilter, setLabelFilter] = useState<CommentLabel | "全て">("全て");
  const [newLabel, setNewLabel] = useState<CommentLabel>("感想");
  const [newBody, setNewBody] = useState("");
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  if (!canView) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <RoleRestrictedNotice message="この発表はまだ公開されていません。先生が資料を公開すると聴く生徒にも表示されます。" />
      </div>
    );
  }

  function handlePostComment() {
    if (!newBody.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        authorName: AUTHOR_NAME[role],
        label: newLabel,
        body: newBody.trim(),
        likeCount: 0,
        postedAt: formatDateTimeNow(),
        replies: [],
      },
    ]);
    setNewBody("");
  }

  function handleReply(commentId: string) {
    if (!replyBody.trim()) return;
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...c.replies,
                { id: `r-${Date.now()}`, authorName: AUTHOR_NAME[role], authorRole: role, body: replyBody.trim(), postedAt: formatDateTimeNow() },
              ],
            }
          : c,
      ),
    );
    setReplyBody("");
    setReplyOpenId(null);
  }

  function toggleCommentLike(commentId: string) {
    const alreadyLiked = likedCommentIds.has(commentId);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likeCount: c.likeCount + (alreadyLiked ? -1 : 1) } : c)),
    );
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (alreadyLiked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  const filteredComments = labelFilter === "全て" ? comments : comments.filter((c) => c.label === labelFilter);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium text-brand-600">{announcement.title}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{team.projectTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {team.name}({team.className}) ／ メンバー：{team.members.join("、")}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setLikeCount((v) => v + (liked ? -1 : 1));
            setLiked((v) => !v);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            liked ? "bg-rose-600 text-white" : "border border-rose-300 text-rose-600 hover:bg-rose-50"
          }`}
        >
          いいね {likeCount}
        </button>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-500">提出資料</h2>
        <div className="mt-3 flex flex-col gap-2">
          {submission.materials.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
              <span>{m.name}</span>
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
      </section>

      {submission.summary && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-500">概要</h2>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
            <p>{submission.summary.onePageBody}</p>
            <p className="mt-3 text-xs text-slate-400">使用技術：{submission.summary.techUsed.join(" / ")}</p>
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">コメント({comments.length})</h2>
          <div className="flex gap-2 text-xs">
            {(["全て", ...labelOptions] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLabelFilter(l)}
                className={`rounded-lg px-3 py-1 ${
                  labelFilter === l ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-500"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {filteredComments.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{c.authorName}</span>
                  <CommentLabelBadge label={c.label} />
                </div>
                <span className="text-xs text-slate-400">{c.postedAt}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{c.body}</p>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => toggleCommentLike(c.id)}
                  className={likedCommentIds.has(c.id) ? "font-semibold text-rose-600" : "text-slate-400 hover:text-rose-600"}
                >
                  いいね {c.likeCount}
                </button>
                <button
                  type="button"
                  onClick={() => setReplyOpenId(replyOpenId === c.id ? null : c.id)}
                  className="text-slate-400 hover:text-brand-600"
                >
                  返信する
                </button>
              </div>

              {c.replies.length > 0 && (
                <div className="mt-3 flex flex-col gap-2 border-l-2 border-slate-100 pl-4">
                  {c.replies.map((r) => (
                    <div key={r.id} className="text-sm">
                      <span className="font-semibold text-slate-800">{r.authorName}</span>
                      <span className="ml-2 text-xs text-slate-400">{r.postedAt}</span>
                      <p className="text-slate-600">{r.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {replyOpenId === c.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="返信を入力"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleReply(c.id)}
                    className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    送信
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">投稿者名：{AUTHOR_NAME[role]}(実名表示・匿名不可)</p>
          <div className="mt-2 flex gap-2">
            {labelOptions.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setNewLabel(l)}
                className={`rounded-lg px-3 py-1 text-xs ${
                  newLabel === l ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-500"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="コメントを入力"
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handlePostComment}
            className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            コメントを投稿
          </button>
        </div>
      </section>
    </div>
  );
}
