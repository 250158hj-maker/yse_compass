"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/context/SessionContext";
import { isTeacher } from "@/lib/session-helpers";
import { roleLabels } from "@/lib/types";

const navLinks = [
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
  const pathname = usePathname();
  // 開いた時点のパスを覚え、パスが変わったら自動で閉じた扱いにする（effect で setState しない）
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const menuOpen = menuOpenedAt === pathname;

  function handleSignOut() {
    signOut();
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-x-4 px-6 py-3">
        <Link href={currentUser ? "/" : "/login"} className="shrink-0 whitespace-nowrap text-lg font-bold text-brand-700">
          YSE Compass
        </Link>

        {currentUser && (
          <nav className="hidden flex-1 flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap text-sm text-slate-600 sm:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-brand-700">
                {link.label}
              </Link>
            ))}
            {isTeacher(currentUser) && (
              <span className="flex items-center gap-x-4 border-l border-slate-200 pl-4">
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
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="hidden min-w-0 truncate text-sm text-slate-700 sm:inline">
              {currentUser.name}
              <span className="ml-1 text-xs text-slate-400">({roleLabels[currentUser.role]})</span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              ログアウト
            </button>
            <button
              type="button"
              onClick={() => setMenuOpenedAt(menuOpen ? null : pathname)}
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={menuOpen}
              aria-controls="header-menu"
              className="shrink-0 rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 sm:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {menuOpen ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
              </svg>
            </button>
          </div>
        )}
      </div>
      {currentUser && menuOpen && (
        <nav id="header-menu" className="border-t border-slate-200 px-6 py-2 text-sm text-slate-600 sm:hidden">
          <p className="break-words border-b border-slate-200 py-2 font-medium text-slate-700">
            {currentUser.name}（{roleLabels[currentUser.role]}）
          </p>
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block py-2 hover:text-brand-700">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {isTeacher(currentUser) && (
            <ul className="mt-1 flex flex-col border-t border-slate-200 pt-1">
              {adminLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="block py-2 hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
      )}
      {currentUser && (
        <div className="h-[3px] w-full bg-gradient-to-r from-brand-500 via-brand-400 to-brand-200" />
      )}
    </header>
  );
}
