"use client";

import { AuthGuard } from "@/components/session/AuthGuard";
import { Header } from "@/components/layout/Header";

// モックのログインの確認・ヘッダーは、モックの画面だけのもの（デモ用の時刻の帯は外した）。
// 本実装の画面は `(real)` のレイアウトの下にあり、これを通らない（Auth.js の実ログインで守る）。
export function MockChrome({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Header />
      <main className="flex-1 px-6 py-8">{children}</main>
    </AuthGuard>
  );
}
