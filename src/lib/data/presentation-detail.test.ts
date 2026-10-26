import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { getPresentationDetail } from "@/lib/data/presentation-detail";
import { addMaterialSlot } from "@/lib/data/slots";
import { submitMaterial } from "@/lib/data/submissions";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は submissions.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。

type Db = Parameters<typeof getPresentationDetail>[0] & Parameters<typeof submitMaterial>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Parameters<typeof addMaterialSlot>[0] & Pick<PrismaClient, "user" | "$transaction">;

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
const DEADLINE = new Date("2026-11-05T14:59:00Z");

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "SubmissionError", code });
}

// 企画の発表会に締切つきの枠を足し、チーム 2 つ（それぞれメンバー 1 人をサインイン済みの生徒に結びつける）を作る。
async function setup(db: Db, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const slot = await addMaterialSlot(db, teacher, occasion.id, { slotType: "動画", isRequired: false, deadline: DEADLINE });
  const make = async (name: string, email: string) => {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田", "鈴木"] });
    const user = await db.user.create({ data: { email, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    return { teamId: team.id, actor: { userId: String(user.id), role: "student" } as Actor };
  };
  const own = await make(`チームA${year}`, `a${year}@example.invalid`);
  const other = await make(`チームB${year}`, `b${year}@example.invalid`);
  return { occasionId: occasion.id, slotId: slot.id, own, other };
}

describeDb("getPresentationDetail", () => {
  it("公開前は先生と自チームの生徒に返し、聴く生徒（別チームの生徒）には forbidden", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9931);
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A);
      const forTeacher = await getPresentationDetail(db, teacher, s.own.teamId, s.occasionId);
      expect(forTeacher).toMatchObject({ team: { id: s.own.teamId, name: "チームA9931" }, members: ["山田", "鈴木"], workTitle: null, summary: null });
      expect(forTeacher.links).toHaveLength(1);
      expect(await getPresentationDetail(db, s.own.actor, s.own.teamId, s.occasionId)).toEqual(forTeacher);
      await expectError(getPresentationDetail(db, s.other.actor, s.own.teamId, s.occasionId), "forbidden");
    });
  });

  it("公開後は聴く生徒にも返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9932);
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A);
      await db.eventOccasion.update({ where: { id: s.occasionId }, data: { isPublished: true } });
      const detail = await getPresentationDetail(db, s.other.actor, s.own.teamId, s.occasionId);
      expect(detail.links).toMatchObject([{ slotId: s.slotId, slotType: "動画", url: URL_A, lastUpdatedAt: null }]);
    });
  });

  it("ロールが不明・未紐づけ・引数が不正なら拒む", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9933);
      await expectError(getPresentationDetail(db, { userId: "1", role: "other" as never }, s.own.teamId, s.occasionId), "forbidden");
      await expectError(getPresentationDetail(db, { userId: "abc", role: "student" }, s.own.teamId, s.occasionId), "forbidden");
      await expectError(getPresentationDetail(db, teacher, 0, s.occasionId), "invalid_input");
      await expectError(getPresentationDetail(db, teacher, s.own.teamId, 1.5), "invalid_input");
    });
  });

  it("存在しない発表会・別の年度の発表会は occasion_not_found", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9934);
      const elsewhere = await setup(db, 9935);
      await expectError(getPresentationDetail(db, teacher, s.own.teamId, 2_000_000_000), "occasion_not_found");
      await expectError(getPresentationDetail(db, teacher, s.own.teamId, elsewhere.occasionId), "occasion_not_found");
    });
  });

  it("概要の行はリンクに出さず、概要は別に返す。未提出の枠は出さない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9936);
      await addMaterialSlot(db, teacher, s.occasionId, { slotType: "資料", isRequired: false, deadline: null });
      const when = new Date("2026-11-01T00:00:00Z");
      await db.summary.create({ data: { teamId: s.own.teamId, eventOccasionId: s.occasionId, techStack: "TypeScript", firstSubmittedAt: when, lastSubmittedAt: when } });
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A, when);
      const detail = await getPresentationDetail(db, teacher, s.own.teamId, s.occasionId);
      expect(detail.links.map((l) => l.slotType)).toEqual(["動画"]);
      expect(detail.summary).toEqual({ techStack: "TypeScript", firstSubmittedAt: when, lastSubmittedAt: when });
    });
  });

  it("最終更新日時は、締切後に差し替えがあったときだけ添える", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9937);
      const early = new Date("2026-11-01T00:00:00Z");
      const late = new Date("2026-11-06T00:00:00Z");
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_A, early);
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_B, early);
      expect((await getPresentationDetail(db, teacher, s.own.teamId, s.occasionId)).links[0].lastUpdatedAt).toBeNull();
      await submitMaterial(db, s.own.actor, s.own.teamId, s.slotId, URL_B, late);
      const link = (await getPresentationDetail(db, teacher, s.own.teamId, s.occasionId)).links[0];
      expect(link).toMatchObject({ url: URL_B, firstSubmittedAt: early, lastUpdatedAt: late });
    });
  });

  it("アーカイブ済みの年度は、生徒には occasion_not_found（公開済みでも、自チームでも）。先生には返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9938);
      await db.eventOccasion.update({ where: { id: s.occasionId }, data: { isPublished: true } });
      await db.fiscalYear.update({ where: { year: 9938 }, data: { isArchived: true } });
      await expectError(getPresentationDetail(db, s.other.actor, s.own.teamId, s.occasionId), "occasion_not_found");
      await expectError(getPresentationDetail(db, s.own.actor, s.own.teamId, s.occasionId), "occasion_not_found");
      expect(await getPresentationDetail(db, teacher, s.own.teamId, s.occasionId)).toMatchObject({ team: { id: s.own.teamId } });
    });
  });
});
