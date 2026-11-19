"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { updateYearAction } from "@/lib/actions/years";
import { useYearAction } from "./use-year-action";

type ClassRow = { key: number; id?: number; name: string };

// 年度の訂正（誤って登録したときの手当て）。年度の数字を直し、クラスの名前を直す・足す。
// 年度とクラスの削除は持たない（年度は運用の方針、クラスはチームが結びつくため決めていない。decisions.md 2026-11-02 のクラスの入力の行）。
// 保存できたら、onDone を呼ぶ（呼ぶ側が、フォームを閉じるのに使う）。
export function EditYearForm({ id, year, classes, onDone }: { id: number; year: number; classes: { id: number; name: string }[]; onDone: () => void }) {
  const { run, pending, error } = useYearAction();
  const [yearText, setYearText] = useState(String(year));
  const [rows, setRows] = useState<ClassRow[]>(() => classes.map((c, i) => ({ key: i + 1, id: c.id, name: c.name })));
  const [nextKey, setNextKey] = useState(classes.length + 1);
  const [formError, setFormError] = useState<string | null>(null);

  function validate(): string | null {
    const y = Number(yearText);
    if (yearText.trim() === "" || !Number.isInteger(y) || y < 1000 || y > 9999) return "年度は西暦 4 桁で入れてください。";
    const names = rows.map((r) => r.name.trim());
    if (names.some((n) => n === "")) return "空のクラス名があります。入れるか、足した行を消してください。";
    if (new Set(names).size !== names.length) return "同じクラス名が重なっています。";
    return null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = validate();
    setFormError(message);
    if (message) return;
    run(() => updateYearAction(id, { year: Number(yearText), classes: rows.map((r) => ({ id: r.id, name: r.name.trim() })) }), onDone);
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-slate-200 pt-4">
      <div className="max-w-xs">
        <FormField label="年度" htmlFor={`edit-year-${id}`} required hint="西暦 4 桁（例：2027）">
          <input
            id={`edit-year-${id}`}
            type="number"
            inputMode="numeric"
            className={fieldClassName}
            value={yearText}
            min={1000}
            max={9999}
            onChange={(e) => setYearText(e.target.value)}
          />
        </FormField>
      </div>

      <fieldset className="mb-4">
        <legend className="mb-1 text-sm font-medium text-slate-700">クラス</legend>
        <p className="mb-2 text-xs text-slate-400">名前を直したり、クラスを足したりできます。登録済みのクラスは消せません。</p>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.key} className="flex items-center gap-2">
              <input
                aria-label={`クラス ${i + 1} の名前`}
                className={fieldClassName}
                value={r.name}
                onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))}
              />
              {r.id === undefined && (
                <Button type="button" className="shrink-0 whitespace-nowrap" aria-label={`クラス ${i + 1} の行を消す`} onClick={() => setRows(rows.filter((x) => x.key !== r.key))}>
                  この行を消す
                </Button>
              )}
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
      <div className="mt-4 flex gap-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "保存中…" : "保存"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={onDone}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
