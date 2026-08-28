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

export function PersonaSwitcher({ layout }: { layout: "chooser" | "dropdown" }) {
  const personas = usePersonaList();
  const { currentUser, setCurrentUserId } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSelect(id: string) {
    setCurrentUserId(id);
    if (layout === "chooser") {
      router.push("/");
    } else {
      setOpen(false);
    }
  }

  if (layout === "chooser") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {personas.map((persona) => (
          <button
            key={persona.id}
            type="button"
            onClick={() => handleSelect(persona.id)}
            className="flex flex-col items-start gap-1 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
          >
            <span className="text-base font-semibold text-slate-900">{persona.name}</span>
            <span className="text-xs text-slate-500">{personaSubtitle(persona)}</span>
          </button>
        ))}
      </div>
    );
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
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
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
              <span className="ml-1 text-xs text-slate-400">({roleLabels[persona.role]})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
