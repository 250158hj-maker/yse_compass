import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  events,
  getAllPublishedMaterialsForTeam,
  getComments,
  getTeam,
  getTeamMembers,
  summaryFormEntries,
} from "@/lib/mock-data";

/** SC-17 作品詳細（アーカイブ）。読み取り専用（新規コメント投稿は置かない — 後輩→歴代作品は一方通行と仮決定）。 */
export function ArchivedWorkView({ teamId, year }: { teamId: string; year: number }) {
  const team = getTeam(teamId);
  if (!team || team.year !== year || team.publicConsent !== "許可") notFound();

  const members = getTeamMembers(teamId);
  const materials = getAllPublishedMaterialsForTeam(teamId);
  const summaries = summaryFormEntries.filter((e) => e.teamId === teamId);

  // コメントは4回の発表会にまたがるため、どの発表会に対するものかが分かるよう発表会単位でまとめる。
  const commentGroups = events
    .filter((e) => e.year === year)
    .map((event) => ({ event, comments: getComments(teamId).filter((c) => c.eventId === event.id) }))
    .filter((g) => g.comments.length > 0);

  return (
    <div>
      <p className="text-sm text-gray-500">{year}年度卒業制作</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">{team.workTitle}</h1>
      <p className="text-gray-600">{team.name}</p>

      <Card className="mt-4" accent="teal">
        <h2 className="text-sm font-semibold text-gray-500">メンバー</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {members.map((m) => (
            <li key={m.id} className="rounded-md border border-gray-200 px-2.5 py-1 text-gray-600">
              {m.name}
              {m.role === "リーダー" && <span className="ml-1 text-xs text-gray-400">（リーダー）</span>}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4" accent="blue">
        <h2 className="text-sm font-semibold text-gray-500">発表資料（全4回）</h2>
        {materials.length > 0 ? (
          <ul className="mt-2 grid gap-2 text-sm">
            {materials.map(({ event, slot, submission }) => (
              <li key={submission.id} className="flex items-center justify-between gap-2">
                <span>
                  {event.phase}発表会 — {slot.kind}
                </span>
                <a
                  href={submission.linkUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-blue hover:underline"
                >
                  開く ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-400">資料は登録されていません。</p>
        )}
      </Card>

      {summaries.length > 0 && (
        <Card className="mt-4">
          <h2 className="text-sm font-semibold text-gray-500">概要</h2>
          <div className="mt-2 space-y-4">
            {summaries.map((s) => (
              <div key={s.id} className="text-sm">
                <p>
                  <span className="font-medium text-gray-700">背景・動機：</span>
                  {s.background}
                </p>
                <p>
                  <span className="font-medium text-gray-700">1ページ集約：</span>
                  {s.onePageDigest}
                </p>
                <p>
                  <span className="font-medium text-gray-700">使用技術：</span>
                  {s.techUsed}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">当時のコメント</h2>
        <p className="mt-1 text-xs text-gray-400">
          卒業生への新規コメント投稿はできません（読み取り専用）。
        </p>
        <div className="mt-3 space-y-6">
          {commentGroups.map(({ event, comments }) => (
            <div key={event.id}>
              <h3 className="text-sm font-semibold text-gray-700">{event.phase}発表会へのコメント</h3>
              <div className="mt-2 grid gap-3">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{comment.authorDisplay}</span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 ring-1 ring-inset ring-gray-300">
                        {comment.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{comment.body}</p>
                    {comment.replies.length > 0 && (
                      <ul className="mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
                        {comment.replies.map((reply) => (
                          <li key={reply.id} className="text-sm text-gray-600">
                            <span className="font-medium text-gray-800">{reply.authorDisplay}: </span>
                            {reply.body}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {commentGroups.length === 0 && <p className="text-sm text-gray-400">コメントはありません。</p>}
        </div>
      </div>
    </div>
  );
}
