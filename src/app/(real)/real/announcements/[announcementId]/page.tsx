import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { getOccasion } from "@/lib/data/occasions";
import { listMaterialSlots } from "@/lib/data/slots";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

// 対応: docs/design/04-screen.md SC-04（発表会詳細）の、発表会の概要（種別・日程・公開状態）と、先生だけに出す資料枠の一覧。
// 生徒には資料枠を出さない（SC-04）。アーカイブ済みの年度の発表会は、生徒には出ない（getOccasion の線引き）。
// 含めない: 概要の「締切」（H-61 の決着で SC-04 の概要に出さないことにした：docs/decisions.md 2026-10-23）、公開／公開解除、提出状況一覧・発表会編集・概要集生成への導線、タイムテーブル、発表（チーム）一覧（画面・未決が先）。

// 開催日は date 型（タイムゾーンを持たない）なので UTC の日付をそのまま読む。締切は絶対時刻なので、日本時間で整形する（H-39 の決着）。
const dateFormatter = new Intl.DateTimeFormat("ja-JP", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
const deadlineFormatter = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

// テンプレート参照は、書くときに http(s) だけを受けている（slots.ts）が、リンクにする前にもう一度確かめる。
function openableUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export default async function RealAnnouncementDetailPage({ params }: { params: Promise<{ announcementId: string }> }) {
  const { announcementId } = await params;
  const user = await requireSessionUser(`/real/announcements/${announcementId}`);
  // URL の ID は、形と integer の範囲を確かめてから DB に渡す（範囲外を渡すと Prisma が例外を投げ、500 になる）。
  const id = parseId(announcementId);
  const actor = { userId: user.id, role: user.role };
  const occasion = id !== null ? await getOccasion(prisma, actor, id) : null;
  if (!occasion) notFound();
  const slots = user.role === "teacher" ? await listMaterialSlots(prisma, actor, occasion.id) : null;

  return (
    <div>
      <div className="mb-3 text-sm">
        <Link href="/real/announcements" className="text-brand-700 underline">
          発表会一覧
        </Link>
      </div>
      <PageHeader
        title={occasion.kind}
        meta={
          <>
            <span>{occasion.fiscalYear.year}年度</span>
            <Badge tone={occasion.isPublished ? "emerald" : "slate"}>{occasion.isPublished ? "公開中" : "非公開"}</Badge>
          </>
        }
      />
      <div className="mt-6 space-y-6">
        {occasion.fiscalYear.isArchived && <InlineNotice tone="warning">この年度はアーカイブ済みです。</InlineNotice>}

        <Card>
          <dl className="flex items-center gap-2 text-sm text-slate-500">
            <dt className="text-slate-400">日程</dt>
            <dd>{occasion.eventDate ? dateFormatter.format(occasion.eventDate) : "未定"}</dd>
          </dl>
        </Card>

        {slots && (
          <Card>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">資料枠</h2>
            <p className="mb-4 text-xs text-slate-400">先生だけに表示されます。</p>
            {slots.length === 0 ? (
              <p className="text-sm text-slate-500">資料枠がありません。</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {slots.map((s) => {
                  const template = openableUrl(s.templateUrl);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                      <span className="min-w-24 font-medium text-slate-900">{s.slotType}</span>
                      <Badge tone={s.isRequired ? "rose" : "slate"}>{s.isRequired ? "必須" : "任意"}</Badge>
                      <span className="text-slate-500">締切 {s.deadline ? deadlineFormatter.format(s.deadline) : "未設定"}</span>
                      {template && (
                        <a href={template} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                          テンプレート
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
