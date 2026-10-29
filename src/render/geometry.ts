import { clusterRadius } from "./load";
/**
 * Pure geometry: fit map coordinates into a canvas, precompute screen-space
 * node and line data once per puzzle (and again on resize), and hit-test it.
 * No DOM, no canvas.
 */

import type { Puzzle } from "../core";

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Fit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const MAX_SCALE = 80;

/** Bounds of every node and decor point of a puzzle, in map units. */
export function puzzleBounds(puzzle: Puzzle): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  for (const n of puzzle.nodes) add(n.pos[0], n.pos[1]);
  for (const d of puzzle.decor ?? []) for (const p of d.path) add(p[0], p[1]);
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  return { minX, maxX, minY, maxY };
}

export interface Pan {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Pixels of the map's box that must stay inside the free area on each axis. */
export const PAN_KEEP = 96;

export interface Insets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/**
 * Uniform scale that fits `bounds` in width x height with `padding` on every side, centred.
 * `insets` (CSS px) reserve room for overlays: the map is fitted into what is left.
 */
export function computeFit(bounds: Bounds, width: number, height: number, padding: number, insets?: Insets, pan?: Pan): Fit {
  const top = Math.max(insets?.top ?? 0, 0);
  const right = Math.max(insets?.right ?? 0, 0);
  const bottom = Math.max(insets?.bottom ?? 0, 0);
  const left = Math.max(insets?.left ?? 0, 0);
  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const availX = Math.max(width - left - right - 2 * padding, 1);
  const availY = Math.max(height - top - bottom - 2 * padding, 1);
  const scale = Math.min(availX / spanX, availY / spanY, MAX_SCALE);
  const offsetX = left + (width - left - right - spanX * scale) / 2 - bounds.minX * scale + (pan?.x ?? 0);
  const offsetY = top + (height - top - bottom - spanY * scale) / 2 - bounds.minY * scale + (pan?.y ?? 0);
  return { scale, offsetX, offsetY };
}

/** The canvas minus the insets, never negative in size. */
export function freeArea(width: number, height: number, insets?: Insets): Rect {
  const left = Math.max(insets?.left ?? 0, 0);
  const top = Math.max(insets?.top ?? 0, 0);
  const right = Math.max(width - Math.max(insets?.right ?? 0, 0), left);
  const bottom = Math.max(height - Math.max(insets?.bottom ?? 0, 0), top);
  return { left, top, right, bottom };
}

/** Screen box of `bounds` under `fit` (no padding). */
export function mapBox(bounds: Bounds, fit: Fit): Rect {
  return {
    left: bounds.minX * fit.scale + fit.offsetX,
    top: bounds.minY * fit.scale + fit.offsetY,
    right: bounds.maxX * fit.scale + fit.offsetX,
    bottom: bounds.maxY * fit.scale + fit.offsetY,
  };
}

function clampAxis(v: number, boxLo: number, boxHi: number, areaLo: number, areaHi: number, keep: number): number {
  const k = Math.max(Math.min(keep, boxHi - boxLo, areaHi - areaLo), 0);
  const lo = areaLo + k - boxHi;
  const hi = areaHi - k - boxLo;
  return v < lo ? lo : v > hi ? hi : v;
}

/** Clamp `pan` so the panned `box` overlaps `area` by min(keep, box size, area size) on each axis. */
export function clampPan(pan: Pan, box: Rect, area: Rect, keep: number = PAN_KEEP): Pan {
  return {
    x: clampAxis(pan.x, box.left, box.right, area.left, area.right, keep),
    y: clampAxis(pan.y, box.top, box.bottom, area.top, area.bottom, keep),
  };
}

export interface Geometry {
  fit: Fit;
  nodeIds: string[];
  nodeIndex: Map<string, number>;
  nx: Float64Array;
  ny: Float64Array;
  lineIds: string[];
  lineIndex: Map<string, number>;
  ax: Float64Array;
  ay: Float64Array;
  bx: Float64Array;
  by: Float64Array;
  /** Screen length of each line. */
  len: Float64Array;
  /** Map-unit length of each line (used for Relight timing). */
  mapLen: Float64Array;
  fromIdx: Int32Array;
  toIdx: Int32Array;
  /** Decor polylines in screen space, flat [x0,y0,x1,y1,...]. */
  decor: Float64Array[];
  /** Per-node hit radius: lamps with a cluster of bulbs are bigger. */
  hitR: Float64Array;
}

export function buildGeometry(puzzle: Puzzle, width: number, height: number, padding: number, insets?: Insets, pan?: Pan): Geometry {
  const fit = computeFit(puzzleBounds(puzzle), width, height, padding, insets, pan);
  const nn = puzzle.nodes.length;
  const nl = puzzle.lines.length;
  const nodeIds: string[] = [];
  const nodeIndex = new Map<string, number>();
  const nx = new Float64Array(nn);
  const ny = new Float64Array(nn);
  const mx = new Float64Array(nn);
  const my = new Float64Array(nn);
  puzzle.nodes.forEach((n, i) => {
    nodeIds.push(n.id);
    nodeIndex.set(n.id, i);
    mx[i] = n.pos[0];
    my[i] = n.pos[1];
    nx[i] = n.pos[0] * fit.scale + fit.offsetX;
    ny[i] = n.pos[1] * fit.scale + fit.offsetY;
  });
  const lineIds: string[] = [];
  const lineIndex = new Map<string, number>();
  const ax = new Float64Array(nl);
  const ay = new Float64Array(nl);
  const bx = new Float64Array(nl);
  const by = new Float64Array(nl);
  const len = new Float64Array(nl);
  const mapLen = new Float64Array(nl);
  const fromIdx = new Int32Array(nl);
  const toIdx = new Int32Array(nl);
  puzzle.lines.forEach((l, i) => {
    lineIds.push(l.id);
    lineIndex.set(l.id, i);
    const a = nodeIndex.get(l.from) ?? 0;
    const b = nodeIndex.get(l.to) ?? 0;
    fromIdx[i] = a;
    toIdx[i] = b;
    ax[i] = nx[a] ?? 0;
    ay[i] = ny[a] ?? 0;
    bx[i] = nx[b] ?? 0;
    by[i] = ny[b] ?? 0;
    len[i] = Math.hypot(bx[i]! - ax[i]!, by[i]! - ay[i]!);
    mapLen[i] = Math.hypot((mx[b] ?? 0) - (mx[a] ?? 0), (my[b] ?? 0) - (my[a] ?? 0));
  });
  const hitR = new Float64Array(nn);
  puzzle.nodes.forEach((n, i) => {
    hitR[i] = n.type === "lamp" ? Math.max(NODE_HIT_RADIUS, clusterRadius(n.load ?? 1) + 4) : NODE_HIT_RADIUS;
  });
  const decor = (puzzle.decor ?? []).map((d) => {
    const arr = new Float64Array(d.path.length * 2);
    d.path.forEach((p, i) => {
      arr[i * 2] = p[0] * fit.scale + fit.offsetX;
      arr[i * 2 + 1] = p[1] * fit.scale + fit.offsetY;
    });
    return arr;
  });
  return { fit, nodeIds, nodeIndex, nx, ny, lineIds, lineIndex, ax, ay, bx, by, len, mapLen, fromIdx, toIdx, decor, hitR };
}

export const NODE_HIT_RADIUS = 18;
export const LINE_HIT_TOLERANCE = 8;

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Node or line id under a canvas-space point; nodes win over lines. Null if nothing is close. */
export function hitTestGeometry(g: Geometry, x: number, y: number): string | null {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < g.nodeIds.length; i++) {
    const d = Math.hypot(x - g.nx[i]!, y - g.ny[i]!);
    if (d <= g.hitR[i]! && d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best >= 0) return g.nodeIds[best] ?? null;
  let bestLine = -1;
  let bestLD = LINE_HIT_TOLERANCE;
  for (let i = 0; i < g.lineIds.length; i++) {
    const d = distToSegment(x, y, g.ax[i]!, g.ay[i]!, g.bx[i]!, g.by[i]!);
    if (d <= bestLD) {
      bestLD = d;
      bestLine = i;
    }
  }
  return bestLine >= 0 ? (g.lineIds[bestLine] ?? null) : null;
}
