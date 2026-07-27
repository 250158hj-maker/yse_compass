"use client";

import { useState } from "react";
import type { PublicConsentStatus } from "@/lib/mock-data";

const options: PublicConsentStatus[] = ["未設定", "許可", "拒否"];

const styles: Record<PublicConsentStatus, string> = {
  未設定: "bg-gray-100 text-gray-600 ring-gray-300",
  許可: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  拒否: "bg-red-50 text-red-700 ring-red-300",
};

/** SC-14／SC-18 で共用する公開許可の設定コントロール。データ削除は行わない（表示制御のみ）。 */
export function PublicConsentControl({ initial }: { initial: PublicConsentStatus }) {
  const [status, setStatus] = useState<PublicConsentStatus>(initial);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setStatus(option)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
            status === option ? styles[option] : "bg-white text-gray-400 ring-gray-200 hover:ring-gray-300"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
