import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isId } from "@/lib/ids";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-1（発表会の日程と資料枠の編集）・design/04-screen.md SC-05（T のみ）。
// 先行方針で組んでいる（06 の列は現行のまま。決着したら変わる箇所は、各項の先行方針に書かれた範囲）:
//   H-58 提出のある資料枠は削除を拒む。概要枠は削除できず、種類も変えられない（概要枠は 1 発表会 1 件・部分ユニークでも守られる）／
//   H-27 締切は NULL（未設定）を許す。
// 年度のアーカイブ済みかどうかでは塞がない：塞ぐ規則が正典に無い（チーム編集の H-55 と同じ扱い）。
// SC-05 の「名称」は実装しない：event_occasions に名称の列が無い（禁則1）。
// 認可の一次防衛線はここに置く（画面や Server Action が先に弾いても、ここでも必ず確かめる）。

type Db = Pick<PrismaClient, "materialSlot" | "eventOccasion">;

export type SlotErrorCode =
  | "forbidden"
  | "invalid_input"
  | "occasion_not_found"
  | "slot_not_found"
  | "summary_slot_exists"
  | "summary_slot_locked"
  | "slot_has_submissions";

export class SlotError extends Error {
  constructor(readonly code: SlotErrorCode) {
    super(code);
    this.name = "SlotError";
  }
}

// 概要枠の種類名（requirements.md §3-1「定番の資料枠」・06 の部分ユニーク `WHERE slot_type = '概要'`）。
export const SUMMARY_SLOT_TYPE = "概要";

export type NewSlotInput = { slotType: string; isRequired: boolean; deadline?: Date | null; templateUrl?: string | null };
export type SlotPatch = { slotType?: string; isRequired?: boolean; deadline?: Date | null; templateUrl?: string | null };

const slotSelect = { id: true, eventOccasionId: true, slotType: true, deadline: true, isRequired: true, templateUrl: true } as const;

function assertTeacher(actor: Actor) {
  if (actor.role !== "teacher") throw new SlotError("forbidden");
}

// Prisma のエラーコード: P2002 一意制約違反／P2003 外部キー違反／P2025 対象の行が無い。
function hasCode(e: unknown, code: string): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}

// NUL 文字（\0）は PostgreSQL が拒み、SlotError ではない例外（P2039）になるので、入力の誤りにする。
function requiredText(value: unknown): string {
  if (typeof value !== "string") throw new SlotError("invalid_input");
  const text = value.trim();
  if (text === "" || text.includes("\0")) throw new SlotError("invalid_input");
  return text;
}

function validDeadline(value: unknown): Date | null {
  if (value === null) return null;
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new SlotError("invalid_input");
  return value;
}

// テンプレート参照は、生徒の画面でリンクとして開かれる。javascript: などを入れさせないよう、http(s) の URL だけを受ける。空は未設定（NULL）。
function validTemplateUrl(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new SlotError("invalid_input");
  const text = value.trim();
  if (text === "") return null;
  if (text.includes("\0")) throw new SlotError("invalid_input");
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new SlotError("invalid_input");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new SlotError("invalid_input");
  return text;
}

// SC-04（T のみ）の資料枠の一覧。生徒には資料枠を出さない。定番の並び（概要→プレゼン資料）を保つため id の昇順。
export async function listMaterialSlots(db: Db, actor: Actor, occasionId: number) {
  assertTeacher(actor);
  if (!isId(occasionId)) throw new SlotError("invalid_input");
  return db.materialSlot.findMany({ where: { eventOccasionId: occasionId }, orderBy: { id: "asc" }, select: slotSelect });
}

// 資料枠の追加。種類は自由（定番に無い種類も足せる・decisions.md 2026-10-09）。同じ種類の任意枠を複数置くことも許す。ただし概要枠は 1 発表会に 1 件。
export async function addMaterialSlot(db: Db, actor: Actor, occasionId: number, input: NewSlotInput) {
  assertTeacher(actor);
  if (!isId(occasionId) || typeof input !== "object" || input === null || typeof input.isRequired !== "boolean") throw new SlotError("invalid_input");
  const data = {
    eventOccasionId: occasionId,
    slotType: requiredText(input.slotType),
    isRequired: input.isRequired,
    deadline: validDeadline(input.deadline ?? null),
    templateUrl: validTemplateUrl(input.templateUrl ?? null),
  };
  try {
    return await db.materialSlot.create({ data, select: slotSelect });
  } catch (e) {
    if (hasCode(e, "P2002")) throw new SlotError("summary_slot_exists");
    if (hasCode(e, "P2003")) throw new SlotError("occasion_not_found");
    throw e;
  }
}

// 資料枠の編集。渡した項目だけ変える（deadline・templateUrl は null で未設定に戻す）。概要枠の種類は変えられない（H-58）。
export async function updateMaterialSlot(db: Db, actor: Actor, slotId: number, patch: SlotPatch) {
  assertTeacher(actor);
  if (!isId(slotId) || typeof patch !== "object" || patch === null) throw new SlotError("invalid_input");
  if (patch.isRequired !== undefined && typeof patch.isRequired !== "boolean") throw new SlotError("invalid_input");
  const data: Prisma.MaterialSlotUpdateInput = {};
  if (patch.slotType !== undefined) data.slotType = requiredText(patch.slotType);
  if (patch.isRequired !== undefined) data.isRequired = patch.isRequired;
  if (patch.deadline !== undefined) data.deadline = validDeadline(patch.deadline);
  if (patch.templateUrl !== undefined) data.templateUrl = validTemplateUrl(patch.templateUrl);

  const current = await db.materialSlot.findUnique({ where: { id: slotId }, select: { slotType: true } });
  if (!current) throw new SlotError("slot_not_found");
  if (current.slotType === SUMMARY_SLOT_TYPE && data.slotType !== undefined && data.slotType !== SUMMARY_SLOT_TYPE) throw new SlotError("summary_slot_locked");
  try {
    return await db.materialSlot.update({ where: { id: slotId }, data, select: slotSelect });
  } catch (e) {
    // 概要以外の枠を「概要」に変えると、部分ユニーク（1 発表会に概要枠 1 件）に当たる。
    if (hasCode(e, "P2002")) throw new SlotError("summary_slot_exists");
    if (hasCode(e, "P2025")) throw new SlotError("slot_not_found");
    throw e;
  }
}

// 資料枠の削除。提出のある枠と概要枠は拒む（H-58）。提出の確認と削除の間に提出が入っても、外部キー（RESTRICT）が削除を拒む。
export async function deleteMaterialSlot(db: Db, actor: Actor, slotId: number) {
  assertTeacher(actor);
  if (!isId(slotId)) throw new SlotError("invalid_input");
  const slot = await db.materialSlot.findUnique({ where: { id: slotId }, select: { slotType: true, _count: { select: { submissions: true } } } });
  if (!slot) throw new SlotError("slot_not_found");
  if (slot.slotType === SUMMARY_SLOT_TYPE) throw new SlotError("summary_slot_locked");
  if (slot._count.submissions > 0) throw new SlotError("slot_has_submissions");
  try {
    await db.materialSlot.delete({ where: { id: slotId } });
  } catch (e) {
    if (hasCode(e, "P2003")) throw new SlotError("slot_has_submissions");
    if (hasCode(e, "P2025")) throw new SlotError("slot_not_found");
    throw e;
  }
}

// 日程（開催日）の編集。event_date は日付だけを持つ（タイムゾーンを持たない）ので、"YYYY-MM-DD" の文字列で受ける。null で未設定に戻す。
export async function updateOccasionDate(db: Db, actor: Actor, occasionId: number, eventDate: string | null) {
  assertTeacher(actor);
  if (!isId(occasionId)) throw new SlotError("invalid_input");
  let date: Date | null = null;
  if (eventDate !== null) {
    // 年は西暦 4 桁で 1000 以上（年度と同じ。0000 年は PostgreSQL が拒む）。
    if (typeof eventDate !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(eventDate)) throw new SlotError("invalid_input");
    date = new Date(`${eventDate}T00:00:00Z`);
    // 2026-02-30 のような実在しない日付は、Date が繰り上げるので、書き戻して一致を確かめる。
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== eventDate) throw new SlotError("invalid_input");
  }
  try {
    return await db.eventOccasion.update({ where: { id: occasionId }, data: { eventDate: date }, select: { id: true, kind: true, eventDate: true } });
  } catch (e) {
    if (hasCode(e, "P2025")) throw new SlotError("occasion_not_found");
    throw e;
  }
}
