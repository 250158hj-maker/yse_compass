import { BackLink } from "@/components/ui/BackLink";
import { ArchivedWorkView } from "@/components/screens/ArchivedWorkView";
import { getYears, getArchivedTeamsByYear } from "@/lib/mock-data";

export function generateStaticParams() {
  return getYears()
    .filter((y) => y.archived)
    .flatMap((y) => getArchivedTeamsByYear(y.year).map((t) => ({ year: String(y.year), teamId: t.id })));
}

export default async function TeacherArchivedWorkPage({
  params,
}: {
  params: Promise<{ year: string; teamId: string }>;
}) {
  const { year, teamId } = await params;
  return (
    <div>
      <BackLink href={`/teacher/archive/${year}`} label="年度一覧に戻る" />
      <div className="mt-3">
        <ArchivedWorkView teamId={teamId} year={Number(year)} />
      </div>
    </div>
  );
}
