import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { addMemberAction, createTeamAction, renameMemberAction, setLeaderAction, updateTeamAction } from "@/lib/actions/teams";
import { getTeam } from "@/lib/data/teams";

// Server Action の薄い層だけを確かめる（規則は lib/data/teams.test.ts）。
// auth() は差し替える（本物は Google のサインインが要る）。prisma は、各テストのトランザクションに差し替えて、最後に取り消す。
const holder = vi.hoisted(() => ({ db: null as unknown as Record<string, unknown> }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => holder.db[key as string] }) }));

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

class Rollback extends Error {}

let client: PrismaClient;

beforeAll(() => {
  if (!process.env.DATABASE_URL) return;
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 10 }) });
});

afterAll(async () => {
  await client?.$disconnect();
});

beforeEach(() => {
  vi.mocked(auth).mockReset();
});

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

async function inTransaction(fn: (db: Tx) => Promise<void>) {
  try {
    await client.$transaction(async (tx) => {
      holder.db = tx as never;
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

function signInAs(role: "teacher" | "student" | null) {
  vi.mocked(auth).mockResolvedValue((role ? { user: { id: "1", role }, expires: "" } : null) as never);
}

async function seedClass(db: Tx, isArchived = false) {
  const year = await db.fiscalYear.create({ data: { year: 9001, isArchived, classes: { create: { name: "IG21" } } }, select: { classes: { select: { id: true } } } });
  return year.classes[0].id;
}

describeDb("チームの Server Action", () => {
  it("サインインしていなければ unauthenticated で、何も書かない", async () => {
    await inTransaction(async (db) => {
      const classId = await seedClass(db);
      signInAs(null);
      expect(await createTeamAction({ classId, name: "チームA", members: ["水戸"] })).toEqual({ ok: false, code: "unauthenticated" });
      expect(await db.team.count({ where: { classId } })).toBe(0);
    });
  });

  it("生徒は forbidden で、何も書かない", async () => {
    await inTransaction(async (db) => {
      const classId = await seedClass(db);
      signInAs("student");
      expect(await createTeamAction({ classId, name: "チームA", members: ["水戸"] })).toEqual({ ok: false, code: "forbidden" });
      expect(await db.team.count({ where: { classId } })).toBe(0);
    });
  });

  it("先生は作成・編集・リーダー指定ができる", async () => {
    await inTransaction(async (db) => {
      const classId = await seedClass(db);
      signInAs("teacher");

      const created = await createTeamAction({ classId, name: "チームA", members: ["水戸"] });
      if (!created.ok) throw new Error(created.code);
      const teamId = created.data.id;
      const added = await addMemberAction(teamId, "蒲山");
      if (!added.ok) throw new Error(added.code);

      expect(await setLeaderAction(teamId, added.data.id)).toEqual({ ok: true, data: undefined });
      expect(await renameMemberAction(created.data.members[0].id, "水戸 太郎")).toEqual({ ok: true, data: undefined });
      expect(await updateTeamAction(teamId, { name: "チームB", workTitle: "作品B" })).toEqual({ ok: true, data: undefined });

      const team = await getTeam(db, teamId);
      expect(team?.name).toBe("チームB");
      expect(team?.work?.title).toBe("作品B");
      expect(team?.members.map((m) => m.name)).toEqual(["水戸 太郎", "蒲山"]);
      expect(team?.leaderMemberId).toBe(added.data.id);
    });
  });

  it("データ層の TeamError は、例外ではなく code に直して返す", async () => {
    await inTransaction(async (db) => {
      const classId = await seedClass(db, true);
      signInAs("teacher");
      expect(await createTeamAction({ classId, name: "チームA", members: ["水戸"] })).toEqual({ ok: false, code: "year_archived" });
    });
  });
});
