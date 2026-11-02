import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isId } from "@/lib/ids";
import { SUMMARY_SLOT_TYPE } from "@/lib/data/slots";
import { isLate, isMemberOf, SubmissionError } from "@/lib/data/submissions";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-3（概要の入力）・design/04-screen.md SC-10（S1 のみ）。
// 先行方針で組んでいる（06 の列は現行のまま。決着したら変わる箇所は、各項の先行方針に書かれた範囲）:
//   H-37 概要の本文は L2 の 6 欄（はじめに・作品概要・使用技術・終わりに＋チームが見出しを付ける自由な欄）。字数の上限は実装しない（H-53 の先行方針）／
//   H-52・H-53 概要の画像はここでは扱わない（画像を組む時期は pm/wbs.md 3.3.2 の行が決める）／
//   H-27 締切が未設定の枠は、遅延の対象外。
// 提出済みかどうかは、概要の行の有無で見る（提出状況一覧 SC-06 と提出状況サマリが、そう見る）。だから、全欄が空の保存は断る。
// 保存＝提出（下書きは作らない）。差し替えは上書きで、初回提出日時は変えず、最終更新日時だけ進める。
// 締切を過ぎても保存できる（ソフトデッドライン）。年度アーカイブ後は拒む。遅延は行から導く（isLate）。
// 保存できるのは自チームの生徒だけ。先生は保存しない（先生の代理提出は正典に無い）。読み取り（編集フォーム用）も自チームの生徒だけ。
// 認可の一次防衛線はここに置く（画面や Server Action が先に弾いても、ここでも必ず確かめる）。

type Db = Pick<PrismaClient, "eventOccasion" | "materialSlot" | "summary" | "team" | "teamMember">;

// 自由な欄（チームが見出しを付ける欄）の件数の上限。H-37 の先行方針。DB の制約にはせず、ここ 1 か所で守る。
export const MAX_EXTRA_SECTIONS = 2;

export type ExtraSection = { heading: string; body: string };

export type SummaryInput = {
  introduction?: string | null;
  workOverview?: string | null;
  techStack?: string | null;
  closing?: string | null;
  extraSections?: ExtraSection[];
};

type ParsedSummary = {
  introduction: string | null;
  workOverview: string | null;
  techStack: string | null;
  closing: string | null;
  extraSections: ExtraSection[];
};

// NUL 文字（\0）は PostgreSQL が拒み、SubmissionError ではない例外（P2039）になるので、入力の誤りにする。
function text(value: unknown): string {
  if (typeof value !== "string" || value.includes("\0")) throw new SubmissionError("invalid_input");
  return value.trim();
}

// 未指定・null・空白だけは「未入力」（null）として保存する。
function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = text(value);
  return trimmed === "" ? null : trimmed;
}

function parseExtraSections(value: unknown): ExtraSection[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_EXTRA_SECTIONS) throw new SubmissionError("invalid_input");
  return value.map((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) throw new SubmissionError("invalid_input");
    const heading = text((item as Record<string, unknown>).heading);
    if (heading === "") throw new SubmissionError("invalid_input");
    return { heading, body: text((item as Record<string, unknown>).body) };
  });
}

function parseInput(input: unknown): ParsedSummary {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw new SubmissionError("invalid_input");
  const raw = input as Record<string, unknown>;
  const parsed: ParsedSummary = {
    introduction: optionalText(raw.introduction),
    workOverview: optionalText(raw.workOverview),
    techStack: optionalText(raw.techStack),
    closing: optionalText(raw.closing),
    extraSections: parseExtraSections(raw.extraSections),
  };
  const empty = parsed.introduction === null && parsed.workOverview === null && parsed.techStack === null && parsed.closing === null && parsed.extraSections.length === 0;
  if (empty) throw new SubmissionError("invalid_input");
  return parsed;
}

// DB の JSON から、{ heading, body } の並びだけを取り出す。形の合わない要素は読み飛ばす（保存は parseExtraSections を通るので、通常は起きない）。
function toExtraSections(value: Prisma.JsonValue): ExtraSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const { heading, body } = item as Record<string, unknown>;
    return typeof heading === "string" && typeof body === "string" ? [{ heading, body }] : [];
  });
}

const selectColumns = {
  introduction: true,
  workOverview: true,
  techStack: true,
  closing: true,
  extraSections: true,
  firstSubmittedAt: true,
  lastSubmittedAt: true,
} as const;

function hasCode(e: unknown, code: string): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}

// チームと発表会の年度が合う組み合わせか。無い、または年度が違う組み合わせは、無いのと同じ結果（occasion_not_found）にする。
async function loadTeamAndOccasion(db: Db, teamId: number, occasionId: number) {
  const team = await db.team.findUnique({ where: { id: teamId }, select: { class: { select: { fiscalYearId: true } } } });
  const occasion = await db.eventOccasion.findUnique({ where: { id: occasionId }, select: { fiscalYearId: true, fiscalYear: { select: { isArchived: true } } } });
  if (!team || !occasion || occasion.fiscalYearId !== team.class.fiscalYearId) throw new SubmissionError("occasion_not_found");
  return { isArchived: occasion.fiscalYear.isArchived };
}

// 概要の保存（初回と差し替え）。差し替えでは、4 つの欄と自由な欄をまとめて上書きする（フォームは全欄を送る）。
export async function saveSummary(db: Db, actor: Actor, teamId: number, occasionId: number, input: SummaryInput, now: Date = new Date()) {
  if (actor.role !== "student") throw new SubmissionError("forbidden");
  if (!isId(teamId) || !isId(occasionId)) throw new SubmissionError("invalid_input");
  const data = parseInput(input);
  // 自チームか否かを先に確かめる。他チームの生徒に、発表会やチームの有無を漏らさない。
  if (!(await isMemberOf(db, actor, teamId))) throw new SubmissionError("forbidden");

  const { isArchived } = await loadTeamAndOccasion(db, teamId, occasionId);
  if (isArchived) throw new SubmissionError("year_archived");
  // 締切は概要枠から取る。概要枠の無い発表会には保存しない（SC-10 は概要枠の入力）。
  const slot = await db.materialSlot.findFirst({ where: { eventOccasionId: occasionId, slotType: SUMMARY_SLOT_TYPE }, select: { deadline: true } });
  if (!slot) throw new SubmissionError("slot_not_found");

  const columns = { ...data, extraSections: data.extraSections as unknown as Prisma.InputJsonValue };
  try {
    // 同時に初回の保存が走っても、一意制約（チーム × 発表会）の上で 1 行に収まる。
    const row = await db.summary.upsert({
      where: { teamId_eventOccasionId: { teamId, eventOccasionId: occasionId } },
      create: { teamId, eventOccasionId: occasionId, ...columns, firstSubmittedAt: now, lastSubmittedAt: now },
      update: { ...columns, lastSubmittedAt: now },
      select: selectColumns,
    });
    return { ...row, extraSections: toExtraSections(row.extraSections), isLate: isLate(row.firstSubmittedAt, slot.deadline) };
  } catch (e) {
    if (hasCode(e, "P2003")) throw new SubmissionError("occasion_not_found");
    throw e;
  }
}

// SC-10 の編集フォームの現在の値。自チームの生徒だけに返す。未提出なら null。アーカイブ済みの年度でも読める（編集はできない）。
export async function getOwnSummary(db: Db, actor: Actor, teamId: number, occasionId: number) {
  if (actor.role !== "student") throw new SubmissionError("forbidden");
  if (!isId(teamId) || !isId(occasionId)) throw new SubmissionError("invalid_input");
  if (!(await isMemberOf(db, actor, teamId))) throw new SubmissionError("forbidden");

  await loadTeamAndOccasion(db, teamId, occasionId);
  const row = await db.summary.findUnique({ where: { teamId_eventOccasionId: { teamId, eventOccasionId: occasionId } }, select: selectColumns });
  if (!row) return null;
  const slot = await db.materialSlot.findFirst({ where: { eventOccasionId: occasionId, slotType: SUMMARY_SLOT_TYPE }, select: { deadline: true } });
  return { ...row, extraSections: toExtraSections(row.extraSections), isLate: isLate(row.firstSubmittedAt, slot?.deadline ?? null) };
}
