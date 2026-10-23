import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { addMaterialSlot, SUMMARY_SLOT_TYPE } from "@/lib/data/slots";
import { isLate, listTeamSubmissions, submitMaterial, SubmissionError } from "@/lib/data/submissions";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は slots.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// DB が失敗すると PostgreSQL はそのトランザクションを中止するので、DB のエラーを期待する検証は各テストの最後に置く。

type Db = Parameters<typeof submitMaterial>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Parameters<typeof addMaterialSlot>[0] & Pick<PrismaClient, "user" | "$transaction">;

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
const URL_B = "https://example.invalid/b";

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "SubmissionError", code });
}

// 年度セットアップで 4 発表会を作り、企画の発表会に締切つきの枠を足す。チームを作り、メンバー 1 人をサインイン済みの生徒に結びつける。
async function setup(db: Db, year: number, deadline: Date | null = null) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const slot = await addMaterialSlot(db, teacher, occasion.id, { slotType: "動画", isRequired: false, deadline });
  const make = async (name: string, email: string) => {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    const user = await db.user.create({ data: { email, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    return { teamId: team.id, actor: { userId: String(user.id), role: "student" } as Actor };
  };
  const own = await make(`チームA${year}`, `a${year}@example.invalid`);
  const other = await make(`チームB${year}`, `b${year}@example.invalid`);
  const summarySlot = await db.materialSlot.findFirstOrThrow({ where: { eventOccasionId: occasion.id, slotType: SUMMARY_SLOT_TYPE } });
  return { fiscalYearId, klassId: klass.id, occasionId: occasion.id, slotId: slot.id, summarySlotId: summarySlot.id, own, other };
}

describe("isLate", () => {
  const deadline = new Date("2026-11-05T14:59:00Z");
  it("初回提出が締切より後なら遅延。同時刻・前・締切なしは遅延でない", () => {
    expect(isLate(new Date("2026-11-05T15:00:00Z"), deadline)).toBe(true);
    expect(isLate(new Date("2026-11-05T14:59:00Z"), deadline)).toBe(false);
    expect(isLate(new Date("2026-11-05T14:00:00Z"), deadline)).toBe(false);
    expect(isLate(new Date("2030-01-01T00:00:00Z"), null)).toBe(false);
  });
});

describeDb("submitMaterial", () => {
  it("初回の提出で行ができ、初回・最終更新とも同じ時刻になる", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9901);
      const now = new Date("2026-11-01T00:00:00Z");
      const result = await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, ` ${URL_A} `, now);
      expect(result).toEqual({ url: URL_A, firstSubmittedAt: now, lastSubmittedAt: now, isLate: false });
      expect(await db.submission.count({ where: { teamId: s.own.teamId, materialSlotId: s.slotId } })).toBe(1);
    });
  });

  it("差し替えは上書きで、初回提出日時は変わらず、最終更新日時だけ進む。行は増えない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9902);
      const first = new Date("2026-11-01T00:00:00Z");
      const second = new Date("2026-11-02T00:00:00Z");
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A, first);
      const result = await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_B, second);
      expect(result).toEqual({ url: URL_B, firstSubmittedAt: first, lastSubmittedAt: second, isLate: false });
      expect(await db.submission.count({ where: { teamId: s.own.teamId, materialSlotId: s.slotId } })).toBe(1);
    });
  });

  it("締切を過ぎても提出でき、初めての提出は遅延になる", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9903, new Date("2026-11-05T14:59:00Z"));
      const result = await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A, new Date("2026-11-06T00:00:00Z"));
      expect(result.isLate).toBe(true);
    });
  });

  it("期限内に提出した枠を締切後に差し替えても、遅延にならない（H-6）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9904, new Date("2026-11-05T14:59:00Z"));
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A, new Date("2026-11-04T00:00:00Z"));
      const result = await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_B, new Date("2026-11-07T00:00:00Z"));
      expect(result.isLate).toBe(false);
    });
  });

  it("先生は提出できない。他チームの生徒も、結びつきのない主体も拒まれ、何も書かれない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9905);
      await expectError(submitMaterial(db, teacher, s.own.teamId, s.slotId, URL_A), "forbidden");
      await expectError(submitMaterial(db, s.other.actor, s.own.teamId, s.slotId, URL_A), "forbidden");
      await expectError(submitMaterial(db, { userId: "", role: "student" }, s.own.teamId, s.slotId, URL_A), "forbidden");
      await expectError(submitMaterial(db, { userId: "abc", role: "student" }, s.own.teamId, s.slotId, URL_A), "forbidden");
      await expectError(submitMaterial(db, { userId: s.own.actor.userId, role: "other" as never }, s.own.teamId, s.slotId, URL_A), "forbidden");
      expect(await db.submission.count()).toBe(0);
    });
  });

  it("URL は http(s) の形式だけ受ける。空・javascript:・NUL・文字列でないものは invalid_input", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9906);
      for (const bad of ["", "   ", "javascript:alert(1)", "ftp://example.invalid/a", "not a url", "https://example.invalid/\0", 1 as never, null as never]) {
        await expectError(submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, bad), "invalid_input");
      }
      await expectError(submitMaterial(db, s.own.actor, 0, s.slotId, URL_A), "invalid_input");
      await expectError(submitMaterial(db, s.own.actor, s.own.teamId, 2 ** 31, URL_A), "invalid_input");
      expect(await db.submission.count()).toBe(0);
    });
  });

  it("概要枠には出せない（概要はフォーム入力）。存在しない枠は slot_not_found", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9907);
      await expectError(submitMaterial(db, s.own.actor, s.own.teamId, s.summarySlotId, URL_A), "summary_slot");
      await expectError(submitMaterial(db, s.own.actor, s.own.teamId, 2_000_000_000, URL_A), "slot_not_found");
      expect(await db.submission.count()).toBe(0);
    });
  });

  it("別の年度の枠には出せない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9908);
      const elsewhere = await setup(db, 9909);
      await expectError(submitMaterial(db, s.own.actor, s.own.teamId, elsewhere.slotId, URL_A), "slot_not_found");
      expect(await db.submission.count()).toBe(0);
    });
  });

  it("年度アーカイブ後は提出も差し替えもできない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9910);
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A);
      await db.fiscalYear.update({ where: { id: s.fiscalYearId }, data: { isArchived: true } });
      await expectError(submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_B), "year_archived");
      expect((await db.submission.findFirstOrThrow({ where: { teamId: s.own.teamId } })).url).toBe(URL_A);
    });
  });
});

describeDb("listTeamSubmissions（SC-09）", () => {
  it("概要枠を除く枠を並べ、提出済みの内容と遅延を添える。未提出で締切後なら warnLate", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9911, new Date("2026-11-05T14:59:00Z"));
      const before = await listTeamSubmissions(db, s.own.actor, s.own.teamId, s.occasionId, new Date("2026-11-06T00:00:00Z"));
      expect(before.map((x) => [x.slotType, x.submission, x.warnLate])).toEqual([
        ["プレゼン資料", null, false],
        ["動画", null, true],
      ]);
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A, new Date("2026-11-06T00:00:00Z"));
      const after = await listTeamSubmissions(db, s.own.actor, s.own.teamId, s.occasionId, new Date("2026-11-07T00:00:00Z"));
      const video = after.find((x) => x.slotType === "動画");
      expect(video).toMatchObject({ submission: { url: URL_A, isLate: true }, warnLate: false });
    });
  });

  it("先生は全チームを読める。他チームの生徒と、先生でも生徒でもない主体は拒まれる", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9912);
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A);
      const asTeacher = await listTeamSubmissions(db, teacher, s.own.teamId, s.occasionId);
      expect(asTeacher.find((x) => x.slotType === "動画")?.submission?.url).toBe(URL_A);
      await expectError(listTeamSubmissions(db, s.other.actor, s.own.teamId, s.occasionId), "forbidden");
      await expectError(listTeamSubmissions(db, { userId: "1", role: "other" as never }, s.own.teamId, s.occasionId), "forbidden");
    });
  });

  it("発表会が無い、または別の年度の発表会は occasion_not_found", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9913);
      const elsewhere = await setup(db, 9914);
      await expectError(listTeamSubmissions(db, s.own.actor, s.own.teamId, elsewhere.occasionId), "occasion_not_found");
      await expectError(listTeamSubmissions(db, s.own.actor, s.own.teamId, 2_000_000_000), "occasion_not_found");
      await expectError(listTeamSubmissions(db, teacher, 0, s.occasionId), "invalid_input");
    });
  });

  it("エラーは SubmissionError", () => {
    expect(new SubmissionError("forbidden")).toBeInstanceOf(Error);
  });
});
