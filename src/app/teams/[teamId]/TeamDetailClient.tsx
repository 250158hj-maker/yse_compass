"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleGate } from "@/components/ui/RoleGate";
import { PhaseBadge, StatusBadge } from "@/components/ui/Badge";
import type { Announcement, Submission, Team } from "@/lib/types";

export default function TeamDetailClient({
  team,
  timeline,
}: {
  team: Team;
  timeline: { announcement: Announcement; submission: Submission | undefined }[];
}) {
  const [members, setMembers] = useState(team.members.join("、"));
  const [leaderName, setLeaderName] = useState(team.leaderName);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-xs text-slate-400">{team.className}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{team.name}</h1>
      <p className="text-slate-600">{team.projectTitle}</p>
      <p className="mt-1 text-sm text-slate-500">メンバー：{members}</p>
      <p className="text-sm text-slate-500">リーダー：{leaderName}</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-500">発表会ごとの提出状況</h2>
        <div className="mt-3 flex flex-col gap-2">
          {timeline.map(({ announcement, submission }) => (
            <Link
              key={announcement.id}
              href={`/announcements/${announcement.id}/teams/${team.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-brand-300"
            >
              <span className="flex items-center gap-2">
                <PhaseBadge phase={announcement.phase} />
                <span className="text-sm font-medium text-slate-800">{announcement.title}</span>
              </span>
              <StatusBadge status={submission?.materials.some((m) => m.status === "提出済み") ? "提出済み" : "未提出"} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
        <h2 className="text-sm font-semibold text-slate-500">公開許可(卒業後のアーカイブ表示)</h2>
        <p className="mt-2 text-xs text-slate-400">
          全ての発表会が終了すると、リーダーがここでアーカイブでの公開可否を設定できるようになります(現在は未有効)。
        </p>
      </section>

      <RoleGate allow={["teacher"]}>
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-500">チーム編集(先生)</h2>
          <label className="mt-3 block text-xs text-slate-500">メンバー(読点区切り)</label>
          <textarea
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="mt-3 block text-xs text-slate-500">リーダー</label>
          <select
            value={leaderName}
            onChange={(e) => setLeaderName(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {members.split("、").map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </section>
      </RoleGate>
    </div>
  );
}
