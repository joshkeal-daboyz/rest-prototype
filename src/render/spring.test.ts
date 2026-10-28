import { describe, expect, it } from "vitest";
import { TWANG_SECONDS, sprangBack, twangOffset, twanging } from "./spring";

describe("spring twang timing", () => {
  it("lasts about a quarter second", () => {
    expect(TWANG_SECONDS).toBeGreaterThanOrEqual(0.2);
    expect(TWANG_SECONDS).toBeLessThanOrEqual(0.3);
  });
  it("starts at the old position and is exactly at rest afterwards", () => {
    expect(twangOffset(0)).toBe(1);
    expect(twangOffset(TWANG_SECONDS)).toBe(0);
    expect(twangOffset(5)).toBe(0);
    expect(twangOffset(-1)).toBe(0);
    expect(twangOffset(NaN)).toBe(0);
  });
  it("snaps through rest and overshoots before settling", () => {
    let min = 0;
    let crossed = false;
    for (let a = 0; a < TWANG_SECONDS; a += 0.005) {
      const k = twangOffset(a);
      if (k < 0) crossed = true;
      min = Math.min(min, k);
    }
    expect(crossed).toBe(true);
    expect(min).toBeLessThan(-0.2);
    expect(min).toBeGreaterThan(-0.6);
  });
  it("reports whether it is playing", () => {
    expect(twanging(0.1)).toBe(true);
    expect(twanging(TWANG_SECONDS)).toBe(false);
    expect(twanging(-0.1)).toBe(false);
  });
  it("detects a spring return only for a spring switch that moved unpowered", () => {
    expect(sprangBack(true, 1, 0, false)).toBe(true);
    expect(sprangBack(true, 1, 0, true)).toBe(false);
    expect(sprangBack(true, 0, 0, false)).toBe(false);
    expect(sprangBack(false, 1, 0, false)).toBe(false);
  });
});
