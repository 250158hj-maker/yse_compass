"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { signOutAction } from "@/lib/actions/auth";

// disabled: 本実装にまだ無い画面。押せないグレーで並べる（リンクにしない）。
export type HeaderLink = { href: string; label: string; disabled?: boolean };

const UNIMPLEMENTED_TITLE = "準備中（まだ使えません）";

function NavItem({ link, className = "" }: { link: HeaderLink; className?: string }) {
  if (link.disabled) {
    return (
      <span aria-disabled="true" title={UNIMPLEMENTED_TITLE} className={`${className} cursor-not-allowed text-slate-400`}>
        {link.label}
        {/* 準備中は、色とツールチップだけに頼らず文字で出す（スマホ幅・キーボード・読み上げでも伝わる。#251 のレビュー） */}
        <span className="ml-1 text-xs">（準備中）</span>
      </span>
    );
  }
  return (
    <Link href={link.href} className={`${className} hover:text-brand-700`}>
      {link.label}
    </Link>
  );
}

// 本実装の画面のヘッダー。見た目はモックの Header（components/layout/Header.tsx）と同じで、人物は Auth.js のセッション（サーバー側）から受け取る。
// 本実装に置き換わった画面へのリンクは押せる。まだ置き換わっていない画面（モックのまま）へのリンクは、押すとログイン画面に戻されるので、
// disabled にして押せないグレーで並べる（隠さない：どの機能がまだ無いかが見える）。
// どのリンクを出すかの判断（先生だけの管理リンクなど）は、呼ぶ側（(real)/layout.tsx）が持つ。ここは表示だけ。
export function RealHeader({
  userName,
  roleLabel,
  navLinks,
  adminLinks,
}: {
  userName: string;
  roleLabel: string;
  navLinks: HeaderLink[];
  adminLinks: HeaderLink[];
}) {
  const pathname = usePathname();
  // 開いた時点のパスを覚え、パスが変わったら自動で閉じた扱いにする（effect で setState しない）
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const menuOpen = menuOpenedAt === pathname;
  const [pending, startTransition] = useTransition();

  // サインアウトのあとは、Action が自前のログイン画面（/login）へ送る。
  function handleSignOut() {
    startTransition(async () => {
      await signOutAction();
    });
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-x-4 px-6 py-3">
        <Link href="/announcements" className="shrink-0 whitespace-nowrap text-lg font-bold text-brand-700">
          YSE Compass
        </Link>

        <nav className="hidden flex-1 flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap text-sm text-slate-600 sm:flex">
          {navLinks.map((link) => (
            <NavItem key={link.href} link={link} />
          ))}
          {adminLinks.length > 0 && (
            <span className="flex items-center gap-x-4 border-l border-slate-200 pl-4">
              {adminLinks.map((link) => (
                <NavItem key={link.href} link={link} />
              ))}
            </span>
          )}
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden min-w-0 truncate text-sm text-slate-700 sm:inline">
            {userName}
            <span className="ml-1 text-xs text-slate-400">({roleLabel})</span>
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
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
      </div>
      {menuOpen && (
        <nav id="header-menu" className="border-t border-slate-200 px-6 py-2 text-sm text-slate-600 sm:hidden">
          <p className="break-words border-b border-slate-200 py-2 font-medium text-slate-700">
            {userName}（{roleLabel}）
          </p>
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavItem link={link} className="block py-2" />
              </li>
            ))}
          </ul>
          {adminLinks.length > 0 && (
            <ul className="mt-1 flex flex-col border-t border-slate-200 pt-1">
              {adminLinks.map((link) => (
                <li key={link.href}>
                  <NavItem link={link} className="block py-2" />
                </li>
              ))}
            </ul>
          )}
        </nav>
      )}
      <div className="h-[3px] w-full bg-gradient-to-r from-brand-500 via-brand-400 to-brand-200" />
    </header>
  );
}
