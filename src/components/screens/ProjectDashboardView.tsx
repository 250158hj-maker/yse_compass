import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { CURRENT_EVENT_ID } from "@/lib/constants";
import {
  getAllPublishedMaterialsForTeam,
  getComments,
  getTeam,
  getTeamSubmissions,
} from "@/lib/mock-data";

export function ProjectDashboardView({ teamId }: { teamId: string }) {
  const team = getTeam(teamId);
  if (!team) notFound();

  const rows = getTeamSubmissions(CURRENT_EVENT_ID, teamId);
  const comments = getComments(teamId);
  const publishedMaterials = getAllPublishedMaterialsForTeam(teamId);
  const submittedCount = rows.filter((r) => r.status === "提出済み").length;
  const totalLikes = comments.reduce((sum, c) => sum + c.likes, 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{team.workTitle}</h1>
      <p className="text-sm text-gray-400">{team.name}</p>
      <p className="mt-2 text-gray-600">{team.summary}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card accent="teal">
          <p className="text-sm text-gray-500">提出状況（今回の発表会）</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">
            {submittedCount} / {rows.length}
          </p>
        </Card>
        <Card accent="blue">
          <p className="text-sm text-gray-500">公開済み資料</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">{publishedMaterials.length}件</p>
        </Card>
        <Card accent="orange">
          <p className="text-sm text-gray-500">コメント / いいね</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">
            {comments.length}件 / {totalLikes}
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">資料枠ごとの提出状況</h2>
          <Link href="/student/submissions" className="text-sm text-brand-blue hover:underline">
            資料提出へ →
          </Link>
        </div>
        <ul className="mt-3 grid gap-2">
          {rows.map((row) => (
            <li key={row.slot.id} className="flex items-center justify-between text-sm">
              <span>
                {row.slot.kind}
                <span className="ml-2 text-gray-400">締切 {row.slot.deadline}</span>
              </span>
              <StatusBadge status={row.status} />
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/student/teams/${team.id}`}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400"
        >
          作品ページ・コメントを見る
        </Link>
        <Link
          href="/student/templates"
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400"
        >
          テンプレートをダウンロード
        </Link>
        <Link
          href={`/student/browse/${CURRENT_EVENT_ID}`}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400"
        >
          他チームの発表を見る
        </Link>
        <Link
          href={`/student/timetable/${CURRENT_EVENT_ID}`}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400"
        >
          当日のタイムテーブルを見る
        </Link>
        <Link
          href={`/student/summary-booklet/${CURRENT_EVENT_ID}`}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400"
        >
          概要集を見る
        </Link>
      </div>
    </div>
  );
}
