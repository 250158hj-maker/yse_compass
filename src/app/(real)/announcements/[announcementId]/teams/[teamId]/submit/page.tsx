import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { getOccasion } from "@/lib/data/occasions";
import { SubmissionError, listTeamSubmissions } from "@/lib/data/submissions";
import { getTeam } from "@/lib/data/teams";
import { formatDateTime } from "@/lib/format";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { isValidUrl } from "@/lib/url";
import { SubmitCard } from "./SubmitCard";

// 対応: docs/design/04-screen.md SC-09（資料提出フォーム・S1）／docs/requirements.md §3-4。Issue #184（モックの画面を本番仕様にする）。
// 見た目はモックのまま、データは data 層（getOccasion・getTeam・listTeamSubmissions・submitMaterial の Action）、ユーザーは requireSessionUser から読む。
// 画面で権限や遅延の判定をしない。自チームでないときの拒否は関数（forbidden）が返し、遅延の警告は関数が返す warnLate をそのまま使う。
// リンクの形式の確認も関数が行う（画面では確認しない）。
// モックとの違い:
//   - 見出しの「締切」は出さない（H-61 の決着：発表会の締切は出さず、締切は資料枠ごと。docs/decisions.md 2026-10-23）。各資料枠のカードに、その枠の締切を出す。
//   - 「戻る」は、ブラウザの戻るではなく、発表会詳細へのリンクにする（止まる場所を決める）。
// 追加:
//   - 保存できたら、カードに「提出しました。」（差し替えは「リンクを保存しました。」）を出す。水戸さんの提案（#184・2026-11-06）で、04 の SC-09 には書かれていない。04 への追記は別の PR。
// 含めない:
//   - 「最終更新日時」の併記：締切後に差し替えたかを返す値が、関数から返らない。画面で計算しない。
//   - 年度アーカイブ後の読み取り専用：アーカイブ済み年度の発表会は、生徒には「無い」と同じ結果で返る（getOccasion の線引き）ので、この画面に来られない。
//   - 概要の枠：listTeamSubmissions が概要枠を除いて返す。概要は SC-10 で入力する。
// 入口：04 では SC-02（ホーム）に集約されている。ホームの資料枠のカードの「プレゼン資料を提出」ボタンから来る（SC-02 を本実装に置き換えた PR で足した）。

export default async function SubmitPage({ params }: { params: Promise<{ announcementId: string; teamId: string }> }) {
  const { announcementId, teamId } = await params;
  const user = await requireSessionUser(`/announcements/${announcementId}/teams/${teamId}/submit`);
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
        { label: "資料提出" },
      ]}
    />
  );
  const backLink = (
    <Link href={`/announcements/${occasion.id}`} className="mt-6 inline-block text-sm text-brand-600 hover:underline">
      ← 発表会の詳細へ戻る
    </Link>
  );

  // 自チームの生徒でないときは、関数が forbidden で拒む。発表会とチームの組み合わせが合わないときは notFound にする。
  let slots;
  try {
    slots = await listTeamSubmissions(prisma, actor, teamIdNum, occasion.id);
  } catch (e) {
    if (e instanceof SubmissionError && e.code === "forbidden") {
      return (
        <div className="mx-auto max-w-2xl">
          {breadcrumbs}
          <PageHeader title="資料提出" meta={`${team.name} / ${title}`} />
          <div className="mt-6">
            <InlineNotice tone="warning">この操作は発表する生徒(自チームのメンバー)のみ行えます。</InlineNotice>
          </div>
          {backLink}
        </div>
      );
    }
    if (e instanceof SubmissionError && e.code === "occasion_not_found") notFound();
    throw e;
  }

  return (
    <div className="mx-auto max-w-2xl">
      {breadcrumbs}
      <PageHeader title="資料提出" meta={`${team.name} / ${title}`} />

      <div className="mt-4">
        <InlineNotice tone="info">締切を過ぎても提出・差し替えできます。</InlineNotice>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {slots.length === 0 ? (
          <InlineNotice tone="info">この発表会には、提出する資料枠がありません。</InlineNotice>
        ) : (
          slots.map((s) => (
            <SubmitCard
              key={s.id}
              teamId={teamIdNum}
              slot={{
                id: s.id,
                slotType: s.slotType,
                isRequired: s.isRequired,
                deadlineText: s.deadline ? formatDateTime(s.deadline.toISOString()) : null,
                // テンプレート参照は、書くときに http(s) だけを受けている（slots.ts）が、リンクにする前にもう一度確かめる。
                templateUrl: s.templateUrl && isValidUrl(s.templateUrl) ? s.templateUrl : null,
                submission: s.submission
                  ? { url: s.submission.url, firstSubmittedText: formatDateTime(s.submission.firstSubmittedAt.toISOString()), isLate: s.submission.isLate }
                  : null,
                warnLate: s.warnLate,
              }}
            />
          ))
        )}
      </div>

      {backLink}
    </div>
  );
}
