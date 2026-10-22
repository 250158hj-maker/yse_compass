import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { createCallbacks, findOrCreateUser } from "@/lib/auth/callbacks";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。接続先と、DB が無いときの扱い（ローカルは飛ばす・CI は落とす）は describeDb を参照。
// 各テストはトランザクションの中で動かし、最後に取り消すので、DB にデータは残らない（並行のテストだけは実際の行を作り、接頭辞で後始末する）。

const domain = "example.invalid";
type Db = Parameters<typeof findOrCreateUser>[0];

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
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

const profile = (email: string, name: string, extra: Record<string, unknown> = {}) =>
  ({ email, name, hd: domain, email_verified: true, ...extra }) as never;
const account = { provider: "google" } as never;

describeDb("signIn（requirements.md §3-6・07-interface.md 7-2）", () => {
  it("学校ドメインのアカウントは通る", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      expect(await cb.signIn!({ profile: profile("s@example.invalid", "生徒B") } as never)).toBe(true);
    });
  });

  it("別ドメインのアカウントは弾く", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      expect(await cb.signIn!({ profile: profile("x@gmail.com", "外部", { hd: "gmail.com" }) } as never)).toBe(false);
    });
  });

  it("hd が無いアカウントは弾く", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      expect(await cb.signIn!({ profile: { email: "y@example.invalid", name: "n", email_verified: true } } as never)).toBe(false);
    });
  });

  it("email_verified が false のアカウントは弾く", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      expect(await cb.signIn!({ profile: profile("u@example.invalid", "未確認", { email_verified: false }) } as never)).toBe(false);
    });
  });

  it("name が無いアカウントは弾く（users.name は NOT NULL）", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      expect(await cb.signIn!({ profile: { email: "z@example.invalid", hd: domain, email_verified: true } } as never)).toBe(false);
    });
  });
});

describeDb("jwt（H-30・H-31・H-32 の先行方針）", () => {
  it("初回の生徒は role=student で、users に行ができる（name はプロフィールの値）", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      const token = await cb.jwt!({ token: {}, account, profile: profile("s@example.invalid", "生徒B") } as never);
      expect(token).toMatchObject({ role: "student" });
      expect(typeof token!.userId).toBe("number");
      const row = await db.user.findUniqueOrThrow({ where: { email: "s@example.invalid" } });
      expect(row).toMatchObject({ id: token!.userId, name: "生徒B", role: "student" });
    });
  });

  it("2 回目のサインインは同じ userId で、行が増えない", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      const first = await cb.jwt!({ token: {}, account, profile: profile("s@example.invalid", "生徒B") } as never);
      const second = await cb.jwt!({ token: {}, account, profile: profile("s@example.invalid", "生徒B") } as never);
      expect(second!.userId).toBe(first!.userId);
      expect(await db.user.count({ where: { email: "s@example.invalid" } })).toBe(1);
    });
  });

  it("DB へ直接投入された先生の行は、role=teacher・同じ id で、name を上書きしない", async () => {
    await inTransaction(async (db) => {
      const seeded = await db.user.create({ data: { email: "teacher@example.invalid", name: "先生A", role: "teacher" } });
      const cb = createCallbacks(db, domain);
      const token = await cb.jwt!({ token: {}, account, profile: profile("teacher@example.invalid", "別の表示名") } as never);
      expect(token).toMatchObject({ role: "teacher", userId: seeded.id });
      expect((await db.user.findUniqueOrThrow({ where: { id: seeded.id } })).name).toBe("先生A");
    });
  });

  it("account が無い更新では、DB を引かず、トークンをそのまま返す", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      const before = await db.user.count();
      const token = await cb.jwt!({ token: { userId: 1, role: "teacher" }, profile: undefined } as never);
      expect(token).toMatchObject({ userId: 1, role: "teacher" });
      expect(await db.user.count()).toBe(before);
    });
  });

  it("userId の無い古いトークンは null を返し、サインインし直させる", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      expect(await cb.jwt!({ token: { name: "旧", email: "old@example.invalid" }, profile: undefined } as never)).toBeNull();
    });
  });
});

describeDb("session", () => {
  it("user.id は文字列、user.role が載る", async () => {
    await inTransaction(async (db) => {
      const cb = createCallbacks(db, domain);
      const session = await cb.session!({ session: { user: { name: "x" }, expires: "2099-01-01" }, token: { userId: 7, role: "teacher" } } as never);
      expect((session as { user: { id: string; role: string } }).user).toMatchObject({ id: "7", role: "teacher" });
    });
  });
});

describeDb("findOrCreateUser（同時の初回サインイン・PR #105 の水戸レビュー R-1）", () => {
  const tag = `race-${Date.now()}`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  });

  it("同じ人の初回サインインが同時に走っても、一意違反で落ちない（update を空にすると、SELECT → INSERT に展開されて落ちる）", async () => {
    for (let round = 0; round < 5; round++) {
      const email = `${tag}-${round}@example.invalid`;
      const results = await Promise.allSettled(Array.from({ length: 10 }, () => findOrCreateUser(prisma, { email, name: "race" })));
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(0);
      expect(await prisma.user.count({ where: { email } })).toBe(1);
    }
  });
});
