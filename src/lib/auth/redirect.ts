// 対応: Issue #185（H-64）。サインイン後の戻り先を、サイト内の安全な道へ整える。
// 外から来る値（URL の callbackUrl）は信用しない。外部サイト・`//` で始まるもの・バックスラッシュ・サインインの画面や Auth.js の入口（ループ）は、既定の戻り先にする。
// Auth.js も外部への転送は止めるが、Action でも自前で確かめる（decisions.md 2026-09-06 の多層防御ではなく、入口の入力を整える層）。
// 既定の戻り先は、混在中は 1 つに固定する：鈴木さんが最初に置き換える SC-03（発表会一覧）の `/announcements`（Issue #185・水戸さんの回答。H-64 の決着の PR が決定にする）。
// ロールで分けるのは、置き換えが進んでから見直す。

export const DEFAULT_SIGN_IN_REDIRECT = "/announcements";

// 長さの上限は、URL として現実的な範囲に収めるため（巨大な値で処理を重くしない）。
const MAX_LENGTH = 2048;
const BASE = "http://redirect.invalid";

export function safeRedirectPath(input: unknown): string {
  if (typeof input !== "string" || input === "" || input.length > MAX_LENGTH) return DEFAULT_SIGN_IN_REDIRECT;
  // 先頭は `/` の 1 文字だけ。`//host`・`/\host`（ブラウザはバックスラッシュを `/` と読む）は外部を指しうる。
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/\\")) return DEFAULT_SIGN_IN_REDIRECT;

  let url: URL;
  try {
    url = new URL(input, BASE);
  } catch {
    return DEFAULT_SIGN_IN_REDIRECT;
  }
  // タブや改行は URL の解釈で取り除かれ、`/\t/host` が `//host` になりうる。解釈した結果が同じサイトの中かを確かめる。
  if (url.origin !== BASE) return DEFAULT_SIGN_IN_REDIRECT;
  // サインインの画面そのものと、Auth.js の入口（`/api/auth` 以下）へ戻すと、サインインのループになる。
  if (url.pathname === "/login" || url.pathname.startsWith("/login/") || url.pathname.startsWith("/api/auth")) return DEFAULT_SIGN_IN_REDIRECT;

  const path = url.pathname + url.search;
  // `/a/../..//host` のように、`..` を畳んだ結果が `//host`（外部を指す形）になることがある。入口の検査だけでは足りないので、整えた結果も同じ検査にかける。
  if (path.startsWith("//") || path.startsWith("/\\") || new URL(path, BASE).origin !== BASE) return DEFAULT_SIGN_IN_REDIRECT;
  return path;
}
