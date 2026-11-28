import sharp from "sharp";
import { SubmissionError } from "@/lib/data/submissions";
import { ACCEPTED_IMAGE_FORMATS, IMAGE_JPEG_QUALITY, IMAGE_LONG_EDGE_PX, MAX_IMAGE_INPUT_BYTES, MAX_IMAGE_INPUT_PIXELS } from "@/lib/summary-image-rules";

// 対応: docs/design/06-data.md 6-3 summary_images・open-questions.md H-52・H-53・findings.md F-17。
// 概要の画像を取り込むとき、保存する形（向きを直し・長辺を縮め・メタデータを除いた JPEG）にそろえる。元の画像は保存しない。
// 受け付ける形式・容量・縮小の値は、H-53 ④ が未決の間の仮置き（summary-image-rules.ts）。
// 画像として読めないもの・受けない形式・上限を超えるものは、すべて invalid_image にする（原因を細かく分けて返さない：画面は 1 つの案内を出す）。

export async function normalizeSummaryImage(input: Uint8Array): Promise<Buffer> {
  // 中身を読む前に、型と容量を見る。Server Action は画面の型を通らずに直接呼べるため。
  if (!(input instanceof Uint8Array) || input.byteLength === 0 || input.byteLength > MAX_IMAGE_INPUT_BYTES) throw new SubmissionError("invalid_image");
  try {
    // limitInputPixels は、展開すると大量のメモリを使う画像（容量は小さいのに画素数が大きい）を、デコードの前に止める。failOn: "error" は、壊れた画像を黙って通さないため。
    const image = sharp(input, { limitInputPixels: MAX_IMAGE_INPUT_PIXELS, failOn: "error" });
    const { format } = await image.metadata();
    if (!format || !(ACCEPTED_IMAGE_FORMATS as readonly string[]).includes(format)) throw new SubmissionError("invalid_image");
    // rotate() は、向きの印（EXIF）に従って回す。メタデータは、withMetadata を呼ばないので出力に残らない。
    // flatten は、透過の部分を白で塗る（既定の黒にしない）。fit: "inside" と withoutEnlargement は、縦横比を保ち、小さい画像を拡大しない。
    return await image
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: IMAGE_LONG_EDGE_PX, height: IMAGE_LONG_EDGE_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: IMAGE_JPEG_QUALITY })
      .toBuffer();
  } catch (e) {
    if (e instanceof SubmissionError) throw e;
    throw new SubmissionError("invalid_image");
  }
}
