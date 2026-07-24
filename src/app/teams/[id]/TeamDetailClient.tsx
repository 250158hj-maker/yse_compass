"use client";

import Link from "next/link";
import { useRole } from "@/context/RoleContext";
import type { Announcement, CommentLabel, SubmissionStatus, Team } from "@/lib/mock-data";

const statusStyle: Record<SubmissionStatus, string> = {
  未提出: "bg-slate-100 text-slate-500",
  提出済み: "bg-emerald-100 text-emerald-700",
  差し戻し: "bg-rose-100 text-rose-600",
};

const labelStyle: Record<CommentLabel, string> = {
  感想: "bg-sky-100 text-sky-700",
  批評: "bg-amber-100 text-amber-700",
  その他: "bg-slate-100 text-slate-600",
};

export default function TeamDetailClient({
  team,
  announcement,
}: {
  team: Team;
  announcement: Announcement | undefined;
}) {
  const { role } = useRole();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/teams" className="text-sm text-slate-400 hover:text-slate-700">
        ← チーム一覧に戻る
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400">
            {team.className} ・ {announcement?.title ?? "発表会未設定"}
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{team.projectTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">チーム「{team.name}」</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle[team.submissionStatus]}`}
        >
          {team.submissionStatus}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {team.members.map((member) => (
          <span
            key={member}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
          >
            {member}
          </span>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-400">概要</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{team.summary}</p>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400">提出資料</h2>
          {role === "teacher" && (
            <span className="text-xs text-slate-400">先生ビュー：提出状況を確認できます</span>
          )}
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {team.materials.map((material) => (
            <li key={material.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{material.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">更新: {material.updatedAt}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyle[material.status]}`}
                >
                  {material.status}
                </span>
                {material.driveUrl ? (
                  <a
                    href={material.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-slate-900 hover:underline"
                  >
                    開く
                  </a>
                ) : (
                  role === "student" && (
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      提出する
                    </button>
                  )
                )}
                {role === "student" && material.driveUrl && (
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    差し替え
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400">
            コメント・フィードバック({team.comments.length})
          </h2>
          <span className="text-xs text-slate-400">♡ {team.likeCount}</span>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {team.comments.length === 0 && (
            <p className="text-sm text-slate-400">まだコメントはありません。</p>
          )}

          {team.comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {comment.authorName}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${labelStyle[comment.label]}`}
                  >
                    {comment.label}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{comment.postedAt}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{comment.body}</p>
              <div className="mt-2 text-xs text-slate-400">♡ {comment.likeCount}</div>

              {comment.replies.length > 0 && (
                <div className="mt-3 space-y-2 border-l-2 border-slate-100 pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{reply.authorName}</span>
                        <span>{reply.postedAt}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{reply.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <textarea
            placeholder={
              role === "student"
                ? "感想やフィードバックを入力(モックのため送信はできません)"
                : "先生としてコメントを投稿できます(モックのため送信はできません)"
            }
            className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-400"
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-500"
            >
              コメントする
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
