import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, signOut } from "@/auth";
import { signInWithGoogleAction, signOutAction } from "@/lib/actions/auth";

// Server Action の薄い層だけを確かめる（戻り先の整え方は lib/auth/redirect.test.ts）。signIn・signOut は差し替える（本物は Google が要る）。
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));

// Auth.js の signIn・signOut は、リダイレクトを、この形の例外で行う（握りつぶすと、画面が遷移しない）。
class RedirectSignal extends Error {
  digest = "NEXT_REDIRECT";
}

beforeEach(() => {
  vi.mocked(signIn).mockReset();
  vi.mocked(signOut).mockReset();
});

describe("signInWithGoogleAction", () => {
  it("Google のサインインを、整えた戻り先で呼ぶ", async () => {
    expect(await signInWithGoogleAction("/real/teams")).toEqual({ ok: true });
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/real/teams" });
  });

  it("戻り先が空・外部・ループなら、既定の戻り先で呼ぶ", async () => {
    await signInWithGoogleAction(null);
    await signInWithGoogleAction(undefined);
    await signInWithGoogleAction("https://evil.example/");
    await signInWithGoogleAction("/login");
    for (const call of vi.mocked(signIn).mock.calls) expect(call).toEqual(["google", { redirectTo: "/announcements" }]);
    expect(signIn).toHaveBeenCalledTimes(4);
  });

  it("引数の形が違う（文字列でも null でもない）なら invalid_input で、サインインを呼ばない", async () => {
    expect(await signInWithGoogleAction(123 as never)).toEqual({ ok: false, code: "invalid_input" });
    expect(await signInWithGoogleAction({} as never)).toEqual({ ok: false, code: "invalid_input" });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("サインインが出すリダイレクトの例外を、握りつぶさない", async () => {
    vi.mocked(signIn).mockRejectedValue(new RedirectSignal("NEXT_REDIRECT"));
    await expect(signInWithGoogleAction("/real/teams")).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
  });
});

describe("signOutAction", () => {
  it("サインアウトして、自前のログイン画面へ戻す", async () => {
    expect(await signOutAction()).toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });

  it("リダイレクトの例外を、握りつぶさない", async () => {
    vi.mocked(signOut).mockRejectedValue(new RedirectSignal("NEXT_REDIRECT"));
    await expect(signOutAction()).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
  });
});
