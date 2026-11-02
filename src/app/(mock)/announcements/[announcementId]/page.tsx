import { notFound } from "next/navigation";
import { getAnnouncementById } from "@/lib/mock";
import { AnnouncementHubClient } from "./AnnouncementHubClient";

export default async function AnnouncementHubPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  return <AnnouncementHubClient announcement={announcement} />;
}
