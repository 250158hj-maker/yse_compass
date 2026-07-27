import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getTeamMembers, teams } from "@/lib/mock-data";
import { CURRENT_YEAR } from "@/lib/constants";

export default function StudentTeamsPage() {
  const currentTeams = teams.filter((t) => t.year === CURRENT_YEAR);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">チーム一覧</h1>
      <p className="mt-1 text-gray-600">当年度のチームです。</p>

      <div className="mt-6 grid gap-4">
        {currentTeams.map((team) => {
          const members = getTeamMembers(team.id);
          return (
            <Link key={team.id} href={`/student/teams/${team.id}`} className="block">
              <Card accent="teal" className="transition hover:border-brand-teal">
                <h2 className="text-lg font-bold text-gray-900">{team.name}</h2>
                <p className="text-xs font-medium text-gray-400">{team.workTitle}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {members.map((m) => m.name).join("、") || "メンバー未割り当て"}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
