import { notFound } from "next/navigation";
import { getAnnouncementById, getTeamById, getTimetable } from "@/lib/mock";
import TimetableClient from "./TimetableClient";

export default async function TimetablePage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  const timetable = getTimetable(announcementId) ?? null;
  const slotsWithTeam = timetable
    ? timetable.slots.map((slot) => ({ slot, team: slot.isBreak ? null : getTeamById(slot.teamId) ?? null }))
    : [];

  return (
    <TimetableClient
      announcement={announcement}
      initialCurrentPresentingTeamId={timetable?.currentPresentingTeamId ?? null}
      slotsWithTeam={slotsWithTeam}
    />
  );
}
