import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 日時の整形（Intl）は実行環境のタイムゾーンで結果が変わる。テストの出力を環境によらず固定するため日本時間にそろえる。
process.env.TZ = "Asia/Tokyo";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
