import { headers } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, signOut } from "@/auth";
import { signInWithGoogleAction, signOutAction } from "@/lib/actions/auth";

// Server Action の薄い層だけを確かめる（戻り先の整え方は lib/auth/redirect.test.ts）。signIn・signOut は差し替える（本物は Google が要る）。
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

function requestHeaders(values: Record<string, string>) {
  vi.mocked(headers).mockResolvedValue(new Headers(values) as never);
}

// Auth.js の signIn・signOut は、リダイレクトを、この形の例外で行う（握りつぶすと、画面が遷移しない）。
class RedirectSignal extends Error {
  digest = "NEXT_REDIRECT";
}

beforeEach(() => {
  vi.mocked(signIn).mockReset();
  vi.mocked(signOut).mockReset();
  requestHeaders({ host: "localhost:3000" });
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

  it("Auth.js が付ける同じサイトの絶対 URL の戻り先は、道に直して呼ぶ。別のサイトのものは既定にする", async () => {
    await signInWithGoogleAction("http://localhost:3000/real/teams");
    await signInWithGoogleAction("http://evil.example/real/teams");
    expect(vi.mocked(signIn).mock.calls.map((c) => c[1])).toEqual([{ redirectTo: "/real/teams" }, { redirectTo: "/announcements" }]);
  });

  it("ヘッダーが偽装されても、Auth.js へ渡すのは常に道だけ", async () => {
    requestHeaders({ host: "localhost:3000", "x-forwarded-host": "evil.example" });
    await signInWithGoogleAction("http://evil.example/x");
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/x" });
  });

  // AUTH_URL が無いと、/api/auth/signin 経由で Auth.js が付ける絶対 URL の origin は、Host ではなくサーバーの待ち受け（例：http://localhost:3000）から組まれる。
  // ここで確かめるのは、Action が見るヘッダーから組む origin の側だけ。公開の名前が決まったら（H-23・H-28）、AUTH_URL と合わせて見直す。
  it("プロキシの後ろでは、転送されたホストとプロトコルで、同じサイトかを確かめる", async () => {
    requestHeaders({ host: "internal:3000", "x-forwarded-host": "compass.example", "x-forwarded-proto": "https" });
    await signInWithGoogleAction("https://compass.example/real/teams");
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/real/teams" });
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
