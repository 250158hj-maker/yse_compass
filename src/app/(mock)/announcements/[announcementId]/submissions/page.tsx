import { notFound } from "next/navigation";
import { getAnnouncementById } from "@/lib/mock";
import { SubmissionsMatrixClient } from "./SubmissionsMatrixClient";

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  return <SubmissionsMatrixClient announcement={announcement} />;
}
