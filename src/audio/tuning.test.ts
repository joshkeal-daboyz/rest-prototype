import { describe, expect, it } from "vitest";
import { A4_HZ, noteHz, onGrid, semitonesHz } from "./tuning";

describe("tuning", () => {
  it("A4 is 432 and the named notes sit on the grid", () => {
    expect(A4_HZ).toBe(432);
    expect(noteHz("A4")).toBe(432);
    expect(noteHz("A3")).toBe(216);
    expect(noteHz("A1")).toBe(54);
    expect(Math.abs(noteHz("C#5") - 544.29)).toBeLessThan(0.01);
    expect(Math.abs(noteHz("E4") - 323.63)).toBeLessThan(0.01);
  });
  it("semitonesHz is equal temperament around 432", () => {
    expect(semitonesHz(0)).toBe(432);
    expect(semitonesHz(-12)).toBe(216);
  });
  it("onGrid accepts grid notes and rejects 440-based ones", () => {
    for (const hz of [216, 323.63, 1830.75]) expect(onGrid(hz)).toBe(true);
    for (const hz of [440, 220, 50]) expect(onGrid(hz)).toBe(false);
    expect(onGrid(0)).toBe(false);
  });
  it("a bad note name throws", () => {
    expect(() => noteHz("H4")).toThrow();
    expect(() => noteHz("A")).toThrow();
  });
});
