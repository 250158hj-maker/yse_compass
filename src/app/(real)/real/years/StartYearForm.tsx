"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { setupYearAction } from "@/lib/actions/years";
import { useYearAction } from "./use-year-action";

type ClassRow = { key: number; name: string; autoFocus?: boolean };

// 年度一括セットアップ（SC-19 の【年度を開始】）。先行方針（H-57）: 年度は先生が整数で入力する。クラス名は前年度のクラスを初期値に出し
// （前年度が無ければ空）、確定の前に先生が追加・削除・編集できる。クラスが 0 件のときは確定させない。同じ年度は拒む。
// 年度の初期値は出さない（正典に無い規則を足さない）。チームは作らない（H-9：セットアップとチーム登録は独立した操作）。
export function StartYearForm({ defaultClassNames, previousYear }: { defaultClassNames: string[]; previousYear: number | null }) {
  const { run, pending, error } = useYearAction();
  const [year, setYear] = useState("");
  const [rows, setRows] = useState<ClassRow[]>(() => (defaultClassNames.length > 0 ? defaultClassNames : [""]).map((name, i) => ({ key: i + 1, name })));
  const [nextKey, setNextKey] = useState(rows.length + 1);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // クラス名の欄の Enter は、送信せず次の行へ移る（最後の行なら行を足して移る）。日本語入力の変換を確定する Enter は、そのままにする。
  function nextRowOnEnter(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (index < rows.length - 1) {
      document.getElementById(`class-name-${rows[index + 1].key}`)?.focus();
      return;
    }
    if (rows[index].name.trim() === "") return;
    setRows([...rows, { key: nextKey, name: "", autoFocus: true }]);
    setNextKey(nextKey + 1);
  }

  function classNames() {
    return rows.map((r) => r.name.trim()).filter((n) => n !== "");
  }

  function validate(): string | null {
    const y = Number(year);
    if (year.trim() === "" || !Number.isInteger(y) || y < 1000 || y > 9999) return "年度は西暦 4 桁で入れてください。";
    const names = classNames();
    if (names.length === 0) return "クラスを 1 つ以上入れてください。";
    if (new Set(names).size !== names.length) return "同じクラス名が重なっています。";
    return null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = validate();
    setFormError(message);
    if (!message) setConfirming(true);
  }

  function start() {
    run(() => setupYearAction({ year: Number(year), classNames: classNames() }));
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">年度を開始する</h2>
      <form onSubmit={submit}>
        <InlineNotice tone="info">
          4 つの発表会（企画・設計・試作・最終）と、定番の資料枠（概要・プレゼン資料）を一括で作ります。チームは作りません。
        </InlineNotice>
        <div className="mt-4 max-w-xs">
          <FormField label="年度" htmlFor="start-year" required hint="西暦 4 桁（例：2027）">
            <input
              id="start-year"
              type="number"
              inputMode="numeric"
              className={fieldClassName}
              value={year}
              min={1000}
              max={9999}
              onChange={(e) => setYear(e.target.value)}
            />
          </FormField>
        </div>

        <fieldset className="mb-4">
          <legend className="mb-1 text-sm font-medium text-slate-700">
            クラス<span className="ml-1 text-rose-600">*</span>
          </legend>
          <p className="mb-2 text-xs text-slate-400">
            {previousYear !== null ? `${previousYear}年度のクラスを初期値にしています。追加・削除・編集できます。` : "前の年度がないので、クラス名を入れてください。"}
          </p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <input
                  id={`class-name-${r.key}`}
                  aria-label={`クラス ${i + 1} の名前`}
                  className={fieldClassName}
                  value={r.name}
                  autoFocus={r.autoFocus}
                  onKeyDown={(e) => nextRowOnEnter(e, i)}
                  onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))}
                />
                <Button
                  type="button"
                  className="shrink-0 whitespace-nowrap"
                  disabled={rows.length === 1}
                  aria-label={`クラス ${i + 1} の行を消す`}
                  onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                >
                  この行を消す
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            className="mt-2"
            onClick={() => {
              setRows([...rows, { key: nextKey, name: "" }]);
              setNextKey(nextKey + 1);
            }}
          >
            クラスを足す
          </Button>
        </fieldset>

        {(formError ?? error) && <InlineNotice tone="danger">{formError ?? error}</InlineNotice>}
        <div className="mt-4">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "開始中…" : "年度を開始"}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={start}
        title={`${year}年度を開始しますか？`}
        description={`クラス（${classNames().join("・")}）と、4 つの発表会・定番の資料枠を一括で作ります。同じ年度を 2 回は開始できません。`}
        confirmLabel="開始する"
      />
    </Card>
  );
}
