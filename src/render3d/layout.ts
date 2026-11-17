/**
 * Pure layout of the 3D view (ticket 037): wire runs strung on poles along the circuit's lines, and the town's
 * building blocks. No three, no DOM, no play. World mapping: map (x, y) is world (x, height, z = y), 1 unit = 1 unit, y up.
 * Wires are visual only; nothing here touches a rule.
 */

import type { Puzzle } from "../core";
import { DEFAULT_SCALE, cityForMap, footprintLayout, circuitStreets, mapOrigin, stableHash, type Building, type CityRect } from "../render/city";
import { puzzleBounds } from "../render/geometry";

export const POLE_HEIGHT = 1.6;
/** The centre of a breaker, fuse box or battery box: its top meets the wire at POLE_HEIGHT. */
export const NODE_BODY_Y = POLE_HEIGHT - 0.3;
/** The wire tube's radius, world units. */
export const WIRE_RADIUS = 0.05;
/** Height of a wire's shadow strip on the street (the streets' tops are lower). */
export const SHADOW_Y = 0.025;
/** Where a damaged cable is cut: the gap between its two hanging ends, how far the ends droop, and points per end minus one. */
export const BREAK_GAP = 0.3;
export const HANG_DROP = 0.6;
export const HANG_SEGMENTS = 6;
/** No two poles on a run are further apart than this. */
export const POLE_SPACING = 2;
/** Sag at mid-span, as a fraction of the span's length. */
export const SAG_RATIO = 0.12;
/** A span's polyline has SAG_SEGMENTS + 1 points. */
export const SAG_SEGMENTS = 8;
/** A line's pick target reaches this far (world units) from its wire. */
export const WIRE_PICK_RADIUS = 0.15;
export const BLOCK_MIN_H = 0.6;
export const BLOCK_MAX_H = 2.6;
/** Inside the footprint, buildings stay below the wires and places below the lamp heads, so nothing hides a wire. */
export const FOOTPRINT_MAX_H = 1.4;
export const PLACE_MIN_H = 1.0;
export const PLACE_MAX_H = 1.8;
/** How far past the footprint (map units) the city blocks are built. */
export const CITY_WINDOW = 8;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A damaged cable's cut: two ends hang from the poles either side of a gap. Read from the file's faults, not the state. */
export interface WireBreak {
  /** The span (index into `spans`) that holds the run's midpoint by length. */
  span: number;
  /** Each end leaves its attachment point (`attach[span]`, `attach[span + 1]`) toward the gap: HANG_SEGMENTS + 1 points, drooping. */
  ends: [Vec3[], Vec3[]];
  /** The whole wire on each side of the cut: half 0 from the `from` node to tip 0, half 1 from the `to` node to tip 1. */
  halves: [Vec3[], Vec3[]];
  /** The gap's middle: the broken span's chord midpoint in x and z, at the tips' height. */
  gap: Vec3;
}

export interface WireRun {
  /** The line id. */
  id: string;
  from: string;
  to: string;
  /** The attachment points, first at `from`'s pos and last at `to`'s, at POLE_HEIGHT. Intermediate ones are the poles. */
  attach: Vec3[];
  /** One polyline per span between attachment points, SAG_SEGMENTS + 1 points each. */
  spans: Vec3[][];
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
    const spans: Vec3[][] = [];
    for (let i = 0; i < n; i++) spans.push(sagSpan(attach[i]!, attach[i + 1]!));
    const mid = n % 2 === 1 ? { ...spans[(n - 1) / 2]![SAG_SEGMENTS / 2]! } : { ...attach[n / 2]! };
    out.push({ id: l.id, from: l.from, to: l.to, attach, spans, mid, length, brk: cut.has(l.id) ? breakOf(attach, spans) : null });
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

function breakOf(attach: Vec3[], spans: Vec3[][]): WireBreak {
  const n = spans.length;
  const span = Math.floor(n / 2);
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
  return { span, ends: [e0, e1], halves: [half0, half1], gap: { x: (a.x + b.x) / 2, y: POLE_HEIGHT - HANG_DROP, z: (a.z + b.z) / 2 } };
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

/** A run's whole polyline as one list (spans joined, the shared end points once). */
export function runPoints(run: WireRun): Vec3[] {
  const pts: Vec3[] = [];
  run.spans.forEach((s, i) => {
    for (let j = i === 0 ? 0 : 1; j < s.length; j++) pts.push(s[j]!);
  });
  return pts;
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

export type BlockKind = "building" | "place" | "city";

/** A box standing on the ground: centre (x, z), size w (x) by d (z), height h. */
export interface Block {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: BlockKind;
}

export interface PlaceBlock {
  lamp: string;
  /** The words beside the place (footprintLayout's label): the name for a target lamp, null for any other. */
  label: string | null;
  /** A pool place is a pool of light on the lamp's lane: no building. */
  pool: boolean;
  /** The lamp's place: one or several boxes (a gate's two posts, a row of homes); empty for a pool. */
  boxes: Block[];
}

export interface BlockLayout {
  /** The footprint's own lots, then the city's lots round it. */
  blocks: Block[];
  /** One per lamp, in `nodes` order. */
  places: PlaceBlock[];
  /** The area the blocks were built for, in map units. */
  window: CityRect;
}

function heightOf(key: string, lo = BLOCK_MIN_H, hi = BLOCK_MAX_H): number {
  return lo + ((stableHash(key) % 1000) / 1000) * (hi - lo);
}

function toBlock(b: Building, kind: BlockKind, key: string, lo?: number, hi?: number): Block {
  return { x: b.x, z: b.y, w: b.w, d: b.h, h: heightOf(key, lo, hi), kind };
}

/** The town's boxes: footprintLayout's buildings and places at DEFAULT_SCALE, and the city's lots in a fixed window round the footprint. */
export function blockLayout(puzzle: Puzzle): BlockLayout {
  const origin = mapOrigin(puzzle.id, puzzleBounds(puzzle));
  const layout = footprintLayout(puzzle, origin, DEFAULT_SCALE);
  const fp = circuitStreets(puzzle).footprint;
  const window: CityRect = { minX: fp.minX - CITY_WINDOW, minY: fp.minY - CITY_WINDOW, maxX: fp.maxX + CITY_WINDOW, maxY: fp.maxY + CITY_WINDOW };
  const blocks: Block[] = [];
  for (const b of layout.buildings) blocks.push(toBlock(b, "building", `b${b.x},${b.y}`, BLOCK_MIN_H, FOOTPRINT_MAX_H));
  const own = new Set<Building>(layout.buildings);
  for (const b of cityForMap(puzzle, origin, window)) {
    // cityForMap also returns the footprint's own lots (the same objects); those are already in.
    if (!own.has(b)) blocks.push(toBlock(b, "city", `c${b.x},${b.y}`));
  }
  const places: PlaceBlock[] = layout.places.map((p) => ({
    lamp: p.lamp,
    label: p.label,
    pool: p.pool,
    boxes: p.pool ? [] : (p.parts ?? [p]).map((q) => toBlock(q, "place", `p${p.lamp}${q.x},${q.y}`, PLACE_MIN_H, PLACE_MAX_H)),
  }));
  return { blocks, places, window };
}
