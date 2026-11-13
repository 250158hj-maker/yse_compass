import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { listTeacherRoster, registerTeacher, unregisterTeacher } from "@/lib/data/teachers";
import type { Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は comments.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// 開発用 DB には、ほかの利用者の行が入っていることがある。一覧は、このテストで作った行だけを取り出して確かめる。

type Db = Pick<PrismaClient, "user" | "$transaction">;

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

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "TeacherError", code });
}

// 先生 2 人（a・b）と生徒 2 人（s・t）。a がサインイン中の主体。
async function setup(db: Db, tag: string) {
  const make = (name: string, role: "teacher" | "student") => db.user.create({ data: { email: `${tag}-${name}@example.invalid`, name: `${tag}${name}`, role } });
  const [a, b, s, t] = await Promise.all([make("a", "teacher"), make("b", "teacher"), make("s", "student"), make("t", "student")]);
  const actorOf = (u: { id: number }, role: "teacher" | "student"): Actor => ({ userId: String(u.id), role });
  return { a, b, s, t, actor: actorOf(a, "teacher"), studentActor: actorOf(s, "student"), actorOf };
}

describeDb("先生の一覧と候補", () => {
  it("先生は先生の一覧（登録順）と、生徒の候補を読める。自分は解除できない印が付く", async () => {
    await inTransaction(async (db) => {
      const x = await setup(db, "r1");
      const { teachers, candidates } = await listTeacherRoster(db, x.actor);
      const mine = teachers.filter((u) => u.email.startsWith("r1-"));
      expect(mine.map((u) => u.id)).toEqual([x.a.id, x.b.id]);
      expect(mine[0]).toMatchObject({ name: "r1a", email: "r1-a@example.invalid", isSelf: true, canUnregister: false });
      expect(mine[1]).toMatchObject({ isSelf: false, canUnregister: true });
      expect(candidates.filter((u) => u.email.startsWith("r1-")).map((u) => u.id).sort()).toEqual([x.s.id, x.t.id].sort());
      expect(candidates.some((u) => u.id === x.a.id || u.id === x.b.id)).toBe(false);
    });
  });

  it("生徒・ロールが不明・利用者に結びつかない主体には返さない", async () => {
    await inTransaction(async (db) => {
      const x = await setup(db, "r2");
      await expectError(listTeacherRoster(db, x.studentActor), "forbidden");
      await expectError(listTeacherRoster(db, { userId: "1", role: "other" as never }), "forbidden");
      // 先生のロールでも、ID に結びつかなければ、自分を示す印が付かないだけで読める。
      const { teachers } = await listTeacherRoster(db, { userId: "abc", role: "teacher" });
      expect(teachers.some((u) => u.isSelf)).toBe(false);
    });
  });
});

describeDb("先生の登録", () => {
  it("生徒を先生に上げると、一覧と候補が入れ替わる。もう一度呼んでも同じ", async () => {
    await inTransaction(async (db) => {
      const x = await setup(db, "g1");
      expect(await registerTeacher(db, x.actor, x.s.id)).toEqual({ id: x.s.id, role: "teacher" });
      expect(await registerTeacher(db, x.actor, x.s.id)).toEqual({ id: x.s.id, role: "teacher" });
      expect((await db.user.findUniqueOrThrow({ where: { id: x.s.id } })).role).toBe("teacher");
      const { teachers, candidates } = await listTeacherRoster(db, x.actor);
      expect(teachers.some((u) => u.id === x.s.id)).toBe(true);
      expect(candidates.some((u) => u.id === x.s.id)).toBe(false);
    });
  });

  it("生徒・存在しない利用者・不正な ID は拒む。何も書かれない", async () => {
    await inTransaction(async (db) => {
      const x = await setup(db, "g2");
      await expectError(registerTeacher(db, x.studentActor, x.t.id), "forbidden");
      await expectError(registerTeacher(db, x.actor, 2_000_000_000), "user_not_found");
      await expectError(registerTeacher(db, x.actor, 0), "invalid_input");
      await expectError(registerTeacher(db, x.actor, 1.5), "invalid_input");
      expect((await db.user.findUniqueOrThrow({ where: { id: x.t.id } })).role).toBe("student");
    });
  });
});

describeDb("先生の解除", () => {
  it("ほかの先生を解除すると、生徒に戻る（候補に出る）。もう一度呼んでも同じ", async () => {
    await inTransaction(async (db) => {
      const x = await setup(db, "u1");
      expect(await unregisterTeacher(db, x.actor, x.b.id)).toEqual({ id: x.b.id, role: "student" });
      expect(await unregisterTeacher(db, x.actor, x.b.id)).toEqual({ id: x.b.id, role: "student" });
      const { teachers, candidates } = await listTeacherRoster(db, x.actor);
      expect(teachers.some((u) => u.id === x.b.id)).toBe(false);
      expect(candidates.some((u) => u.id === x.b.id)).toBe(true);
    });
  });

  it("自分自身は解除できない（先生が 1 人でも空にならない）。何も書かれない", async () => {
    await inTransaction(async (db) => {
      const x = await setup(db, "u2");
      await expectError(unregisterTeacher(db, x.actor, x.a.id), "self_unregister");
      expect((await db.user.findUniqueOrThrow({ where: { id: x.a.id } })).role).toBe("teacher");
    });
  });

  it("生徒・存在しない利用者・不正な ID は拒む。生徒の行は変わらない", async () => {
    await inTransaction(async (db) => {
      const x = await setup(db, "u3");
      await expectError(unregisterTeacher(db, x.studentActor, x.b.id), "forbidden");
      await expectError(unregisterTeacher(db, x.actor, 2_000_000_000), "user_not_found");
      await expectError(unregisterTeacher(db, x.actor, -1), "invalid_input");
      expect(await unregisterTeacher(db, x.actor, x.s.id)).toEqual({ id: x.s.id, role: "student" });
      expect((await db.user.findUniqueOrThrow({ where: { id: x.b.id } })).role).toBe("teacher");
    });
  });
});
