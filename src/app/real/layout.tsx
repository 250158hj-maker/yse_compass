import Link from "next/link";
import { auth, signOut } from "@/auth";

// 本実装の画面の仮の置き場所（/real）。モックの URL と並べて動かすための暫定で、
// P-1 の Ph.3 分（モックと本実装の併存）が決まったら、正しい場所へ移す。
export default async function RealLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <span>
          <Link href="/real/teams" className="font-medium underline">
            YSE Compass 実装版（仮）
          </Link>
          　— 開発中の画面です。モックの画面とは別の URL にあります。
        </span>
        {session?.user && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/real/teams" });
            }}
            className="flex items-center gap-3"
          >
            <span>
              {session.user.name}（{session.user.role === "teacher" ? "先生" : "生徒"}）
            </span>
            <button className="underline" type="submit">
              サインアウト
            </button>
          </form>
        )}
      </div>
      {children}
    </div>
  );
}
