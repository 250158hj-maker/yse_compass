import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { getCurrentYearOccasions } from "@/lib/data/occasions";
import { EVENT_KINDS, setupFiscalYear, setYearArchived, type Actor } from "@/lib/data/years";

// DB を使うテスト。流儀は years.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

type Db = Parameters<typeof getCurrentYearOccasions>[0];

class Rollback extends Error {}

let prisma: PrismaClient;

beforeAll(() => {
  if (!process.env.DATABASE_URL) return;
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 10 }) });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

async function inTransaction(fn: (db: Db & Pick<PrismaClient, "eventOccasion">) => Promise<void>) {
  try {
    await prisma.$transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

const teacher: Actor = { userId: "1", role: "teacher" };
const student: Actor = { userId: "2", role: "student" };

// 実際の年度より大きい year で作る（当年度は year が最大の未アーカイブの年度なので、テストの年度が当年度になる）。
describeDb("getCurrentYearOccasions（SC-03・H-54 の先行方針）", () => {
  it("当年度の 4 発表会を、企画→設計→試作→最終の順で返す", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9501, classNames: ["IG21"] });
      await db.eventOccasion.updateMany({ where: { fiscalYearId: id, kind: "企画" }, data: { eventDate: new Date("2026-12-01") } });
      const result = await getCurrentYearOccasions(db, teacher);
      expect(result?.fiscalYear).toEqual({ id, year: 9501 });
      expect(result?.occasions.map((o) => o.kind)).toEqual([...EVENT_KINDS]);
      expect(result?.occasions[0]).toMatchObject({ eventDate: new Date("2026-12-01"), isPublished: false });
      expect(result?.occasions[1]).toMatchObject({ eventDate: null, isPublished: false });
    });
  });

  it("並びは id の昇順ではなく種別の順序（企画の id が最大でも先頭）", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9507, classNames: ["IG21"] });
      // 作成順（id の昇順）が企画→設計→試作→最終なので、企画と最終の種別を入れ替えて、id の昇順と種別の順序を食い違わせる。
      const rows = await db.eventOccasion.findMany({ where: { fiscalYearId: id }, orderBy: { id: "asc" } });
      await db.eventOccasion.update({ where: { id: rows[0].id }, data: { kind: "最終" } });
      await db.eventOccasion.update({ where: { id: rows[3].id }, data: { kind: "企画" } });
      const result = await getCurrentYearOccasions(db, teacher);
      expect(result?.occasions.map((o) => o.kind)).toEqual([...EVENT_KINDS]);
      expect(result?.occasions[0].id).toBe(rows[3].id);
    });
  });

  it("生徒にも同じ結果を返す", async () => {
    await inTransaction(async (db) => {
      await setupFiscalYear(db, teacher, { year: 9502, classNames: ["IG21"] });
      expect(await getCurrentYearOccasions(db, student)).toEqual(await getCurrentYearOccasions(db, teacher));
    });
  });

  it("未アーカイブの年度のうち year が最大のものを当年度にする。アーカイブすると次の年度に移り、解除で戻る", async () => {
    await inTransaction(async (db) => {
      const older = await setupFiscalYear(db, teacher, { year: 9503, classNames: ["IG21"] });
      const newer = await setupFiscalYear(db, teacher, { year: 9504, classNames: ["IG21"] });
      expect((await getCurrentYearOccasions(db, teacher))?.fiscalYear.id).toBe(newer.id);
      await setYearArchived(db, teacher, newer.id, true);
      expect((await getCurrentYearOccasions(db, teacher))?.fiscalYear.id).toBe(older.id);
      await setYearArchived(db, teacher, newer.id, false);
      expect((await getCurrentYearOccasions(db, teacher))?.fiscalYear.id).toBe(newer.id);
    });
  });

  it("他の年度の発表会は混ざらない", async () => {
    await inTransaction(async (db) => {
      await setupFiscalYear(db, teacher, { year: 9505, classNames: ["IG21"] });
      await setupFiscalYear(db, teacher, { year: 9506, classNames: ["IG21"] });
      const result = await getCurrentYearOccasions(db, teacher);
      expect(result?.occasions).toHaveLength(EVENT_KINDS.length);
      const years = await db.eventOccasion.findMany({ where: { id: { in: result?.occasions.map((o) => o.id) ?? [] } }, select: { fiscalYearId: true } });
      expect(new Set(years.map((y) => y.fiscalYearId))).toEqual(new Set([result?.fiscalYear.id]));
    });
  });
});

describe("getCurrentYearOccasions（未アーカイブの年度が無い）", () => {
  it("null を返す（年度セットアップの前・全年度のアーカイブ後）", async () => {
    const db = { fiscalYear: { findFirst: async () => null } } as unknown as Db;
    expect(await getCurrentYearOccasions(db, student)).toBeNull();
  });
});
