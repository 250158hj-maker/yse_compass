import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { requireSessionUser } from "@/lib/auth/session";
import { SubmissionError } from "@/lib/data/submissions";
import { listTeamOccasionStatuses } from "@/lib/data/team-occasions";
import { getTeam } from "@/lib/data/teams";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { OccasionStatusSection } from "./OccasionStatusSection";
import { MembersEditor, TeamInfoForm } from "./TeamEditor";

// 対応: docs/design/04-screen.md SC-14（チーム詳細）の、チーム情報と先生の編集（チーム名・作品名の編集・メンバー編集・リーダー指定）だけ。Issue #184。
// 見た目はモックの 2 列の枠（左：チーム情報、右：メンバー）。先生の編集は、同じ枠の中に収める。
// 発表会ごとの提出状況（縦断ビュー）は、関数 listTeamOccasionStatuses が返した値を OccasionStatusSection に渡す。誰に提出状況を見せるかは関数が決める（decisions.md 2026-11-19）。
// 含めない: 作品の説明（H-49・DB に列がない）、引き換えの判別と解除（H-25・H-42）、公開許可の設定パネル（時期が未決・H-44）。
export default async function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireSessionUser(`/teams/${teamId}`);
  // URL の ID は、形と integer の範囲を確かめてから DB に渡す（範囲外を渡すと Prisma が例外を投げ、500 になる）。
  const id = parseId(teamId);
  const team = id !== null ? await getTeam(prisma, { userId: user.id, role: user.role }, id) : null;
  if (!team) notFound();
  const { fiscalYear } = team.class;
  const isTeacher = user.role === "teacher";
  // 関数が「権限なし」「チームなし」を返したときは、この欄だけを出さない（画面で権限を判定しない）。それ以外の例外は、握りつぶさない。
  let occasions = null;
  try {
    occasions = (await listTeamOccasionStatuses(prisma, { userId: user.id, role: user.role }, team.id)).occasions;
  } catch (e) {
    if (!(e instanceof SubmissionError && (e.code === "forbidden" || e.code === "occasion_not_found"))) throw e;
  }
  const editable = {
    id: team.id,
    name: team.name,
    workTitle: team.work?.title ?? "",
    leaderMemberId: team.leaderMemberId,
    members: team.members.map((m) => ({ id: m.id, name: m.name })),
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "チーム一覧", href: "/teams" }, { label: team.name }]} />
      <PageHeader
        eyebrow={`${fiscalYear.year}年度`}
        title={team.work?.title ? `${team.name}(${team.work.title})` : team.name}
        meta={<Badge tone="slate">{team.class.name}</Badge>}
      />
      <div className="mt-6 space-y-4">
        {fiscalYear.isArchived && (
          <InlineNotice tone="warning">
            この年度はアーカイブ済みです。編集はできます（アーカイブ済みの年度の編集を塞がないのは、先行方針〔H-55〕です）。
          </InlineNotice>
        )}
        <div className="grid gap-6 md:grid-cols-3">
          {isTeacher && (
            <div className="md:col-span-2">
              <TeamInfoForm team={editable} />
            </div>
          )}
          <div className={isTeacher ? "" : "md:col-span-3"}>
            {isTeacher ? (
              <MembersEditor team={editable} />
            ) : (
              <Card>
                <SectionHeading>メンバー</SectionHeading>
                <ul className="flex flex-col gap-1 text-sm text-slate-700">
                  {team.members.map((m) => (
                    <li key={m.id}>
                      {m.name}
                      {m.id === team.leaderMemberId && <span className="ml-1 text-xs text-brand-600">(リーダー)</span>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
        {occasions && <OccasionStatusSection teamId={team.id} occasions={occasions} />}
      </div>
    </div>
  );
}
