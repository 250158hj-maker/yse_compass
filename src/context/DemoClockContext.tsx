"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_DEMO_CLOCK_PRESET_ID,
  DEMO_CLOCK_PRESETS,
  getDemoClockPreset,
  isDemoClockPresetId,
  type DemoClockPreset,
  type DemoClockPresetId,
} from "@/lib/demo/clock";
import { readStorage, removeStorage, writeStorage } from "@/lib/demo/storage";

// デモ用の「いま」を 1 か所に持つ。先生の筋の導出(lib/demo/teacher-derived.ts)はここだけを時刻の源にし、
// 本物の時計は読まない。時刻は止まっていて、帯(DemoClockBar)のプリセットを押したときだけ進む・戻る。

const STORAGE_KEY = "yse-compass-demo-clock-v1";

type DemoClockContextValue = {
  // いま(ミリ秒)。導出関数にはこれを渡す。
  nowMs: number;
  // いま(ISO 8601・+09:00)。状態に「いつの操作か」を記録するときに使う。
  nowIso: string;
  presetId: DemoClockPresetId;
  presets: DemoClockPreset[];
  setPreset: (id: DemoClockPresetId) => void;
  // 既定(場面 1)に戻す。
  resetClock: () => void;
};

const DemoClockContext = createContext<DemoClockContextValue | null>(null);

export function DemoClockProvider({ children }: { children: React.ReactNode }) {
  const [presetId, setPresetId] = useState<DemoClockPresetId>(DEFAULT_DEMO_CLOCK_PRESET_ID);

  useEffect(() => {
    // SessionContext と同じく、初回描画は既定値でサーバーと揃え、マウント後に保存値へ反映する。
    const stored = readStorage(STORAGE_KEY, isDemoClockPresetId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setPresetId(stored);
  }, []);

  function setPreset(id: DemoClockPresetId) {
    setPresetId(id);
    writeStorage(STORAGE_KEY, id);
  }

  function resetClock() {
    setPresetId(DEFAULT_DEMO_CLOCK_PRESET_ID);
    removeStorage(STORAGE_KEY);
  }

  const preset = getDemoClockPreset(presetId);
  const value: DemoClockContextValue = {
    nowMs: new Date(preset.at).getTime(),
    nowIso: preset.at,
    presetId,
    presets: DEMO_CLOCK_PRESETS,
    setPreset,
    resetClock,
  };

  return <DemoClockContext.Provider value={value}>{children}</DemoClockContext.Provider>;
}

export function useDemoClock(): DemoClockContextValue {
  const ctx = useContext(DemoClockContext);
  if (!ctx) {
    throw new Error("useDemoClock must be used within a DemoClockProvider");
  }
  return ctx;
}
