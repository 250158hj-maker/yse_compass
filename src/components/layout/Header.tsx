"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { isTeacher } from "@/lib/session-helpers";
import { roleLabels } from "@/lib/types";

const navLinks = [
  { href: "/", label: "ホーム" },
  { href: "/announcements", label: "発表会一覧" },
  { href: "/teams", label: "チーム一覧" },
  { href: "/archive", label: "アーカイブ" },
];

const adminLinks = [
  { href: "/admin/years", label: "年度管理" },
  { href: "/admin/publish-permissions", label: "公開許可管理" },
  { href: "/admin/users", label: "ユーザー管理" },
];

export function Header() {
  const { currentUser, signOut } = useSession();
  const router = useRouter();

  function handleSignOut() {
    signOut();
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href={currentUser ? "/" : "/login"} className="text-lg font-bold text-brand-700">
          YSE Compass
        </Link>

        {currentUser && (
          <nav className="flex flex-1 items-center gap-4 text-sm text-slate-600">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-brand-700">
                {link.label}
              </Link>
            ))}
            {isTeacher(currentUser) && (
              <span className="flex items-center gap-4 border-l border-slate-200 pl-4">
                {adminLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-brand-700">
                    {link.label}
                  </Link>
                ))}
              </span>
            )}
          </nav>
        )}

        {currentUser && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">
              {currentUser.name}
              <span className="ml-1 text-xs text-slate-400">({roleLabels[currentUser.role]})</span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
