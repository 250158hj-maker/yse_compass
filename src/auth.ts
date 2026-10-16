import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createCallbacks } from "@/lib/auth/callbacks";
import { prisma } from "@/lib/prisma";

// 対応: docs/design/07-interface.md 7-2（ロール解決）／docs/requirements.md §5・§3-6
// 前提: サインインできるのは学校 Workspace ドメインのアカウントのみ（requirements.md §1-1・§5）。
// 崩れるとこの実装ごと成立しない。

const schoolDomain = process.env.SCHOOL_WORKSPACE_DOMAIN;

if (!schoolDomain) {
  throw new Error("SCHOOL_WORKSPACE_DOMAIN が未設定です（.env を確認）");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          // 同意画面の時点で学校ドメイン以外のアカウントを弾く（利便性のためのヒント）。
          hd: schoolDomain,
        },
      },
    }),
  ],
  callbacks: createCallbacks(prisma, schoolDomain),
});
