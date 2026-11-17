import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadPuzzle, type Puzzle } from "../core";
import {
  BREAK_GAP,
  HANG_DROP,
  HANG_SEGMENTS,
  SHADOW_Y,
  shadowOf,
  POLE_HEIGHT,
  POLE_SPACING,
  SAG_RATIO,
  SAG_SEGMENTS,
  cumulative,
  pointAlong,
  runPoints,
  wireLayout,
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

// ---- Section C ----
describe("wires in the air (C1)", () => {
  it("strings the wires at POLE_HEIGHT >= 1.6 and sags l_feed's 2-unit span by 0.24 without dipping below POLE_HEIGHT - 0.3", () => {
    expect(POLE_HEIGHT).toBeGreaterThanOrEqual(1.6);
    expect(SAG_RATIO).toBe(0.12);
    const lf = runs.find((r) => r.id === "l_feed")!;
    expect(lf.spans).toHaveLength(1);
    const span = lf.spans[0]!;
    expect(Math.abs(lf.attach[0]!.y - span[SAG_SEGMENTS / 2]!.y - 0.24)).toBeLessThan(1e-6);
    for (const r of runs) for (const p of runPoints(r)) expect(p.y).toBeGreaterThanOrEqual(POLE_HEIGHT - 0.3 - 1e-9);
  });

  it("shadows each run on the street: same x and z, y = SHADOW_Y", () => {
    for (const r of runs) {
      const pts = runPoints(r);
      const sh = shadowOf(pts);
      expect(sh).toHaveLength(pts.length);
      sh.forEach((p, i) => {
        expect(p.y).toBe(SHADOW_Y);
        expect(p.x).toBe(pts[i]!.x);
        expect(p.z).toBe(pts[i]!.z);
      });
    }
  });
});

describe("the damaged cable's break (C2)", () => {
  it("is set only on l_b among the shrine circuit's runs", () => {
    expect(runs.filter((r) => r.brk).map((r) => r.id)).toEqual(["l_b"]);
  });

  it("l_b: breaks in span 1, two drooping ends a gap apart, halves that stop short of the gap", () => {
    const r = runs.find((x) => x.id === "l_b")!;
    const brk = r.brk!;
    expect(r.spans).toHaveLength(3);
    expect(brk.span).toBe(1);
    expect(brk.ends[0][0]).toEqual(r.attach[1]);
    expect(brk.ends[1][0]).toEqual(r.attach[2]);
    for (const end of brk.ends) {
      expect(end).toHaveLength(HANG_SEGMENTS + 1);
      for (let i = 1; i < end.length; i++) expect(end[i]!.y).toBeLessThanOrEqual(end[i - 1]!.y);
      const tip = end[end.length - 1]!;
      expect(tip.y).toBeCloseTo(POLE_HEIGHT - HANG_DROP, 12);
      expect(tip.y).toBeGreaterThan(0);
    }
    const t0 = brk.ends[0][HANG_SEGMENTS]!;
    const t1 = brk.ends[1][HANG_SEGMENTS]!;
    expect(Math.abs(Math.hypot(t0.x - t1.x, t0.z - t1.z) - BREAK_GAP)).toBeLessThan(1e-6);
    const a = r.attach[1]!;
    const b = r.attach[2]!;
    expect(brk.gap.x).toBeCloseTo((a.x + b.x) / 2, 12);
    expect(brk.gap.z).toBeCloseTo((a.z + b.z) / 2, 12);
    expect(brk.gap.y).toBeCloseTo(POLE_HEIGHT - HANG_DROP, 12);

    expect(brk.halves[0][0]).toEqual(r.attach[0]);
    expect(brk.halves[0][brk.halves[0].length - 1]).toEqual(t0);
    expect(brk.halves[1][0]).toEqual(r.attach[3]);
    expect(brk.halves[1][brk.halves[1].length - 1]).toEqual(t1);
    // The gap's perpendicular plane: sw_1's side for half 0, j4's side for half 1.
    const dx = r.attach[3]!.x - r.attach[0]!.x;
    const dz = r.attach[3]!.z - r.attach[0]!.z;
    const side = (p: { x: number; z: number }): number => (p.x - brk.gap.x) * dx + (p.z - brk.gap.z) * dz;
    for (const p of brk.halves[0]) expect(side(p)).toBeLessThan(0);
    for (const p of brk.halves[1]) expect(side(p)).toBeGreaterThan(0);
  });

  const synth = (len: number): Puzzle =>
    ({
      ...puzzle,
      nodes: [
        { id: "a", type: "junction", pos: [0, 0] },
        { id: "b", type: "junction", pos: [len, 0] },
      ],
      lines: [{ id: "x", from: "a", to: "b" }],
      faults: [{ id: "f", at: "x", kind: "damaged-cable" }],
    }) as unknown as Puzzle;

  it("a 2-span run breaks in span 1", () => {
    const r = wireLayout(synth(3.5))[0]!;
    expect(r.spans).toHaveLength(2);
    expect(r.brk!.span).toBe(1);
    expect(r.brk!.ends[0][0]).toEqual(r.attach[1]);
    expect(r.brk!.ends[1][0]).toEqual(r.attach[2]);
  });

  it("a 1-span run hangs its ends from the two nodes' own attachment points", () => {
    const r = wireLayout(synth(2))[0]!;
    expect(r.spans).toHaveLength(1);
    expect(r.brk!.span).toBe(0);
    expect(r.brk!.ends[0][0]).toEqual(r.attach[0]);
    expect(r.brk!.ends[1][0]).toEqual(r.attach[1]);
    expect(r.brk!.halves[0]).toEqual(r.brk!.ends[0]);
  });
});
