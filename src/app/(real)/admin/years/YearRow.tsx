"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { setYearArchivedAction } from "@/lib/actions/years";
import { useYearAction } from "./use-year-action";

// 年度のアーカイブと解除は、先生の明示操作（時刻や条件による自動遷移は持たない）。確認のダイアログを経由する（ConfirmDialog の注記のとおり）。
export function YearRow({ id, year, isArchived }: { id: number; year: number; isArchived: boolean }) {
  const { run, pending, error } = useYearAction();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-slate-900">{year}年度</span>
          <Badge tone={isArchived ? "slate" : "emerald"}>{isArchived ? "アーカイブ済み" : "進行中"}</Badge>
        </div>
        <Button variant="secondary" disabled={pending} onClick={() => setConfirming(true)}>
          {isArchived ? "アーカイブを解除" : "年度をアーカイブ"}
        </Button>
      </div>
      {error && (
        <div className="mt-3">
          <InlineNotice tone="danger">{error}</InlineNotice>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => run(() => setYearArchivedAction(id, !isArchived))}
        title={isArchived ? `${year}年度のアーカイブを解除しますか？` : `${year}年度をアーカイブしますか？`}
        description={
          isArchived
            ? "運営の画面（発表会一覧など）に戻ります。アーカイブはいつでも解除でき、また戻すこともできます。"
            : "運営の画面（発表会一覧など）から外れ、アーカイブへ移ります。解除すれば元に戻ります。"
        }
        confirmLabel={isArchived ? "解除する" : "アーカイブする"}
      />
    </Card>
  );
}
