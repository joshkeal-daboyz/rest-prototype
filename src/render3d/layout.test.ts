import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, type Puzzle } from "../core";
import {
  BREAK_GAP,
  CAN_DROP,
  CAN_OFFSET,
  DROP_END_Y,
  DROP_REACH,
  HANG_DROP,
  HANG_SEGMENTS,
  PHASE_OFFSET,
  SHADOW_Y,
  WIRE_PICK_RADIUS,
  WIRE_RADIUS,
  canLayout,
  dropLayout,
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
import { townLayout, type Lot } from "./town";

const puzzle: Puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));
const runs = wireLayout(puzzle);
const pos = new Map(puzzle.nodes.map((n) => [n.id, n.pos] as const));

const mapFiles = [...readdirSync("puzzles").filter((f) => f.endsWith(".json")), "lamp-row.grid.json"].map((f) => join("puzzles", f)).filter((f, i, all) => existsSync(f) && all.indexOf(f) === i);
const maps: { name: string; puzzle: Puzzle }[] = mapFiles.map((f) => ({ name: f, puzzle: loadPuzzle(JSON.parse(readFileSync(f, "utf8"))) }));

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
  it("strings the wires at POLE_HEIGHT >= 1.6 and sags l_feed's 2-unit span by 0.08 (4%) without dipping below POLE_HEIGHT - 0.3", () => {
    expect(POLE_HEIGHT).toBeGreaterThanOrEqual(1.6);
    // 041 C-Q5: 4% sag (037 C-Q2 had 12%), poles at most 3 apart (037 had 2), conductors 0.03 thick (037 had 0.05).
    expect(SAG_RATIO).toBe(0.04);
    expect(POLE_SPACING).toBe(3);
    expect(WIRE_RADIUS).toBe(0.03);
    const lf = runs.find((r) => r.id === "l_feed")!;
    expect(lf.spans).toHaveLength(1);
    const span = lf.spans[0]!;
    expect(Math.abs(lf.attach[0]!.y - span[SAG_SEGMENTS / 2]!.y - 0.08)).toBeLessThan(1e-6);
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

describe("three conductors to a run (041 C2), on every map", () => {
  it("gives a run with an intermediate pole three conductors and one without a single one, from the node points to the node points, above ground", () => {
    let withPoles = 0;
    let without = 0;
    for (const { name, puzzle: pz } of maps) {
      const nodePos = new Map(pz.nodes.map((n) => [n.id, n.pos] as const));
      for (const r of wireLayout(pz)) {
        const n = r.attach.length - 1;
        if (n < 2) {
          without++;
          expect(r.conductors, `${name} ${r.id}`).toHaveLength(1);
          expect(r.centre).toBe(0);
        } else {
          withPoles++;
          expect(r.conductors, `${name} ${r.id}`).toHaveLength(3);
          expect(r.centre).toBe(1);
        }
        const a = nodePos.get(r.from)!;
        const b = nodePos.get(r.to)!;
        for (const c of r.conductors) {
          // Every conductor starts and ends at the run's own node attachment points (unchanged from before 041 C).
          expect([c[0]!.x, c[0]!.y, c[0]!.z], `${name} ${r.id} start`).toEqual([a[0], POLE_HEIGHT, a[1]]);
          const last = c[c.length - 1]!;
          expect(last.x, `${name} ${r.id} end`).toBeCloseTo(b[0], 9);
          expect(last.y).toBe(POLE_HEIGHT);
          expect(last.z, `${name} ${r.id} end`).toBeCloseTo(b[1], 9);
          expect(c).toHaveLength(n * SAG_SEGMENTS + 1);
          for (const p of c) expect(p.y, `${name} ${r.id} above ground`).toBeGreaterThan(0);
        }
      }
    }
    expect(withPoles).toBeGreaterThan(50);
    expect(without).toBeGreaterThan(100);
  });

  it("puts the conductors at -PHASE_OFFSET, 0 and +PHASE_OFFSET across the run at POLE_HEIGHT on every intermediate pole, and the centre one is the run's spans joined", () => {
    for (const { name, puzzle: pz } of maps) {
      for (const r of wireLayout(pz)) {
        const n = r.attach.length - 1;
        if (n < 2) continue;
        expect(r.conductors[r.centre], `${name} ${r.id}`).toEqual(runPoints(r));
        // The arm is a unit vector across the run.
        const a = r.attach[0]!;
        const b = r.attach[n]!;
        expect(Math.hypot(r.arm.x, r.arm.z)).toBeCloseTo(1, 9);
        expect(Math.abs(r.arm.x * (b.x - a.x) + r.arm.z * (b.z - a.z))).toBeLessThan(1e-9);
        [-PHASE_OFFSET, 0, PHASE_OFFSET].forEach((off, k) => {
          for (let i = 1; i < n; i++) {
            const p = r.conductors[k]![i * SAG_SEGMENTS]!;
            const q = r.attach[i]!;
            expect(p.y, `${name} ${r.id} pole ${i}`).toBeCloseTo(POLE_HEIGHT, 12);
            expect((p.x - q.x) * r.arm.x + (p.z - q.z) * r.arm.z, `${name} ${r.id} offset ${off}`).toBeCloseTo(off, 9);
            // ... and no drift along the run.
            expect(Math.abs((p.x - q.x) * (b.x - a.x) + (p.z - q.z) * (b.z - a.z))).toBeLessThan(1e-9);
          }
        });
      }
    }
  });

  it("sags every conductor's spans SAG_RATIO x their own length at mid-span, and no pole is more than POLE_SPACING from the next, on every map", () => {
    for (const { name, puzzle: pz } of maps) {
      for (const r of wireLayout(pz)) {
        const n = r.attach.length - 1;
        for (let i = 1; i <= n; i++) {
          const a = r.attach[i - 1]!;
          const b = r.attach[i]!;
          expect(Math.hypot(b.x - a.x, b.z - a.z), `${name} ${r.id}`).toBeLessThanOrEqual(POLE_SPACING + 1e-9);
        }
        for (const c of r.conductors) {
          for (let i = 0; i < n; i++) {
            const a = c[i * SAG_SEGMENTS]!;
            const b = c[(i + 1) * SAG_SEGMENTS]!;
            const mid = c[i * SAG_SEGMENTS + SAG_SEGMENTS / 2]!;
            const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
            expect(Math.abs(a.y - mid.y - SAG_RATIO * len), `${name} ${r.id} span ${i}`).toBeLessThan(1e-6);
          }
        }
      }
    }
  });

  it("fans the conductors out over the first span: 0 apart at the node, PHASE_OFFSET from the middle one at the first pole, widening between", () => {
    const r = runs.find((x) => x.id === "l_b")!;
    expect(r.conductors).toHaveLength(3);
    const gap = (k: number, idx: number): number => Math.hypot(r.conductors[k]![idx]!.x - r.conductors[1]![idx]!.x, r.conductors[k]![idx]!.z - r.conductors[1]![idx]!.z);
    for (const k of [0, 2]) {
      expect(gap(k, 0)).toBe(0);
      expect(gap(k, SAG_SEGMENTS)).toBeCloseTo(PHASE_OFFSET, 9);
      expect(gap(k, r.conductors[0]!.length - 1)).toBe(0);
      const widths = [0, 2, 4, 6, 8].map((j) => gap(k, j));
      for (let j = 1; j < widths.length; j++) expect(widths[j]!).toBeGreaterThan(widths[j - 1]!);
    }
  });
});

describe("the damaged cable's break (C2, 041 C3)", () => {
  it("is set only on l_b among the shrine circuit's runs", () => {
    expect(runs.filter((r) => r.brk).map((r) => r.id)).toEqual(["l_b"]);
  });

  it("l_b: cuts all three conductors in the same span, two drooping ends a gap apart each, halves that stop short of the gap", () => {
    const r = runs.find((x) => x.id === "l_b")!;
    const brk = r.brk!;
    // Poles at most 3 apart (041 C): l_b is two spans now (it was three), so it breaks in span 1, the one holding its middle.
    expect(r.spans).toHaveLength(2);
    expect(brk.span).toBe(1);
    expect(brk.cuts).toHaveLength(3);
    expect(brk.cuts[r.centre]).toEqual({ ends: brk.ends, halves: brk.halves, gap: brk.gap });
    const n = r.attach.length - 1;
    brk.cuts.forEach((cut, k) => {
      // Each end hangs from its own conductor's attachment point at the span's two ends (the same span for all three).
      expect(cut.ends[0][0], `conductor ${k}`).toEqual(r.conductors[k]![brk.span * SAG_SEGMENTS]);
      expect(cut.ends[1][0], `conductor ${k}`).toEqual(r.conductors[k]![(brk.span + 1) * SAG_SEGMENTS]);
      for (const end of cut.ends) {
        expect(end).toHaveLength(HANG_SEGMENTS + 1);
        for (let i = 1; i < end.length; i++) expect(end[i]!.y).toBeLessThanOrEqual(end[i - 1]!.y);
        const tip = end[end.length - 1]!;
        expect(tip.y).toBeCloseTo(POLE_HEIGHT - HANG_DROP, 12);
        expect(tip.y).toBeGreaterThan(0);
      }
      const t0 = cut.ends[0][HANG_SEGMENTS]!;
      const t1 = cut.ends[1][HANG_SEGMENTS]!;
      expect(Math.abs(Math.hypot(t0.x - t1.x, t0.z - t1.z) - BREAK_GAP), `conductor ${k} gap`).toBeLessThan(1e-6);
      const a = cut.ends[0][0]!;
      const b = cut.ends[1][0]!;
      expect(cut.gap.x).toBeCloseTo((a.x + b.x) / 2, 12);
      expect(cut.gap.z).toBeCloseTo((a.z + b.z) / 2, 12);
      expect(cut.gap.y).toBeCloseTo(POLE_HEIGHT - HANG_DROP, 12);
      expect(cut.halves[0][0]).toEqual(r.conductors[k]![0]);
      expect(cut.halves[0][cut.halves[0].length - 1]).toEqual(t0);
      expect(cut.halves[1][0]).toEqual(r.conductors[k]![n * SAG_SEGMENTS]);
      expect(cut.halves[1][cut.halves[1].length - 1]).toEqual(t1);
      // The gap's perpendicular plane: sw_1's side for half 0, j4's side for half 1.
      const dx = r.attach[n]!.x - r.attach[0]!.x;
      const dz = r.attach[n]!.z - r.attach[0]!.z;
      const side = (p: { x: number; z: number }): number => (p.x - cut.gap.x) * dx + (p.z - cut.gap.z) * dz;
      for (const p of cut.halves[0]) expect(side(p)).toBeLessThan(0);
      for (const p of cut.halves[1]) expect(side(p)).toBeGreaterThan(0);
    });
    // The three conductors' tips are the three phases apart across the run, so the break reads as one cut.
    const tip = (k: number): { x: number; z: number } => brk.cuts[k]!.ends[0][HANG_SEGMENTS]!;
    const across = (k: number): number => (tip(k).x - tip(1).x) * r.arm.x + (tip(k).z - tip(1).z) * r.arm.z;
    expect(across(0)).toBeLessThan(0);
    expect(across(2)).toBeGreaterThan(0);
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
    const r = wireLayout(synth(5))[0]!;
    expect(r.spans).toHaveLength(2);
    expect(r.brk!.span).toBe(1);
    expect(r.brk!.ends[0][0]).toEqual(r.attach[1]);
    expect(r.brk!.ends[1][0]).toEqual(r.attach[2]);
    expect(r.brk!.cuts).toHaveLength(3);
  });

  it("a 3-span run breaks in span 1 (the middle one), every conductor", () => {
    const r = wireLayout(synth(8))[0]!;
    expect(r.spans).toHaveLength(3);
    expect(r.brk!.span).toBe(1);
    expect(r.brk!.ends[0][0]).toEqual(r.attach[1]);
    expect(r.brk!.ends[1][0]).toEqual(r.attach[2]);
    for (const cut of r.brk!.cuts) expect(cut.halves[0].length).toBeGreaterThan(HANG_SEGMENTS + 1);
  });

  it("a 1-span run has one conductor and hangs its ends from the two nodes' own attachment points", () => {
    const r = wireLayout(synth(2))[0]!;
    expect(r.spans).toHaveLength(1);
    expect(r.conductors).toHaveLength(1);
    expect(r.brk!.span).toBe(0);
    expect(r.brk!.cuts).toHaveLength(1);
    expect(r.brk!.ends[0][0]).toEqual(r.attach[0]);
    expect(r.brk!.ends[1][0]).toEqual(r.attach[1]);
    expect(r.brk!.halves[0]).toEqual(r.brk!.ends[0]);
  });
});

// ---- 041 C5: service drops and transformer cans ----
/** The point in the lot's own frame: across the frontage (u) and away from the road (v, positive toward the road). */
const inLot = (l: Lot, x: number, z: number): { u: number; v: number } => ({
  u: (x - l.x) * Math.cos(l.yaw) - (z - l.z) * Math.sin(l.yaw),
  v: (x - l.x) * Math.sin(l.yaw) + (z - l.z) * Math.cos(l.yaw),
});

describe("service drops and cans (041 C5)", () => {
  const withTown = maps.map((m) => ({ ...m, town: townLayout(m.puzzle), runs: wireLayout(m.puzzle) }));

  it("is deterministic and gives the whole ward some drops (the shrine circuit has no building facing its own streets, so none)", () => {
    const m = withTown.find((x) => x.name.includes("56-whole-ward"))!;
    const a = dropLayout(m.town, m.runs);
    expect(dropLayout(m.town, wireLayout(m.puzzle))).toEqual(a);
    expect(a.length).toBeGreaterThan(0);
    expect(canLayout(a, m.runs)).toEqual(canLayout(a, m.runs));
  });

  it("starts every drop at an intermediate pole that carries a can, and ends it on its building's front, within DROP_REACH, on every map", () => {
    let total = 0;
    for (const { name, town, runs: rs } of withTown) {
      const drops = dropLayout(town, rs);
      const cans = canLayout(drops, rs);
      const canAt = new Set(cans.map((c) => `${c.run}#${c.pole}`));
      expect(cans.length, name).toBeLessThanOrEqual(drops.length);
      for (const c of cans) expect(drops.some((d) => d.run === c.run && d.pole === c.pole), `${name} can without a drop`).toBe(true);
      for (const d of drops) {
        total++;
        const run = rs.find((r) => r.id === d.run)!;
        expect(d.pole, `${name} ${d.run}`).toBeGreaterThan(0);
        expect(d.pole).toBeLessThan(run.attach.length - 1);
        expect(canAt.has(`${d.run}#${d.pole}`), `${name} ${d.run} pole ${d.pole} has a can`).toBe(true);
        const p = run.attach[d.pole]!;
        expect(d.from).toEqual({ x: p.x, y: POLE_HEIGHT - 0.2, z: p.z });
        const lot = town.lots[d.lot]!;
        // The lot is a building (an ordinary lot, never a place) and its street is the road beside this run's line.
        expect(town.roads.find((r) => r.id === lot.street)!.line, `${name} ${lot.key}`).toBe(d.run);
        const f = inLot(lot, d.to.x, d.to.z);
        expect(f.v, `${name} ${lot.key} on the front face`).toBeCloseTo(lot.d / 2, 9);
        expect(Math.abs(f.u)).toBeLessThanOrEqual(lot.w / 2 + 1e-9);
        expect(d.to.y).toBeCloseTo(Math.min(DROP_END_Y, (lot.hMax * 2) / 3), 12);
        expect(d.ground, name).toBeLessThanOrEqual(DROP_REACH + 1e-9);
        expect(Math.hypot(d.to.x - d.from.x, d.to.z - d.from.z)).toBeCloseTo(d.ground, 9);
        for (const place of town.places) for (const b of place.boxes) expect(Math.hypot(d.to.x - b.x, d.to.z - b.z), `${name} ${d.run} not to a place`).toBeGreaterThan(0.05);
      }
      // One drop per building at most.
      expect(new Set(drops.map((d) => d.lot)).size, name).toBe(drops.length);
    }
    expect(total).toBeGreaterThan(50);
    expect(DROP_REACH).toBe(2.5);
  });

  it("crosses no other lot, checked by sampling the ground line, on every map", () => {
    let checked = 0;
    const crossed: string[] = [];
    for (const { name, town, runs: rs } of withTown) {
      for (const d of dropLayout(town, rs)) {
        checked++;
        // Only the lots near the line can be crossed.
        const near = town.lots.map((l, i) => [l, i] as const).filter(([l, i]) => i !== d.lot && Math.hypot(l.x - d.from.x, l.z - d.from.z) < DROP_REACH + Math.hypot(l.w, l.d));
        for (let k = 1; k < 60; k++) {
          const x = d.from.x + ((d.to.x - d.from.x) * k) / 60;
          const z = d.from.z + ((d.to.z - d.from.z) * k) / 60;
          for (const [l] of near) {
            const q = inLot(l, x, z);
            if (Math.abs(q.u) < l.w / 2 - 1e-3 && Math.abs(q.v) < l.d / 2 - 1e-3) crossed.push(`${name} ${d.run} crosses ${l.key}`);
          }
        }
      }
    }
    expect(crossed).toEqual([]);
    expect(checked).toBeGreaterThan(50);
  });

  it("skips a drop whose ground line would cross another lot", () => {
    const m = withTown.find((x) => x.name.includes("56-whole-ward"))!;
    const drops = dropLayout(m.town, m.runs);
    const hit = drops[0]!;
    // Put another lot across the middle of an existing drop: that drop goes, and no other drop is lost.
    const blocker: Lot = { ...m.town.lots[hit.lot]!, x: (hit.from.x + hit.to.x) / 2, z: (hit.from.z + hit.to.z) / 2, w: 0.2, d: 0.2, yaw: 0, key: "blocker" };
    const blocked = dropLayout({ roads: m.town.roads, lots: [...m.town.lots, blocker] }, m.runs);
    expect(blocked.some((d) => d.lot === hit.lot)).toBe(false);
    // (The blocker is itself a lot, so it may get a drop of its own; the real lots' other drops are all kept.)
    expect(blocked.filter((d) => d.lot !== hit.lot && d.lot < m.town.lots.length).map((d) => d.lot)).toEqual(drops.filter((d) => d.lot !== hit.lot).map((d) => d.lot));
  });

  it("hangs each can under the arm, beside its pole, on the side of its first drop", () => {
    const m = withTown.find((x) => x.name.includes("56-whole-ward"))!;
    const drops = dropLayout(m.town, m.runs);
    const cans = canLayout(drops, m.runs);
    expect(cans.length).toBeGreaterThan(0);
    for (const c of cans) {
      const p = m.runs.find((r) => r.id === c.run)!.attach[c.pole]!;
      expect(Math.hypot(c.x - p.x, c.z - p.z)).toBeCloseTo(CAN_OFFSET, 9);
      expect(c.y).toBeCloseTo(POLE_HEIGHT - CAN_DROP, 12);
      const first = drops.find((d) => d.run === c.run && d.pole === c.pole)!;
      expect((c.x - p.x) * (first.to.x - p.x) + (c.z - p.z) * (first.to.z - p.z)).toBeGreaterThan(0);
    }
  });

  it("picks a conductor's reach: WIRE_PICK_RADIUS covers PHASE_OFFSET + WIRE_RADIUS + 0.03", () => {
    expect(WIRE_PICK_RADIUS).toBeGreaterThanOrEqual(PHASE_OFFSET + WIRE_RADIUS + 0.03 - 1e-12);
  });
});
