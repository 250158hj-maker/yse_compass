import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { events, getSubmissionMatrix, materialSlots } from "@/lib/mock-data";
import { CURRENT_YEAR } from "@/lib/constants";

/** SC-02 ホーム（先生）。当年度サマリと、年度セットアップ／公開／アーカイブ操作への導線。 */
export function TeacherHomeView() {
  const yearEvents = events.filter((e) => e.year === CURRENT_YEAR);
  const now = new Date();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">ホーム</h1>
      <p className="mt-1 text-gray-600">{CURRENT_YEAR}年度の発表会サマリ</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {yearEvents.map((event) => {
          const slots = materialSlots.filter((s) => s.eventId === event.id);
          const cells = slots.length > 0 ? getSubmissionMatrix(event.id) : [];
          const teamIds = [...new Set(cells.map((c) => c.team.id))];
          const doneTeams = teamIds.filter((teamId) =>
            cells.filter((c) => c.team.id === teamId).every((c) => c.status === "提出済み")
          ).length;
          const deadline = new Date(event.deadline);
          const deadlineSoon = deadline >= now && deadline.getTime() - now.getTime() < 1000 * 60 * 60 * 24 * 7;

          return (
            <Link key={event.id} href={`/teacher/events/${event.id}`} className="block">
              <Card accent="blue" className="h-full transition hover:border-brand-cyan">
                <p className="font-semibold text-gray-900">{event.phase}発表会</p>
                <p className="mt-1 text-sm text-gray-500">
                  締切: {event.deadline}
                  {deadlineSoon && <span className="ml-2 font-semibold text-brand-orange">締切間近</span>}
                </p>
                {teamIds.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">提出 {doneTeams}/{teamIds.length} チーム</p>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold text-gray-900">年度運営</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/teacher/year-management" className="text-sm font-semibold text-brand-blue hover:underline">
            年度管理（セットアップ・アーカイブ）→
          </Link>
          <Link href="/teacher/archive/consent" className="text-sm font-semibold text-brand-blue hover:underline">
            公開許可管理 →
          </Link>
        </div>
      </Card>
    </div>
  );
}
