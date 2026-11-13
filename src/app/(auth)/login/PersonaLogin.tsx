"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePersonaList, useSession } from "@/context/SessionContext";
import { getTeamById } from "@/lib/mock";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";

// モックの人物ログイン（先生と生徒の 2 人のカード）。モックのままの画面を、これまでどおり見せるために残す（Issue #184・置き換えが済んだら外せる）。
// モックのセッション（SessionContext）に書き込むだけで、Google のサインインとは関係しない。

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-5 w-5",
} as const;

function ShieldIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.4 7 9 4.1-1.6 7-4.8 7-9V6l-7-2.5Z" />
      <path d="m9 12 2.2 2.2L15.2 10" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 16V5" />
      <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
      <path d="M5 16.5V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.5" />
    </svg>
  );
}

const roleCopy: Record<string, { label: string; tone: BadgeTone; icon: ReactNode; iconColor: string; description: string }> = {
  "user-tominaga": {
    label: "先生",
    tone: "brand",
    icon: <ShieldIcon />,
    iconColor: "bg-brand-50 text-brand-600",
    description: "発表会の運営・提出状況の確認・資料公開などの管理操作ができます。",
  },
  "user-mito": {
    label: "生徒",
    tone: "emerald",
    icon: <UploadIcon />,
    iconColor: "bg-emerald-50 text-emerald-600",
    description: "チームに登録された生徒です。自チームの資料提出・概要入力ができ、他チームの発表にコメントできます。",
  },
};

export function PersonaLogin() {
  const personas = usePersonaList();
  const { setCurrentUserId } = useSession();
  const router = useRouter();

  function handleSelect(id: string) {
    setCurrentUserId(id);
    // "/" は本実装のホーム（SC-02）に置き換わり、Google のセッションが無いと /login へ戻される。モックの人物で入ったときは、
    // まだモックのままの画面（アーカイブ）へ送る。モックの画面が全部置き換わったら、この人物ログインごと外す。
    router.push("/archive");
  }

  return (
    <div className="mt-10">
      <SectionHeading>モック検証用ログイン(下から利用者を選択)</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        {personas.map((persona) => {
          const copy = roleCopy[persona.id];
          const team = persona.teamId ? getTeamById(persona.teamId) : null;
          const meta = [persona.className, team ? `${team.name}チーム` : null].filter(Boolean).join(" / ");
          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSelect(persona.id)}
              className="flex flex-col items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md hover:shadow-brand-500/20"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    copy?.iconColor ?? "bg-slate-100 text-slate-500"
                  }`}
                >
                  {copy?.icon}
                </span>
                {copy && <Badge tone={copy.tone}>{copy.label}</Badge>}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{persona.name}</p>
                {meta && <p className="mt-0.5 text-xs text-slate-500">{meta}</p>}
              </div>
              <p className="text-xs leading-relaxed text-slate-600">{copy?.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
