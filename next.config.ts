import type { NextConfig } from "next";
import { MAX_IMAGE_INPUT_BYTES, MAX_SUMMARY_IMAGES } from "./src/lib/summary-image-rules";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // Server Action の本文の既定の上限は 1MB（findings.md F-17）。概要の画像（元の画像 1 枚 10MB × 最大 2 枚）を受けるため、その合計に 1MB の余裕を足した値にする。
    // **この上限は、すべての Server Action に効く**（概要の画像の Action だけには絞れない）。値の根拠は summary-image-rules.ts と同じ仮置き（H-53 ④ が未決）。
    serverActions: { bodySizeLimit: `${(MAX_SUMMARY_IMAGES * MAX_IMAGE_INPUT_BYTES) / 1024 / 1024 + 1}mb` },
  },
};

export default nextConfig;
