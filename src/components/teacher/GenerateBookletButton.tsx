"use client";

import { useState } from "react";
import { PrintButton } from "@/components/ui/PrintButton";

/** SC-11 の生成トリガー。未提出チームがある場合は警告→了承でスキップして生成する。 */
export function GenerateBookletButton({ missingCount }: { missingCount: number }) {
  const [acknowledged, setAcknowledged] = useState(missingCount === 0);

  if (!acknowledged) {
    return (
      <button
        type="button"
        onClick={() => setAcknowledged(true)}
        className="rounded-full border border-brand-orange px-4 py-1.5 text-sm font-semibold text-brand-orange hover:bg-brand-orange/5"
      >
        {missingCount}チーム未提出のまま生成する
      </button>
    );
  }

  return <PrintButton />;
}
