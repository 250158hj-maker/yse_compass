"use client";

import { useState } from "react";
import { RoleGate, TeacherOnlyNotice } from "@/components/ui/RoleGate";
import { LateBadge, StatusBadge } from "@/components/ui/Badge";
import { isLateSubmission } from "@/lib/mock";
import type { Announcement, Submission, Team } from "@/lib/types";

export default function SubmissionsMatrixClient({
  announcement,
  entries,
}: {
  announcement: Announcement;
  entries: { team: Team; submission: Submission }[];
}) {
  const [onlyUnsubmitted, setOnlyUnsubmitted] = useState(false);

  const rows = onlyUnsubmitted
    ? entries.filter((e) => e.submission.materials.some((m) => m.status === "未提出"))
    : entries;

  return (
    <RoleGate allow={["teacher"]} fallback={<div className="mx-auto max-w-6xl px-6 py-16"><TeacherOnlyNotice /></div>}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">提出状況一覧</h1>
        <p className="mt-1 text-sm text-slate-500">
          {announcement.title} ／ 締切 {announcement.submissionDeadline}
        </p>

        <label className="mt-4 flex w-fit items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyUnsubmitted}
            onChange={(e) => setOnlyUnsubmitted(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          未提出があるチームのみ表示
        </label>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">チーム</th>
                {announcement.materialSlots.map((slot) => (
                  <th key={slot.id} className="px-4 py-3 font-medium">
                    {slot.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ team, submission }) => (
                <tr key={team.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{team.name}</td>
                  {announcement.materialSlots.map((slot) => {
                    const material = submission.materials.find((m) => m.name === slot.name);
                    if (!material) return <td key={slot.id} className="px-4 py-3">-</td>;
                    const late = isLateSubmission(material.updatedAt, announcement.submissionDeadline);
                    return (
                      <td key={slot.id} className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-2">
                            <StatusBadge status={material.status} />
                            {late && <LateBadge />}
                          </span>
                          {material.updatedAt && <span className="text-xs text-slate-400">{material.updatedAt}</span>}
                          {material.driveUrl && (
                            <a
                              href={material.driveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-brand-600 hover:underline"
                            >
                              資料を開く
                            </a>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGate>
  );
}
