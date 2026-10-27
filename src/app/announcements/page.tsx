import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { CardLink } from "@/components/ui/Card";
import { PhaseBadge, Badge } from "@/components/ui/Badge";
import { requireSessionUser } from "@/lib/auth/session";
import { getCurrentYearOccasions } from "@/lib/data/occasions";
import { prisma } from "@/lib/prisma";
import type { AnnouncementPhase } from "@/lib/types";

// 対応: docs/design/04-screen.md SC-03（発表会一覧・当年度・全員）／docs/requirements.md §3-1・§3-7。Issue #184（モックの画面を本番仕様にする）の 1 枚目。
// 見た目はモックのまま、データは data 層（getCurrentYearOccasions）、ユーザーは requireSessionUser から読む。画面で権限や集計の判定をしない。
// 含めない: 各件の「締切」（H-61 の決着で SC-03 に出さないことにした：docs/decisions.md 2026-10-23）、「提出状況サマリ」（同じ決着で定義した。取得層にまだ無く、3.2.3 で足す。足すまでは出さない）。
// 「＋新規作成」は置かない：発表会は年度セットアップだけが作る（§3-1）。
// 発表会の名前は、種別（企画／設計／試作／最終）から作る表示で、正式な名前は決まっていない。
// 遷移先は、SC-04 が置き換わるまでの間、本実装の /real/announcements/[id] にする（モックの SC-04 は、モックの ID でしか開けないため）。

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

// 開催日は date 型（タイムゾーンを持たない）。Date の UTC の日付をそのまま読んで、実行環境のタイムゾーンで日付がずれないようにする。
const dateFormatter = new Intl.DateTimeFormat("ja-JP", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });

export default async function AnnouncementsPage() {
  const user = await requireSessionUser("/announcements");
  const current = await getCurrentYearOccasions(prisma, { userId: user.id, role: user.role });

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "発表会一覧" }]} />
      <PageHeader title="発表会一覧" meta={current ? `${current.fiscalYear.year}年度` : undefined} />

      {!current ? (
        <div className="mt-6">
          <InlineNotice tone="warning">
            当年度の発表会がありません。発表会は、年度を開始すると作られます。
            {user.role === "teacher" && (
              <>
                {" "}
                <Link href="/real/years" className="font-medium underline">
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
              href={`/real/announcements/${o.id}`}
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
                  <dd>{o.eventDate ? dateFormatter.format(o.eventDate) : "未定"}</dd>
                </div>
              </dl>
            </CardLink>
          ))}
        </div>
      )}
    </div>
  );
}
