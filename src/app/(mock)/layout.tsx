import { SessionProvider } from "@/context/SessionContext";
import { DemoClockProvider } from "@/context/DemoClockContext";
import { TeacherDemoProvider } from "@/context/TeacherDemoContext";
import { MockChrome } from "@/components/session/MockChrome";

// モックの画面だけを包む。モックのセッション・デモ用の時計・ヘッダーは、ここから外へは出さない（#185。ルートのレイアウトにあったものを移した）。
export default function MockLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      {/* デモ用の時刻と、先生の画面が共有する状態(デモ動画の区間 A)。生徒の画面には何も描かない。 */}
      <DemoClockProvider>
        <TeacherDemoProvider>
          <MockChrome>{children}</MockChrome>
        </TeacherDemoProvider>
      </DemoClockProvider>
    </SessionProvider>
  );
}
