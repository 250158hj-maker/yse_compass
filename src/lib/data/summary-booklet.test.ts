import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { generateSummaryBooklet, getSummaryBookletPlan } from "@/lib/data/summary-booklet";
import { saveSummary } from "@/lib/data/summaries";
import { createTeam } from "@/lib/data/teams";
import { setDisplayOrders } from "@/lib/data/timetable";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は summaries.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// PDF の組み方（寸法・画像・あふれ）は pdf/summary-booklet.test.ts が見る。ここは、どのチームを・どの順で束ねるか、認可、了承の扱いを見る。

type Db = Parameters<typeof generateSummaryBooklet>[0] &
  Parameters<typeof saveSummary>[0] &
  Parameters<typeof setupFiscalYear>[0] &
  Parameters<typeof createTeam>[0] &
  Parameters<typeof setDisplayOrders>[0] &
  Pick<PrismaClient, "user" | "schoolClass" | "$transaction">;

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
const T0 = new Date("2026-11-01T00:00:00Z");

async function setup(db: Db, year: number, teamNames: string[]) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const teams: Record<string, { teamId: number; presentationId: number; actor: Actor }> = {};
  for (const name of teamNames) {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    const user = await db.user.create({ data: { email: `${name}${year}@example.invalid`, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    const presentation = await db.presentation.findFirstOrThrow({ where: { teamId: team.id, eventOccasionId: occasion.id } });
    teams[name] = { teamId: team.id, presentationId: presentation.id, actor: { userId: String(user.id), role: "student" } };
  }
  return { occasionId: occasion.id, teams };
}

const jpeg = (color: string) => sharp({ create: { width: 300, height: 200, channels: 3, background: color } }).jpeg().toBuffer();

async function submit(db: Db, occasionId: number, team: { teamId: number; actor: Actor }, withImage = false) {
  const images = withImage ? [await jpeg("#336699")] : undefined;
  await saveSummary(db, team.actor, team.teamId, occasionId, { introduction: "はじめに", workOverview: "作品概要", images }, T0);
}

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "BookletError", code });
}

describeDb("概要集の生成（SC-11・decisions.md 2026-10-22・2026-10-26）", () => {
  it("提出済みのチームを発表順に並べ、未提出のチームはスキップに入れる。発表順が未設定のチームは、末尾にチーム名順で並ぶ", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9861, ["いち", "にい", "さん", "しい", "ごお"]);
      // 発表順：さん=1・いち=2。にい・しいは未設定。ごおは未提出。
      await setDisplayOrders(db, teacher, s.occasionId, [
        { presentationId: s.teams["さん"].presentationId, displayOrder: 1 },
        { presentationId: s.teams["いち"].presentationId, displayOrder: 2 },
      ]);
      for (const name of ["いち", "にい", "さん", "しい"]) await submit(db, s.occasionId, s.teams[name]);

      const plan = await getSummaryBookletPlan(db, teacher, s.occasionId);
      expect(plan.included.map((x) => x.teamName)).toEqual(["さん", "いち", "しい", "にい"]);
      expect(plan.included.map((x) => x.displayOrder)).toEqual([1, 2, null, null]);
      expect(plan.skipped.map((x) => x.teamName)).toEqual(["ごお"]);
    });
  });

  it("スキップするチームがあるときは、了承が無いと生成しない。了承があれば、入ったチームの数だけページができる", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9862, ["A", "B", "C"]);
      await submit(db, s.occasionId, s.teams["A"], true);
      await submit(db, s.occasionId, s.teams["B"]);

      await expectError(generateSummaryBooklet(db, teacher, s.occasionId, { skipConfirmed: false }), "skip_not_confirmed");
      const booklet = await generateSummaryBooklet(db, teacher, s.occasionId, { skipConfirmed: true });
      expect(booklet.pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(booklet.pageCount).toBe(2);
      expect(booklet.included.map((x) => x.teamName)).toEqual(["A", "B"]);
      expect(booklet.skipped.map((x) => x.teamName)).toEqual(["C"]);
    });
  });

  it("全チームが提出済みなら、了承なしで生成できる", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9863, ["A", "B"]);
      await submit(db, s.occasionId, s.teams["A"]);
      await submit(db, s.occasionId, s.teams["B"]);
      const booklet = await generateSummaryBooklet(db, teacher, s.occasionId, { skipConfirmed: false });
      expect(booklet.pageCount).toBe(2);
      expect(booklet.skipped).toEqual([]);
    });
  });

  it("全チームが未提出のときは、束ねるものが無いので生成しない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9864, ["A"]);
      await expectError(generateSummaryBooklet(db, teacher, s.occasionId, { skipConfirmed: true }), "nothing_to_bundle");
    });
  });

  it("先生だけが読める。生徒（自チームを含む）は forbidden", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9865, ["A"]);
      await submit(db, s.occasionId, s.teams["A"]);
      await expectError(getSummaryBookletPlan(db, s.teams["A"].actor, s.occasionId), "forbidden");
      await expectError(generateSummaryBooklet(db, s.teams["A"].actor, s.occasionId, { skipConfirmed: true }), "forbidden");
    });
  });

  it("発表会の id が不正・存在しないときは、それぞれ invalid_input・occasion_not_found", async () => {
    await inTransaction(async (db) => {
      await expectError(getSummaryBookletPlan(db, teacher, 0), "invalid_input");
      await expectError(getSummaryBookletPlan(db, teacher, 2_000_000_000), "occasion_not_found");
    });
  });
});
