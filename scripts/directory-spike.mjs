// People API のディレクトリ検索(directory.readonly)で、管理者権限なしに
// 他ユーザーの情報（氏名・メールアドレス・所属）が取れるか検証する。
// 実行: node --env-file=.env scripts/directory-spike.mjs [検索クエリ]
//   検索クエリを省略すると、ディレクトリの先頭5件を一覧する（他の人が含まれうる。
//   AUTH_GOOGLE_ID等は classroom-spike.mjs と共用）。
//
// 事前準備：Google Cloud Console（YSE-Compass-dev プロジェクト）で People API を
// 有効化し、OAuth 同意画面に directory.readonly を追加・保存しておくこと。
//
// 出力される個人情報は画面で確認するだけに留め、ファイル・ログ・コミットに残さない。

import { createServer } from "node:http";
import { google } from "googleapis";

const REDIRECT_URI = "http://localhost:3456/oauth2callback";
const SCOPES = ["https://www.googleapis.com/auth/directory.readonly"];

const clientId = process.env.AUTH_GOOGLE_ID;
const clientSecret = process.env.AUTH_GOOGLE_SECRET;
if (!clientId || !clientSecret) {
  console.error("AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET が .env に無い");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2({ clientId, clientSecret, redirectUri: REDIRECT_URI });

const code = await new Promise((resolve) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    const error = url.searchParams.get("error");
    if (error) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`認証できませんでした（${error}）。ターミナルを確認してください。`);
      console.error(`認可が拒否されました: ${error}`);
      server.close();
      process.exit(1);
    }
    const code = url.searchParams.get("code");
    if (!code) return;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("認証できました。ターミナルに戻ってください。");
    server.close();
    resolve(code);
  }).listen(3456, () => {
    // access_type は既定の "online" のまま（この検証はその場で終わるため、
    // リフレッシュトークンが要る "offline" にしない）
    const authUrl = oauth2Client.generateAuthUrl({ scope: SCOPES });
    console.log("↓このURLをブラウザで開いてログインしてください\n");
    console.log(authUrl, "\n");
  });
});

const { tokens } = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);

const people = google.people({ version: "v1", auth: oauth2Client });

// この検証で見るのは氏名・メールアドレス・所属のみ（カナ・入学年度は
// 正典の名簿に無い項目で、以前の「見えた」という観測も再現できず撤回済み）
const readMask = "names,emailAddresses,organizations";
const query = process.argv[2];

if (query) {
  console.log(`\n===== ディレクトリ検索: "${query}" =====`);
  const res = await people.people.searchDirectoryPeople({
    query,
    readMask,
    sources: ["DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE", "DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT"],
  });
  const found = res.data.people ?? [];
  const withEmail = found.filter((p) => p.emailAddresses?.length).length;
  console.log(`件数: ${found.length}（うちメールアドレスあり: ${withEmail}）`);
} else {
  console.log("\n===== ディレクトリ一覧（先頭5件。自分以外が含まれうる） =====");
  const res = await people.people.listDirectoryPeople({
    readMask,
    sources: ["DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"],
    pageSize: 5,
  });
  const found = res.data.people ?? [];
  const withEmail = found.filter((p) => p.emailAddresses?.length).length;
  console.log(`件数: ${found.length}（うちメールアドレスあり: ${withEmail}）`);
}
