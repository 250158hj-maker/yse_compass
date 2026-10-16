import Link from "next/link";
import type { ReactNode } from "react";

// アプリ内のリンク(概要集)は同じタブで、外部のドライブのリンクは別タブで開く。
export function MaterialLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
