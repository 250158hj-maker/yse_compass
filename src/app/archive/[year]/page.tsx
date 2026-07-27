import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedWorksForYear, getYearById } from "@/lib/mock";

export default async function ArchiveYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearId } = await params;
  const year = getYearById(yearId);
  if (!year || year.status !== "アーカイブ済み") notFound();

  const works = getPublishedWorksForYear(year.id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium text-brand-600">アーカイブ</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{year.label}</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {works.map((team) => (
          <Link
            key={team.id}
            href={`/archive/${year.id}/${team.id}`}
            className="rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-300"
          >
            <p className="font-semibold text-slate-900">{team.projectTitle}</p>
            <p className="text-sm text-slate-500">{team.name}</p>
          </Link>
        ))}
        {works.length === 0 && (
          <p className="text-sm text-slate-400">公開許可済みの作品がまだありません。</p>
        )}
      </div>
    </div>
  );
}
