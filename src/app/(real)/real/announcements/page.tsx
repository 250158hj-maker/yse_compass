import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { getCurrentYearOccasions } from "@/lib/data/occasions";
import { prisma } from "@/lib/prisma";

// 対応: docs/design/04-screen.md SC-03（発表会一覧・当年度・全員）／docs/requirements.md §3-1・§3-7。
// 先行方針: H-54（当年度は、未アーカイブの年度のうち year が最大のもの）。アーカイブ済みの年度は出さない（SC-03 のできないこと・§3-7）。
// 含めない: 各件の「締切」（H-61 の決着で SC-03 に出さないことにした：docs/decisions.md 2026-10-23）、「提出状況サマリ」（同じ決着で定義した。取得層にまだ無く、3.2.3 で足す）、発表会詳細（SC-04）への遷移（画面がまだ無い）。
// 「＋新規作成」は置かない：発表会は年度セットアップだけが作る（§3-1）。
//
// 開催日は date 型（タイムゾーンを持たない）。Date の UTC の日付をそのまま読んで、実行環境のタイムゾーンで日付がずれないようにする。
const dateFormatter = new Intl.DateTimeFormat("ja-JP", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });

export default async function RealAnnouncementsPage() {
  const user = await requireSessionUser("/real/announcements");
  const current = await getCurrentYearOccasions(prisma, { userId: user.id, role: user.role });

  if (!current) {
    return (
      <div>
        <PageHeader title="発表会一覧" />
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
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="発表会一覧" meta={<span>{current.fiscalYear.year}年度</span>} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {current.occasions.map((o) => (
          <Card key={o.id}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{o.kind}</h2>
              <Badge tone={o.isPublished ? "emerald" : "slate"}>{o.isPublished ? "公開中" : "非公開"}</Badge>
            </div>
            <dl className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <dt className="text-slate-400">日程</dt>
              <dd>{o.eventDate ? dateFormatter.format(o.eventDate) : "未定"}</dd>
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
