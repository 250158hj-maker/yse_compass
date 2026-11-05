import { notFound } from "next/navigation";
import { LateBadge, PhaseBadge, StatusBadge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
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
//   - 「必須枠の未提出」の件数・未提出の必須枠があるチームの強調・「未提出のみ表示」の絞り込み・未提出の必須セルの強調：必須で未提出かの判定は画面でしない。関数ができてから足す（#184 で蒲山さんに依頼）。
//   - ヘッダーの「提出締切」（SC-06 に無い）と、工程の案内「次へ：発表順確定」（H-47 の先行方針：H-44 の決着まで本実装に出さない）。
// 概要枠は提出物のリンクを持たない（概要は提出ではなく概要の行の有無で見る）ので、リンクは出ない。

export default async function SubmissionsPage({ params }: { params: Promise<{ announcementId: string }> }) {
  const { announcementId } = await params;
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
      <PageHeader title="提出状況一覧" meta={title} />

      {matrix.rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="チームがまだ登録されていません。" />
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
              {matrix.rows.map((row) => (
                <tr key={row.team.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <PhaseBadge phase={occasion.kind as AnnouncementPhase} />
                      <span>{row.team.name}</span>
                    </div>
                  </td>
                  {row.cells.map((cell) => (
                    <td key={cell.slotId} className="px-4 py-3">
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
