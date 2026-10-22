import { describe } from "vitest";

// DB を使うテストの describe。接続先は DATABASE_URL（ローカルは .env・CI は test ジョブの Postgres）。
// DATABASE_URL が無い環境（DB を立てていないローカル）では飛ばす。
// ただし CI では飛ばさずに落とす。飛ばすと、ci.yml の env が消える・名前が変わるなどしたときに、
// DB のテストが 1 件も走らないまま test ジョブが緑になる（PR #116 の水戸レビュー R-1）。
// このモジュールを読み込んだテストファイルが、読み込みの時点で失敗する。
if (process.env.CI && !process.env.DATABASE_URL) {
  throw new Error("CI では DATABASE_URL が要る（DB を使うテストを飛ばさないため）");
}

export const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
