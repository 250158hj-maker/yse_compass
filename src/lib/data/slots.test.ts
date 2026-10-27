import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { addMaterialSlot, deleteMaterialSlot, listMaterialSlots, SlotError, SUMMARY_SLOT_TYPE, setOccasionPublished, updateMaterialSlot, updateOccasionDate } from "@/lib/data/slots";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は years.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// DB が失敗すると PostgreSQL はそのトランザクションを中止するので、DB のエラーを期待する検証は各テストの最後に置く。

type Db = Parameters<typeof addMaterialSlot>[0] & Parameters<typeof setupFiscalYear>[0] & Pick<PrismaClient, "submission" | "schoolClass" | "team" | "teamMember" | "$transaction">;

class Rollback extends Error {}

let prisma: PrismaClient;

beforeAll(() => {
  if (!process.env.DATABASE_URL) return;
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 10 }) });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

async function inTransaction(fn: (db: Db) => Promise<void>) {
  try {
    await prisma.$transaction(async (tx) => {
      await fn(tx as unknown as Db);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

const teacher: Actor = { userId: "1", role: "teacher" };
const student: Actor = { userId: "2", role: "student" };

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "SlotError", code });
}

// 年度セットアップで 4 発表会（各々に概要とプレゼン資料の枠）を作り、企画の発表会の id を返す。
async function setup(db: Db, year: number) {
  const { id } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId: id, kind: "企画" } });
  return { fiscalYearId: id, occasionId: occasion.id };
}

describeDb("listMaterialSlots（SC-04：T のみ）", () => {
  it("定番の 2 枠を、概要→プレゼン資料の順に返す", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9701);
      const slots = await listMaterialSlots(db, teacher, occasionId);
      expect(slots.map((s) => [s.slotType, s.isRequired, s.deadline, s.templateUrl])).toEqual([
        ["概要", true, null, null],
        ["プレゼン資料", true, null, null],
      ]);
    });
  });

  it("生徒には返さない", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9702);
      await expectError(listMaterialSlots(db, student, occasionId), "forbidden");
    });
  });
});

describeDb("addMaterialSlot", () => {
  it("定番に無い種類の枠を足せる。締切とテンプレ参照も持てる", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9703);
      const deadline = new Date("2026-11-05T14:59:00Z");
      const slot = await addMaterialSlot(db, teacher, occasionId, { slotType: "  概要設計書 ", isRequired: false, deadline, templateUrl: " https://example.invalid/t " });
      expect(slot).toMatchObject({ eventOccasionId: occasionId, slotType: "概要設計書", isRequired: false, deadline, templateUrl: "https://example.invalid/t" });
      expect((await listMaterialSlots(db, teacher, occasionId)).map((s) => s.slotType)).toEqual(["概要", "プレゼン資料", "概要設計書"]);
    });
  });

  it("同じ種類の任意枠を同じ発表会に複数置ける", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9704);
      await addMaterialSlot(db, teacher, occasionId, { slotType: "動画", isRequired: false });
      await addMaterialSlot(db, teacher, occasionId, { slotType: "動画", isRequired: false });
      expect(await db.materialSlot.count({ where: { eventOccasionId: occasionId, slotType: "動画" } })).toBe(2);
    });
  });

  it("締切とテンプレ参照を省くと NULL。テンプレ参照の空文字も NULL", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9705);
      expect(await addMaterialSlot(db, teacher, occasionId, { slotType: "A", isRequired: true })).toMatchObject({ deadline: null, templateUrl: null });
      expect(await addMaterialSlot(db, teacher, occasionId, { slotType: "B", isRequired: true, templateUrl: "  " })).toMatchObject({ templateUrl: null });
    });
  });

  it("生徒は forbidden。何も作られない", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9706);
      await expectError(addMaterialSlot(db, student, occasionId, { slotType: "X", isRequired: true }), "forbidden");
      expect(await db.materialSlot.count({ where: { eventOccasionId: occasionId } })).toBe(2);
    });
  });

  it("不正な入力は invalid_input", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9707);
      const ok = { slotType: "X", isRequired: true };
      await expectError(addMaterialSlot(db, teacher, occasionId, { ...ok, slotType: "  " }), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, occasionId, { ...ok, slotType: "a\u0000b" }), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, occasionId, { ...ok, slotType: 1 as never }), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, occasionId, { ...ok, isRequired: "yes" as never }), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, occasionId, { ...ok, deadline: new Date("invalid") }), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, occasionId, { ...ok, deadline: "2026-11-05" as never }), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, occasionId, { ...ok, templateUrl: "javascript:alert(1)" }), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, occasionId, { ...ok, templateUrl: "not a url" }), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, occasionId, { ...ok, templateUrl: "a\u0000" }), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, 0, ok), "invalid_input");
      await expectError(addMaterialSlot(db, teacher, 3_000_000_000, ok), "invalid_input");
      expect(await db.materialSlot.count({ where: { eventOccasionId: occasionId } })).toBe(2);
    });
  });

  it("概要の枠は 1 発表会に 1 件（summary_slot_exists）", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9708);
      await expectError(addMaterialSlot(db, teacher, occasionId, { slotType: SUMMARY_SLOT_TYPE, isRequired: true }), "summary_slot_exists");
    });
  });

  it("無い発表会は occasion_not_found", async () => {
    await inTransaction(async (db) => {
      await expectError(addMaterialSlot(db, teacher, 2_147_483_647, { slotType: "X", isRequired: true }), "occasion_not_found");
    });
  });
});

describeDb("updateMaterialSlot", () => {
  it("渡した項目だけ変える。締切・テンプレ参照は null で未設定に戻せる", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9711);
      const slot = await addMaterialSlot(db, teacher, occasionId, { slotType: "動画", isRequired: true, deadline: new Date("2026-11-05T00:00:00Z"), templateUrl: "https://example.invalid/t" });
      const changed = await updateMaterialSlot(db, teacher, slot.id, { isRequired: false });
      expect(changed).toMatchObject({ slotType: "動画", isRequired: false, deadline: slot.deadline, templateUrl: "https://example.invalid/t" });
      const cleared = await updateMaterialSlot(db, teacher, slot.id, { deadline: null, templateUrl: null, slotType: " 紹介動画 " });
      expect(cleared).toMatchObject({ slotType: "紹介動画", deadline: null, templateUrl: null, isRequired: false });
    });
  });

  it("概要枠の締切・必須／任意は変えられる。種類は変えられない（summary_slot_locked）", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9712);
      const summary = (await listMaterialSlots(db, teacher, occasionId))[0];
      const deadline = new Date("2026-11-05T14:59:00Z");
      expect(await updateMaterialSlot(db, teacher, summary.id, { deadline, isRequired: false })).toMatchObject({ slotType: "概要", deadline, isRequired: false });
      expect(await updateMaterialSlot(db, teacher, summary.id, { slotType: " 概要 " })).toMatchObject({ slotType: "概要" });
      await expectError(updateMaterialSlot(db, teacher, summary.id, { slotType: "概要集" }), "summary_slot_locked");
      expect((await db.materialSlot.findUniqueOrThrow({ where: { id: summary.id } })).slotType).toBe("概要");
    });
  });

  it("生徒は forbidden。変わらない", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9713);
      const slot = (await listMaterialSlots(db, teacher, occasionId))[1];
      await expectError(updateMaterialSlot(db, student, slot.id, { isRequired: false }), "forbidden");
      expect((await db.materialSlot.findUniqueOrThrow({ where: { id: slot.id } })).isRequired).toBe(true);
    });
  });

  it("不正な入力は invalid_input、無い枠は slot_not_found", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9714);
      const slot = (await listMaterialSlots(db, teacher, occasionId))[1];
      await expectError(updateMaterialSlot(db, teacher, slot.id, { slotType: "" }), "invalid_input");
      await expectError(updateMaterialSlot(db, teacher, slot.id, { isRequired: null as never }), "invalid_input");
      await expectError(updateMaterialSlot(db, teacher, slot.id, { deadline: undefined, templateUrl: "ftp://example.invalid/t" }), "invalid_input");
      await expectError(updateMaterialSlot(db, teacher, 0, {}), "invalid_input");
      await expectError(updateMaterialSlot(db, teacher, 2_147_483_647, { isRequired: false }), "slot_not_found");
    });
  });

  it("概要以外の枠を「概要」に変えると summary_slot_exists（DB のエラーなので最後）", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9715);
      const slot = (await listMaterialSlots(db, teacher, occasionId))[1];
      await expectError(updateMaterialSlot(db, teacher, slot.id, { slotType: "概要" }), "summary_slot_exists");
    });
  });
});

describeDb("deleteMaterialSlot（H-58 の先行方針）", () => {
  it("提出のない枠は削除できる", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9721);
      const slot = await addMaterialSlot(db, teacher, occasionId, { slotType: "動画", isRequired: false });
      await deleteMaterialSlot(db, teacher, slot.id);
      expect(await db.materialSlot.count({ where: { id: slot.id } })).toBe(0);
    });
  });

  it("概要枠は削除できない（summary_slot_locked）", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9722);
      const summary = (await listMaterialSlots(db, teacher, occasionId))[0];
      await expectError(deleteMaterialSlot(db, teacher, summary.id), "summary_slot_locked");
      expect(await db.materialSlot.count({ where: { id: summary.id } })).toBe(1);
    });
  });

  it("提出のある枠は削除できない（slot_has_submissions）。提出も残る", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9723);
      const cls = await db.schoolClass.findFirstOrThrow({ where: { fiscalYear: { eventOccasions: { some: { id: occasionId } } } } });
      const team = await createTeam(db, teacher, { classId: cls.id, name: "Nova", members: ["山田"] });
      const slot = (await listMaterialSlots(db, teacher, occasionId))[1];
      const now = new Date();
      await db.submission.create({ data: { teamId: team.id, materialSlotId: slot.id, url: "https://example.invalid/s", firstSubmittedAt: now, lastSubmittedAt: now } });
      await expectError(deleteMaterialSlot(db, teacher, slot.id), "slot_has_submissions");
      expect(await db.materialSlot.count({ where: { id: slot.id } })).toBe(1);
      expect(await db.submission.count({ where: { materialSlotId: slot.id } })).toBe(1);
    });
  });

  it("生徒は forbidden、不正な ID は invalid_input、無い枠は slot_not_found", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9724);
      const slot = await addMaterialSlot(db, teacher, occasionId, { slotType: "動画", isRequired: false });
      await expectError(deleteMaterialSlot(db, student, slot.id), "forbidden");
      expect(await db.materialSlot.count({ where: { id: slot.id } })).toBe(1);
      await expectError(deleteMaterialSlot(db, teacher, -1), "invalid_input");
      await expectError(deleteMaterialSlot(db, teacher, 2_147_483_647), "slot_not_found");
    });
  });
});

describeDb("updateOccasionDate（SC-05：日程）", () => {
  it("開催日を設定し、null で未設定に戻せる", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9731);
      expect(await updateOccasionDate(db, teacher, occasionId, "2026-12-18")).toMatchObject({ id: occasionId, kind: "企画", eventDate: new Date("2026-12-18T00:00:00Z") });
      expect(await updateOccasionDate(db, teacher, occasionId, null)).toMatchObject({ eventDate: null });
    });
  });

  it("実在しない日付・形が違う値は invalid_input", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9732);
      for (const bad of ["2026-02-30", "2026-13-01", "2026-1-1", "2026/12/18", "0000-01-01", "26-12-18", " 2026-12-18", "2026-12-18T00:00:00Z", ""]) {
        await expectError(updateOccasionDate(db, teacher, occasionId, bad), "invalid_input");
      }
      await expectError(updateOccasionDate(db, teacher, occasionId, 20261218 as never), "invalid_input");
      await expectError(updateOccasionDate(db, teacher, 0, "2026-12-18"), "invalid_input");
    });
  });

  it("生徒は forbidden。無い発表会は occasion_not_found", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9733);
      await expectError(updateOccasionDate(db, student, occasionId, "2026-12-18"), "forbidden");
      expect((await db.eventOccasion.findUniqueOrThrow({ where: { id: occasionId } })).eventDate).toBeNull();
      await expectError(updateOccasionDate(db, teacher, 2_147_483_647, "2026-12-18"), "occasion_not_found");
    });
  });
});

describeDb("setOccasionPublished（SC-04：公開・公開解除）", () => {
  it("公開し、公開解除で戻せる。同じ値への切り替えは成功して何も変えない。ほかの発表会は変わらない", async () => {
    await inTransaction(async (db) => {
      const { fiscalYearId, occasionId } = await setup(db, 9741);
      const other = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, id: { not: occasionId } } });
      expect(await setOccasionPublished(db, teacher, occasionId, true)).toMatchObject({ id: occasionId, isPublished: true });
      expect(await setOccasionPublished(db, teacher, occasionId, true)).toMatchObject({ isPublished: true });
      expect((await db.eventOccasion.findUniqueOrThrow({ where: { id: other.id } })).isPublished).toBe(false);
      expect(await setOccasionPublished(db, teacher, occasionId, false)).toMatchObject({ isPublished: false });
    });
  });

  it("アーカイブ済みの年度の発表会でも切り替えられる（塞ぐ規則が正典に無い）", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9742);
      const { fiscalYearId } = await db.eventOccasion.findUniqueOrThrow({ where: { id: occasionId }, select: { fiscalYearId: true } });
      await db.fiscalYear.update({ where: { id: fiscalYearId }, data: { isArchived: true } });
      expect(await setOccasionPublished(db, teacher, occasionId, true)).toMatchObject({ isPublished: true });
    });
  });

  it("生徒は forbidden で何も変わらない。無い発表会は occasion_not_found。id・値の形が違えば invalid_input", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9743);
      await expectError(setOccasionPublished(db, student, occasionId, true), "forbidden");
      expect((await db.eventOccasion.findUniqueOrThrow({ where: { id: occasionId } })).isPublished).toBe(false);
      await expectError(setOccasionPublished(db, teacher, 0, true), "invalid_input");
      await expectError(setOccasionPublished(db, teacher, occasionId, "true" as never), "invalid_input");
      await expectError(setOccasionPublished(db, teacher, 2_147_483_647, true), "occasion_not_found");
    });
  });
});

describe("SlotError", () => {
  it("code を持つ", () => {
    expect(new SlotError("forbidden").code).toBe("forbidden");
  });
});
