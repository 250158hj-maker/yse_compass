import type { PrismaClient } from "@/generated/prisma/client";
import { isId } from "@/lib/ids";
import { SUMMARY_SLOT_TYPE } from "@/lib/data/slots";
import { toMatrixCell, type MatrixCell, type RequiredMissingSummary } from "@/lib/data/submission-matrix";
import { isMemberOf, SubmissionError } from "@/lib/data/submissions";
import { EVENT_KINDS, type Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-8・design/04-screen.md SC-14（4 発表会分の提出状況と発表詳細への導線＝チーム軸の縦断ビュー）。
// 提出状況は、先生と、そのチームの生徒にだけ返す。他チームの生徒（チームに結びついていない生徒を含む）には、公開済みの発表会の導線だけを返し、
// 提出状況は返さない（decisions.md 2026-11-19 の SC-14 の縦断ビューの行）。画面は判定しない：submissions が null の行は、提出状況を出さない行。
// 返す発表会は、そのチームの年度の発表会で、種別の順（EVENT_KINDS）。他チームの生徒に返す行は、公開済み（is_published）だけなので、返った行はすべて発表詳細へ進める
// （SC-12 の getPresentationDetail は、公開済みなら誰にでも、公開前は先生と自チームの生徒にだけ返す）。
// 提出状態の判定は、SC-06 の getSubmissionMatrix と同じ（toMatrixCell）。必須の資料枠が 0 件の発表会は、0 件と数えず区別を返す。
// 生徒はアーカイブ済みの年度を読めない（H-60 の先行方針。getPresentationDetail・getOccasion と同じ線引き。決着したら変わるのはここだけ）。
// 引数の名前・戻り値の形は、バックエンド担当が決める範囲（同行の「本行が決めないもの」）。
// エラーは submissions.ts の SubmissionError を使う（この層で出すのは forbidden・invalid_input・occasion_not_found。チームが無いときも occasion_not_found：listTeamSubmissions と同じ）。

type Db = Pick<PrismaClient, "eventOccasion" | "submission" | "summary" | "team" | "teamMember">;

export type TeamOccasionSlotStatus = { slotType: string; isRequired: boolean } & MatrixCell;

export type TeamOccasionStatus = {
  id: number;
  kind: string;
  eventDate: Date | null;
  isPublished: boolean;
  submissions: { slots: TeamOccasionSlotStatus[]; requiredMissing: RequiredMissingSummary } | null;
};

export async function listTeamOccasionStatuses(db: Db, actor: Actor, teamId: number) {
  if (actor.role !== "teacher" && actor.role !== "student") throw new SubmissionError("forbidden");
  if (!isId(teamId)) throw new SubmissionError("invalid_input");

  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, class: { select: { fiscalYearId: true, fiscalYear: { select: { isArchived: true } } } } },
  });
  // 見えない行は「無い」と同じ結果にする（存在の有無を漏らさない）。
  if (!team || (actor.role === "student" && team.class.fiscalYear.isArchived)) throw new SubmissionError("occasion_not_found");

  const canSeeSubmissions = actor.role === "teacher" || (await isMemberOf(db, actor, teamId));
  const occasions = await db.eventOccasion.findMany({
    where: { fiscalYearId: team.class.fiscalYearId, ...(canSeeSubmissions ? {} : { isPublished: true }) },
    select: {
      id: true,
      kind: true,
      eventDate: true,
      isPublished: true,
      materialSlots: { orderBy: { id: "asc" }, select: { id: true, slotType: true, isRequired: true, deadline: true } },
    },
  });
  const order = (kind: string) => EVENT_KINDS.indexOf(kind as (typeof EVENT_KINDS)[number]);
  const sorted = occasions.toSorted((a, b) => order(a.kind) - order(b.kind));

  const base = (o: (typeof sorted)[number]) => ({ id: o.id, kind: o.kind, eventDate: o.eventDate, isPublished: o.isPublished });
  if (!canSeeSubmissions) {
    return { team: { id: team.id, name: team.name }, occasions: sorted.map((o): TeamOccasionStatus => ({ ...base(o), submissions: null })) };
  }

  const submissions = await db.submission.findMany({
    where: { teamId, materialSlot: { eventOccasion: { fiscalYearId: team.class.fiscalYearId } } },
    select: { materialSlotId: true, url: true, firstSubmittedAt: true, lastSubmittedAt: true },
  });
  const summaries = await db.summary.findMany({
    where: { teamId, eventOccasion: { fiscalYearId: team.class.fiscalYearId } },
    select: { eventOccasionId: true, firstSubmittedAt: true, lastSubmittedAt: true },
  });
  const submissionOf = new Map(submissions.map((x) => [x.materialSlotId, x]));
  const summaryOf = new Map(summaries.map((x) => [x.eventOccasionId, { ...x, url: null as string | null }]));

  return {
    team: { id: team.id, name: team.name },
    occasions: sorted.map((o): TeamOccasionStatus => {
      const slots = o.materialSlots.map((slot): TeamOccasionSlotStatus => ({
        slotType: slot.slotType,
        isRequired: slot.isRequired,
        ...toMatrixCell(slot, slot.slotType === SUMMARY_SLOT_TYPE ? summaryOf.get(o.id) : submissionOf.get(slot.id)),
      }));
      const requiredMissing: RequiredMissingSummary = slots.some((s) => s.isRequired)
        ? { kind: "counted", total: slots.filter((s) => s.isRequiredMissing).length }
        : { kind: "no_required_slots" };
      return { ...base(o), submissions: { slots, requiredMissing } };
    }),
  };
}
