import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { setOccasionPublished, updateMaterialSlot } from "@/lib/data/slots";
import { submitMaterial } from "@/lib/data/submissions";
import { listTeamOccasionStatuses } from "@/lib/data/team-occasions";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は submission-matrix.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。

type Db = Parameters<typeof listTeamOccasionStatuses>[0] & Parameters<typeof submitMaterial>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Parameters<typeof setOccasionPublished>[0] & Pick<PrismaClient, "user" | "$transaction">;

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

// 年度セットアップ → チーム 2 つ（それぞれ生徒に結びつける）→ 結びついていない生徒 1 人（どのチームにも属さない）。
async function setup(db: Db, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const make = async (name: string) => {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    const user = await db.user.create({ data: { email: `${name}@example.invalid`, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    return { teamId: team.id, actor: { userId: String(user.id), role: "student" } as Actor };
  };
  const a = await make(`A${year}`);
  const b = await make(`B${year}`);
  const stranger = await db.user.create({ data: { email: `stranger${year}@example.invalid`, name: "無所属", role: "student" } });
  const occasions = await db.eventOccasion.findMany({ where: { fiscalYearId } });
  const occasionOf = (kind: string) => occasions.find((o) => o.kind === kind)!;
  return { fiscalYearId, a, b, strangerActor: { userId: String(stranger.id), role: "student" } as Actor, occasionOf };
}

describeDb("listTeamOccasionStatuses（SC-14 の縦断ビュー：先生と自チームの生徒だけに提出状況）", () => {
  it("先生には、年度の発表会を種別の順（企画・設計・試作・最終）で、資料枠ごとの提出状況つきで返す。提出が無ければすべて未提出", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9971);
      const result = await listTeamOccasionStatuses(db, teacher, s.a.teamId);
      expect(result.team).toEqual({ id: s.a.teamId, name: "A9971" });
      expect(result.occasions.map((o) => o.kind)).toEqual(["企画", "設計", "試作", "最終"]);
      for (const o of result.occasions) {
        expect(o.submissions?.slots.map((x) => x.slotType)).toEqual(["概要", "プレゼン資料"]);
        expect(o.submissions?.slots.every((x) => x.status === "missing" && x.isRequired && x.isRequiredMissing)).toBe(true);
        expect(o.submissions?.requiredMissing).toEqual({ kind: "counted", total: 2 });
      }
    });
  });

  it("自チームの生徒にも、先生と同じ結果を返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9972);
      expect(await listTeamOccasionStatuses(db, s.a.actor, s.a.teamId)).toEqual(await listTeamOccasionStatuses(db, teacher, s.a.teamId));
    });
  });

  it("提出済みの枠に、リンク・日時・遅延を添える。他の発表会・他のチームの提出は混ざらない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9973);
      const planning = s.occasionOf("企画");
      const slot = await db.materialSlot.findFirstOrThrow({ where: { eventOccasionId: planning.id, slotType: "プレゼン資料" } });
      await db.materialSlot.update({ where: { id: slot.id }, data: { deadline: new Date("2026-11-05T14:59:00Z") } });
      await submitMaterial(db, s.a.actor, s.a.teamId, slot.id, "https://example.invalid/a", new Date("2026-11-06T00:00:00Z"));
      await submitMaterial(db, s.b.actor, s.b.teamId, slot.id, "https://example.invalid/b", new Date("2026-11-01T00:00:00Z"));

      const { occasions } = await listTeamOccasionStatuses(db, teacher, s.a.teamId);
      const cell = occasions.find((o) => o.id === planning.id)!.submissions!.slots.find((x) => x.slotType === "プレゼン資料");
      expect(cell).toMatchObject({ status: "submitted", url: "https://example.invalid/a", isLate: true, showLastUpdated: false, isRequiredMissing: false });
      expect(occasions.find((o) => o.id === planning.id)!.submissions!.requiredMissing).toEqual({ kind: "counted", total: 1 });
      // 設計の発表会は、どの枠もまだ未提出のまま。
      const design = occasions.find((o) => o.kind === "設計")!;
      expect(design.submissions!.slots.every((x) => x.status === "missing")).toBe(true);
    });
  });

  it("概要枠は、概要（summaries）の行の有無で見る。リンクは無い", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9974);
      const planning = s.occasionOf("企画");
      const when = new Date("2026-11-06T00:00:00Z");
      await db.summary.create({ data: { teamId: s.a.teamId, eventOccasionId: planning.id, firstSubmittedAt: when, lastSubmittedAt: when } });
      const { occasions } = await listTeamOccasionStatuses(db, teacher, s.a.teamId);
      const cell = occasions.find((o) => o.id === planning.id)!.submissions!.slots.find((x) => x.slotType === "概要");
      expect(cell).toMatchObject({ status: "submitted", url: null, firstSubmittedAt: when });
      // 設計の概要は、別の発表会の行なので未提出のまま。
      expect(occasions.find((o) => o.kind === "設計")!.submissions!.slots.find((x) => x.slotType === "概要")).toMatchObject({ status: "missing" });
    });
  });

  it("必須の資料枠が 0 件の発表会は、0 件と数えず、区別を返す（SC-06 と同じ扱い）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9975);
      const planning = s.occasionOf("企画");
      const slots = await db.materialSlot.findMany({ where: { eventOccasionId: planning.id } });
      for (const slot of slots) await updateMaterialSlot(db, teacher, slot.id, { isRequired: false });
      const { occasions } = await listTeamOccasionStatuses(db, teacher, s.a.teamId);
      expect(occasions.find((o) => o.id === planning.id)!.submissions!.requiredMissing).toEqual({ kind: "no_required_slots" });
      expect(occasions.find((o) => o.kind === "設計")!.submissions!.requiredMissing).toEqual({ kind: "counted", total: 2 });
    });
  });

  it("他チームの生徒と、チームに結びついていない生徒には、公開済みの発表会の導線だけを返し、提出状況は返さない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9976);
      const planning = s.occasionOf("企画");
      const slot = await db.materialSlot.findFirstOrThrow({ where: { eventOccasionId: planning.id, slotType: "プレゼン資料" } });
      await submitMaterial(db, s.a.actor, s.a.teamId, slot.id, "https://example.invalid/secret");
      await setOccasionPublished(db, teacher, planning.id, true);

      for (const actor of [s.b.actor, s.strangerActor]) {
        const result = await listTeamOccasionStatuses(db, actor, s.a.teamId);
        expect(result.team).toEqual({ id: s.a.teamId, name: "A9976" });
        expect(result.occasions).toEqual([{ id: planning.id, kind: "企画", eventDate: null, isPublished: true, submissions: null }]);
        expect(JSON.stringify(result)).not.toContain("secret");
      }
      // 自チームの生徒には、公開前の発表会も含めて 4 つ返す。
      expect((await listTeamOccasionStatuses(db, s.a.actor, s.a.teamId)).occasions).toHaveLength(4);
    });
  });

  it("公開済みの発表会が無ければ、他チームの生徒には空の一覧を返す（チームの情報は返す）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9977);
      expect((await listTeamOccasionStatuses(db, s.b.actor, s.a.teamId)).occasions).toEqual([]);
    });
  });

  it("アーカイブ済みの年度は、生徒には無いのと同じ結果にし、先生には返す（H-60 の先行方針）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9978);
      await db.fiscalYear.update({ where: { id: s.fiscalYearId }, data: { isArchived: true } });
      for (const actor of [s.a.actor, s.b.actor]) {
        await expect(listTeamOccasionStatuses(db, actor, s.a.teamId)).rejects.toMatchObject({ name: "SubmissionError", code: "occasion_not_found" });
      }
      expect((await listTeamOccasionStatuses(db, teacher, s.a.teamId)).occasions).toHaveLength(4);
    });
  });

  it("先生でも生徒でもない主体・不正な id は拒み、無いチームは occasion_not_found にする", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9979);
      await expect(listTeamOccasionStatuses(db, { userId: "1", role: "other" as never }, s.a.teamId)).rejects.toMatchObject({ code: "forbidden" });
      await expect(listTeamOccasionStatuses(db, teacher, 0)).rejects.toMatchObject({ code: "invalid_input" });
      await expect(listTeamOccasionStatuses(db, teacher, 2_000_000_000)).rejects.toMatchObject({ code: "occasion_not_found" });
    });
  });
});
