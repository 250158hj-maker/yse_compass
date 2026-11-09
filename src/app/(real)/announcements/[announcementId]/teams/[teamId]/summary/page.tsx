import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, LateBadge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { getOccasion } from "@/lib/data/occasions";
import { SubmissionError } from "@/lib/data/submissions";
import { MAX_EXTRA_SECTIONS, getOwnSummary } from "@/lib/data/summaries";
import { getTeam } from "@/lib/data/teams";
import { formatDateTime } from "@/lib/format";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { SummaryForm } from "./SummaryForm";

// 対応: docs/design/04-screen.md SC-10（概要入力フォーム・S1）／docs/requirements.md §3-3。Issue #184（モックの画面を本番仕様にする）。
// データは data 層（getOccasion・getTeam・getOwnSummary・saveSummary の Action）、ユーザーは requireSessionUser から読む。
// 画面で権限や遅延の判定をしない。自チームでないときの拒否は関数（forbidden）が返し、遅延の印は関数が返す isLate をそのまま使う。
// 全部が空の保存の拒否・自由な欄の見出しの確認も関数が行う（画面では判定しない）。
// 入力項目は、モックの 5 項目（背景・動機／使用技術／起／結／1 ページ本文）ではなく、H-37 の先行方針（L2）と関数のとおり、
// はじめに・作品概要・開発環境・終わりに＋自由な欄（見出し＋本文・最大 MAX_EXTRA_SECTIONS 件）にする（04 の SC-10 は、入力項目を保留とし、モックは仮置き）。
// 欄の並びは、概要集の節の並び（05 の 5-2-3：はじめに・作品概要・自由な欄・開発環境・終わりに）に合わせる。
// 必須の印は付けない（関数は、全部が空でなければ受ける。必須の欄を決める決定行がまだ無い）。
// 追加:
//   - 保存できたら、「概要を提出しました。」（更新は「概要を更新しました。」）を出す。SC-09 と同じ形（docs/decisions.md 2026-11-06 の SC-09 の行を、SC-10 にも広げる）。
//   - 遅延の印（関数の isLate）。SC-09・SC-06 と同じ扱い。
// 含めない:
//   - 統一レイアウトのプレビュー：04 の SC-10 の「できること」にあるが、12/18 の範囲では目標に下げられている（Issue #174）。05 の 5-2 の確定待ち。
//   - 概要の画像：載せないことになった（Issue #174）。関数も扱わない（H-52・H-53）。
//   - 使用技術の「一覧から選ぶ形＋その他」（decisions.md 2026-10-22・T-3）：保存の型（summaries.tech_stack）と一覧の項目が決まっていない（06 の主担当に委ねられている）。関数は文章 1 つを受けるので、文章で入力する。
//   - 年度アーカイブ後の読み取り専用：アーカイブ済み年度の発表会は、生徒には「無い」と同じ結果で返るので、この画面に来られない。
// 入口：04 では SC-02（ホーム）に集約されている。SC-02 を置き換える PR で足すまで、この画面へは URL を直接開く。

export default async function SummaryPage({ params }: { params: Promise<{ announcementId: string; teamId: string }> }) {
  const { announcementId, teamId } = await params;
  const user = await requireSessionUser(`/announcements/${announcementId}/teams/${teamId}/summary`);
  // URL の ID は、形と integer の範囲を確かめてから DB に渡す（範囲外を渡すと Prisma が例外を投げ、500 になる）。
  const occasionId = parseId(announcementId);
  const teamIdNum = parseId(teamId);
  const actor = { userId: user.id, role: user.role };
  const occasion = occasionId !== null ? await getOccasion(prisma, actor, occasionId) : null;
  const team = teamIdNum !== null ? await getTeam(prisma, actor, teamIdNum) : null;
  if (!occasion || !team || teamIdNum === null) notFound();
  const title = `${occasion.kind}発表会`;

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "ホーム", href: "/" },
        { label: "発表会一覧", href: "/announcements" },
        { label: title, href: `/announcements/${occasion.id}` },
        { label: "概要入力" },
      ]}
    />
  );

  // 自チームの生徒でないとき（先生を含む）は、関数が forbidden で拒む。発表会とチームの組み合わせが合わないときは notFound にする。
  let summary;
  try {
    summary = await getOwnSummary(prisma, actor, teamIdNum, occasion.id);
  } catch (e) {
    if (e instanceof SubmissionError && e.code === "forbidden") {
      return (
        <div className="mx-auto max-w-2xl">
          {breadcrumbs}
          <PageHeader title="概要入力" meta={`${team.name} / ${title}`} />
          <div className="mt-6">
            <InlineNotice tone="warning">この操作は発表する生徒(自チームのメンバー)のみ行えます。</InlineNotice>
          </div>
          <Link href={`/announcements/${occasion.id}`} className="mt-6 inline-block text-sm text-brand-600 hover:underline">
            ← 発表会の詳細へ戻る
          </Link>
        </div>
      );
    }
    if (e instanceof SubmissionError && e.code === "occasion_not_found") notFound();
    throw e;
  }

  return (
    <div className="mx-auto max-w-2xl">
      {breadcrumbs}
      <PageHeader
        title="概要入力"
        meta={
          <>
            <span>{`${team.name} / ${title}`}</span>
            {summary && <Badge tone="emerald">提出済み</Badge>}
            {summary?.isLate && <LateBadge />}
          </>
        }
      />

      <div className="mt-4">
        <InlineNotice tone="info">概要はシステム統一レイアウトで概要集に束ねられます。フォント・レイアウトの個別調整はできません。</InlineNotice>
      </div>

      {summary && <p className="mt-2 text-xs text-slate-400">最終更新 {formatDateTime(summary.lastSubmittedAt.toISOString())}</p>}

      <SummaryForm
        teamId={teamIdNum}
        occasionId={occasion.id}
        maxExtraSections={MAX_EXTRA_SECTIONS}
        submitted={summary !== null}
        initial={{
          introduction: summary?.introduction ?? "",
          workOverview: summary?.workOverview ?? "",
          techStack: summary?.techStack ?? "",
          closing: summary?.closing ?? "",
          extraSections: summary?.extraSections ?? [],
        }}
      />

      <Link href={`/announcements/${occasion.id}`} className="mt-6 inline-block text-sm text-brand-600 hover:underline">
        ← 発表会の詳細へ戻る
      </Link>
    </div>
  );
}
