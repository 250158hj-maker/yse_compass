import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { addMaterialSlot } from "@/lib/data/slots";
import { getSubmissionMatrix } from "@/lib/data/submission-matrix";
import { submitMaterial } from "@/lib/data/submissions";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は submissions.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。

type Db = Parameters<typeof getSubmissionMatrix>[0] & Parameters<typeof submitMaterial>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Parameters<typeof addMaterialSlot>[0] & Pick<PrismaClient, "user" | "$transaction">;

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
const DEADLINE = new Date("2026-11-05T14:59:00Z");

// 年度セットアップ → 企画の発表会に締切つきの枠「動画」を足す → チーム 2 つ（それぞれ生徒に結びつける）。
async function setup(db: Db, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const video = await addMaterialSlot(db, teacher, occasion.id, { slotType: "動画", isRequired: false, deadline: DEADLINE });
  const make = async (name: string) => {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    const user = await db.user.create({ data: { email: `${name}@example.invalid`, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    return { teamId: team.id, actor: { userId: String(user.id), role: "student" } as Actor };
  };
  const a = await make(`A${year}`);
  const b = await make(`B${year}`);
  const slots = await db.materialSlot.findMany({ where: { eventOccasionId: occasion.id }, orderBy: { id: "asc" } });
  return { fiscalYearId, occasionId: occasion.id, videoId: video.id, a, b, slotIds: slots.map((s) => s.id) };
}

describeDb("getSubmissionMatrix（SC-06：T のみ）", () => {
  it("全チーム × 全資料枠を返す。提出が無ければ、すべて未提出", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9931);
      const { slots, rows } = await getSubmissionMatrix(db, teacher, s.occasionId);
      expect(slots.map((x) => x.slotType)).toEqual(["概要", "プレゼン資料", "動画"]);
      expect(rows.map((r) => r.team.name)).toEqual(["A9931", "B9931"]);
      expect(rows.every((r) => r.team.className === "IG21" && r.cells.length === 3 && r.cells.every((c) => c.status === "missing"))).toBe(true);
    });
  });

  it("提出済みのセルに、リンク・日時・遅延を添える。他のチームのセルは未提出のまま", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9932);
      await submitMaterial(db, s.a.actor, s.a.teamId, s.videoId, "https://example.invalid/a", new Date("2026-11-06T00:00:00Z"));
      const { rows } = await getSubmissionMatrix(db, teacher, s.occasionId);
      const cellA = rows[0].cells.find((c) => c.slotId === s.videoId);
      expect(cellA).toMatchObject({ status: "submitted", url: "https://example.invalid/a", isLate: true, showLastUpdated: false });
      expect(rows[1].cells.find((c) => c.slotId === s.videoId)).toEqual({ slotId: s.videoId, status: "missing" });
    });
  });

  it("期限内に提出して締切後に差し替えたら、遅延にならず、最終更新日時を添える（H-6）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9933);
      await submitMaterial(db, s.a.actor, s.a.teamId, s.videoId, "https://example.invalid/a", new Date("2026-11-04T00:00:00Z"));
      await submitMaterial(db, s.a.actor, s.a.teamId, s.videoId, "https://example.invalid/b", new Date("2026-11-07T00:00:00Z"));
      const { rows } = await getSubmissionMatrix(db, teacher, s.occasionId);
      expect(rows[0].cells.find((c) => c.slotId === s.videoId)).toMatchObject({ url: "https://example.invalid/b", isLate: false, showLastUpdated: true });
    });
  });

  it("期限内の差し替え・締切が無い枠は、最終更新日時を添えず、遅延にもならない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9934);
      const presentation = await db.materialSlot.findFirstOrThrow({ where: { eventOccasionId: s.occasionId, slotType: "プレゼン資料" } });
      await submitMaterial(db, s.a.actor, s.a.teamId, s.videoId, "https://example.invalid/a", new Date("2026-11-01T00:00:00Z"));
      await submitMaterial(db, s.a.actor, s.a.teamId, s.videoId, "https://example.invalid/b", new Date("2026-11-02T00:00:00Z"));
      await submitMaterial(db, s.a.actor, s.a.teamId, presentation.id, "https://example.invalid/p", new Date("2030-01-01T00:00:00Z"));
      await submitMaterial(db, s.a.actor, s.a.teamId, presentation.id, "https://example.invalid/q", new Date("2030-01-02T00:00:00Z"));
      const { rows } = await getSubmissionMatrix(db, teacher, s.occasionId);
      expect(rows[0].cells.find((c) => c.slotId === s.videoId)).toMatchObject({ isLate: false, showLastUpdated: false });
      expect(rows[0].cells.find((c) => c.slotId === presentation.id)).toMatchObject({ isLate: false, showLastUpdated: false });
    });
  });

  it("概要枠は、概要（summaries）の行の有無で見る。リンクは無い", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9935);
      const when = new Date("2026-11-06T00:00:00Z");
      await db.summary.create({ data: { teamId: s.a.teamId, eventOccasionId: s.occasionId, firstSubmittedAt: when, lastSubmittedAt: when } });
      const { slots, rows } = await getSubmissionMatrix(db, teacher, s.occasionId);
      const summarySlot = slots.find((x) => x.slotType === "概要")!;
      expect(rows[0].cells.find((c) => c.slotId === summarySlot.id)).toMatchObject({ status: "submitted", url: null, firstSubmittedAt: when });
      expect(rows[1].cells.find((c) => c.slotId === summarySlot.id)).toEqual({ slotId: summarySlot.id, status: "missing" });
    });
  });

  it("別の年度のチームは含めない。先生以外・無い発表会・不正な id は拒む", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9936);
      await setup(db, 9937);
      const { rows } = await getSubmissionMatrix(db, teacher, s.occasionId);
      expect(rows.map((r) => r.team.name)).toEqual(["A9936", "B9936"]);
      for (const actor of [s.a.actor, { userId: "1", role: "other" as never }]) {
        await expect(getSubmissionMatrix(db, actor, s.occasionId)).rejects.toMatchObject({ name: "SubmissionError", code: "forbidden" });
      }
      await expect(getSubmissionMatrix(db, teacher, 0)).rejects.toMatchObject({ code: "invalid_input" });
      await expect(getSubmissionMatrix(db, teacher, 2_000_000_000)).rejects.toMatchObject({ code: "occasion_not_found" });
    });
  });
});
