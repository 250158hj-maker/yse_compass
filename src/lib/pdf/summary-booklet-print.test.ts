import { expect, it } from "vitest";
import { renderSummaryBooklet, type BookletTeam } from "@/lib/pdf/summary-booklet";
import { readPdfText, type PdfPageText } from "@/test/pdf-text";

// 紙（PDF）に印字された番号を、PDF から読んで確かめる（decisions.md 2026-11-24 ①②③）。
// summary-booklet.test.ts は、数えた番号（返り値）を見る。ここは、印字された文字と位置を見る（pdfjs-dist の getTextContent）。
// 目次の行は、左の列にチーム名（x≈50）、右の端に番号。概要ページでは、チーム名は右上のメタの欄（x が大きい）にある。

const zen = (n: number) => "あ".repeat(n);

function team(over: Partial<BookletTeam> = {}): BookletTeam {
  return {
    className: "AI21",
    teamName: "チーム",
    memberNames: ["水戸", "蒲山"],
    workTitle: "作品",
    introduction: "はじめに。",
    workOverview: "概要。",
    techStack: "TypeScript",
    closing: "終わりに。",
    extraSections: [],
    images: [],
    ...over,
  };
}

const TOC_NAME_MAX_X = 100;
const isDigits = (s: string) => /^\d+$/.test(s);

// i 番目（0 始まり）のチームが、実際に始まるページ（1 始まり）。概要ページの右上のメタの欄にチーム名がある最初のページ。
function actualStart(pages: PdfPageText[], teamName: string): number {
  const index = pages.findIndex((p) => p.items.some((it) => it.str === teamName && it.x > TOC_NAME_MAX_X));
  return index + 1;
}

// 目次の行：左の列にチーム名がある行の、同じ高さの文字（チーム名・作品名・番号）。
function tocRow(pages: PdfPageText[], teamName: string) {
  for (const page of pages) {
    const name = page.items.find((it) => it.str === teamName && it.x < TOC_NAME_MAX_X);
    if (name) return page.items.filter((it) => Math.abs(it.y - name.y) < 1).sort((a, b) => a.x - b.x);
  }
  return [];
}

it("全ページの下の余白の中央に、通しの番号が数字だけで出る（目次が 1）", async () => {
  const { pdf, pageCount } = await renderSummaryBooklet([
    team({ teamName: "チームA" }),
    team({ teamName: "チームB", introduction: zen(4000) }),
    team({ teamName: "チームC" }),
  ]);
  const pages = await readPdfText(pdf);
  expect(pages).toHaveLength(pageCount);
  expect(pageCount).toBeGreaterThan(4); // 目次 1 ＋ A 1 ＋ B 2 以上 ＋ C 1
  for (const [i, page] of pages.entries()) {
    const bottom = page.items.filter((it) => it.y < 48);
    expect(bottom.map((it) => it.str)).toEqual([String(i + 1)]);
    expect(Math.abs(bottom[0].x - page.width / 2)).toBeLessThan(12);
  }
});

it("目次の番号は、各チームが実際に始まるページと一致する（目次が 2 ページ・1 チームがあふれる場合）", async () => {
  const teams = Array.from({ length: 40 }, (_, i) =>
    team({ teamName: `チーム${String(i).padStart(2, "0")}`, introduction: i === 4 ? zen(4000) : "はじめに。" }),
  );
  const { pdf, teamStartPages } = await renderSummaryBooklet(teams);
  const pages = await readPdfText(pdf);
  const tocPages = teamStartPages[0] - 1;
  expect(tocPages).toBe(2);
  for (const [i, t] of teams.entries()) {
    const printed = tocRow(pages, t.teamName).filter((it) => it.x > 400 && isDigits(it.str));
    expect(printed.map((it) => it.str)).toEqual([String(actualStart(pages, t.teamName))]);
    expect(actualStart(pages, t.teamName)).toBe(teamStartPages[i]);
  }
});

it("作品名が未設定のチームは、目次の作品名の欄を空ける（チーム名で埋めない）", async () => {
  const { pdf } = await renderSummaryBooklet([team({ teamName: "チームX", workTitle: "作品X" }), team({ teamName: "チームY", workTitle: null })]);
  const pages = await readPdfText(pdf);
  expect(tocRow(pages, "チームX").map((it) => it.str)).toEqual(["チームX", "作品X", "2"]);
  expect(tocRow(pages, "チームY").map((it) => it.str)).toEqual(["チームY", "3"]);
});
