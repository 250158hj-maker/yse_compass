// Google Classroom API 技術検証（spike/classroom-api-role-roster）
// 実行: node --env-file=.env scripts/classroom-spike.mjs [courseId]
//   courseId を渡すと、そのコースの名簿（②）も取得する。省略すると①ロール解決のみ。
//
// 認証情報は Auth.js 用の AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET を流用する
// （同じ OAuth クライアントに Classroom のスコープを追加済みの前提）。
// リダイレクト URI（http://localhost:3456/oauth2callback）は
// Google Cloud Console の「承認済みのリダイレクト URI」に事前登録が要る。
//
// 出力される名前・メールなどの個人情報は、ファイルやログに保存しない
// （画面で確認するだけに留める。Linear #250-56 の注意事項）。

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

const classroom = google.classroom({ version: "v1", auth: oauth2Client });

console.log("\n===== ①ロール解決 =====");

const asTeacher = await classroom.courses.list({ teacherId: "me" });
console.log(`teacherId=me で見えるコース数: ${asTeacher.data.courses?.length ?? 0}`);
console.log(asTeacher.data.courses?.map((c) => ({ id: c.id, name: c.name })));

const asStudent = await classroom.courses.list({ studentId: "me" });
console.log(`studentId=me で見えるコース数: ${asStudent.data.courses?.length ?? 0}`);
console.log(asStudent.data.courses?.map((c) => ({ id: c.id, name: c.name })));

console.log("\n===== 自分のプロフィール =====");
const me = await classroom.userProfiles.get({ userId: "me" });
console.log(JSON.stringify(me.data, null, 2));

const userId = process.argv[3];
if (userId) {
  console.log(`\n===== userProfiles.get(userId=${userId}) =====`);
  const target = await classroom.userProfiles.get({ userId });
  console.log(JSON.stringify(target.data, null, 2));
}

const courseId = process.argv[2];
if (courseId) {
  console.log(`\n===== ②名簿（courseId=${courseId}） =====`);

  const students = await classroom.courses.students.list({ courseId });
  console.log(`生徒数: ${students.data.students?.length ?? 0}`);
  console.log(JSON.stringify(students.data.students, null, 2));

  const teachers = await classroom.courses.teachers.list({ courseId });
  console.log(`\n教師数: ${teachers.data.teachers?.length ?? 0}`);
  console.log(JSON.stringify(teachers.data.teachers, null, 2));
} else {
  console.log("\n(courseId 未指定のため②名簿の検証はスキップ)");
}
