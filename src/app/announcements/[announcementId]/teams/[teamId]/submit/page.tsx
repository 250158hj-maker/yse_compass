import { notFound } from "next/navigation";
import { getAnnouncementById, getSubmission, getTeamById } from "@/lib/mock";
import SubmitFormClient from "./SubmitFormClient";

export default async function SubmitFormPage({
  params,
}: {
  params: Promise<{ announcementId: string; teamId: string }>;
}) {
  const { announcementId, teamId } = await params;
  const announcement = getAnnouncementById(announcementId);
  const team = getTeamById(teamId);
  const submission = getSubmission(announcementId, teamId);
  if (!announcement || !team || !submission) notFound();

  return <SubmitFormClient announcement={announcement} team={team} submission={submission} />;
}
