import { notFound } from "next/navigation";
import { getAnnouncementById, getSubmissionsForAnnouncement } from "@/lib/mock";
import SubmissionsMatrixClient from "./SubmissionsMatrixClient";

export default async function SubmissionsMatrixPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  const entries = getSubmissionsForAnnouncement(announcementId);

  return <SubmissionsMatrixClient announcement={announcement} entries={entries} />;
}
