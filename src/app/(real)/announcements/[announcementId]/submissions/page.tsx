import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, LateBadge, PhaseBadge, StatusBadge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { MaterialLink } from "@/components/ui/MaterialLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { getOccasion } from "@/lib/data/occasions";
import { getSubmissionMatrix } from "@/lib/data/submission-matrix";
import { SubmissionError } from "@/lib/data/submissions";
import { formatDateTime } from "@/lib/format";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import type { AnnouncementPhase } from "@/lib/types";
import { isValidUrl } from "@/lib/url";

// 対応: docs/design/04-screen.md SC-06（提出状況一覧・マトリクス・T のみ）。Issue #184（モックの画面を本番仕様にする）。
// 見た目はモックのまま、データは data 層（getSubmissionMatrix）、ユーザーは requireSessionUser から読む。画面で権限や集計の判定をしない。
// 先生だけが読める（関数が先生以外を拒む）。拒否された場合は、案内だけを出す。
// セルは「未提出／提出済み」の 2 値に、遅延を別のバッジで重ねる（3 値に見せない：SC-06 のメモ）。遅延と最終更新日時を添えるかは、関数が返した値をそのまま写す。
// 含めない:
//   - 画面で必須の未提出を数えない・判定しない（#184 の方針）。件数・チームの強調・セルの強調・絞り込みは、関数が返した値（requiredMissing・hasRequiredMissing・isRequiredMissing）をそのまま使う。
//   - ヘッダーの「提出締切」（SC-06 に無い）と、工程の案内「次へ：発表順確定」（H-47 の先行方針：H-44 の決着まで本実装に出さない）。
// 必須の資料枠が 0 件の発表会は、件数を出さず「必須の資料枠が無い」と示す（SC-03 のサマリの H-66 の②と同じ考え方。2026-11-05 に #184 で了承）。
// チームが 0 件のときは件数を出さず、空状態（H-9）だけを出す（関数は、必須の枠があれば total: 0 を返すが、それを「すべて提出済み」と読ませない）。
// 任意枠の未提出は強調しない（decisions.md 2026-11-06 の H-15 の行。関数の印は必須の未提出にだけ付く）。
// 「未提出のみ表示」は、画面に状態を持たせず、?incomplete=1 のリンクで切り替える（サーバーで行を絞る。判定は行の hasRequiredMissing）。
// 概要枠は提出物のリンクを持たない（概要は提出ではなく概要の行の有無で見る）ので、リンクは出ない。

export default async function SubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ announcementId: string }>;
  searchParams: Promise<{ incomplete?: string }>;
}) {
  const { announcementId } = await params;
  const { incomplete } = await searchParams;
  const onlyIncomplete = incomplete === "1";
  const user = await requireSessionUser(`/announcements/${announcementId}/submissions`);
  // URL の ID は、形と integer の範囲を確かめてから DB に渡す（範囲外を渡すと Prisma が例外を投げ、500 になる）。
  const id = parseId(announcementId);
  const actor = { userId: user.id, role: user.role };
  const occasion = id !== null ? await getOccasion(prisma, actor, id) : null;
  if (!occasion) notFound();
  const title = `${occasion.kind}発表会`;

  // 先生以外は関数が forbidden で拒む。発表会が無い場合は notFound にする。
  let matrix;
  try {
    matrix = await getSubmissionMatrix(prisma, actor, occasion.id);
  } catch (e) {
    if (e instanceof SubmissionError && e.code === "forbidden") {
      return (
        <div className="mx-auto max-w-6xl">
          <InlineNotice tone="info">この操作は先生のみ行えます。</InlineNotice>
        </div>
      );
    }
    if (e instanceof SubmissionError && e.code === "occasion_not_found") notFound();
    throw e;
  }

  const rows = onlyIncomplete ? matrix.rows.filter((row) => row.hasRequiredMissing) : matrix.rows;
  const base = `/announcements/${occasion.id}/submissions`;

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "発表会一覧", href: "/announcements" },
          { label: title, href: `/announcements/${occasion.id}` },
          { label: "提出状況一覧" },
        ]}
      />
      <PageHeader
        title="提出状況一覧"
        meta={title}
        actions={
          <Link href={onlyIncomplete ? base : `${base}?incomplete=1`} className={buttonClassName("secondary")}>
            {onlyIncomplete ? "すべて表示" : "未提出のみ表示"}
          </Link>
        }
      />

      {matrix.rows.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          {matrix.requiredMissing.kind === "no_required_slots" ? (
            <span>必須の資料枠が無い</span>
          ) : (
            <>
              <span>必須枠の未提出</span>
              <Badge tone={matrix.requiredMissing.total > 0 ? "rose" : "emerald"}>{matrix.requiredMissing.total}件</Badge>
            </>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState message={matrix.rows.length === 0 ? "チームがまだ登録されていません。" : "必須の未提出があるチームはありません。"} />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <table className="w-full whitespace-nowrap border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">チーム</th>
                {matrix.slots.map((slot) => (
                  <th key={slot.id} className="px-4 py-3 font-medium">
                    {slot.slotType}
                    <span className="ml-1 font-normal text-slate-400">{slot.isRequired ? "(必須)" : "(任意)"}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.team.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <PhaseBadge phase={occasion.kind as AnnouncementPhase} />
                      <span className={row.hasRequiredMissing ? "font-semibold text-rose-700" : undefined}>{row.team.name}</span>
                    </div>
                  </td>
                  {row.cells.map((cell) => (
                    <td
                      key={cell.slotId}
                      className={`px-4 py-3 ${cell.isRequiredMissing ? "bg-rose-50 ring-1 ring-inset ring-rose-200" : ""}`}
                    >
                      {cell.status === "missing" ? (
                        <StatusBadge status="未提出" />
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className="flex items-center gap-1">
                            <StatusBadge status="提出済み" />
                            {cell.isLate && <LateBadge />}
                          </span>
                          {cell.url && isValidUrl(cell.url) && (
                            <MaterialLink href={cell.url} className="text-xs text-brand-600 hover:underline">
                              資料を開く
                            </MaterialLink>
                          )}
                          <span className="text-xs text-slate-400">
                            {formatDateTime(cell.firstSubmittedAt.toISOString())}
                            {cell.showLastUpdated && `(最終更新 ${formatDateTime(cell.lastSubmittedAt.toISOString())})`}
                          </span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
