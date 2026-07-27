import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { PublicConsentControl } from "@/components/teacher/PublicConsentControl";
import { events, getTeam, getTeamMembers, getTeamSubmissions } from "@/lib/mock-data";

/** SC-14 チーム詳細。当年度の4発表会分の縦断ビュー＋（終了後の）公開許可パネル。SC-12（議論）とは分離。 */
export function TeamOverviewView({
  teamId,
  role,
  eventDetailHref,
  canManageConsent,
}: {
  teamId: string;
  role: "teacher" | "student";
  eventDetailHref: (eventId: string) => string;
  /** リーダー本人、または先生（代理設定）なら true。 */
  canManageConsent: boolean;
}) {
  const team = getTeam(teamId);
  if (!team) notFound();

  const members = getTeamMembers(teamId);
  const leader = members.find((m) => m.role === "リーダー");
  const yearEvents = events.filter((e) => e.year === team.year);
  const now = new Date();
  const allFinished = yearEvents.every((e) => new Date(e.deadline) < now);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{team.name}</h1>
      <p className="text-sm text-gray-500">{team.workTitle}</p>
      <p className="mt-2 text-gray-600">{team.summary}</p>

      <Card className="mt-4" accent="teal">
        <h2 className="text-sm font-semibold text-gray-500">メンバー</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {members.map((m) => (
            <li key={m.id} className="rounded-md border border-gray-200 px-2.5 py-1 text-gray-600">
              {m.name}
              {m.role === "リーダー" && <span className="ml-1 text-xs text-brand-teal">（リーダー）</span>}
            </li>
          ))}
          {members.length === 0 && <li className="text-gray-400">メンバー未割り当て</li>}
        </ul>
      </Card>

      <Card className="mt-4" accent="blue">
        <h2 className="text-sm font-semibold text-gray-500">発表会ごとの提出状況</h2>
        <ul className="mt-2 divide-y divide-gray-100 text-sm">
          {yearEvents.map((event) => {
            const rows = getTeamSubmissions(event.id, teamId);
            const allDone = rows.length > 0 && rows.every((r) => r.status === "提出済み");
            return (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-gray-800">{event.phase}発表会</span>
                <div className="flex items-center gap-2">
                  {rows.length > 0 && <StatusBadge status={allDone ? "提出済み" : "未提出"} />}
                  {(role === "teacher" || event.published) && (
                    <Link
                      href={eventDetailHref(event.id)}
                      className="text-xs font-semibold text-brand-blue hover:underline"
                    >
                      発表詳細へ →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {allFinished && (
        <Card className="mt-4" accent="purple">
          <h2 className="text-sm font-semibold text-gray-500">公開許可（卒業後のアーカイブ公開）</h2>
          <p className="mt-1 text-xs text-gray-400">
            同意者はチーム代表者（{leader?.name ?? "未指定"}）。既定は非表示で、許可がない限りアーカイブ・検索に出ません。
          </p>
          {canManageConsent ? (
            <div className="mt-3">
              <PublicConsentControl initial={team.publicConsent} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-600">現在の設定: {team.publicConsent}</p>
          )}
        </Card>
      )}
    </div>
  );
}
