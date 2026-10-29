import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle } from "../core";
import {
  PAN_KEEP,
  buildGeometry,
  clampPan,
  computeFit,
  freeArea,
  hitTestGeometry,
  mapBox,
  puzzleBounds,
  type Bounds,
} from "./geometry";

const puzzle = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "08-shrine-circuit.json"), "utf8")));
const PAD = 64;
const insetCases = [{ top: 200, bottom: 100 }, { top: 200, bottom: 100, left: 150 }, { top: 50, right: 220, bottom: 30 }];
const boundsCases: [string, Bounds][] = [
  ["shrine", puzzleBounds(puzzle)],
  ["wide", { minX: 0, maxX: 40, minY: 0, maxY: 3 }],
  ["tall", { minX: 5, maxX: 7, minY: -10, maxY: 20 }],
];

describe("centred in the free area", () => {
  for (const [name, b] of boundsCases) {
    for (const ins of insetCases) {
      it(`${name} ${JSON.stringify(ins)}`, () => {
        const fit = computeFit(b, 1000, 800, PAD, ins);
        const box = mapBox(b, fit);
        const area = freeArea(1000, 800, ins);
        expect((box.left + box.right) / 2).toBeCloseTo((area.left + area.right) / 2, 0);
        expect((box.top + box.bottom) / 2).toBeCloseTo((area.top + area.bottom) / 2, 0);
      });
    }
  }
  it("matches the ticket numbers", () => {
    const b = puzzleBounds(puzzle);
    const box = mapBox(b, computeFit(b, 1000, 800, PAD, { top: 200, bottom: 100 }));
    expect(Math.abs((box.left + box.right) / 2 - 500)).toBeLessThan(0.5);
    expect(Math.abs((box.top + box.bottom) / 2 - 450)).toBeLessThan(0.5);
  });
});

describe("pan in the fit", () => {
  const b = puzzleBounds(puzzle);
  it("keeps scale and adds the pan to the offsets", () => {
    const f0 = computeFit(b, 900, 700, PAD, { top: 80 });
    const f1 = computeFit(b, 900, 700, PAD, { top: 80 }, { x: 30, y: -12 });
    expect(f1.scale).toBe(f0.scale);
    expect(f1.offsetX).toBeCloseTo(f0.offsetX + 30, 9);
    expect(f1.offsetY).toBeCloseTo(f0.offsetY - 12, 9);
  });
  it("no pan equals zero pan", () => {
    expect(computeFit(b, 900, 700, PAD)).toEqual(computeFit(b, 900, 700, PAD, undefined, { x: 0, y: 0 }));
  });
  it("moves every point of the geometry by exactly the pan", () => {
    const g0 = buildGeometry(puzzle, 900, 700, PAD, { top: 80 });
    const g1 = buildGeometry(puzzle, 900, 700, PAD, { top: 80 }, { x: 150, y: -90 });
    const chk = (a: Float64Array, c: Float64Array, d: number): void => {
      expect(a.length).toBe(c.length);
      for (let i = 0; i < a.length; i++) expect(c[i]! - a[i]!).toBeCloseTo(d, 6);
    };
    chk(g0.nx, g1.nx, 150);
    chk(g0.ax, g1.ax, 150);
    chk(g0.bx, g1.bx, 150);
    chk(g0.ny, g1.ny, -90);
    chk(g0.ay, g1.ay, -90);
    chk(g0.by, g1.by, -90);
    g0.decor.forEach((d, i) => {
      for (let k = 0; k < d.length; k += 2) {
        expect(g1.decor[i]![k]! - d[k]!).toBeCloseTo(150, 6);
        expect(g1.decor[i]![k + 1]! - d[k + 1]!).toBeCloseTo(-90, 6);
      }
    });
  });
  it("hit-testing follows the pan", () => {
    const g0 = buildGeometry(puzzle, 900, 700, PAD, { top: 80 });
    const g1 = buildGeometry(puzzle, 900, 700, PAD, { top: 80 }, { x: 150, y: -90 });
    const id = g0.nodeIds[0]!;
    expect(hitTestGeometry(g1, g1.nx[0]!, g1.ny[0]!)).toBe(id);
    // old spot: nothing within hit radius (150,90 px away from where it was)
    const old = hitTestGeometry(g1, g0.nx[0]!, g0.ny[0]!);
    expect(old).not.toBe(id);
    // a line midpoint at its new spot
    const li = 0;
    const mx = (g1.ax[li]! + g1.bx[li]!) / 2;
    const my = (g1.ay[li]! + g1.by[li]!) / 2;
    const hit = hitTestGeometry(g1, mx, my);
    expect(hit).not.toBeNull();
    const oldMx = (g0.ax[li]! + g0.bx[li]!) / 2;
    const oldMy = (g0.ay[li]! + g0.by[li]!) / 2;
    expect(hitTestGeometry(g1, oldMx, oldMy)).not.toBe(g1.lineIds[li]);
  });
});

describe("freeArea", () => {
  it("is the canvas minus the insets", () => {
    expect(freeArea(1000, 800, { top: 200, bottom: 100, left: 10, right: 20 })).toEqual({ left: 10, top: 200, right: 980, bottom: 700 });
    expect(freeArea(1000, 800)).toEqual({ left: 0, top: 0, right: 1000, bottom: 800 });
  });
  it("is zero size, not negative, when insets exceed the canvas", () => {
    const a = freeArea(300, 200, { top: 150, bottom: 150, left: 200, right: 200 });
    expect(a.right - a.left).toBe(0);
    expect(a.bottom - a.top).toBe(0);
  });
});

describe("clampPan", () => {
  const area = { left: 0, top: 200, right: 1000, bottom: 700 };
  const box = { left: 300, top: 300, right: 700, bottom: 600 };
  it("leaves {0,0} alone", () => {
    for (const [name, b] of boundsCases) {
      const fit = computeFit(b, 1000, 800, PAD, { top: 200, bottom: 100 });
      expect(clampPan({ x: 0, y: 0 }, mapBox(b, fit), freeArea(1000, 800, { top: 200, bottom: 100 })), name).toEqual({ x: 0, y: 0 });
    }
  });
  it("keeps PAN_KEEP px inside on each side", () => {
    const r = clampPan({ x: 10_000, y: 10_000 }, box, area);
    expect(box.left + r.x).toBe(area.right - PAN_KEEP);
    expect(box.top + r.y).toBe(area.bottom - PAN_KEEP);
    const l = clampPan({ x: -10_000, y: -10_000 }, box, area);
    expect(box.right + l.x).toBe(area.left + PAN_KEEP);
    expect(box.bottom + l.y).toBe(area.top + PAN_KEEP);
  });
  it("passes through a pan already in range", () => {
    expect(clampPan({ x: 40, y: -30 }, box, area)).toEqual({ x: 40, y: -30 });
  });
  it("keeps a small box wholly inside the area", () => {
    const small = { left: 480, top: 430, right: 520, bottom: 470 };
    const r = clampPan({ x: 10_000, y: 10_000 }, small, area);
    expect(small.right + r.x).toBe(area.right);
    expect(small.bottom + r.y).toBe(area.bottom);
    const l = clampPan({ x: -10_000, y: -10_000 }, small, area);
    expect(small.left + l.x).toBe(area.left);
    expect(small.top + l.y).toBe(area.top);
  });
  it("keeps a degenerate (point) box inside the area", () => {
    const pt = { left: 500, top: 450, right: 500, bottom: 450 };
    const r = clampPan({ x: 10_000, y: -10_000 }, pt, area);
    expect(pt.left + r.x).toBe(area.right);
    expect(pt.top + r.y).toBe(area.top);
  });
});
