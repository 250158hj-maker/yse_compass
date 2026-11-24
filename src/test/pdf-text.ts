import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

// テスト用：PDF に印字された文字と位置を、ページごとに読む（pdfjs-dist の getTextContent。画像にはしない）。
// 座標は PDF の座標で、原点は左下（y は下から数える）。決定の確かめ（紙に出る番号）に使う。
export type PdfTextItem = { str: string; x: number; y: number };
export type PdfPageText = { width: number; height: number; items: PdfTextItem[] };

export async function readPdfText(pdf: Uint8Array): Promise<PdfPageText[]> {
  // getDocument は渡したバッファを手放すので、コピーを渡す。
  const task = getDocument({ data: new Uint8Array(pdf) });
  const doc = await task.promise;
  try {
    const pages: PdfPageText[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items
        .filter((item): item is TextItem => "str" in item && item.str.trim() !== "")
        .map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5] }));
      pages.push({ width, height, items });
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
