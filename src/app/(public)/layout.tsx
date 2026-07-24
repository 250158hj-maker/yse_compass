import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-gray-900">
            YSE Compass
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-cyan"
          >
            ログイン
          </Link>
        </div>
        <div className="brand-gradient-bar h-1 w-full" />
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
