import { BackLink } from "@/components/ui/BackLink";
import { ArchiveYearView } from "@/components/screens/ArchiveYearView";
import { getYears } from "@/lib/mock-data";

export function generateStaticParams() {
  return getYears()
    .filter((y) => y.archived)
    .map((y) => ({ year: String(y.year) }));
}

export default async function TeacherArchiveYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return (
    <div>
      <BackLink href="/teacher/archive" label="アーカイブに戻る" />
      <div className="mt-3">
        <ArchiveYearView year={Number(year)} workHref={(teamId) => `/teacher/archive/${year}/${teamId}`} />
      </div>
    </div>
  );
}
