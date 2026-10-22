"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/session/AuthGuard";
import { Header } from "@/components/layout/Header";
import { DemoClockBar } from "@/components/demo/DemoClockBar";

// モックのログインの確認・ヘッダー・デモ用の時計は、モックの画面だけのもの。
// 本実装の画面（/real 以下・仮の置き場所。P-1 の Ph.3 分が決まったら移す）は Auth.js の実ログインで守るので、これらで包まない。
export function MockChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/real")) {
    return <main className="flex-1 px-6 py-8">{children}</main>;
  }
  return (
    <AuthGuard>
      <Header />
      <DemoClockBar />
      <main className="flex-1 px-6 py-8">{children}</main>
    </AuthGuard>
  );
}
