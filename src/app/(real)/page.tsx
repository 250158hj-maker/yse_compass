import Link from "next/link";
import { Badge, LateBadge, PhaseBadge, StatusBadge } from "@/components/ui/Badge";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { MaterialLink } from "@/components/ui/MaterialLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { requireSessionUser } from "@/lib/auth/session";
import { getCurrentYearOccasions } from "@/lib/data/occasions";
import { listOwnSlots } from "@/lib/data/own-slots";
import { getOwnTeam } from "@/lib/data/own-team";
import { getSubmissionSummaries } from "@/lib/data/submission-summary";
import { getTimetable } from "@/lib/data/timetable";
import { formatDateTime, formatOccasionDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { SUBMISSION_SUMMARY_HINT, submissionSummaryText } from "@/lib/submission-summary-text";
import type { AnnouncementPhase } from "@/lib/types";
import { isValidUrl } from "@/lib/url";

// 対応: docs/design/04-screen.md SC-02（ホーム）／docs/decisions.md 2026-10-09（提出する生徒の導線はホームに集約）・2026-10-10（H-34）・2026-10-30（H-66 の②）。Issue #184（モックの画面を本番仕様にする）。
// データは data 層（getCurrentYearOccasions・getOwnTeam・listOwnSlots・getSubmissionSummaries・getTimetable）、ユーザーは requireSessionUser から読む。
// 画面で、自チームの探索・遅延・必須の未提出・提出率・「いま発表中」の判定をしない（関数が返す値をそのまま写す）。
// 出すもの:
//   - 生徒（自チームに結びついている人）: 自チーム、発表会ごとのカード（資料枠の行〔概要の枠を含む。必須／任意・締切・提出状況・遅延・締切超過・必須の未提出の強調・締切後に差し替えたときの最終更新・テンプレート〕と、「プレゼン資料を提出」「概要を入力」の 2 ボタン）。
//   - 生徒（結びついていない人）: 結びつけを先生に頼む案内と、発表会一覧へのリンク。
//   - 先生: 発表会ごとの提出率（SC-03 と同じ関数の結果）と、発表会一覧・チーム一覧・年度管理への導線。
//   - 全員: 「いま発表中のチーム」（current_presentation_id が設定されている発表会について。H-44 の先行方針）。行き先は発表詳細（SC-12）。
// 含めない（関数が無い、または数え方・規則が未決）:
//   - 「必須枠の未提出 N件」の集計と、締切間近・未提出の残数・先生の「次にやること」（H-66 の①・H-47 の先行方針：実装しない）。
//   - 直近の発表会への導線：「直近」の決め方が資料に無い。発表会一覧（SC-03）への導線で代える。
//   - 先生の「タイムテーブルを見る」（SC-07）と、公開・アーカイブ操作への直接の導線：行き先の画面が本実装に置き換わるたびに、その PR で足す。
//   - 発表会の状態（締切後など）によるボタンの無効化：04 が決めていない。

function OccasionCardHeader({ kind, eventDate }: { kind: string; eventDate: Date | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <PhaseBadge phase={kind as AnnouncementPhase} />
        <span className="font-semibold text-slate-900">{kind}発表会</span>
      </div>
      <span className="text-xs text-slate-500">開催日 {eventDate ? formatOccasionDate(eventDate) : "未定"}</span>
    </div>
  );
}

export default async function HomePage() {
  const user = await requireSessionUser("/");
  const actor = { userId: user.id, role: user.role };
  const isTeacher = user.role === "teacher";
  const current = await getCurrentYearOccasions(prisma, actor);

  const header = <PageHeader title="ホーム" meta={current ? `${current.fiscalYear.year}年度` : undefined} />;

  if (!current || current.occasions.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        {header}
        <div className="mt-6">
          <InlineNotice tone="warning">
            当年度の発表会がありません。発表会は、年度を開始すると作られます。
            {isTeacher && (
              <>
                {" "}
                <Link href="/admin/years" className="font-medium underline">
                  年度管理へ
                </Link>
              </>
            )}
          </InlineNotice>
        </div>
      </div>
    );
  }

  // 「いま発表中のチーム」。current_presentation_id が設定されている発表会について出す（H-44 の先行方針）。
  const timetables = await Promise.all(current.occasions.map((o) => getTimetable(prisma, actor, o.id)));
  const nowPresenting = current.occasions.flatMap((o, i) => {
    const row = timetables[i].rows.find((r) => r.isCurrent);
    return row ? [{ occasion: o, row }] : [];
  });

  const own = isTeacher ? null : await getOwnTeam(prisma, actor);
  const summaries = isTeacher ? await getSubmissionSummaries(prisma, actor) : null;

  return (
    <div className="mx-auto max-w-4xl">
      {header}

      {nowPresenting.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {nowPresenting.map(({ occasion, row }) => (
            <div
              key={occasion.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4"
            >
              <p className="text-sm font-medium text-rose-700">
                いま発表中：{row.teamName}（{occasion.kind}発表会）
              </p>
              <Link href={`/announcements/${occasion.id}/teams/${row.teamId}`} className={buttonClassName("primary")}>
                発表を見る
              </Link>
            </div>
          ))}
        </div>
      )}

      {own?.kind === "unlinked" && (
        <div className="mt-6 flex flex-col gap-3">
          <InlineNotice tone="info">まだチームに結びついていません。先生に、結びつけを依頼してください。</InlineNotice>
          <Link href="/announcements" className="text-sm font-medium text-brand-600 hover:underline">
            発表会一覧へ
          </Link>
        </div>
      )}

      {own?.kind === "member" && (
        <>
          <section className="mt-6">
            <SectionHeading>自チーム</SectionHeading>
            <Card>
              <p className="font-semibold text-slate-900">
                {own.team.name} <span className="text-sm font-normal text-slate-500">（{own.team.class.name}）</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">メンバー：{own.team.members.map((m) => (m.isLeader ? `${m.name}（リーダー）` : m.name)).join("、")}</p>
            </Card>
          </section>

          <section className="mt-8">
            <SectionHeading>提出する資料</SectionHeading>
            <div className="flex flex-col gap-4">
              {await Promise.all(
                current.occasions.map(async (o) => {
                  const slots = await listOwnSlots(prisma, actor, own.team.id, o.id);
                  return (
                    <Card key={o.id}>
                      <OccasionCardHeader kind={o.kind} eventDate={o.eventDate} />
                      {slots.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">この発表会には、提出する資料枠がありません。</p>
                      ) : (
                        <ul className="mt-3 divide-y divide-slate-100">
                          {slots.map((s) => (
                            <li
                              key={s.slotId}
                              className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm ${s.isRequiredMissing ? "rounded-md bg-rose-50 px-3" : ""}`}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-2 font-medium text-slate-900">
                                  {s.slotType}
                                  <Badge tone={s.isRequired ? "rose" : "slate"}>{s.isRequired ? "必須" : "任意"}</Badge>
                                </span>
                                <span className="text-xs text-slate-400">
                                  締切 {s.deadline ? formatDateTime(s.deadline.toISOString()) : "未設定"}
                                  {s.firstSubmittedAt && `・初回提出 ${formatDateTime(s.firstSubmittedAt.toISOString())}`}
                                  {s.showLastUpdated && s.lastSubmittedAt && `・最終更新 ${formatDateTime(s.lastSubmittedAt.toISOString())}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={s.submitted ? "提出済み" : "未提出"} />
                                {s.isLate && <LateBadge />}
                                {s.warnLate && <Badge tone="rose">締切超過</Badge>}
                                {/* テンプレート参照は、書くときに http(s) だけを受けている（slots.ts）が、リンクにする前にもう一度確かめる。 */}
                                {s.templateUrl && isValidUrl(s.templateUrl) && (
                                  <MaterialLink href={s.templateUrl} className="text-brand-600 hover:underline">
                                    テンプレート
                                  </MaterialLink>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/announcements/${o.id}/teams/${own.team.id}/submit`} className={buttonClassName("primary")}>
                          プレゼン資料を提出
                        </Link>
                        <Link href={`/announcements/${o.id}/teams/${own.team.id}/summary`} className={buttonClassName("secondary")}>
                          概要を入力
                        </Link>
                      </div>
                    </Card>
                  );
                }),
              )}
            </div>
          </section>
        </>
      )}

      {isTeacher && (
        <>
          <section className="mt-8">
            <SectionHeading>発表会の提出状況</SectionHeading>
            <div className="flex flex-col gap-3">
              {current.occasions.map((o) => (
                <Card key={o.id}>
                  <OccasionCardHeader kind={o.kind} eventDate={o.eventDate} />
                  <p className="mt-3 text-sm text-slate-700" title={SUBMISSION_SUMMARY_HINT}>
                    {submissionSummaryText(summaries?.find((s) => s.occasionId === o.id))}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/announcements/${o.id}`} className={buttonClassName("secondary")}>
                      発表会の詳細
                    </Link>
                    <Link href={`/announcements/${o.id}/submissions`} className={buttonClassName("secondary")}>
                      提出状況一覧
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
          <section className="mt-8">
            <SectionHeading>運営</SectionHeading>
            <div className="flex flex-wrap gap-2">
              <Link href="/announcements" className={buttonClassName("secondary")}>
                発表会一覧
              </Link>
              <Link href="/teams" className={buttonClassName("secondary")}>
                チーム一覧
              </Link>
              <Link href="/admin/years" className={buttonClassName("secondary")}>
                年度管理
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
