"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePersonaList, useSession } from "@/context/SessionContext";
import { getTeamById } from "@/lib/mock";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

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

function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg {...iconProps} className="h-7 w-7">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
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
    label: "生徒(提出する)",
    tone: "emerald",
    icon: <UploadIcon />,
    iconColor: "bg-emerald-50 text-emerald-600",
    description: "自チームの資料提出・概要入力ができ、他チームの発表にコメントできます。",
  },
  "user-viewer": {
    label: "生徒(閲覧する)",
    tone: "slate",
    icon: <EyeIcon />,
    iconColor: "bg-slate-100 text-slate-500",
    description: "公開された発表を閲覧し、コメント・いいねで反応できます(提出はできません)。",
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
    <div className="mx-auto max-w-3xl py-12">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <CompassIcon />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">YSE Compass</h1>
        <p className="mt-2 text-sm text-slate-500">学校 Google アカウントでログインします。</p>
      </div>

      <Card className="mx-auto mt-8 max-w-md text-center shadow-sm shadow-slate-900/5">
        <Button
          type="button"
          disabled
          aria-disabled
          className="w-full gap-3 border border-slate-300 bg-white py-2.5 text-slate-700 shadow-sm disabled:opacity-60"
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
        </Button>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          本番では学校 Google アカウント(Workspace)の OAuth 認証になります(このモック環境では未接続のため無効化しています)。
        </p>
      </Card>

      <div className="mt-10">
        <SectionHeading>モック検証用ログイン(下から利用者を選択)</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-3">
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
    </div>
  );
}
