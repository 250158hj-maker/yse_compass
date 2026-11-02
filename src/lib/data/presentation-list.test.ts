import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { listOccasionPresentations } from "@/lib/data/presentation-list";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, setYearArchived, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は submission-matrix.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。

type Db = Parameters<typeof listOccasionPresentations>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Pick<PrismaClient, "user" | "schoolClass" | "$transaction">;

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

// 年度セットアップ → チームを作る（作品名つき／なし）。createTeam が、各発表会の発表の行（発表順は未設定）を作る。
async function setup(db: Db, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const make = async (name: string, workTitle?: string) => (await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"], ...(workTitle ? { workTitle } : {}) })).id;
  const a = await make(`A${year}`, "作品A");
  const b = await make(`B${year}`, "作品B");
  const c = await make(`C${year}`);
  const student = async (name: string) => ({ userId: String((await db.user.create({ data: { email: `${name}@example.invalid`, name, role: "student" } })).id), role: "student" }) as Actor;
  return { fiscalYearId, occasionId: occasion.id, teams: { a, b, c }, student };
}

async function setOrder(db: Db, occasionId: number, order: Record<number, number | null>) {
  for (const [teamId, displayOrder] of Object.entries(order)) {
    await db.presentation.updateMany({ where: { eventOccasionId: occasionId, teamId: Number(teamId) }, data: { displayOrder } });
  }
}

const publish = (db: Db, occasionId: number) => db.eventOccasion.update({ where: { id: occasionId }, data: { isPublished: true } });
async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "SubmissionError", code });
}

describeDb("listOccasionPresentations（SC-04 の発表（チーム）一覧）", () => {
  it("先生には、公開前も一覧を返す。発表順の昇順で、未設定は最後。作品名が無ければ null", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9701);
      await setOrder(db, s.occasionId, { [s.teams.a]: 2, [s.teams.b]: 1, [s.teams.c]: null });
      const result = await listOccasionPresentations(db, teacher, s.occasionId);
      expect(result).toEqual({
        kind: "list",
        presentations: [
          { teamId: s.teams.b, teamName: "B9701", workTitle: "作品B" },
          { teamId: s.teams.a, teamName: "A9701", workTitle: "作品A" },
          { teamId: s.teams.c, teamName: "C9701", workTitle: null },
        ],
      });
    });
  });

  it("発表順が同じ（未設定どうしを含む）ときは、発表の id 順（getTimetable と同じ並び）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9702);
      const result = await listOccasionPresentations(db, teacher, s.occasionId);
      if (result.kind !== "list") throw new Error("list expected");
      expect(result.presentations.map((p) => p.teamId)).toEqual([s.teams.a, s.teams.b, s.teams.c]);
    });
  });

  it("生徒には、公開前は not_published を返し、チーム名も作品名も返さない（自チームの生徒も、チームを持たない生徒も同じ）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9703);
      const member = await s.student("member9703");
      const own = await db.teamMember.findFirstOrThrow({ where: { teamId: s.teams.a } });
      await db.teamMember.update({ where: { id: own.id }, data: { userId: Number(member.userId) } });
      const stranger = await s.student("stranger9703");
      for (const actor of [member, stranger]) {
        const result = await listOccasionPresentations(db, actor, s.occasionId);
        expect(result).toEqual({ kind: "not_published" });
        expect(JSON.stringify(result)).not.toContain("A9703");
      }
    });
  });

  it("公開後は、生徒にも先生と同じ一覧を返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9704);
      await setOrder(db, s.occasionId, { [s.teams.c]: 1, [s.teams.a]: 2, [s.teams.b]: 3 });
      await publish(db, s.occasionId);
      const student = await s.student("listener9704");
      const forStudent = await listOccasionPresentations(db, student, s.occasionId);
      expect(forStudent.kind).toBe("list");
      expect(forStudent).toEqual(await listOccasionPresentations(db, teacher, s.occasionId));
    });
  });

  it("アーカイブ済みの年度の発表会は、生徒には occasion_not_found（公開後でも）。先生には一覧を返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9705);
      await publish(db, s.occasionId);
      await setYearArchived(db, teacher, s.fiscalYearId, true);
      const student = await s.student("late9705");
      await expectError(listOccasionPresentations(db, student, s.occasionId), "occasion_not_found");
      expect((await listOccasionPresentations(db, teacher, s.occasionId)).kind).toBe("list");
    });
  });

  it("発表が 0 件の発表会は、空の一覧を返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9706);
      await db.presentation.deleteMany({ where: { eventOccasionId: s.occasionId } });
      expect(await listOccasionPresentations(db, teacher, s.occasionId)).toEqual({ kind: "list", presentations: [] });
    });
  });

  it("発表会が無ければ occasion_not_found、ID が整数でなければ invalid_input、先生でも生徒でもない主体は forbidden", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9707);
      await expectError(listOccasionPresentations(db, teacher, 2_000_000_000), "occasion_not_found");
      await expectError(listOccasionPresentations(db, teacher, 0), "invalid_input");
      await expectError(listOccasionPresentations(db, teacher, 1.5), "invalid_input");
      await expectError(listOccasionPresentations(db, { userId: "1", role: "guest" } as unknown as Actor, s.occasionId), "forbidden");
    });
  });
});
