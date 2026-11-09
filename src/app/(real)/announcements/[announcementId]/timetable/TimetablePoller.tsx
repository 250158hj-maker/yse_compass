"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 一定の間隔で、サーバー側の表示を読み直す（04 の SC-07：伝播はポーリング。更新ボタンは置かない）。
// 間隔の値は未決（open-questions.md §5 の保留）。ここは仮の値で、決まったら intervalMs を渡す側で直す。タブが隠れている間は読み直さない。
export function TimetablePoller({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
