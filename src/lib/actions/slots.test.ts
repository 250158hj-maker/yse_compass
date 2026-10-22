import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { addMaterialSlotAction, deleteMaterialSlotAction, updateMaterialSlotAction, updateOccasionDateAction } from "@/lib/actions/slots";
import { setupFiscalYear } from "@/lib/data/years";

// Server Action の薄い層だけを確かめる（規則は lib/data/slots.test.ts）。流儀は actions/years.test.ts と同じ。
const holder = vi.hoisted(() => ({ db: null as unknown as Record<string, unknown> }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => holder.db[key as string] }) }));

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

class Rollback extends Error {}

let client: PrismaClient;

beforeAll(() => {
  if (!process.env.DATABASE_URL) return;
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 10 }) });
});

afterAll(async () => {
  await client?.$disconnect();
});

beforeEach(() => {
  vi.mocked(auth).mockReset();
});

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

async function inTransaction(fn: (db: Tx) => Promise<void>) {
  try {
    await client.$transaction(async (tx) => {
      holder.db = tx as never;
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

function signInAs(role: "teacher" | "student" | null) {
  vi.mocked(auth).mockResolvedValue((role ? { user: { id: "1", role }, expires: "" } : null) as never);
}

async function setupOccasion(db: Tx, year: number) {
  const { id } = await setupFiscalYear(db, { userId: "1", role: "teacher" }, { year, classNames: ["IG21"] });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId: id, kind: "企画" } });
  return occasion.id;
}

describeDb("資料枠・日程の Server Action", () => {
  it("先生は資料枠を足し、直し、消せる。開催日も設定できる", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setupOccasion(db, 9801);
      signInAs("teacher");
      const added = await addMaterialSlotAction(occasionId, { slotType: "動画", isRequired: false });
      if (!added.ok) throw new Error("add failed");
      const slotId = added.data.id;
      expect(await updateMaterialSlotAction(slotId, { isRequired: true })).toMatchObject({ ok: true, data: { slotType: "動画", isRequired: true } });
      expect(await updateOccasionDateAction(occasionId, "2026-12-18")).toMatchObject({ ok: true, data: { id: occasionId } });
      expect(await deleteMaterialSlotAction(slotId)).toEqual({ ok: true, data: undefined });
      expect(await db.materialSlot.count({ where: { id: slotId } })).toBe(0);
    });
  });

  it("未サインインは unauthenticated、生徒は forbidden。何も書かれない", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setupOccasion(db, 9802);
      signInAs(null);
      expect(await addMaterialSlotAction(occasionId, { slotType: "動画", isRequired: false })).toEqual({ ok: false, code: "unauthenticated" });
      signInAs("student");
      expect(await addMaterialSlotAction(occasionId, { slotType: "動画", isRequired: false })).toEqual({ ok: false, code: "forbidden" });
      expect(await updateOccasionDateAction(occasionId, "2026-12-18")).toEqual({ ok: false, code: "forbidden" });
      expect(await db.materialSlot.count({ where: { eventOccasionId: occasionId } })).toBe(2);
      expect((await db.eventOccasion.findUniqueOrThrow({ where: { id: occasionId } })).eventDate).toBeNull();
    });
  });

  it("引数の形が不正なら invalid_input で、何も書かない", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setupOccasion(db, 9803);
      signInAs("teacher");
      const bad = { ok: false, code: "invalid_input" };
      expect(await addMaterialSlotAction("1" as never, { slotType: "動画", isRequired: false })).toEqual(bad);
      expect(await addMaterialSlotAction(occasionId, null as never)).toEqual(bad);
      expect(await updateMaterialSlotAction(0, {})).toEqual(bad);
      expect(await updateMaterialSlotAction(1, [] as never)).toEqual(bad);
      expect(await deleteMaterialSlotAction(1.5)).toEqual(bad);
      expect(await updateOccasionDateAction(occasionId, 20261218 as never)).toEqual(bad);
      expect(await db.materialSlot.count({ where: { eventOccasionId: occasionId } })).toBe(2);
    });
  });

  it("規則違反はデータ層のコードで返る（概要枠の削除・無い枠）", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setupOccasion(db, 9804);
      signInAs("teacher");
      const summary = await db.materialSlot.findFirstOrThrow({ where: { eventOccasionId: occasionId, slotType: "概要" } });
      expect(await deleteMaterialSlotAction(summary.id)).toEqual({ ok: false, code: "summary_slot_locked" });
      expect(await deleteMaterialSlotAction(2_147_483_647)).toEqual({ ok: false, code: "slot_not_found" });
    });
  });
});
