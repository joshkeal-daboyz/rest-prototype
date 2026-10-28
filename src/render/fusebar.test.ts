import { describe, expect, it } from "vitest";
import { FUSE_BAR_MAX_TICKS, FUSE_BAR_WIDTH, fuseFill, fuseStep, fuseTickOffsets } from "./fusebar";

describe("fuse load bar", () => {
  it("fills to load / rating, clamped to 0..1", () => {
    expect(fuseFill(0, 3)).toBe(0);
    expect(fuseFill(1, 4)).toBe(0.25);
    expect(fuseFill(3, 3)).toBe(1);
    expect(fuseFill(5, 3)).toBe(1);
    expect(fuseFill(-1, 3)).toBe(0);
  });
  it("an unrated fuse has nothing to fill", () => {
    expect(fuseFill(2, undefined)).toBe(0);
    expect(fuseFill(2, 0)).toBe(0);
  });
  it("colour runs green, amber, alarm; alarm only at the limit", () => {
    expect(fuseStep(0)).toBe(0);
    expect(fuseStep(0.5)).toBe(0);
    expect(fuseStep(2 / 3)).toBe(1);
    expect(fuseStep(0.99)).toBe(1);
    expect(fuseStep(1)).toBe(2);
    expect(fuseStep(fuseFill(1, 1))).toBe(2);
    expect(fuseStep(fuseFill(1, 2))).toBe(0);
  });
  it("one divider between each pair of units", () => {
    expect(fuseTickOffsets(1).length).toBe(0);
    const t = fuseTickOffsets(4);
    expect([...t]).toEqual([10, 20, 30]);
    expect(t.every((x) => x > 0 && x < FUSE_BAR_WIDTH)).toBe(true);
    expect(fuseTickOffsets(FUSE_BAR_MAX_TICKS + 1).length).toBe(0);
  });
});
