"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePersonaList, useSession } from "@/context/SessionContext";
import { getTeamById } from "@/lib/mock";
import { roleLabels, type AppUser } from "@/lib/types";

function personaSubtitle(user: AppUser): string {
  if (user.role === "teacher") return "先生";
  const team = user.teamId ? getTeamById(user.teamId) : null;
  return [user.className, team?.name ? `${team.name}チーム` : null].filter(Boolean).join(" / ");
}

// ヘッダーに常時表示する切り替え+ログアウトの操作。ログイン後はどの画面からでも
// この1コンポーネント経由で3ロールの切り替え・ログアウトができる(ログイン画面への遷移は
// ログアウト時のみ。切り替えは選び直すだけで画面遷移しない)。
export function PersonaSwitcher() {
  const personas = usePersonaList();
  const { currentUser, setCurrentUserId, signOut } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSelect(id: string) {
    setCurrentUserId(id);
    setOpen(false);
  }

  function handleSignOut() {
    signOut();
    setOpen(false);
    router.push("/login");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        <span className="font-medium text-slate-900">{currentUser?.name ?? "未ログイン"}</span>
        <span className="text-xs text-slate-400">
          {currentUser ? roleLabels[currentUser.role] : ""}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-60 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            ロールを切り替え
          </p>
          {personas.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSelect(persona.id)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                currentUser?.id === persona.id ? "bg-brand-50 text-brand-700" : "text-slate-700"
              }`}
            >
              {persona.name}
              <span className="ml-1 text-xs text-slate-400">
                ({roleLabels[persona.role]}・{personaSubtitle(persona)})
              </span>
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
