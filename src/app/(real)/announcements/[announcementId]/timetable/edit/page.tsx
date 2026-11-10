import { notFound } from "next/navigation";
import { PhaseBadge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { getOccasion } from "@/lib/data/occasions";
import { TimetableError, getTimetable } from "@/lib/data/timetable";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import type { AnnouncementPhase } from "@/lib/types";
import { TimetableEditor } from "./TimetableEditor";

// 対応: docs/design/04-screen.md SC-08（タイムテーブル編集・T）／docs/requirements.md §3-10／docs/decisions.md 2026-10-26（H-48・H-47 の③）。Issue #184（モックの画面を本番仕様にする）。
// データは data 層（getOccasion・getTimetable・setDisplayOrders の Action）、ユーザーは requireSessionUser から読む。
// 出すもの: 発表順の並び替えと保存、「概要集は、この順で生成されます」の注記（04 の SC-08 のメモ・H-51 の(c)）。
// 「発表中」が設定されている間は、並び替えを塞ぐ（つまみを出さず、案内を出す）。サーバーが拒否したときの文言は 04 のとおり。
// 含めない:
//   - 開始時刻・発表時間（全チーム一律）の入力と、休憩の挿入：H-20 が未決で、発表は発表順（整数）だけを持つ前提のため、保存先が無い（open-questions.md H-20 の先行方針）。
//   - チームの作品名：getTimetable が返さない。
//   - 「発表順は確定済み」の表示と確定の日時：発表順の「確定」は状態として持たない（decisions.md 2026-10-26・H-47 の③）。
//   - 「次へ：概要集生成」の導線：モックのデモの流れのための部品（実装には置かない）。
// 先生だけの画面（04）。先生でない人には、案内だけを出す（画面で権限を決めるのではなく、保存の拒否は setDisplayOrders が先生以外にも返す）。

export default async function TimetableEditPage({ params }: { params: Promise<{ announcementId: string }> }) {
  const { announcementId } = await params;
  const user = await requireSessionUser(`/announcements/${announcementId}/timetable/edit`);
  // URL の ID は、形と integer の範囲を確かめてから DB に渡す（範囲外を渡すと Prisma が例外を投げ、500 になる）。
  const id = parseId(announcementId);
  const actor = { userId: user.id, role: user.role };
  const occasion = id !== null ? await getOccasion(prisma, actor, id) : null;
  if (!occasion) notFound();

  let timetable;
  try {
    timetable = await getTimetable(prisma, actor, occasion.id);
  } catch (e) {
    if (e instanceof TimetableError && e.code === "occasion_not_found") notFound();
    throw e;
  }
  const title = `${occasion.kind}発表会`;

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "発表会一覧", href: "/announcements" },
          { label: title, href: `/announcements/${occasion.id}` },
          { label: "タイムテーブル", href: `/announcements/${occasion.id}/timetable` },
          { label: "編集" },
        ]}
      />
      <PageHeader eyebrow={title} title="タイムテーブル編集" meta={<PhaseBadge phase={occasion.kind as AnnouncementPhase} />} />

      {user.role !== "teacher" ? (
        <div className="mt-6">
          <InlineNotice tone="warning">この画面は先生のみ使えます。</InlineNotice>
        </div>
      ) : timetable.rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="発表するチームがまだ登録されていません。" />
        </div>
      ) : (
        <TimetableEditor occasionId={occasion.id} rows={timetable.rows} currentPresentationId={timetable.occasion.currentPresentationId} />
      )}
    </div>
  );
}
