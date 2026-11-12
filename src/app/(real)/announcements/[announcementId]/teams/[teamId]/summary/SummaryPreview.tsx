import { SUMMARY_FIELDS, type CoreFieldKey } from "@/lib/summary-fields";

export type PreviewHeader = {
  // 作品名。未設定のときはチーム名（05 の 5-2-2：作品名の位置にチーム名を出す）。
  title: string;
  className: string;
  teamName: string;
  memberNames: string[];
};

// 概要集の 1 ページの形（05 の 5-2-1〜5-2-3。仮置き）で、入力した本文を見せるプレビュー（04 の SC-10「統一レイアウトでのプレビュー」）。
// HTML で組む。提出のときの 1 ページの判定は、しない（水戸さんの決定案 #274 の ①：12/18 の範囲から外す）。
// 色は黒と灰だけ（5-2-1：そのまま複写して配るので）。節の並びは SUMMARY_FIELDS（lib/summary-fields.ts）をそのまま使う。
// 入力のない節は出さない（芯の欄が空のときの出し方は未決：open-questions.md H-69 ④。SC-12 の概要の表示と同じ扱いで、仮置き）。
export function SummaryPreview({
  header,
  core,
  extras,
}: {
  header: PreviewHeader;
  core: Record<CoreFieldKey, string>;
  extras: { heading: string; body: string }[];
}) {
  const sections = SUMMARY_FIELDS.flatMap((f) => {
    if (f.kind === "text") return [{ heading: f.label, body: core[f.key] }];
    return extras.map((x) => ({ heading: x.heading.trim(), body: x.body }));
  }).filter((s) => s.body.trim() !== "");

  return (
    <section className="mt-8" aria-label="プレビュー">
      <h2 className="text-sm font-semibold text-slate-900">
        プレビュー <span className="font-normal text-slate-500">（概要集では、このように載ります）</span>
      </h2>
      <p className="mt-1 text-xs text-slate-500">入力に合わせて更新されます。実際の紙面とは、折り返しの位置が少し違います。</p>
      <div className="mt-3 border border-slate-300 bg-white px-6 py-5 text-[13px] leading-[1.7] text-slate-800 shadow-sm">
        <p className="text-center text-lg font-bold text-slate-900">{header.title}</p>
        <div className="mt-1 text-right text-xs text-slate-700">
          <p>{header.className}</p>
          <p>{header.teamName}</p>
          <p>{header.memberNames.join("・")}</p>
        </div>
        <div className="mt-2 border-t-2 border-slate-700" />
        {sections.length === 0 ? (
          <p className="mt-4 text-slate-400">入力すると、ここに表示されます。</p>
        ) : (
          sections.map((s, i) => (
            <div key={i} className="mt-3">
              <h3 className="border-b border-slate-300 pb-0.5 text-sm font-bold text-slate-900">{s.heading}</h3>
              <p className="mt-1 whitespace-pre-wrap break-words">{s.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
