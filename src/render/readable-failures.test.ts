import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle } from "../core";
import { buildGeometry, hitTestGeometry } from "./geometry";
import { brightness, bulbCount, bulbOffsets, bulbRadius, clusterRadius, poolAlpha, poolRadiusScale, LOAD_CAP } from "./load";
import {
  MAX_PATH_POINTS,
  POP_SECONDS,
  PHASE_DONE,
  PHASE_POP,
  PHASE_SHOCK,
  SHOCK_SECONDS,
  fuseIntact,
  pointAlong,
  polylineLength,
  popFraction,
  sequencePhase,
  sequenceTotal,
  shockProgress,
  sliceVertices,
} from "./shock";

const puzzle = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "shrine-circuit.json"), "utf8")));

describe("lamp load shown by size, count and brightness", () => {
  it("draws 1, 2, 3 bulbs for load 1, 2, 3 and never more", () => {
    expect([1, 2, 3, 5, 9].map(bulbCount)).toEqual([1, 2, 3, 3, 3]);
    const out = new Float64Array(6);
    expect(bulbOffsets(3, out)).toBe(3);
  });
  it("a hungry lamp covers more area than a load-1 lamp", () => {
    const area = (l: number) => bulbCount(l) * Math.PI * bulbRadius(l) ** 2;
    expect(area(3)).toBeGreaterThan(area(1) * 1.5);
    expect(clusterRadius(3)).toBeGreaterThan(clusterRadius(1));
  });
  it("brightness is 1x, 2x, 3x and capped", () => {
    expect([1, 2, 3].map(brightness)).toEqual([1, 2, 3]);
    expect(brightness(5)).toBe(LOAD_CAP);
    expect(poolRadiusScale(3)).toBeGreaterThan(poolRadiusScale(2));
    expect(poolRadiusScale(2)).toBeGreaterThan(poolRadiusScale(1));
    expect(poolRadiusScale(5)).toBe(poolRadiusScale(3));
  });
  it("pool alpha scales with load and is capped", () => {
    expect(poolAlpha(0.1, 2)).toBeCloseTo(0.2);
    expect(poolAlpha(0.1, 3)).toBeCloseTo(0.3);
    expect(poolAlpha(0.3, 3)).toBeLessThanOrEqual(0.55);
    expect(poolAlpha(0.18, 5)).toBe(poolAlpha(0.18, 3));
  });
});

describe("fuse-blow sequence timing", () => {
  it("shock first, then pop, then done", () => {
    expect(sequencePhase(0, true)).toBe(PHASE_SHOCK);
    expect(sequencePhase(SHOCK_SECONDS - 0.01, true)).toBe(PHASE_SHOCK);
    expect(sequencePhase(SHOCK_SECONDS + 0.01, true)).toBe(PHASE_POP);
    expect(sequencePhase(SHOCK_SECONDS + POP_SECONDS + 0.01, true)).toBe(PHASE_DONE);
    expect(sequenceTotal(true)).toBeCloseTo(1.0);
  });
  it("keeps the fuse intact until the pop lands", () => {
    expect(fuseIntact(0.2, true)).toBe(true);
    expect(fuseIntact(SHOCK_SECONDS, true)).toBe(false);
  });
  it("with no path it skips the streak and pops at once", () => {
    expect(fuseIntact(0, false)).toBe(false);
    expect(sequencePhase(0, false)).toBe(PHASE_POP);
    expect(popFraction(0, false)).toBe(0);
    expect(shockProgress(0, false)).toBe(1);
    expect(sequenceTotal(false)).toBeCloseTo(POP_SECONDS);
  });
  it("pop fraction runs 0..1 then is -1", () => {
    expect(popFraction(SHOCK_SECONDS - 0.05, true)).toBe(-1);
    expect(popFraction(SHOCK_SECONDS + POP_SECONDS / 2, true)).toBeCloseTo(0.5);
    expect(popFraction(SHOCK_SECONDS + POP_SECONDS + 0.1, true)).toBe(-1);
  });
});

describe("position along a multi-line path", () => {
  // An L: (0,0) -> (10,0) -> (10,20). Length 30.
  const xs = [0, 10, 10];
  const ys = [0, 0, 20];
  const out = new Float64Array(2);
  it("measures and interpolates across segments", () => {
    expect(polylineLength(xs, ys, 3)).toBe(30);
    pointAlong(xs, ys, 3, 0, out);
    expect([out[0], out[1]]).toEqual([0, 0]);
    pointAlong(xs, ys, 3, 1 / 6, out);
    expect([out[0], out[1]]).toEqual([5, 0]);
    pointAlong(xs, ys, 3, 0.5, out);
    expect([out[0], out[1]]).toEqual([10, 5]);
    pointAlong(xs, ys, 3, 1, out);
    expect([out[0], out[1]]).toEqual([10, 20]);
    pointAlong(xs, ys, 3, 7, out);
    expect([out[0], out[1]]).toEqual([10, 20]);
  });
  it("slices a streak that bends round the corner", () => {
    const o = new Float64Array(2 * (MAX_PATH_POINTS + 2));
    const m = sliceVertices(xs, ys, 3, 0.2, 0.5, o);
    expect(m).toBe(3);
    expect([o[0], o[1]]).toEqual([6, 0]);
    expect([o[2], o[3]]).toEqual([10, 0]);
    expect([o[4], o[5]]).toEqual([10, 5]);
    expect(sliceVertices(xs, ys, 3, 0.5, 0.5, o)).toBe(0);
  });
  it("handles degenerate paths", () => {
    pointAlong([], [], 0, 0.5, out);
    expect([out[0], out[1]]).toEqual([0, 0]);
    expect(sliceVertices([1], [1], 1, 0, 1, new Float64Array(8))).toBe(0);
  });
});

describe("hit radius of a load-3 lamp", () => {
  const battery = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "battery-run.json"), "utf8")));
  it("hits on the outer bulb, which a flat 18 px would miss", () => {
    const g = buildGeometry(battery, 1000, 600, 60);
    const i = g.nodeIndex.get("mill")!;
    expect(g.hitR[i]).toBeGreaterThan(18);
    const off = new Float64Array(6);
    bulbOffsets(3, off);
    const x = g.nx[i]! + off[0]!;
    const y = g.ny[i]! + off[1]!;
    expect(Math.hypot(off[0]!, off[1]!) + 11).toBeGreaterThan(18);
    expect(hitTestGeometry(g, g.nx[i]! + clusterRadius(3), g.ny[i]!)).toBe("mill");
    expect(hitTestGeometry(g, x, y)).toBe("mill");
  });
});

describe("HUD insets", () => {
  it("keeps every node below the top inset", () => {
    for (const [w, h, top] of [[800, 600, 90], [1280, 720, 60], [400, 900, 120]] as const) {
      const g = buildGeometry(puzzle, w, h, 40, { top });
      for (let i = 0; i < g.nodeIds.length; i++) {
        expect(g.ny[i]).toBeGreaterThanOrEqual(top + 40 - 1e-6);
        expect(g.ny[i]).toBeLessThanOrEqual(h - 40 + 1e-6);
      }
    }
  });
  it("respects all four insets and defaults to none", () => {
    const g = buildGeometry(puzzle, 800, 600, 40, { top: 50, right: 30, bottom: 20, left: 70 });
    for (let i = 0; i < g.nodeIds.length; i++) {
      expect(g.nx[i]).toBeGreaterThanOrEqual(70 + 40 - 1e-6);
      expect(g.nx[i]).toBeLessThanOrEqual(800 - 30 - 40 + 1e-6);
      expect(g.ny[i]).toBeLessThanOrEqual(600 - 20 - 40 + 1e-6);
    }
    const a = buildGeometry(puzzle, 800, 600, 40);
    const b = buildGeometry(puzzle, 800, 600, 40, {});
    expect(b.fit).toEqual(a.fit);
  });
});
