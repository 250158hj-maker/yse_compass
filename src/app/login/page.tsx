"use client";

import { useRouter } from "next/navigation";
import { usePersonaList, useSession } from "@/context/SessionContext";
import { getTeamById } from "@/lib/mock";

const roleCopy: Record<string, { label: string; description: string; tone: string }> = {
  "user-tominaga": {
    label: "先生",
    description: "発表会の運営・提出状況の確認・資料公開などの管理操作ができます。",
    tone: "border-brand-200 bg-brand-50 hover:border-brand-400",
  },
  "user-mito": {
    label: "生徒(提出する)",
    description: "自チームの資料提出・概要入力ができ、他チームの発表にコメントできます。",
    tone: "border-emerald-200 bg-emerald-50 hover:border-emerald-400",
  },
  "user-viewer": {
    label: "生徒(閲覧する)",
    description: "公開された発表を閲覧し、コメント・いいねで反応できます(提出はできません)。",
    tone: "border-cyan-200 bg-cyan-50 hover:border-cyan-400",
  },
};

export default function LoginPage() {
  const personas = usePersonaList();
  const { setCurrentUserId } = useSession();
  const router = useRouter();

  function handleSelect(id: string) {
    setCurrentUserId(id);
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-3xl py-14">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">YSE Compass</h1>
        <p className="mt-2 text-sm text-slate-500">学校 Google アカウントでログインします。</p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <button
          type="button"
          disabled
          aria-disabled
          className="flex w-full max-w-xs items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
            />
          </svg>
          Google でログイン
        </button>
        <p className="text-xs text-slate-400">
          本番では学校 Google アカウント(Workspace)の OAuth 認証になります(このモック環境では未接続のため無効化しています)。
        </p>
      </div>

      <div className="mt-8 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        モック検証用ログイン(下から利用者を選択)
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {personas.map((persona) => {
          const copy = roleCopy[persona.id];
          const team = persona.teamId ? getTeamById(persona.teamId) : null;
          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSelect(persona.id)}
              className={`flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-left transition ${
                copy?.tone ?? "border-slate-200 bg-white hover:border-brand-300"
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {copy?.label}
              </span>
              <span className="text-lg font-bold text-slate-900">{persona.name}</span>
              <span className="text-xs text-slate-500">
                {[persona.className, team ? `${team.name}チーム` : null].filter(Boolean).join(" / ")}
              </span>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{copy?.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
