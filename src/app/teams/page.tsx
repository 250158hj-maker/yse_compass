import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardLink } from "@/components/ui/Card";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { RoleGate } from "@/components/session/RoleGate";
import { Button } from "@/components/ui/Button";
import { getCurrentYear, getTeamsByYear } from "@/lib/mock";

export default function TeamsPage() {
  const year = getCurrentYear();
  const teams = year ? getTeamsByYear(year.id) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "チーム一覧" }]} />
      <PageHeader
        title="チーム一覧"
        meta={year?.label}
        actions={
          <RoleGate allow={["teacher"]}>
            <Button variant="primary">+ チーム作成</Button>
          </RoleGate>
        }
      />

      <RoleGate allow={["teacher"]}>
        <div className="mt-4">
          <InlineNotice tone="info">
            チーム作成・メンバー割り当ての操作主体は要件定義で検討中です。現状は先生の操作を前提にしています。
          </InlineNotice>
        </div>
      </RoleGate>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {teams.map((team) => (
          <CardLink key={team.id} href={`/teams/${team.id}`}>
            <p className="text-xs text-slate-400">{team.className}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{team.name}</p>
            <p className="text-sm text-slate-500">{team.projectTitle}</p>
            <p className="mt-2 text-xs text-slate-400">{team.members.join("・")}</p>
          </CardLink>
        ))}
      </div>
    </div>
  );
}
