"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ANNOUNCEMENT_PHASE_ORDER, type Year } from "@/lib/types";
import { years as initialYears } from "@/lib/mock";

function nextYearLabel(years: Year[]): string {
  const maxYear = Math.max(0, ...years.map((y) => parseInt(y.label, 10)).filter((n) => !Number.isNaN(n)));
  return `${maxYear + 1}年度`;
}

export default function AdminYearsPage() {
  const [years, setYears] = useState<Year[]>(initialYears);
  const [confirmTarget, setConfirmTarget] = useState<"start" | { yearId: string; action: "archive" | "unarchive" } | null>(
    null
  );

  function startNewYear() {
    const newYear: Year = { id: `year-local-${Date.now()}`, label: nextYearLabel(years), status: "進行中" };
    setYears((prev) => [newYear, ...prev]);
  }

  function toggleArchive(yearId: string, action: "archive" | "unarchive") {
    setYears((prev) =>
      prev.map((y) => (y.id === yearId ? { ...y, status: action === "archive" ? "アーカイブ済み" : "進行中" } : y))
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "年度管理" }]} />
      <PageHeader
        title="年度管理"
        meta="年度の開始・アーカイブは先生の明示操作でのみ行われます(自動遷移はしません)"
        actions={
          <Button variant="primary" onClick={() => setConfirmTarget("start")}>
            + 年度を開始
          </Button>
        }
      />

      <div className="mt-4">
        <InlineNotice tone="info">
          「年度を開始」は{ANNOUNCEMENT_PHASE_ORDER.join("/")}の4発表会＋定番の資料枠構成を一括生成する入口です(モックのため、ここでは年度の追加のみ表現しています)。
        </InlineNotice>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {years.map((year) => (
          <Card key={year.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-slate-900">{year.label}</span>
              <Badge tone={year.status === "進行中" ? "emerald" : "slate"}>{year.status}</Badge>
            </div>
            {year.status === "進行中" ? (
              <Button
                variant="secondary"
                onClick={() => setConfirmTarget({ yearId: year.id, action: "archive" })}
              >
                年度をアーカイブ
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setConfirmTarget({ yearId: year.id, action: "unarchive" })}
              >
                アーカイブを解除
              </Button>
            )}
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={confirmTarget === "start"}
        onClose={() => setConfirmTarget(null)}
        onConfirm={startNewYear}
        title="年度を開始しますか?"
        description="新しい年度を開始し、4発表会の骨組みを一括生成します(モック内のみの操作です)。"
        confirmLabel="開始する"
      />
      <ConfirmDialog
        open={typeof confirmTarget === "object" && confirmTarget?.action === "archive"}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => typeof confirmTarget === "object" && confirmTarget && toggleArchive(confirmTarget.yearId, "archive")}
        title="年度をアーカイブしますか?"
        description="運営動線からアーカイブへ移します。この操作はあとから解除できます。"
        confirmLabel="アーカイブする"
      />
      <ConfirmDialog
        open={typeof confirmTarget === "object" && confirmTarget?.action === "unarchive"}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => typeof confirmTarget === "object" && confirmTarget && toggleArchive(confirmTarget.yearId, "unarchive")}
        title="アーカイブを解除しますか?"
        description="この年度を再び進行中の運営動線に戻します。"
        confirmLabel="解除する"
      />
    </div>
  );
}
