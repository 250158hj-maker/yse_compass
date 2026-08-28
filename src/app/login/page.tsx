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
        <p className="mt-2 text-sm text-slate-500">
          学校 Google アカウントでログインします(モックのため、下の3種類から利用者を選択してください)。
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
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
