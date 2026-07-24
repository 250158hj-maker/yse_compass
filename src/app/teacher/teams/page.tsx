import { NewTeamForm } from "@/components/teacher/NewTeamForm";
import { TeamCard } from "@/components/teacher/TeamCard";
import { getTeamMembers, teams } from "@/lib/mock-data";

export default function TeacherTeamsPage() {
  const currentTeams = teams.filter((t) => t.year === 2026);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">チーム・メンバー管理</h1>
      <p className="mt-1 text-gray-600">
        発表会に参加するチームを作成し、生徒をメンバーとして割り当てます。
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
