/**
 * Ticket 063 F: the kerb line (`kerbline.ts`), the plan of what is drawn on it, and Josh's worked example of an inlet (19 Nov 2026: "Here is an example of how the curbs may flow in this case scenario"). Pure, on typed-in fixtures and
 * the generated cities; nothing here reads assets (the measurements of the converted City Pack are in `tileslots.test.ts`, skipped when this machine has none).
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalibrationKey } from "../core";
import { KERB_GAP_MAX_M, KERB_HEIGHT_TOL_M, KERB_TOL_M, kerbLine, tileKerbPlan, type KerbPath, type KerbPlan, type Mp } from "./kerbline";
import { PAVEMENT_FLUSH, PAVEMENT_GRATE, PAVEMENT_RETURN_FAR, PAVEMENT_RETURN_NEAR, TILE_M, tileCity, type TileCell, type TileCity } from "./tilecity";
import { KERB_FACES_M, KERB_INSET_M, KERB_LIP_TOP_M, tileKeys } from "./tileslots";
import { tileKeyOf } from "./tilecity3d";

/** The cities of the criteria: seeds 1 to 10 at 3 x 3 (the default size) and seeds 1 to 3 at 6 x 4. */
const CITIES: readonly TileCity[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => tileCity({ blocksX: 3, blocksZ: 3, seed })),
  ...[1, 2, 3].map((seed) => tileCity({ blocksX: 6, blocksZ: 4, seed })),
];
const label = (c: TileCity): string => `${c.blocksX}x${c.blocksZ} seed ${c.seed}`;

const ACTIVE = new Set<CalibrationKey>(tileKeys());
/** The plan of the pack: every cell drawn from its piece. */
const packPlan = (c: TileCity): KerbPlan => tileKerbPlan(c, (q) => tileKeyOf(q, ACTIVE));
/** The plan of a city with no pack at all: every cell drawn in code. */
const codePlan = (c: TileCity): KerbPlan => tileKerbPlan(c, () => null);

const withCells = (c: TileCity, f: (q: TileCell) => TileCell): TileCity => ({ ...c, cells: c.cells.map(f) });
/** A city as it was before 063 F: no return cell, no flush cell. */
const asBefore = (c: TileCity): TileCity => withCells(c, (q) => (q.role === "pavement" && (q.variant & (PAVEMENT_RETURN_NEAR | PAVEMENT_RETURN_FAR | PAVEMENT_FLUSH)) !== 0 ? { ...q, variant: 0 } : q));

const cellMap = (c: TileCity): Map<string, TileCell> => {
  const out = new Map<string, TileCell>();
  for (const q of c.cells) {
    out.set(`${q.i},${q.j}`, q);
    if (q.cells === 2) out.set(q.yaw === 0 || q.yaw === 180 ? `${q.i + 1},${q.j}` : `${q.i},${q.j + 1}`, q);
  }
  return out;
};

/** The distance from a point to a segment, metres. */
function distToSeg(p: Mp, a: Mp, b: Mp): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

interface Line {
  kind: string;
  a: Mp;
  b: Mp;
  path: string;
}

/**
 * The lines the kerb faces have to lie on, written out here from the path alone (not from the plan): a street edge, a dip and a flank's line stand `KERB_INSET_M` inside the nominal line (a flank's two ends are the pack faces' ends), and a
 * return runs from the street kerb face to the building line.
 */
function expectedLines(paths: readonly KerbPath[]): Line[] {
  const out: Line[] = [];
  const shift = (p: Mp, d: Mp): Mp => ({ x: p.x + d.x * KERB_INSET_M, z: p.z + d.z * KERB_INSET_M });
  for (const p of paths) {
    for (const s of p.segs) {
      if (s.kind === "opening") continue;
      // A return runs from the street kerb face to the building line; the path's own segment runs in the path's direction, so the street end is the near return's first point and the far return's last.
      if (s.kind === "return") out.push({ kind: "return", a: shift(s.which === "near" ? s.a : s.b, p.across), b: s.which === "near" ? s.b : s.a, path: p.id });
      else out.push({ kind: s.kind, a: shift(s.a, s.kind === "flank" ? p.across : s.walk), b: shift(s.b, s.kind === "flank" ? p.across : s.walk), path: p.id });
    }
  }
  return out;
}

/** The faces of a plan that lie on one expected line (both ends within `KERB_TOL_M` of it), and the gaps they leave along it. */
function coverage(line: Line, plan: KerbPlan): { gap: number; heightOff: number } {
  const len = Math.hypot(line.b.x - line.a.x, line.b.z - line.a.z);
  const ux = (line.b.x - line.a.x) / len;
  const uz = (line.b.z - line.a.z) / len;
  const spans: [number, number][] = [];
  let heightOff = 0;
  for (const f of plan.faces) {
    if (distToSeg(f.a, line.a, line.b) > KERB_TOL_M + 1e-9 && distToSeg(f.b, line.a, line.b) > KERB_TOL_M + 1e-9) continue;
    // Collinear within the tolerance: both ends of the face are no farther than the tolerance from the line's own extension.
    const off = (p: Mp): number => Math.abs((p.x - line.a.x) * uz - (p.z - line.a.z) * ux);
    if (off(f.a) > KERB_TOL_M + 1e-9 || off(f.b) > KERB_TOL_M + 1e-9) continue;
    const ta = (f.a.x - line.a.x) * ux + (f.a.z - line.a.z) * uz;
    const tb = (f.b.x - line.a.x) * ux + (f.b.z - line.a.z) * uz;
    spans.push([Math.min(ta, tb), Math.max(ta, tb)]);
    heightOff = Math.max(heightOff, Math.abs(f.top_m - KERB_LIP_TOP_M));
  }
  spans.sort((p, q) => p[0] - q[0]);
  let reach = 0;
  let gap = 0;
  for (const [lo, hi] of spans) {
    if (lo > reach) gap = Math.max(gap, lo - reach);
    reach = Math.max(reach, hi);
  }
  if (reach < len) gap = Math.max(gap, len - reach);
  return { gap, heightOff };
}

/** What is wrong with a plan against the line, as sentences: a gap over `KERB_GAP_MAX_M`, a lip off by over `KERB_HEIGHT_TOL_M`, and a face on no line. */
function problems(city: TileCity, plan: KerbPlan): string[] {
  const lines = expectedLines(kerbLine(city));
  const bad: string[] = [];
  for (const l of lines) {
    const c = coverage(l, plan);
    if (c.gap > KERB_GAP_MAX_M) bad.push(`${l.path} ${l.kind} ${JSON.stringify(l.a)}: a gap of ${c.gap.toFixed(2)} m`);
    if (c.heightOff > KERB_HEIGHT_TOL_M) bad.push(`${l.path} ${l.kind}: a lip ${c.heightOff.toFixed(3)} m off`);
  }
  for (const f of plan.faces) {
    const on = lines.some((l) => distToSeg(f.a, l.a, l.b) <= KERB_TOL_M + 1e-9 && distToSeg(f.b, l.a, l.b) <= KERB_TOL_M + 1e-9);
    if (!on) bad.push(`a ${f.part} face at ${JSON.stringify(f.a)}-${JSON.stringify(f.b)} is on no kerb line`);
    if (Math.abs(f.top_m - KERB_LIP_TOP_M) > KERB_HEIGHT_TOL_M) bad.push(`a ${f.part} face's lip is ${f.top_m} m`);
  }
  return bad;
}

describe("the kerb line (063 F, criteria 33 and 37a)", () => {
  it("is a path of segments that join end to end, from corner to corner, with the dips off its chain", () => {
    const fails: string[] = [];
    let paths = 0;
    for (const c of CITIES) {
      for (const p of kerbLine(c)) {
        paths++;
        const chain = p.segs.filter((s) => s.kind !== "dip");
        for (let n = 1; n < chain.length; n++) {
          const u = chain[n - 1]!.b;
          const v = chain[n]!.a;
          if (Math.hypot(u.x - v.x, u.z - v.z) > 1e-9) fails.push(`${label(c)} ${p.id}: segment ${n} does not start where the last ended`);
        }
        expect(p.points).toHaveLength(chain.length + 1);
        expect(p.points[0]).toEqual(chain[0]!.a);
        // Every segment is along one axis, and a dip is on the street edge (the same line as the path's edge segments, if it has any).
        for (const q of p.segs) if (Math.abs(q.a.x - q.b.x) > 1e-9 && Math.abs(q.a.z - q.b.z) > 1e-9) fails.push(`${label(c)} ${p.id}: a ${q.kind} segment off the axes`);
      }
    }
    expect(fails).toEqual([]);
    expect(paths).toBeGreaterThan(100);
  });

  it("has one path per stretch of pavement and kerb-cut cells in a street's first and last band, and ends each at a cell that is neither", () => {
    const fails: string[] = [];
    for (const c of CITIES) {
      const at = cellMap(c);
      const want = new Set<string>();
      let runs = 0;
      for (const s of c.streets) {
        const n = s.bands.length;
        for (const k of [0, n - 1]) {
          const a = s.axis === "x" ? s.across0 + k : s.across0 + n - 1 - k;
          for (let t = 0; t < 400; t++) {
            const q = s.axis === "x" ? at.get(`${t},${a}`) : at.get(`${a},${t}`);
            const walk = q !== undefined && (q.role === "pavement" || q.role === "kerbCut");
            const prev = t === 0 ? undefined : s.axis === "x" ? at.get(`${t - 1},${a}`) : at.get(`${a},${t - 1}`);
            const prevWalk = prev !== undefined && (prev.role === "pavement" || prev.role === "kerbCut");
            if (walk && !prevWalk) {
              runs++;
              want.add(`${s.id}|${t}`);
            }
          }
        }
      }
      const got = kerbLine(c).map((p) => `${p.street}|${p.id.split("|")[2]}`);
      // Two sides of one street can start at the same cell along it, so compare counts and the set of (street, start).
      if (got.length !== runs) fails.push(`${label(c)}: ${got.length} paths for ${runs} stretches`);
      for (const g of got) if (!want.has(g)) fails.push(`${label(c)}: a path at ${g} that is not a stretch`);
    }
    expect(fails).toEqual([]);
  });

  it("goes round every inlet as Josh drew it: along the street edge, a return up the near side to the building line, the opening, the far side down, a return, and on; the dip between the returns joins both", () => {
    let inlets = 0;
    const fails: string[] = [];
    for (const c of CITIES) {
      for (const p of kerbLine(c)) {
        const chain = p.segs.filter((s) => s.kind !== "dip");
        const kinds = chain.map((s) => s.kind);
        const ids = new Set(p.returns.map((r) => r.inlet));
        for (const id of ids) {
          inlets++;
          const near = p.returns.filter((r) => r.inlet === id && r.side === "near");
          const far = p.returns.filter((r) => r.inlet === id && r.side === "far");
          if (near.length !== 1 || far.length !== 1) {
            fails.push(`${label(c)} ${id}: ${near.length} near and ${far.length} far returns`);
            continue;
          }
          const dip = p.dips.find((d) => d.inlet === id);
          if (!dip) {
            fails.push(`${label(c)} ${id}: no dip`);
            continue;
          }
          // The dip's two ends are the two returns' meeting points with the street edge.
          if (Math.hypot(dip.a.x - near[0]!.at.x, dip.a.z - near[0]!.at.z) > 1e-9 || Math.hypot(dip.b.x - far[0]!.at.x, dip.b.z - far[0]!.at.z) > 1e-9) fails.push(`${label(c)} ${id}: the dip does not join the returns`);
        }
        // Every opening is a return before it and a return after it, and its two ends are on the building line, as far from the street edge as the pavement is deep.
        for (const [i0, i1] of p.openings) {
          if (kinds[i0 - 1] !== "return" || kinds[i1] !== "return") fails.push(`${label(c)} ${p.id}: an opening is not between two returns`);
          const a = p.points[i0]!;
          const b = p.points[i1]!;
          const sameLine = Math.abs(a.x - b.x) < 1e-9 || Math.abs(a.z - b.z) < 1e-9;
          if (!sameLine) fails.push(`${label(c)} ${p.id}: an opening is not straight`);
        }
        if (p.openings.length !== p.dips.length) fails.push(`${label(c)} ${p.id}: ${p.openings.length} openings and ${p.dips.length} dips`);
      }
    }
    expect(fails).toEqual([]);
    expect(inlets).toBeGreaterThan(150);
  });

  it("has one inlet for every kerb cut: a court drive or a frontage lot (2 cells) and an alley's mouth (1), and every one's returns reach the building line, a pavement cell deep", () => {
    let inlets = 0;
    let cutCells = 0;
    const fails: string[] = [];
    for (const c of CITIES) {
      const cuts = c.cells.filter((q) => q.role === "kerbCut").length;
      cutCells += cuts;
      const paths = kerbLine(c);
      const dipCells = paths.reduce((n, p) => n + p.segs.filter((s) => s.kind === "dip").length, 0);
      if (dipCells !== cuts) fails.push(`${label(c)}: ${dipCells} dipped edges for ${cuts} kerb cuts`);
      for (const p of paths) {
        for (const r of p.segs.filter((s) => s.kind === "return")) {
          inlets++;
          const along = Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z);
          // From the street edge (or the flank's end, one cell further out) to the building line: 5 m or 10 m.
          if (Math.abs(along - TILE_M) > 1e-9 && Math.abs(along - 2 * TILE_M) > 1e-9) fails.push(`${label(c)} ${p.id}: a return ${along} m long`);
        }
      }
    }
    expect(fails).toEqual([]);
    expect(cutCells).toBeGreaterThan(300);
    expect(inlets).toBeGreaterThan(300);
  });

  it("steps out round every build-out stretch: a flank at each end that has no build-out beyond it, from the pavement's carriageway edge to the build-out's outer edge", () => {
    let ends = 0;
    const fails: string[] = [];
    for (const c of CITIES) {
      const at = cellMap(c);
      const flankLines = kerbLine(c).flatMap((p) => p.segs.filter((s) => s.kind === "flank" || s.kind === "return"));
      for (const b of c.cells) {
        if (b.role !== "buildout") continue;
        const s = c.streets.find((q) => q.id === b.street)!;
        const [di, dj] = s.axis === "x" ? [1, 0] : [0, 1];
        for (const sg of [-1, 1]) {
          const n = at.get(`${b.i + sg * di},${b.j + sg * dj}`);
          if (n?.role === "buildout") continue;
          ends++;
          // The boundary line between the two cells, across the build-out's depth (its 5 m).
          const edge = s.axis === "x" ? (b.i + (sg > 0 ? 1 : 0)) * TILE_M : (b.j + (sg > 0 ? 1 : 0)) * TILE_M;
          const lo = s.axis === "x" ? b.j * TILE_M : b.i * TILE_M;
          const hi = lo + TILE_M;
          const covered = flankLines.some((f) => {
            const onLine = s.axis === "x" ? Math.abs(f.a.x - edge) < 1e-9 && Math.abs(f.b.x - edge) < 1e-9 : Math.abs(f.a.z - edge) < 1e-9 && Math.abs(f.b.z - edge) < 1e-9;
            if (!onLine) return false;
            const v0 = Math.min(s.axis === "x" ? f.a.z : f.a.x, s.axis === "x" ? f.b.z : f.b.x);
            const v1 = Math.max(s.axis === "x" ? f.a.z : f.a.x, s.axis === "x" ? f.b.z : f.b.x);
            return v0 <= lo + 1e-9 && v1 >= hi - 1e-9;
          });
          if (!covered) fails.push(`${label(c)}: no flank at the ${sg > 0 ? "+" : "-"} end of the build-out ${b.i},${b.j}`);
        }
      }
    }
    expect(fails).toEqual([]);
    expect(ends).toBeGreaterThan(100);
  });

  it("is pure data on the city: the same path every time, and it reads nothing but the cells and the streets", () => {
    const c = CITIES[0]!;
    expect(JSON.stringify(kerbLine(c))).toBe(JSON.stringify(kerbLine(tileCity({ blocksX: 3, blocksZ: 3, seed: 1 }))));
    expect(JSON.stringify(kerbLine({ cells: c.cells, streets: c.streets }))).toBe(JSON.stringify(kerbLine(c)));
  });
});

describe("the kerb faces on the line (063 F, criteria 34, 35 and 37c)", () => {
  it("puts every drawn kerb face on the line, within KERB_TOL_M in plan and 0.02 m in lip height, and leaves no part of it uncovered for over 0.05 m: the pack's faces and the code strips", () => {
    for (const c of CITIES) {
      expect(problems(c, packPlan(c)), label(c)).toEqual([]);
    }
  });

  it("does the same with no pack at all: every cell a code fallback, its strip on the same inset line", () => {
    for (const c of CITIES) {
      const plan = codePlan(c);
      expect(problems(c, plan), label(c)).toEqual([]);
      // Every pavement, kerb-cut and build-out cell on the path brings a code strip of its own (a flush cell none); the flanks and returns are code either way.
      expect(plan.faces.every((f) => f.kind === "code")).toBe(true);
    }
  });

  it("draws a pack face for every pavement cell (not flush), kerb cut and build-out on the line, at its key's inset, and a code strip for every flank and return", () => {
    for (const c of CITIES) {
      const plan = packPlan(c);
      const pack = plan.faces.filter((f) => f.kind === "pack");
      const want = c.cells.filter((q) => (q.role === "pavement" && (q.variant & PAVEMENT_FLUSH) === 0) || q.role === "kerbCut" || q.role === "buildout");
      // Every build-out cell's outer edge, every plain pavement cell's own edge and every kerb-cut cell's dip: one face each, except a cell whose edge is at a crossing or a corner (none: a cell of the first and last bands is on a path).
      expect(pack.length, label(c)).toBe(want.length);
      const byCell = new Map(c.cells.map((q) => [`${q.i},${q.j}`, q] as const));
      for (const f of pack) {
        const key = tileKeyOf(byCell.get(`${f.cell!.i},${f.cell!.j}`)!, ACTIVE)!;
        const spec = KERB_FACES_M[key]!.find((q) => q.side === "+z")!;
        expect(f.inset_m).toBe(spec.inset_m);
        expect(f.top_m).toBe(spec.top_m);
        // 5 m long, a whole cell's edge.
        expect(Math.hypot(f.b.x - f.a.x, f.b.z - f.a.z)).toBeCloseTo(TILE_M, 9);
      }
      const code = plan.faces.filter((f) => f.kind === "code");
      expect(code.every((f) => f.part === "flank" || f.part === "return")).toBe(true);
      expect(code.filter((f) => f.part === "return").length, label(c)).toBe(c.cells.filter((q) => q.role === "pavement" && (q.variant & (PAVEMENT_RETURN_NEAR | PAVEMENT_RETURN_FAR)) !== 0).length);
    }
  });

  it("lays a return on both sides of every inlet: every kerb cut run has a return cell before it and one after it, and the plan has a code strip down each side", () => {
    let inlets = 0;
    for (const c of CITIES) {
      const plan = packPlan(c);
      const strips = plan.faces.filter((f) => f.part === "return");
      // Counted another way: each kerb-cut run has a return-flagged pavement cell on each side along its street.
      const at = cellMap(c);
      const seen = new Set<string>();
      let runs = 0;
      for (const q of c.cells) {
        if (q.role !== "kerbCut" || seen.has(`${q.i},${q.j}`)) continue;
        const s = c.streets.find((x) => x.id === q.street)!;
        const [di, dj] = s.axis === "x" ? [1, 0] : [0, 1];
        let i = q.i;
        let j = q.j;
        while (at.get(`${i - di},${j - dj}`)?.role === "kerbCut") {
          i -= di;
          j -= dj;
        }
        runs++;
        const before = at.get(`${i - di},${j - dj}`)!;
        while (at.get(`${i},${j}`)?.role === "kerbCut") {
          seen.add(`${i},${j}`);
          i += di;
          j += dj;
        }
        const after = at.get(`${i},${j}`)!;
        expect(before.role, `${label(c)} ${q.i},${q.j}`).toBe("pavement");
        expect(after.role, `${label(c)} ${q.i},${q.j}`).toBe("pavement");
        expect(before.variant & PAVEMENT_RETURN_NEAR, `${label(c)} ${q.i},${q.j}: the near return cell`).toBe(PAVEMENT_RETURN_NEAR);
        expect(after.variant & PAVEMENT_RETURN_FAR, `${label(c)} ${q.i},${q.j}: the far return cell`).toBe(PAVEMENT_RETURN_FAR);
      }
      inlets += runs;
      expect(strips.length, label(c)).toBe(2 * runs);
    }
    expect(inlets).toBeGreaterThan(150);
  });

  it("reaches the building line with each return, a pavement cell's back edge, and joins the dip to both returns", () => {
    let returns = 0;
    const fails: string[] = [];
    for (const c of CITIES) {
      const plan = packPlan(c);
      const at = cellMap(c);
      for (const f of plan.faces.filter((q) => q.part === "return")) {
        returns++;
        const cell = at.get(`${f.cell!.i},${f.cell!.j}`)!;
        const s = c.streets.find((x) => x.id === cell.street)!;
        // The cell's back edge: the one farther from the street's centre line.
        const back = s.axis === "x" ? cell.z_m + (cell.z_m > s.centre_m ? 1 : -1) * (TILE_M / 2) : cell.x_m + (cell.x_m > s.centre_m ? 1 : -1) * (TILE_M / 2);
        const end = s.axis === "x" ? f.b.z : f.b.x;
        if (Math.abs(end - back) > KERB_GAP_MAX_M) fails.push(`${label(c)}: a return ends ${Math.abs(end - back).toFixed(2)} m short of the building line at ${cell.i},${cell.j}`);
      }
      for (const p of kerbLine(c)) {
        for (const d of p.dips) {
          // The dip's line, a kerb face's inset inside the street edge, from the near return's face to the far one's: the dip faces cover it, and each end is on a return strip.
          const line: Line = { kind: "dip", a: { x: d.a.x + p.across.x * KERB_INSET_M, z: d.a.z + p.across.z * KERB_INSET_M }, b: { x: d.b.x + p.across.x * KERB_INSET_M, z: d.b.z + p.across.z * KERB_INSET_M }, path: p.id };
          const cov = coverage(line, { faces: plan.faces.filter((f) => f.part === "dip") });
          if (cov.gap > KERB_GAP_MAX_M) fails.push(`${label(c)}: the dip of ${d.inlet} has a gap of ${cov.gap.toFixed(2)} m`);
          // (A return beside a build-out runs on past the dip's line, out to the build-out's outer kerb: the dip meets it on its side.)
          const returns = plan.faces.filter((f) => f.part === "return");
          for (const e of [line.a, line.b]) if (!returns.some((f) => distToSeg(e, f.a, f.b) <= KERB_TOL_M)) fails.push(`${label(c)}: the dip of ${d.inlet} does not meet a return at ${JSON.stringify(e)}`);
        }
      }
    }
    expect(fails).toEqual([]);
    expect(returns).toBeGreaterThan(300);
  });

  it("fails on today's plan, the city before 063 F: kerb cuts with plain straights beside them (no returns) and pavement cells with their own kerb and gutter in front of a build-out (the trench)", () => {
    for (const c of [CITIES[0]!, CITIES[1]!, CITIES[10]!]) {
      const before = problems(asBefore(c), packPlan(asBefore(c)));
      expect(before.length, label(c)).toBeGreaterThan(0);
      // Each of the two jogs on its own is enough.
      const noReturns = withCells(c, (q) => (q.role === "pavement" ? { ...q, variant: q.variant & ~(PAVEMENT_RETURN_NEAR | PAVEMENT_RETURN_FAR) } : q));
      expect(problems(noReturns, packPlan(noReturns)).some((s) => s.includes("a gap")), `${label(c)}: no returns`).toBe(true);
      const noFlush = withCells(c, (q) => (q.role === "pavement" ? { ...q, variant: q.variant & ~PAVEMENT_FLUSH } : q));
      expect(problems(noFlush, packPlan(noFlush)).some((s) => s.includes("is on no kerb line")), `${label(c)}: no flush cells`).toBe(true);
    }
  });

  it("fails on an inlet with one return removed", () => {
    const c = CITIES[0]!;
    const far = c.cells.find((q) => q.role === "pavement" && (q.variant & PAVEMENT_RETURN_FAR) !== 0)!;
    const one = withCells(c, (q) => (q === far ? { ...q, variant: q.variant & ~PAVEMENT_RETURN_FAR } : q));
    const bad = problems(one, packPlan(one));
    expect(bad.length).toBeGreaterThan(0);
    expect(bad.every((s) => s.includes("return"))).toBe(true);
    expect(problems(c, packPlan(c))).toEqual([]);
  });

  it("fails on a build-out with its flank removed, and on a return that stops short of the building line", () => {
    const c = CITIES[0]!;
    const plan = packPlan(c);
    const noFlank: KerbPlan = { faces: plan.faces.filter((f, i) => !(f.part === "flank" && i === plan.faces.findIndex((q) => q.part === "flank"))) };
    expect(problems(c, noFlank).some((s) => s.includes("flank"))).toBe(true);
    const ret = plan.faces.findIndex((f) => f.part === "return");
    const short: KerbPlan = { faces: plan.faces.map((f, i) => (i === ret ? { ...f, b: { x: f.a.x + (f.b.x - f.a.x) * 0.5, z: f.a.z + (f.b.z - f.a.z) * 0.5 } } : f)) };
    expect(problems(c, short).some((s) => s.includes("a gap"))).toBe(true);
    // And a lip lower than the line's by over 0.02 m fails the height check.
    const low: KerbPlan = { faces: plan.faces.map((f, i) => (i === 0 ? { ...f, top_m: f.top_m - 0.05 } : f)) };
    expect(problems(c, low).length).toBeGreaterThan(0);
  });
});

describe("the pieces on the line (063 F, criteria 34 and 37b)", () => {
  it("pins each sidewalk piece's kerb faces: every face's side, its inset from the cell edge (about 0.66 m) and its lip top (0.30 m)", () => {
    for (const [key, faces] of Object.entries(KERB_FACES_M)) {
      expect(faces!.length, key).toBeGreaterThan(0);
      for (const f of faces!) {
        expect(f.inset_m, key).toBeGreaterThan(0.6);
        expect(f.inset_m, key).toBeLessThan(0.72);
        expect(f.top_m, key).toBe(0.3);
        // (The dip corner is the junction corners ramp, never laid on the kerb line.)
        if (!key.includes("Dip_Corner")) expect(Math.abs(f.inset_m - KERB_INSET_M), `${key}: within the tolerance of the common inset`).toBeLessThanOrEqual(KERB_TOL_M);
      }
    }
    expect(Object.keys(KERB_FACES_M).map((k) => k.slice(k.indexOf(":") + 1)).sort()).toEqual(["SM_Env_Sidewalk_Dip_Corner_01", "SM_Env_Sidewalk_Dip_01", "SM_Env_Sidewalk_Grate_01", "SM_Env_Sidewalk_Straight_02"].sort());
    expect(KERB_LIP_TOP_M).toBe(0.3);
  });

  it("lays the plain straight (never a grate) on a return cell and the plain slab on a flush cell, and keeps the grate elsewhere", () => {
    let returns = 0;
    let flush = 0;
    let grates = 0;
    const SLAB = "city-pack:SM_Env_Sidewalk_01";
    const STRAIGHT = "city-pack:SM_Env_Sidewalk_Straight_02";
    for (const c of CITIES) {
      for (const q of c.cells) {
        if (q.role !== "pavement") continue;
        const key = tileKeyOf(q, ACTIVE);
        if ((q.variant & PAVEMENT_FLUSH) !== 0) {
          flush++;
          expect(key).toBe(SLAB);
        } else if ((q.variant & (PAVEMENT_RETURN_NEAR | PAVEMENT_RETURN_FAR)) !== 0) {
          returns++;
          expect(key).toBe(STRAIGHT);
        }
        if ((q.variant & (PAVEMENT_RETURN_NEAR | PAVEMENT_RETURN_FAR | PAVEMENT_FLUSH)) !== 0) expect(q.variant & PAVEMENT_GRATE, "a return or flush cell is never a grate").toBe(0);
        if (q.variant === PAVEMENT_GRATE) grates++;
      }
    }
    expect(returns).toBeGreaterThan(100);
    expect(flush).toBeGreaterThan(100);
    expect(grates).toBeGreaterThan(30);
  });
});

describe("the module is pure", () => {
  const src = readFileSync("src/render3d/kerbline.ts", "utf8");
  it("imports no three, no DOM, no grid, night, play or ui, and reads no address", () => {
    const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
    expect(imports.sort()).toEqual(["../core", "./tilecity", "./tileslots"].sort());
    expect(/\blocation\b|\bdocument\b|\bwindow\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))).toBe(false);
  });
});
