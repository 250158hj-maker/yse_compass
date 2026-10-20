import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { addMemberAction, createTeamAction, renameMemberAction, setLeaderAction, updateTeamAction } from "@/lib/actions/teams";
import { getTeam, type Actor } from "@/lib/data/teams";

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

// session.user.id は users.id を文字列にした値（Actor.userId と同じ形）
const teacherActor: Actor = { userId: "1", role: "teacher" };

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

  // 入口ごとに、run を通っているか（ロールを固定で渡すような取り違えが無いか）を確かめる。
  const entries: [string, (classId: number, teamId: number, memberId: number) => Promise<unknown>][] = [
    ["createTeamAction", (classId) => createTeamAction({ classId, name: "チームX", members: ["水戸"] })],
    ["updateTeamAction", (_, teamId) => updateTeamAction(teamId, { name: "改名" })],
    ["addMemberAction", (_, teamId) => addMemberAction(teamId, "追加")],
    ["renameMemberAction", (_, __, memberId) => renameMemberAction(memberId, "改名")],
    ["setLeaderAction", (_, teamId, memberId) => setLeaderAction(teamId, memberId)],
  ];

  describe.each([
    ["student", "forbidden"],
    [null, "unauthenticated"],
  ] as const)("サインインが %s のとき", (role, code) => {
    it.each(entries)("%s は %s を返し、何も書かない", async (_name, call) => {
      await inTransaction(async (db) => {
        const classId = await seedClass(db);
        const team = await db.team.create({ data: { classId, name: "既存", members: { create: [{ name: "既存メンバー" }] } } });
        const memberId = (await db.teamMember.findFirstOrThrow({ where: { teamId: team.id } })).id;
        const snapshot = async () => ({
          teams: await db.team.findMany({ where: { classId }, include: { members: true, work: true }, orderBy: { id: "asc" } }),
        });
        const before = await snapshot();

        signInAs(role);
        expect(await call(classId, team.id, memberId)).toEqual({ ok: false, code });
        expect(await snapshot()).toEqual(before);
      });
    });
  });

  it("引数の形が不正なら invalid_input で、何も書かない", async () => {
    await inTransaction(async (db) => {
      const classId = await seedClass(db);
      const team = await db.team.create({ data: { classId, name: "既存", members: { create: [{ name: "A" }, { name: "B" }] } } });
      const memberIds = (await db.teamMember.findMany({ where: { teamId: team.id }, orderBy: { id: "asc" } })).map((m) => m.id);
      await db.team.update({ where: { id: team.id }, data: { leaderMemberId: memberIds[0] } });
      signInAs("teacher");

      const bad = { ok: false, code: "invalid_input" };
      // Prisma の演算子オブジェクトなど、型の上では来ないが直接呼べば届く値
      expect(await setLeaderAction(team.id, { increment: 1 } as never)).toEqual(bad);
      // integer の範囲外の ID は、DB に渡す前に弾く（渡すと例外になり、500 になる）。
      expect(await setLeaderAction(2147483648, null)).toEqual(bad);
      expect(await setLeaderAction(1.5, memberIds[0])).toEqual(bad);
      expect(await addMemberAction(team.id, 123 as never)).toEqual(bad);
      expect(await renameMemberAction("1" as never, "x")).toEqual(bad);
      expect(await updateTeamAction(team.id, null as never)).toEqual(bad);
      expect(await updateTeamAction(team.id, { name: 1 } as never)).toEqual(bad);
      expect(await createTeamAction({ classId: "5", name: "x", members: ["a"] } as never)).toEqual(bad);
      expect(await createTeamAction({ classId, name: "x", members: "abc" } as never)).toEqual(bad);
      expect(await createTeamAction({ classId, name: "x", members: ["a"], leaderIndex: 0.5 })).toEqual(bad);
      expect(await createTeamAction(null as never)).toEqual(bad);

      expect(await db.team.findUniqueOrThrow({ where: { id: team.id } })).toMatchObject({ name: "既存", leaderMemberId: memberIds[0] });
      expect(await db.teamMember.count({ where: { teamId: team.id } })).toBe(2);
      expect(await db.team.count({ where: { classId } })).toBe(1);
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

      const team = await getTeam(db, teacherActor, teamId);
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
