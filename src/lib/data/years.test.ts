import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_CLASS_NAMES, setupFiscalYear, YearError } from "@/lib/data/years";

// DB を使うテスト。流儀は auth/callbacks.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// DB が失敗すると PostgreSQL はそのトランザクションを中止するので、DB のエラーを期待する検証は各テストの最後に置く。
const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

type Db = Parameters<typeof setupFiscalYear>[0];

class Rollback extends Error {}

let prisma: PrismaClient;

beforeAll(() => {
  if (!process.env.DATABASE_URL) return;
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 10 }) });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

async function inTransaction(fn: (db: Db & Pick<PrismaClient, "eventOccasion" | "materialSlot" | "schoolClass" | "team">) => Promise<void>) {
  try {
    await prisma.$transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

const teacher = { role: "teacher" } as const;
const student = { role: "student" } as const;
const classNames = [...DEFAULT_CLASS_NAMES];

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "YearError", code });
}

// 実際の年度と重ならない year で作る。
describeDb("setupFiscalYear（requirements.md §3-1・H-57 の先行方針）", () => {
  it("年度・クラス・4 発表会・定番の資料枠を一括で作る", async () => {
    await inTransaction(async (db) => {
      const { id, year } = await setupFiscalYear(db, teacher, { year: 9001, classNames });
      expect(year).toBe(9001);

      const fiscalYear = await db.fiscalYear.findUniqueOrThrow({ where: { id }, select: { isArchived: true } });
      expect(fiscalYear.isArchived).toBe(false);

      const classes = await db.schoolClass.findMany({ where: { fiscalYearId: id }, orderBy: { name: "asc" }, select: { name: true } });
      expect(classes.map((c) => c.name)).toEqual([...classNames].sort());
    });
  });

  it("発表会は企画→設計→試作→最終の順で 4 件。日程は未設定・非公開・いま発表中は無し", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9002, classNames });
      const occasions = await db.eventOccasion.findMany({ where: { fiscalYearId: id }, orderBy: { id: "asc" } });
      expect(occasions.map((o) => o.kind)).toEqual(["企画", "設計", "試作", "最終"]);
      for (const o of occasions) {
        expect(o.eventDate).toBeNull();
        expect(o.isPublished).toBe(false);
        expect(o.currentPresentationId).toBeNull();
      }
    });
  });

  it("どの発表会にも、概要とプレゼン資料の 2 枠（既定は必須・締切とテンプレートは未設定）", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9003, classNames });
      const occasions = await db.eventOccasion.findMany({ where: { fiscalYearId: id }, select: { id: true } });
      for (const o of occasions) {
        const slots = await db.materialSlot.findMany({ where: { eventOccasionId: o.id }, orderBy: { id: "asc" } });
        expect(slots.map((s) => s.slotType)).toEqual(["概要", "プレゼン資料"]);
        for (const s of slots) {
          expect(s.isRequired).toBe(true);
          expect(s.deadline).toBeNull();
          expect(s.templateUrl).toBeNull();
        }
      }
    });
  });

  it("チームは作らない（年度セットアップとチーム登録は独立・H-9）", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9004, classNames });
      expect(await db.team.count({ where: { class: { fiscalYearId: id } } })).toBe(0);
    });
  });

  it("クラス名は前後の空白を除いて保存する。クラスが 0 件でも作れる", async () => {
    await inTransaction(async (db) => {
      const a = await setupFiscalYear(db, teacher, { year: 9005, classNames: [" IG21 ", "AI21"] });
      const classes = await db.schoolClass.findMany({ where: { fiscalYearId: a.id }, orderBy: { name: "asc" }, select: { name: true } });
      expect(classes.map((c) => c.name)).toEqual(["AI21", "IG21"]);

      const b = await setupFiscalYear(db, teacher, { year: 9006, classNames: [] });
      expect(await db.schoolClass.count({ where: { fiscalYearId: b.id } })).toBe(0);
    });
  });

  it("生徒は実行できない", async () => {
    await inTransaction(async (db) => {
      await expectError(setupFiscalYear(db, student, { year: 9007, classNames }), "forbidden");
      expect(await db.fiscalYear.count({ where: { year: 9007 } })).toBe(0);
    });
  });

  it("年度が整数でない・0 以下は、入力の誤りとして返す", async () => {
    await inTransaction(async (db) => {
      await expectError(setupFiscalYear(db, teacher, { year: 2026.5, classNames }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: 0, classNames }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: Number.NaN, classNames }), "invalid_input");
    });
  });

  it("クラス名が空・同じ名前の重複は、入力の誤りとして返す（何も作らない）", async () => {
    await inTransaction(async (db) => {
      await expectError(setupFiscalYear(db, teacher, { year: 9008, classNames: ["IG21", "  "] }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: 9008, classNames: ["IG21", "IG21 "] }), "invalid_input");
      expect(await db.fiscalYear.count({ where: { year: 9008 } })).toBe(0);
    });
  });

  it("同じ年度を 2 回実行すると拒む（H-57 の④）", async () => {
    await inTransaction(async (db) => {
      await setupFiscalYear(db, teacher, { year: 9009, classNames });
      await expectError(setupFiscalYear(db, teacher, { year: 9009, classNames }), "duplicate_year");
    });
  });
});

describe("YearError", () => {
  it("code を持つ", () => {
    expect(new YearError("forbidden").code).toBe("forbidden");
  });
});
