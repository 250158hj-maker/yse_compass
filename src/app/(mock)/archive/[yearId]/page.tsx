import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardLink } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAnnouncementsByYear, getPublishedWorksForYear, getSubmission, getYearById } from "@/lib/mock";

// SC-16 年度別作品一覧。カードに出すのは、作品名・チーム名(クラス)・使用技術(04 SC-16・decisions.md 2026-10-26 の H-51 (g))。
// 作品の説明は出さない(H-49 の先行方針)。使用技術は発表会ごとの概要に入っているので、どの回のものを出すかは未決(H-49・H-37):
// モックでは、その年度の最も後の発表会の概要から取り、無ければ何も出さない(仮の値は入れない)。
function techUsedOf(yearId: string, teamId: string): string[] {
  const announcements = getAnnouncementsByYear(yearId);
  for (let i = announcements.length - 1; i >= 0; i--) {
    const tech = getSubmission(announcements[i].id, teamId)?.summary?.techUsed;
    if (tech && tech.length > 0) return tech;
  }
  return [];
}

export default async function ArchiveYearPage({
  params,
}: {
  params: Promise<{ yearId: string }>;
}) {
  const { yearId } = await params;
  const year = getYearById(yearId);
  if (!year) notFound();

  const works = getPublishedWorksForYear(yearId);

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "アーカイブ", href: "/archive" },
          { label: `${year.label}卒業制作` },
        ]}
      />
      <PageHeader title={`${year.label}卒業制作`} meta="公開許可済みの作品一覧" />

      <div className="mt-6">
        {works.length === 0 ? (
          <EmptyState message="この年度で公開許可済みの作品はまだありません。" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {works.map((team) => {
              const tech = techUsedOf(yearId, team.id);
              return (
                <CardLink key={team.id} href={`/archive/${yearId}/teams/${team.id}`}>
                  <p className="text-lg font-semibold text-slate-900">{team.projectTitle}</p>
                  <p className="text-sm text-slate-500">
                    {team.name}({team.className})
                  </p>
                  {tech.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tech.map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                  )}
                </CardLink>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
