import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>{children}</div>
  );
}

export function CardLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:bg-brand-50/40 ${className}`}
    >
      {children}
    </Link>
  );
}
