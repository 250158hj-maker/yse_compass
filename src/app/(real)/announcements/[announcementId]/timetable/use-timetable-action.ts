"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TimetableActionResult } from "@/lib/actions/timetable";
import { timetableErrorMessage } from "@/lib/timetable-messages";

// Server Action を呼んで、失敗したら日本語のメッセージにする。成功しても失敗しても、サーバー側の表示を読み込み直す
// （失敗のときは、画面で先に動かした並びを、サーバーの並びに戻す）。
export function useTimetableAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(action: () => Promise<TimetableActionResult<T>>, onFailure?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(timetableErrorMessage(result.code));
        onFailure?.();
      } else {
        setError(null);
      }
      router.refresh();
    });
  }

  return { run, pending, error };
}
