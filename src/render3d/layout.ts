/**
 * Pure layout of the 3D view (ticket 037, 041): wire runs strung on poles along the circuit's lines, three conductors to a run, and the
 * service drops to the buildings beside them. The town's streets, lots and places are in town.ts. No three, no DOM, no play.
 * World mapping: map (x, y) is world (x, height, z = y), 1 unit = 1 unit, y up.
 * Wires are visual only; nothing here touches a rule.
 */

import type { Puzzle } from "../core";
import type { Town } from "./town";

export const POLE_HEIGHT = 1.6;
/** The centre of a breaker, fuse box or battery box: its top meets the wire at POLE_HEIGHT. */
export const NODE_BODY_Y = POLE_HEIGHT - 0.3;
/** Each conductor's tube radius, world units (three of them to a run on a run with a pole; ticket 041 C). */
export const WIRE_RADIUS = 0.03;
/** On a run with an intermediate pole the three conductors sit this far either side of the run's line, along the cross-arm. */
export const PHASE_OFFSET = 0.22;
/** Height of a wire's shadow strip on the street (the streets' tops are lower). */
export const SHADOW_Y = 0.025;
/** Where a damaged cable is cut: the gap between its two hanging ends, how far the ends droop, and points per end minus one. */
export const BREAK_GAP = 0.3;
export const HANG_DROP = 0.6;
export const HANG_SEGMENTS = 6;
/** No two poles on a run are further apart than this. */
export const POLE_SPACING = 3;
/** Sag at mid-span, as a fraction of the span's length. */
export const SAG_RATIO = 0.04;
/** A span's polyline has SAG_SEGMENTS + 1 points. */
export const SAG_SEGMENTS = 8;
/**
 * A line's pick target (along its centre conductor) reaches this far (world units). At least PHASE_OFFSET + WIRE_RADIUS + 0.03,
 * so a click on any of the three conductors picks the line.
 */
export const WIRE_PICK_RADIUS = 0.3;
/**
 * A service drop runs to a building whose front is within this (across the ground) of an intermediate pole on the run beside its street.
 * The ticket said 2, but a lot across a circuit road from its wire has its front at least KERB_OFFSET + ROAD_W + PAVE_W + SETBACK = 2.1 from
 * the line, so at 2 only 13 lots on the whole ladder (none facing their own run) can ever be reached. At 2.5 it is 108 (97 on their own run).
 */
export const DROP_REACH = 2.5;
/** A drop leaves its pole this far under the wire's height, and lands DROP_END_Y high on the building's front (two thirds of its height if that is lower). */
export const DROP_DROP = 0.2;
export const DROP_END_Y = 0.5;
/** A transformer can hangs this far from its pole's axis (toward its first drop) and this far under the wire's height (its centre). */
export const CAN_OFFSET = 0.1;
export const CAN_DROP = 0.3;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** One conductor's cut: two ends hang from the poles either side of a gap. */
export interface ConductorCut {
  /** Each end leaves its attachment point (the span's two ends) toward the gap: HANG_SEGMENTS + 1 points, drooping. */
  ends: [Vec3[], Vec3[]];
  /** The whole conductor on each side of the cut: half 0 from the `from` node to tip 0, half 1 from the `to` node to tip 1. */
  halves: [Vec3[], Vec3[]];
  /** The gap's middle: the broken span's chord midpoint in x and z, at the tips' height. */
  gap: Vec3;
}

/** A damaged cable's cut: every conductor is cut in the same span. Read from the file's faults, not the state. */
export interface WireBreak extends ConductorCut {
  /** The span (index into `spans`) that holds the run's midpoint by length. */
  span: number;
  /** `ends`, `halves` and `gap` above are the centre conductor's. One cut per conductor, in the order of `WireRun.conductors`. */
  cuts: ConductorCut[];
}

export interface WireRun {
  /** The line id. */
  id: string;
  from: string;
  to: string;
  /** The attachment points of the run's line, first at `from`'s pos and last at `to`'s, at POLE_HEIGHT. Intermediate ones are the poles. */
  attach: Vec3[];
  /** The centre conductor, one polyline per span between attachment points, SAG_SEGMENTS + 1 points each. */
  spans: Vec3[][];
  /**
   * The conductors, each its whole polyline (its spans joined). Three, at -PHASE_OFFSET, 0 and +PHASE_OFFSET across the run at each
   * intermediate pole, all starting and ending at the run's own end attachment points; or one when the run has no intermediate pole.
   * The one with offset 0 is `conductors[centre]` and equals `runPoints(run)`. Its point `i * SAG_SEGMENTS` is the one on pole `i`.
   */
  conductors: Vec3[][];
  /** Index of the centre conductor in `conductors`. */
  centre: number;
  /** The unit vector along the cross-arm: across the run, in the ground plane. */
  arm: { x: number; z: number };
  /** The wire's middle: the sagging middle of the middle span, or the middle pole's attachment point when the span count is even. */
  mid: Vec3;
  /** Horizontal length of the whole run. */
  length: number;
  /** Set for every line with a damaged-cable fault in the file. */
  brk: WireBreak | null;
}

/** One wire run per line, keyed by line id, in file order. Decor stays a street with no wire. */
export function wireLayout(puzzle: Puzzle): WireRun[] {
  const pos = new Map<string, readonly [number, number]>();
  for (const n of puzzle.nodes) pos.set(n.id, n.pos);
  const out: WireRun[] = [];
  const cut = new Set(puzzle.faults.filter((f) => f.kind === "damaged-cable").map((f) => f.at));
  for (const l of puzzle.lines) {
    const a = pos.get(l.from);
    const b = pos.get(l.to);
    if (!a || !b) continue;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(length / POLE_SPACING - 1e-9));
    const attach: Vec3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      attach.push({ x: a[0] + (b[0] - a[0]) * t, y: POLE_HEIGHT, z: a[1] + (b[1] - a[1]) * t });
    }
    // The cross-arm runs across the run: (-dz, dx) of the unit direction.
    const arm = length > 0 ? { x: -(b[1] - a[1]) / length, z: (b[0] - a[0]) / length } : { x: 1, z: 0 };
    const offsets = n >= 2 ? [-PHASE_OFFSET, 0, PHASE_OFFSET] : [0];
    // Each conductor's attachment points: the run's own at the two nodes, offset along the arm at every pole between.
    const attachK = offsets.map((o) => attach.map((p, i) => (i === 0 || i === n || o === 0 ? p : { x: p.x + arm.x * o, y: p.y, z: p.z + arm.z * o })));
    const spansK = attachK.map((at) => {
      const sp: Vec3[][] = [];
      for (let i = 0; i < n; i++) sp.push(sagSpan(at[i]!, at[i + 1]!));
      return sp;
    });
    const centre = offsets.indexOf(0);
    const spans = spansK[centre]!;
    const mid = n % 2 === 1 ? { ...spans[(n - 1) / 2]![SAG_SEGMENTS / 2]! } : { ...attach[n / 2]! };
    const brk: WireBreak | null = cut.has(l.id) ? breakOf(attachK, spansK, centre) : null;
    out.push({ id: l.id, from: l.from, to: l.to, attach, spans, conductors: spansK.map(joinSpans), centre, arm, mid, length, brk });
  }
  return out;
}

/** One end hanging from `a` toward `b`: level at the pole, drooping HANG_DROP by the tip, which stops short of the span's middle by half the gap. */
function hangingEnd(a: Vec3, b: Vec3): Vec3[] {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const h = Math.hypot(dx, dz);
  const reach = Math.max(h / 2 - BREAK_GAP / 2, 0);
  const ux = h > 0 ? dx / h : 0;
  const uz = h > 0 ? dz / h : 0;
  const pts: Vec3[] = [];
  for (let j = 0; j <= HANG_SEGMENTS; j++) {
    const s = j / HANG_SEGMENTS;
    pts.push({ x: a.x + ux * reach * s, y: a.y - HANG_DROP * s * s, z: a.z + uz * reach * s });
  }
  return pts;
}

/** Every conductor cut in the span that holds the run's middle (ticket 041 C: all of them, in the same span). */
function breakOf(attachK: Vec3[][], spansK: Vec3[][][], centre: number): WireBreak {
  const span = Math.floor(spansK[0]!.length / 2);
  const cuts = attachK.map((at, k) => cutOf(at, spansK[k]!, span));
  return { ...cuts[centre]!, span, cuts };
}

function cutOf(attach: Vec3[], spans: Vec3[][], span: number): ConductorCut {
  const n = spans.length;
  const a = attach[span]!;
  const b = attach[span + 1]!;
  const e0 = hangingEnd(a, b);
  const e1 = hangingEnd(b, a);
  const half0: Vec3[] = [];
  for (let i = 0; i < span; i++) for (let j = i === 0 ? 0 : 1; j < spans[i]!.length; j++) half0.push(spans[i]![j]!);
  for (let j = span === 0 ? 0 : 1; j < e0.length; j++) half0.push(e0[j]!);
  const half1: Vec3[] = [];
  for (let i = n - 1; i > span; i--) {
    const rev = [...spans[i]!].reverse();
    for (let j = i === n - 1 ? 0 : 1; j < rev.length; j++) half1.push(rev[j]!);
  }
  for (let j = span === n - 1 ? 0 : 1; j < e1.length; j++) half1.push(e1[j]!);
  return { ends: [e0, e1], halves: [half0, half1], gap: { x: (a.x + b.x) / 2, y: POLE_HEIGHT - HANG_DROP, z: (a.z + b.z) / 2 } };
}

/** A run's shadow on the street: the same x and z at SHADOW_Y. */
export function shadowOf(points: readonly Vec3[]): Vec3[] {
  return points.map((p) => ({ x: p.x, y: SHADOW_Y, z: p.z }));
}

/** The span between two attachment points: a parabola whose lowest point, at mid-span, is SAG_RATIO x span length below the chord. */
export function sagSpan(a: Vec3, b: Vec3): Vec3[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const pts: Vec3[] = [];
  for (let j = 0; j <= SAG_SEGMENTS; j++) {
    const t = j / SAG_SEGMENTS;
    const sag = j === 0 || j === SAG_SEGMENTS ? 0 : SAG_RATIO * len * 4 * t * (1 - t);
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - sag, z: a.z + (b.z - a.z) * t });
  }
  return pts;
}

/** Spans joined into one polyline (the shared end points once). */
function joinSpans(spans: readonly (readonly Vec3[])[]): Vec3[] {
  const pts: Vec3[] = [];
  spans.forEach((s, i) => {
    for (let j = i === 0 ? 0 : 1; j < s.length; j++) pts.push(s[j]!);
  });
  return pts;
}

/** A run's whole polyline as one list: the centre conductor (its spans joined, the shared end points once). */
export function runPoints(run: WireRun): Vec3[] {
  return joinSpans(run.spans);
}

/** Write the point a fraction `f` (0..1) of the way along `pts` (by polyline length) into `out`. Allocation-free given `cum`, the cumulative lengths. */
export function pointAlong(pts: readonly Vec3[], cum: readonly number[], f: number, out: Vec3): Vec3 {
  const total = cum[cum.length - 1] ?? 0;
  const d = Math.min(Math.max(f, 0), 1) * total;
  let i = 1;
  while (i < cum.length - 1 && cum[i]! < d) i++;
  const a = pts[i - 1]!;
  const b = pts[i]!;
  const seg = cum[i]! - cum[i - 1]!;
  const t = seg > 0 ? (d - cum[i - 1]!) / seg : 0;
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.z = a.z + (b.z - a.z) * t;
  return out;
}

/** Cumulative polyline lengths, starting at 0. */
export function cumulative(pts: readonly Vec3[]): number[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    cum.push(cum[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  return cum;
}

// ---- service drops and transformer cans (ticket 041 C5) ----

/** A thin wire from an intermediate pole to the front of a building. Scenery: no state, no pick. */
export interface Drop {
  /** The run it hangs from, and the pole's index in `run.attach` (always an intermediate one). */
  run: string;
  pole: number;
  /** The building: an index into `town.lots`. */
  lot: number;
  /** At the pole, DROP_DROP under the wire. */
  from: Vec3;
  /** On the middle of the lot's front edge, DROP_END_Y high (or two thirds of the lot's height cap when that is lower). */
  to: Vec3;
  /** The horizontal length, at most DROP_REACH. */
  ground: number;
}

/** A transformer can: on a pole that carries at least one drop. `x` and `z` are the can's centre; the pole's is `run.attach[pole]`. */
export interface Can {
  run: string;
  pole: number;
  x: number;
  y: number;
  z: number;
}

const DROP_EPS = 1e-4;

/**
 * Does the ground line from (x0, z0) to (x1, z1) pass through the inside of `lot` (its edges shrunk by DROP_EPS, so one that only
 * ends on an edge does not count)? Liang-Barsky against the lot's rectangle in its own frame.
 */
function crossesLot(lot: Town["lots"][number], x0: number, z0: number, x1: number, z1: number): boolean {
  const ex = Math.cos(lot.yaw);
  const ez = -Math.sin(lot.yaw);
  const fx = Math.sin(lot.yaw);
  const fz = Math.cos(lot.yaw);
  const hw = lot.w / 2 - DROP_EPS;
  const hd = lot.d / 2 - DROP_EPS;
  const u0 = (x0 - lot.x) * ex + (z0 - lot.z) * ez;
  const v0 = (x0 - lot.x) * fx + (z0 - lot.z) * fz;
  const du = (x1 - x0) * ex + (z1 - z0) * ez;
  const dv = (x1 - x0) * fx + (z1 - z0) * fz;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    // The inequality p * t <= q must hold.
    if (Math.abs(p) < 1e-12) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (!clip(-du, u0 + hw) || !clip(du, hw - u0) || !clip(-dv, v0 + hd) || !clip(dv, hd - v0)) return false;
  return t1 - t0 > 1e-9;
}

/**
 * One service drop to each building (never a place) whose front lies within DROP_REACH of an intermediate pole on the run beside its
 * street: the building's nearest such pole, from the pole at POLE_HEIGHT - DROP_DROP to the middle of the lot's front, DROP_END_Y high.
 * A drop whose ground line crosses another lot is skipped. Pure and deterministic; in `town.lots` order.
 */
export function dropLayout(town: Pick<Town, "roads" | "lots">, runs: readonly WireRun[]): Drop[] {
  const runById = new Map(runs.map((r) => [r.id, r] as const));
  const lineOf = new Map<string, string>();
  for (const r of town.roads) if (r.line !== null) lineOf.set(r.id, r.line);
  const out: Drop[] = [];
  town.lots.forEach((lot, li) => {
    const line = lineOf.get(lot.street);
    const run = line === undefined ? undefined : runById.get(line);
    if (!run || run.attach.length < 3) return;
    // The middle of the lot's front edge: its local +z is the way it faces the road.
    const fx = Math.sin(lot.yaw);
    const fz = Math.cos(lot.yaw);
    const tx = lot.x + (fx * lot.d) / 2;
    const tz = lot.z + (fz * lot.d) / 2;
    let best = -1;
    let bestD = Infinity;
    for (let i = 1; i < run.attach.length - 1; i++) {
      const p = run.attach[i]!;
      const d = Math.hypot(tx - p.x, tz - p.z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0 || bestD > DROP_REACH + 1e-9) return;
    const p = run.attach[best]!;
    // A lot that cannot reach the segment is skipped cheaply: its half diagonal bounds how far it can lie from its own centre.
    const mx = (p.x + tx) / 2;
    const mz = (p.z + tz) / 2;
    const reach = bestD / 2;
    for (let j = 0; j < town.lots.length; j++) {
      if (j === li) continue;
      const o = town.lots[j]!;
      if (Math.hypot(o.x - mx, o.z - mz) > reach + Math.hypot(o.w, o.d) / 2 + 0.01) continue;
      if (crossesLot(o, p.x, p.z, tx, tz)) return;
    }
    out.push({
      run: run.id,
      pole: best,
      lot: li,
      from: { x: p.x, y: POLE_HEIGHT - DROP_DROP, z: p.z },
      to: { x: tx, y: Math.min(DROP_END_Y, (lot.hMax * 2) / 3), z: tz },
      ground: bestD,
    });
  });
  return out;
}

/** The transformer cans: one on each pole that has a drop, hung CAN_OFFSET from the pole's axis toward its first drop. In drop order. */
export function canLayout(drops: readonly Drop[], runs: readonly WireRun[]): Can[] {
  const runById = new Map(runs.map((r) => [r.id, r] as const));
  const seen = new Set<string>();
  const out: Can[] = [];
  for (const d of drops) {
    const key = `${d.run}#${d.pole}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const p = runById.get(d.run)!.attach[d.pole]!;
    const dx = d.to.x - p.x;
    const dz = d.to.z - p.z;
    const h = Math.hypot(dx, dz) || 1;
    out.push({ run: d.run, pole: d.pole, x: p.x + (dx / h) * CAN_OFFSET, y: POLE_HEIGHT - CAN_DROP, z: p.z + (dz / h) * CAN_OFFSET });
  }
  return out;
}
