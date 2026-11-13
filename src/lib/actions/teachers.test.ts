import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { listTeacherRosterAction, registerTeacherAction, unregisterTeacherAction } from "@/lib/actions/teachers";
import { describeDb } from "@/test/describe-db";

// Server Action の薄い層だけを確かめる（規則は lib/data/teachers.test.ts）。流儀は actions/comments.test.ts と同じ。
const holder = vi.hoisted(() => ({ db: null as unknown as Record<string, unknown> }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => holder.db[key as string] }) }));

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

function signInAs(user: { id: string; role: "teacher" | "student" } | null) {
  vi.mocked(auth).mockResolvedValue((user ? { user, expires: "" } : null) as never);
}

async function setup(db: Tx, tag: string) {
  const make = (name: string, role: "teacher" | "student") => db.user.create({ data: { email: `${tag}-${name}@example.invalid`, name: `${tag}${name}`, role } });
  const [teacher, other, student] = await Promise.all([make("t", "teacher"), make("o", "teacher"), make("s", "student")]);
  return { teacher, other, student };
}

describeDb("先生の登録・解除の Server Action", () => {
  it("先生は一覧を読み、生徒を登録して解除できる", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, "ta1");
      signInAs({ id: String(s.teacher.id), role: "teacher" });
      expect(await registerTeacherAction(s.student.id)).toEqual({ ok: true, data: { id: s.student.id, role: "teacher" } });
      const roster = await listTeacherRosterAction();
      if (!roster.ok) throw new Error("list failed");
      expect(roster.data.teachers.find((u) => u.id === s.student.id)).toMatchObject({ canUnregister: true });
      expect(await unregisterTeacherAction(s.student.id)).toEqual({ ok: true, data: { id: s.student.id, role: "student" } });
      expect(await unregisterTeacherAction(s.teacher.id)).toEqual({ ok: false, code: "self_unregister" });
    });
  });

  it("未サインインは unauthenticated、生徒は forbidden。何も書かれない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, "ta2");
      signInAs(null);
      expect(await listTeacherRosterAction()).toEqual({ ok: false, code: "unauthenticated" });
      expect(await registerTeacherAction(s.student.id)).toEqual({ ok: false, code: "unauthenticated" });
      signInAs({ id: String(s.student.id), role: "student" });
      expect(await listTeacherRosterAction()).toEqual({ ok: false, code: "forbidden" });
      expect(await registerTeacherAction(s.student.id)).toEqual({ ok: false, code: "forbidden" });
      expect(await unregisterTeacherAction(s.other.id)).toEqual({ ok: false, code: "forbidden" });
      expect((await db.user.findUniqueOrThrow({ where: { id: s.other.id } })).role).toBe("teacher");
      expect((await db.user.findUniqueOrThrow({ where: { id: s.student.id } })).role).toBe("student");
    });
  });

  it("引数の形が不正なら invalid_input で、何も書かない。存在しない利用者は user_not_found", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, "ta3");
      signInAs({ id: String(s.teacher.id), role: "teacher" });
      const bad = { ok: false, code: "invalid_input" };
      expect(await registerTeacherAction("1" as never)).toEqual(bad);
      expect(await registerTeacherAction(0)).toEqual(bad);
      expect(await unregisterTeacherAction(1.5)).toEqual(bad);
      expect(await registerTeacherAction(2_000_000_000)).toEqual({ ok: false, code: "user_not_found" });
      expect((await db.user.findUniqueOrThrow({ where: { id: s.student.id } })).role).toBe("student");
    });
  });
});
