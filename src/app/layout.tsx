import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YSE Compass",
  description: "卒業制作の発表会運営を支える学内向けプラットフォーム(モック画面)",
};

// ルートは html と body だけ。モックのセッション・デモ用の時計・ヘッダーは (mock)、本実装の画面は (real)、サインインは (auth) のレイアウトが持つ。
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col bg-white text-slate-900">{children}</body>
    </html>
  );
}
