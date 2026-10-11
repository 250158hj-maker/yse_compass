"use client";

import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { TimetableRows } from "@/components/timetable/TimetableRows";
import { NextStep, backToHub } from "@/components/flow/NextStep";
import { useTimetable } from "@/context/TeacherDemoContext";
import { getPresentationStartMs } from "@/lib/demo/teacher-derived";
import { formatDateTime } from "@/lib/format";
import { getTeamById } from "@/lib/mock";
import type { Announcement } from "@/lib/types";

// SC-07 タイムテーブル(先生)。当日の進行をここで行う(04-screen.md の SC-07)。
// - いま発表中の強調・「次の発表へ」・各行の ▲▼(当日の入れ替え)は、デモ用の時刻が当日のときだけ出す。
// - 並び・発表中は先生の共有状態(useTimetable)を読む。モックに直書きの currentPresentingTeamId は読まない。
// - 生徒が見る SC-07 は TimetableClient の従来の描画(getTimetableFor)のまま。
export function TeacherTimetableClient({ announcement: a }: { announcement: Announcement }) {
  const { timetable, slots, period, currentPresentingTeamId, presentationsFinished, next, moveNow } = useTimetable(a.id);
  const onTheDay = period === "当日";
  const presentingTeam = currentPresentingTeamId ? getTeamById(currentPresentingTeamId) : null;

  return (
    <>
      {onTheDay && timetable && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-sm font-medium text-rose-700">
            {presentationsFinished
              ? "すべての発表が終わりました"
              : presentingTeam
                ? `いま発表中：${presentingTeam.name}(${presentingTeam.projectTitle})`
                : "いま発表中のチームはいません"}
          </p>
          {!presentationsFinished && (
            <Button variant="primary" onClick={next}>
              次の発表へ
            </Button>
          )}
        </div>
      )}

      {!onTheDay && timetable && (
        <div className="mt-4">
          <InlineNotice tone="info">
            {period === "終了"
              ? "この発表会は終了しました。"
              : `当日(${formatDateTime(new Date(getPresentationStartMs(a, slots)).toISOString())}〜)になると、ここで発表の進行(発表中の切り替え・順番の入れ替え)ができます。`}
          </InlineNotice>
        </div>
      )}

      {onTheDay && timetable && !presentationsFinished && (
        <p className="mt-4 text-sm text-slate-500">
          発表が押したときは、▲▼で順番を入れ替えられます(保存せずにすぐ反映されます)。
        </p>
      )}

      <div className={onTheDay ? "mt-3" : "mt-6"}>
        <TimetableRows
          timetable={timetable}
          announcementId={a.id}
          renderLeading={
            onTheDay && !presentationsFinished
              ? (slot, index, count) => (
                  <div className="flex w-5 flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveNow(slot.id, -1)}
                      disabled={index === 0}
                      aria-label="1 つ上へ"
                      className="text-sm text-slate-400 hover:text-brand-600 disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveNow(slot.id, 1)}
                      disabled={index === count - 1}
                      aria-label="1 つ下へ"
                      className="text-sm text-slate-400 hover:text-brand-600 disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                )
              : undefined
          }
        />
      </div>

      <NextStep
        description={
          presentationsFinished
            ? "すべての発表が終わりました。工程表で資料を生徒に公開します。"
            : onTheDay
              ? "すべての発表が終わったら、工程表で資料を生徒に公開します。"
              : "当日の進行は、発表会の当日にこの画面で行います。"
        }
        next={presentationsFinished ? { href: `/announcements/${a.id}`, label: "次へ：工程表で公開する →" } : null}
        back={backToHub(a.id)}
      />
    </>
  );
}
