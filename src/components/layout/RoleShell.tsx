"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface RoleNavItem {
  href: string;
  label: string;
  /** If true, only highlight on an exact path match (use for a section's top/index page). */
  exact?: boolean;
}

export type RoleAccentColor = "blue" | "teal" | "orange";

const accentStyles: Record<RoleAccentColor, { badge: string; active: string }> = {
  blue: { badge: "bg-brand-blue", active: "border-brand-blue text-brand-blue" },
  teal: { badge: "bg-brand-teal", active: "border-brand-teal text-brand-teal" },
  orange: { badge: "bg-brand-orange", active: "border-brand-orange text-brand-orange" },
};

export function RoleShell({
  roleLabel,
  accent,
  tag,
  userName,
  navItems,
  children,
}: {
  roleLabel: string;
  accent: RoleAccentColor;
  tag?: string;
  userName: string;
  navItems: RoleNavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const styles = accentStyles[accent];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="print:hidden bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-gray-900">YSE Compass</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${styles.badge}`}>
              {roleLabel}
            </span>
            {tag && (
              <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600">
                {tag}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{userName}</span>
            <Link
              href="/login"
              className="rounded-full border border-gray-300 px-3 py-1.5 text-gray-600 hover:border-gray-400 hover:text-gray-900"
            >
              ロールを切り替える
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap border-b-[3px] px-4 py-3 text-sm font-semibold transition ${
                  active ? styles.active : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="brand-gradient-bar h-1 w-full" />
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
