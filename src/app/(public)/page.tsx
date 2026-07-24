import Link from "next/link";

export default function Home() {
  return (
    <div className="py-16 text-center">
      <span className="inline-block rounded-full bg-brand-blue/10 px-4 py-1 text-sm font-bold text-brand-blue">
        卒業制作 発表会プラットフォーム
      </span>
      <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
        YSE Compass
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
        卒業制作の発表会運営を効率化し、成果を学校の資産として蓄積していくプラットフォームです。
      </p>
      <Link
        href="/login"
        className="mt-10 inline-block rounded-full bg-brand-blue px-8 py-3 text-base font-bold text-white shadow-md hover:bg-brand-cyan"
      >
        ログインして始める
      </Link>
    </div>
  );
}
