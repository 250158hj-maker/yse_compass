// People API のディレクトリ検索(directory.readonly)で、管理者権限なしに
// 他ユーザーの情報（カナ・入学年度などのカスタム項目を含むか）が取れるか検証する。
// 実行: node --env-file=.env scripts/directory-spike.mjs [検索クエリ]
//   検索クエリを省略すると自分自身を検索する（AUTH_GOOGLE_ID等は classroom-spike.mjs と共用）。
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

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const code = await new Promise((resolve) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    const code = url.searchParams.get("code");
    if (!code) return;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("認証できました。ターミナルに戻ってください。");
    server.close();
    resolve(code);
  }).listen(3456, () => {
    const authUrl = oauth2Client.generateAuthUrl({ access_type: "offline", scope: SCOPES });
    console.log("↓このURLをブラウザで開いてログインしてください\n");
    console.log(authUrl, "\n");
  });
});

const { tokens } = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);

const people = google.people({ version: "v1", auth: oauth2Client });

const readMask = "names,emailAddresses,organizations,phoneNumbers,userDefined,nicknames,biographies";
const query = process.argv[2];

if (query) {
  console.log(`\n===== ディレクトリ検索: "${query}" =====`);
  const res = await people.people.searchDirectoryPeople({
    query,
    readMask,
    sources: ["DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE", "DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT"],
  });
  console.log(JSON.stringify(res.data, null, 2));
} else {
  console.log("\n===== ディレクトリ一覧（自分を含む先頭ページ） =====");
  const res = await people.people.listDirectoryPeople({
    readMask,
    sources: ["DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"],
    pageSize: 5,
  });
  console.log(JSON.stringify(res.data, null, 2));
}
