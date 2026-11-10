// 概要入力（SC-10）の項目の定義。項目の並び・ラベル・説明文・入力欄の行数を、ここ 1 か所に置く。
// 概要の項目は H-37 の先行方針（L2）で、決定行がまだ無い（あとで変わりうる）。変わったら、このファイルを直す（フォームは、この一覧を回して描く）。
// 使用技術を「一覧から選ぶ形＋その他」にする（decisions.md 2026-10-22・T-3）ときも、techStack の項目をここで差し替える。
// 自由な欄の最大数（MAX_EXTRA_SECTIONS）は、値の規則を持つデータ層（lib/data/summaries.ts）の定数。画面は、サーバーから受けて使う（ここには写さない）。

export type CoreFieldKey = "introduction" | "workOverview" | "techStack" | "closing";

export type SummaryField =
  | { kind: "text"; key: CoreFieldKey; label: string; hint?: string; rows: number }
  // 自由な欄（見出し＋本文）を並べる位置。
  | { kind: "extras" };

// 欄の並びは、概要集の節の並び（05 の 5-2-3：はじめに・作品概要・自由な欄・開発環境・終わりに）に合わせる。
export const SUMMARY_FIELDS: SummaryField[] = [
  { kind: "text", key: "introduction", label: "はじめに", hint: "課題・背景・目的。なぜこの制作に取り組んだのかを書いてください。", rows: 3 },
  { kind: "text", key: "workOverview", label: "作品概要", hint: "どんな作品かを書いてください。", rows: 4 },
  { kind: "extras" },
  { kind: "text", key: "techStack", label: "開発環境", hint: "使用技術・開発環境を書いてください。アーカイブ検索の対象になります。", rows: 2 },
  { kind: "text", key: "closing", label: "終わりに", hint: "今後の課題・意気込み。", rows: 3 },
];

// 自由な欄の見出し・本文のラベルと説明文。
export const EXTRA_HEADING_HINT = "チームで決める見出しです（例：機能一覧、画面の構成）。";
export const extraHeadingLabel = (n: number) => `自由な欄 ${n} の見出し`;
export const extraBodyLabel = (n: number) => `自由な欄 ${n} の本文`;
