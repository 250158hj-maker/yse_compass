"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { setYearArchivedAction } from "@/lib/actions/years";
import { EditYearForm } from "./EditYearForm";
import { useYearAction } from "./use-year-action";

// 年度のアーカイブと解除は、先生の明示操作（時刻や条件による自動遷移は持たない）。確認のダイアログを経由する（ConfirmDialog の注記のとおり）。
// 【編集】は、誤って登録した年度の数字・クラス名の訂正（削除は持たない）。
export function YearRow({ id, year, isArchived, classes }: { id: number; year: number; isArchived: boolean; classes: { id: number; name: string }[] }) {
  const { run, pending, error } = useYearAction();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-slate-900">{year}年度</span>
          <Badge tone={isArchived ? "slate" : "emerald"}>{isArchived ? "アーカイブ済み" : "進行中"}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={pending || editing} onClick={() => setEditing(true)}>
            編集
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setConfirming(true)}>
            {isArchived ? "アーカイブを解除" : "年度をアーカイブ"}
          </Button>
        </div>
      </div>
      {editing && <EditYearForm id={id} year={year} classes={classes} onDone={() => setEditing(false)} />}
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
