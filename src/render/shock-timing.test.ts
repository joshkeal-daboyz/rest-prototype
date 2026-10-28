import { describe, expect, it } from "vitest";
import { BLOW_TIMING } from "../core";
import { popStart } from "./shock";

describe("shock timing is shared with core", () => {
  it("pops at BLOW_TIMING.popAt when there is a path", () => {
    expect(popStart(true)).toBe(BLOW_TIMING.popAt);
  });
});
