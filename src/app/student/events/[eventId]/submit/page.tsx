import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { SubmissionSlotCard } from "@/components/student/SubmissionSlotCard";
import { events, getEvent, getMyTeam, getTeamSubmissions } from "@/lib/mock-data";
import { getCurrentStudentId } from "@/lib/current-user";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function SubmitPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  if (!event) notFound();

  const studentId = await getCurrentStudentId();
  const myTeam = getMyTeam(studentId);

  return (
    <div>
      <BackLink href={`/student/events/${eventId}`} label="発表会詳細に戻る" />
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
        {event.phase}発表会 資料提出
      </h1>
      <p className="mt-1 text-gray-600">
        リンク（URL）を登録すると提出になります。何度でも差し替え可能で、常に最新版のみが保持されます。
      </p>

      {!myTeam ? (
        <Card className="mt-6">
          <p className="text-sm text-gray-600">チームに所属していないため、資料提出はできません。</p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4">
          {getTeamSubmissions(eventId, myTeam.id)
            .filter((row) => row.slot.formType === "link")
            .map((row) => (
              <SubmissionSlotCard key={row.slot.id} row={row} />
            ))}
        </div>
      )}
    </div>
  );
}
