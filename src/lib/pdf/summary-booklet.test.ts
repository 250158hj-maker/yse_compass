import sharp from "sharp";
import { expect, it } from "vitest";
import { composeBooklet, renderSummaryBooklet, type BookletTeam } from "@/lib/pdf/summary-booklet";

// 5-2 の仮置きの組み方が、実際に PDF になることを見る。見た目（行の切れ目・字の大きさ）は、PDF を目で見て確かめる。
// ここで確かめるのは、日本語と画像が入ること・1 ページに収まること・目次とページ番号・生成の時間（decisions.md 2026-11-06：20 チーム分で 3 秒以内）。
// ページ数は、先頭の目次（1 ページ）を含む（decisions.md 2026-11-24）。

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

it("日本語の概要が、目次と 1 チーム 1 ページの PDF になる", async () => {
  const { pdf, pageCount } = await renderSummaryBooklet([team()]);
  expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(pageCount).toBe(2);
});

it("チームの数だけページができる", async () => {
  const { pageCount } = await renderSummaryBooklet([team(), team({ teamName: "B" }), team({ teamName: "C" })]);
  expect(pageCount).toBe(4);
});

it("画像 0・1・2 枚のどれでも 1 ページに収まる", async () => {
  const a = await jpeg("#336699");
  const b = await jpeg("#993366");
  for (const images of [[], [a], [a, b]]) {
    const { pageCount } = await renderSummaryBooklet([team({ images })]);
    expect(pageCount).toBe(2);
  }
});

it("空の芯の欄と、長い英数字の連なりがあっても作れる", async () => {
  const { pageCount } = await renderSummaryBooklet([
    team({ introduction: null, workOverview: "x".repeat(400), techStack: null, closing: null, workTitle: null }),
  ]);
  expect(pageCount).toBe(2);
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
  expect(pageCount).toBe(21);
  expect(elapsed).toBeLessThan(3000);
}, 20000);

it("各チームの最初のページの番号は、目次を 1 として通しで数える", async () => {
  const { teamStartPages } = await renderSummaryBooklet([team({ teamName: "A" }), team({ teamName: "B" }), team({ teamName: "C" })]);
  expect(teamStartPages).toEqual([2, 3, 4]);
});

it("1 チームがあふれて複数ページになっても、後ろのチームの番号は続けて数える", async () => {
  const { teamStartPages, pageCount, tocNumbersDropped } = await renderSummaryBooklet([
    team({ teamName: "A" }),
    team({ teamName: "B", introduction: zen(4000) }),
    team({ teamName: "C" }),
  ]);
  const bPages = teamStartPages[2] - teamStartPages[1];
  expect(bPages).toBeGreaterThan(1);
  expect(teamStartPages[0]).toBe(2);
  // C は 1 ページなので、最後のページの番号（＝ページ数）は C の最初のページの番号になる。
  expect(pageCount).toBe(teamStartPages[2]);
  expect(tocNumbersDropped).toBe(false);
});

it("目次が複数ページになっても、番号は一致する", async () => {
  const teams = Array.from({ length: 80 }, (_, i) => team({ teamName: `チーム ${i}` }));
  const { teamStartPages, pageCount, tocNumbersDropped } = await renderSummaryBooklet(teams);
  const tocPages = teamStartPages[0] - 1;
  expect(tocPages).toBeGreaterThan(1);
  expect(pageCount).toBe(tocPages + 80);
  expect(teamStartPages[79]).toBe(tocPages + 80);
  expect(tocNumbersDropped).toBe(false);
}, 30000);

it("目次の番号が組んだ結果と一致しないときは、その生成では番号の欄を落として組み直す", async () => {
  const fakePdf = Buffer.from("%PDF-1.7 /Type /Page /Type /Page");
  const calls: (number[] | null)[] = [];
  const pass = async (toc: number[] | null) => {
    calls.push(toc);
    // 1 回目は [2, 3]、番号を入れた 2 回目は [2, 4]（目次の番号の桁が増えて、最初のページがずれた場合の想定）。
    const starts = calls.length === 1 ? [2, 3] : [2, 4];
    return { pdf: fakePdf, starts };
  };
  const result = await composeBooklet(pass, 2);
  expect(calls).toEqual([[0, 0], [2, 3], null]);
  expect(result.tocNumbersDropped).toBe(true);
});

it("目次の番号が一致したときは、2 回組んで終わる（番号の欄を落とさない）", async () => {
  const fakePdf = Buffer.from("%PDF-1.7 /Type /Page");
  const calls: (number[] | null)[] = [];
  const pass = async (toc: number[] | null) => {
    calls.push(toc);
    return { pdf: fakePdf, starts: [2, 3] };
  };
  const result = await composeBooklet(pass, 2);
  expect(calls).toEqual([[0, 0], [2, 3]]);
  expect(result.tocNumbersDropped).toBe(false);
  expect(result.teamStartPages).toEqual([2, 3]);
});

it("本文の高さは、ページ番号を足しても変わらない（1 ページに収まる境目は、足す前と同じ 2020 字）", async () => {
  // 全角の introduction だけのチーム（メンバー 1 人）で、足す前の部品を 10 字刻みで測った境目（2020 字まで 1 ページ・2030 字で 2 ページ）。
  // 境目が動くと、1 ページ集約のための字数の測定（Issue #121）をやり直すことになる（decisions.md 2026-11-24 ①）。字体や寸法を変えたら、測り直して直す。
  const only = (n: number) =>
    team({ teamName: "T", memberNames: ["a"], workTitle: "題", introduction: zen(n), workOverview: null, techStack: null, closing: null });
  const fits = async (n: number) => (await renderSummaryBooklet([only(n)])).pageCount === 2;
  expect(await fits(2020)).toBe(true);
  expect(await fits(2030)).toBe(false);
});
