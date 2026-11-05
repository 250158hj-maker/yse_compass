"use server";

import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/redirect";

// 対応: Issue #185（H-64）。自前のログイン画面（/login）が呼ぶ、サインインとサインアウトの入口。薄い層にとどめる。
// 権限の判定は持たない。`hd` の付与・signIn コールバックでのサーバー側の再検証・email_verified の確認・ロールの解決は、src/auth.ts と
// lib/auth/callbacks.ts にあるまま変えない。ここは、サインインの入口と、サインイン後の戻り先の決定だけ。
// signIn・signOut は、リダイレクトを例外（NEXT_REDIRECT）で行うので、try/catch で握りつぶさない。

export type AuthActionResult = { ok: true } | { ok: false; code: "invalid_input" };

// 画面は、URL に付いてきた戻り先（callbackUrl）を、判断せずにそのまま渡す。空・外部・ループになるものは、既定の戻り先にする（lib/auth/redirect.ts）。
// 戻り先が文字列でも null でも undefined でもない（形が違う）ときだけ invalid_input を返す。Server Action は画面の型を通らずに直接呼べるため。
export async function signInWithGoogleAction(callbackUrl?: string | null): Promise<AuthActionResult> {
  if (callbackUrl !== undefined && callbackUrl !== null && typeof callbackUrl !== "string") return { ok: false, code: "invalid_input" };
  // このサイト自身の origin。Auth.js が付ける絶対 URL の戻り先を、同じサイトのものだけ受けるために使う（lib/auth/redirect.ts）。
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = host ? `${h.get("x-forwarded-proto") ?? "http"}://${host}` : undefined;
  await signIn("google", { redirectTo: safeRedirectPath(callbackUrl, origin) });
  return { ok: true };
}

// サインアウトのあとは、自前のログイン画面へ戻す。モックの Header の signOut は、localStorage の人物を消すだけで、Auth.js のセッションは終わらない。
export async function signOutAction(): Promise<AuthActionResult> {
  await signOut({ redirectTo: "/login" });
  return { ok: true };
}
