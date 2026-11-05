// 日時は絶対時刻で保存し、日本時間で表示する（decisions.md 2026-10-20・H-39 の決着）。timeZone を明示するのは、
// 実行環境のタイムゾーン（サーバーの TZ・閲覧者の端末）に表示を依らせないため。
const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// ホームのダッシュボードなど、年を省いて月/日だけ簡潔に表示したい箇所向け。
export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso));
}

// formatShortDate に時刻を添えたもの(例「10/14 23:59」)。生徒のホームの直近の締切で使う。
export function formatShortDateTime(iso: string): string {
  return shortDateTimeFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

// 開催日（event_date）は date 型で、タイムゾーンを持たない。Date の UTC の日付をそのまま読んで、実行環境や日本時間への変換で日付がずれないようにする。
// 絶対時刻（締切など）は、上の日本時間の整形を使う。
const occasionDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatOccasionDate(date: Date): string {
  return occasionDateFormatter.format(date);
}
