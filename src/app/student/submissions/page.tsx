import { Card } from "@/components/ui/Card";
import { SubmissionSlotCard } from "@/components/student/SubmissionSlotCard";
import { getMyTeam, getTeamSubmissions } from "@/lib/mock-data";
import { getCurrentStudentId } from "@/lib/current-user";
import { CURRENT_EVENT_ID } from "@/lib/constants";

export default async function StudentSubmissionsPage() {
  const currentStudentId = await getCurrentStudentId();
  const myTeam = getMyTeam(currentStudentId);

  if (!myTeam) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">資料提出</h1>
        <Card className="mt-6">
          <p className="text-gray-600">
            チームに所属していないため、この機能は利用できません。チームに所属すると、発表資料の提出・差し替えができるようになります。
          </p>
        </Card>
      </div>
    );
  }

  const rows = getTeamSubmissions(CURRENT_EVENT_ID, myTeam.id);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">資料提出</h1>
      <p className="mt-1 text-gray-600">
        {myTeam.name}の提出対象資料です。締切までリンクの登録・差し替えができます。
      </p>

      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <SubmissionSlotCard key={row.slot.id} row={row} />
        ))}
      </div>
    </div>
  );
}
