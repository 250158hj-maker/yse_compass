import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { setupYearAction } from "@/lib/actions/years";

// Server Action の薄い層だけを確かめる（規則は lib/data/years.test.ts）。
// auth() は差し替える（本物は Google のサインインが要る）。prisma は、各テストのトランザクションに差し替えて、最後に取り消す。
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

describeDb("年度セットアップの Server Action", () => {
  it("先生は年度を作れる", async () => {
    await inTransaction(async (db) => {
      signInAs("teacher");
      const result = await setupYearAction({ year: 9301, classNames: ["IG21"] });
      expect(result).toMatchObject({ ok: true, data: { year: 9301 } });
      expect(await db.fiscalYear.count({ where: { year: 9301 } })).toBe(1);
    });
  });

  it("未サインインは unauthenticated、生徒は forbidden。何も書かれない", async () => {
    await inTransaction(async (db) => {
      signInAs(null);
      expect(await setupYearAction({ year: 9302, classNames: ["IG21"] })).toEqual({ ok: false, code: "unauthenticated" });
      signInAs("student");
      expect(await setupYearAction({ year: 9302, classNames: ["IG21"] })).toEqual({ ok: false, code: "forbidden" });
      expect(await db.fiscalYear.count({ where: { year: 9302 } })).toBe(0);
    });
  });

  it("引数の形が不正なら invalid_input で、何も書かない", async () => {
    await inTransaction(async (db) => {
      signInAs("teacher");
      const bad = { ok: false, code: "invalid_input" };
      expect(await setupYearAction(null as never)).toEqual(bad);
      expect(await setupYearAction({ year: "9303", classNames: ["IG21"] } as never)).toEqual(bad);
      expect(await setupYearAction({ year: 9303, classNames: "IG21" } as never)).toEqual(bad);
      expect(await setupYearAction({ year: 9303, classNames: [{ create: 1 }] } as never)).toEqual(bad);
      expect(await setupYearAction({ year: 3_000_000_000, classNames: ["IG21"] })).toEqual(bad);
      expect(await db.fiscalYear.count({ where: { year: 9303 } })).toBe(0);
    });
  });

  it("同じ年度を 2 回実行すると duplicate_year", async () => {
    await inTransaction(async () => {
      signInAs("teacher");
      expect(await setupYearAction({ year: 9304, classNames: ["IG21"] })).toMatchObject({ ok: true });
      expect(await setupYearAction({ year: 9304, classNames: ["IG21"] })).toEqual({ ok: false, code: "duplicate_year" });
    });
  });
});
