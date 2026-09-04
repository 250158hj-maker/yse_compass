"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge, StatusBadge, LateBadge } from "@/components/ui/Badge";
import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { getTeamsByYear, getSubmission, isLateSubmission } from "@/lib/mock";
import type { Announcement } from "@/lib/types";

export function SubmissionsMatrixClient({ announcement: a }: { announcement: Announcement }) {
  const teams = getTeamsByYear(a.yearId);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  // 進捗の分母は必須枠のみに統一する。任意枠の未提出はここでの「未提出」に数えない(open-questions.md H-15)。
  const rows = teams.filter((team) => {
    if (!onlyIncomplete) return true;
    const submission = getSubmission(a.id, team.id);
    return a.materialSlots
      .filter((slot) => slot.required)
      .some((slot) => submission?.materials.find((m) => m.name === slot.name)?.status !== "提出済み");
  });

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

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">チーム</th>
                {a.materialSlots.map((slot) => (
                  <th key={slot.id} className="py-2 pr-4 font-medium">
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
                  <tr key={team.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">
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
                      return (
                        <td key={slot.id} className="py-3 pr-4">
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
      </div>
    </RoleGate>
  );
}
