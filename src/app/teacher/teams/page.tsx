import { NewTeamForm } from "@/components/teacher/NewTeamForm";
import { TeamCard } from "@/components/teacher/TeamCard";
import { getTeamMembers, teams } from "@/lib/mock-data";
import { CURRENT_YEAR } from "@/lib/constants";

export default function TeacherTeamsPage() {
  const currentTeams = teams.filter((t) => t.year === CURRENT_YEAR);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">チーム一覧</h1>
      <p className="mt-1 text-gray-600">
        当年度のチームとメンバーです（作成・割り当ての操作主体は未決#6のため、暫定的に先生側に置いています）。
      </p>

      <div className="mt-6 grid gap-4">
        {currentTeams.map((team) => (
          <TeamCard key={team.id} team={team} initialMembers={getTeamMembers(team.id)} />
        ))}
      </div>

      <div className="mt-6">
        <NewTeamForm />
      </div>
    </div>
  );
}
