import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vitest.config.mts が TZ を日本時間に固定しているので、そのままでは「実行環境の TZ に依らない」ことを確かめられない。
// TZ を日本時間と違う値に変えてから読み込み直し、表示が日本時間のままであることを確かめる。
const original = process.env.TZ;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env.TZ = original;
});

// 2026-10-20 15:00 UTC は、日本時間では 2026-10-21 00:00（日付をまたぐので、TZ の違いが日付にも出る）。
const instant = "2026-10-20T15:00:00Z";

describe.each(["UTC", "America/Los_Angeles", "Asia/Tokyo"])("日時の整形は実行環境の TZ（%s）に依らず日本時間", (tz) => {
  it("日付・日時・短い形", async () => {
    process.env.TZ = tz;
    const { formatDate, formatDateTime, formatShortDate, formatShortDateTime } = await import("@/lib/format");
    expect(formatDate(instant)).toBe("2026年10月21日");
    expect(formatDateTime(instant)).toBe("2026年10月21日 00:00");
    expect(formatShortDate(instant)).toBe("10/21");
    expect(formatShortDateTime(instant)).toBe("10/21 00:00");
  });
});
