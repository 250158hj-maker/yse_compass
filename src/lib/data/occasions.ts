import type { PrismaClient } from "@/generated/prisma/client";
import { EVENT_KINDS, type Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-1・design/04-screen.md SC-03（当年度の 4 発表会を種別の順序で）。
// 先行方針で組んでいる:
//   H-54 「当年度」は未アーカイブの年度のうち year が最大のもの／H-60 生徒は未アーカイブの年度だけ読める（当年度は常に未アーカイブなので、先生と生徒で同じ結果）。
// 返さないもの（正典に定義が無いので、足さない）: SC-03 の「締切」（資料枠ごとの締切を発表会の締切にどうまとめるか）と「提出状況サマリ」（何をどう数えるか）。
// 資料枠の一覧は SC-04 の T 専用（生徒には出さない）で、ここには含めない。

type Db = Pick<PrismaClient, "fiscalYear">;

// 当年度とその発表会。未アーカイブの年度が 1 つも無ければ null（年度セットアップの前・全年度のアーカイブ後）。
// 発表会は id の昇順に頼らず、種別の並び（EVENT_KINDS）で返す。
// 読み取りもサインイン済みの主体を取る規約（decisions.md 2026-09-06・H-16）。ロールで結果は変わらないので、actor は受け取るだけ。
export async function getCurrentYearOccasions(db: Db, actor: Actor) {
  void actor;
  const year = await db.fiscalYear.findFirst({
    where: { isArchived: false },
    orderBy: { year: "desc" },
    select: { id: true, year: true, eventOccasions: { select: { id: true, kind: true, eventDate: true, isPublished: true } } },
  });
  if (!year) return null;
  const order = (kind: string) => EVENT_KINDS.indexOf(kind as (typeof EVENT_KINDS)[number]);
  return { fiscalYear: { id: year.id, year: year.year }, occasions: year.eventOccasions.toSorted((a, b) => order(a.kind) - order(b.kind)) };
}
