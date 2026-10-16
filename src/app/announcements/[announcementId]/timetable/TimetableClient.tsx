import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge } from "@/components/ui/Badge";
import { RoleGate } from "@/components/session/RoleGate";
import { TimetableRows } from "@/components/timetable/TimetableRows";
import type { Announcement, Timetable } from "@/lib/types";

export function TimetableClient({
  announcement: a,
  timetable,
}: {
  announcement: Announcement;
  timetable: Timetable | null;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "発表会一覧", href: "/announcements" },
          { label: a.title, href: `/announcements/${a.id}` },
          { label: "タイムテーブル" },
        ]}
      />
      <PageHeader
        eyebrow={a.title}
        title="タイムテーブル"
        meta={<PhaseBadge phase={a.phase} />}
        actions={
          <RoleGate allow={["teacher"]}>
            <Link
              href={`/announcements/${a.id}/timetable/edit`}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              編集する
            </Link>
          </RoleGate>
        }
      />

      <div className="mt-6">
        <TimetableRows timetable={timetable} announcementId={a.id} />
      </div>
    </div>
  );
}
