import sharp from "sharp";
import { expect, it } from "vitest";
import { renderSummaryBooklet, type BookletTeam } from "@/lib/pdf/summary-booklet";

// 5-2 の仮置きの組み方が、実際に PDF になることを見る。見た目（行の切れ目・字の大きさ）は、PDF を目で見て確かめる。
// ここで確かめるのは、日本語と画像が入ること・1 ページに収まること・生成の時間（decisions.md 2026-11-06：20 チーム分で 3 秒以内）。

async function jpeg(color: string): Promise<Uint8Array> {
  return sharp({ create: { width: 1200, height: 675, channels: 3, background: color } }).jpeg().toBuffer();
}

// 全角の文を、指定の字数ぶん並べる。
const zen = (n: number) => "あ".repeat(n);

function team(over: Partial<BookletTeam> = {}): BookletTeam {
  return {
    className: "AI21",
    teamName: "チーム Cheers",
    memberNames: ["水戸", "蒲山", "鈴木"],
    workTitle: "卒業制作発表会の運営プラットフォーム",
    introduction: "資料の提出という行為が、提出管理・発表順整理・アーカイブを副産物として成立させる。",
    workOverview: "YSE Compass は、卒業制作発表会の運営を一か所にまとめる。",
    techStack: "TypeScript／Next.js／Prisma／PostgreSQL",
    closing: "今後は、ほかのチームにも使ってもらえるようにしたい。",
    extraSections: [],
    images: [],
    ...over,
  };
}

it("日本語の概要が 1 チーム 1 ページの PDF になる", async () => {
  const { pdf, pageCount } = await renderSummaryBooklet([team()]);
  expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(pageCount).toBe(1);
});

it("チームの数だけページができる", async () => {
  const { pageCount } = await renderSummaryBooklet([team(), team({ teamName: "B" }), team({ teamName: "C" })]);
  expect(pageCount).toBe(3);
});

it("画像 0・1・2 枚のどれでも 1 ページに収まる", async () => {
  const a = await jpeg("#336699");
  const b = await jpeg("#993366");
  for (const images of [[], [a], [a, b]]) {
    const { pageCount } = await renderSummaryBooklet([team({ images })]);
    expect(pageCount).toBe(1);
  }
});

it("空の芯の欄と、長い英数字の連なりがあっても作れる", async () => {
  const { pageCount } = await renderSummaryBooklet([
    team({ introduction: null, workOverview: "x".repeat(400), techStack: null, closing: null, workTitle: null }),
  ]);
  expect(pageCount).toBe(1);
});

it("字数があふれたときは、そのチームが複数ページになる（収める保証はしない）", async () => {
  const { pageCount } = await renderSummaryBooklet([team({ introduction: zen(4000) })]);
  expect(pageCount).toBeGreaterThan(1);
});

it("末尾近くの 1 バイトだけが違う画像も、チームごとに別の画像として入る", async () => {
  const base = await jpeg("#336699");
  // 0x80 以上は UTF-8 として不正な並びになり、Buffer.toString() では同じ文字（U+FFFD）にまとまる。
  const images = Array.from({ length: 5 }, (_, i) => {
    const copy = Buffer.from(base);
    copy[copy.length - 10] = 0x80 + i;
    return copy;
  });
  const { pdf } = await renderSummaryBooklet(images.map((image, i) => team({ teamName: `T${i}`, images: [image] })));
  expect(pdf.toString("latin1").match(/\/Subtype\s*\/Image/g)).toHaveLength(5);
});

it("20 チーム分の最悪ケース（全欄が上限近く・画像 2 枚・自由な欄 2 件）を 3 秒以内に作る", async () => {
  const a = await jpeg("#336699");
  const b = await jpeg("#993366");
  const worst = (i: number) =>
    team({
      teamName: `チーム ${i}`,
      introduction: zen(150),
      workOverview: zen(150),
      techStack: zen(150),
      closing: zen(150),
      extraSections: [
        { heading: "機能一覧", body: zen(150) },
        { heading: "画面の構成", body: zen(150) },
      ],
      images: [a, b],
    });
  const started = performance.now();
  const { pageCount } = await renderSummaryBooklet(Array.from({ length: 20 }, (_, i) => worst(i)));
  const elapsed = performance.now() - started;
  console.log(`20 チーム分：${Math.round(elapsed)}ms・${pageCount} ページ`);
  expect(pageCount).toBe(20);
  expect(elapsed).toBeLessThan(3000);
}, 20000);
