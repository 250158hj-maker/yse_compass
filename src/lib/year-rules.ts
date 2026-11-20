// クラス名の長さの上限（文字数）。design/06-data.md には上限が無く、著者（蒲山）の判断で置いた値（PR のレビュー推奨への対応・2026-11-19）。
// 画面（maxLength）とデータ層（lib/data/years.ts）が同じ値を見るために、サーバー専用の依存の無いこのファイルに置く。
export const MAX_CLASS_NAME_LENGTH = 50;
