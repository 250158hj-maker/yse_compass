"use client";

import { useState } from "react";
import { RoleGate, TeacherOnlyNotice } from "@/components/ui/RoleGate";
import { PublishPermissionBadge } from "@/components/ui/Badge";
import { getArchivedYears, getTeamsByYear } from "@/lib/mock";
import type { PublishPermissionStatus, Team } from "@/lib/types";

const statusOptions: PublishPermissionStatus[] = ["未設定", "許可", "拒否"];

export default function PublishPermissionsPage() {
  const years = getArchivedYears();
  const [teams, setTeams] = useState<Team[]>(years.flatMap((y) => getTeamsByYear(y.id)));

  function updateStatus(teamId: string, status: PublishPermissionStatus) {
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, publishPermission: status } : t)));
  }

  return (
    <RoleGate allow={["teacher"]} fallback={<div className="mx-auto max-w-6xl px-6 py-16"><TeacherOnlyNotice /></div>}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">公開許可管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          卒業年度チームの公開許可(アーカイブでの表示可否)を確認・代理設定できます。データの削除はここでは行いません。
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">年度</th>
                <th className="px-4 py-3 font-medium">チーム</th>
                <th className="px-4 py-3 font-medium">作品名</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3 font-medium">代理設定</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const year = years.find((y) => y.id === team.yearId);
                return (
                  <tr key={team.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-xs text-slate-400">{year?.label}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{team.name}</td>
                    <td className="px-4 py-3 text-slate-600">{team.projectTitle}</td>
                    <td className="px-4 py-3">
                      <PublishPermissionBadge status={team.publishPermission} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {statusOptions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateStatus(team.id, s)}
                            className={`rounded-lg px-2 py-1 text-xs ${
                              team.publishPermission === s ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-500"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGate>
  );
}
