import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { listOwnSlots } from "@/lib/data/own-slots";
import { SUMMARY_SLOT_TYPE } from "@/lib/data/slots";
import { submitMaterial } from "@/lib/data/submissions";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は presentation-detail.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// 年度は 9900 番台を使う。年度は互いに独立なので、空の DB（CI）でも手元の DB でも同じ結果になる。

type Db = Parameters<typeof listOwnSlots>[0] & Parameters<typeof submitMaterial>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Pick<PrismaClient, "user" | "$transaction">;

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
const URL_A = "https://example.invalid/a";
const DEADLINE = new Date("2026-11-05T14:59:00Z");
const BEFORE = new Date("2026-11-01T00:00:00Z");
const AFTER = new Date("2026-11-06T00:00:00Z");

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "SubmissionError", code });
}

// 年度セットアップ（定番の枠：概要・プレゼン資料。どちらも必須・締切なし）→ チーム 2 つ（それぞれ生徒に結びつける）。
async function setup(db: Db, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const slots = await db.materialSlot.findMany({ where: { eventOccasionId: occasion.id }, orderBy: { id: "asc" } });
  const summarySlot = slots.find((s) => s.slotType === SUMMARY_SLOT_TYPE)!;
  const presentationSlot = slots.find((s) => s.slotType === "プレゼン資料")!;
  const make = async (name: string, email: string) => {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    const user = await db.user.create({ data: { email, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    return { teamId: team.id, actor: { userId: String(user.id), role: "student" } as Actor };
  };
  const own = await make(`チームA${year}`, `own-slots-a${year}@example.invalid`);
  const other = await make(`チームB${year}`, `own-slots-b${year}@example.invalid`);
  return { fiscalYearId, occasionId: occasion.id, summarySlot, presentationSlot, own, other };
}

describeDb("listOwnSlots（SC-02 の自チームの資料枠）", () => {
  it("概要を含む全枠を、id の順（概要→プレゼン資料）で返す。未提出の必須枠には isRequiredMissing が付き、任意枠には付かない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9951);
      const video = await db.materialSlot.create({ data: { eventOccasionId: s.occasionId, slotType: "動画", isRequired: false, templateUrl: "https://example.invalid/t" } });
      const result = await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, BEFORE);
      expect(result.map((r) => r.slotType)).toEqual(["概要", "プレゼン資料", "動画"]);
      expect(result.map((r) => r.isSummary)).toEqual([true, false, false]);
      expect(result.map((r) => r.submitted)).toEqual([false, false, false]);
      expect(result.map((r) => r.isRequiredMissing)).toEqual([true, true, false]);
      expect(result[2]).toMatchObject({ slotId: video.id, isRequired: false, templateUrl: "https://example.invalid/t", deadline: null });
    });
  });

  it("提出した枠は submitted になり、isRequiredMissing が外れる。ほかのチームの提出は数えない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9952);
      await submitMaterial(db, s.own.actor, s.own.teamId, s.presentationSlot.id, URL_A, BEFORE);
      await submitMaterial(db, s.other.actor, s.other.teamId, s.presentationSlot.id, URL_A, BEFORE);
      const mine = await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, BEFORE);
      expect(mine.find((r) => r.slotType === "プレゼン資料")).toMatchObject({ submitted: true, isRequiredMissing: false, firstSubmittedAt: BEFORE });
      // 概要は、概要の行が無いので、他チームが提出していても未提出のまま。
      expect(mine.find((r) => r.isSummary)).toMatchObject({ submitted: false, isRequiredMissing: true, firstSubmittedAt: null });
    });
  });

  it("ほかのチームだけが提出した枠は、自チームでは未提出のまま（提出の絞り込みが teamId で効いている）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9959);
      await submitMaterial(db, s.other.actor, s.other.teamId, s.presentationSlot.id, URL_A, BEFORE);
      const mine = (await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, BEFORE)).find((r) => r.slotType === "プレゼン資料")!;
      expect(mine).toMatchObject({ submitted: false, isRequiredMissing: true, firstSubmittedAt: null });
      const theirs = (await listOwnSlots(db, s.other.actor, s.other.teamId, s.occasionId, BEFORE)).find((r) => r.slotType === "プレゼン資料")!;
      expect(theirs).toMatchObject({ submitted: true, isRequiredMissing: false });
    });
  });

  it("概要は、提出（submissions）ではなく、概要（summaries）の行の有無で見る。初回提出日時で遅延を見る", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9953);
      await db.materialSlot.update({ where: { id: s.summarySlot.id }, data: { deadline: DEADLINE } });
      await db.summary.create({ data: { teamId: s.own.teamId, eventOccasionId: s.occasionId, introduction: "はじめに", firstSubmittedAt: AFTER, lastSubmittedAt: AFTER } });
      const summary = (await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, AFTER)).find((r) => r.isSummary)!;
      expect(summary).toMatchObject({ submitted: true, isRequiredMissing: false, isLate: true, firstSubmittedAt: AFTER, deadline: DEADLINE });
    });
  });

  it("遅延は初回提出日時で決まる。締切後に差し替えたときだけ showLastUpdated が付く", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9954);
      await db.materialSlot.update({ where: { id: s.presentationSlot.id }, data: { deadline: DEADLINE } });
      await submitMaterial(db, s.own.actor, s.own.teamId, s.presentationSlot.id, URL_A, BEFORE);
      const onTime = (await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, BEFORE)).find((r) => r.slotType === "プレゼン資料")!;
      expect(onTime).toMatchObject({ isLate: false, showLastUpdated: false });
      // 締切後の差し替えでも、初回が締切前なら、遅延にならない（H-6）。最終更新日時は添える。
      await submitMaterial(db, s.own.actor, s.own.teamId, s.presentationSlot.id, "https://example.invalid/b", AFTER);
      const replaced = (await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, AFTER)).find((r) => r.slotType === "プレゼン資料")!;
      expect(replaced).toMatchObject({ isLate: false, showLastUpdated: true, firstSubmittedAt: BEFORE, lastSubmittedAt: AFTER });
    });
  });

  it("未提出で締切を過ぎた枠は warnLate（いま提出すると遅延になる）。締切前・締切なし・提出済みは付かない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9955);
      await db.materialSlot.update({ where: { id: s.presentationSlot.id }, data: { deadline: DEADLINE } });
      const find = (rows: Awaited<ReturnType<typeof listOwnSlots>>) => rows.find((r) => r.slotType === "プレゼン資料")!;
      expect(find(await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, BEFORE)).warnLate).toBe(false);
      expect(find(await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, AFTER)).warnLate).toBe(true);
      // 締切なしの概要枠は、いつでも warnLate にならない。
      expect((await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, AFTER)).find((r) => r.isSummary)!.warnLate).toBe(false);
      await submitMaterial(db, s.own.actor, s.own.teamId, s.presentationSlot.id, URL_A, AFTER);
      expect(find(await listOwnSlots(db, s.own.actor, s.own.teamId, s.occasionId, AFTER)).warnLate).toBe(false);
    });
  });

  it("自チームの生徒だけに返す。先生・ほかのチームの生徒・ロール不明は forbidden", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9956);
      await expectError(listOwnSlots(db, teacher, s.own.teamId, s.occasionId), "forbidden");
      await expectError(listOwnSlots(db, s.other.actor, s.own.teamId, s.occasionId), "forbidden");
      await expectError(listOwnSlots(db, { userId: "1", role: "other" as never }, s.own.teamId, s.occasionId), "forbidden");
      await expectError(listOwnSlots(db, { userId: "abc", role: "student" }, s.own.teamId, s.occasionId), "forbidden");
    });
  });

  it("引数が不正なら invalid_input。存在しない発表会・別の年度の発表会は occasion_not_found", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9957);
      const elsewhere = await setup(db, 9958);
      await expectError(listOwnSlots(db, s.own.actor, 0, s.occasionId), "invalid_input");
      await expectError(listOwnSlots(db, s.own.actor, s.own.teamId, 1.5), "invalid_input");
      await expectError(listOwnSlots(db, s.own.actor, s.own.teamId, 2_000_000_000), "occasion_not_found");
      await expectError(listOwnSlots(db, s.own.actor, s.own.teamId, elsewhere.occasionId), "occasion_not_found");
    });
  });
});
