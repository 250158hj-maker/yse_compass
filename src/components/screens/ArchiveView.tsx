import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ArchiveSearch } from "@/components/archive/ArchiveSearch";
import { getYears, getArchivedTeamsByYear } from "@/lib/mock-data";

/** SC-15 アーカイブ・トップ。検索は独立画面にせず、アーカイブ入口に同居させる。 */
export function ArchiveView({ basePath }: { basePath: string }) {
  const years = getYears().filter((y) => y.archived);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">アーカイブ</h1>
      <p className="mt-1 text-gray-600">
        卒業制作の年度一覧です。公開許可のある作品のみ表示されます。
      </p>

      <div className="mt-6">
        <ArchiveSearch basePath={basePath} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {years.map((y) => {
          const count = getArchivedTeamsByYear(y.year).length;
          return (
            <Link key={y.year} href={`${basePath}/${y.year}`} className="block">
              <Card accent="purple" className="transition hover:border-brand-purple">
                <h2 className="text-lg font-bold text-gray-900">{y.year}年度卒業制作</h2>
                <p className="mt-1 text-sm text-gray-500">{count}作品公開中</p>
              </Card>
            </Link>
          );
        })}
        {years.length === 0 && <p className="text-sm text-gray-400">アーカイブ済みの年度はまだありません。</p>}
      </div>
    </div>
  );
}
