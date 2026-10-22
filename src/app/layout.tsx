import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/context/SessionContext";
import { DemoClockProvider } from "@/context/DemoClockContext";
import { TeacherDemoProvider } from "@/context/TeacherDemoContext";
import { MockChrome } from "@/components/session/MockChrome";

export const metadata: Metadata = {
  title: "YSE Compass",
  description: "卒業制作の発表会運営を支える学内向けプラットフォーム(モック画面)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col bg-white text-slate-900">
        <SessionProvider>
          {/* デモ用の時刻と、先生の画面が共有する状態(デモ動画の区間 A)。生徒の画面には何も描かない。 */}
          <DemoClockProvider>
            <TeacherDemoProvider>
              <MockChrome>{children}</MockChrome>
            </TeacherDemoProvider>
          </DemoClockProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
