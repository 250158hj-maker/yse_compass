"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreateTeamForm } from "./CreateTeamForm";

type YearOption = { id: number; year: number; classes: { id: number; name: string }[] };

// チーム一覧の見出しと、年度の切り替え・【+ チーム作成】のボタン。ボタンを押すと、見出しの下に作成フォームが開く（モックと同じ）。
// 作成できたらチーム詳細へ移るので、フォームを閉じる処理は要らない。年度を切り替えたら、呼ぶ側が key でこの部品ごと作り直す
// （年度とクラスの選択肢を、一覧に追随させる）。
export function TeamsHeader({
  meta,
  years,
  selectedYearId,
  canCreate,
}: {
  meta?: string;
  years: YearOption[];
  selectedYearId: number | null;
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="チーム一覧"
        meta={meta}
        actions={
          <>
            {years.length > 1 &&
              years.map((y) => (
                <Link
                  key={y.id}
                  href={`/teams?year=${y.id}`}
                  className={`rounded-md border px-3 py-1.5 text-sm ${y.id === selectedYearId ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600"}`}
                >
                  {y.year}年度
                </Link>
              ))}
            {canCreate && selectedYearId !== null && (
              <Button variant={open ? "secondary" : "primary"} onClick={() => setOpen((v) => !v)}>
                {open ? "閉じる" : "+ チーム作成"}
              </Button>
            )}
          </>
        }
      />
      {open && selectedYearId !== null && (
        <div className="mt-6">
          <CreateTeamForm years={years} initialYearId={selectedYearId} />
        </div>
      )}
    </>
  );
}
