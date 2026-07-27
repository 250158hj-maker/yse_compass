"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { isValidSubmissionUrl, type TeamSubmissionRow } from "@/lib/mock-data";

/** SC-09 資料提出フォーム。実体レス原則によりリンク登録のみ（ファイルアップロードは持たない）。 */
export function SubmissionSlotCard({ row }: { row: TeamSubmissionRow }) {
  const { slot, status } = row;
  const deadlinePassed = status === "期限切れ";

  const [linkUrl, setLinkUrl] = useState(row.linkUrl ?? "");
  const [saved, setSaved] = useState(Boolean(row.linkUrl));
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(row.linkUrl ?? "");

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{slot.kind}</h3>
          <p className="text-sm text-gray-500">締切: {slot.deadline}</p>
        </div>
        <StatusBadge status={saved ? "提出済み" : status} />
      </div>

      {deadlinePassed && (
        <p className="mt-3 text-sm text-brand-orange">
          締切を過ぎています。提出・差し替えはできますが、遅延として記録されます。
        </p>
      )}

      {saved ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm">
          <a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-brand-blue hover:underline"
          >
            {linkUrl}
          </a>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => {
                setDraft(linkUrl);
                setSaved(false);
              }}
              className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
            >
              差し替える
            </button>
          </div>
        </div>
      ) : (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isValidSubmissionUrl(draft)) {
              setError("URL の形式で入力してください（例: https://drive.google.com/...）");
              return;
            }
            setError(null);
            setLinkUrl(draft);
            setSaved(true);
          }}
        >
          <div className="flex-1">
            <input
              type="text"
              required
              placeholder="資料へのリンク（例: Google Drive の共有URL）"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <button
            type="submit"
            className="h-fit rounded-full bg-brand-teal px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            登録する
          </button>
        </form>
      )}
    </Card>
  );
}
