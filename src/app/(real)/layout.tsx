import { auth } from "@/auth";
import { RealHeader, type HeaderLink } from "@/components/layout/RealHeader";
import { roleLabels } from "@/lib/types";

// 本実装の画面だけを包む。モックのセッション・ヘッダー・デモ用の時計は付けない（#185）。
// サインインしている人には、本実装の画面用のヘッダーを付ける（見た目はモックの Header と同じ）。サインインが要る画面は、各画面の
// requireSessionUser が /login へ送るので、ここでは送らない（セッションが無いときは、ヘッダーを出さないだけ）。
// ヘッダーに出すリンクは、本実装に置き換わった画面だけ。モックのままの画面（アーカイブ・公開許可管理・先生の登録・解除など）は、置き換わるたびに足す。
// チーム一覧は、置き換わるまでの間、本実装の /real/teams にある（置き換えの PR で /teams へ向ける）。
const NAV_LINKS: HeaderLink[] = [
  { href: "/announcements", label: "発表会一覧" },
  { href: "/real/teams", label: "チーム一覧" },
];
const ADMIN_LINKS: HeaderLink[] = [{ href: "/admin/years", label: "年度管理" }];

export default async function RealGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;
  return (
    <>
      {user && (
        <RealHeader
          userName={user.name ?? ""}
          roleLabel={roleLabels[user.role]}
          navLinks={NAV_LINKS}
          adminLinks={user.role === "teacher" ? ADMIN_LINKS : []}
        />
      )}
      <main className="flex-1 px-6 py-8">{children}</main>
    </>
  );
}
