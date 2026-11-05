import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { getOwnSummary, MAX_EXTRA_SECTIONS, saveSummary, type SummaryInput } from "@/lib/data/summaries";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, setYearArchived, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は submission-matrix.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// 同時に初回の保存が走ったときの 1 行への収まりは、一意制約（チーム × 発表会）に任せている。トランザクションの中のテストでは再現できないので、ここでは確かめない。

type Db = Parameters<typeof saveSummary>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Pick<PrismaClient, "user" | "schoolClass" | "$transaction">;

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
const T1 = new Date("2026-11-02T00:00:00Z");
const DEADLINE = new Date("2026-11-01T12:00:00Z");

// 年度セットアップ → チーム 2 つ（それぞれ生徒に結びつける）。
async function setup(db: Db, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const make = async (name: string) => {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    const user = await db.user.create({ data: { email: `${name}@example.invalid`, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    return { teamId: team.id, actor: { userId: String(user.id), role: "student" } as Actor };
  };
  const a = await make(`A${year}`);
  const b = await make(`B${year}`);
  return { fiscalYearId, occasionId: occasion.id, a, b };
}

const FULL: SummaryInput = {
  introduction: "はじめに",
  workOverview: "作品概要",
  techStack: "TypeScript",
  closing: "終わりに",
  extraSections: [{ heading: "工夫した点", body: "本文" }],
};

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "SubmissionError", code });
}

describeDb("saveSummary・getOwnSummary（SC-10 の保存・読み取り）", () => {
  it("初回：初回提出日時と最終更新日時が同じ。保存した値を、読み取りで返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9801);
      const saved = await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, FULL, T0);
      expect(saved).toMatchObject({ ...FULL, firstSubmittedAt: T0, lastSubmittedAt: T0, isLate: false });
      expect(await getOwnSummary(db, s.a.actor, s.a.teamId, s.occasionId)).toMatchObject({ ...FULL, firstSubmittedAt: T0 });
    });
  });

  it("差し替え：初回提出日時は変わらず、最終更新日時だけ進む。行は 1 つのまま、全欄を上書きする", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9802);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, FULL, T0);
      const again = await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { introduction: "書き直し" }, T1);
      expect(again).toMatchObject({ introduction: "書き直し", workOverview: null, techStack: null, closing: null, extraSections: [], firstSubmittedAt: T0, lastSubmittedAt: T1 });
      expect(await db.summary.count({ where: { teamId: s.a.teamId, eventOccasionId: s.occasionId } })).toBe(1);
    });
  });

  it("遅延は初回提出日時で決まる。締切の前は遅延でなく、後は遅延。差し替えでは変わらない。締切が無い枠は対象外", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9803);
      const slotWhere = { eventOccasionId: s.occasionId, slotType: "概要" };
      expect((await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, FULL, T0)).isLate).toBe(false); // 締切なし
      await db.materialSlot.updateMany({ where: slotWhere, data: { deadline: DEADLINE } });
      expect((await saveSummary(db, s.b.actor, s.b.teamId, s.occasionId, FULL, T0)).isLate).toBe(false); // 締切（11/01 12:00）の前
      const late = await saveSummary(db, s.b.actor, s.b.teamId, s.occasionId, FULL, T1); // 差し替えは締切の後だが、初回は前
      expect(late.isLate).toBe(false);
      await db.summary.delete({ where: { teamId_eventOccasionId: { teamId: s.a.teamId, eventOccasionId: s.occasionId } } });
      expect((await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, FULL, T1)).isLate).toBe(true); // 初回が締切の後
    });
  });

  it("先生・他チームの生徒・チームに結びつかない生徒は、forbidden（保存も読み取りも）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9804);
      const lone = await db.user.create({ data: { email: "lone9804@example.invalid", name: "無所属", role: "student" } });
      for (const actor of [teacher, s.b.actor, { userId: String(lone.id), role: "student" } as Actor, { userId: "not-a-number", role: "student" } as Actor]) {
        await expectError(saveSummary(db, actor, s.a.teamId, s.occasionId, FULL, T0), "forbidden");
        await expectError(getOwnSummary(db, actor, s.a.teamId, s.occasionId), "forbidden");
      }
      expect(await db.summary.count({ where: { eventOccasionId: s.occasionId } })).toBe(0);
    });
  });

  it("先生でも生徒でもない主体は、forbidden", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9805);
      const outsider = { userId: s.a.actor.userId, role: "guest" } as unknown as Actor;
      await expectError(saveSummary(db, outsider, s.a.teamId, s.occasionId, FULL, T0), "forbidden");
      await expectError(getOwnSummary(db, outsider, s.a.teamId, s.occasionId), "forbidden");
    });
  });

  it("年度が違う組み合わせは occasion_not_found。アーカイブ済みの年度は保存だけ year_archived。概要枠が無い発表会は slot_not_found", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9806);
      const other = await setup(db, 9807);
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, other.occasionId, FULL, T0), "occasion_not_found");
      await expectError(getOwnSummary(db, s.a.actor, s.a.teamId, other.occasionId), "occasion_not_found");

      await db.materialSlot.deleteMany({ where: { eventOccasionId: s.occasionId, slotType: "概要" } });
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, FULL, T0), "slot_not_found");

      await saveSummary(db, other.a.actor, other.a.teamId, other.occasionId, FULL, T0);
      await setYearArchived(db, teacher, other.fiscalYearId, true);
      await expectError(saveSummary(db, other.a.actor, other.a.teamId, other.occasionId, { introduction: "x" }, T1), "year_archived");
      // アーカイブ済みの年度でも、読み取りはできる（編集はできない）。
      expect(await getOwnSummary(db, other.a.actor, other.a.teamId, other.occasionId)).toMatchObject({ introduction: "はじめに" });
    });
  });

  it("自由な欄は上限まで通り、超えると invalid_input。見出しが空の欄・NUL 文字も断る", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9808);
      const sections = (n: number) => Array.from({ length: n }, (_, i) => ({ heading: `見出し${i}`, body: "本文" }));
      const ok = await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { extraSections: sections(MAX_EXTRA_SECTIONS) }, T0);
      expect(ok.extraSections).toHaveLength(MAX_EXTRA_SECTIONS);
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { introduction: "x", extraSections: sections(MAX_EXTRA_SECTIONS + 1) }, T0), "invalid_input");
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { extraSections: [{ heading: "  ", body: "本文" }] }, T0), "invalid_input");
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { extraSections: [{ heading: "見出し\0", body: "本文" }] }, T0), "invalid_input");
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { extraSections: [{ heading: "見出し", body: "本文\0" }] }, T0), "invalid_input");
    });
  });

  it("全欄が空の保存は empty_summary（形の誤りの invalid_input とは分ける）。1 欄だけでも入っていれば通る。空白だけの欄は未入力（null）として保存する", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9809);
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, {}, T0), "empty_summary");
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { introduction: "  ", workOverview: null, extraSections: [] }, T0), "empty_summary");
      const saved = await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { closing: "  終わり  ", introduction: "   " }, T0);
      expect(saved).toMatchObject({ closing: "終わり", introduction: null, workOverview: null, techStack: null, extraSections: [] });
      expect(await db.summary.count({ where: { teamId: s.a.teamId } })).toBe(1);
    });
  });

  it("入力の形が違えば invalid_input（欄が文字列でない・入力が配列・ID が整数でない）。NUL 文字を含む欄も断る", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9810);
      const bad = (input: unknown) => saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, input as SummaryInput, T0);
      await expectError(bad({ introduction: 123 }), "invalid_input");
      await expectError(bad({ techStack: "TypeScript\0" }), "invalid_input");
      await expectError(bad({ extraSections: "x" }), "invalid_input");
      await expectError(bad({ extraSections: [null] }), "invalid_input");
      await expectError(bad(null), "invalid_input");
      await expectError(bad([FULL]), "invalid_input");
      await expectError(saveSummary(db, s.a.actor, 0, s.occasionId, FULL, T0), "invalid_input");
      await expectError(getOwnSummary(db, s.a.actor, s.a.teamId, 1.5), "invalid_input");
      expect(await db.summary.count({ where: { teamId: s.a.teamId } })).toBe(0);
    });
  });

  it("getOwnSummary：未提出なら null。他チームの行は読めない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9811);
      expect(await getOwnSummary(db, s.a.actor, s.a.teamId, s.occasionId)).toBeNull();
      await saveSummary(db, s.b.actor, s.b.teamId, s.occasionId, FULL, T0);
      expect(await getOwnSummary(db, s.a.actor, s.a.teamId, s.occasionId)).toBeNull();
      await expectError(getOwnSummary(db, s.a.actor, s.b.teamId, s.occasionId), "forbidden");
    });
  });
});
