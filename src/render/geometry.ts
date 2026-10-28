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

/** Uniform scale that fits `bounds` in width x height with `padding` on every side, centred. */
export function computeFit(bounds: Bounds, width: number, height: number, padding: number): Fit {
  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const availX = Math.max(width - 2 * padding, 1);
  const availY = Math.max(height - 2 * padding, 1);
  const scale = Math.min(availX / spanX, availY / spanY, MAX_SCALE);
  const offsetX = (width - spanX * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - spanY * scale) / 2 - bounds.minY * scale;
  return { scale, offsetX, offsetY };
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
}

export function buildGeometry(puzzle: Puzzle, width: number, height: number, padding: number): Geometry {
  const fit = computeFit(puzzleBounds(puzzle), width, height, padding);
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
  const decor = (puzzle.decor ?? []).map((d) => {
    const arr = new Float64Array(d.path.length * 2);
    d.path.forEach((p, i) => {
      arr[i * 2] = p[0] * fit.scale + fit.offsetX;
      arr[i * 2 + 1] = p[1] * fit.scale + fit.offsetY;
    });
    return arr;
  });
  return { fit, nodeIds, nodeIndex, nx, ny, lineIds, lineIndex, ax, ay, bx, by, len, mapLen, fromIdx, toIdx, decor };
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
  let bestD = NODE_HIT_RADIUS;
  for (let i = 0; i < g.nodeIds.length; i++) {
    const d = Math.hypot(x - g.nx[i]!, y - g.ny[i]!);
    if (d <= bestD) {
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
