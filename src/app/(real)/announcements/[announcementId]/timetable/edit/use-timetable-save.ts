"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setDisplayOrdersAction, type TimetableActionResult } from "@/lib/actions/timetable";
import type { DisplayOrderUpdate } from "@/lib/data/timetable";
import { timetableErrorMessage } from "@/lib/timetable-messages";

// 04 の SC-08：サーバーが並び替えの保存を拒否したときの文言（「発表中」が設定されている間は、並び替えを保存できない）。
const LOCKED_MESSAGE = "発表中のため、並び替えを保存できませんでした。当日の入れ替えは「当日進行」の画面で行ってください。";

// 発表順を保存する Server Action を呼んで、失敗したら日本語のメッセージにする。成功しても失敗しても、サーバー側の表示を読み込み直す。
export function useTimetableSave(occasionId: number) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(updates: DisplayOrderUpdate[], onSuccess: () => void, onFailure: () => void) {
    startTransition(async () => {
      const result: TimetableActionResult<unknown> = await setDisplayOrdersAction(occasionId, updates);
      if (!result.ok) {
        setError(result.code === "presentation_locked" ? LOCKED_MESSAGE : timetableErrorMessage(result.code));
        onFailure();
      } else {
        setError(null);
        onSuccess();
      }
      router.refresh();
    });
  }

  return { save, pending, error, clearError: () => setError(null) };
}
