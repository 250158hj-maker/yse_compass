import type { SubmissionStatus, TimetableSlotStatus } from "@/lib/mock-data";

const styles: Record<SubmissionStatus, string> = {
  未提出: "bg-gray-100 text-gray-600 ring-gray-300",
  提出済み: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  期限切れ: "bg-red-50 text-red-700 ring-red-300",
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}

const timetableStyles: Record<TimetableSlotStatus, string> = {
  予定: "bg-gray-100 text-gray-600 ring-gray-300",
  進行中: "bg-brand-orange/10 text-brand-orange ring-brand-orange/40",
  終了: "bg-gray-100 text-gray-400 ring-gray-300",
};

export function TimetableStatusBadge({ status }: { status: TimetableSlotStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${timetableStyles[status]}`}
    >
      {status}
    </span>
  );
}

export function PublishedBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        published
          ? "bg-blue-50 text-blue-700 ring-blue-300"
          : "bg-gray-100 text-gray-500 ring-gray-300"
      }`}
    >
      {published ? "公開済み" : "非公開"}
    </span>
  );
}
