import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { EVENT_KINDS, listClassNameDefaults, listFiscalYears, setupFiscalYear, setYearArchived, updateFiscalYear, YearError, type Actor } from "@/lib/data/years";
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
describeDb("setupFiscalYear（requirements.md §3-1・decisions.md 2026-11-02 のクラスの入力の行・H-57 の先行方針）", () => {
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

  it("クラス名は 50 字まで。超えると入力の誤りとして返す（何も作らない）", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9031, classNames: ["あ".repeat(50)] });
      expect((await db.schoolClass.findMany({ where: { fiscalYearId: id } }))[0].name).toHaveLength(50);
      await expectError(setupFiscalYear(db, teacher, { year: 9032, classNames: ["あ".repeat(51)] }), "invalid_input");
      expect(await db.fiscalYear.count({ where: { year: 9032 } })).toBe(0);
    });
  });

  it("同じ年度を 2 回実行すると拒む（H-57 の④）", async () => {
    await inTransaction(async (db) => {
      await setupFiscalYear(db, teacher, { year: 9009, classNames });
      await expectError(setupFiscalYear(db, teacher, { year: 9009, classNames }), "duplicate_year");
    });
  });
});

describeDb("listClassNameDefaults（decisions.md 2026-11-02 のクラスの入力の行：前年度のクラスを初期値に出す）", () => {
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
  it("year の新しい順に、年度と状態とクラス（名前の昇順）を返す", async () => {
    await inTransaction(async (db) => {
      const older = await setupFiscalYear(db, teacher, { year: 9401, classNames: ["IG21"] });
      const newer = await setupFiscalYear(db, teacher, { year: 9402, classNames: ["IG22", "IG21"] });
      await setYearArchived(db, teacher, older.id, true);
      const mine = (await listFiscalYears(db, teacher)).filter((y) => y.year >= 9401 && y.year <= 9402);
      expect(mine.map((y) => ({ id: y.id, year: y.year, isArchived: y.isArchived, classes: y.classes.map((c) => c.name) }))).toEqual([
        { id: newer.id, year: 9402, isArchived: false, classes: ["IG21", "IG22"] },
        { id: older.id, year: 9401, isArchived: true, classes: ["IG21"] },
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

describeDb("updateFiscalYear（誤って登録した年度の訂正：年度の数字・クラス名の直しと追加。削除は持たない）", () => {
  async function classesOf(db: Parameters<Parameters<typeof inTransaction>[0]>[0], fiscalYearId: number) {
    return db.schoolClass.findMany({ where: { fiscalYearId }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  }

  it("年度の数字を直せる。クラス・発表会・資料枠はそのまま残る", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9701, classNames: ["IG21"] });
      const before = await classesOf(db, id);
      const result = await updateFiscalYear(db, teacher, id, { year: 9702, classes: before });
      expect(result).toEqual({ id, year: 9702 });
      expect(await classesOf(db, id)).toEqual(before);
      expect(await db.eventOccasion.count({ where: { fiscalYearId: id } })).toBe(EVENT_KINDS.length);
      expect(await db.materialSlot.count({ where: { eventOccasion: { fiscalYearId: id } } })).toBe(EVENT_KINDS.length * 2);
    });
  });

  it("クラス名を直し（id は変わらない）、新しいクラスを足せる。前後の空白は除く", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9703, classNames: ["IG21", "BD21"] });
      const [bd, ig] = await classesOf(db, id);
      await updateFiscalYear(db, teacher, id, { year: 9703, classes: [{ id: bd.id, name: " BD22 " }, { id: ig.id, name: ig.name }, { name: " GS21 " }] });
      const after = await classesOf(db, id);
      expect(after.map((c) => c.name)).toEqual(["BD22", "GS21", "IG21"]);
      expect(after.find((c) => c.name === "BD22")?.id).toBe(bd.id);
    });
  });

  it("入力に含まれない既存のクラスは消さない（クラスの削除は持たない）。チームが結びついていても名前を直せる", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9704, classNames: ["IG21", "BD21"] });
      const [bd, ig] = await classesOf(db, id);
      const team = await db.team.create({ data: { classId: ig.id, name: "訂正のテスト" }, select: { id: true } });
      await updateFiscalYear(db, teacher, id, { year: 9704, classes: [{ id: ig.id, name: "IG23" }] });
      expect((await classesOf(db, id)).map((c) => c.name)).toEqual(["BD21", "IG23"]);
      expect((await db.team.findUniqueOrThrow({ where: { id: team.id } })).classId).toBe(ig.id);
      // 入力に含めなかったクラスは、名前も id も変わらない。
      expect((await classesOf(db, id)).find((c) => c.name === "BD21")?.id).toBe(bd.id);
    });
  });

  it("アーカイブ済みの年度でも直せる（状態で塞がない・保留中の先行方針）。アーカイブの状態は変わらない", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9705, classNames: ["IG21"] });
      await setYearArchived(db, teacher, id, true);
      await updateFiscalYear(db, teacher, id, { year: 9706, classes: await classesOf(db, id) });
      expect(await db.fiscalYear.findUniqueOrThrow({ where: { id }, select: { year: true, isArchived: true } })).toEqual({ year: 9706, isArchived: true });
    });
  });

  it("生徒は forbidden。何も変わらない", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9707, classNames: ["IG21"] });
      await expectError(updateFiscalYear(db, student, id, { year: 9708, classes: [{ name: "IG22" }] }), "forbidden");
      expect((await db.fiscalYear.findUniqueOrThrow({ where: { id } })).year).toBe(9707);
      expect((await classesOf(db, id)).map((c) => c.name)).toEqual(["IG21"]);
    });
  });

  it("年度・ID の形が不正、クラス名が空・重複・NUL を含むときは invalid_input。何も変わらない", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9709, classNames: ["IG21"] });
      const classes = await classesOf(db, id);
      await expectError(updateFiscalYear(db, teacher, id, { year: 999, classes }), "invalid_input");
      await expectError(updateFiscalYear(db, teacher, id, { year: 10000, classes }), "invalid_input");
      await expectError(updateFiscalYear(db, teacher, id, { year: 9709.5, classes }), "invalid_input");
      await expectError(updateFiscalYear(db, teacher, 0, { year: 9710, classes }), "invalid_input");
      await expectError(updateFiscalYear(db, teacher, id, { year: 9710, classes: [{ id: 0, name: "IG21" }] }), "invalid_input");
      await expectError(updateFiscalYear(db, teacher, id, { year: 9710, classes: [{ id: classes[0].id, name: "  " }] }), "invalid_input");
      await expectError(updateFiscalYear(db, teacher, id, { year: 9710, classes: [{ id: classes[0].id, name: "A" }, { name: "A" }] }), "invalid_input");
      await expectError(updateFiscalYear(db, teacher, id, { year: 9710, classes: [{ name: "A\0B" }] }), "invalid_input");
      expect((await db.fiscalYear.findUniqueOrThrow({ where: { id } })).year).toBe(9709);
    });
  });

  it("クラス名は 50 字まで。超えると invalid_input（何も変わらない）", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9717, classNames: ["IG21"] });
      const [cls] = await classesOf(db, id);
      await updateFiscalYear(db, teacher, id, { year: 9717, classes: [{ id: cls.id, name: "あ".repeat(50) }] });
      await expectError(updateFiscalYear(db, teacher, id, { year: 9717, classes: [{ id: cls.id, name: "あ".repeat(51) }] }), "invalid_input");
      await expectError(updateFiscalYear(db, teacher, id, { year: 9717, classes: [{ name: "い".repeat(51) }] }), "invalid_input");
      expect((await classesOf(db, id)).map((c) => c.name)).toEqual(["あ".repeat(50)]);
    });
  });

  it("名前の入れ替えは、1 件ずつの更新で相手の名前と重なり duplicate_class（扱わない・保存を分ける運用。DB のエラーなので最後）", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9718, classNames: ["IG21", "IG22"] });
      const [ig21, ig22] = await classesOf(db, id);
      await expectError(
        updateFiscalYear(db, teacher, id, { year: 9718, classes: [{ id: ig21.id, name: "IG22" }, { id: ig22.id, name: "IG21" }] }),
        "duplicate_class",
      );
    });
  });

  it("他の年度と同じ年度にすると duplicate_year。自分の今の年度のままなら成功する", async () => {
    await inTransaction(async (db) => {
      await setupFiscalYear(db, teacher, { year: 9711, classNames: ["IG21"] });
      const { id } = await setupFiscalYear(db, teacher, { year: 9712, classNames: ["IG21"] });
      expect(await updateFiscalYear(db, teacher, id, { year: 9712, classes: await classesOf(db, id) })).toEqual({ id, year: 9712 });
      await expectError(updateFiscalYear(db, teacher, id, { year: 9711, classes: [] }), "duplicate_year");
    });
  });

  it("無い年度・他の年度のクラスの id は year_not_found（DB のエラーなので最後）", async () => {
    await inTransaction(async (db) => {
      const a = await setupFiscalYear(db, teacher, { year: 9713, classNames: ["IG21"] });
      const b = await setupFiscalYear(db, teacher, { year: 9714, classNames: ["IG21"] });
      const [bClass] = await classesOf(db, b.id);
      await expectError(updateFiscalYear(db, teacher, 2_147_483_647, { year: 9715, classes: [] }), "year_not_found");
      await expectError(updateFiscalYear(db, teacher, a.id, { year: 9713, classes: [{ id: bClass.id, name: "乗っ取り" }] }), "year_not_found");
    });
  });

  it("入力に無い既存のクラスと同じ名前を足すと duplicate_class（DB のエラーなので最後）", async () => {
    await inTransaction(async (db) => {
      const { id } = await setupFiscalYear(db, teacher, { year: 9716, classNames: ["IG21", "BD21"] });
      const [, ig] = await classesOf(db, id);
      await expectError(updateFiscalYear(db, teacher, id, { year: 9716, classes: [{ id: ig.id, name: "IG22" }, { name: "BD21" }] }), "duplicate_class");
    });
  });
});

// 「失敗したら何も変わらない」は、エラーでトランザクションが中止になる関係で、トランザクションの外で確かめる（このテストだけ、データを作って後始末する）。
describeDb("updateFiscalYear（途中まで反映されない）", () => {
  it("クラス名が重なって失敗したとき、同じ入力の年度の数字・クラス名の直しも反映されない", async () => {
    const created = await setupFiscalYear(prisma, teacher, { year: 9791, classNames: ["IG21", "BD21"] });
    try {
      const [bd, ig] = await prisma.schoolClass.findMany({ where: { fiscalYearId: created.id }, orderBy: { name: "asc" } });
      // BD21 は入力に無いので残る。IG21→IG22 は通るが、足す BD21 が既存と重なって失敗する。
      await expectError(
        updateFiscalYear(prisma, teacher, created.id, { year: 9792, classes: [{ id: ig.id, name: "IG22" }, { name: "BD21" }] }),
        "duplicate_class",
      );
      expect((await prisma.fiscalYear.findUniqueOrThrow({ where: { id: created.id } })).year).toBe(9791);
      expect((await prisma.schoolClass.findMany({ where: { fiscalYearId: created.id }, orderBy: { name: "asc" } })).map((c) => c.name)).toEqual(["BD21", "IG21"]);
      expect(bd.name).toBe("BD21");
    } finally {
      await prisma.materialSlot.deleteMany({ where: { eventOccasion: { fiscalYearId: created.id } } });
      await prisma.eventOccasion.deleteMany({ where: { fiscalYearId: created.id } });
      await prisma.schoolClass.deleteMany({ where: { fiscalYearId: created.id } });
      await prisma.fiscalYear.delete({ where: { id: created.id } });
    }
  });
});

describe("YearError", () => {
  it("code を持つ", () => {
    expect(new YearError("forbidden").code).toBe("forbidden");
  });
});
