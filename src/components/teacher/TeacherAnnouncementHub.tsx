"use client";

import { usePublish, useTimetable } from "@/context/TeacherDemoContext";
import { getYearById, getTeamsByYear } from "@/lib/mock";
import { formatDate, formatDateTime } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { WorkflowSteps } from "@/components/teacher/WorkflowSteps";
import { AnnouncementTeamList } from "@/components/announcement/AnnouncementTeamList";
import { PERIOD_TONE } from "@/components/teacher/teacher-format";
import type { Announcement } from "@/lib/types";

// ハブ(SC-04)の先生の画面。編集する対象ごとの導線ではなく、発表会の時期に沿った工程表を中心に置く。
// 公開(§3-3)は工程表の ⑥ に移し、usePublish に繋いで画面を移っても戻らないようにした。
// 資料枠の一覧(SC-04【T のみ】)は工程 ① の要約に畳んだ(1 画面に収めるため)。
// 1 画面に収める目安:ビューポート 1152×620(1440×900 のウィンドウを 125% にした相当で、タブ・アドレスバーを除いた高さ)で、
// ①〜⑥ がスクロールなしに見えること。そのため見出しの年度(eyebrow)を属性の並びへ移し、属性の並びを見出しの右
// (PageHeader の actions)に置いて 1 行に収め、工程表の枠と行の縦の余白を詰めている。
// 工程表は先生が「足す」部分で、聴く生徒の土台(発表一覧 → 発表詳細 SC-12)を引かない。発表一覧は工程表の下に、
// 生徒のハブと同じ部品(AnnouncementTeamList)・同じ見出し・同じ並び(getTeamsByYear)で置く(1 画面の目安の外でよい)。
// 生徒は非公開のあいだ一覧の代わりに案内を見るが、先生は公開前でも発表詳細を見られる(04-screen.md §4-4 SC-12 の T は ◎)ので、
// 公開状態に関わらず出す。
export function TeacherAnnouncementHub({ announcement: a }: { announcement: Announcement }) {
  const year = getYearById(a.yearId);
  const { period } = useTimetable(a.id);
  const { isPublished } = usePublish(a.id);
  const teams = getTeamsByYear(a.yearId);

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
        title={a.title}
        actions={
          // PageHeader の meta と同じ見た目(text-sm text-slate-500)。見出しの文字の高さに合わせて少し下げる。
          <div className="flex flex-wrap items-center gap-2 pt-1.5 text-sm text-slate-500">
            {year && <span>{year.label}</span>}
            <PhaseBadge phase={a.phase} />
            <span>開催日 {formatDate(a.period)}</span>
            <span>提出締切 {formatDateTime(a.submissionDeadline)}</span>
            <Badge tone={PERIOD_TONE[period]}>{period}</Badge>
            <Badge tone={isPublished ? "emerald" : "slate"}>{isPublished ? "公開中" : "非公開"}</Badge>
          </div>
        }
      />

      <section className="mt-4">
        <SectionHeading action={<span className="text-xs text-slate-400">どの工程からでも開けます</span>}>
          工程表
        </SectionHeading>
        {/* Card と同じ見た目で、余白だけ p-5 → p-3 に詰める(Card の p-5 は className で上書きできないため div で書く) */}
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-900/5">
          <WorkflowSteps announcement={a} />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading>発表一覧</SectionHeading>
        <AnnouncementTeamList announcementId={a.id} teams={teams} />
      </section>
    </div>
  );
}
