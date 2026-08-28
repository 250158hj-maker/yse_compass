import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPublishedWorksForYear, getYearById } from "@/lib/mock";

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
            {works.map((team) => (
              <CardLink key={team.id} href={`/archive/${yearId}/teams/${team.id}`}>
                <p className="text-lg font-semibold text-slate-900">{team.projectTitle}</p>
                <p className="text-sm text-slate-500">
                  {team.name}({team.className})
                </p>
                <p className="mt-2 text-xs text-slate-400">{team.summary}</p>
              </CardLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
