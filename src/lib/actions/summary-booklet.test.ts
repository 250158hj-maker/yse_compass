import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { getSummaryBookletPlanAction } from "@/lib/actions/summary-booklet";
import { getSummaryBookletPlan } from "@/lib/data/summary-booklet";
import { saveSummary } from "@/lib/data/summaries";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// Server Action の薄い層だけを確かめる（一覧の並び・入る／スキップの分け方の規則は lib/data/summary-booklet.test.ts）。流儀は actions/slots.test.ts と同じ。
const holder = vi.hoisted(() => ({ db: null as unknown as Record<string, unknown> }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => holder.db[key as string] }) }));
// データ層は本物を通したまま、呼ばれたかどうかだけを見る（未サインインと id の形の誤りで、データ層を呼ばないことを確かめるため）。
vi.mock("@/lib/data/summary-booklet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/summary-booklet")>();
  return { ...actual, getSummaryBookletPlan: vi.fn(actual.getSummaryBookletPlan) };
});

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
  vi.mocked(getSummaryBookletPlan).mockClear();
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

const teacher = { userId: "1", role: "teacher" } as const;

// 年度セットアップ → チーム 2 つ（「提出済み」だけが概要を出す）。発表会（企画）の id を返す。
async function setup(db: Tx, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  for (const name of ["提出済み", "未提出"]) {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    if (name !== "提出済み") continue;
    const user = await db.user.create({ data: { email: `booklet${year}@example.invalid`, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    await saveSummary(db, { userId: String(user.id), role: "student" }, team.id, occasion.id, { introduction: "はじめに" }, new Date("2026-11-01T00:00:00Z"));
  }
  return occasion.id;
}

describeDb("概要集の一覧の Server Action（SC-11）", () => {
  it("先生には、入るチームとスキップするチームの一覧を返す", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setup(db, 9881);
      signInAs("teacher");
      const result = await getSummaryBookletPlanAction(occasionId);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.included.map((t) => t.teamName)).toEqual(["提出済み"]);
      expect(result.data.skipped.map((t) => t.teamName)).toEqual(["未提出"]);
    });
  });

  it("生徒は forbidden、無い発表会は occasion_not_found", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setup(db, 9882);
      signInAs("student");
      expect(await getSummaryBookletPlanAction(occasionId)).toEqual({ ok: false, code: "forbidden" });
      signInAs("teacher");
      expect(await getSummaryBookletPlanAction(occasionId + 100000)).toEqual({ ok: false, code: "occasion_not_found" });
    });
  });

  it("サインインしていなければ unauthenticated、id の形が違えば invalid_input（データ層を呼ばない）", async () => {
    signInAs(null);
    expect(await getSummaryBookletPlanAction(1)).toEqual({ ok: false, code: "unauthenticated" });
    signInAs("teacher");
    expect(await getSummaryBookletPlanAction(0)).toEqual({ ok: false, code: "invalid_input" });
    expect(await getSummaryBookletPlanAction("1" as never)).toEqual({ ok: false, code: "invalid_input" });
    expect(getSummaryBookletPlan).not.toHaveBeenCalled();
  });
});
