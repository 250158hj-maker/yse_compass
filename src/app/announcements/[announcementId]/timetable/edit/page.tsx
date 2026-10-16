import { notFound } from "next/navigation";
import { getAnnouncementById, getTimetableFor } from "@/lib/mock";
import { TimetableEditClient } from "./TimetableEditClient";

export default async function TimetableEditPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  const timetable = getTimetableFor(announcementId);

  return <TimetableEditClient announcement={announcement} timetable={timetable} />;
}
