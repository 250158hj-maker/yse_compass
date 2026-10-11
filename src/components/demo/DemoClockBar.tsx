"use client";

import { useDemoClock } from "@/context/DemoClockContext";
import { useSwitchDemoClockPreset, useTeacherDemoReset } from "@/context/TeacherDemoContext";
import { useSession } from "@/context/SessionContext";
import { isTeacher } from "@/lib/session-helpers";
import { formatDemoClock } from "@/lib/demo/clock";

// デモ用の時刻の帯。先生でログインしているときだけ出す(生徒の画面 = 動画の区間 B・C の見た目を変えないため)。
// 見た目は生徒側の画面の部品に寄せる: 切り替えボタンは発表詳細のラベル絞り込み(PresentationDetailClient.tsx の
// rounded-full の小さなボタン)と同じ形、文字色は補足の文字と同じ slate。
export function DemoClockBar() {
  const { currentUser } = useSession();
  const { nowMs, presetId, presets, resetClock } = useDemoClock();
  // 時刻の切り替えは当日の進行(発表中)も開始前に戻す。setPreset を直接呼ばない。
  const switchPreset = useSwitchDemoClockPreset();
  const resetTeacherDemo = useTeacherDemoReset();

  if (!isTeacher(currentUser)) return null;

  function handleReset() {
    resetClock();
    resetTeacherDemo();
  }

  return (
    <div className="border-b border-slate-200 bg-slate-50 print:hidden" role="region" aria-label="デモ用の時刻">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2 text-xs">
        <p className="flex items-center gap-1.5 text-slate-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0"
            aria-hidden
          >
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          <span>デモ用の時刻</span>
          <span className="font-semibold tabular-nums text-slate-700">{formatDemoClock(nowMs)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="時刻を切り替える">
          {presets.map((preset) => {
            const active = preset.id === presetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => switchPreset(preset.id)}
                aria-pressed={active}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                  active
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="ml-auto text-xs text-slate-400 hover:text-brand-700 hover:underline"
        >
          最初から
        </button>
      </div>
    </div>
  );
}
