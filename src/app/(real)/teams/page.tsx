import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { requireSessionUser } from "@/lib/auth/session";
import { listClassOptions, listTeams } from "@/lib/data/teams";
import { prisma } from "@/lib/prisma";
import { TeamsHeader } from "./TeamsHeader";

function TeamIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5" />
      <path d="M14.8 14.3c2.1.4 3.7 2.2 3.7 4.7" />
    </svg>
  );
}

// 対応: docs/design/04-screen.md SC-13（チーム一覧）／docs/requirements.md §3-8。Issue #184（モックの画面を本番仕様にする）。
// 見た目はモックのまま（見出しの【+ チーム作成】・チームのカード）、データは data 層、ユーザーは requireSessionUser から読む。
// 先行方針: H-54（当年度は、未アーカイブの年度のうち year が最大のものを既定にし、年度を切り替えられる）。
// 含めない: 「自チーム」の印（04 に無く、材料もない）、リーダーのバッジ（モックの一覧に無い。詳細の SC-14 で出す）。
export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireSessionUser("/teams");
  const { year } = await searchParams;
  const actor = { userId: user.id, role: user.role };
  const { years, defaultFiscalYearId } = await listClassOptions(prisma, actor);
  const selected = years.find((y) => String(y.id) === year) ?? years.find((y) => y.id === defaultFiscalYearId);
  const teams = selected ? await listTeams(prisma, actor, selected.id) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "チーム一覧" }]} />
      {/* 一覧の年度を切り替えたら、フォームも作り直す（年度とクラスの選択肢を、一覧に追随させる）。 */}
      <TeamsHeader
        key={selected?.id ?? "none"}
        meta={selected ? `${selected.year}年度・${teams.length}チーム` : undefined}
        years={years}
        selectedYearId={selected?.id ?? null}
        canCreate={user.role === "teacher"}
      />

      <div className="mt-6 space-y-6">
        {!selected && (
          <InlineNotice tone="warning">
            未アーカイブの年度がありません。チームは、年度セットアップで作られたクラスに属します（開発中は <code>pnpm db:seed</code> で入れられます）。
          </InlineNotice>
        )}

        {selected &&
          (teams.length === 0 ? (
            <EmptyState message={`${selected.year}年度には、まだチームがありません。`} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {teams.map((team) => (
                <CardLink
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="flex items-start gap-4 shadow-sm shadow-slate-900/5 hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-500/20"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <TeamIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge>{team.class.name}</Badge>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{team.name}</p>
                    {team.work?.title ? (
                      <p className="text-sm text-slate-500">{team.work.title}</p>
                    ) : (
                      <p className="text-sm text-slate-400">作品名は未設定</p>
                    )}
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {team.members.map((m) => (
                        <li key={m.id} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                          {m.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardLink>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
