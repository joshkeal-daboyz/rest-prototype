import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadPuzzle, type Puzzle } from "../core";
import {
  BLOCK_MAX_H,
  BLOCK_MIN_H,
  POLE_HEIGHT,
  POLE_SPACING,
  SAG_RATIO,
  SAG_SEGMENTS,
  blockLayout,
  cumulative,
  pointAlong,
  runPoints,
  wireLayout,
  type Block,
} from "./layout";

const puzzle: Puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));
const runs = wireLayout(puzzle);
const pos = new Map(puzzle.nodes.map((n) => [n.id, n.pos] as const));

describe("wireLayout", () => {
  it("returns one run per line, keyed by id and in file order (15 on the shrine circuit)", () => {
    expect(runs).toHaveLength(15);
    expect(runs.map((r) => r.id)).toEqual(puzzle.lines.map((l) => l.id));
  });

  it("gives decor no wire: a puzzle with decor still has one run per line", () => {
    const withDecor: Puzzle = { ...puzzle, decor: [{ path: [[0, 5], [3, 5]] }] };
    expect(wireLayout(withDecor)).toHaveLength(puzzle.lines.length);
  });

  it("ends each run on its nodes at pole height, world z = map y", () => {
    for (const r of runs) {
      const a = pos.get(r.from)!;
      const b = pos.get(r.to)!;
      const first = r.attach[0]!;
      const last = r.attach[r.attach.length - 1]!;
      expect([first.x, first.y, first.z]).toEqual([a[0], POLE_HEIGHT, a[1]]);
      expect([last.x, last.y, last.z]).toEqual([b[0], POLE_HEIGHT, b[1]]);
    }
  });

  it("stands every pole on the segment, no further apart than POLE_SPACING, and none in a short run", () => {
    for (const r of runs) {
      const a = pos.get(r.from)!;
      const b = pos.get(r.to)!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let i = 0; i < r.attach.length; i++) {
        const p = r.attach[i]!;
        const cross = (b[0] - a[0]) * (p.z - a[1]) - (b[1] - a[1]) * (p.x - a[0]);
        expect(Math.abs(cross)).toBeLessThan(1e-9);
        if (i > 0) {
          const q = r.attach[i - 1]!;
          expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeLessThanOrEqual(POLE_SPACING + 1e-9);
        }
      }
      if (len <= POLE_SPACING) expect(r.attach).toHaveLength(2);
      else expect(r.attach.length).toBeGreaterThan(2);
    }
    expect(runs.some((r) => r.attach.length === 2)).toBe(true);
    expect(runs.some((r) => r.attach.length > 2)).toBe(true);
  });

  it("sags each span: SAG_SEGMENTS + 1 points, exact ends, lowest at mid-span, SAG_RATIO x length below the chord, above ground", () => {
    for (const r of runs) {
      r.spans.forEach((span, i) => {
        const a = r.attach[i]!;
        const b = r.attach[i + 1]!;
        expect(span).toHaveLength(SAG_SEGMENTS + 1);
        expect(span[0]).toEqual(a);
        expect(span[SAG_SEGMENTS]).toEqual(b);
        const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        const mid = span[SAG_SEGMENTS / 2]!;
        expect(Math.abs(a.y - mid.y - SAG_RATIO * len)).toBeLessThan(1e-6);
        const lowest = Math.min(...span.map((p) => p.y));
        expect(mid.y).toBeCloseTo(lowest, 12);
        for (const p of span) expect(p.y).toBeGreaterThan(0);
      });
    }
  });

  it("is deterministic", () => {
    expect(wireLayout(puzzle)).toEqual(wireLayout(puzzle));
    expect(blockLayout(puzzle)).toEqual(blockLayout(puzzle));
  });

  it("imports nothing from grid, play or three", () => {
    const src = readFileSync("src/render3d/layout.ts", "utf8");
    const specs = [...src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/gms)].map((m) => m[1]!);
    expect(specs.length).toBeGreaterThan(0);
    for (const s of specs) expect(s).not.toMatch(/grid|play|three/);
  });

  it("walks a run by length: the bead helper hits the ends and the middle", () => {
    const r = runs.find((x) => x.id === "l_b")!;
    const pts = runPoints(r);
    const cum = cumulative(pts);
    const out = { x: 0, y: 0, z: 0 };
    expect(pointAlong(pts, cum, 0, out)).toEqual(pts[0]);
    const end = pts[pts.length - 1]!;
    expect(pointAlong(pts, cum, 1, out)).toEqual(end);
    expect(pointAlong(pts, cum, 0.5, out).y).toBeCloseTo(r.mid.y, 6);
  });
});

function segHitsBox(ax: number, az: number, bx: number, bz: number, b: Block): boolean {
  // Liang-Barsky against the box's x/z extents.
  const x0 = b.x - b.w / 2;
  const x1 = b.x + b.w / 2;
  const z0 = b.z - b.d / 2;
  const z1 = b.z + b.d / 2;
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  const p = [-dx, dx, -dz, dz];
  const q = [ax - x0, x1 - ax, az - z0, z1 - az];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i]! < 0) return false;
    } else {
      const t = q[i]! / p[i]!;
      if (p[i]! < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  return t0 < t1 - 1e-9;
}

describe("blockLayout", () => {
  const layout = blockLayout(puzzle);
  const lamps = puzzle.nodes.filter((n) => n.type === "lamp").map((n) => n.id);

  it("has the footprint's and the city's blocks, heights within range", () => {
    expect(layout.blocks.some((b) => b.kind === "building")).toBe(true);
    expect(layout.blocks.some((b) => b.kind === "city")).toBe(true);
    for (const b of [...layout.blocks, ...layout.places.flatMap((p) => p.boxes)]) {
      expect(b.h).toBeGreaterThanOrEqual(BLOCK_MIN_H);
      expect(b.h).toBeLessThanOrEqual(BLOCK_MAX_H);
    }
  });

  it("keeps each lamp's id on its place, in node order", () => {
    expect(layout.places.map((p) => p.lamp)).toEqual(lamps);
  });

  it("puts no block over a wire run", () => {
    const all = [...layout.blocks, ...layout.places.flatMap((p) => p.boxes)];
    for (const r of runs) {
      const a = r.attach[0]!;
      const b = r.attach[r.attach.length - 1]!;
      for (const blk of all) expect(segHitsBox(a.x, a.z, b.x, b.z, blk), `${r.id} vs block at ${blk.x},${blk.z}`).toBe(false);
    }
  });
});
