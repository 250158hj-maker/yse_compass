import { SessionProvider } from "@/context/SessionContext";

// サインインの画面だけを包む（#185）。ヘッダーとデモ用の時計は付けない。
// いまの /login はモックの人物ログインで、モックのセッションに書き込むので、Provider だけ入れている（案 1）。
// 人物ログインを残すかは未決（#184）。置き換えたら、この Provider は外せる。
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <main className="flex-1 px-6 py-8">{children}</main>
    </SessionProvider>
  );
}
