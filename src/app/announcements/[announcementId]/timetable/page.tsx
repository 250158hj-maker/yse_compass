import { notFound } from "next/navigation";
import { getAnnouncementById, getTimetableFor } from "@/lib/mock";
import { TimetableClient } from "./TimetableClient";

export default async function TimetablePage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  const timetable = getTimetableFor(announcementId);

  return <TimetableClient announcement={announcement} timetable={timetable} />;
}
