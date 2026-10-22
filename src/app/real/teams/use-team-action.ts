"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TeamActionResult } from "@/lib/actions/teams";
import { teamErrorMessage } from "@/lib/team-messages";

// Server Action を呼んで、失敗したら日本語のメッセージにする。成功したらサーバー側の表示を読み込み直す。
// 成功のあとに別の画面へ移るとき（refresh: false）は読み込み直さない。移動の直後に今の画面を読み込み直すと、移動が打ち消される。
export function useTeamAction({ refresh = true }: { refresh?: boolean } = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(action: () => Promise<TeamActionResult<T>>, onSuccess?: (data: T) => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(teamErrorMessage(result.code));
        return;
      }
      setError(null);
      onSuccess?.(result.data);
      if (refresh) router.refresh();
    });
  }

  return { run, pending, error };
}
