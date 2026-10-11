const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
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
