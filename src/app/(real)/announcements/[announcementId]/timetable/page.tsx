import Link from "next/link";
import { notFound } from "next/navigation";
import { PhaseBadge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { getOccasion } from "@/lib/data/occasions";
import { TimetableError, getTimetable } from "@/lib/data/timetable";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import type { AnnouncementPhase } from "@/lib/types";
import { TeacherTimetable } from "./TeacherTimetable";
import { TimetablePoller } from "./TimetablePoller";
import { TimetableRow } from "./TimetableRow";

// 対応: docs/design/04-screen.md SC-07（タイムテーブル・表示と当日進行）／docs/requirements.md §3-10。Issue #184（モックの画面を本番仕様にする）。
// データは data 層（getOccasion・getTimetable）、ユーザーは requireSessionUser から読む。画面で「発表中」「発表済み」「自チーム」の判定をしない（getTimetable が返す）。
// 出すもの: 発表順・チーム名の一覧、「発表中」の強調、「発表済み」、自チームのハイライト（生徒）。先生は、「発表中」の切り替え・発表を終える・進行を終える・当日の発表順の入れ替え。
// 生徒の画面は、一定の間隔で読み直す（ポーリング。間隔は未決で、仮の値）。
// 含めない:
//   - 開始時刻・所要・休憩：H-20 が未決で、発表は発表順（整数）だけを持つ前提のため、関数が返さない（open-questions.md H-20 の先行方針）。
//   - チームの作品名：getTimetable が返さない。
//   - 開始前の「まだ始まっていません」の帯・次の工程の導線：モックのデモの流れのための部品（実装には置かない）。
// 先生の「編集する」は、SC-08 の置き換えまで、モックの編集画面へ向かう。
const POLL_INTERVAL_MS = 15_000;

export default async function TimetablePage({ params }: { params: Promise<{ announcementId: string }> }) {
  const { announcementId } = await params;
  const user = await requireSessionUser(`/announcements/${announcementId}/timetable`);
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
  const isTeacher = user.role === "teacher";
  const title = `${occasion.kind}発表会`;

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "発表会一覧", href: "/announcements" },
          { label: title, href: `/announcements/${occasion.id}` },
          { label: "タイムテーブル" },
        ]}
      />
      <PageHeader
        eyebrow={title}
        title="タイムテーブル"
        meta={<PhaseBadge phase={occasion.kind as AnnouncementPhase} />}
        actions={
          isTeacher ? (
            <Link href={`/announcements/${occasion.id}/timetable/edit`} className={buttonClassName("secondary")}>
              編集する
            </Link>
          ) : undefined
        }
      />

      {timetable.rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="発表するチームがまだ登録されていません。" />
        </div>
      ) : isTeacher ? (
        <TeacherTimetable occasionId={occasion.id} rows={timetable.rows} currentPresentationId={timetable.occasion.currentPresentationId} />
      ) : (
        <>
          <TimetablePoller intervalMs={POLL_INTERVAL_MS} />
          <div className="mt-6 flex flex-col gap-2">
            {timetable.rows.map((r) => (
              <TimetableRow key={r.presentationId} row={r} occasionId={occasion.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
