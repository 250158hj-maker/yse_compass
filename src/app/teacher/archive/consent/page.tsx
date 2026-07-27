import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { PublicConsentControl } from "@/components/teacher/PublicConsentControl";
import { getYears, teams } from "@/lib/mock-data";

export default function PublicConsentPage() {
  const archivedYears = getYears().filter((y) => y.archived);

  return (
    <div>
      <BackLink href="/teacher" label="ホームに戻る" />
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">公開許可管理</h1>
      <p className="mt-1 text-gray-600">
        卒業年度チームの公開許可を確認・代理設定します。データの削除は行いません（表示制御のみ）。
      </p>

      <div className="mt-6 space-y-6">
        {archivedYears.map((y) => {
          const yearTeams = teams.filter((t) => t.year === y.year);
          return (
            <Card key={y.year}>
              <h2 className="font-semibold text-gray-900">{y.year}年度</h2>
              <ul className="mt-3 divide-y divide-gray-100">
                {yearTeams.map((team) => (
                  <li key={team.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{team.name}</p>
                      <p className="text-xs text-gray-400">{team.workTitle}</p>
                    </div>
                    <PublicConsentControl initial={team.publicConsent} />
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
        {archivedYears.length === 0 && <p className="text-sm text-gray-400">アーカイブ済みの年度はまだありません。</p>}
      </div>
    </div>
  );
}
