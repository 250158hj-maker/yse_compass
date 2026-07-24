import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { CommentSection } from "@/components/comments/CommentSection";
import { WorkLikeButton } from "@/components/screens/WorkLikeButton";
import {
  getAllPublishedMaterialsForTeam,
  getComments,
  getTeam,
  getTeamMembers,
} from "@/lib/mock-data";

export function TeamDetailView({ teamId, viewerName }: { teamId: string; viewerName?: string }) {
  const team = getTeam(teamId);
  if (!team) notFound();

  const members = getTeamMembers(teamId);
  const materials = getAllPublishedMaterialsForTeam(teamId);
  const comments = getComments(teamId);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{team.workTitle}</h1>
      <p className="text-sm text-gray-400">{team.name}</p>
      <p className="mt-2 text-gray-600">{team.summary}</p>
      <div className="mt-3">
        <WorkLikeButton initialLikes={team.likes} />
      </div>

      <Card className="mt-4" accent="teal">
        <h2 className="text-sm font-semibold text-gray-500">メンバー</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {members.map((m) => (
            <li key={m.id} className="rounded-md border border-gray-200 px-2.5 py-1 text-gray-600">
              {m.name}（{m.role}）
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4" accent="blue">
        <h2 className="text-sm font-semibold text-gray-500">公開されている発表資料</h2>
        {materials.length > 0 ? (
          <ul className="mt-2 grid gap-2">
            {materials.map(({ event, slot, submission }) => (
              <li key={submission.id} className="flex items-center justify-between text-sm">
                <span>
                  {event.year}年度 {event.phase}発表会 — {slot.kind}
                </span>
                <a
                  href={submission.linkUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  資料を開く ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-400">公開されている資料はまだありません。</p>
        )}
      </Card>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">コメント・フィードバック</h2>
        <div className="mt-3">
          <CommentSection
            teamId={teamId}
            teamName={team.name}
            viewerName={viewerName}
            initialComments={comments}
          />
        </div>
      </div>
    </div>
  );
}
