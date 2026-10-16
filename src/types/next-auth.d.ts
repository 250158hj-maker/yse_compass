import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/auth/callbacks";

declare module "next-auth" {
  interface Session {
    // id は users.id を文字列にしたもの（Auth.js の型に合わせる）
    user: { id: string; role: UserRole } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    role?: UserRole;
  }
}
