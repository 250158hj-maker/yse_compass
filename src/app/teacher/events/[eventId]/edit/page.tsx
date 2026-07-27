import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { EventEditForm } from "@/components/teacher/EventEditForm";
import { MaterialSlotManager } from "@/components/teacher/MaterialSlotManager";
import { events, getEvent, materialSlots } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function EventEditPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  if (!event) notFound();

  const slots = materialSlots.filter((s) => s.eventId === eventId);

  return (
    <div>
      <BackLink href={`/teacher/events/${eventId}`} label="発表会詳細に戻る" />
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
        {event.year}年度 {event.phase}発表会の編集
      </h1>
      <p className="mt-1 text-gray-600">日程の変更と、資料枠（種類・締切・提出方式）の追加・編集・削除ができます。</p>

      <Card accent="blue" className="mt-6">
        <h2 className="font-semibold text-gray-900">日程</h2>
        <EventEditForm event={event} />
      </Card>

      <Card accent="blue" className="mt-4">
        <h2 className="font-semibold text-gray-900">資料枠</h2>
        <MaterialSlotManager
          eventId={event.id}
          eventLabel={`${event.year}年度 ${event.phase}発表会`}
          initialSlots={slots}
        />
      </Card>
    </div>
  );
}
