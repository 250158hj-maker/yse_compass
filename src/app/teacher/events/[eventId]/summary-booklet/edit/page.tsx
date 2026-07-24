import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { PrintButton } from "@/components/ui/PrintButton";
import { GaiyoshuComposer } from "@/components/teacher/GaiyoshuComposer";
import { events, getEvent, getSummaryBooklet } from "@/lib/mock-data";

export function generateStaticParams() {
  return events.map((event) => ({ eventId: event.id }));
}

export default async function TeacherGaiyoshuEditPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  if (!event) notFound();

  const entries = getSummaryBooklet(eventId);

  return (
    <div>
      <div className="print:hidden">
        <BackLink href={`/teacher/events/${eventId}/summary-booklet`} label="概要集に戻る" />
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3 print:mt-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">概要集の整形・編集</h1>
          <p className="mt-1 text-gray-600">
            {event.phase}発表会（{event.deadline}）。各チームの提出資料をもとに、テンプレートの体裁（背景・課題／提案・解決策／今後の展望）に整えます。
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-6">
        <GaiyoshuComposer entries={entries} />
      </div>
    </div>
  );
}
