import { notFound } from "next/navigation";
import { getAnnouncementById, getTeamsByYear, getTimetable } from "@/lib/mock";
import TimetableEditClient from "./TimetableEditClient";

export default async function TimetableEditPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  const timetable = getTimetable(announcementId);
  const teams = getTeamsByYear(announcement.yearId);

  const initialSlots =
    timetable?.slots ??
    teams.map((team, index) => ({
      id: `${announcement.id}-tt-${team.id}`,
      teamId: team.id,
      order: index + 1,
      startTime: "09:00",
      durationMin: 15,
      isBreak: false as const,
    }));

  return <TimetableEditClient announcement={announcement} teams={teams} initialSlots={initialSlots} />;
}
