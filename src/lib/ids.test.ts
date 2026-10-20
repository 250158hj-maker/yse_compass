import { describe, expect, it } from "vitest";
import { isId, MAX_ID, parseId } from "@/lib/ids";

describe("isId", () => {
  it("1 以上 integer の上限までの整数だけを通す", () => {
    expect(isId(1)).toBe(true);
    expect(isId(MAX_ID)).toBe(true);
    expect(isId(MAX_ID + 1)).toBe(false);
    expect(isId(0)).toBe(false);
    expect(isId(-1)).toBe(false);
    expect(isId(1.5)).toBe(false);
    expect(isId("5")).toBe(false);
    expect(isId(null)).toBe(false);
    expect(isId({ increment: 1 })).toBe(false);
  });
});

describe("parseId", () => {
  it("正しい形の ID を数にする", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("2147483647")).toBe(2147483647);
  });

  it("範囲外・形の違うものは null（500 にしないため）", () => {
    expect(parseId("2147483648")).toBeNull();
    expect(parseId("99999999999")).toBeNull();
    expect(parseId("0")).toBeNull();
    expect(parseId("-1")).toBeNull();
    expect(parseId("007")).toBeNull();
    expect(parseId("1.5")).toBeNull();
    expect(parseId(" 1")).toBeNull();
    expect(parseId("abc")).toBeNull();
    expect(parseId("")).toBeNull();
  });
});
