"use client";

import { useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import type { Role } from "@/lib/mock-data";

export default function LoginPage() {
  const router = useRouter();
  const { setRole } = useRole();

  function handleLogin(role: Role) {
    setRole(role);
    router.push("/announcements");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">YSE Compass</h1>
        <p className="mt-2 text-sm text-slate-500">
          学校アカウントでログインしてください(モック画面のため、役割を選択するだけでログインできます)
        </p>

        <button
          type="button"
          disabled
          className="mt-6 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-400"
        >
          Google アカウントでログイン(未実装)
        </button>

        <div className="mt-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          モック用ログイン
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleLogin("teacher")}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            先生としてログイン
          </button>
          <button
            type="button"
            onClick={() => handleLogin("student")}
            className="w-full rounded-lg border border-slate-900 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            生徒としてログイン
          </button>
        </div>
      </div>
    </div>
  );
}
