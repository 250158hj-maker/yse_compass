import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { requireSessionUser } from "@/lib/auth/session";
import { getOccasion } from "@/lib/data/occasions";
import { listOccasionPresentations } from "@/lib/data/presentation-list";
import { listMaterialSlots } from "@/lib/data/slots";
import { formatDateTime, formatOccasionDate } from "@/lib/format";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import type { AnnouncementPhase } from "@/lib/types";
import { PublishToggle } from "./PublishToggle";

// 対応: docs/design/04-screen.md SC-04（発表会詳細）。Issue #184（モックの画面を本番仕様にする）の 2 枚目。
// 見た目はモックのまま、データは data 層（getOccasion・listMaterialSlots・listOccasionPresentations）、ユーザーは requireSessionUser から読む。画面で権限や集計の判定をしない。
// 出すもの: 発表会の概要（種別・開催日・公開状態）、先生だけに出す資料枠の一覧と公開・公開解除、発表（チーム）一覧。生徒には資料枠を出さない（SC-04）。
// 発表（チーム）一覧は listOccasionPresentations の結果をそのまま写す。一覧を出すか、公開前の案内に切り替えるかの判定は関数が持つ（生徒には、公開前は一覧を返さない）。
// 含めない:
//   - 「提出締切」（H-61 の決着で SC-04 の概要に出さないことにした：docs/decisions.md 2026-10-23。締切は資料枠ごとに、先生の一覧で見る）。
//   - 工程表と「いまここ」（H-47 の先行方針：H-44 の決着まで本実装に出さない。モックの先生のハブにある）。
//   - 先生の導線のうち、発表会編集・タイムテーブル編集・概要集生成・タイムテーブルでの進行（04 SC-04 の共通）：行き先の画面が本実装に置き換わるたびに、その PR で足す。提出状況一覧（SC-06）への導線は、SC-06 を置き換えた PR で、見出しの右のボタンとして足した（先生だけ）。
// 追加：全員向けのタイムテーブル（SC-07）へのボタンを、見出しの右に置いた（SC-07 を本実装に置き換えた PR で足した。04 の SC-04 の共通）。
// 追加：発表（チーム）一覧の各行は、発表詳細（SC-12）へのリンクにした（SC-12 を本実装に置き換えた PR で、モックの見た目の押せるカードに戻した）。
// 発表会の名前は、種別（企画／設計／試作／最終）から作る表示で、正式な名前は決まっていない（H-63 の決着まで）。

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

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ announcementId: string }> }) {
  const { announcementId } = await params;
  const user = await requireSessionUser(`/announcements/${announcementId}`);
  // URL の ID は、形と integer の範囲を確かめてから DB に渡す（範囲外を渡すと Prisma が例外を投げ、500 になる）。
  const id = parseId(announcementId);
  const actor = { userId: user.id, role: user.role };
  // アーカイブ済みの年度の発表会は、生徒には「無い」と同じ結果で返る（getOccasion の線引き）。
  const occasion = id !== null ? await getOccasion(prisma, actor, id) : null;
  if (!occasion) notFound();
  const isTeacher = user.role === "teacher";
  const slots = isTeacher ? await listMaterialSlots(prisma, actor, occasion.id) : null;
  const presentations = await listOccasionPresentations(prisma, actor, occasion.id);
  const title = `${occasion.kind}発表会`;

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "発表会一覧", href: "/announcements" }, { label: title }]} />
      <PageHeader
        eyebrow={`${occasion.fiscalYear.year}年度`}
        title={title}
        meta={
          <>
            <PhaseBadge phase={occasion.kind as AnnouncementPhase} />
            <span>開催日 {occasion.eventDate ? formatOccasionDate(occasion.eventDate) : "未定"}</span>
            <Badge tone={occasion.isPublished ? "emerald" : "slate"}>{occasion.isPublished ? "公開中" : "非公開"}</Badge>
          </>
        }
        actions={
          <>
            <Link href={`/announcements/${occasion.id}/timetable`} className={buttonClassName("secondary")}>
              タイムテーブル
            </Link>
            {isTeacher && (
              <>
                <Link href={`/announcements/${occasion.id}/submissions`} className={buttonClassName("secondary")}>
                  提出状況一覧
                </Link>
                <PublishToggle occasionId={occasion.id} isPublished={occasion.isPublished} />
              </>
            )}
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-6">
        {occasion.fiscalYear.isArchived && <InlineNotice tone="warning">この年度はアーカイブ済みです。</InlineNotice>}

        {slots && (
          <section>
            <SectionHeading>資料枠（先生だけに表示されます）</SectionHeading>
            {slots.length === 0 ? (
              <InlineNotice tone="info">資料枠がありません。</InlineNotice>
            ) : (
              <Card>
                <ul className="divide-y divide-slate-100">
                  {slots.map((s) => {
                    const template = openableUrl(s.templateUrl);
                    return (
                      <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                        <span className="min-w-24 font-medium text-slate-900">{s.slotType}</span>
                        <Badge tone={s.isRequired ? "rose" : "slate"}>{s.isRequired ? "必須" : "任意"}</Badge>
                        <span className="text-slate-500">締切 {s.deadline ? formatDateTime(s.deadline.toISOString()) : "未設定"}</span>
                        {template && (
                          <a href={template} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                            テンプレート
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </section>
        )}

        <section>
          <SectionHeading>発表一覧</SectionHeading>
          {presentations.kind === "not_published" ? (
            <InlineNotice tone="info">資料は先生の公開操作後に閲覧できます。</InlineNotice>
          ) : presentations.presentations.length === 0 ? (
            <InlineNotice tone="info">発表するチームがまだ登録されていません。</InlineNotice>
          ) : (
            <div className="flex flex-col gap-2">
              {presentations.presentations.map((p) => (
                <Link
                  key={p.teamId}
                  href={`/announcements/${occasion.id}/teams/${p.teamId}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300"
                >
                  {p.workTitle ? `${p.teamName}(${p.workTitle})` : p.teamName}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
