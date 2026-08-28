import { notFound } from "next/navigation";
import { getAnnouncementById } from "@/lib/mock";
import { SummaryBookletClient } from "./SummaryBookletClient";

export default async function SummaryBookletPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  return <SummaryBookletClient announcement={announcement} />;
}
