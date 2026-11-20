import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizeSummaryImage } from "@/lib/data/summary-image";
import { IMAGE_LONG_EDGE_PX, MAX_IMAGE_INPUT_BYTES, MAX_IMAGE_INPUT_PIXELS } from "@/lib/summary-image-rules";

// DB を使わないテスト。画像は sharp で作る（実機の写真ではない：向きの印と透過の扱いは、作った画像で確かめる）。

const solid = (width: number, height: number, channels: 3 | 4 = 3, background = "#336699") => sharp({ create: { width, height, channels, background } });

describe("normalizeSummaryImage（取り込み時の正規化：JPEG・PNG だけ・長辺 1200px の JPEG にする）", () => {
  it("大きい JPEG は、長辺が 1200px の JPEG になる（縦横比は保つ）", async () => {
    const out = await normalizeSummaryImage(await solid(3000, 2000).jpeg().toBuffer());
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect([meta.width, meta.height]).toEqual([IMAGE_LONG_EDGE_PX, 800]);
  });

  it("小さい画像は、拡大しない", async () => {
    const out = await normalizeSummaryImage(await solid(400, 300).jpeg().toBuffer());
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([400, 300]);
  });

  it("PNG も受け、JPEG にする。透過の部分は白で塗る（黒にならない）", async () => {
    const png = await solid(200, 100, 4, { r: 0, g: 0, b: 0, alpha: 0 } as never).png().toBuffer();
    const out = await normalizeSummaryImage(png);
    expect((await sharp(out).metadata()).format).toBe("jpeg");
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    // 全面が透明だった画像の、先頭の 1 画素。JPEG の誤差を見込んで、白に近いことを確かめる。
    expect(data[0]).toBeGreaterThan(240);
    expect(data[1]).toBeGreaterThan(240);
    expect(data[2]).toBeGreaterThan(240);
  });

  it("向きの印（EXIF）に従って回転し、出力にはメタデータを残さない", async () => {
    // 横 200×縦 100 の画像に、「右に 90 度回して表示する」印（6）を付ける。回したあとは、横 100×縦 200 になる。
    const withOrientation = await solid(200, 100).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    expect((await sharp(withOrientation).metadata()).orientation).toBe(6);
    const out = await normalizeSummaryImage(withOrientation);
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([100, 200]);
    expect(meta.orientation).toBeUndefined();
    expect(meta.exif).toBeUndefined();
  });

  it("JPEG・PNG 以外（WebP・GIF）と、画像でないバイト列は、invalid_image で断る", async () => {
    const webp = await solid(50, 50).webp().toBuffer();
    const gif = await solid(50, 50).gif().toBuffer();
    for (const bytes of [webp, gif, Buffer.from("画像ではない文字列"), new Uint8Array([0xff, 0xd8, 0xff])]) {
      await expect(normalizeSummaryImage(bytes)).rejects.toMatchObject({ name: "SubmissionError", code: "invalid_image" });
    }
  });

  it("空・型が違う入力は、invalid_image で断る", async () => {
    for (const bytes of [new Uint8Array(0), null, undefined, "文字列", 123, {}] as unknown[]) {
      await expect(normalizeSummaryImage(bytes as never)).rejects.toMatchObject({ code: "invalid_image" });
    }
  });

  it("元の画像の容量が上限（10MB）を超えたら、断る。上限ちょうどは読む", async () => {
    // 読める JPEG の後ろに 0 を足して、容量だけを変える（JPEG は終端のあとのバイトを無視するので、中身は同じ画像のまま。容量の検査だけが結果を分ける）。
    const jpeg = await solid(100, 100).jpeg().toBuffer();
    const padded = (size: number) => Buffer.concat([jpeg, Buffer.alloc(size - jpeg.length)]);
    await expect(normalizeSummaryImage(padded(MAX_IMAGE_INPUT_BYTES))).resolves.toBeInstanceOf(Buffer);
    await expect(normalizeSummaryImage(padded(MAX_IMAGE_INPUT_BYTES + 1))).rejects.toMatchObject({ code: "invalid_image" });
  });

  it("画素数が上限（5,000 万画素）を超える画像は、デコードせずに断る", async () => {
    // 単色の PNG は、画素数が大きくても容量が小さい（圧縮が効く）。展開すると大量のメモリを使う画像を、容量の検査だけでは止められないための検査。
    const side = Math.ceil(Math.sqrt(MAX_IMAGE_INPUT_PIXELS)) + 10;
    const big = await solid(side, side).png({ compressionLevel: 9 }).toBuffer();
    expect(big.length).toBeLessThan(MAX_IMAGE_INPUT_BYTES);
    await expect(normalizeSummaryImage(big)).rejects.toMatchObject({ code: "invalid_image" });
  }, 30_000);
});
