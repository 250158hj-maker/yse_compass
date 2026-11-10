"use client";

import { useState } from "react";
import { SortableList } from "@/components/timetable/SortableList";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import type { TimetableRowData } from "../TimetableRow";
import { useTimetableSave } from "./use-timetable-save";

// SC-08 の編集の本体。発表順の並び替えと保存。
// 規則（誰が保存できるか・動かせない行・発表順の重なり）は、データ層（setDisplayOrders）が持つ。画面は、先に動かして見せ、保存のときに並んだ順の番号（1 から）を送るだけ。
// 「発表中」が設定されている間は並び替えを塞ぐ（04 の SC-08）：つまみを出さず、案内を文言だけで出す。
// 発表順が未設定の行があるとき（チームを登録した直後は、全行が未設定）は、SC-07 と同じく番号を「—」で出し、動かさなくても保存できる（押すと、いまの並びで 1 から振る）。
// 保存できたら「発表順を保存しました。」を出す（04 には無い表示。SC-09・SC-10 の保存の表示と同じ形）。「確定」の状態は持たない（decisions.md 2026-10-26・H-47 の③）。
export function TimetableEditor({
  occasionId,
  rows,
  currentPresentationId,
}: {
  occasionId: number;
  rows: TimetableRowData[];
  currentPresentationId: number | null;
}) {
  const { save, pending, error, clearError } = useTimetableSave(occasionId);
  const serverIds = rows.map((r) => r.presentationId);
  const signature = rows.map((r) => `${r.presentationId}:${r.displayOrder}`).join(",");

  // サーバーの並びが変わったら（保存・読み込み直し）、そちらに合わせ直す。
  const [seenSignature, setSeenSignature] = useState(signature);
  const [orderIds, setOrderIds] = useState(serverIds);
  const [done, setDone] = useState(false);
  if (signature !== seenSignature) {
    setSeenSignature(signature);
    setOrderIds(serverIds);
  }
  const byId = new Map(rows.map((r) => [r.presentationId, r]));
  const items = orderIds.map((id) => byId.get(id)).filter((r): r is TimetableRowData => r !== undefined);
  const dirty = orderIds.join(",") !== serverIds.join(",");
  // 未設定の行があるか（getTimetable が返す displayOrder が null の行）。
  const hasUnset = rows.some((r) => r.displayOrder === null);
  // 保存できるのは、並びを動かしたとき、または未設定の行があるとき（いまの並びで発表順を付ける）。
  const canSave = dirty || hasUnset;
  const blocked = currentPresentationId !== null;

  function move(fromIndex: number, toIndex: number) {
    const next = [...orderIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderIds(next);
    setDone(false);
    clearError();
  }

  function onSave() {
    setDone(false);
    save(
      orderIds.map((presentationId, i) => ({ presentationId, displayOrder: i + 1 })),
      () => setDone(true),
      () => setOrderIds(serverIds),
    );
  }

  const rowView = (r: TimetableRowData, index: number, handle?: React.ReactNode) => (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4">
      {handle}
      <span className="w-8 text-sm font-medium text-slate-500">{hasUnset && !dirty ? (r.displayOrder ?? "—") : index + 1}</span>
      <span className="font-medium text-slate-900">{r.teamName}</span>
    </div>
  );

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">概要集は、この順で生成されます。</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={pending || !canSave || blocked} onClick={onSave}>
            保存する
          </Button>
          {dirty && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setOrderIds(serverIds);
                clearError();
              }}
            >
              変更を取り消す
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2" aria-live="polite">
        {blocked && <InlineNotice tone="info">発表中のため、並び替えはできません。当日の入れ替えは「当日進行」の画面で行います。</InlineNotice>}
        {error && <InlineNotice tone="danger">{error}</InlineNotice>}
        {done && !error && !dirty && <InlineNotice tone="info">発表順を保存しました。</InlineNotice>}
        {dirty && !error && <p className="text-xs text-slate-400">未保存の変更があります</p>}
      </div>

      <div className="mt-3">
        {blocked ? (
          <div className="flex flex-col gap-2">{items.map((r, i) => <div key={r.presentationId}>{rowView(r, i)}</div>)}</div>
        ) : (
          <SortableList
            items={items}
            getKey={(r) => String(r.presentationId)}
            getLabel={(r) => r.teamName}
            listLabel="発表順"
            onMove={(from, to) => move(from, to)}
            renderItem={({ item: r, index, handle }) => rowView(r, index, handle)}
          />
        )}
      </div>
    </>
  );
}
