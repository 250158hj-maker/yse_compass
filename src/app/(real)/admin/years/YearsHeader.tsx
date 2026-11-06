"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StartYearForm } from "./StartYearForm";

// 年度管理の見出しと、【+ 年度を開始】のボタン。ボタンを押すと、見出しの下に年度のフォームが開く（モックは確認のダイアログだが、
// 本実装は、年度とクラス名の入力が要るので、フォームを開く形にした）。年度を開始できたら、フォームを閉じる。
export function YearsHeader({ defaultClassNames, previousYear }: { defaultClassNames: string[]; previousYear: number | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="年度管理"
        actions={
          <Button variant={open ? "secondary" : "primary"} onClick={() => setOpen((v) => !v)}>
            {open ? "閉じる" : "+ 年度を開始"}
          </Button>
        }
      />
      {open && (
        <div className="mt-6">
          <StartYearForm defaultClassNames={defaultClassNames} previousYear={previousYear} onDone={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
