import type { NextAuthConfig, Profile } from "next-auth";
import type { PrismaClient } from "@/generated/prisma/client";

// 対応: docs/requirements.md §3-6（ロールの解決は先生ホワイトリスト方式・decisions.md 2026-09-05／2026-09-06）、
// docs/open-questions.md H-30（JWT・Adapter なし）・H-31（初回サインインで users の行を作る）・H-32（email を一意キーにする）。
// 先行方針で組んでいる。決着したら変わる箇所は、ロールをトークンに載せる jwt と、行を作る findOrCreateUser。

export type UserRole = "teacher" | "student";

type Db = Pick<PrismaClient, "user">;

// users.name は NOT NULL で、名前は OAuth のプロフィールからしか得られない（H-26）。email は一意キー（H-32）。
function readProfile(profile: Profile | undefined): { email: string; name: string } | null {
  if (!profile?.email || !profile.name) return null;
  return { email: profile.email, name: profile.name };
}

// 行が無ければ生徒として作る（H-31）。先生は、運用開始時に DB へ直接投入された role = 'teacher' の行（2026-09-06 H-11）。
// 既存の行の name・role は上書きしない（先生の登録・解除は SC-20 の操作だけが変える）。
export async function findOrCreateUser(db: Db, profile: { email: string; name: string }) {
  const user = await db.user.upsert({
    where: { email: profile.email },
    update: {},
    create: { email: profile.email, name: profile.name, role: "student" },
    select: { id: true, role: true },
  });
  return { id: user.id, role: user.role as UserRole };
}

export function createCallbacks(db: Db, schoolDomain: string): NonNullable<NextAuthConfig["callbacks"]> {
  return {
    async signIn({ profile }) {
      // hd はクライアント側の認可リクエストパラメータでもあり、Google から返る値を
      // そのまま信用しない。サーバー側でも必ず再検証する（07-interface.md 7-2）。
      const hd = (profile as { hd?: string } | undefined)?.hd;
      return hd === schoolDomain && readProfile(profile) !== null;
    },
    // account は初回サインインのときだけ入る。ロールはこのときに解決してトークンに載せる。
    // 解除の即時性は保証しない（ロールを変えても、次にサインインするまで古いロールが残る・H-30）。
    async jwt({ token, account, profile }) {
      const p = account ? readProfile(profile) : null;
      if (p) {
        const user = await findOrCreateUser(db, p);
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    // session.user.id は Auth.js の型（AdapterUser）に合わせて文字列で持つ。users.id（整数）は使う側で Number() に直す。
    async session({ session, token }) {
      session.user.id = String(token.userId);
      session.user.role = token.role as UserRole;
      return session;
    },
  };
}
