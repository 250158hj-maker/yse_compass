import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { getOwnTeam } from "@/lib/data/own-team";
import { addMember, createTeam, setLeader } from "@/lib/data/teams";
import { setupFiscalYear, setYearArchived, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は submission-summary.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// 年度は 9900 番台を使う。未アーカイブの年度のうち year が最大のものが「当年度」（H-54 の先行方針）なので、実在の年度より常に新しくなる。

type Db = Parameters<typeof getOwnTeam>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Parameters<typeof setYearArchived>[0] & Pick<PrismaClient, "user" | "schoolClass" | "$transaction">;

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

// 年度セットアップ → チーム 1 つ（メンバー 2 人。先頭の 1 人だけ生徒に結びつける）。
async function setup(db: Db, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const team = await createTeam(db, teacher, { classId: klass.id, name: `T-${year}`, members: ["山田", "鈴木"] });
  const user = await db.user.create({ data: { email: `own-${year}@example.invalid`, name: "山田", role: "student" } });
  await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
  return { fiscalYearId, klass, team, actor: { userId: String(user.id), role: "student" } as Actor };
}

describeDb("getOwnTeam（SC-02 の自チーム）", () => {
  it("当年度のチームに結びついた生徒には、チーム・クラス・メンバーを返す。メンバーは id の順で、userId は返さない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9901);
      const result = await getOwnTeam(db, s.actor);
      expect(result).toEqual({
        kind: "member",
        team: {
          id: s.team.id,
          name: "T-9901",
          class: { id: s.klass.id, name: "IG21" },
          members: [
            { id: s.team.members[0].id, name: "山田", isLeader: false },
            { id: s.team.members[1].id, name: "鈴木", isLeader: false },
          ],
        },
      });
      expect(JSON.stringify(result)).not.toContain("userId");
    });
  });

  it("リーダーのメンバーだけ isLeader が true になる", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9902);
      await setLeader(db, teacher, s.team.id, s.team.members[1].id);
      const result = await getOwnTeam(db, s.actor);
      expect(result).toMatchObject({ kind: "member" });
      if (result.kind !== "member") return;
      expect(result.team.members.map((m) => m.isLeader)).toEqual([false, true]);
    });
  });

  it("メンバーが後から増えても、返すメンバーに入る", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9903);
      await addMember(db, teacher, s.team.id, "佐藤");
      const result = await getOwnTeam(db, s.actor);
      if (result.kind !== "member") throw new Error("member で返るはず");
      expect(result.team.members.map((m) => m.name)).toEqual(["山田", "鈴木", "佐藤"]);
    });
  });

  it("当年度のチームに結びついていない生徒には、unlinked を返す（メンバー行に結びつく前）", async () => {
    await inTransaction(async (db) => {
      await setup(db, 9904);
      const other = await db.user.create({ data: { email: "own-unlinked@example.invalid", name: "結びつき前", role: "student" } });
      expect(await getOwnTeam(db, { userId: String(other.id), role: "student" })).toEqual({ kind: "unlinked" });
    });
  });

  it("整数にできない userId の生徒は、どのメンバー行にも結びつかないので unlinked", async () => {
    await inTransaction(async (db) => {
      await setup(db, 9905);
      expect(await getOwnTeam(db, { userId: "abc", role: "student" })).toEqual({ kind: "unlinked" });
    });
  });

  it("先生には not_student を返す（エラーにしない）", async () => {
    await inTransaction(async (db) => {
      await setup(db, 9906);
      expect(await getOwnTeam(db, teacher)).toEqual({ kind: "not_student" });
    });
  });

  it("先生でも生徒でもない主体は forbidden", async () => {
    await inTransaction(async (db) => {
      await setup(db, 9907);
      await expect(getOwnTeam(db, { userId: "1", role: "admin" as Actor["role"] })).rejects.toMatchObject({ name: "YearError", code: "forbidden" });
    });
  });

  it("結びついているチームの年度がアーカイブ済みなら、その年度は当年度でないので unlinked", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9908);
      // 当年度が空にならないよう、より古い未アーカイブの年度を足す（空の DB でも、手元の DB と同じ結果にするため）。
      await setupFiscalYear(db, teacher, { year: 9800, classNames: ["IG20"] });
      expect((await getOwnTeam(db, s.actor)).kind).toBe("member");
      await setYearArchived(db, teacher, s.fiscalYearId, true);
      expect(await getOwnTeam(db, s.actor)).toEqual({ kind: "unlinked" });
    });
  });

  it("未アーカイブの年度が 1 つも無いときは、生徒に no_current_year を返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9909);
      await db.fiscalYear.updateMany({ data: { isArchived: true } });
      expect(await getOwnTeam(db, s.actor)).toEqual({ kind: "no_current_year" });
    });
  });
});
