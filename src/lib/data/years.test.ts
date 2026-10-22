import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { EVENT_KINDS, listClassNameDefaults, listFiscalYears, setupFiscalYear, setYearArchived, YearError, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は auth/callbacks.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// DB が失敗すると PostgreSQL はそのトランザクションを中止するので、DB のエラーを期待する検証は各テストの最後に置く。

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

const teacher: Actor = { userId: "1", role: "teacher" };
const student: Actor = { userId: "2", role: "student" };
const classNames = ["AI21", "BD21", "GS21", "IG21", "IG22"];

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
      const occasions = await db.eventOccasion.findMany({ where: { fiscalYearId: id } });
      // 並びは id の昇順に頼らず、種別の並び（EVENT_KINDS）で比べる。
      const kinds = occasions.map((o) => o.kind).sort((a, b) => EVENT_KINDS.indexOf(a as never) - EVENT_KINDS.indexOf(b as never));
      expect(kinds).toEqual([...EVENT_KINDS]);
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

  it("クラス名は前後の空白を除いて保存する", async () => {
    await inTransaction(async (db) => {
      const a = await setupFiscalYear(db, teacher, { year: 9005, classNames: [" IG21 ", "AI21"] });
      const classes = await db.schoolClass.findMany({ where: { fiscalYearId: a.id }, orderBy: { name: "asc" }, select: { name: true } });
      expect(classes.map((c) => c.name)).toEqual(["AI21", "IG21"]);
    });
  });

  it("クラスが 0 件では確定させない（何も作らない）", async () => {
    await inTransaction(async (db) => {
      await expectError(setupFiscalYear(db, teacher, { year: 9006, classNames: [] }), "invalid_input");
      expect(await db.fiscalYear.count({ where: { year: 9006 } })).toBe(0);
    });
  });

  it("生徒は実行できない", async () => {
    await inTransaction(async (db) => {
      await expectError(setupFiscalYear(db, student, { year: 9007, classNames }), "forbidden");
      expect(await db.fiscalYear.count({ where: { year: 9007 } })).toBe(0);
    });
  });

  it("年度が整数でない・西暦 4 桁でないものは、入力の誤りとして返す", async () => {
    await inTransaction(async (db) => {
      await expectError(setupFiscalYear(db, teacher, { year: 2026.5, classNames }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: 0, classNames }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: 999, classNames }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: 10000, classNames }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: 3_000_000_000, classNames }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: Number.NaN, classNames }), "invalid_input");
    });
  });

  it("クラス名が空・同じ名前の重複は、入力の誤りとして返す（何も作らない）", async () => {
    await inTransaction(async (db) => {
      await expectError(setupFiscalYear(db, teacher, { year: 9008, classNames: ["IG21", "  "] }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: 9008, classNames: ["IG21", "IG21 "] }), "invalid_input");
      await expectError(setupFiscalYear(db, teacher, { year: 9008, classNames: ["IG\u00002"] }), "invalid_input");
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

describeDb("listClassNameDefaults（H-57：前年度のクラスを初期値に出す）", () => {
  it("year が最大の年度のクラスを、名前の昇順で返す", async () => {
    await inTransaction(async (db) => {
      await setupFiscalYear(db, teacher, { year: 9101, classNames: ["IG21"] });
      await setupFiscalYear(db, teacher, { year: 9102, classNames: ["IG22", "AI21"] });
      expect(await listClassNameDefaults(db, teacher)).toEqual(["AI21", "IG22"]);
    });
  });

  it("生徒には返さない（先生専用・SC-19）", async () => {
    await inTransaction(async (db) => {
      await setupFiscalYear(db, teacher, { year: 9103, classNames: ["IG21"] });
      await expect(listClassNameDefaults(db, student)).rejects.toMatchObject({ name: "YearError", code: "forbidden" });
    });
  });
});

describe("listClassNameDefaults（前年度が無い）", () => {
  it("年度が 1 件も無ければ空を返す（初年度は先生が入力する）", async () => {
    const db = { fiscalYear: { findFirst: async () => null } } as unknown as Parameters<typeof listClassNameDefaults>[0];
    expect(await listClassNameDefaults(db, teacher)).toEqual([]);
  });
});

describeDb("listFiscalYears（SC-19：年度の一覧と状態）", () => {
  it("year の新しい順に、年度と状態を返す", async () => {
    await inTransaction(async (db) => {
      const older = await setupFiscalYear(db, teacher, { year: 9401, classNames: ["IG21"] });
      const newer = await setupFiscalYear(db, teacher, { year: 9402, classNames: ["IG21"] });
      await setYearArchived(db, teacher, older.id, true);
      const mine = (await listFiscalYears(db, teacher)).filter((y) => y.year >= 9401 && y.year <= 9402);
      expect(mine).toEqual([
        { id: newer.id, year: 9402, isArchived: false },
        { id: older.id, year: 9401, isArchived: true },
      ]);
    });
  });

  it("生徒には返さない（先生専用・SC-19）", async () => {
    await inTransaction(async (db) => {
      await expectError(listFiscalYears(db, student), "forbidden");
    });
  });
});

describeDb("setYearArchived（§3-7：アーカイブと解除。可逆）", () => {
  it("アーカイブして、解除で元に戻る", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9403, classNames: ["IG21"] });
      expect(await setYearArchived(db, teacher, id, true)).toEqual({ id, year: 9403, isArchived: true });
      expect((await db.fiscalYear.findUniqueOrThrow({ where: { id } })).isArchived).toBe(true);
      expect(await setYearArchived(db, teacher, id, false)).toEqual({ id, year: 9403, isArchived: false });
      expect((await db.fiscalYear.findUniqueOrThrow({ where: { id } })).isArchived).toBe(false);
    });
  });

  it("すでにその状態でも成功する（再送で失敗させない）", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9404, classNames: ["IG21"] });
      expect(await setYearArchived(db, teacher, id, false)).toMatchObject({ isArchived: false });
      await setYearArchived(db, teacher, id, true);
      expect(await setYearArchived(db, teacher, id, true)).toMatchObject({ isArchived: true });
    });
  });

  it("アーカイブしても、年度の中身（クラス・発表会）は消えない", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9405, classNames: ["IG21"] });
      await setYearArchived(db, teacher, id, true);
      expect(await db.schoolClass.count({ where: { fiscalYearId: id } })).toBe(1);
      expect(await db.eventOccasion.count({ where: { fiscalYearId: id } })).toBe(EVENT_KINDS.length);
    });
  });

  it("生徒は forbidden。状態は変わらない", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9406, classNames: ["IG21"] });
      await expectError(setYearArchived(db, student, id, true), "forbidden");
      expect((await db.fiscalYear.findUniqueOrThrow({ where: { id } })).isArchived).toBe(false);
    });
  });

  it("ID の形が不正なら invalid_input、無い年度なら year_not_found（DB のエラーなので最後）", async () => {
    await inTransaction(async (db) => {
      await expectError(setYearArchived(db, teacher, 0, true), "invalid_input");
      await expectError(setYearArchived(db, teacher, 1.5, true), "invalid_input");
      await expectError(setYearArchived(db, teacher, 3_000_000_000, true), "invalid_input");
      await expectError(setYearArchived(db, teacher, 1, "yes" as never), "invalid_input");
      await expectError(setYearArchived(db, teacher, 2_147_483_647, true), "year_not_found");
    });
  });
});

describe("YearError", () => {
  it("code を持つ", () => {
    expect(new YearError("forbidden").code).toBe("forbidden");
  });
});
