// 提出フォームでの検証は形式チェックのみ。アクセス可否は検証しない(要件定義書 §3-4)。
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
