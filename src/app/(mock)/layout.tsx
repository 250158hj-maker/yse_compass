import { SessionProvider } from "@/context/SessionContext";
import { MockChrome } from "@/components/session/MockChrome";

// モックの画面だけを包む。モックのセッション・ヘッダーは、ここから外へは出さない（#185。ルートのレイアウトにあったものを移した）。
export default function MockLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <MockChrome>{children}</MockChrome>
    </SessionProvider>
  );
}
