import { describe, expect, it } from "vitest";
import { DEFAULT_SIGN_IN_REDIRECT, safeRedirectPath } from "@/lib/auth/redirect";

describe("safeRedirectPath（サインイン後の戻り先）", () => {
  it("サイト内の道は、そのまま通す（検索のパラメータも残す）", () => {
    expect(safeRedirectPath("/real/teams")).toBe("/real/teams");
    expect(safeRedirectPath("/announcements/3")).toBe("/announcements/3");
    expect(safeRedirectPath("/real/teams?year=2026")).toBe("/real/teams?year=2026");
  });

  it("空・文字列でない値は、既定の戻り先にする", () => {
    for (const bad of [undefined, null, "", 123, {}, [], true]) {
      expect(safeRedirectPath(bad)).toBe(DEFAULT_SIGN_IN_REDIRECT);
    }
  });

  it("外部サイトを指すものは、既定にする（オープンリダイレクト）", () => {
    for (const bad of [
      "https://evil.example/", "http://evil.example", "//evil.example", "///evil.example", "/\\evil.example", "\\\\evil.example",
      "javascript:alert(1)", "evil.example", "real/teams", "/\t/evil.example", "/\n/evil.example", "/\r/evil.example",
      // `..` を畳んだ結果が `//host` になるもの。
      "/a/../..//evil.example", "/.//evil.example", "/./\\evil.example", "/real/..//evil.example", "/x/..//evil.example/path",
    ]) {
      expect(safeRedirectPath(bad), bad).toBe(DEFAULT_SIGN_IN_REDIRECT);
    }
  });

  it("サインインの画面と Auth.js の入口へは戻さない（ループ）", () => {
    for (const bad of ["/login", "/login?callbackUrl=%2Fx", "/login/", "/api/auth/signin", "/api/auth/callback/google"]) {
      expect(safeRedirectPath(bad), bad).toBe(DEFAULT_SIGN_IN_REDIRECT);
    }
    // 名前が似ているだけの別の道は通す。
    expect(safeRedirectPath("/loginhelp")).toBe("/loginhelp");
  });

  it("同じサイトの絶対 URL は、origin を渡したときだけ、道に直して受ける（Auth.js が付ける形）", () => {
    const origin = "http://localhost:3000";
    expect(safeRedirectPath("http://localhost:3000/real/teams", origin)).toBe("/real/teams");
    expect(safeRedirectPath("http://localhost:3000/real/teams?year=2026", origin)).toBe("/real/teams?year=2026");
    // origin が違う・無いものは、既定にする。
    expect(safeRedirectPath("http://localhost:3000/real/teams")).toBe(DEFAULT_SIGN_IN_REDIRECT);
    expect(safeRedirectPath("http://evil.example/real/teams", origin)).toBe(DEFAULT_SIGN_IN_REDIRECT);
    expect(safeRedirectPath("http://localhost:3000.evil.example/real/teams", origin)).toBe(DEFAULT_SIGN_IN_REDIRECT);
    expect(safeRedirectPath("https://localhost:3000/real/teams", origin)).toBe(DEFAULT_SIGN_IN_REDIRECT);
    // 同じ origin でも、ループになる道・外部を指す形になる道は、既定にする。
    expect(safeRedirectPath("http://localhost:3000/login", origin)).toBe(DEFAULT_SIGN_IN_REDIRECT);
    expect(safeRedirectPath("http://localhost:3000//evil.example", origin)).toBe(DEFAULT_SIGN_IN_REDIRECT);
  });

  it("サイトの根（/）は、戻り先が無いのと同じ扱い（Auth.js が戻り先なしのときに付ける値）", () => {
    expect(safeRedirectPath("/")).toBe(DEFAULT_SIGN_IN_REDIRECT);
    expect(safeRedirectPath("http://localhost:3000", "http://localhost:3000")).toBe(DEFAULT_SIGN_IN_REDIRECT);
    expect(safeRedirectPath("http://localhost:3000/", "http://localhost:3000")).toBe(DEFAULT_SIGN_IN_REDIRECT);
  });

  it("長すぎる値は、既定にする", () => {
    expect(safeRedirectPath("/" + "a".repeat(2048))).toBe(DEFAULT_SIGN_IN_REDIRECT);
  });

  it("既定の戻り先は /announcements（混在中は 1 つに固定。H-64）", () => {
    expect(DEFAULT_SIGN_IN_REDIRECT).toBe("/announcements");
  });
});
