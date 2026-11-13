"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { saveSummaryAction } from "@/lib/actions/submissions";
import {
  EXTRA_HEADING_HINT,
  SUMMARY_FIELDS,
  extraBodyLabel,
  extraHeadingLabel,
  type CoreFieldKey,
} from "@/lib/summary-fields";
import { SummaryPreview, type PreviewHeader } from "./SummaryPreview";
import { useSummaryAction } from "./use-summary-action";

export type SummaryInitial = Record<CoreFieldKey, string> & {
  extraSections: { heading: string; body: string }[];
};

type ExtraRow = { key: number; heading: string; body: string };

// 概要入力（SC-10）。項目の並び・ラベル・説明文は lib/summary-fields.ts の一覧（H-37 の先行方針〔L2〕。あとで変わりうるので 1 か所に置く）を回して描く。
// 空の欄の扱い・自由な欄の見出しの確認・全部が空のときの拒否は、関数が行う（画面では判定しない）。自由な欄を足せる最大数だけ、サーバーから受けて、足すボタンを出し分ける。
export function SummaryForm({
  teamId,
  occasionId,
  maxExtraSections,
  initial,
  submitted,
  previewHeader,
}: {
  teamId: number;
  occasionId: number;
  maxExtraSections: number;
  initial: SummaryInitial;
  submitted: boolean;
  previewHeader: PreviewHeader;
}) {
  const { run, pending, error, clearError } = useSummaryAction();
  const [core, setCore] = useState<Record<CoreFieldKey, string>>({
    introduction: initial.introduction,
    workOverview: initial.workOverview,
    techStack: initial.techStack,
    closing: initial.closing,
  });
  const [extras, setExtras] = useState<ExtraRow[]>(() => initial.extraSections.map((s, i) => ({ key: i + 1, ...s })));
  const [nextKey, setNextKey] = useState(initial.extraSections.length + 1);
  // 完了の表示。押した時点の「初回か更新か」で文言を決めて持つ（成功のあとの読み込み直しで、提出済みに変わっても、文言を変えない）。
  const [done, setDone] = useState<string | null>(null);

  function edited() {
    setDone(null);
    clearError();
  }

  return (
    <>
    <form
      className="mt-6 flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(null);
        const doneText = submitted ? "概要を更新しました。" : "概要を提出しました。";
        run(
          () =>
            saveSummaryAction(teamId, occasionId, {
              ...core,
              extraSections: extras.map((x) => ({ heading: x.heading, body: x.body })),
            }),
          () => setDone(doneText),
        );
      }}
    >
      {SUMMARY_FIELDS.map((f) => {
        if (f.kind === "text") {
          return (
            <FormField key={f.key} label={f.label} htmlFor={f.key} hint={f.hint}>
              <textarea
                id={f.key}
                rows={f.rows}
                className={fieldClassName}
                value={core[f.key]}
                onChange={(e) => {
                  setCore({ ...core, [f.key]: e.target.value });
                  edited();
                }}
              />
            </FormField>
          );
        }
        return (
          <div key="extras" className="flex flex-col">
            {extras.map((x, i) => (
              <Card key={x.key} className="mb-4">
                <FormField label={extraHeadingLabel(i + 1)} htmlFor={`extra-heading-${x.key}`} hint={EXTRA_HEADING_HINT}>
                  <input
                    id={`extra-heading-${x.key}`}
                    className={fieldClassName}
                    value={x.heading}
                    onChange={(e) => {
                      setExtras(extras.map((r) => (r.key === x.key ? { ...r, heading: e.target.value } : r)));
                      edited();
                    }}
                  />
                </FormField>
                <FormField label={extraBodyLabel(i + 1)} htmlFor={`extra-body-${x.key}`}>
                  <textarea
                    id={`extra-body-${x.key}`}
                    rows={4}
                    className={fieldClassName}
                    value={x.body}
                    onChange={(e) => {
                      setExtras(extras.map((r) => (r.key === x.key ? { ...r, body: e.target.value } : r)));
                      edited();
                    }}
                  />
                </FormField>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setExtras(extras.filter((r) => r.key !== x.key));
                    edited();
                  }}
                >
                  この欄を消す
                </Button>
              </Card>
            ))}
            {extras.length < maxExtraSections && (
              <div className="mb-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setExtras([...extras, { key: nextKey, heading: "", body: "" }]);
                    setNextKey(nextKey + 1);
                    edited();
                  }}
                >
                  自由な欄を足す
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <div className="mb-3">
          <InlineNotice tone="danger">{error}</InlineNotice>
        </div>
      )}
      {done && !error && (
        <div className="mb-3">
          <InlineNotice tone="info">{done}</InlineNotice>
        </div>
      )}
      <Button type="submit" variant="primary" className="self-start" disabled={pending}>
        {submitted ? "概要を更新する" : "概要を提出する"}
      </Button>
    </form>
    <SummaryPreview header={previewHeader} core={core} extras={extras.map((x) => ({ heading: x.heading, body: x.body }))} />
    </>
  );
}
