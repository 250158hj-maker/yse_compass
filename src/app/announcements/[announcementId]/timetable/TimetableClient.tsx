import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/session/RoleGate";
import { getTeamById } from "@/lib/mock";
import type { Announcement, Timetable } from "@/lib/types";

export function TimetableClient({
  announcement: a,
  timetable,
}: {
  announcement: Announcement;
  timetable: Timetable | null;
}) {
  const slots = timetable ? [...timetable.slots].sort((x, y) => x.order - y.order) : [];

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
        {slots.length === 0 ? (
          <EmptyState message="タイムテーブルはまだ作成されていません。" />
        ) : (
          <div className="flex flex-col gap-2">
            {slots.map((slot) => {
              const isCurrent = !slot.isBreak && slot.teamId === timetable?.currentPresentingTeamId;
              const team = !slot.isBreak ? getTeamById(slot.teamId) : null;
              return (
                <div
                  key={slot.id}
                  className={`flex items-center justify-between rounded-lg border p-4 ${
                    isCurrent ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
                  } ${slot.isBreak ? "opacity-70" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-sm font-medium text-slate-500">{slot.startTime}</span>
                    <span className="font-medium text-slate-900">
                      {slot.isBreak ? slot.breakLabel : team?.name ?? "(不明なチーム)"}
                    </span>
                    {!slot.isBreak && team && <span className="text-sm text-slate-400">{team.projectTitle}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{slot.durationMin}分</span>
                    {isCurrent && <Badge tone="rose">発表中</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
