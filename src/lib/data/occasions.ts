import type { PrismaClient } from "@/generated/prisma/client";
import { isId } from "@/lib/ids";
import { EVENT_KINDS, YearError, type Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-1・§3-7・design/04-screen.md SC-03（当年度の 4 発表会を種別の順序で）・SC-04（getOccasion・発表会 1 件の概要）。
// 先行方針で組んでいる:
//   H-54 「当年度」は未アーカイブの年度のうち year が最大のもの。
// getCurrentYearOccasions（SC-03）は、アーカイブ済みの年度を先生にも生徒にも返さない（確定の規則：requirements.md §3-7 受け入れ基準「発表会一覧から外れる。解除で元に戻る」・SC-03 の「できないこと」の過年度の表示）。H-60 がどう決着しても変わらない。
// 返さないもの: SC-03 の「締切」（H-61 の決着で SC-03・SC-04 の概要に出さないことにした：docs/decisions.md 2026-10-23）と「提出状況サマリ」（同じ決着で定義した。まだ返さず、3.2.3 で足す）。
// 資料枠の一覧は SC-04 の T 専用（生徒には出さない）で、ここには含めない。

type Db = Pick<PrismaClient, "fiscalYear" | "eventOccasion">;

// 当年度とその発表会。未アーカイブの年度が 1 つも無ければ null（年度セットアップの前・全年度のアーカイブ後）。
// 発表会は id の昇順に頼らず、種別の並び（EVENT_KINDS）で返す。
// SC-03 の一覧は全員が見る（04-screen.md §4-4。S2 の △ は提出状況サマリの出し分けで、ここはサマリを返さない）ので、先生と生徒のどちらにも同じ結果を返す。
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

// SC-04 の「発表会の概要」（種別・日程・公開状態。全員が見る）。1 件の発表会を、年度の状態つきで返す。
// 先生は全年度を読める。生徒は未アーカイブの年度の発表会だけ読める：アーカイブ済みの年度は運営の画面（発表会一覧）から外れる（§3-7）ので、
// 直接 URL を開いても生徒には出さない。外れた行は「無い」と同じ（null）で返し、存在を漏らさない（H-60 の先行方針と同じ線引き。決着したら変わるのはここだけ）。
// 資料枠は含めない：SC-04 の資料枠の一覧は先生専用で、lib/data/slots.ts の listMaterialSlots が持つ。「締切」は返さない（H-61 の決着で、SC-03・SC-04 の概要に締切を出さないことにした：docs/decisions.md 2026-10-23）。
export async function getOccasion(db: Db, actor: Actor, occasionId: number) {
  assertRole(actor);
  if (!isId(occasionId)) return null;
  return db.eventOccasion.findFirst({
    where: { id: occasionId, ...(actor.role === "teacher" ? {} : { fiscalYear: { isArchived: false } }) },
    select: { id: true, kind: true, eventDate: true, isPublished: true, fiscalYear: { select: { id: true, year: true, isArchived: true } } },
  });
}
