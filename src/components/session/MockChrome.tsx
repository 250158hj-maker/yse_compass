"use client";

import { AuthGuard } from "@/components/session/AuthGuard";
import { Header } from "@/components/layout/Header";
import { DemoClockBar } from "@/components/demo/DemoClockBar";

// モックのログインの確認・ヘッダー・デモ用の時計は、モックの画面だけのもの。
// 本実装の画面は `(real)` のレイアウトの下にあり、これを通らない（Auth.js の実ログインで守る）。
export function MockChrome({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Header />
      <DemoClockBar />
      <main className="flex-1 px-6 py-8">{children}</main>
    </AuthGuard>
  );
}
