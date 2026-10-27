import type { PrismaClient } from "@/generated/prisma/client";
import { isId, parseId } from "@/lib/ids";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-10（当日タイムテーブル）・design/04-screen.md SC-07（表示・当日進行）・SC-08（編集）。
// 発表順の更新の入口はここの setDisplayOrders の 1 つで、SC-07・SC-08 のどちらから来ても同じ検査を通る（decisions.md 2026-10-26・H-48）。
// 先行方針で組んでいる:
//   H-20 発表の時刻枠（開始時刻・所要・休憩）は列として持たず、発表順（presentations.display_order）だけで組む。
//   H-44 「発表中」が設定されている（current_presentation_id が空でない）間を、開催中とみなす。
// 動かせない行（H-48 ①⑥）: いま発表中の行と、それより前の行。「前」は発表順で決まるので、発表順が未設定の行は「前」に入れない（動かせる）。
//   いま発表中の行は、発表順が未設定でも動かせない。いま発表中の行が未設定のときは、動かせない行はその行だけになる。
// SC-08 の並び替えを塞ぐのは画面の振る舞いで、ここが守るのは動かせない行だけ（H-48 ③）。どの画面から来たかは区別しない。
// 検査と更新は、発表会の行を FOR UPDATE でロックしたトランザクションの中で行う（同時の入れ替え・切り替えで、検査から更新までの間に状態が変わらないように）。
// 認可の一次防衛線はここに置く（画面や Server Action が先に弾いても、ここでも必ず確かめる）。
// 発表順と「発表中」は一つの発表会の中で完結する。別の発表会の発表は指せない（current_presentation_id は複合外部キーでも守られる：decisions.md 2026-09-21）。

type Db = Pick<PrismaClient, "eventOccasion" | "presentation" | "teamMember" | "$queryRaw"> & Partial<Pick<PrismaClient, "$transaction">>;

export type TimetableErrorCode =
  | "forbidden"
  | "invalid_input"
  | "occasion_not_found"
  | "presentation_not_found"
  | "presentation_locked"
  | "duplicate_order";

export class TimetableError extends Error {
  constructor(readonly code: TimetableErrorCode) {
    super(code);
    this.name = "TimetableError";
  }
}

function assertRole(actor: Actor) {
  if (actor.role !== "teacher" && actor.role !== "student") throw new TimetableError("forbidden");
}

function assertTeacher(actor: Actor) {
  if (actor.role !== "teacher") throw new TimetableError("forbidden");
}

// 渡されたのがトランザクションならそのまま使い、素のクライアントなら $transaction で包む。
function inTransaction<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  return db.$transaction ? db.$transaction((tx) => fn(tx)) : fn(db);
}

async function lockOccasion(tx: Db, occasionId: number) {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM event_occasions WHERE id = ${occasionId} FOR UPDATE`;
  if (rows.length === 0) throw new TimetableError("occasion_not_found");
}

// 発表順の昇順。未設定（NULL）は最後に置き、同じ並びのなかでは発表の id 順にする。
function byDisplayOrder(a: { id: number; displayOrder: number | null }, b: { id: number; displayOrder: number | null }) {
  if (a.displayOrder === b.displayOrder) return a.id - b.id;
  if (a.displayOrder === null) return 1;
  if (b.displayOrder === null) return -1;
  return a.displayOrder - b.displayOrder;
}

// 動かせない行の id の集合。「発表中」が空なら無い。
function lockedIds(rows: { id: number; displayOrder: number | null }[], currentId: number | null): Set<number> {
  if (currentId === null) return new Set();
  const current = rows.find((r) => r.id === currentId);
  const locked = new Set<number>([currentId]);
  if (current?.displayOrder != null) {
    for (const r of rows) if (r.displayOrder !== null && r.displayOrder < current.displayOrder) locked.add(r.id);
  }
  return locked;
}

function sameSet(a: Set<number>, b: Set<number>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

// SC-07・SC-08 の表示。全員が読める。発表順の昇順（未設定は最後）で、「発表中」・「発表済み」（動かせない行のうち、いま発表中の行より前）・自チーム（生徒）を添える。
// 生徒はアーカイブ済みの年度の発表会を読めない（H-60 の先行方針と同じ線引き。getOccasion と同じ）。外れた行は「無い」と同じ occasion_not_found にする。
export async function getTimetable(db: Db, actor: Actor, occasionId: number) {
  assertRole(actor);
  if (!isId(occasionId)) throw new TimetableError("invalid_input");
  const occasion = await db.eventOccasion.findFirst({
    where: { id: occasionId, ...(actor.role === "teacher" ? {} : { fiscalYear: { isArchived: false } }) },
    select: { id: true, kind: true, currentPresentationId: true },
  });
  if (!occasion) throw new TimetableError("occasion_not_found");

  const presentations = await db.presentation.findMany({
    where: { eventOccasionId: occasionId },
    select: { id: true, teamId: true, displayOrder: true, team: { select: { name: true } } },
  });
  const userId = actor.role === "student" ? parseId(actor.userId) : null;
  const ownTeamIds = new Set(userId === null ? [] : (await db.teamMember.findMany({ where: { userId }, select: { teamId: true } })).map((m) => m.teamId));

  // 「発表済み」は、動かせない行のうち、いま発表中の行を除いたもの。動かせない行の規則（lockedIds）と同じ 1 か所から導く（SC-07：「T では動かせない行を示す」）。
  const locked = lockedIds(presentations, occasion.currentPresentationId);
  const rows = presentations.toSorted(byDisplayOrder).map((p) => ({
    presentationId: p.id,
    teamId: p.teamId,
    teamName: p.team.name,
    displayOrder: p.displayOrder,
    isCurrent: p.id === occasion.currentPresentationId,
    isDone: locked.has(p.id) && p.id !== occasion.currentPresentationId,
    isOwnTeam: ownTeamIds.has(p.teamId),
  }));
  return { occasion: { id: occasion.id, kind: occasion.kind, currentPresentationId: occasion.currentPresentationId }, rows };
}

export type DisplayOrderUpdate = { presentationId: number; displayOrder: number | null };

// 発表順の更新（SC-07 の当日の入れ替え・SC-08 の並び替えの保存で共通）。先生のみ。
// updates に挙げた発表だけを書き換える。挙げなかった発表は変えない。displayOrder は 1 以上の整数か null（未設定に戻す）。
// 動かせない行は、いまの発表順と違う値への更新を拒否する（presentation_locked）。同じ値への更新は通す（SC-08 が全行を送っても、動かせない行を触っていなければ通る）。
// 更新後に、同じ発表会のなかで発表順が重なるときは duplicate_order（DB の一意制約は DEFERRABLE INITIALLY DEFERRED で、コミット時まで検査されないため、ここで先に確かめる）。
export async function setDisplayOrders(db: Db, actor: Actor, occasionId: number, updates: DisplayOrderUpdate[]) {
  assertTeacher(actor);
  if (!isId(occasionId) || !Array.isArray(updates) || updates.length === 0) throw new TimetableError("invalid_input");
  for (const u of updates) {
    if (typeof u !== "object" || u === null || !isId(u.presentationId)) throw new TimetableError("invalid_input");
    if (u.displayOrder !== null && !isId(u.displayOrder)) throw new TimetableError("invalid_input");
  }
  if (new Set(updates.map((u) => u.presentationId)).size !== updates.length) throw new TimetableError("invalid_input");

  return inTransaction(db, async (tx) => {
    await lockOccasion(tx, occasionId);
    const occasion = await tx.eventOccasion.findUniqueOrThrow({ where: { id: occasionId }, select: { currentPresentationId: true } });
    const rows = await tx.presentation.findMany({ where: { eventOccasionId: occasionId }, select: { id: true, displayOrder: true } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    if (updates.some((u) => !byId.has(u.presentationId))) throw new TimetableError("presentation_not_found");

    const locked = lockedIds(rows, occasion.currentPresentationId);
    const changed = updates.filter((u) => byId.get(u.presentationId)!.displayOrder !== u.displayOrder);
    if (changed.some((u) => locked.has(u.presentationId))) throw new TimetableError("presentation_locked");

    const after = new Map(rows.map((r) => [r.id, r.displayOrder]));
    for (const u of changed) after.set(u.presentationId, u.displayOrder);
    // 動かせる行を、いま発表中の行より前の番号へ入れる更新も拒否する（動かせない行の位置＝順番の上での何番目かが変わり、まだ発表していない行に「発表済み」が付くため。
    // 水戸の読み：decisions.md 2026-10-26・H-48 の行の「位置」。新しい規則ではない）。更新後に動かせない行になる集合が、更新前と同じでなければ拒否する。
    // 発表中の行の発表順が未設定のときは、前後が決まらないので、この検査は働かない（H-48 の行の①）。
    if (!sameSet(lockedIds(rows, occasion.currentPresentationId), lockedIds(rows.map((r) => ({ id: r.id, displayOrder: after.get(r.id) ?? null })), occasion.currentPresentationId))) {
      throw new TimetableError("presentation_locked");
    }
    const orders = [...after.values()].filter((o): o is number => o !== null);
    if (new Set(orders).size !== orders.length) throw new TimetableError("duplicate_order");

    for (const u of changed) await tx.presentation.update({ where: { id: u.presentationId }, data: { displayOrder: u.displayOrder } });
    return { changed: changed.length };
  });
}

// 「発表中」の切り替え（SC-07）。先生のみ。null で空に戻す：「発表を終える」と「進行を終える」は、どちらもこの同じ更新（decisions.md 2026-10-26・H-48 ②）。
// 発表は、その発表会の発表だけを指せる。ほかの発表会の発表は presentation_not_found（複合外部キーでも守られているが、先に確かめて分かる理由で返す）。
export async function setCurrentPresentation(db: Db, actor: Actor, occasionId: number, presentationId: number | null) {
  assertTeacher(actor);
  if (!isId(occasionId) || (presentationId !== null && !isId(presentationId))) throw new TimetableError("invalid_input");

  return inTransaction(db, async (tx) => {
    await lockOccasion(tx, occasionId);
    if (presentationId !== null && (await tx.presentation.count({ where: { id: presentationId, eventOccasionId: occasionId } })) === 0) {
      throw new TimetableError("presentation_not_found");
    }
    // 複合外部キーのため Prisma の関係 API は使えない（schema.prisma の EventOccasion）。列を直接更新する。
    return tx.eventOccasion.update({ where: { id: occasionId }, data: { currentPresentationId: presentationId }, select: { id: true, currentPresentationId: true } });
  });
}
