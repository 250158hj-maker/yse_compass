// 概要の画像の規則の値（06-data.md 6-3 summary_images・open-questions.md H-52・H-53）。
// 画面（SC-10）とデータ層が同じ値を見るために、依存の無いこのファイルに置く（sharp を読み込む summary-image.ts とは分ける）。
// **どの値も、H-53 ①（枚数と枠）・④（形式・容量・縮小）が未決の間の、06 の主担当（蒲山）の仮置き**で、決定ではない。決着したら、ここだけを直す。
//   枚数 2：H-53 の先行方針（0・1・2 枚）。
//   長辺 1200px の JPEG：findings.md F-17 の測定（sharp で向きを直し・長辺 1200px の JPEG にし・メタデータを消す）。「読める」の基準（約 640px か約 1280px か）は H-53 ⑤ が未決。
//   形式 JPEG・PNG だけ：HEIC は、ビルド済みの sharp では読めず、変換用の部品（heic-convert）も実機の写真で変換に失敗した例がある（F-17）ので、受けない。
//   元の画像の上限 10MB・5,000 万画素：決まった根拠は無い。サーバーのメモリを守るための仮置き。

export const MAX_SUMMARY_IMAGES = 2;

export const ACCEPTED_IMAGE_FORMATS = ["jpeg", "png"] as const;

export const MAX_IMAGE_INPUT_BYTES = 10 * 1024 * 1024;

export const MAX_IMAGE_INPUT_PIXELS = 50_000_000;

export const IMAGE_LONG_EDGE_PX = 1200;
