"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import type { Role } from "@/lib/mock-data";

const navLinks = [{ href: "/announcements", label: "発表会一覧" }];

const roleOptions: { value: Role; label: string }[] = [
  { value: "teacher", label: "先生" },
  { value: "student2", label: "生徒(2年)" },
  { value: "student1", label: "生徒(1年)" },
];

export default function Header() {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/announcements" className="text-lg font-bold text-slate-900">
          YSE Compass
        </Link>

        <nav className="hidden gap-6 text-sm font-medium text-slate-600 sm:flex">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "text-slate-900" : "hover:text-slate-900"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={`rounded-full px-3 py-1 transition ${
                  role === option.value
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Link
            href="/login"
            className="text-xs font-medium text-slate-400 hover:text-slate-700"
          >
            ログイン画面へ
          </Link>
        </div>
      </div>
    </header>
  );
}
