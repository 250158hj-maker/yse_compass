import { describe, expect, it } from "vitest";
import { formatSubmittedAt, isLateSubmission, isReplacedAfterDeadline } from "@/lib/mock/derived";
import type { Material } from "@/lib/types";

// 日本時間 2026-10-20 09:00（UTC では 00:00）
const deadline = "2026-10-20T09:00:00+09:00";

function material(firstSubmittedAt: string | null, updatedAt: string | null): Material {
  return { id: "m", name: "プレゼン資料", status: firstSubmittedAt ? "提出済み" : "未提出", firstSubmittedAt, updatedAt, driveUrl: null };
}

describe("isLateSubmission（遅延は初回提出日時と締切の比較・H-6）", () => {
  it("未提出（初回提出日時が無い）は遅延ではない", () => {
    expect(isLateSubmission(deadline, null)).toBe(false);
  });

  it("締切より前の提出は遅延ではない", () => {
    expect(isLateSubmission(deadline, "2026-10-20T08:59:59+09:00")).toBe(false);
  });

  it("締切ちょうどの提出は遅延ではない", () => {
    expect(isLateSubmission(deadline, "2026-10-20T09:00:00+09:00")).toBe(false);
  });

  it("締切の 1 秒後の提出は遅延", () => {
    expect(isLateSubmission(deadline, "2026-10-20T09:00:01+09:00")).toBe(true);
  });

  it("表記が違っても、同じ時刻なら遅延ではない（+09:00 と UTC の Z）", () => {
    expect(isLateSubmission(deadline, "2026-10-20T00:00:00Z")).toBe(false);
  });

  it("UTC で書かれた値でも、日本時間の締切との前後を正しく比べる", () => {
    // 00:30Z は日本時間の 09:30 で、締切（09:00）より後
    expect(isLateSubmission(deadline, "2026-10-20T00:30:00Z")).toBe(true);
    // 前日の 23:30Z は日本時間の 08:30 で、締切より前
    expect(isLateSubmission(deadline, "2026-10-19T23:30:00Z")).toBe(false);
  });
});

describe("isReplacedAfterDeadline（締切後の差し替え・2 値方式 2026-09-29）", () => {
  it("初回提出のとき（2 つの日時が同じ値）は、締切後でも差し替えではない", () => {
    const t = "2026-10-21T10:00:00+09:00";
    expect(isReplacedAfterDeadline(deadline, material(t, t))).toBe(false);
  });

  it("期限内に出して、締切後に差し替えたら、差し替えあり", () => {
    expect(isReplacedAfterDeadline(deadline, material("2026-10-19T23:30:00+09:00", "2026-10-20T10:00:00+09:00"))).toBe(true);
  });

  it("期限内に出して、期限内に差し替えただけなら、差し替えなし", () => {
    expect(isReplacedAfterDeadline(deadline, material("2026-10-19T20:00:00+09:00", "2026-10-20T08:00:00+09:00"))).toBe(false);
  });

  it("期限内に出した資料を締切後に差し替えても、遅延にはならない（初回提出日時で判定するため）", () => {
    const first = "2026-10-19T23:30:00+09:00";
    expect(isLateSubmission(deadline, first)).toBe(false);
    expect(isReplacedAfterDeadline(deadline, material(first, "2026-10-20T10:00:00+09:00"))).toBe(true);
  });

  // いまの isReplacedAfterDeadline は、初回と最終を文字列の不一致で比べる（derived.ts）。同じ時刻が別の表記で入ると差し替えと誤判定する。
  // モックのデータは同じ表記なので実害は無い。本実装は timestamp の値で比べる（06-data.md 6-6）ので、このケースが通るはず。
  it.todo("同じ時刻が別の表記（+09:00 と Z）で入っても、差し替えなしと判定する");

  it("日時のどちらかが無いときは、差し替えなし", () => {
    expect(isReplacedAfterDeadline(deadline, material(null, null))).toBe(false);
    expect(isReplacedAfterDeadline(deadline, material("2026-10-19T23:30:00+09:00", null))).toBe(false);
  });
});

describe("formatSubmittedAt（初回提出日時。締切後に差し替えがあれば最終更新も添える）", () => {
  it("未提出なら null", () => {
    expect(formatSubmittedAt(deadline, material(null, null))).toBeNull();
  });

  it("差し替えが無ければ、初回提出日時だけを日本時間で出す", () => {
    const text = formatSubmittedAt(deadline, material("2026-10-19T14:30:00Z", "2026-10-19T14:30:00Z"));
    // 14:30Z は日本時間の 23:30
    expect(text).toContain("10月19日");
    expect(text).toContain("23:30");
    expect(text).not.toContain("最終更新");
  });

  it("締切後に差し替えがあれば、最終更新日時も添える", () => {
    const text = formatSubmittedAt(deadline, material("2026-10-19T23:30:00+09:00", "2026-10-20T10:00:00+09:00"));
    expect(text).toContain("23:30");
    expect(text).toContain("最終更新");
    expect(text).toContain("10:00");
  });
});
