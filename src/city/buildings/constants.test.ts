import { describe, expect, it } from "vitest";
import { BACK_SAME_SHARE } from "./constants";

describe("buildings constants", () => {
  it("BACK_SAME_SHARE is Decided at 0.5 (Josh, 20 Nov 2026, Q20)", () => {
    expect(BACK_SAME_SHARE).toBe(0.5);
  });
});
