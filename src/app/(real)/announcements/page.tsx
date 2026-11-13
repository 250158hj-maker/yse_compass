import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { CardLink } from "@/components/ui/Card";
import { PhaseBadge, Badge } from "@/components/ui/Badge";
import { requireSessionUser } from "@/lib/auth/session";
import { getCurrentYearOccasions } from "@/lib/data/occasions";
import { getSubmissionSummaries } from "@/lib/data/submission-summary";
import { formatOccasionDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { SUBMISSION_SUMMARY_HINT, submissionSummaryText } from "@/lib/submission-summary-text";
import type { AnnouncementPhase } from "@/lib/types";

// 対応: docs/design/04-screen.md SC-03（発表会一覧・当年度・全員）／docs/requirements.md §3-1・§3-7。Issue #184（モックの画面を本番仕様にする）の 1 枚目。
// 見た目はモックのまま、データは data 層（getCurrentYearOccasions・getSubmissionSummaries）、ユーザーは requireSessionUser から読む。画面で権限や集計の判定をしない。
// 各件に、提出状況サマリ（必須の資料がすべて提出済みのチームの数／全チームの数。docs/decisions.md 2026-10-23・H-61、2026-10-30・H-66 の ②）を出す。先生と、チームを持つ生徒だけ。数えられないとき（チーム 0 件・必須の資料枠が 0 件）は、数を出さず、理由を示す。文言は lib/submission-summary-text.ts（SC-02（先生）と共通）。
// 含めない: 各件の「締切」（H-61 の決着で SC-03 に出さないことにした：docs/decisions.md 2026-10-23）。
// 「＋新規作成」は置かない：発表会は年度セットアップだけが作る（§3-1）。
// 発表会の名前は、種別（企画／設計／試作／最終）から作る表示で、正式な名前は決まっていない（H-63 の決着まで）。SC-04 の見出しも、同じ作り方にそろえてある。

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-4 w-4 shrink-0",
  "aria-hidden": true,
} as const;

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  );
}

export default async function AnnouncementsPage() {
  const user = await requireSessionUser("/announcements");
  const actor = { userId: user.id, role: user.role };
  const current = await getCurrentYearOccasions(prisma, actor);
  // 提出状況サマリ。先生と、当年度のチームを持つ生徒にだけ返る（それ以外は null）。数える・0 件かどうかの判定は関数が行い、画面は結果を写すだけ。
  const summaries = current ? await getSubmissionSummaries(prisma, actor) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "発表会一覧" }]} />
      <PageHeader title="発表会一覧" meta={current ? `${current.fiscalYear.year}年度` : undefined} />

      {!current || current.occasions.length === 0 ? (
        <div className="mt-6">
          <InlineNotice tone="warning">
            当年度の発表会がありません。発表会は、年度を開始すると作られます。
            {user.role === "teacher" && (
              <>
                {" "}
                <Link href="/admin/years" className="font-medium underline">
                  年度管理へ
                </Link>
              </>
            )}
          </InlineNotice>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {current.occasions.map((o) => (
            <CardLink
              key={o.id}
              href={`/announcements/${o.id}`}
              className="shadow-sm shadow-slate-900/5 hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-500/20"
            >
              <div className="flex items-center justify-between">
                <PhaseBadge phase={o.kind as AnnouncementPhase} />
                <Badge tone={o.isPublished ? "emerald" : "slate"}>{o.isPublished ? "公開中" : "非公開"}</Badge>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-900">{o.kind}発表会</p>
              <dl className="mt-3 space-y-1.5 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <dt className="flex items-center gap-1.5 text-slate-400">
                    <CalendarIcon />
                    開催日
                  </dt>
                  <dd>{o.eventDate ? formatOccasionDate(o.eventDate) : "未定"}</dd>
                </div>
              </dl>
              {summaries?.some((s) => s.occasionId === o.id) && (
                <p className="mt-2 text-sm text-slate-700" title={SUBMISSION_SUMMARY_HINT}>
                  {submissionSummaryText(summaries.find((s) => s.occasionId === o.id))}
                </p>
              )}
            </CardLink>
          ))}
        </div>
      )}
    </div>
  );
}
