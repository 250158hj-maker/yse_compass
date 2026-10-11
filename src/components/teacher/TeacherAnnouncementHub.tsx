"use client";

import { usePublish, useTimetable } from "@/context/TeacherDemoContext";
import { getYearById } from "@/lib/mock";
import { formatDate, formatDateTime } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { WorkflowSteps } from "@/components/teacher/WorkflowSteps";
import { PERIOD_TONE } from "@/components/teacher/teacher-format";
import type { Announcement } from "@/lib/types";

// ハブ(SC-04)の先生の画面。編集する対象ごとの導線ではなく、発表会の時期に沿った工程表を中心に置く。
// 公開(§3-3)は工程表の ⑥ に移し、usePublish に繋いで画面を移っても戻らないようにした。
// 資料枠の一覧(SC-04【T のみ】)は工程 ① の要約に畳んだ(1 画面に収めるため)。
export function TeacherAnnouncementHub({ announcement: a }: { announcement: Announcement }) {
  const year = getYearById(a.yearId);
  const { period } = useTimetable(a.id);
  const { isPublished } = usePublish(a.id);

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "発表会一覧", href: "/announcements" },
          { label: a.title },
        ]}
      />
      <PageHeader
        eyebrow={year?.label}
        title={a.title}
        meta={
          <>
            <PhaseBadge phase={a.phase} />
            <span>開催日 {formatDate(a.period)}</span>
            <span>提出締切 {formatDateTime(a.submissionDeadline)}</span>
            <Badge tone={PERIOD_TONE[period]}>{period}</Badge>
            <Badge tone={isPublished ? "emerald" : "slate"}>{isPublished ? "公開中" : "非公開"}</Badge>
          </>
        }
      />

      <section className="mt-6">
        <SectionHeading action={<span className="text-xs text-slate-400">どの工程からでも開けます</span>}>
          工程表
        </SectionHeading>
        <Card className="shadow-sm shadow-slate-900/5">
          <WorkflowSteps announcement={a} />
        </Card>
      </section>
    </div>
  );
}
