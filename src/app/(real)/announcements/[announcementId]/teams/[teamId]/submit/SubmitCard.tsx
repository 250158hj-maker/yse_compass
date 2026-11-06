"use client";

import { useState } from "react";
import { Badge, LateBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { submitMaterialAction } from "@/lib/actions/submissions";
import { useSubmissionAction } from "./use-submission-action";

// サーバー側で、日時は文字にし、テンプレートはリンクにしてよいものだけを渡す（画面では、時刻の比較も URL の判定もしない）。
export type SlotView = {
  id: number;
  slotType: string;
  isRequired: boolean;
  deadlineText: string | null;
  templateUrl: string | null;
  submission: { url: string; firstSubmittedText: string; isLate: boolean } | null;
  // 未提出で、いま提出すると遅延になる（関数が返す値）。
  warnLate: boolean;
};

// 資料枠 1 つの提出・差し替え（SC-09）。リンクの形式の確認は、関数が行う（画面では確認しない）。
export function SubmitCard({ teamId, slot }: { teamId: number; slot: SlotView }) {
  const { run, pending, error } = useSubmissionAction();
  const [url, setUrl] = useState(slot.submission?.url ?? "");
  // 完了の表示。押した時点の「初回か差し替えか」で文言を決めて持つ（成功のあとの読み込み直しで、提出済みに変わっても、文言を変えない）。
  const [done, setDone] = useState<string | null>(null);
  const submitted = slot.submission !== null;
  const inputId = `url-${slot.id}`;

  return (
    <Card className="shadow-sm shadow-slate-900/5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{slot.slotType}</p>
            <Badge tone={slot.isRequired ? "rose" : "slate"}>{slot.isRequired ? "必須" : "任意"}</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">締切 {slot.deadlineText ?? "未設定"}</p>
          {slot.templateUrl && (
            <a href={slot.templateUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-brand-600 hover:underline">
              テンプレートを開く →
            </a>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1">
          <StatusBadge status={submitted ? "提出済み" : "未提出"} />
          {slot.submission?.isLate && <LateBadge />}
        </span>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setDone(null);
          const doneText = submitted ? "リンクを保存しました。" : "提出しました。";
          run(() => submitMaterialAction(teamId, slot.id, url), () => setDone(doneText));
        }}
      >
        <FormField
          label="資料のリンク(Google Drive 等)"
          htmlFor={inputId}
          error={error ?? undefined}
          hint="URLの形式のみ検証します。リンク先の閲覧権限は別途ご確認ください。"
        >
          <input
            id={inputId}
            type="url"
            className={fieldClassName}
            placeholder="https://docs.google.com/..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setDone(null);
            }}
          />
        </FormField>
        {slot.submission && <p className="mb-3 text-xs text-slate-400">初回提出 {slot.submission.firstSubmittedText}</p>}
        {slot.warnLate && (
          <div className="mb-3">
            <InlineNotice tone="warning">締切を過ぎているため、提出すると遅延として記録されます。</InlineNotice>
          </div>
        )}
        {done && !error && (
          <div className="mb-3">
            <InlineNotice tone="info">{done}</InlineNotice>
          </div>
        )}
        <Button type="submit" variant="primary" disabled={pending}>
          {submitted ? "差し替える" : "提出する"}
        </Button>
      </form>
    </Card>
  );
}
