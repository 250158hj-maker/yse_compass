// 開発用 DB に、画面の確認に要る最小のデータを入れる（何度流しても同じ結果になる）。
// 実行: node --env-file=.env scripts/seed-dev.mjs   （または pnpm db:seed）
//
// 入れるもの:
//   - 年度 2026（進行中）と、そのクラス 5 つ（AI21・BD21・GS21・IG21・IG22。ヒヤリング 2026-08-18 の回答）
//   - 年度 2025（アーカイブ済み）とクラス 1 つ。「アーカイブ済みの年度には作成できない」(H-55) の確認用
//   - 先生ロールの利用者 1 人: DEV_TEACHER_EMAIL のアドレス（Google のサインインが返す表記と大文字小文字まで一致させる）
// 先生は運用開始時に DB へ直接投入する行（decisions.md 2026-09-06 H-11）。ここではその開発用の代わり。
// email は公開リポジトリに書けないので、自分の .env（コミットしない）に DEV_TEACHER_EMAIL として置く。
//
// 年度セットアップ（発表会・資料枠・発表の生成。3.2.1）はここでは入れない。
// ローカルの DB 以外には流さない（先生ロールを書き込むため）。

import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
const teacherEmail = process.env.DEV_TEACHER_EMAIL;
const teacherName = process.env.DEV_TEACHER_NAME ?? "開発用の先生";

if (!databaseUrl) {
  console.error("DATABASE_URL が無い（.env を確認）");
  process.exit(1);
}
if (!teacherEmail) {
  console.error("DEV_TEACHER_EMAIL が無い。先生としてサインインするアドレスを .env に書く");
  process.exit(1);
}
const { hostname } = new URL(databaseUrl);
if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  console.error(`接続先が localhost ではない（${hostname}）。開発用のデータは、ローカルの DB にだけ入れる`);
  process.exit(1);
}

const years = [
  { year: 2026, isArchived: false, classes: ["AI21", "BD21", "GS21", "IG21", "IG22"] },
  { year: 2025, isArchived: true, classes: ["IG21"] },
];

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("BEGIN");
  for (const y of years) {
    // 同じ値で更新すると、行があっても id が返る（DO NOTHING だと返らない）。is_archived は流すたびに元に戻る。
    const { rows } = await client.query(
      `INSERT INTO fiscal_years (year, is_archived) VALUES ($1, $2)
       ON CONFLICT (year) DO UPDATE SET is_archived = EXCLUDED.is_archived RETURNING id`,
      [y.year, y.isArchived],
    );
    for (const name of y.classes) {
      await client.query(
        "INSERT INTO classes (fiscal_year_id, name) VALUES ($1, $2) ON CONFLICT (fiscal_year_id, name) DO NOTHING",
        [rows[0].id, name],
      );
    }
  }
  // 既にサインイン済みで生徒の行ができていても、先生にする。名前は既存の行を上書きしない。
  await client.query(
    `INSERT INTO users (email, name, role) VALUES ($1, $2, 'teacher')
     ON CONFLICT (email) DO UPDATE SET role = 'teacher'`,
    [teacherEmail, teacherName],
  );
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}

console.log(`入れた: 年度 ${years.map((y) => y.year).join("・")}、クラス ${years.reduce((n, y) => n + y.classes.length, 0)} 件、先生 1 人`);
