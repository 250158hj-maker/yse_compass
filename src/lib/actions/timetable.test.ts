import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { setCurrentPresentationAction, setDisplayOrdersAction } from "@/lib/actions/timetable";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// Server Action の薄い層だけを確かめる（規則は lib/data/timetable.test.ts）。流儀は actions/slots.test.ts と同じ。
const holder = vi.hoisted(() => ({ db: null as unknown as Record<string, unknown> }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => holder.db[key as string] }) }));

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

async function setup(db: Tx, year: number) {
  const teacher = { userId: "1", role: "teacher" } as const;
  const { id } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId: id } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId: id, kind: "企画" } });
  const ids: number[] = [];
  for (const [i, displayOrder] of [1, 2, 3].entries()) {
    const team = await createTeam(db, teacher, { classId: klass.id, name: `チーム${i}`, members: ["山田"] });
    // createTeam が発表を作る版でも、作らない版でも通るよう、あれば発表順を更新し、無ければ作る（#175 との組み合わせ）。
    ids.push((await db.presentation.upsert({ where: { teamId_eventOccasionId: { teamId: team.id, eventOccasionId: occasion.id } }, create: { teamId: team.id, eventOccasionId: occasion.id, displayOrder }, update: { displayOrder }, select: { id: true } })).id);
  }
  return { occasionId: occasion.id, ids };
}

describeDb("当日タイムテーブルの Server Action", () => {
  it("先生は発表中を切り替え、動かせる行を入れ替え、空に戻せる。動かせない行は presentation_locked で返る", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ids } = await setup(db, 9931);
      signInAs("teacher");
      expect(await setCurrentPresentationAction(occasionId, ids[0])).toMatchObject({ ok: true, data: { currentPresentationId: ids[0] } });
      expect(await setDisplayOrdersAction(occasionId, [{ presentationId: ids[1], displayOrder: 3 }, { presentationId: ids[2], displayOrder: 2 }])).toEqual({ ok: true, data: { changed: 2 } });
      expect(await setDisplayOrdersAction(occasionId, [{ presentationId: ids[0], displayOrder: 9 }])).toEqual({ ok: false, code: "presentation_locked" });
      expect(await setCurrentPresentationAction(occasionId, null)).toMatchObject({ ok: true, data: { currentPresentationId: null } });
    });
  });

  it("未サインインは unauthenticated、生徒は forbidden。何も書かれない", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ids } = await setup(db, 9932);
      signInAs(null);
      expect(await setCurrentPresentationAction(occasionId, ids[0])).toEqual({ ok: false, code: "unauthenticated" });
      signInAs("student");
      expect(await setCurrentPresentationAction(occasionId, ids[0])).toEqual({ ok: false, code: "forbidden" });
      expect(await setDisplayOrdersAction(occasionId, [{ presentationId: ids[0], displayOrder: 9 }])).toEqual({ ok: false, code: "forbidden" });
      expect((await db.eventOccasion.findUniqueOrThrow({ where: { id: occasionId } })).currentPresentationId).toBeNull();
      expect((await db.presentation.findUniqueOrThrow({ where: { id: ids[0] } })).displayOrder).toBe(1);
    });
  });

  it("引数の形が不正なら invalid_input で、何も書かない", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ids } = await setup(db, 9933);
      signInAs("teacher");
      const bad = { ok: false, code: "invalid_input" };
      expect(await setDisplayOrdersAction("1" as never, [])).toEqual(bad);
      expect(await setDisplayOrdersAction(occasionId, null as never)).toEqual(bad);
      expect(await setDisplayOrdersAction(occasionId, [])).toEqual(bad);
      expect(await setCurrentPresentationAction(0, null)).toEqual(bad);
      expect(await setCurrentPresentationAction(occasionId, "1" as never)).toEqual(bad);
      expect((await db.presentation.findUniqueOrThrow({ where: { id: ids[0] } })).displayOrder).toBe(1);
    });
  });
});
