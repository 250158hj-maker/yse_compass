"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { saveSummaryAction } from "@/lib/actions/submissions";
import { useSummaryAction } from "./use-summary-action";

export type SummaryInitial = {
  introduction: string;
  workOverview: string;
  techStack: string;
  closing: string;
  extraSections: { heading: string; body: string }[];
};

type ExtraRow = { key: number; heading: string; body: string };

// 概要入力（SC-10）。項目は、H-37 の先行方針（L2）のとおり、芯の 4 項目（はじめに・作品概要・開発環境・終わりに）と、チームが見出しを付ける自由な欄。
// 空の欄の扱い・自由な欄の見出しの確認・全部が空のときの拒否は、関数が行う（画面では判定しない）。自由な欄を足せる最大数だけ、サーバーから受けて、足すボタンを出し分ける。
export function SummaryForm({
  teamId,
  occasionId,
  maxExtraSections,
  initial,
  submitted,
}: {
  teamId: number;
  occasionId: number;
  maxExtraSections: number;
  initial: SummaryInitial;
  submitted: boolean;
}) {
  const { run, pending, error } = useSummaryAction();
  const [introduction, setIntroduction] = useState(initial.introduction);
  const [workOverview, setWorkOverview] = useState(initial.workOverview);
  const [techStack, setTechStack] = useState(initial.techStack);
  const [closing, setClosing] = useState(initial.closing);
  const [extras, setExtras] = useState<ExtraRow[]>(() => initial.extraSections.map((s, i) => ({ key: i + 1, ...s })));
  const [nextKey, setNextKey] = useState(initial.extraSections.length + 1);
  // 完了の表示。押した時点の「初回か更新か」で文言を決めて持つ（成功のあとの読み込み直しで、提出済みに変わっても、文言を変えない）。
  const [done, setDone] = useState<string | null>(null);

  function edited() {
    setDone(null);
  }

  return (
    <form
      className="mt-6 flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(null);
        const doneText = submitted ? "概要を更新しました。" : "概要を提出しました。";
        run(
          () =>
            saveSummaryAction(teamId, occasionId, {
              introduction,
              workOverview,
              techStack,
              closing,
              extraSections: extras.map((x) => ({ heading: x.heading, body: x.body })),
            }),
          () => setDone(doneText),
        );
      }}
    >
      <FormField label="はじめに" htmlFor="introduction" hint="課題・背景・目的。なぜこの制作に取り組んだのかを書いてください。">
        <textarea
          id="introduction"
          rows={3}
          className={fieldClassName}
          value={introduction}
          onChange={(e) => {
            setIntroduction(e.target.value);
            edited();
          }}
        />
      </FormField>

      <FormField label="作品概要" htmlFor="workOverview" hint="どんな作品かを書いてください。">
        <textarea
          id="workOverview"
          rows={4}
          className={fieldClassName}
          value={workOverview}
          onChange={(e) => {
            setWorkOverview(e.target.value);
            edited();
          }}
        />
      </FormField>

      {extras.map((x, i) => (
        <Card key={x.key} className="mb-4">
          <FormField label={`自由な欄 ${i + 1} の見出し`} htmlFor={`extra-heading-${x.key}`} hint="チームで決める見出しです（例：機能一覧、画面の構成）。">
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
          <FormField label={`自由な欄 ${i + 1} の本文`} htmlFor={`extra-body-${x.key}`}>
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

      <FormField label="開発環境" htmlFor="techStack" hint="使用技術・開発環境を書いてください。アーカイブ検索の対象になります。">
        <textarea
          id="techStack"
          rows={2}
          className={fieldClassName}
          value={techStack}
          onChange={(e) => {
            setTechStack(e.target.value);
            edited();
          }}
        />
      </FormField>

      <FormField label="終わりに" htmlFor="closing" hint="今後の課題・意気込み。">
        <textarea
          id="closing"
          rows={3}
          className={fieldClassName}
          value={closing}
          onChange={(e) => {
            setClosing(e.target.value);
            edited();
          }}
        />
      </FormField>

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
  );
}
