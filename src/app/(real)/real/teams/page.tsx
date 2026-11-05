import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { listClassOptions, listTeams } from "@/lib/data/teams";
import { prisma } from "@/lib/prisma";
import { CreateTeamForm } from "./CreateTeamForm";

// 対応: docs/design/04-screen.md SC-13（チーム一覧）／docs/requirements.md §3-8。
// 先行方針: H-54（当年度は、未アーカイブの年度のうち year が最大のものを既定にし、年度を切り替えられる）。
export default async function RealTeamsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireSessionUser("/real/teams");
  const { year } = await searchParams;
  const actor = { userId: user.id, role: user.role };
  const { years, defaultFiscalYearId } = await listClassOptions(prisma, actor);
  const selected = years.find((y) => String(y.id) === year) ?? years.find((y) => y.id === defaultFiscalYearId);
  const teams = selected ? await listTeams(prisma, actor, selected.id) : [];

  return (
    <div>
      <PageHeader
        title="チーム一覧"
        meta={selected ? `${selected.year}年度・${teams.length}チーム` : undefined}
        actions={
          years.length > 1 &&
          years.map((y) => (
            <Link
              key={y.id}
              href={`/real/teams?year=${y.id}`}
              className={`rounded-md border px-3 py-1.5 text-sm ${y.id === selected?.id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600"}`}
            >
              {y.year}年度
            </Link>
          ))
        }
      />

      <div className="mt-6 space-y-6">
        {!selected && (
          <InlineNotice tone="warning">
            未アーカイブの年度がありません。チームは、年度セットアップで作られたクラスに属します（開発中は <code>pnpm db:seed</code> で入れられます）。
          </InlineNotice>
        )}

        {user.role === "teacher" && selected && (
          // 一覧の年度を切り替えたら、フォームも作り直す（年度とクラスの選択肢を、一覧に追随させる）。
          <CreateTeamForm key={selected.id} years={years} initialYearId={selected.id} />
        )}

        {selected &&
          (teams.length === 0 ? (
            <EmptyState message={`${selected.year}年度には、まだチームがありません。`} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {teams.map((team) => (
                <CardLink key={team.id} href={`/real/teams/${team.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{team.name}</h2>
                    <Badge tone="brand">{team.class.name}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{team.work?.title ?? "作品名は未入力"}</p>
                  <p className="mt-3 flex flex-wrap gap-1.5 text-sm text-slate-700">
                    {team.members.map((m) => (
                      <span key={m.id} className="rounded bg-slate-100 px-2 py-0.5">
                        {m.name}
                        {m.id === team.leaderMemberId && (
                          <span className="ml-1.5">
                            <Badge tone="amber">リーダー</Badge>
                          </span>
                        )}
                      </span>
                    ))}
                  </p>
                </CardLink>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
