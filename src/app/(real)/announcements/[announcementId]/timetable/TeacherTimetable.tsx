"use client";

import { useState } from "react";
import { SortableList } from "@/components/timetable/SortableList";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { setCurrentPresentationAction, setDisplayOrdersAction } from "@/lib/actions/timetable";
import { TimetableRow, type TimetableRowData } from "./TimetableRow";
import { useTimetableAction } from "./use-timetable-action";

// SC-07 の先生の画面。当日の進行（「発表中」の切り替え・発表を終える・進行を終える）と、当日の発表順の入れ替え。
// 規則（誰が操作できるか・どの行が動かせないか・発表順の重なり）は、データ層が持つ。画面は、関数が返した isCurrent / isDone をそのまま使い、
// 失敗は Action の結果を日本語にして出すだけ。入れ替えのつまみは「発表中」が設定されている間だけ出す（04：開始前の並び替えは SC-08）。
export function TeacherTimetable({
  occasionId,
  rows,
  currentPresentationId,
}: {
  occasionId: number;
  rows: TimetableRowData[];
  currentPresentationId: number | null;
}) {
  const { run, pending, error } = useTimetableAction();
  const serverIds = rows.map((r) => r.presentationId);
  const signature = rows.map((r) => `${r.presentationId}:${r.displayOrder}:${r.isCurrent ? 1 : 0}`).join(",");

  // 入れ替えは、画面で先に動かして見せる。サーバーの並びが変わったら（保存・読み込み直し）、そちらに合わせ直す。
  const [seenSignature, setSeenSignature] = useState(signature);
  const [orderIds, setOrderIds] = useState(serverIds);
  if (signature !== seenSignature) {
    setSeenSignature(signature);
    setOrderIds(serverIds);
  }
  const byId = new Map(rows.map((r) => [r.presentationId, r]));
  const items = orderIds.map((id) => byId.get(id)).filter((r): r is TimetableRowData => r !== undefined);

  const current = rows.find((r) => r.isCurrent) ?? null;
  const last = rows[rows.length - 1];
  const isLocked = (r: TimetableRowData) => r.isCurrent || r.isDone;

  function move(fromIndex: number, toIndex: number) {
    const next = [...orderIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderIds(next);
    // 動かせる行を、動かせない行の発表順の次から、並んだ順に振り直して保存する（保存の入口は SC-08 と共通）。
    const ordered = next.map((id) => byId.get(id)).filter((r): r is TimetableRowData => r !== undefined);
    const base = Math.max(0, ...ordered.filter(isLocked).map((r) => r.displayOrder ?? 0));
    const updates = ordered.filter((r) => !isLocked(r)).map((r, i) => ({ presentationId: r.presentationId, displayOrder: base + 1 + i }));
    run(
      () => setDisplayOrdersAction(occasionId, updates),
      () => setOrderIds(serverIds),
    );
  }

  const setCurrent = (presentationId: number | null) => run(() => setCurrentPresentationAction(occasionId, presentationId));

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-medium text-slate-700">{current ? `いま発表中：${current.teamName}` : "いま発表中のチームはいません"}</p>
        {current && (
          <div className="flex flex-wrap gap-2">
            {last && last.presentationId === current.presentationId && (
              <Button variant="primary" disabled={pending} onClick={() => setCurrent(null)}>
                発表を終える
              </Button>
            )}
            <Button variant="secondary" disabled={pending} onClick={() => setCurrent(null)}>
              進行を終える
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <InlineNotice tone="danger">{error}</InlineNotice>
        </div>
      )}

      <div className="mt-3">
        {currentPresentationId !== null ? (
          <SortableList
            items={items}
            getKey={(r) => String(r.presentationId)}
            getLabel={(r) => r.teamName}
            listLabel="発表順（当日の入れ替え）"
            onMove={(from, to) => move(from, to)}
            isLocked={isLocked}
            renderItem={({ item: r, handle }) => (
              <TimetableRow
                row={r}
                occasionId={occasionId}
                leading={handle}
                trailing={
                  !r.isCurrent && (
                    <Button variant="secondary" disabled={pending} onClick={() => setCurrent(r.presentationId)}>
                      発表中にする
                    </Button>
                  )
                }
              />
            )}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((r) => (
              <TimetableRow
                key={r.presentationId}
                row={r}
                occasionId={occasionId}
                trailing={
                  <Button variant="secondary" disabled={pending} onClick={() => setCurrent(r.presentationId)}>
                    発表中にする
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
