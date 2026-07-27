import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getArchivedTeamsByYear, summaryFormEntries } from "@/lib/mock-data";

/** SC-16 年度別作品一覧。「年度→作品名」の2階層を潰さない。 */
export function ArchiveYearView({ year, workHref }: { year: number; workHref: (teamId: string) => string }) {
  const yearTeams = getArchivedTeamsByYear(year);
  if (yearTeams.length === 0) notFound();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{year}年度卒業制作</h1>
      <p className="mt-1 text-gray-600">公開許可のある作品一覧です。</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {yearTeams.map((team) => {
          const tech = summaryFormEntries.filter((e) => e.teamId === team.id).map((e) => e.techUsed);
          return (
            <Link key={team.id} href={workHref(team.id)} className="block">
              <Card accent="purple" className="h-full transition hover:border-brand-purple">
                <h2 className="font-semibold text-gray-900">{team.workTitle}</h2>
                <p className="text-xs text-gray-400">{team.name}</p>
                <p className="mt-2 text-sm text-gray-600">{team.summary}</p>
                {tech.length > 0 && <p className="mt-2 text-xs text-gray-400">使用技術: {tech.join(" / ")}</p>}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
