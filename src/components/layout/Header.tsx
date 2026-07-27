"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { roleLabels, type Role } from "@/lib/types";

const navLinks = [
  { href: "/", label: "ホーム" },
  { href: "/announcements", label: "発表会一覧" },
  { href: "/teams", label: "チーム一覧" },
  { href: "/archive", label: "アーカイブ" },
];

const teacherNavLinks = [
  { href: "/admin/years", label: "年度管理" },
  { href: "/admin/publish-permissions", label: "公開許可管理" },
  { href: "/admin/users", label: "ユーザー管理" },
];

const roleOptions: { value: Role; label: string }[] = [
  { value: "teacher", label: roleLabels.teacher },
  { value: "presenter", label: roleLabels.presenter },
  { value: "viewer", label: roleLabels.viewer },
];

export default function Header() {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  if (pathname === "/login") {
    return null;
  }

  const links = role === "teacher" ? [...navLinks, ...teacherNavLinks] : navLinks;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="text-lg font-bold text-brand-600">
            YSE Compass
          </Link>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-slate-600">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "border-b-2 border-brand-600 pb-0.5 text-brand-600"
                    : "border-b-2 border-transparent pb-0.5 hover:text-brand-600"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                  role === option.value
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Link href="/login" className="text-xs font-medium text-slate-400 hover:text-slate-700">
            ログイン画面へ
          </Link>
        </div>
      </div>
    </header>
  );
}
