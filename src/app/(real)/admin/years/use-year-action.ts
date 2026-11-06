"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { YearActionResult } from "@/lib/actions/years";
import { yearErrorMessage } from "@/lib/year-messages";

// Server Action を呼んで、失敗したら日本語のメッセージにする。成功したらサーバー側の表示を読み込み直す。
export function useYearAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(action: () => Promise<YearActionResult<T>>, onSuccess?: (data: T) => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(yearErrorMessage(result.code));
        return;
      }
      setError(null);
      onSuccess?.(result.data);
      router.refresh();
    });
  }

  return { run, pending, error };
}
