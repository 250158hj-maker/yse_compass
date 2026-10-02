// Google Classroom API 技術検証（spike/classroom-api-role-roster）
// 実行: node --env-file=.env scripts/classroom-spike.mjs [courseId] [userId]
//   courseId を渡すと、そのコースの名簿（②）も取得する。省略すると①ロール解決のみ。
//   userId（第2引数）を渡すと、そのユーザーの userProfiles.get も試す（courseId 指定時のみ有効）。
//
// 事前準備：
//   - Google Cloud Console（YSE-Compass-dev プロジェクト）で Classroom API を有効化しておくこと
//   - OAuth 同意画面に、下記 SCOPES を追加・保存しておくこと
//
// 認証情報は Auth.js 用の AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET を流用する
// （同じ OAuth クライアントに Classroom のスコープを追加済みの前提）。
// リダイレクト URI（http://localhost:3456/oauth2callback）は
// Google Cloud Console の「承認済みのリダイレクト URI」に事前登録が要る。
//
// 出力される名前・メールなどの個人情報は、ファイルやログに保存しない
// （画面で確認するだけに留める。記録は docs/findings.md F-10 に、件数と「メールアドレスが返ったか」だけを書く）。
//
// teacherId=me の件数は、単独ではロール解決の判定に使えない（docs/findings.md F-10 ①）。

import { createServer } from "node:http";
import { google } from "googleapis";

const REDIRECT_URI = "http://localhost:3456/oauth2callback";
const SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.profile.emails",
];

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

const classroom = google.classroom({ version: "v1", auth: oauth2Client });

async function tryCall(label, fn) {
  try {
    return await fn();
  } catch (error) {
    console.error(`${label} が失敗しました: ${error.status ?? "-"} ${error.message}`);
    return null;
  }
}

// 途中のページで失敗したら null を返す（途中までの件数を「取得できた件数」と読み違えないため）
async function listAll(label, list, extractItems) {
  const items = [];
  let pageToken;
  do {
    const res = await tryCall(label, () => list(pageToken));
    if (!res) return null;
    items.push(...(extractItems(res.data) ?? []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return items;
}

const FAILED = "取得失敗";

console.log("\n===== ①ロール解決 =====");

const asTeacher = await listAll(
  "courses.list(teacherId=me)",
  (pageToken) => classroom.courses.list({ teacherId: "me", pageToken }),
  (data) => data.courses,
);
console.log(`teacherId=me で見えるコース数: ${asTeacher?.length ?? FAILED}`);

const asStudent = await listAll(
  "courses.list(studentId=me)",
  (pageToken) => classroom.courses.list({ studentId: "me", pageToken }),
  (data) => data.courses,
);
console.log(`studentId=me で見えるコース数: ${asStudent?.length ?? FAILED}`);

console.log("\n【注意】teacherId=me の件数だけでは教師/生徒を判定できない（docs/findings.md F-10 ①）。");

console.log("\n===== 自分のプロフィール =====");
const me = await tryCall("userProfiles.get(me)", () => classroom.userProfiles.get({ userId: "me" }));
if (me) {
  console.log(`permissions: ${JSON.stringify(me.data.permissions?.map((p) => p.permission) ?? [])}`);
  console.log(`verifiedTeacher: ${me.data.verifiedTeacher ?? "(フィールド無し)"}`);
} else {
  console.log(`permissions / verifiedTeacher: ${FAILED}`);
}

const courseId = process.argv[2];
const userId = process.argv[3];

if (userId && courseId) {
  console.log(`\n===== userProfiles.get(userId=${userId}) =====`);
  const target = await tryCall(`userProfiles.get(${userId})`, () => classroom.userProfiles.get({ userId }));
  console.log(`permissions: ${target ? JSON.stringify(target.data.permissions?.map((p) => p.permission) ?? []) : FAILED}`);
}

if (courseId) {
  console.log(`\n===== ②名簿（courseId=${courseId}） =====`);

  const students = await listAll(
    "courses.students.list",
    (pageToken) => classroom.courses.students.list({ courseId, pageToken }),
    (data) => data.students,
  );
  if (students) {
    const studentsWithEmail = students.filter((s) => s.profile?.emailAddress).length;
    console.log(`生徒数: ${students.length}（うちメールアドレスあり: ${studentsWithEmail}）`);
  } else {
    console.log(`生徒数: ${FAILED}`);
  }

  const teachers = await listAll(
    "courses.teachers.list",
    (pageToken) => classroom.courses.teachers.list({ courseId, pageToken }),
    (data) => data.teachers,
  );
  if (teachers) {
    const teachersWithEmail = teachers.filter((t) => t.profile?.emailAddress).length;
    console.log(`教師数: ${teachers.length}（うちメールアドレスあり: ${teachersWithEmail}）`);
  } else {
    console.log(`教師数: ${FAILED}`);
  }
} else {
  console.log("\n(courseId 未指定のため②名簿の検証はスキップ)");
}
