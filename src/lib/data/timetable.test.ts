import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { getTimetable, setCurrentPresentation, setDisplayOrders, TimetableError } from "@/lib/data/timetable";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, type Actor } from "@/lib/data/years";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は slots.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// 一意制約 UNIQUE(event_occasion_id, display_order) は DEFERRABLE INITIALLY DEFERRED で、取り消すトランザクションの中ではコミット時の検査が走らない。
// 発表順の重なりは、データ層が先に確かめる（duplicate_order）ことをテストする。

type Db = Parameters<typeof setDisplayOrders>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Pick<PrismaClient, "user">;

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

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "TimetableError", code });
}

// 年度セットアップで 4 発表会を作り、企画の発表会に n チーム分の発表を置く。発表順は orders で渡す（null は未設定）。
async function setup(db: Db, year: number, orders: (number | null)[]) {
  const { id: yearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId: yearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId: yearId, kind: "企画" } });
  const other = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId: yearId, kind: "設計" } });
  const ps: { id: number; teamId: number }[] = [];
  const otherPs: { id: number }[] = [];
  for (const [i, displayOrder] of orders.entries()) {
    const team = await createTeam(db, teacher, { classId: klass.id, name: `チーム${i}`, members: [`メンバー${i}`] });
    // createTeam が発表を作る版でも、作らない版でも通るよう、あれば発表順を更新し、無ければ作る（#175 との組み合わせ）。
    ps.push(await db.presentation.upsert({ where: { teamId_eventOccasionId: { teamId: team.id, eventOccasionId: occasion.id } }, create: { teamId: team.id, eventOccasionId: occasion.id, displayOrder }, update: { displayOrder }, select: { id: true, teamId: true } }));
    otherPs.push(await db.presentation.upsert({ where: { teamId_eventOccasionId: { teamId: team.id, eventOccasionId: other.id } }, create: { teamId: team.id, eventOccasionId: other.id }, update: {}, select: { id: true } }));
  }
  return { yearId, occasionId: occasion.id, otherOccasionId: other.id, ps, otherPs };
}

async function orderOf(db: Db, ids: number[]) {
  const rows = await db.presentation.findMany({ where: { id: { in: ids } }, select: { id: true, displayOrder: true } });
  return ids.map((id) => rows.find((r) => r.id === id)!.displayOrder);
}

describeDb("setDisplayOrders（発表順の更新・SC-07/SC-08 共通の入口）", () => {
  it("発表中が空のあいだは、全部の発表順を入れ替えられる。未設定に戻すこともできる", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps } = await setup(db, 9901, [1, 2, 3]);
      const ids = ps.map((p) => p.id);
      expect(await setDisplayOrders(db, teacher, occasionId, [
        { presentationId: ids[0], displayOrder: 3 }, { presentationId: ids[2], displayOrder: 1 },
      ])).toEqual({ changed: 2 });
      expect(await orderOf(db, ids)).toEqual([3, 2, 1]);
      await setDisplayOrders(db, teacher, occasionId, [{ presentationId: ids[1], displayOrder: null }]);
      expect(await orderOf(db, ids)).toEqual([3, null, 1]);
    });
  });

  it("発表中の行と、それより前の行は動かせない。拒否したら何も変わらない", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps } = await setup(db, 9902, [1, 2, 3, 4]);
      const ids = ps.map((p) => p.id);
      await setCurrentPresentation(db, teacher, occasionId, ids[1]);
      // 前の行（1 番）・発表中の行（2 番）を動かす更新は拒否。
      await expectError(setDisplayOrders(db, teacher, occasionId, [{ presentationId: ids[0], displayOrder: 9 }]), "presentation_locked");
      await expectError(setDisplayOrders(db, teacher, occasionId, [{ presentationId: ids[1], displayOrder: 9 }]), "presentation_locked");
      // 動かせる行の更新と、動かせない行を含む更新を一緒に送ると、全体が拒否される。
      await expectError(setDisplayOrders(db, teacher, occasionId, [
        { presentationId: ids[2], displayOrder: 4 }, { presentationId: ids[3], displayOrder: 3 }, { presentationId: ids[0], displayOrder: null },
      ]), "presentation_locked");
      expect(await orderOf(db, ids)).toEqual([1, 2, 3, 4]);
    });
  });

  it("動かせる行の間の入れ替えは通る。動かせない行を同じ値で送っても通る（SC-08 が全行を送る場合）", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps } = await setup(db, 9903, [1, 2, 3, 4]);
      const ids = ps.map((p) => p.id);
      await setCurrentPresentation(db, teacher, occasionId, ids[1]);
      expect(await setDisplayOrders(db, teacher, occasionId, [
        { presentationId: ids[0], displayOrder: 1 }, { presentationId: ids[1], displayOrder: 2 },
        { presentationId: ids[2], displayOrder: 4 }, { presentationId: ids[3], displayOrder: 3 },
      ])).toEqual({ changed: 2 });
      expect(await orderOf(db, ids)).toEqual([1, 2, 4, 3]);
    });
  });

  it("発表順が未設定の行は「前」に入れず、動かせる。発表中の行が未設定なら、その行だけが動かせない", async () => {
    await inTransaction(async (db) => {
      // 3 番が発表中。1 番・2 番は前で動かせない。未設定の行（null）は動かせる。
      const a = await setup(db, 9904, [1, 2, 3, null]);
      const ids = a.ps.map((p) => p.id);
      await setCurrentPresentation(db, teacher, a.occasionId, ids[2]);
      await expectError(setDisplayOrders(db, teacher, a.occasionId, [{ presentationId: ids[1], displayOrder: 7 }]), "presentation_locked");
      await setDisplayOrders(db, teacher, a.occasionId, [{ presentationId: ids[3], displayOrder: 4 }]);
      expect(await orderOf(db, ids)).toEqual([1, 2, 3, 4]);

      // 発表中の行が未設定なら、ほかの行は「それより前」にならず、動かせない行はその行だけ。
      const b = await setup(db, 9905, [1, 2, null]);
      const bids = b.ps.map((p) => p.id);
      await setCurrentPresentation(db, teacher, b.occasionId, bids[2]);
      await expectError(setDisplayOrders(db, teacher, b.occasionId, [{ presentationId: bids[2], displayOrder: 3 }]), "presentation_locked");
      await setDisplayOrders(db, teacher, b.occasionId, [{ presentationId: bids[0], displayOrder: 2 }, { presentationId: bids[1], displayOrder: 1 }]);
      expect(await orderOf(db, bids)).toEqual([2, 1, null]);
    });
  });

  it("動かせる行を、発表中の行より前の番号へ入れる更新は拒否する（番号に隙間があるとき）。後ろへの移動は通る", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps } = await setup(db, 9909, [2, 3, 4, null]);
      const ids = ps.map((p) => p.id);
      await setCurrentPresentation(db, teacher, occasionId, ids[1]); // 発表順 3 が発表中。2 番は前で動かせない
      await expectError(setDisplayOrders(db, teacher, occasionId, [{ presentationId: ids[2], displayOrder: 1 }]), "presentation_locked"); // 4 番 → 1 番（前へ）
      await expectError(setDisplayOrders(db, teacher, occasionId, [{ presentationId: ids[3], displayOrder: 1 }]), "presentation_locked"); // 未設定 → 1 番（前へ）
      expect(await orderOf(db, ids)).toEqual([2, 3, 4, null]);
      // 発表中より後ろの番号へは動かせる。
      await setDisplayOrders(db, teacher, occasionId, [{ presentationId: ids[3], displayOrder: 9 }, { presentationId: ids[2], displayOrder: 5 }]);
      expect(await orderOf(db, ids)).toEqual([2, 3, 5, 9]);
    });
  });

  it("発表中を空に戻すと、全部の行が動かせる", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps } = await setup(db, 9906, [1, 2]);
      const ids = ps.map((p) => p.id);
      await setCurrentPresentation(db, teacher, occasionId, ids[1]);
      await expectError(setDisplayOrders(db, teacher, occasionId, [{ presentationId: ids[0], displayOrder: 2 }]), "presentation_locked");
      await setCurrentPresentation(db, teacher, occasionId, null);
      await setDisplayOrders(db, teacher, occasionId, [{ presentationId: ids[0], displayOrder: 5 }]);
      expect(await orderOf(db, ids)).toEqual([5, 2]);
    });
  });

  it("更新後に発表順が重なるなら duplicate_order。別の発表会の発表や無い発表は presentation_not_found", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps, otherPs } = await setup(db, 9907, [1, 2]);
      const ids = ps.map((p) => p.id);
      await expectError(setDisplayOrders(db, teacher, occasionId, [{ presentationId: ids[0], displayOrder: 2 }]), "duplicate_order");
      await expectError(setDisplayOrders(db, teacher, occasionId, [{ presentationId: otherPs[0].id, displayOrder: 9 }]), "presentation_not_found");
      await expectError(setDisplayOrders(db, teacher, occasionId, [{ presentationId: 2_147_483_647, displayOrder: 9 }]), "presentation_not_found");
      expect(await orderOf(db, ids)).toEqual([1, 2]);
    });
  });

  it("先生以外は forbidden。無い発表会は occasion_not_found。形の違う入力は invalid_input", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps } = await setup(db, 9908, [1, 2]);
      const ok = [{ presentationId: ps[0].id, displayOrder: 5 }];
      await expectError(setDisplayOrders(db, { userId: "2", role: "student" }, occasionId, ok), "forbidden");
      expect(await orderOf(db, [ps[0].id])).toEqual([1]);
      await expectError(setDisplayOrders(db, teacher, 2_147_483_647, ok), "occasion_not_found");
      for (const bad of [[], [{ presentationId: 0, displayOrder: 1 }], [{ presentationId: ps[0].id, displayOrder: 0 }],
        [{ presentationId: ps[0].id, displayOrder: 1.5 }], [{ presentationId: ps[0].id, displayOrder: 1 }, { presentationId: ps[0].id, displayOrder: 2 }]]) {
        await expectError(setDisplayOrders(db, teacher, occasionId, bad), "invalid_input");
      }
      await expectError(setDisplayOrders(db, teacher, 0, ok), "invalid_input");
    });
  });
});

describeDb("setCurrentPresentation（発表中の切り替え・SC-07）", () => {
  it("切り替え、null で空に戻せる。同じ値でも成功する", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps } = await setup(db, 9911, [1, 2]);
      expect(await setCurrentPresentation(db, teacher, occasionId, ps[0].id)).toMatchObject({ currentPresentationId: ps[0].id });
      expect(await setCurrentPresentation(db, teacher, occasionId, ps[0].id)).toMatchObject({ currentPresentationId: ps[0].id });
      expect(await setCurrentPresentation(db, teacher, occasionId, ps[1].id)).toMatchObject({ currentPresentationId: ps[1].id });
      expect(await setCurrentPresentation(db, teacher, occasionId, null)).toMatchObject({ currentPresentationId: null });
    });
  });

  it("別の発表会の発表は指せない。先生以外は forbidden。無い発表会は occasion_not_found", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps, otherPs } = await setup(db, 9912, [1]);
      await expectError(setCurrentPresentation(db, teacher, occasionId, otherPs[0].id), "presentation_not_found");
      await expectError(setCurrentPresentation(db, { userId: "2", role: "student" }, occasionId, ps[0].id), "forbidden");
      await expectError(setCurrentPresentation(db, teacher, 2_147_483_647, null), "occasion_not_found");
      await expectError(setCurrentPresentation(db, teacher, occasionId, 0), "invalid_input");
      expect((await db.eventOccasion.findUniqueOrThrow({ where: { id: occasionId } })).currentPresentationId).toBeNull();
    });
  });
});

describeDb("getTimetable（SC-07・SC-08 の表示）", () => {
  it("発表順の昇順（未設定は最後）で返し、発表中・発表済みを添える", async () => {
    await inTransaction(async (db) => {
      const { occasionId, ps } = await setup(db, 9921, [3, 1, null, 2]);
      await setCurrentPresentation(db, teacher, occasionId, ps[3].id);
      const t = await getTimetable(db, teacher, occasionId);
      expect(t.rows.map((r) => [r.presentationId, r.isCurrent, r.isDone])).toEqual([
        [ps[1].id, false, true], [ps[3].id, true, false], [ps[0].id, false, false], [ps[2].id, false, false],
      ]);
      await setCurrentPresentation(db, teacher, occasionId, null);
      expect((await getTimetable(db, teacher, occasionId)).rows.some((r) => r.isDone || r.isCurrent)).toBe(false);
    });
  });

  it("生徒には自チームを添える。アーカイブ済みの年度は生徒に「無い」と同じ。先生は読める", async () => {
    await inTransaction(async (db) => {
      const { yearId, occasionId, ps } = await setup(db, 9922, [1, 2]);
      const user = await db.user.create({ data: { email: "timetable-test@example.invalid", name: "山田", role: "student" } });
      const member = await db.teamMember.findFirstOrThrow({ where: { teamId: ps[1].teamId } });
      await db.teamMember.update({ where: { id: member.id }, data: { userId: user.id } });
      const me: Actor = { userId: String(user.id), role: "student" };
      expect((await getTimetable(db, me, occasionId)).rows.map((r) => r.isOwnTeam)).toEqual([false, true]);
      expect((await getTimetable(db, teacher, occasionId)).rows.some((r) => r.isOwnTeam)).toBe(false);

      await db.fiscalYear.update({ where: { id: yearId }, data: { isArchived: true } });
      await expect(getTimetable(db, me, occasionId)).rejects.toMatchObject({ code: "occasion_not_found" });
      expect((await getTimetable(db, teacher, occasionId)).rows).toHaveLength(2);
    });
  });

  it("先生でも生徒でもない主体は forbidden。無い発表会は occasion_not_found", async () => {
    await inTransaction(async (db) => {
      const { occasionId } = await setup(db, 9923, [1]);
      await expect(getTimetable(db, { userId: "1", role: "visitor" } as never, occasionId)).rejects.toMatchObject({ code: "forbidden" });
      await expect(getTimetable(db, teacher, 2_147_483_647)).rejects.toMatchObject({ code: "occasion_not_found" });
      await expect(getTimetable(db, teacher, 0)).rejects.toMatchObject({ code: "invalid_input" });
    });
  });
});

it("TimetableError は code を持つ", () => {
  expect(new TimetableError("presentation_locked").code).toBe("presentation_locked");
});
