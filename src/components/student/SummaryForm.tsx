"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import type { SummaryFormEntry } from "@/lib/mock-data";

interface FormFields {
  background: string;
  kiKetsu: string;
  onePageDigest: string;
  techUsed: string;
}

const emptyFields: FormFields = { background: "", kiKetsu: "", onePageDigest: "", techUsed: "" };

/** SC-10 概要入力フォーム。§7-4 の評価観点を焼き込んだ構造化フォーム（統一レイアウトは1種類のみ）。 */
export function SummaryForm({
  deadline,
  deadlinePassed,
  initialEntry,
}: {
  deadline: string;
  deadlinePassed: boolean;
  initialEntry: SummaryFormEntry | undefined;
}) {
  const [fields, setFields] = useState<FormFields>(
    initialEntry
      ? {
          background: initialEntry.background,
          kiKetsu: initialEntry.kiKetsu,
          onePageDigest: initialEntry.onePageDigest,
          techUsed: initialEntry.techUsed,
        }
      : emptyFields
  );
  const [submittedAt, setSubmittedAt] = useState<string | null>(initialEntry?.submittedAt ?? null);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">入力</h2>
          <StatusBadge status={submittedAt ? "提出済み" : deadlinePassed ? "期限切れ" : "未提出"} />
        </div>
        <p className="mt-1 text-xs text-gray-400">締切: {deadline}</p>
        {deadlinePassed && !submittedAt && (
          <p className="mt-2 text-sm text-brand-orange">締切を過ぎています。提出はできますが、遅延として記録されます。</p>
        )}

        <form
          className="mt-3 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedAt(new Date().toISOString().slice(0, 10));
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">背景・動機</label>
            <textarea
              required
              rows={3}
              value={fields.background}
              onChange={(e) => setFields({ ...fields, background: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">起・結</label>
            <textarea
              required
              rows={3}
              value={fields.kiKetsu}
              onChange={(e) => setFields({ ...fields, kiKetsu: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">1ページ集約</label>
            <textarea
              required
              rows={4}
              value={fields.onePageDigest}
              onChange={(e) => setFields({ ...fields, onePageDigest: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">使用技術</label>
            <input
              type="text"
              required
              placeholder="例: Next.js, Firebase"
              value={fields.techUsed}
              onChange={(e) => setFields({ ...fields, techUsed: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">アーカイブ検索の対象になります。</p>
          </div>
          <button
            type="submit"
            className="w-fit rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {submittedAt ? "上書き保存する" : "提出する"}
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold text-gray-900">プレビュー（統一レイアウト）</h2>
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400">背景・動機</p>
            <p className="whitespace-pre-wrap text-gray-800">{fields.background || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400">起・結</p>
            <p className="whitespace-pre-wrap text-gray-800">{fields.kiKetsu || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400">1ページ集約</p>
            <p className="whitespace-pre-wrap text-gray-800">{fields.onePageDigest || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400">使用技術</p>
            <p className="text-gray-800">{fields.techUsed || "—"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
