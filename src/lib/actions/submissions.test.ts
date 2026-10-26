import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma/client";
import { getPresentationDetailAction, getSubmissionMatrixAction, listTeamSubmissionsAction, submitMaterialAction } from "@/lib/actions/submissions";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// Server Action の薄い層だけを確かめる（規則は lib/data/submissions.test.ts）。流儀は actions/slots.test.ts と同じ。
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

// 年度セットアップ → チーム 1 つ（メンバーをサインイン済みの生徒に結びつける）。提出できる枠（プレゼン資料）の id を返す。
async function setup(db: Tx, year: number) {
  const teacher = { userId: "1", role: "teacher" } as const;
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const slot = await db.materialSlot.findFirstOrThrow({ where: { eventOccasionId: occasion.id, slotType: "プレゼン資料" } });
  const team = await createTeam(db, teacher, { classId: klass.id, name: `チーム${year}`, members: ["山田"] });
  const user = await db.user.create({ data: { email: `s${year}@example.invalid`, name: "山田", role: "student" } });
  await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
  return { teamId: team.id, occasionId: occasion.id, slotId: slot.id, studentId: String(user.id) };
}

describeDb("提出の Server Action", () => {
  it("自チームの生徒は提出・差し替えでき、一覧に載る", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9921);
      signInAs({ id: s.studentId, role: "student" });
      const first = await submitMaterialAction(s.teamId, s.slotId, "https://example.invalid/a");
      expect(first).toMatchObject({ ok: true, data: { url: "https://example.invalid/a", isLate: false } });
      expect(await submitMaterialAction(s.teamId, s.slotId, "https://example.invalid/b")).toMatchObject({ ok: true, data: { url: "https://example.invalid/b" } });
      const list = await listTeamSubmissionsAction(s.teamId, s.occasionId);
      if (!list.ok) throw new Error("list failed");
      expect(list.data.find((x) => x.id === s.slotId)?.submission?.url).toBe("https://example.invalid/b");
      expect(await db.submission.count({ where: { teamId: s.teamId } })).toBe(1);
    });
  });

  it("未サインインは unauthenticated、先生は forbidden。何も書かれない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9922);
      signInAs(null);
      expect(await submitMaterialAction(s.teamId, s.slotId, "https://example.invalid/a")).toEqual({ ok: false, code: "unauthenticated" });
      expect(await listTeamSubmissionsAction(s.teamId, s.occasionId)).toEqual({ ok: false, code: "unauthenticated" });
      signInAs({ id: "1", role: "teacher" });
      expect(await submitMaterialAction(s.teamId, s.slotId, "https://example.invalid/a")).toEqual({ ok: false, code: "forbidden" });
      expect(await db.submission.count({ where: { teamId: s.teamId } })).toBe(0);
    });
  });

  it("引数の形が不正なら invalid_input で、何も書かない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9923);
      signInAs({ id: s.studentId, role: "student" });
      const bad = { ok: false, code: "invalid_input" };
      expect(await submitMaterialAction("1" as never, s.slotId, "https://example.invalid/a")).toEqual(bad);
      expect(await submitMaterialAction(s.teamId, 0, "https://example.invalid/a")).toEqual(bad);
      expect(await submitMaterialAction(s.teamId, s.slotId, null as never)).toEqual(bad);
      expect(await listTeamSubmissionsAction(1.5, s.occasionId)).toEqual(bad);
      expect(await db.submission.count({ where: { teamId: s.teamId } })).toBe(0);
    });
  });

  it("規則違反はデータ層のコードで返る（URL の形式・概要枠）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9924);
      signInAs({ id: s.studentId, role: "student" });
      expect(await submitMaterialAction(s.teamId, s.slotId, "javascript:alert(1)")).toEqual({ ok: false, code: "invalid_input" });
      const summary = await db.materialSlot.findFirstOrThrow({ where: { eventOccasionId: s.occasionId, slotType: "概要" } });
      expect(await submitMaterialAction(s.teamId, summary.id, "https://example.invalid/a")).toEqual({ ok: false, code: "summary_slot" });
    });
  });

  it("提出状況一覧は先生だけが読める。生徒・未サインイン・不正な引数は拒む", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9925);
      signInAs({ id: s.studentId, role: "student" });
      await submitMaterialAction(s.teamId, s.slotId, "https://example.invalid/a");
      expect(await getSubmissionMatrixAction(s.occasionId)).toEqual({ ok: false, code: "forbidden" });
      signInAs(null);
      expect(await getSubmissionMatrixAction(s.occasionId)).toEqual({ ok: false, code: "unauthenticated" });
      signInAs({ id: "1", role: "teacher" });
      expect(await getSubmissionMatrixAction("1" as never)).toEqual({ ok: false, code: "invalid_input" });
      const matrix = await getSubmissionMatrixAction(s.occasionId);
      if (!matrix.ok) throw new Error("matrix failed");
      expect(matrix.data.rows[0].cells.find((c) => c.slotId === s.slotId)).toMatchObject({ status: "submitted", url: "https://example.invalid/a" });
    });
  });

  it("発表詳細：未サインインは unauthenticated、引数が不正なら invalid_input。公開前に別の生徒は forbidden", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9924);
      const stranger = await db.user.create({ data: { email: "s9924x@example.invalid", name: "他", role: "student" } });
      signInAs(null);
      expect(await getPresentationDetailAction(s.teamId, s.occasionId)).toEqual({ ok: false, code: "unauthenticated" });
      signInAs({ id: s.studentId, role: "student" });
      expect(await getPresentationDetailAction("1" as never, s.occasionId)).toEqual({ ok: false, code: "invalid_input" });
      expect(await getPresentationDetailAction(s.teamId, s.occasionId)).toMatchObject({ ok: true, data: { team: { id: s.teamId } } });
      signInAs({ id: String(stranger.id), role: "student" });
      expect(await getPresentationDetailAction(s.teamId, s.occasionId)).toEqual({ ok: false, code: "forbidden" });
      await db.eventOccasion.update({ where: { id: s.occasionId }, data: { isPublished: true } });
      expect(await getPresentationDetailAction(s.teamId, s.occasionId)).toMatchObject({ ok: true });
    });
  });
});
