import { describe, expect, it } from "vitest";
import { fromJstInputValue, toJstInputValue } from "./jst-datetime";

// 締切の入力欄（日本時間）と、保存する絶対時刻の変換。実行環境のタイムゾーンに依らない（固定の +09:00）。
describe("toJstInputValue", () => {
  it("絶対時刻を、日本時間の入力欄の値にする", () => {
    expect(toJstInputValue("2026-12-10T09:00:00.000Z")).toBe("2026-12-10T18:00");
  });
  it("日付をまたぐ時刻は、日本時間の日付で出す（UTC の 20:30 は、翌日の 05:30）", () => {
    expect(toJstInputValue("2026-12-10T20:30:00.000Z")).toBe("2026-12-11T05:30");
  });
  it("未設定・読めない値は空にする", () => {
    expect(toJstInputValue(null)).toBe("");
    expect(toJstInputValue("")).toBe("");
    expect(toJstInputValue("x")).toBe("");
  });
});

describe("fromJstInputValue", () => {
  it("日本時間の入力欄の値を、絶対時刻にする", () => {
    expect(fromJstInputValue("2026-12-10T18:00")?.toISOString()).toBe("2026-12-10T09:00:00.000Z");
  });
  it("日付をまたぐ時刻は、前日の UTC になる（日本時間の 05:30 は、前日の 20:30）", () => {
    expect(fromJstInputValue("2026-12-11T05:30")?.toISOString()).toBe("2026-12-10T20:30:00.000Z");
  });
  it("空は null（未設定）", () => {
    expect(fromJstInputValue("")).toBeNull();
  });
  it("形が合わない値は、無効な Date になる", () => {
    expect(Number.isNaN(fromJstInputValue("x")?.getTime())).toBe(true);
  });
  it("往復しても、同じ値に戻る", () => {
    for (const v of ["2026-01-01T00:00", "2026-12-31T23:59", "2026-12-10T18:00"]) {
      expect(toJstInputValue(fromJstInputValue(v)?.toISOString() ?? null)).toBe(v);
    }
  });
  it("実行環境のタイムゾーンに依らない", () => {
    const original = process.env.TZ;
    try {
      for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
        process.env.TZ = tz;
        expect(fromJstInputValue("2026-12-10T18:00")?.toISOString()).toBe("2026-12-10T09:00:00.000Z");
      }
    } finally {
      process.env.TZ = original;
    }
  });
});
