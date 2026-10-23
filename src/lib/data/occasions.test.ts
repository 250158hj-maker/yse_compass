import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { getCurrentYearOccasions, getOccasion } from "@/lib/data/occasions";
import { describeDb } from "@/test/describe-db";
import { EVENT_KINDS, setupFiscalYear, setYearArchived, type Actor } from "@/lib/data/years";

// DB を使うテスト。流儀は years.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。

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

describeDb("getCurrentYearOccasions の認可（H-16：読み取りでもロールを確かめる）", () => {
  it("ロールが先生でも生徒でもない主体には返さない（forbidden）", async () => {
    await inTransaction(async (db) => {
      await setupFiscalYear(db, teacher, { year: 9508, classNames: ["IG21"] });
      for (const role of [undefined, "", "admin", null]) {
        await expect(getCurrentYearOccasions(db, { userId: "", role } as unknown as Actor)).rejects.toMatchObject({ name: "YearError", code: "forbidden" });
      }
    });
  });
});

describeDb("getOccasion（SC-04 の概要・H-60 の先行方針と同じ線引き）", () => {
  async function seed(db: Parameters<typeof setupFiscalYear>[0] & Parameters<typeof getOccasion>[0]) {
    const open = await setupFiscalYear(db, teacher, { year: 9511, classNames: ["IG21"] });
    const closed = await setupFiscalYear(db, teacher, { year: 9510, classNames: ["IG21"] });
    await setYearArchived(db, teacher, closed.id, true);
    const openOccasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId: open.id, kind: "設計" } });
    const closedOccasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId: closed.id, kind: "設計" } });
    return { openOccasion, closedOccasion };
  }

  it("先生にも生徒にも、未アーカイブの年度の発表会の概要を返す。年度の状態つき", async () => {
    await inTransaction(async (db) => {
      const { openOccasion } = await seed(db);
      for (const actor of [teacher, student]) {
        expect(await getOccasion(db, actor, openOccasion.id)).toEqual({
          id: openOccasion.id,
          kind: "設計",
          eventDate: null,
          isPublished: false,
          fiscalYear: { id: openOccasion.fiscalYearId, year: 9511, isArchived: false },
        });
      }
    });
  });

  it("アーカイブ済みの年度の発表会は、先生には返し、生徒には返さない（無いものとして null）", async () => {
    await inTransaction(async (db) => {
      const { closedOccasion } = await seed(db);
      expect((await getOccasion(db, teacher, closedOccasion.id))?.fiscalYear).toMatchObject({ year: 9510, isArchived: true });
      expect(await getOccasion(db, student, closedOccasion.id)).toBeNull();
    });
  });

  it("無い ID・範囲外の ID は null（権限が無い場合と区別しない）", async () => {
    await inTransaction(async (db) => {
      for (const id of [2_147_483_647, 0, -1, 1.5, Number.NaN, 3_000_000_000]) {
        expect(await getOccasion(db, teacher, id)).toBeNull();
        expect(await getOccasion(db, student, id)).toBeNull();
      }
    });
  });

  it("ロールが先生でも生徒でもない主体には返さない（forbidden）", async () => {
    await inTransaction(async (db) => {
      const { openOccasion } = await seed(db);
      for (const role of [undefined, "", "admin", null]) {
        await expect(getOccasion(db, { userId: "", role } as unknown as Actor, openOccasion.id)).rejects.toMatchObject({ name: "YearError", code: "forbidden" });
      }
    });
  });
});

describe("getCurrentYearOccasions（未アーカイブの年度が無い）", () => {
  it("null を返す（年度セットアップの前・全年度のアーカイブ後）", async () => {
    const db = { fiscalYear: { findFirst: async () => null } } as unknown as Db;
    expect(await getCurrentYearOccasions(db, student)).toBeNull();
  });
});
