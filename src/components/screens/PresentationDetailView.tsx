import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { CommentSection } from "@/components/comments/CommentSection";
import { WorkLikeButton } from "@/components/screens/WorkLikeButton";
import {
  getEvent,
  getSummaryFormEntry,
  getTeam,
  getTeamMembers,
  getCommentsForPresentation,
  materialSlots,
  submissions,
} from "@/lib/mock-data";

/** SC-12 発表詳細（チーム×発表会）。議論の器はこの画面ただ1つ。 */
export function PresentationDetailView({
  eventId,
  teamId,
  role,
  viewerName,
  viewerTeamId,
}: {
  eventId: string;
  teamId: string;
  role: "teacher" | "student";
  viewerName: string;
  /** S1（自チームがある生徒）なら自チームID。公開前でも自チームの発表は見られる。 */
  viewerTeamId?: string | null;
}) {
  const event = getEvent(eventId);
  const team = getTeam(teamId);
  if (!event || !team) notFound();

  const canView = role === "teacher" || event.published || viewerTeamId === teamId;
  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-gray-600">この発表はまだ公開されていません。</p>
      </Card>
    );
  }

  const members = getTeamMembers(teamId);
  const linkMaterials = materialSlots
    .filter((s) => s.eventId === eventId && s.formType === "link")
    .flatMap((slot) => {
      const submission = submissions.find((s) => s.slotId === slot.id && s.teamId === teamId && s.linkUrl);
      return submission ? [{ slot, submission }] : [];
    });
  const summaryEntry = getSummaryFormEntry(teamId, eventId);
  const comments = getCommentsForPresentation(teamId, eventId);

  return (
    <div>
      <p className="text-sm text-gray-500">
        {event.year}年度 {event.phase}発表会
      </p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">{team.workTitle}</h1>
      <p className="mt-1 text-gray-600">{team.name}</p>

      <div className="mt-3">
        <WorkLikeButton initialLikes={team.likes} />
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold text-gray-900">メンバー</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {members.map((m) => (
            <li key={m.id} className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
              {m.name}
              {m.role === "リーダー" && <span className="ml-1 text-xs text-gray-400">（リーダー）</span>}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <h2 className="font-semibold text-gray-900">提出資料</h2>
        {linkMaterials.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">公開されている資料はまだありません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {linkMaterials.map(({ slot, submission }) => (
              <li key={slot.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-gray-800">
                  {slot.kind}
                  {submission.submittedAt && <span className="ml-2 text-gray-400">{submission.submittedAt}</span>}
                </span>
                <a
                  href={submission.linkUrl!}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-blue hover:underline"
                >
                  開く ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {summaryEntry && (
        <Card className="mt-4">
          <h2 className="font-semibold text-gray-900">概要</h2>
          <div className="mt-2 space-y-2 text-sm">
            <p>
              <span className="font-medium text-gray-700">背景・動機：</span>
              {summaryEntry.background}
            </p>
            <p>
              <span className="font-medium text-gray-700">起・結：</span>
              {summaryEntry.kiKetsu}
            </p>
            <p className="whitespace-pre-wrap">
              <span className="font-medium text-gray-700">1ページ集約：</span>
              {summaryEntry.onePageDigest}
            </p>
            <p>
              <span className="font-medium text-gray-700">使用技術：</span>
              {summaryEntry.techUsed}
            </p>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="font-semibold text-gray-900">コメント</h2>
        <div className="mt-3">
          <CommentSection
            teamId={teamId}
            eventId={eventId}
            teamName={team.name}
            viewerName={viewerName}
            initialComments={comments}
          />
        </div>
      </Card>
    </div>
  );
}
