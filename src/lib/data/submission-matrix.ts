import type { PrismaClient } from "@/generated/prisma/client";
import { isId } from "@/lib/ids";
import { SUMMARY_SLOT_TYPE } from "@/lib/data/slots";
import { isLate, isReplacedAfterDeadline, SubmissionError } from "@/lib/data/submissions";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-2（提出状況一覧）・design/04-screen.md SC-06（T のみ）。
// 先行方針で組んでいる（06 の列は現行のまま。決着したら変わる箇所は、各項の先行方針に書かれた範囲）:
//   H-15 任意枠の未提出は警告色を使わない。ここでは必須／任意を返すだけで、見せ方は画面が決める／
//   H-27 締切が未設定の枠は、遅延の対象外。
// 提出状態は 2 値（未提出／提出済み）で、遅延と差し替えは行から導く（06 6-6）。第 3 の状態は持たない。
// 概要枠は提出（submissions）ではなく概要（summaries）の行の有無で見る。概要にはリンクが無いので url は null。
// 先生だけが読む: 先生には文脈判定を適用せず、クラス横断で全チームを返す（decisions.md 2026-09-26）。

type Db = Pick<PrismaClient, "eventOccasion" | "materialSlot" | "submission" | "summary" | "team">;

export type MatrixCell =
  | { slotId: number; status: "missing" }
  | { slotId: number; status: "submitted"; url: string | null; firstSubmittedAt: Date; lastSubmittedAt: Date; isLate: boolean; showLastUpdated: boolean };

// 発表会 1 つの「チーム × 資料枠」。チームは、その発表会の年度のクラスに属する全チーム（クラス → チームの順）。枠は定番の並び（id の昇順）。
export async function getSubmissionMatrix(db: Db, actor: Actor, occasionId: number) {
  if (actor.role !== "teacher") throw new SubmissionError("forbidden");
  if (!isId(occasionId)) throw new SubmissionError("invalid_input");
  const occasion = await db.eventOccasion.findUnique({ where: { id: occasionId }, select: { fiscalYearId: true } });
  if (!occasion) throw new SubmissionError("occasion_not_found");

  const slots = await db.materialSlot.findMany({
    where: { eventOccasionId: occasionId },
    orderBy: { id: "asc" },
    select: { id: true, slotType: true, isRequired: true, deadline: true },
  });
  const teams = await db.team.findMany({
    where: { class: { fiscalYearId: occasion.fiscalYearId } },
    orderBy: [{ classId: "asc" }, { id: "asc" }],
    select: { id: true, name: true, class: { select: { id: true, name: true } } },
  });
  const submissions = await db.submission.findMany({
    where: { materialSlotId: { in: slots.map((s) => s.id) } },
    select: { teamId: true, materialSlotId: true, url: true, firstSubmittedAt: true, lastSubmittedAt: true },
  });
  const summaries = await db.summary.findMany({
    where: { eventOccasionId: occasionId },
    select: { teamId: true, firstSubmittedAt: true, lastSubmittedAt: true },
  });

  const submissionOf = new Map(submissions.map((x) => [`${x.teamId}:${x.materialSlotId}`, x]));
  const summaryOf = new Map(summaries.map((x) => [x.teamId, { ...x, url: null as string | null }]));

  const rows = teams.map((team) => ({
    team: { id: team.id, name: team.name, className: team.class.name },
    cells: slots.map((slot): MatrixCell => {
      const isSummary = slot.slotType === SUMMARY_SLOT_TYPE;
      const found = isSummary ? summaryOf.get(team.id) : submissionOf.get(`${team.id}:${slot.id}`);
      if (!found) return { slotId: slot.id, status: "missing" };
      return {
        slotId: slot.id,
        status: "submitted",
        url: found.url,
        firstSubmittedAt: found.firstSubmittedAt,
        lastSubmittedAt: found.lastSubmittedAt,
        isLate: isLate(found.firstSubmittedAt, slot.deadline),
        showLastUpdated: isReplacedAfterDeadline(found.firstSubmittedAt, found.lastSubmittedAt, slot.deadline),
      };
    }),
  }));
  return { slots, rows };
}
