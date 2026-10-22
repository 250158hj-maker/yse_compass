import type { PrismaClient } from "@/generated/prisma/client";
import { EVENT_KINDS, YearError, type Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-1・§3-7・design/04-screen.md SC-03（当年度の 4 発表会を種別の順序で）。
// 先行方針で組んでいる:
//   H-54 「当年度」は未アーカイブの年度のうち year が最大のもの。
// アーカイブ済みの年度は、先生にも生徒にも返さない（確定の規則：requirements.md §3-7 受け入れ基準「発表会一覧から外れる。解除で元に戻る」・SC-03 の「できないこと」の過年度の表示）。H-60 がどう決着しても変わらない。
// 返さないもの（正典に定義が無いので、足さない）: SC-03 の「締切」（資料枠ごとの締切を発表会の締切にどうまとめるか）と「提出状況サマリ」（何をどう数えるか）。
// 資料枠の一覧は SC-04 の T 専用（生徒には出さない）で、ここには含めない。

type Db = Pick<PrismaClient, "fiscalYear">;

// 当年度とその発表会。未アーカイブの年度が 1 つも無ければ null（年度セットアップの前・全年度のアーカイブ後）。
// 発表会は id の昇順に頼らず、種別の並び（EVENT_KINDS）で返す。
// SC-03 は全員が見る（04-screen.md §4-4 で T・S1・S2 とも ○）ので、先生と生徒のどちらにも同じ結果を返す。
// ただし読み取りでもロールを確かめる（decisions.md 2026-09-06・H-16）。session のロールは型の主張だけで実行時の検査が無いので、ここで先生でも生徒でもない主体を弾く。
function assertRole(actor: Actor) {
  if (actor.role !== "teacher" && actor.role !== "student") throw new YearError("forbidden");
}

export async function getCurrentYearOccasions(db: Db, actor: Actor) {
  assertRole(actor);
  const year = await db.fiscalYear.findFirst({
    where: { isArchived: false },
    orderBy: { year: "desc" },
    select: { id: true, year: true, eventOccasions: { select: { id: true, kind: true, eventDate: true, isPublished: true } } },
  });
  if (!year) return null;
  const order = (kind: string) => EVENT_KINDS.indexOf(kind as (typeof EVENT_KINDS)[number]);
  return { fiscalYear: { id: year.id, year: year.year }, occasions: year.eventOccasions.toSorted((a, b) => order(a.kind) - order(b.kind)) };
}
