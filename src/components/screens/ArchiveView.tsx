import { ArchiveSearch } from "@/components/archive/ArchiveSearch";
import { getArchivedEvents, teams } from "@/lib/mock-data";

export function ArchiveView({ teamBasePath }: { teamBasePath: string }) {
  const archivedEvents = getArchivedEvents();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">資料のアーカイブ・検索</h1>
      <p className="mt-1 text-gray-600">
        発表会を終えた作品を年度・チーム単位でアーカイブし、キーワードで検索・閲覧できます。
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-500">
        {archivedEvents.map((e) => (
          <span key={e.id} className="rounded-md border border-gray-200 px-2.5 py-1">
            {e.year}年度 {e.phase}発表会（終了）
          </span>
        ))}
      </div>

      <div className="mt-6">
        <ArchiveSearch teams={teams} teamBasePath={teamBasePath} />
      </div>
    </div>
  );
}
