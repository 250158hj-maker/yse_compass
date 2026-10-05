"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, PhaseBadge, StatusBadge, LateBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { getTeamsByYear, getSubmission, isLateSubmission } from "@/lib/mock";
import type { Announcement } from "@/lib/types";

export function SubmissionsMatrixClient({ announcement: a }: { announcement: Announcement }) {
  const teams = getTeamsByYear(a.yearId);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  // 進捗の分母は必須枠のみに統一する。任意枠の未提出はここでの「未提出」に数えない(open-questions.md H-15)。
  const requiredSlots = a.materialSlots.filter((slot) => slot.required);
  const isMissing = (teamId: string, slotName: string) =>
    getSubmission(a.id, teamId)?.materials.find((m) => m.name === slotName)?.status !== "提出済み";
  const rows = teams.filter((team) => {
    if (!onlyIncomplete) return true;
    return requiredSlots.some((slot) => isMissing(team.id, slot.name));
  });
  const missingCount = teams.reduce(
    (sum, team) => sum + requiredSlots.filter((slot) => isMissing(team.id, slot.name)).length,
    0,
  );

  return (
    <RoleGate allow={["teacher"]} fallback={<TeacherOnlyNotice />}>
      <div className="mx-auto max-w-6xl">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "発表会一覧", href: "/announcements" },
            { label: a.title, href: `/announcements/${a.id}` },
            { label: "提出状況一覧" },
          ]}
        />
        <PageHeader
          title="提出状況一覧"
          meta={`${a.title}・締切 ${formatDateTime(a.submissionDeadline)}`}
          actions={
            <Button variant="secondary" onClick={() => setOnlyIncomplete((v) => !v)}>
              {onlyIncomplete ? "すべて表示" : "未提出のみ表示"}
            </Button>
          }
        />

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>必須枠の未提出</span>
          <Badge tone={missingCount > 0 ? "rose" : "emerald"}>{missingCount}件</Badge>
        </div>

        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState message="未提出のチームはありません。" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
            <table className="w-full whitespace-nowrap border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">チーム</th>
                  {a.materialSlots.map((slot) => (
                    <th key={slot.id} className="px-4 py-3 font-medium">
                      {slot.name}
                      <span className="ml-1 font-normal text-slate-400">{slot.required ? "(必須)" : "(任意)"}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((team) => {
                  const submission = getSubmission(a.id, team.id);
                  return (
                    <tr key={team.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <PhaseBadge phase={a.phase} />
                          {team.name}
                        </div>
                      </td>
                      {a.materialSlots.map((slot) => {
                        const material = submission?.materials.find((m) => m.name === slot.name);
                        const late = material
                          ? isLateSubmission(a.submissionDeadline, material.updatedAt)
                          : false;
                        const missingRequired = slot.required && (material?.status ?? "未提出") !== "提出済み";
                        return (
                          <td key={slot.id} className={`px-4 py-3 ${missingRequired ? "bg-rose-50/50" : ""}`}>
                            <div className="flex flex-col items-start gap-1">
                              <span className="flex items-center gap-1">
                                <StatusBadge status={material?.status ?? "未提出"} />
                                {late && <LateBadge />}
                              </span>
                              {material?.driveUrl && (
                                <a
                                  href={material.driveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-brand-600 hover:underline"
                                >
                                  資料を開く
                                </a>
                            )}
                            {material?.updatedAt && (
                              <span className="text-xs text-slate-400">{formatDateTime(material.updatedAt)}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </RoleGate>
  );
}
