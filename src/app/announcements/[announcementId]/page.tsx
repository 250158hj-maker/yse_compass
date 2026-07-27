import { notFound } from "next/navigation";
import { getAnnouncementById, getTeamsByYear, getTemplateById } from "@/lib/mock";
import AnnouncementDetailClient from "./AnnouncementDetailClient";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  const teams = getTeamsByYear(announcement.yearId);
  const slotsWithTemplate = announcement.materialSlots.map((slot) => ({
    slot,
    template: slot.templateId ? getTemplateById(slot.templateId) ?? null : null,
  }));

  return (
    <AnnouncementDetailClient announcement={announcement} teams={teams} slotsWithTemplate={slotsWithTemplate} />
  );
}
