// ログイン画面（/login?error=…）に出す文言。Auth.js が付けるエラーのコードを、日本語の文にする。
// 対応: Issue #185（pages.error を /login にした：サインインが断られたとき、/login?error=<コード> に戻る）。
// コードは、AccessDenied（学校のドメイン以外のアカウント・確認済みでないメールなど、サーバー側が断った）が主で、
// Configuration・Verification・OAuthCallbackError ほか、知らないコードも、同じ文にまとめる。

const ACCESS_DENIED = "このアカウントではログインできません。学校の Google アカウントで、もう一度お試しください。";

// コードを問わない、ログインできなかったときの文。サインインの Action が入力の形を断ったとき（invalid_input）にも使う。
export const LOGIN_FAILED_MESSAGE = "ログインできませんでした。もう一度お試しください。";

// error の値（URL の ?error=）から文を返す。error が無ければ null（案内は出さない）。
export function loginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return code === "AccessDenied" ? ACCESS_DENIED : LOGIN_FAILED_MESSAGE;
}
