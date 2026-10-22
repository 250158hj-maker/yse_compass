import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { getTeam } from "@/lib/data/teams";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { TeamEditor } from "./TeamEditor";

// 対応: docs/design/04-screen.md SC-14（チーム詳細）の、チーム情報と先生の編集（チーム名・作品名の編集・メンバー編集・リーダー指定）だけ。
// 含めない: 引き換えの判別と解除（H-25・H-42）、4 発表会分の提出状況、公開許可の設定パネル。
export default async function RealTeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireSessionUser(`/real/teams/${teamId}`);
  // URL の ID は、形と integer の範囲を確かめてから DB に渡す（範囲外を渡すと Prisma が例外を投げ、500 になる）。
  const id = parseId(teamId);
  const team = id !== null ? await getTeam(prisma, { userId: user.id, role: user.role }, id) : null;
  if (!team) notFound();
  const { fiscalYear } = team.class;

  return (
    <div>
      <Breadcrumbs items={[{ label: "チーム一覧", href: "/real/teams" }, { label: team.name }]} />
      <PageHeader
        title={team.name}
        meta={
          <>
            <Badge tone="brand">{team.class.name}</Badge>
            <span>
              {fiscalYear.year}年度・{team.work?.title ?? "作品名は未入力"}
            </span>
          </>
        }
      />
      <div className="mt-6 space-y-4">
        {fiscalYear.isArchived && (
          <InlineNotice tone="warning">
            この年度はアーカイブ済みです。編集はできます（アーカイブ済みの年度の編集を塞がないのは、先行方針〔H-55〕です）。
          </InlineNotice>
        )}
        {user.role === "teacher" ? (
          <TeamEditor
            team={{
              id: team.id,
              name: team.name,
              workTitle: team.work?.title ?? "",
              leaderMemberId: team.leaderMemberId,
              members: team.members.map((m) => ({ id: m.id, name: m.name })),
            }}
          />
        ) : (
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">メンバー</h2>
            <ul className="space-y-1 text-sm text-slate-700">
              {team.members.map((m) => (
                <li key={m.id}>
                  {m.name}
                  {m.id === team.leaderMemberId && <Badge tone="amber">リーダー</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
