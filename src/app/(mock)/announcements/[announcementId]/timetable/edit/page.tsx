import { notFound } from "next/navigation";
import { getAnnouncementById } from "@/lib/mock";
import { TimetableEditClient } from "./TimetableEditClient";

export default async function TimetableEditPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = getAnnouncementById(announcementId);
  if (!announcement) notFound();

  // 並びは先生の共有状態(useTimetable)から読む。初期値はモックのタイムテーブル。
  return <TimetableEditClient announcement={announcement} />;
}
