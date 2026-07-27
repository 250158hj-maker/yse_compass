"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleGate } from "@/components/ui/RoleGate";
import { PhaseBadge, StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { getAnnouncementsByYear, getCurrentYear, getSubmission, getTeamsByYear } from "@/lib/mock";
import type { Team } from "@/lib/types";

export default function TeamsPage() {
  const year = getCurrentYear();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  if (!year) return null;
  const teams = getTeamsByYear(year.id);
  const announcements = getAnnouncementsByYear(year.id);

  function openCard(e: React.MouseEvent, team: Team) {
    // 修飾キー付きクリック(新しいタブで開く等)は通常のリンク遷移に任せ、
    // 通常クリックのみポップアップ表示に切り替える(参考サイトのカード挙動を踏襲)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setSelectedTeam(team);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">{year.label}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">チーム一覧</h1>
        </div>
        <RoleGate allow={["teacher"]}>
          <button
            type="button"
            className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
            title="チーム作成の操作主体は未決事項です(モックは先生前提)"
          >
            ＋チーム作成(モック)
          </button>
        </RoleGate>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.id}`}
            onClick={(e) => openCard(e, team)}
            className="rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-300"
          >
            <p className="text-xs font-medium text-slate-400">{team.className}</p>
            <p className="mt-1 font-semibold text-slate-900">{team.name}</p>
            <p className="text-sm text-slate-600">{team.projectTitle}</p>
            <p className="mt-2 text-xs text-slate-400">メンバー：{team.members.join("、")}</p>
          </Link>
        ))}
      </div>

      {selectedTeam && (
        <Modal onClose={() => setSelectedTeam(null)}>
          <p className="pr-6 text-xs font-medium text-slate-400">
            {selectedTeam.name} • {selectedTeam.className}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{selectedTeam.projectTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{selectedTeam.summary}</p>

          <div className="mt-4 text-sm text-slate-600">
            <p>
              <span className="text-slate-400">メンバー：</span>
              {selectedTeam.members.join("、")}
            </p>
            <p className="mt-1">
              <span className="text-slate-400">リーダー：</span>
              {selectedTeam.leaderName}
            </p>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400">発表会ごとの提出状況</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {announcements.map((a) => {
                const submission = getSubmission(a.id, selectedTeam.id);
                return (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <PhaseBadge phase={a.phase} />
                      {a.title}
                    </span>
                    <StatusBadge status={submission?.materials.some((m) => m.status === "提出済み") ? "提出済み" : "未提出"} />
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href={`/teams/${selectedTeam.id}`}
            className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            チーム詳細ページへ
          </Link>
        </Modal>
      )}
    </div>
  );
}
