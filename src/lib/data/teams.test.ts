import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { addMember, createTeam, getTeam, listClassOptions, listTeams, renameMember, setLeader, TeamError, updateTeam, type Actor } from "@/lib/data/teams";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は auth/callbacks.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// DB が失敗すると PostgreSQL はそのトランザクションを中止するので、DB のエラーを期待する検証は各テストの最後に置く。

type Db = Parameters<typeof listClassOptions>[0];

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

const teacher = { userId: "teacher-1", role: "teacher" } as const;
const student = { userId: "student-1", role: "student" } as const;

// 実際の年度と重ならない year で作る。
async function seedYear(db: Db, year: number, isArchived = false) {
  return db.fiscalYear.create({
    data: { year, isArchived, classes: { create: [{ name: "IG21" }, { name: "AI21" }] } },
    select: { id: true, classes: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
  });
}

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "TeamError", code });
}

describeDb("listClassOptions（H-54 の先行方針）", () => {
  it("未アーカイブの年度だけを返し、year が最大のものを既定にする", async () => {
    await inTransaction(async (db) => {
      const older = await seedYear(db, 9001);
      const newer = await seedYear(db, 9002);
      const archived = await seedYear(db, 9003, true);
      const { years, defaultFiscalYearId } = await listClassOptions(db, student);
      const ids = years.map((y) => y.id);
      expect(ids).toContain(older.id);
      expect(ids).toContain(newer.id);
      expect(ids).not.toContain(archived.id);
      expect(defaultFiscalYearId).toBe(newer.id);
      expect(years.find((y) => y.id === newer.id)?.classes.map((c) => c.name)).toEqual(["AI21", "IG21"]);
    });
  });
});

describeDb("読み取りの認可（H-16・H-60 の先行方針: 生徒は未アーカイブの年度だけ）", () => {
  async function seedTeams(db: Db) {
    const current = await seedYear(db, 9001);
    const old = await seedYear(db, 9002);
    const a = await createTeam(db, teacher, { classId: current.classes[0].id, name: "当年度", workTitle: "作品A", members: ["水戸"] });
    const b = await createTeam(db, teacher, { classId: old.classes[0].id, name: "過去", workTitle: "作品B", members: ["蒲山"] });
    await db.fiscalYear.update({ where: { id: old.id }, data: { isArchived: true } });
    return { current, old, a, b };
  }

  it("生徒も当年度（未アーカイブ）のチームと一覧を読める。年度の year・isArchived も返る", async () => {
    await inTransaction(async (db) => {
      const { current, a } = await seedTeams(db);
      const team = await getTeam(db, student, a.id);
      expect(team?.name).toBe("当年度");
      expect(team?.class.fiscalYear).toEqual({ year: 9001, isArchived: false });
      expect((await listTeams(db, student, current.id)).map((x) => x.name)).toEqual(["当年度"]);
    });
  });

  it("生徒はアーカイブ済みの年度のチームも一覧も読めない（無いものとして返る）", async () => {
    await inTransaction(async (db) => {
      const { old, b } = await seedTeams(db);
      expect(await getTeam(db, student, b.id)).toBeNull();
      expect(await listTeams(db, student, old.id)).toEqual([]);
    });
  });

  it("先生はアーカイブ済みの年度のチームも一覧も読める", async () => {
    await inTransaction(async (db) => {
      const { old, b } = await seedTeams(db);
      const team = await getTeam(db, teacher, b.id);
      expect(team?.name).toBe("過去");
      expect(team?.class.fiscalYear.isArchived).toBe(true);
      expect((await listTeams(db, teacher, old.id)).map((x) => x.name)).toEqual(["過去"]);
    });
  });

  it("ロールが先生でも生徒でもない主体には、3 つの読み取りとも返さない（forbidden）", async () => {
    await inTransaction(async (db) => {
      const { current, a } = await seedTeams(db);
      for (const role of [undefined, "", "admin", null]) {
        const nobody = { userId: "", role } as unknown as Actor;
        await expectError(listClassOptions(db, nobody), "forbidden");
        await expectError(listTeams(db, nobody, current.id), "forbidden");
        await expectError(getTeam(db, nobody, a.id), "forbidden");
      }
    });
  });

  it("存在しないチームは null（権限が無い場合と区別しない）", async () => {
    await inTransaction(async (db) => {
      expect(await getTeam(db, teacher, 2147483647)).toBeNull();
      expect(await getTeam(db, student, 2147483647)).toBeNull();
    });
  });
});

describeDb("createTeam", () => {
  it("チーム・作品・メンバーを同時に作り、リーダーを配列の添字で指す", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const created = await createTeam(db, teacher, {
        classId: year.classes[0].id,
        name: "チームA",
        workTitle: "作品A",
        members: ["水戸", "蒲山", "鈴木"],
        leaderIndex: 1,
      });
      const team = await getTeam(db, teacher, created.id);
      expect(team?.name).toBe("チームA");
      expect(team?.class.id).toBe(year.classes[0].id);
      expect(team?.work?.title).toBe("作品A");
      expect(team?.members.map((m) => m.name)).toEqual(["水戸", "蒲山", "鈴木"]);
      expect(team?.members.every((m) => m.userId === null)).toBe(true);
      expect(team?.leaderMemberId).toBe(team?.members[1].id);
    });
  });

  it("リーダー未指定でも作れる（H-40・NULL 可）。作品名の空は NULL にする（公開許可の必須判定をすり抜けない）", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const created = await createTeam(db, teacher, { classId: year.classes[0].id, name: "チームA", workTitle: "  ", members: ["水戸"] });
      const team = await getTeam(db, teacher, created.id);
      expect(team?.leaderMemberId).toBeNull();
      expect(team?.work?.title).toBeNull();
    });
  });

  it("同姓同名のメンバーを禁じない（H-56）。氏名の前後の空白は取る", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const created = await createTeam(db, teacher, { classId: year.classes[0].id, name: "チームA", members: [" 山田 太郎", "山田 太郎 "], leaderIndex: 1 });
      const team = await getTeam(db, teacher, created.id);
      expect(team?.members.map((m) => m.name)).toEqual(["山田 太郎", "山田 太郎"]);
      expect(team?.leaderMemberId).toBe(team?.members[1].id);
    });
  });

  it("先生以外は作れない", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      await expectError(createTeam(db, student, { classId: year.classes[0].id, name: "チームA", members: ["水戸"] }), "forbidden");
      expect(await listTeams(db, teacher, year.id)).toEqual([]);
    });
  });

  it("アーカイブ済みの年度のクラスには作れない（H-55）", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9003, true);
      await expectError(createTeam(db, teacher, { classId: year.classes[0].id, name: "チームA", members: ["水戸"] }), "year_archived");
    });
  });

  it("存在しないクラスには作れない", async () => {
    await inTransaction(async (db) => {
      await expectError(createTeam(db, teacher, { classId: 2147483647, name: "チームA", members: ["水戸"] }), "class_not_found");
    });
  });

  it("チーム名・氏名が空、リーダーの添字が範囲外なら入力エラー", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const classId = year.classes[0].id;
      await expectError(createTeam(db, teacher, { classId, name: " ", members: ["水戸"] }), "invalid_input");
      await expectError(createTeam(db, teacher, { classId, name: "A", members: ["水戸", ""] }), "invalid_input");
      await expectError(createTeam(db, teacher, { classId, name: "A", members: ["水戸"], leaderIndex: 1 }), "invalid_input");
      await expectError(createTeam(db, teacher, { classId, name: "A", members: ["水戸"], leaderIndex: -1 }), "invalid_input");
      expect(await listTeams(db, teacher, year.id)).toEqual([]);
    });
  });

  it("同じクラスに同じチーム名は作れない（別のクラスなら作れる）", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const [ai, ig] = year.classes;
      await createTeam(db, teacher, { classId: ai.id, name: "チームA", members: ["水戸"] });
      await createTeam(db, teacher, { classId: ig.id, name: "チームA", members: ["水戸"] });
      await expectError(createTeam(db, teacher, { classId: ai.id, name: "チームA", members: ["蒲山"] }), "duplicate_team_name");
    });
  });
});

describeDb("編集（H-55: 年度の状態で塞がない）", () => {
  it("アーカイブ済みの年度のチームでも、チーム名・作品名・氏名を直し、メンバーを足せる", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const created = await createTeam(db, teacher, { classId: year.classes[0].id, name: "チームA", members: ["水戸"] });
      await db.fiscalYear.update({ where: { id: year.id }, data: { isArchived: true } });

      await updateTeam(db, teacher, created.id, { name: "チームB", workTitle: "作品B" });
      await renameMember(db, teacher, created.members[0].id, "水戸 太郎");
      await addMember(db, teacher, created.id, "蒲山");

      const team = await getTeam(db, teacher, created.id);
      expect(team?.name).toBe("チームB");
      expect(team?.work?.title).toBe("作品B");
      expect(team?.members.map((m) => m.name)).toEqual(["水戸 太郎", "蒲山"]);
    });
  });

  it("作品名は null で空に戻せ、指定しなければ変わらない", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const created = await createTeam(db, teacher, { classId: year.classes[0].id, name: "チームA", workTitle: "作品A", members: ["水戸"] });
      await updateTeam(db, teacher, created.id, { name: "チームB" });
      expect((await getTeam(db, teacher, created.id))?.work?.title).toBe("作品A");
      await updateTeam(db, teacher, created.id, { workTitle: null });
      expect((await getTeam(db, teacher, created.id))?.work?.title).toBeNull();
    });
  });

  it("先生以外は編集できない", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const created = await createTeam(db, teacher, { classId: year.classes[0].id, name: "チームA", members: ["水戸"] });
      const memberId = created.members[0].id;
      await expectError(updateTeam(db, student, created.id, { name: "X" }), "forbidden");
      await expectError(addMember(db, student, created.id, "X"), "forbidden");
      await expectError(renameMember(db, student, memberId, "X"), "forbidden");
      await expectError(setLeader(db, student, created.id, memberId), "forbidden");
      const team = await getTeam(db, teacher, created.id);
      expect(team?.name).toBe("チームA");
      expect(team?.members.map((m) => m.name)).toEqual(["水戸"]);
    });
  });

  it("メンバーの氏名が空なら入力エラー（追加・名前の変更）", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const created = await createTeam(db, teacher, { classId: year.classes[0].id, name: "チームA", members: ["水戸"] });
      await expectError(addMember(db, teacher, created.id, "  "), "invalid_input");
      await expectError(renameMember(db, teacher, created.members[0].id, ""), "invalid_input");
      expect((await getTeam(db, teacher, created.id))?.members.map((m) => m.name)).toEqual(["水戸"]);
    });
  });

  it("存在しないチーム・メンバーはエラーになる", async () => {
    await inTransaction(async (db) => {
      await expectError(renameMember(db, teacher, 2147483647, "X"), "member_not_found");
    });
    await inTransaction(async (db) => {
      await expectError(updateTeam(db, teacher, 2147483647, { name: "X" }), "team_not_found");
    });
    await inTransaction(async (db) => {
      await expectError(addMember(db, teacher, 2147483647, "X"), "team_not_found");
    });
  });

  it("同じクラスの別チームと同じ名前には直せない", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const classId = year.classes[0].id;
      await createTeam(db, teacher, { classId, name: "チームA", members: ["水戸"] });
      const b = await createTeam(db, teacher, { classId, name: "チームB", members: ["蒲山"] });
      await expectError(updateTeam(db, teacher, b.id, { name: "チームA" }), "duplicate_team_name");
    });
  });
});

describeDb("setLeader（decisions.md 2026-09-22・複合外部キー）", () => {
  it("作成後にリーダーを指定・変更・解除できる", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const created = await createTeam(db, teacher, { classId: year.classes[0].id, name: "チームA", members: ["水戸", "蒲山"] });
      await setLeader(db, teacher, created.id, created.members[0].id);
      expect((await getTeam(db, teacher, created.id))?.leaderMemberId).toBe(created.members[0].id);
      await setLeader(db, teacher, created.id, created.members[1].id);
      expect((await getTeam(db, teacher, created.id))?.leaderMemberId).toBe(created.members[1].id);
      await setLeader(db, teacher, created.id, null);
      expect((await getTeam(db, teacher, created.id))?.leaderMemberId).toBeNull();
    });
  });

  it("他チームのメンバーはリーダーにできない", async () => {
    await inTransaction(async (db) => {
      const year = await seedYear(db, 9001);
      const classId = year.classes[0].id;
      const a = await createTeam(db, teacher, { classId, name: "チームA", members: ["水戸"] });
      const b = await createTeam(db, teacher, { classId, name: "チームB", members: ["蒲山"] });
      await expectError(setLeader(db, teacher, a.id, b.members[0].id), "leader_not_in_team");
    });
  });

  it("存在しないチームはエラーになる", async () => {
    await inTransaction(async (db) => {
      await expectError(setLeader(db, teacher, 2147483647, null), "team_not_found");
    });
  });
});

describe("TeamError", () => {
  it("code を持つ", () => {
    expect(new TeamError("forbidden").code).toBe("forbidden");
  });
});
