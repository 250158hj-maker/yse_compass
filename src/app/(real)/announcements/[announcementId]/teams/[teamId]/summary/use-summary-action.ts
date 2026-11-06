"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SubmissionActionResult } from "@/lib/actions/submissions";
import { summaryErrorMessage } from "@/lib/summary-messages";

// Server Action を呼んで、失敗したら日本語のメッセージにする。成功したらサーバー側の表示を読み込み直す。
export function useSummaryAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(action: () => Promise<SubmissionActionResult<T>>, onSuccess?: (data: T) => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(summaryErrorMessage(result.code));
        return;
      }
      setError(null);
      onSuccess?.(result.data);
      router.refresh();
    });
  }

  return { run, pending, error };
}
