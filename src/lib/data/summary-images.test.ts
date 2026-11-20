import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { getSummaryImages, saveSummary, type SummaryInput } from "@/lib/data/summaries";
import { setOccasionPublished } from "@/lib/data/slots";
import { createTeam } from "@/lib/data/teams";
import { setupFiscalYear, setYearArchived, type Actor } from "@/lib/data/years";
import { IMAGE_LONG_EDGE_PX, MAX_SUMMARY_IMAGES } from "@/lib/summary-image-rules";
import { describeDb } from "@/test/describe-db";

// DB を使うテスト。流儀は summaries.test.ts と同じ（各テストはトランザクションの中で動かし、最後に取り消す）。
// 画像の取り込み（向き・縮小・形式）の細部は summary-image.test.ts が見る。ここは、保存・取得・認可・日時の動きを見る。
// 画像を保存する途中（概要の行の保存のあと・画像の入れ替えの前後）で失敗したときのロールバックは、トランザクションの中のテストでは再現できないので、確かめていない。

type Db = Parameters<typeof saveSummary>[0] & Parameters<typeof setupFiscalYear>[0] & Parameters<typeof createTeam>[0] & Parameters<typeof setOccasionPublished>[0] & Pick<PrismaClient, "user" | "schoolClass" | "$transaction">;

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
const T0 = new Date("2026-11-01T00:00:00Z");
const T1 = new Date("2026-11-02T00:00:00Z");

async function setup(db: Db, year: number) {
  const { id: fiscalYearId } = await setupFiscalYear(db, teacher, { year, classNames: ["IG21"] });
  const klass = await db.schoolClass.findFirstOrThrow({ where: { fiscalYearId } });
  const occasion = await db.eventOccasion.findFirstOrThrow({ where: { fiscalYearId, kind: "企画" } });
  const make = async (name: string) => {
    const team = await createTeam(db, teacher, { classId: klass.id, name, members: ["山田"] });
    const user = await db.user.create({ data: { email: `${name}@example.invalid`, name: "山田", role: "student" } });
    await db.teamMember.update({ where: { id: team.members[0].id }, data: { userId: user.id } });
    return { teamId: team.id, actor: { userId: String(user.id), role: "student" } as Actor };
  };
  return { fiscalYearId, occasionId: occasion.id, a: await make(`A${year}`), b: await make(`B${year}`) };
}

const TEXT: SummaryInput = { introduction: "はじめに", workOverview: "作品概要" };

// 色の違う JPEG（どの画像かを取り出したあとの色で見分けるため）。
const jpeg = (color: string, width = 300, height = 200) => sharp({ create: { width, height, channels: 3, background: color } }).jpeg().toBuffer();
const RED = "#ff0000";
const BLUE = "#0000ff";
const GREEN = "#00ff00";

// 保存された画像の先頭の 1 画素（R, G, B）。JPEG の誤差があるので、どの色に近いかだけを見る。
async function firstPixel(data: Uint8Array) {
  const { data: raw } = await sharp(data).raw().toBuffer({ resolveWithObject: true });
  return [raw[0], raw[1], raw[2]];
}

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "SubmissionError", code });
}

describeDb("saveSummary の画像（06 summary_images・H-52・H-53 の先行方針）", () => {
  it("画像つきで保存すると、取り込みの形（JPEG・長辺 1200px 以内）で、並びの順に保存される", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9851);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(RED, 3000, 2000), await jpeg(BLUE)] }, T0);
      const images = await getSummaryImages(db, s.a.actor, s.a.teamId, s.occasionId);
      expect(images.map((x) => x.displayOrder)).toEqual([1, 2]);
      const first = await sharp(images[0].imageData).metadata();
      expect([first.format, first.width, first.height]).toEqual(["jpeg", IMAGE_LONG_EDGE_PX, 800]);
      expect((await firstPixel(images[0].imageData))[0]).toBeGreaterThan(200); // 1 枚目は赤
      expect((await firstPixel(images[1].imageData))[2]).toBeGreaterThan(200); // 2 枚目は青
    });
  });

  it("images を指定しない保存は、いまの画像を変えない。空の配列は、画像をすべて消す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9852);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(RED)] }, T0);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, introduction: "直した" }, T1);
      expect(await getSummaryImages(db, s.a.actor, s.a.teamId, s.occasionId)).toHaveLength(1);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [] }, T1);
      expect(await getSummaryImages(db, s.a.actor, s.a.teamId, s.occasionId)).toHaveLength(0);
    });
  });

  it("差し替えでは、画像を入れ替える（枚数が減っても、並びの重複で失敗しない）。他のチームの画像は変えない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9853);
      await saveSummary(db, s.b.actor, s.b.teamId, s.occasionId, { ...TEXT, images: [await jpeg(GREEN)] }, T0);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(RED), await jpeg(BLUE)] }, T0);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(BLUE)] }, T1);
      const a = await getSummaryImages(db, s.a.actor, s.a.teamId, s.occasionId);
      expect(a.map((x) => x.displayOrder)).toEqual([1]);
      expect((await firstPixel(a[0].imageData))[2]).toBeGreaterThan(200);
      expect(await getSummaryImages(db, s.b.actor, s.b.teamId, s.occasionId)).toHaveLength(1);
    });
  });

  it("画像だけを変えた保存でも、最終更新日時が進む。初回提出日時は変わらない（06 summary_images の注）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9854);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(RED)] }, T0);
      const saved = await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(BLUE)] }, T1);
      expect(saved.firstSubmittedAt).toEqual(T0);
      expect(saved.lastSubmittedAt).toEqual(T1);
    });
  });

  it("枚数が上限を超える・画像でない・形式が合わないときは invalid_image で、本文も画像も保存しない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9855);
      const tooMany = await Promise.all(Array.from({ length: MAX_SUMMARY_IMAGES + 1 }, () => jpeg(RED)));
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: tooMany }, T0), "invalid_image");
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(RED), Buffer.from("画像ではない")] }, T0), "invalid_image");
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await sharp({ create: { width: 20, height: 20, channels: 3, background: RED } }).webp().toBuffer()] }, T0), "invalid_image");
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: "文字列" as never }, T0), "invalid_image");
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [[1, 2, 3]] as never }, T0), "invalid_image");
      expect(await db.summary.count({ where: { teamId: s.a.teamId } })).toBe(0);
      // すでに保存してあるときは、失敗しても、本文も画像もそのまま。
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(RED)] }, T0);
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, introduction: "直した", images: [Buffer.from("x")] }, T1), "invalid_image");
      const kept = await db.summary.findFirstOrThrow({ where: { teamId: s.a.teamId } });
      expect([kept.introduction, kept.lastSubmittedAt]).toEqual(["はじめに", T0]);
      expect(await getSummaryImages(db, s.a.actor, s.a.teamId, s.occasionId)).toHaveLength(1);
    });
  });

  it("画像だけで、本文の欄がすべて空の保存は、empty_summary（画像は本文の欄に数えない）", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9856);
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { images: [await jpeg(RED)] }, T0), "empty_summary");
      expect(await db.summary.count({ where: { teamId: s.a.teamId } })).toBe(0);
    });
  });

  it("認可・年度の確認が先：他チームの生徒・先生は、画像の検査より前に forbidden。アーカイブ済みの年度は year_archived", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9857);
      const bad = [Buffer.from("画像ではない")];
      await expectError(saveSummary(db, s.b.actor, s.a.teamId, s.occasionId, { ...TEXT, images: bad }, T0), "forbidden");
      await expectError(saveSummary(db, teacher, s.a.teamId, s.occasionId, { ...TEXT, images: bad }, T0), "forbidden");
      await setYearArchived(db, teacher, s.fiscalYearId, true);
      await expectError(saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: bad }, T0), "year_archived");
    });
  });
});

describeDb("getSummaryImages（画像の取得：概要の本文と同じ線引き）", () => {
  it("概要が無い（未提出）・画像が無いときは、空の配列", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9861);
      expect(await getSummaryImages(db, s.a.actor, s.a.teamId, s.occasionId)).toEqual([]);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, TEXT, T0);
      expect(await getSummaryImages(db, s.a.actor, s.a.teamId, s.occasionId)).toEqual([]);
    });
  });

  it("公開前の発表会は、先生と自チームの生徒だけ。他チームの生徒は forbidden。公開後は他チームの生徒にも返す", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9862);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(RED)] }, T0);
      expect(await getSummaryImages(db, teacher, s.a.teamId, s.occasionId)).toHaveLength(1);
      expect(await getSummaryImages(db, s.a.actor, s.a.teamId, s.occasionId)).toHaveLength(1);
      await expectError(getSummaryImages(db, s.b.actor, s.a.teamId, s.occasionId), "forbidden");
      await setOccasionPublished(db, teacher, s.occasionId, true);
      expect(await getSummaryImages(db, s.b.actor, s.a.teamId, s.occasionId)).toHaveLength(1);
    });
  });

  it("アーカイブ済みの年度は、生徒には無いのと同じ結果。先生には返す。他のチームの画像は混ざらない", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9863);
      await saveSummary(db, s.a.actor, s.a.teamId, s.occasionId, { ...TEXT, images: [await jpeg(RED)] }, T0);
      await saveSummary(db, s.b.actor, s.b.teamId, s.occasionId, { ...TEXT, images: [await jpeg(BLUE), await jpeg(GREEN)] }, T0);
      expect(await getSummaryImages(db, teacher, s.a.teamId, s.occasionId)).toHaveLength(1);
      await setYearArchived(db, teacher, s.fiscalYearId, true);
      await expectError(getSummaryImages(db, s.a.actor, s.a.teamId, s.occasionId), "occasion_not_found");
      expect(await getSummaryImages(db, teacher, s.b.teamId, s.occasionId)).toHaveLength(2);
    });
  });

  it("年度が違う組み合わせ・無い ID・先生でも生徒でもない主体・不正な ID を断る", async () => {
    await inTransaction(async (db) => {
      const s = await setup(db, 9864);
      const other = await setup(db, 9865);
      await expectError(getSummaryImages(db, teacher, s.a.teamId, other.occasionId), "occasion_not_found");
      await expectError(getSummaryImages(db, teacher, 2_000_000_000, s.occasionId), "occasion_not_found");
      await expectError(getSummaryImages(db, { userId: "1", role: "other" as never }, s.a.teamId, s.occasionId), "forbidden");
      await expectError(getSummaryImages(db, teacher, 0, s.occasionId), "invalid_input");
    });
  });
});
