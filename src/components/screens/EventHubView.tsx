import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { PublishEventButton } from "@/components/teacher/PublishEventButton";
import { getEvent, getTeamSubmissions, materialSlots, teams, templates } from "@/lib/mock-data";

/** SC-04 発表会詳細【ハブ】。役割ごとに追加要素を出し分ける、運営の中心画面。 */
export function EventHubView({
  eventId,
  role,
  viewerTeamId,
  teamHref,
  timetableHref,
  timetableEditHref,
  submitHref,
  summaryHref,
  editHref,
  submissionsHref,
  summaryBookletHref,
}: {
  eventId: string;
  role: "teacher" | "student";
  /** S1（自チームがある生徒）の場合のみ指定。S2 の場合は undefined。 */
  viewerTeamId?: string | null;
  teamHref: (teamId: string) => string;
  timetableHref: string;
  /** T のみ：タイムテーブル編集（SC-08）への導線。 */
  timetableEditHref?: string;
  submitHref?: string;
  summaryHref?: string;
  editHref?: string;
  submissionsHref?: string;
  summaryBookletHref?: string;
}) {
  const event = getEvent(eventId);
  if (!event) notFound();

  const slots = materialSlots.filter((s) => s.eventId === eventId);
  const relevantTeams = teams.filter((t) => t.year === event.year);
  const mySubmissions = viewerTeamId ? getTeamSubmissions(eventId, viewerTeamId) : [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            {event.year}年度 {event.phase}発表会
          </h1>
          <p className="mt-1 text-gray-600">締切: {event.deadline}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            event.published ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {event.published ? "公開中" : "非公開"}
        </span>
      </div>

      {role === "teacher" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PublishEventButton initialPublished={event.published} />
          {editHref && (
            <Link href={editHref} className="text-sm font-semibold text-brand-blue hover:underline">
              発表会を編集する
            </Link>
          )}
          {submissionsHref && (
            <Link href={submissionsHref} className="text-sm font-semibold text-brand-blue hover:underline">
              提出状況一覧を見る
            </Link>
          )}
          {summaryBookletHref && (
            <Link href={summaryBookletHref} className="text-sm font-semibold text-brand-blue hover:underline">
              概要集を生成する
            </Link>
          )}
        </div>
      )}

      <Card accent="blue" className="mt-6">
        <h2 className="font-semibold text-gray-900">資料枠</h2>
        {slots.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">資料枠はまだ定義されていません。</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {slots.map((slot) => {
              const template = templates.find((t) => slot.kind.includes(t.kind) || t.kind.includes(slot.kind));
              return (
                <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{slot.kind}</span>
                    <span className="ml-2 text-gray-500">
                      {slot.formType === "summary" ? "概要フォーム" : "リンク登録"}・締切 {slot.deadline}
                    </span>
                  </div>
                  {template && (
                    <a
                      href={template.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-brand-blue hover:underline"
                    >
                      テンプレートを開く ↗
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card accent="teal" className="mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">タイムテーブル</h2>
          <div className="flex items-center gap-3">
            {timetableEditHref && (
              <Link href={timetableEditHref} className="text-sm font-semibold text-brand-blue hover:underline">
                編集する
              </Link>
            )}
            <Link href={timetableHref} className="text-sm font-semibold text-brand-teal hover:underline">
              見る →
            </Link>
          </div>
        </div>
      </Card>

      {viewerTeamId && mySubmissions.length > 0 && (
        <Card accent="orange" className="mt-4">
          <h2 className="font-semibold text-gray-900">自チームの提出状況</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {mySubmissions.map((row) => (
              <li key={row.slot.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-gray-800">
                  {row.slot.kind}
                  {row.submittedAt && <span className="ml-2 text-gray-400">{row.submittedAt} 提出</span>}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={row.status} />
                  <Link
                    href={row.slot.formType === "summary" ? summaryHref ?? "#" : submitHref ?? "#"}
                    className="text-xs font-semibold text-brand-orange hover:underline"
                  >
                    {row.submittedAt ? "差し替える" : "提出する"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {event.published && (
        <Card className="mt-4">
          <h2 className="font-semibold text-gray-900">発表一覧</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {relevantTeams
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((team) => (
                <li key={team.id}>
                  <Link
                    href={teamHref(team.id)}
                    className="block rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-brand-blue hover:bg-brand-blue/5"
                  >
                    <span className="font-medium text-gray-900">{team.name}</span>
                    <span className="ml-2 text-gray-500">{team.workTitle}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
