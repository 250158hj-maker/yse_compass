"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PublishPermissionBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PublishPermissionStatus, Team } from "@/lib/types";
import { getAnnouncementsByYear, getArchivedYears, getCurrentYear, getTeamsByYear } from "@/lib/mock";

type Row = Team & { yearLabel: string; canSet: boolean };

// SC-18 は卒業年度チームの公開許可の一覧(04 SC-18)。当年度(卒業年度)のチームを先頭に、アーカイブ済み年度のチームを続ける。
// 設定(代理設定・訂正)は、その年度の全発表会が終わってから(decisions 2026-07-26・2026-09-26)。それまでは状況だけを出す。
// 判定は SC-14(TeamDetailClient.tsx)の allEnded と同じく、モックの発表会の status を読む。
function buildRows(): Row[] {
  const current = getCurrentYear();
  const years = [...(current ? [current] : []), ...getArchivedYears()];
  return years.flatMap((year) => {
    const announcements = getAnnouncementsByYear(year.id);
    const allEnded = announcements.length > 0 && announcements.every((a) => a.status === "終了");
    return getTeamsByYear(year.id).map((team) => ({ ...team, yearLabel: year.label, canSet: allEnded }));
  });
}

const statusOptions: PublishPermissionStatus[] = ["未設定", "許可", "拒否"];

export default function PublishPermissionsPage() {
  const [rows, setRows] = useState<Row[]>(buildRows);

  function setStatus(teamId: string, status: PublishPermissionStatus) {
    setRows((prev) => prev.map((row) => (row.id === teamId ? { ...row, publishPermission: status } : row)));
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "公開許可管理" }]} />
      <PageHeader title="公開許可管理" />

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState message="卒業年度のチームがまだありません。" />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <Card key={row.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">{row.yearLabel}</p>
                  <p className="font-semibold text-slate-900">
                    {row.projectTitle}({row.name})
                  </p>
                  <p className="text-xs text-slate-500">代表者: {row.leaderName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <PublishPermissionBadge status={row.publishPermission} />
                  {row.canSet && (
                    <div className="flex gap-1.5">
                      {statusOptions.map((status) => (
                        <Button
                          key={status}
                          variant={row.publishPermission === status ? "primary" : "secondary"}
                          onClick={() => setStatus(row.id, status)}
                          disabled={row.publishPermission === status}
                        >
                          {status}にする
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
