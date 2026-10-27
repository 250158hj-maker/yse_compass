import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { requireSessionUser } from "@/lib/auth/session";

// 対応: Issue #185（H-64）。未ログインの人は、自前のログイン画面（/login）へ、戻り先つきで送る。
vi.mock("@/auth", () => ({ auth: vi.fn() }));
// redirect は、本物と同じく例外で画面を離れる（呼び出しのあとの処理は走らない）。送り先は、例外の中身で確かめる。
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

beforeEach(() => {
  vi.mocked(auth).mockReset();
});

describe("requireSessionUser", () => {
  it("未ログインなら、戻り先つきで /login へ送る", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(requireSessionUser("/real/teams")).rejects.toThrow("REDIRECT:/login?callbackUrl=%2Freal%2Fteams");
  });

  it("戻り先の特殊な文字は、URL の部品として符号化して付ける", async () => {
    vi.mocked(auth).mockResolvedValue({} as never);
    await expect(requireSessionUser("/real/teams?year=2026&x=1")).rejects.toThrow("REDIRECT:/login?callbackUrl=%2Freal%2Fteams%3Fyear%3D2026%26x%3D1");
  });

  it("サインイン済みなら、ユーザーを返す", async () => {
    const user = { id: "1", role: "teacher", name: "n" };
    vi.mocked(auth).mockResolvedValue({ user } as never);
    expect(await requireSessionUser("/real/teams")).toBe(user);
  });
});
