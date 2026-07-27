"use client";

import { useState } from "react";

/** SC-04 の公開ボタン。発表会単位の一括公開のみで、チーム単位の出し分けは持たない（2026-07-26 決定）。 */
export function PublishEventButton({ initialPublished }: { initialPublished: boolean }) {
  const [published, setPublished] = useState(initialPublished);

  return (
    <button
      type="button"
      onClick={() => setPublished((prev) => !prev)}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        published
          ? "border border-gray-300 text-gray-700 hover:border-gray-400"
          : "bg-brand-blue text-white hover:bg-brand-cyan"
      }`}
    >
      {published ? "公開を解除する" : "この発表会を公開する"}
    </button>
  );
}
