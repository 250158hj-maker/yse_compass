import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

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
  callbacks: {
    async signIn({ profile }) {
      // hd はクライアント側の認可リクエストパラメータでもあり、Google から返る値を
      // そのまま信用しない。サーバー側でも必ず再検証する（07-interface.md 7-2）。
      const hd = (profile as { hd?: string } | undefined)?.hd;
      return hd === schoolDomain;
    },
    // ロール（先生／生徒）の解決は users テーブル（design/06-data.md 6-3）への
    // 問い合わせが要るため、Prisma セットアップ（H-17・PR #23 の06データ設計マージ）
    // が済んでから実装する。現時点では疎通確認のみが目的。
    // async session({ session }) { ... }
  },
});
