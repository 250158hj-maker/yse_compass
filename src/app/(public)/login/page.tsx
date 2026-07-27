import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">ログイン</h1>
      <p className="mt-2 text-gray-600">
        学校アカウントでのログインを想定していますが、モックではロールを選んで各画面へ進めます。
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-800">学校アカウントでログイン（モック）</p>
        <button
          type="button"
          disabled
          className="mt-2 cursor-not-allowed rounded-full bg-gray-200 px-4 py-1.5 text-gray-500"
        >
          Google でログイン（未接続）
        </button>
        <p className="mt-2 text-xs text-gray-400">
          Auth.js + 学校 Google アカウントでの OAuth 接続は技術検証中のため、下記からロールを選んで進んでください。
          「生徒」は自分がどのチームに所属しているかに応じて使える機能が自動的に変わるため、モックでは2つのアカウント例から選べます。
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card accent="blue" className="h-full">
          <span className="inline-block rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white">
            先生
          </span>
          <h2 className="mt-3 font-semibold text-gray-900">先生として進む</h2>
          <p className="mt-1 text-sm text-gray-600">
            発表会・資料枠の作成、提出状況確認、資料公開、チーム管理ができます。
          </p>
          <p className="mt-3 text-xs text-gray-400">アカウントを選択（モック）</p>
          <div className="mt-2 flex flex-col gap-2">
            <Link
              href="/api/mock-login?teacher=t-tomi"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm hover:border-brand-blue hover:bg-brand-blue/5"
            >
              <span className="font-medium text-gray-900">冨永先生</span>
            </Link>
            <Link
              href="/api/mock-login?teacher=t-mito"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm hover:border-brand-blue hover:bg-brand-blue/5"
            >
              <span className="font-medium text-gray-900">水戸先生</span>
            </Link>
          </div>
        </Card>

        <Card accent="teal" className="h-full">
          <span className="inline-block rounded-full bg-brand-teal px-3 py-1 text-xs font-bold text-white">
            生徒
          </span>
          <h2 className="mt-3 font-semibold text-gray-900">生徒として進む</h2>
          <p className="mt-1 text-sm text-gray-600">
            発表資料の閲覧、コメント投稿・過去作品の検索ができます。自分のチームに所属している場合は、資料の提出・差し替えもできます。
          </p>
          <p className="mt-3 text-xs text-gray-400">アカウントを選択（モック）</p>
          <div className="mt-2 flex flex-col gap-2">
            <Link
              href="/api/mock-login?student=stu-sato"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm hover:border-brand-teal hover:bg-brand-teal/5"
            >
              <span className="font-medium text-gray-900">佐藤</span>
              <span className="ml-2 text-gray-500">チームAlpha 所属</span>
            </Link>
            <Link
              href="/api/mock-login?student=stu-yamada"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm hover:border-brand-orange hover:bg-brand-orange/5"
            >
              <span className="font-medium text-gray-900">山田</span>
              <span className="ml-2 text-gray-500">チーム未所属</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
