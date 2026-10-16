"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

// 行をドラッグで並べ替える一覧(先生の SC-08 の発表順・SC-07 の当日の入れ替え)。ライブラリは使わず Pointer Events で作る。
//
// - マウス・タッチ:行の左の「つまみ」を押して上下に動かす。持ち上げた行はポインタに付いて動き、ほかの行は
//   よけて落とす場所を空け、その場所の上端に線が出る(線は持ち上げた行より手前に描く)。
//   一覧の外(上下左右に少し余裕をとった範囲の外)で離す・Esc・ポインタの取り消しでは、並びを変えない。
// - キーボード:つまみにフォーカスして ↑↓ で 1 つずつ動く。Space(または Enter)で掴む → ↑↓ → Space で離す。
//   掴んでいる間の Esc は、掴んだときの位置へ戻す。動かした結果は live region で読み上げる。
// - 並びの持ち主は親。ここは「from 番目を to 番目(動かした後の位置)へ」を onMove で伝えるだけ。
// - 動かせない行(isLocked。例:SC-07 の発表を終えた行・いま発表中の行)は、つまみを出さず(同じ幅の空きだけ置く)、
//   ほかの行もその行を越えて動かせない(動かせない行の位置が変わる移動は、ポインターでもキーボードでも起こさない)。
//   isLocked を渡さなければ、すべての行が動かせる(従来どおり)。

const OUTSIDE_MARGIN_PX = 32;

type DragState = {
  key: string;
  fromIndex: number;
  pointerId: number;
  startY: number;
  dy: number;
  // ドラッグ開始時の各行の位置(一覧の箱からの相対・px)。
  rows: { top: number; bottom: number }[];
  outside: boolean;
};

type GrabState = { key: string; originIndex: number };

export type SortableRenderArgs<T> = {
  item: T;
  index: number;
  // つまみ(行の左に置く)。
  handle: ReactNode;
  // 持ち上げている(ドラッグ中・キーボードで掴んでいる)か。
  lifted: boolean;
};

export function SortableList<T>({
  items,
  getKey,
  getLabel,
  onMove,
  renderItem,
  renderGap,
  listLabel,
  className = "flex flex-col gap-2",
  isLocked,
}: {
  items: T[];
  getKey: (item: T) => string;
  // 読み上げに使う行の名前(例:「Cheers」「休憩」)。
  getLabel: (item: T) => string;
  onMove: (fromIndex: number, toIndex: number, item: T) => void;
  renderItem: (args: SortableRenderArgs<T>) => ReactNode;
  // index 番目と index+1 番目の行の間に置くもの(例:「＋ 休憩を挟む」)。ドラッグ中は見えなくする(場所は残す)。
  renderGap?: (afterIndex: number) => ReactNode;
  listLabel: string;
  className?: string;
  // 動かせない行か。省略時はすべて動かせる。
  isLocked?: (item: T) => boolean;
}) {
  const instructionsId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const handleRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusKey = useRef<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [grab, setGrab] = useState<GrabState | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const count = items.length;
  const lockedAt = (index: number) => (isLocked ? isLocked(items[index]) : false);

  // from 番目の行が動ける範囲(両端を含む)。動かせない行の手前で止まる。isLocked が無ければ 0 〜 count - 1。
  function rangeOf(fromIndex: number): { lo: number; hi: number } {
    let lo = fromIndex;
    while (lo > 0 && !lockedAt(lo - 1)) lo -= 1;
    let hi = fromIndex;
    while (hi < count - 1 && !lockedAt(hi + 1)) hi += 1;
    return { lo, hi };
  }

  // キーボードで動かしたあと、つまみにフォーカスを戻す(行の DOM が並べ替えで付け替わると、フォーカスが外れることがあるため)。
  useEffect(() => {
    const key = pendingFocusKey.current;
    if (!key) return;
    pendingFocusKey.current = null;
    const el = handleRefs.current.get(key);
    if (el && document.activeElement !== el) el.focus({ preventScroll: true });
  }, [items]);

  // ドラッグ中の Esc は取り消し。
  useEffect(() => {
    if (!drag) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setDrag(null);
        setAnnouncement("並べ替えを取り消しました");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drag]);

  // ドラッグ中の行の中心から、動かした後の位置(to)を決める。行の中心が他の行の中心を越えたら、その先へ入る。
  function targetIndexOf(d: DragState): number {
    const from = d.rows[d.fromIndex];
    const center = (from.top + from.bottom) / 2 + d.dy;
    let to = 0;
    d.rows.forEach((r, i) => {
      if (i !== d.fromIndex && (r.top + r.bottom) / 2 < center) to += 1;
    });
    const { lo, hi } = rangeOf(d.fromIndex);
    return Math.min(Math.max(to, lo), hi);
  }

  // 行と行の間隔(px)。ドラッグ開始時の位置から測る。
  function spacingOf(d: DragState): number {
    const rows = d.rows;
    if (rows.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < rows.length - 1; i++) sum += rows[i + 1].top - rows[i].bottom;
    return sum / (rows.length - 1);
  }

  // ほかの行がよける量(px)。持ち上げた行が抜けた分だけ詰め、落とす場所を空ける。
  function shiftOf(d: DragState, index: number): number {
    if (d.outside || index === d.fromIndex) return 0;
    const to = targetIndexOf(d);
    const from = d.rows[d.fromIndex];
    const pitch = from.bottom - from.top + spacingOf(d);
    if (d.fromIndex < index && index <= to) return -pitch;
    if (to <= index && index < d.fromIndex) return pitch;
    return 0;
  }

  // 落とす位置の線の y(一覧の箱からの相対)= 空けた場所の上端の少し上。動かない位置・一覧の外では出さない。
  function indicatorY(d: DragState): number | null {
    if (d.outside) return null;
    const to = targetIndexOf(d);
    if (to === d.fromIndex) return null;
    const from = d.rows[d.fromIndex];
    const landingTop = to < d.fromIndex ? d.rows[to].top : d.rows[to].bottom - (from.bottom - from.top);
    return landingTop - Math.min(spacingOf(d) / 2, 6);
  }

  function isOutside(clientX: number, clientY: number): boolean {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return true;
    return (
      clientX < box.left - OUTSIDE_MARGIN_PX ||
      clientX > box.right + OUTSIDE_MARGIN_PX ||
      clientY < box.top - OUTSIDE_MARGIN_PX ||
      clientY > box.bottom + OUTSIDE_MARGIN_PX
    );
  }

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>, key: string, index: number) {
    if (e.button !== 0 || drag || lockedAt(index)) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    // 文字の選択とスクロールを止め、以降の pointermove をつまみに集める。
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rows = items.map((item) => {
      const r = rowRefs.current.get(getKey(item))?.getBoundingClientRect();
      return r ? { top: r.top - box.top, bottom: r.bottom - box.top } : { top: 0, bottom: 0 };
    });
    setGrab(null);
    setDrag({ key, fromIndex: index, pointerId: e.pointerId, startY: e.clientY, dy: 0, rows, outside: false });
  }

  function handlePointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dy = e.clientY - drag.startY;
    const outside = isOutside(e.clientX, e.clientY);
    if (dy !== drag.dy || outside !== drag.outside) setDrag({ ...drag, dy, outside });
  }

  function handlePointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const finished = { ...drag, dy: e.clientY - drag.startY, outside: isOutside(e.clientX, e.clientY) };
    setDrag(null);
    if (finished.outside) {
      setAnnouncement("一覧の外で離したので、並びは変えていません");
      return;
    }
    const to = targetIndexOf(finished);
    if (to === finished.fromIndex) return;
    const item = items[finished.fromIndex];
    onMove(finished.fromIndex, to, item);
    setAnnouncement(`${getLabel(item)} を ${to + 1} 番目に移しました(全 ${count} 件)`);
  }

  function handlePointerCancel(e: PointerEvent<HTMLButtonElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    setDrag(null);
  }

  function moveByKey(index: number, delta: -1 | 1, item: T) {
    const to = index + delta;
    const { lo, hi } = rangeOf(index);
    if (to < lo || to > hi) {
      setAnnouncement(`${getLabel(item)} はいま ${index + 1} 番目で、これ以上${delta < 0 ? "上" : "下"}へは動かせません`);
      return;
    }
    pendingFocusKey.current = getKey(item);
    onMove(index, to, item);
    setAnnouncement(`${getLabel(item)} を ${to + 1} 番目に移しました(全 ${count} 件)`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, item: T, index: number) {
    if (lockedAt(index)) return;
    const key = getKey(item);
    const label = getLabel(item);
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      moveByKey(index, e.key === "ArrowUp" ? -1 : 1, item);
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (grab?.key === key) {
        setGrab(null);
        setAnnouncement(`${label} を ${index + 1} 番目に置きました`);
      } else {
        setGrab({ key, originIndex: index });
        setAnnouncement(`${label} を掴みました。上下の矢印キーで動かし、スペースで置きます。Esc で元の位置に戻します`);
      }
      return;
    }
    if (e.key === "Escape" && grab?.key === key) {
      e.preventDefault();
      setGrab(null);
      if (grab.originIndex !== index) {
        pendingFocusKey.current = key;
        onMove(index, grab.originIndex, item);
      }
      setAnnouncement(`並べ替えを取り消し、${label} を ${grab.originIndex + 1} 番目に戻しました`);
    }
  }

  const lineY = drag ? indicatorY(drag) : null;

  return (
    <div ref={containerRef} className={`relative ${drag ? "select-none" : ""}`}>
      <p id={instructionsId} className="sr-only">
        つまみにフォーカスして、上下の矢印キーで 1 つずつ動かせます。スペースで掴んで動かし、もう一度スペースで置きます。
      </p>
      <ol aria-label={listLabel} className={className}>
        {items.map((item, index) => {
          const key = getKey(item);
          const label = getLabel(item);
          const dragging = drag?.key === key;
          const grabbed = grab?.key === key;
          const lifted = dragging || grabbed;
          const shift = drag && !dragging ? shiftOf(drag, index) : 0;
          const handle = lockedAt(index) ? (
            // 動かせない行はつまみを出さず、同じ幅を空けて行の書き出しをそろえる(押してなぞっても文字の選択を始めない)。
            <span aria-hidden="true" className="h-9 w-7 shrink-0 select-none" />
          ) : (
            <button
              type="button"
              ref={(el) => {
                if (el) handleRefs.current.set(key, el);
                else handleRefs.current.delete(key);
              }}
              aria-label={`${label} を並べ替える(いま ${index + 1} 番目・全 ${count} 件)`}
              aria-describedby={instructionsId}
              aria-pressed={grabbed}
              onPointerDown={(e) => handlePointerDown(e, key, index)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onKeyDown={(e) => handleKeyDown(e, item, index)}
              onBlur={() => {
                if (grab?.key === key) setGrab(null);
              }}
              data-sortable-handle={key}
              className={`flex h-9 w-7 shrink-0 touch-none items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 ${
                dragging ? "cursor-grabbing bg-slate-100 text-brand-600" : "cursor-grab"
              } ${grabbed ? "bg-brand-50 text-brand-600" : ""}`}
            >
              <GripIcon />
            </button>
          );
          return (
            <li key={key} className="list-none">
              <div
                ref={(el) => {
                  if (el) rowRefs.current.set(key, el);
                  else rowRefs.current.delete(key);
                }}
                data-sortable-row={key}
                style={
                  dragging
                    ? { transform: `translateY(${drag.dy}px)` }
                    : drag
                      ? { transform: `translateY(${shift}px)`, transition: "transform 150ms ease" }
                      : undefined
                }
                className={
                  lifted
                    ? `relative z-20 rounded-lg shadow-lg shadow-slate-900/15 ring-2 ring-brand-300 ${
                        dragging && drag.outside ? "opacity-60" : ""
                      }`
                    : "relative"
                }
              >
                {renderItem({ item, index, handle, lifted })}
              </div>
              {renderGap && index < count - 1 && (
                <div className={drag ? "invisible" : undefined}>{renderGap(index)}</div>
              )}
            </li>
          );
        })}
      </ol>
      {lineY !== null && (
        <div
          aria-hidden="true"
          data-sortable-indicator=""
          className="pointer-events-none absolute right-0 left-0 z-30 flex -translate-y-1/2 items-center"
          style={{ top: lineY }}
        >
          <span className="h-2.5 w-2.5 rounded-full border-2 border-brand-500 bg-white" />
          <span className="h-0.5 flex-1 rounded-full bg-brand-500" />
        </div>
      )}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}

function GripIcon() {
  return (
    <svg aria-hidden="true" width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
      <circle cx="3" cy="3" r="1.6" />
      <circle cx="9" cy="3" r="1.6" />
      <circle cx="3" cy="9" r="1.6" />
      <circle cx="9" cy="9" r="1.6" />
      <circle cx="3" cy="15" r="1.6" />
      <circle cx="9" cy="15" r="1.6" />
    </svg>
  );
}
