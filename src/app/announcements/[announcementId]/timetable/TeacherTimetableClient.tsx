"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { SortableList } from "@/components/timetable/SortableList";
import { TimetableRows, TimetableSlotRow } from "@/components/timetable/TimetableRows";
import { NextStep, backToHub } from "@/components/flow/NextStep";
import { useTimetable } from "@/context/TeacherDemoContext";
import { teamSlotsInOrder } from "@/lib/demo/teacher-derived";
import { getTeamById } from "@/lib/mock";
import type { Announcement } from "@/lib/types";

// SC-07 タイムテーブル(先生)。当日の進行をここで行う(04-screen.md の SC-07)。
// - 当日に入っても発表は自動では始まらない(glossary.md 末尾:状態遷移は先生の明示操作を正とする)。
//   当日・開始前は「最初の発表を開始」だけを出し、開始後に「次の発表へ」と各行のつまみ(当日の入れ替え・ドラッグ)を出す。
//   つまみを出すのは、まだ発表していない行だけ(発表を終えた行・いま発表中の行は動かせない)。
// - 当日の入れ替えは SC-08 と同じ部品(SortableList)と同じ時刻の規則(lib/demo/schedule.ts)。並べ替えたら時刻を詰め直す。
// - 並び・発表中は先生の共有状態(useTimetable)を読む。モックに直書きの currentPresentingTeamId は読まない。
// - 生徒が見る SC-07 は TimetableClient の従来の描画(getTimetableFor)のまま。

// 「最初の発表を開始」を押した直後、同じ帯の右端(同じ座標)に「次の発表へ」が出る。ダブルクリックの 2 回目が
// それに当たって先頭のチームが飛ばされないよう、開始からこの間に来た「次の発表へ」のクリックは無視する。
// disabled にしないのは、主ボタンが一瞬灰色に点滅して撮影の画に残るため。
const NEXT_GUARD_MS = 600;

export function TeacherTimetableClient({ announcement: a }: { announcement: Announcement }) {
  const {
    timetable,
    slots,
    period,
    currentPresentingTeamId,
    presentationsStarted,
    presentationsFinished,
    start,
    next,
    reorderNow,
  } = useTimetable(a.id);
  const onTheDay = period === "当日";
  const running = onTheDay && presentationsStarted && !presentationsFinished;
  const presentingTeam = currentPresentingTeamId ? getTeamById(currentPresentingTeamId) : null;
  const firstSlot = teamSlotsInOrder(slots)[0];
  const firstTeam = firstSlot ? getTeamById(firstSlot.teamId) : null;
  const startedAtRef = useRef(0);
  // いま発表中の行と、それより前の行(発表を終えたチーム・過ぎた休憩)は動かせない。当日の入れ替えは、まだ発表していない行どうしだけ。
  const presentingIndex = currentPresentingTeamId
    ? slots.findIndex((s) => !s.isBreak && s.teamId === currentPresentingTeamId)
    : -1;
  const lockedSlotIds = new Set(slots.slice(0, presentingIndex + 1).map((s) => s.id));

  function handleStart() {
    startedAtRef.current = Date.now();
    start();
  }

  function handleNext() {
    if (Date.now() - startedAtRef.current < NEXT_GUARD_MS) return;
    next();
  }

  return (
    <>
      {onTheDay && timetable && !presentationsStarted && (
        // 開始前は案内の色(InlineNotice の info と同じ)。発表中の rose は、先生が開始してから使う。
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-5 py-4">
          <p className="text-sm font-medium text-brand-800">
            {firstSlot ? `${firstSlot.startTime} 開始予定・まだ始まっていません` : "まだ始まっていません"}
            {firstTeam && <span className="font-normal">(最初は {firstTeam.name})</span>}
          </p>
          <Button variant="primary" onClick={handleStart} disabled={!firstSlot}>
            最初の発表を開始
          </Button>
        </div>
      )}

      {onTheDay && timetable && presentationsStarted && (
        // 発表中は rose(生徒のホームの「いま発表中」の帯と同じ)。全発表を終えたら、生徒側で「済み・完了」に使う
        // emerald(StatusBadge の「提出済み」・SC-06 の未提出 0 件のバッジ)へ切り替える。
        <div
          className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-5 py-4 ${
            presentationsFinished ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
          }`}
        >
          <p className={`text-sm font-medium ${presentationsFinished ? "text-emerald-700" : "text-rose-700"}`}>
            {presentationsFinished
              ? "すべての発表が終わりました"
              : presentingTeam
                ? `いま発表中：${presentingTeam.name}(${presentingTeam.projectTitle})`
                : "いま発表中のチームはいません"}
          </p>
          {!presentationsFinished && (
            <Button variant="primary" onClick={handleNext}>
              次の発表へ
            </Button>
          )}
        </div>
      )}

      {/* 機能を説明するだけの文言・枠は置かない(水戸の指示 2026-10-12:開発フェーズの実装に入らないため)。
          終了の表示は発表会の状態なので残す。 */}
      {period === "終了" && timetable && (
        <div className="mt-4">
          <InlineNotice tone="info">この発表会は終了しました。</InlineNotice>
        </div>
      )}

      <div className={onTheDay ? "mt-3" : "mt-6"}>
        {running && timetable ? (
          <SortableList
            items={slots}
            getKey={(slot) => slot.id}
            getLabel={(slot) => (slot.isBreak ? slot.breakLabel : (getTeamById(slot.teamId)?.name ?? "(不明なチーム)"))}
            listLabel="発表順(当日の入れ替え)"
            onMove={(_from, to, slot) => reorderNow(slot.id, to)}
            isLocked={(slot) => lockedSlotIds.has(slot.id)}
            renderItem={({ item: slot, handle }) => (
              <div className="flex items-center gap-2">
                {handle}
                <div className="min-w-0 flex-1">
                  <TimetableSlotRow
                    slot={slot}
                    timetable={timetable}
                    announcementId={a.id}
                    presented={lockedSlotIds.has(slot.id)}
                  />
                </div>
              </div>
            )}
          />
        ) : (
          <TimetableRows timetable={timetable} announcementId={a.id} />
        )}
      </div>

      <NextStep
        next={presentationsFinished ? { href: `/announcements/${a.id}`, label: "次へ：資料公開 →" } : null}
        back={backToHub(a.id)}
      />
    </>
  );
}
