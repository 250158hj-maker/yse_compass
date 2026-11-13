import type { PrismaClient } from "@/generated/prisma/client";
import { parseId } from "@/lib/ids";
import { getCurrentYearOccasions } from "@/lib/data/occasions";
import { SUMMARY_SLOT_TYPE } from "@/lib/data/slots";
import type { Actor } from "@/lib/data/years";

// 対応: docs/design/04-screen.md SC-03（提出状況サマリ）・SC-02（T の「提出率」）・docs/decisions.md 2026-10-23（H-61）・2026-10-30（H-66 の②）。
// サマリは「必須の資料枠がすべて提出済みのチームの数／全チームの数」（チーム単位）。画面では数えず、ここの結果を表示に写す。
// 出す相手: 先生と、当年度のチームのメンバー行に結びついた生徒だけ。それ以外は null（H-61 の③。H-33 の先行方針に乗る区分で、H-33 は閉じない）。
//   引き換え（H-25・未決）が入るまでは、メンバー行に結びつく生徒がいないので、実装では生徒に出ない見込み。
// 「全チーム」は、その発表会と同じ年度の全クラスの全チーム（getSubmissionMatrix と同じ範囲）。任意の資料枠は数えない（decisions.md 2026-11-06 の H-15 の行）。
// 概要枠は提出（submissions）ではなく概要（summaries）の行の有無で見る（getSubmissionMatrix と同じ）。
// 数えられないときは数値を返さず、理由を区別して返す（H-66 の②）。0/0 や「提出済み 0」とは数えない。
//   チームが 0 件 → "no_teams"（必須の資料枠が 0 件でもこちら）／必須の資料枠が 0 件 → "no_required_slots"。
//   文言と置き場所は画面の側が決める。型の形は実装の PR で決める（06-data.md 6-6）。

type Db = Pick<PrismaClient, "fiscalYear" | "eventOccasion" | "materialSlot" | "submission" | "summary" | "team" | "teamMember">;

export type OccasionSubmissionSummary =
  | { occasionId: number; kind: "no_teams" }
  | { occasionId: number; kind: "no_required_slots" }
  | { occasionId: number; kind: "counted"; submittedTeams: number; totalTeams: number };

// 当年度の発表会ごとのサマリ（発表会の並びは getCurrentYearOccasions と同じ種別の順）。出さない相手、または当年度が無いときは null。
export async function getSubmissionSummaries(db: Db, actor: Actor): Promise<OccasionSubmissionSummary[] | null> {
  // 先生でも生徒でもない主体は、ここで弾かれる（forbidden）。
  const current = await getCurrentYearOccasions(db, actor);
  if (!current) return null;
  const fiscalYearId = current.fiscalYear.id;

  if (actor.role === "student") {
    // 実行主体の userId は文字列（H-30 に備えた別名）。メンバー行の user_id（整数）と突き合わせる。整数にできなければ、どのメンバー行にも結びつかない。
    const userId = parseId(actor.userId);
    if (userId === null) return null;
    const own = await db.teamMember.count({ where: { userId, team: { class: { fiscalYearId } } } });
    if (own === 0) return null;
  }

  const occasionIds = current.occasions.map((o) => o.id);
  const teams = await db.team.findMany({ where: { class: { fiscalYearId } }, select: { id: true } });
  const requiredSlots = await db.materialSlot.findMany({
    where: { eventOccasionId: { in: occasionIds }, isRequired: true },
    select: { id: true, eventOccasionId: true, slotType: true },
  });
  const submissions = await db.submission.findMany({
    where: { materialSlotId: { in: requiredSlots.map((s) => s.id) } },
    select: { teamId: true, materialSlotId: true },
  });
  const summaries = await db.summary.findMany({
    where: { eventOccasionId: { in: occasionIds } },
    select: { teamId: true, eventOccasionId: true },
  });

  const submitted = new Set(submissions.map((x) => `${x.teamId}:${x.materialSlotId}`));
  const summarized = new Set(summaries.map((x) => `${x.teamId}:${x.eventOccasionId}`));

  return current.occasions.map((occasion): OccasionSubmissionSummary => {
    if (teams.length === 0) return { occasionId: occasion.id, kind: "no_teams" };
    const slots = requiredSlots.filter((s) => s.eventOccasionId === occasion.id);
    if (slots.length === 0) return { occasionId: occasion.id, kind: "no_required_slots" };
    const submittedTeams = teams.filter((team) =>
      slots.every((slot) => (slot.slotType === SUMMARY_SLOT_TYPE ? summarized.has(`${team.id}:${occasion.id}`) : submitted.has(`${team.id}:${slot.id}`))),
    ).length;
    return { occasionId: occasion.id, kind: "counted", submittedTeams, totalTeams: teams.length };
  });
}
