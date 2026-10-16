import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge } from "@/components/ui/Badge";
import { RoleGate } from "@/components/session/RoleGate";
import { TimetableRows } from "@/components/timetable/TimetableRows";
import type { Announcement, Timetable } from "@/lib/types";
import { TeacherTimetableClient } from "./TeacherTimetableClient";

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

      {/* 先生は当日の進行(発表中・次の発表へ・当日の入れ替え)を行う。生徒の描画は従来のまま(fallback)。 */}
      <RoleGate
        allow={["teacher"]}
        fallback={
          <div className="mt-6">
            <TimetableRows timetable={timetable} announcementId={a.id} />
          </div>
        }
      >
        <TeacherTimetableClient announcement={a} />
      </RoleGate>
    </div>
  );
}
