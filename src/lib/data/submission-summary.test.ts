import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { addMaterialSlot } from "@/lib/data/slots";
import { getSubmissionSummaries } from "@/lib/data/submission-summary";
import { submitMaterial } from "@/lib/data/submissions";
import { saveSummary } from "@/lib/data/summaries";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, YearError, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は submission-matrix.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// 年度は 9900 番台を使う。未アーカイブの年度のうち year が最大のものが「当年度」（H-54 の先行方針）なので、実在の年度より常に新しくなる。

type Db = Parameters<typeof getSubmissionSummaries>[0] & Parameters<typeof submitMaterial>[0] & Parameters<typeof saveSummary>[0] &Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Parameters<typeof addMaterialSlot>[0] & Pick<PrismaClient, "user" | "$transaction">;

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
const WHEN = new Date("2026-11-01T00:00:00Z");

// 年度セットアップ → チーム 2 つ（それぞれ生徒に結びつける）。teamCount を 0 にすると、チームの無い年度になる。
async function setup(db: Db, year: number, teamCount = 2) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasions = await db.eventOccasion.findMany({ where: { fiscalYearId } });
  const planning = occasions.find((o) => o.kind === "企画")!;
  const teams: { teamId: number; actor: Actor }[] = [];
  for (let i = 0; i < teamCount; i++) {
    const name = `T${i}-${year}`;
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    const user = await db.user.create({ data: { email: `${name}@example.invalid`, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    teams.push({ teamId: team.id, actor: { userId: String(user.id), role: "student" } });
  }
  const slots = await db.materialSlot.findMany({ where: { eventOccasionId: planning.id }, orderBy: { id: "asc" } });
  const presentation = slots.find((s) => s.slotType === "プレゼン資料")!;
  return { fiscalYearId, occasionId: planning.id, occasions, teams, presentationId: presentation.id };
}

const URL = "https://example.com/a";

describeDb("getSubmissionSummaries（SC-03 の提出状況サマリ）", () => {
  it("先生には、当年度の 4 発表会を種別の順で返す。提出が無ければ、提出済みのチームは 0", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9901);
      const result = await getSubmissionSummaries(db, teacher);
      expect(result).toHaveLength(4);
      expect(result!.map((r) => r.occasionId)).toEqual(["企画", "設計", "試作", "最終"].map((k) => s.occasions.find((o) => o.kind === k)!.id));
      expect(result![0]).toEqual({ occasionId: s.occasionId, kind: "counted", submittedTeams: 0, totalTeams: 2 });
    });
  });

  it("必須の資料枠がすべて提出済みのチームだけを数える。1 つでも欠ければ数えない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9902);
      const [a, b] = s.teams;
      // A は必須 2 枠（概要・プレゼン資料）とも提出。B はプレゼン資料だけ。
      await db.summary.create({ data: { teamId: a.teamId, eventOccasionId: s.occasionId, firstSubmittedAt: WHEN, lastSubmittedAt: WHEN } });
      await submitMaterial(db, a.actor, a.teamId, s.presentationId, URL);
      await submitMaterial(db, b.actor, b.teamId, s.presentationId, URL);
      const result = await getSubmissionSummaries(db, teacher);
      expect(result![0]).toEqual({ occasionId: s.occasionId, kind: "counted", submittedTeams: 1, totalTeams: 2 });
    });
  });

  it("概要枠は、概要（summaries）の行の有無で見る。提出（submissions）の行では満たされない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9903);
      const [a] = s.teams;
      await submitMaterial(db, a.actor, a.teamId, s.presentationId, URL);
      expect((await getSubmissionSummaries(db, teacher))![0]).toMatchObject({ kind: "counted", submittedTeams: 0 });
      await db.summary.create({ data: { teamId: a.teamId, eventOccasionId: s.occasionId, firstSubmittedAt: WHEN, lastSubmittedAt: WHEN } });
      expect((await getSubmissionSummaries(db, teacher))![0]).toMatchObject({ kind: "counted", submittedTeams: 1 });
    });
  });

  // 上の 2 件は summaries の行を直接作っている。ここは SC-10 の保存（saveSummary）を通して、サマリの数が動くことを確かめる（3.3.2 の結合）。
  it("概要を saveSummary で保存すると、提出済みのチームが 1 つ増える。差し替えでは増えない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9904);
      const [a] = s.teams;
      await submitMaterial(db, a.actor, a.teamId, s.presentationId, URL);
      expect((await getSubmissionSummaries(db, teacher))![0]).toEqual({ occasionId: s.occasionId, kind: "counted", submittedTeams: 0, totalTeams: 2 });

      await saveSummary(db, a.actor, a.teamId, s.occasionId, { introduction: "はじめに" });
      expect((await getSubmissionSummaries(db, teacher))![0]).toEqual({ occasionId: s.occasionId, kind: "counted", submittedTeams: 1, totalTeams: 2 });

      await saveSummary(db, a.actor, a.teamId, s.occasionId, { introduction: "書き直したはじめに", closing: "終わりに" });
      expect((await getSubmissionSummaries(db, teacher))![0]).toMatchObject({ kind: "counted", submittedTeams: 1, totalTeams: 2 });
    });
  });

  it("概要の保存が断られたときは、数えない（全欄が空・他チームの生徒の保存）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9905);
      const [a, b] = s.teams;
      await submitMaterial(db, a.actor, a.teamId, s.presentationId, URL);

      await expect(saveSummary(db, a.actor, a.teamId, s.occasionId, {})).rejects.toMatchObject({ name: "SubmissionError", code: "empty_summary" });
      await expect(saveSummary(db, b.actor, a.teamId, s.occasionId, { introduction: "他チームの代理" })).rejects.toMatchObject({ name: "SubmissionError", code: "forbidden" });
      expect((await getSubmissionSummaries(db, teacher))![0]).toMatchObject({ kind: "counted", submittedTeams: 0, totalTeams: 2 });
    });
  });

  it("任意の資料枠は数えない。任意の枠だけを提出しても、数えない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9904);
      const [a] = s.teams;
      const video = await addMaterialSlot(db, teacher, s.occasionId, { slotType: "動画", isRequired: false });
      await submitMaterial(db, a.actor, a.teamId, video.id, URL);
      expect((await getSubmissionSummaries(db, teacher))![0]).toMatchObject({ kind: "counted", submittedTeams: 0 });
      // 任意の枠を足しても、必須が済んだチームは数えられる（分母は変わらない）。
      await db.summary.create({ data: { teamId: a.teamId, eventOccasionId: s.occasionId, firstSubmittedAt: WHEN, lastSubmittedAt: WHEN } });
      await submitMaterial(db, a.actor, a.teamId, s.presentationId, URL);
      expect((await getSubmissionSummaries(db, teacher))![0]).toMatchObject({ kind: "counted", submittedTeams: 1, totalTeams: 2 });
    });
  });

  it("チームが 0 件の年度は、数値を返さず no_teams を返す（エラーにしない）", async () => {
    await inTransaction(async (db) => {
      await setup(db, 9905, 0);
      const result = await getSubmissionSummaries(db, teacher);
      expect(result).toHaveLength(4);
      expect(result!.every((r) => r.kind === "no_teams")).toBe(true);
    });
  });

  it("必須の資料枠が 0 件の発表会は、数値を返さず no_required_slots を返す。ほかの発表会は数える", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9906);
      await db.materialSlot.updateMany({ where: { eventOccasionId: s.occasionId }, data: { isRequired: false } });
      const result = await getSubmissionSummaries(db, teacher);
      expect(result![0]).toEqual({ occasionId: s.occasionId, kind: "no_required_slots" });
      expect(result![1]).toMatchObject({ kind: "counted", submittedTeams: 0, totalTeams: 2 });
    });
  });

  it("チームも必須の資料枠も 0 件のときは、チームが 0 件のほうとして扱う（H-66 の②の③）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9907, 0);
      await db.materialSlot.updateMany({ where: { eventOccasionId: s.occasionId }, data: { isRequired: false } });
      expect((await getSubmissionSummaries(db, teacher))![0]).toEqual({ occasionId: s.occasionId, kind: "no_teams" });
    });
  });

  it("当年度のチームを持つ生徒には、先生と同じ結果を返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9908);
      const [a] = s.teams;
      await db.summary.create({ data: { teamId: a.teamId, eventOccasionId: s.occasionId, firstSubmittedAt: WHEN, lastSubmittedAt: WHEN } });
      await submitMaterial(db, a.actor, a.teamId, s.presentationId, URL);
      expect(await getSubmissionSummaries(db, a.actor)).toEqual(await getSubmissionSummaries(db, teacher));
    });
  });

  it("チームを持たない生徒・メンバー行に結びつかない主体には、null を返す", async () => {
    await inTransaction(async (db) => {
      await setup(db, 9909);
      const lone = await db.user.create({ data: { email: "lone@example.invalid", name: "無所属", role: "student" } });
      expect(await getSubmissionSummaries(db, { userId: String(lone.id), role: "student" })).toBeNull();
      expect(await getSubmissionSummaries(db, { userId: "not-a-number", role: "student" })).toBeNull();
    });
  });

  it("前年度にしかチームを持たない生徒には、null を返す（当年度のチームかどうかで決まる）", async () => {
    await inTransaction(async (db) => {
      const old = await setup(db, 9910);
      await setup(db, 9911);
      expect(await getSubmissionSummaries(db, old.teams[0].actor)).toBeNull();
    });
  });

  it("全体のチーム数は、同じ年度の全クラスのチームの合計（getSubmissionMatrix と同じ範囲）", async () => {
    await inTransaction(async (db) => {
      const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year: 9913, classNames: ["IG21", "IG22"] });
      const classes = await db.schoolClass.findMany({ where: { fiscalYearId }, orderBy: { id: "asc" } });
      const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
      await createTeam(db, teacher, { classId: classes[0].id, name: "一組-1", members: ["山田"] });
      await createTeam(db, teacher, { classId: classes[0].id, name: "一組-2", members: ["山田"] });
      const other = await createTeam(db, teacher, { classId: classes[1].id, name: "二組-1", members: ["山田"] });
      // 二組のチームが必須の枠をすべて提出すると、一組のチームと合わせた 3 チームのうち 1 チームが提出済みになる。
      const presentation = await db.materialSlot.findFirstOrThrow({ where: { eventOccasionId: occasion.id, slotType: "プレゼン資料" } });
      await db.summary.create({ data: { teamId: other.id, eventOccasionId: occasion.id, firstSubmittedAt: WHEN, lastSubmittedAt: WHEN } });
      await db.submission.create({ data: { teamId: other.id, materialSlotId: presentation.id, url: URL, firstSubmittedAt: WHEN, lastSubmittedAt: WHEN } });
      expect((await getSubmissionSummaries(db, teacher))![0]).toEqual({ occasionId: occasion.id, kind: "counted", submittedTeams: 1, totalTeams: 3 });
    });
  });

  it("前年度のチームは、当年度の全体のチーム数にも提出済みの数にも入らない", async () => {
    await inTransaction(async (db) => {
      const old = await setup(db, 9914, 2);
      // 前年度のチームが必須の枠をすべて提出していても、当年度の数には混ざらない。
      for (const t of old.teams) {
        await db.summary.create({ data: { teamId: t.teamId, eventOccasionId: old.occasionId, firstSubmittedAt: WHEN, lastSubmittedAt: WHEN } });
        await submitMaterial(db, t.actor, t.teamId, old.presentationId, URL);
      }
      const current = await setup(db, 9915, 1);
      const result = await getSubmissionSummaries(db, teacher);
      expect(result![0]).toEqual({ occasionId: current.occasionId, kind: "counted", submittedTeams: 0, totalTeams: 1 });
    });
  });

  it("先生でも生徒でもない主体は、forbidden で弾く", async () => {
    await inTransaction(async (db) => {
      await setup(db, 9912);
      const outsider = { userId: "1", role: "guest" } as unknown as Actor;
      await expect(getSubmissionSummaries(db, outsider)).rejects.toBeInstanceOf(YearError);
    });
  });
});
