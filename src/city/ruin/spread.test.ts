/**
 * Ticket 073 F1, criterion 2 (the spread, GD, F1-Q3): `round(wild x 3)` cells, half up; districts at `wild` 0.1, 0.2, 0.5 and 0.9 grow 0, 1, 2 and 3 cells out from their soil, hand-worked; growth never enters a
 * building; a cell reached from two districts' soil takes the nearer's (a tie: the least id); a district under 1/6 grows nothing.
 */
import { describe, expect, it } from "vitest";
import { REACH_FACTOR } from "./constants";
import { cellKey } from "./geom";
import { reachOf, spread, type SoilSource } from "./spread";

const everywhere = (): boolean => true;
const src = (i: number, j: number, district: string, wild: number): SoilSource => ({ i, j, district, wild });
const grownCells = (g: ReadonlyMap<number, unknown>, i0: number, j0: number): { i: number; j: number }[] =>
  [...g.keys()].map((k) => ({ i: Math.floor(k / 100000) - 1000 - i0, j: (k % 100000) - 1000 - j0 }));

describe("the reach", () => {
  it("is round(wild x 3), half up: 0.1, 0.2, 0.5 and 0.9 reach 0, 1, 2 and 3 cells", () => {
    expect(REACH_FACTOR).toBe(3);
    expect([0.1, 0.2, 0.5, 0.9].map(reachOf)).toEqual([0, 1, 2, 3]);
    expect(reachOf(0)).toBe(0);
    expect(reachOf(1)).toBe(3);
    expect(reachOf(1 / 6 - 0.001)).toBe(0);
    expect(reachOf(0.5)).toBe(2); // 1.5 rounds up
  });
  it("a district that held to the end (wild under 1/6) grows nothing: only its soil cell is reached", () => {
    const g = spread([src(5, 5, "a", 0.15)], everywhere);
    expect(g.size).toBe(1);
    expect(g.get(cellKey(5, 5))).toEqual({ district: "a", dist: 0 });
  });
});

describe("the spread", () => {
  it("grows 0, 1, 2 and 3 cells out (a diamond of the reach) from soil at wild 0.1, 0.2, 0.5 and 0.9, hand-worked", () => {
    for (const [wild, r] of [[0.1, 0], [0.2, 1], [0.5, 2], [0.9, 3]] as const) {
      const g = spread([src(10, 10, "a", wild)], everywhere);
      // a diamond: 1 + 2r(r+1) cells
      expect(g.size, `wild ${wild}`).toBe(1 + 2 * r * (r + 1));
      for (const c of grownCells(g, 10, 10)) expect(Math.abs(c.i) + Math.abs(c.j)).toBeLessThanOrEqual(r);
      for (const [, v] of g) expect(v.dist).toBeLessThanOrEqual(r);
    }
  });
  it("never enters a building: a cell the passable test refuses is not reached, and nothing is reached through it", () => {
    // a wall of buildings at i = 11; soil at 10 with reach 3
    const g = spread([src(10, 10, "a", 0.9)], (i) => i !== 11);
    for (const c of grownCells(g, 0, 0)) expect(c.i).not.toBe(11);
    expect(g.has(cellKey(12, 10))).toBe(false); // behind the wall, 2 cells beyond: only reachable through it (the diamond's other routes are longer than 3)
    expect(g.has(cellKey(7, 10))).toBe(true);
  });
  it("a cell reached from two districts' soil takes the nearer's; a tie takes the least id", () => {
    const g = spread([src(0, 0, "b", 0.9), src(4, 0, "a", 0.9)], everywhere);
    expect(g.get(cellKey(1, 0))!.district).toBe("b"); // 1 from b, 3 from a
    expect(g.get(cellKey(3, 0))!.district).toBe("a"); // 1 from a, 3 from b
    expect(g.get(cellKey(2, 0))).toEqual({ district: "a", dist: 2 }); // a tie at 2: the least id
  });
  it("a soil with a short reach does not take a cell a longer reach also gets, when it is nearer; the longer reach carries on past it", () => {
    const g = spread([src(0, 0, "a", 0.2), src(5, 0, "b", 0.9)], everywhere);
    expect(g.get(cellKey(1, 0))).toEqual({ district: "a", dist: 1 });
    expect(g.get(cellKey(2, 0))).toEqual({ district: "b", dist: 3 });
    expect(g.get(cellKey(3, 0))).toEqual({ district: "b", dist: 2 });
  });
});
