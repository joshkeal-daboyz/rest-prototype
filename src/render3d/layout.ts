/**
 * Pure layout of the 3D view (ticket 037): wire runs strung on poles along the circuit's lines, and the town's
 * building blocks. No three, no DOM, no play. World mapping: map (x, y) is world (x, height, z = y), 1 unit = 1 unit, y up.
 * Wires are visual only; nothing here touches a rule.
 */

import type { Puzzle } from "../core";
import { DEFAULT_SCALE, cityForMap, footprintLayout, circuitStreets, mapOrigin, stableHash, type Building, type CityRect } from "../render/city";
import { puzzleBounds } from "../render/geometry";

export const POLE_HEIGHT = 1.2;
/** No two poles on a run are further apart than this. */
export const POLE_SPACING = 2;
/** Sag at mid-span, as a fraction of the span's length. */
export const SAG_RATIO = 0.04;
/** A span's polyline has SAG_SEGMENTS + 1 points. */
export const SAG_SEGMENTS = 8;
/** A line's pick target reaches this far (world units) from its wire. */
export const WIRE_PICK_RADIUS = 0.15;
export const BLOCK_MIN_H = 0.6;
export const BLOCK_MAX_H = 2.6;
/** How far past the footprint (map units) the city blocks are built. */
export const CITY_WINDOW = 8;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
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
}

/** One wire run per line, keyed by line id, in file order. Decor stays a street with no wire. */
export function wireLayout(puzzle: Puzzle): WireRun[] {
  const pos = new Map<string, readonly [number, number]>();
  for (const n of puzzle.nodes) pos.set(n.id, n.pos);
  const out: WireRun[] = [];
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
    out.push({ id: l.id, from: l.from, to: l.to, attach, spans, mid, length });
  }
  return out;
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
  for (const b of layout.buildings) blocks.push(toBlock(b, "building", `b${b.x},${b.y}`));
  const own = new Set<Building>(layout.buildings);
  for (const b of cityForMap(puzzle, origin, window)) {
    // cityForMap also returns the footprint's own lots (the same objects); those are already in.
    if (!own.has(b)) blocks.push(toBlock(b, "city", `c${b.x},${b.y}`));
  }
  const places: PlaceBlock[] = layout.places.map((p) => ({
    lamp: p.lamp,
    label: p.label,
    pool: p.pool,
    boxes: p.pool ? [] : (p.parts ?? [p]).map((q) => toBlock(q, "place", `p${p.lamp}${q.x},${q.y}`, 1.2, BLOCK_MAX_H)),
  }));
  return { blocks, places, window };
}
