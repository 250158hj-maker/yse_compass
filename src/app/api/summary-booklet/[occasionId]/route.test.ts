import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { GET } from "@/app/api/summary-booklet/[occasionId]/route";
import { saveSummary } from "@/lib/data/summaries";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// 生成の入口の薄い層（サインインの確認・クエリの読み取り・エラーの HTTP への直し）を確かめる。規則は lib/data/summary-booklet.test.ts、PDF の組み方は lib/pdf/summary-booklet.test.ts。
// 流儀は lib/actions/slots.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
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

function signInAs(role: "teacher" | "student" | null) {
  vi.mocked(auth).mockResolvedValue((role ? { user: { id: "1", role }, expires: "" } : null) as never);
}

const teacher: Actor = { userId: "1", role: "teacher" };

// 概要を出したチーム（画像つき）と、出していないチームを 1 つずつ作る。
async function setup(db: Tx, year: number, options: { unsubmitted: boolean }) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const submit = async (name: string) => {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    const user = await db.user.create({ data: { email: `${name}${year}@example.invalid`, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    return { teamId: team.id, actor: { userId: String(user.id), role: "student" } as Actor };
  };
  const a = await submit("A");
  const image = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#336699" } }).jpeg().toBuffer();
  await saveSummary(db, a.actor, a.teamId, occasion.id, { introduction: "はじめに", workOverview: "作品概要", images: [image] }, new Date("2026-11-01T00:00:00Z"));
  if (options.unsubmitted) await submit("B");
  return occasion.id;
}

const call = (occasionId: number | string, query = "") =>
  GET(new Request(`http://localhost/api/summary-booklet/${occasionId}${query}`), { params: Promise.resolve({ occasionId: String(occasionId) }) });

describeDb("概要集の生成の入口（GET /api/summary-booklet/[occasionId]）", () => {
  it("未サインインは 401、生徒は 403。PDF は返さない", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setup(db, 9871, { unsubmitted: false });
      signInAs(null);
      expect((await call(occasionId)).status).toBe(401);
      signInAs("student");
      const res = await call(occasionId);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ code: "forbidden" });
    });
  });

  it("先生は PDF を受け取れる。既定は別タブで開く形（inline）で、キャッシュさせない", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setup(db, 9872, { unsubmitted: false });
      signInAs("teacher");
      const res = await call(occasionId);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toBe('inline; filename="summary-booklet.pdf"');
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    });
  });

  it("?download=1 はダウンロード（attachment）になる", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setup(db, 9873, { unsubmitted: false });
      signInAs("teacher");
      const res = await call(occasionId, "?download=1");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="summary-booklet.pdf"');
    });
  });

  it("未提出のチームがあるときは、了承（?skip=1）が無いと 409。了承があれば PDF を返す", async () => {
    await inTransaction(async (db) => {
      const occasionId = await setup(db, 9874, { unsubmitted: true });
      signInAs("teacher");
      const refused = await call(occasionId);
      expect(refused.status).toBe(409);
      expect(await refused.json()).toEqual({ code: "skip_not_confirmed" });
      const ok = await call(occasionId, "?skip=1");
      expect(ok.status).toBe(200);
      expect(Buffer.from(await ok.arrayBuffer()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    });
  });

  it("発表会の id が数でない・存在しないときは、400・404", async () => {
    await inTransaction(async () => {
      signInAs("teacher");
      const invalid = await call("abc");
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toEqual({ code: "invalid_input" });
      expect((await call(2_000_000_000)).status).toBe(404);
    });
  });
});
