import { notFound } from "next/navigation";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { MaterialLink } from "@/components/ui/MaterialLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { requireSessionUser } from "@/lib/auth/session";
import { getOccasion } from "@/lib/data/occasions";
import { getPresentationDetail } from "@/lib/data/presentation-detail";
import { SubmissionError } from "@/lib/data/submissions";
import { getTeam } from "@/lib/data/teams";
import { formatDateTime } from "@/lib/format";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import type { AnnouncementPhase } from "@/lib/types";
import { isValidUrl } from "@/lib/url";

// 対応: docs/design/04-screen.md SC-12（発表詳細・チーム × 発表会）／docs/requirements.md §3-5。Issue #184（モックの画面を本番仕様にする）。第 1 段階。
// 見た目はモックのまま、データは data 層（getOccasion・getTeam・getPresentationDetail）、ユーザーは requireSessionUser から読む。画面で権限や公開の判定をしない。
// 公開前の資料を聴く生徒に返さない線引きは関数が持つ（forbidden）。拒否されたときは、案内だけを出す。
// 出すもの: 見出し（発表会・チーム名・作品名・クラス・リーダー・メンバー）、提出済みの資料のリンク（初回提出日時。締切後に差し替えがあれば最終更新日時。別タブで開く）、概要（いまは使用技術）。
// 含めない（関数がまだ無い、または列が無い）:
//   - コメント・返信・編集と削除・いいね（発表へのいいねを含む）：関数が無い（pm/wbs.md 3.3.3）。ボタンだけ置くと、押しても保存されない。関数ができたら、第 2 段階で足す。
//   - 作品の説明：DB に列が無い（H-49 の先行方針）。
//   - 概要の本文（はじめに・作品概要・自由な欄・終わりに）：getPresentationDetail の summary が、使用技術と日時だけを返す。蒲山さんに、本文も返す形を依頼した（Issue #184・2026-11-06）。返ってきたら足す。
//   - 資料の「未提出」の行：関数は、提出済みのリンクだけを返す（04 の SC-12 のとおり）。
// モックの 3 状態（閲覧不可・閲覧＋コメント・投稿＋返信）のうち、この段階では、閲覧不可と閲覧だけがある（コメントが無いため）。

export default async function PresentationDetailPage({ params }: { params: Promise<{ announcementId: string; teamId: string }> }) {
  const { announcementId, teamId } = await params;
  const user = await requireSessionUser(`/announcements/${announcementId}/teams/${teamId}`);
  // URL の ID は、形と integer の範囲を確かめてから DB に渡す（範囲外を渡すと Prisma が例外を投げ、500 になる）。
  const occasionId = parseId(announcementId);
  const teamIdNum = parseId(teamId);
  const actor = { userId: user.id, role: user.role };
  const occasion = occasionId !== null ? await getOccasion(prisma, actor, occasionId) : null;
  const team = teamIdNum !== null ? await getTeam(prisma, actor, teamIdNum) : null;
  if (!occasion || !team || teamIdNum === null) notFound();
  const title = `${occasion.kind}発表会`;
  const leader = team.members.find((m) => m.id === team.leaderMemberId);

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "ホーム", href: "/" },
        { label: "発表会一覧", href: "/announcements" },
        { label: title, href: `/announcements/${occasion.id}` },
        { label: team.name },
      ]}
    />
  );
  const header = (workTitle: string | null) => (
    <PageHeader
      eyebrow={title}
      title={workTitle ? `${team.name}(${workTitle})` : team.name}
      meta={
        <>
          <PhaseBadge phase={occasion.kind as AnnouncementPhase} />
          <Badge tone="slate">{team.class.name}</Badge>
          {leader && <span>リーダー: {leader.name}</span>}
        </>
      }
    />
  );

  // 公開前に聴く生徒が開いたときは、関数が forbidden で拒む。発表会とチームの組み合わせが合わないときは notFound にする。
  let detail;
  try {
    detail = await getPresentationDetail(prisma, actor, teamIdNum, occasion.id);
  } catch (e) {
    if (e instanceof SubmissionError && e.code === "forbidden") {
      return (
        <div className="mx-auto max-w-4xl">
          {breadcrumbs}
          {header(team.work?.title ?? null)}
          <div className="mt-6">
            <InlineNotice tone="info">資料は先生の公開操作後に閲覧できます。</InlineNotice>
          </div>
        </div>
      );
    }
    if (e instanceof SubmissionError && e.code === "occasion_not_found") notFound();
    throw e;
  }

  return (
    <div className="mx-auto max-w-4xl">
      {breadcrumbs}
      {header(detail.workTitle)}
      {detail.members.length > 0 && <p className="mt-3 text-sm text-slate-600">メンバー：{detail.members.join("、")}</p>}

      <section className="mt-6">
        <SectionHeading>資料</SectionHeading>
        {detail.links.length === 0 ? (
          <EmptyState message="まだ資料が提出されていません。" />
        ) : (
          <div className="flex flex-col gap-2">
            {detail.links.map((l) => (
              <div
                key={l.slotId}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900">{l.slotType}</span>
                  <span className="text-xs text-slate-400">
                    初回提出 {formatDateTime(l.firstSubmittedAt.toISOString())}
                    {l.lastUpdatedAt && `・最終更新 ${formatDateTime(l.lastUpdatedAt.toISOString())}`}
                  </span>
                </div>
                {/* 提出のときに https の URL だけを受けている（submissions.ts）が、リンクにする前にもう一度確かめる。 */}
                {isValidUrl(l.url) ? (
                  <MaterialLink href={l.url} className="text-sm text-brand-600 hover:underline">
                    資料を開く →
                  </MaterialLink>
                ) : (
                  <span className="text-xs text-slate-400">リンクを開けません</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {detail.summary && (
        <section id="summary" className="mt-8 scroll-mt-4">
          <SectionHeading>概要</SectionHeading>
          <Card>
            {detail.summary.techStack ? (
              <p className="text-sm leading-relaxed text-slate-700">使用技術：{detail.summary.techStack}</p>
            ) : (
              <p className="text-sm text-slate-400">使用技術は入力されていません。</p>
            )}
            <p className="mt-2 text-xs text-slate-400">最終提出 {formatDateTime(detail.summary.lastSubmittedAt.toISOString())}</p>
          </Card>
        </section>
      )}
    </div>
  );
}
