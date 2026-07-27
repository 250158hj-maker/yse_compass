import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { SummaryForm } from "@/components/student/SummaryForm";
import { events, getEvent, getMyTeam, getSummaryFormEntry, materialSlots } from "@/lib/mock-data";
import { getCurrentStudentId } from "@/lib/current-user";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function SummaryFormPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  if (!event) notFound();

  const slot = materialSlots.find((s) => s.eventId === eventId && s.formType === "summary");
  const studentId = await getCurrentStudentId();
  const myTeam = getMyTeam(studentId);

  return (
    <div>
      <BackLink href={`/student/events/${eventId}`} label="発表会詳細に戻る" />
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
        {event.phase}発表会 概要入力
      </h1>
      <p className="mt-1 text-gray-600">概要集（SC-11）はこの内容から発表順に自動生成されます。</p>

      {!myTeam ? (
        <Card className="mt-6">
          <p className="text-sm text-gray-600">チームに所属していないため、概要の入力はできません。</p>
        </Card>
      ) : !slot ? (
        <Card className="mt-6">
          <p className="text-sm text-gray-600">この発表会には概要フォームの枠が設定されていません。</p>
        </Card>
      ) : (
        <div className="mt-6">
          <SummaryForm
            deadline={slot.deadline}
            deadlinePassed={new Date(slot.deadline) < new Date()}
            initialEntry={getSummaryFormEntry(myTeam.id, eventId)}
          />
        </div>
      )}
    </div>
  );
}
