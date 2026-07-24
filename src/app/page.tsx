import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">YSE Compass</h1>
      <p className="mt-4 text-slate-600">
        卒業制作の発表会運営を効率化し、成果を学校の資産として蓄積するプラットフォーム
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-700"
      >
        ログインへ進む
      </Link>
    </div>
  );
}
