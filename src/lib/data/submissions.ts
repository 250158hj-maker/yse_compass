import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isId, parseId } from "@/lib/ids";
import { isValidUrl } from "@/lib/url";
import { SUMMARY_SLOT_TYPE } from "@/lib/data/slots";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-4（資料提出・差し替え）・design/04-screen.md SC-09（S1 のみ）。
// 先行方針で組んでいる（06 の列は現行のまま。決着したら変わる箇所は、各項の先行方針に書かれた範囲）:
//   #10 Drive 統合は未決の間、リンク登録（Stage 1）で組む。URL は形式だけ確かめ、アクセス可否は確かめない（§3-4）／
//   H-19 リンクが開けることの担保は、システムの外の運用に任せる。
// 遅延は提出の状態ではなく導出（2026-09-29・H-6）: 初回提出日時が締切を過ぎていれば遅延。差し替えでは変わらない。締切が未設定の枠は対象外（H-27）。
// 概要枠は提出ではなく概要のフォーム入力（summaries）なので、ここでは扱わない。
// 先生は提出しない: 先生の代理提出は正典に無い（SC-09 は S1 のみ・04 §4-4）。読み取りは先生と自チームの生徒（decisions.md 2026-10-20 の H-45 の行）。
// 認可の一次防衛線はここに置く（画面や Server Action が先に弾いても、ここでも必ず確かめる）。

type Db = Pick<PrismaClient, "eventOccasion" | "materialSlot" | "submission" | "team" | "teamMember">;

export type SubmissionErrorCode =
  | "forbidden"
  | "invalid_input"
  | "slot_not_found"
  | "occasion_not_found"
  | "summary_slot"
  | "year_archived";

export class SubmissionError extends Error {
  constructor(readonly code: SubmissionErrorCode) {
    super(code);
    this.name = "SubmissionError";
  }
}

// 遅延: 初回提出日時が締切より後。締切が無い枠は遅延にならない。
export function isLate(firstSubmittedAt: Date, deadline: Date | null): boolean {
  return deadline !== null && firstSubmittedAt.getTime() > deadline.getTime();
}

// 締切後に差し替えがあった（最終更新日時を添える）: 最終更新が締切より後で、初回提出日時とは別。締切が無い枠は対象外（06 6-6）。
export function isReplacedAfterDeadline(firstSubmittedAt: Date, lastSubmittedAt: Date, deadline: Date | null): boolean {
  return deadline !== null && lastSubmittedAt.getTime() > deadline.getTime() && lastSubmittedAt.getTime() !== firstSubmittedAt.getTime();
}

// 実行主体の userId は文字列（H-30 に備えた別名）。メンバー行の user_id（整数）と突き合わせるため、ここで整数にする。
// 整数にできない値は、どのメンバー行にも結びつかない主体として null にする。
function memberUserId(actor: Actor): number | null {
  return parseId(actor.userId);
}

// 生徒が、そのチームのメンバー行に結びついているか（自チームか否かの文脈判定。decisions.md 2026-09-06・H-16）。
export async function isMemberOf(db: Pick<Db, "teamMember">, actor: Actor, teamId: number): Promise<boolean> {
  const userId = memberUserId(actor);
  if (userId === null) return false;
  return (await db.teamMember.count({ where: { teamId, userId } })) > 0;
}

// 提出する URL は、生徒の画面でリンクとして開かれる。javascript: などを入れさせないよう、https の URL だけを受ける。
function requiredUrl(value: unknown): string {
  if (typeof value !== "string") throw new SubmissionError("invalid_input");
  const text = value.trim();
  // NUL 文字（\0）は PostgreSQL が拒み、SubmissionError ではない例外（P2039）になるので、入力の誤りにする。
  if (text === "" || text.includes("\0") || !isValidUrl(text)) throw new SubmissionError("invalid_input");
  return text;
}

function hasCode(e: unknown, code: string): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}

// 提出（初回）と差し替え。差し替えは上書きで、初回提出日時は変えず、最終更新日時だけ進める（§3-4）。
// 締切を過ぎても提出・差し替えできる（ソフトデッドライン）。年度アーカイブ後は拒む（§3-4）。
export async function submitMaterial(db: Db, actor: Actor, teamId: number, slotId: number, url: string, now: Date = new Date()) {
  if (actor.role !== "student") throw new SubmissionError("forbidden");
  if (!isId(teamId) || !isId(slotId)) throw new SubmissionError("invalid_input");
  const link = requiredUrl(url);
  // 自チームか否かを先に確かめる。他チームの生徒に、枠やチームの有無を漏らさない。
  if (!(await isMemberOf(db, actor, teamId))) throw new SubmissionError("forbidden");

  const team = await db.team.findUnique({ where: { id: teamId }, select: { class: { select: { fiscalYearId: true } } } });
  const slot = await db.materialSlot.findUnique({
    where: { id: slotId },
    select: { slotType: true, deadline: true, eventOccasion: { select: { fiscalYearId: true, fiscalYear: { select: { isArchived: true } } } } },
  });
  if (!team || !slot) throw new SubmissionError("slot_not_found");
  // 年度の整合は DB で守らない（06 6-3 の注）。別の年度の枠には出せない。
  if (slot.eventOccasion.fiscalYearId !== team.class.fiscalYearId) throw new SubmissionError("slot_not_found");
  if (slot.slotType === SUMMARY_SLOT_TYPE) throw new SubmissionError("summary_slot");
  if (slot.eventOccasion.fiscalYear.isArchived) throw new SubmissionError("year_archived");

  try {
    // 同時に初回提出が走っても、一意制約（チーム × 資料枠）の上で 1 行に収まる。
    const row = await db.submission.upsert({
      where: { teamId_materialSlotId: { teamId, materialSlotId: slotId } },
      create: { teamId, materialSlotId: slotId, url: link, firstSubmittedAt: now, lastSubmittedAt: now },
      update: { url: link, lastSubmittedAt: now },
      select: { url: true, firstSubmittedAt: true, lastSubmittedAt: true },
    });
    return { ...row, isLate: isLate(row.firstSubmittedAt, slot.deadline) };
  } catch (e) {
    if (hasCode(e, "P2003")) throw new SubmissionError("slot_not_found");
    throw e;
  }
}

// SC-09: そのチームの、ある発表会の資料枠（概要枠を除く）と、提出済みならその内容。
// 先生と、そのチームの生徒だけに返す。未提出の枠の warnLate は、いま提出すると遅延になる（締切を過ぎている）ことを表す（SC-09 の警告）。
export async function listTeamSubmissions(db: Db, actor: Actor, teamId: number, occasionId: number, now: Date = new Date()) {
  if (actor.role !== "teacher" && actor.role !== "student") throw new SubmissionError("forbidden");
  if (!isId(teamId) || !isId(occasionId)) throw new SubmissionError("invalid_input");
  if (actor.role === "student" && !(await isMemberOf(db, actor, teamId))) throw new SubmissionError("forbidden");

  const team = await db.team.findUnique({ where: { id: teamId }, select: { class: { select: { fiscalYearId: true } } } });
  const occasion = await db.eventOccasion.findUnique({ where: { id: occasionId }, select: { fiscalYearId: true } });
  // 発表会やチームが無い、または年度が違う組み合わせは、無いのと同じ結果にする。
  if (!team || !occasion || occasion.fiscalYearId !== team.class.fiscalYearId) throw new SubmissionError("occasion_not_found");
  const slots = await db.materialSlot.findMany({
    where: { eventOccasionId: occasionId, NOT: { slotType: SUMMARY_SLOT_TYPE } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      slotType: true,
      isRequired: true,
      deadline: true,
      templateUrl: true,
      submissions: { where: { teamId }, select: { url: true, firstSubmittedAt: true, lastSubmittedAt: true } },
    },
  });
  return slots.map(({ submissions, ...slot }) => {
    const submission = submissions[0];
    return {
      ...slot,
      submission: submission ? { ...submission, isLate: isLate(submission.firstSubmittedAt, slot.deadline) } : null,
      warnLate: !submission && slot.deadline !== null && now.getTime() > slot.deadline.getTime(),
    };
  });
}
