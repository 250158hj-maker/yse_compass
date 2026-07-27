import { notFound } from "next/navigation";
import { getAnnouncementById } from "@/lib/mock";
import { templates } from "@/lib/mock/announcements";
import EditAnnouncementClient from "./EditAnnouncementClient";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  return <EditAnnouncementClient announcement={announcement} templates={templates} />;
}
