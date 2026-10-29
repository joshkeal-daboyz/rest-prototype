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
/** Readable floor in px per unit (twice NODE_HIT_RADIUS: nodes 1 unit apart never share a hit circle). Applies only when the fit is below LEGACY_FLOOR. */
export const MIN_SCALE = 36;
/**
 * A fit scale at or above this opens exactly as before 027 (the plain fit). Only a fit below it, which means a map too big
 * to read when fitted, gets the MIN_SCALE floor and overflows. Keeps every map of today unchanged at 1920 x 1080.
 */
export const LEGACY_FLOOR = 24;
/** Px kept clear round the map's box when it is fitted, and the margin an overflowing map may be panned to. */
export const PADDING = 64;

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
 * The scale at which `bounds` plus `padding` exactly fits the free area: no floor, capped at MAX_SCALE
 * (the "whole map" scale).
 */
export function fitScale(bounds: Bounds, width: number, height: number, padding: number, insets?: Insets): number {
  const left = Math.max(insets?.left ?? 0, 0);
  const right = Math.max(insets?.right ?? 0, 0);
  const top = Math.max(insets?.top ?? 0, 0);
  const bottom = Math.max(insets?.bottom ?? 0, 0);
  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const availX = Math.max(width - left - right - 2 * padding, 1);
  const availY = Math.max(height - top - bottom - 2 * padding, 1);
  return Math.min(availX / spanX, availY / spanY, MAX_SCALE);
}

/** The opening scale for a fit scale: the fit itself (capped at MAX_SCALE) from LEGACY_FLOOR up, else the readable floor MIN_SCALE. */
export function openScale(fit: number): number {
  return fit >= LEGACY_FLOOR ? Math.min(fit, MAX_SCALE) : MIN_SCALE;
}

/**
 * Scale and offsets that centre `bounds` in the free area, then add `pan`. The scale is the plain fit (capped at MAX_SCALE)
 * when that is at least LEGACY_FLOOR, else MIN_SCALE (see openScale), or `scale` when given (zoom). `insets` (CSS px) reserve room for overlays.
 */
export function computeFit(bounds: Bounds, width: number, height: number, padding: number, insets?: Insets, pan?: Pan, scale?: number): Fit {
  const left = Math.max(insets?.left ?? 0, 0);
  const right = Math.max(insets?.right ?? 0, 0);
  const top = Math.max(insets?.top ?? 0, 0);
  const bottom = Math.max(insets?.bottom ?? 0, 0);
  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const sc = scale ?? openScale(fitScale(bounds, width, height, padding, insets));
  const offsetX = left + (width - left - right - spanX * sc) / 2 - bounds.minX * sc + (pan?.x ?? 0);
  const offsetY = top + (height - top - bottom - spanY * sc) / 2 - bounds.minY * sc + (pan?.y ?? 0);
  return { scale: sc, offsetX, offsetY };
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

function clampAxis(v: number, boxLo: number, boxHi: number, areaLo: number, areaHi: number, keep: number, edgePad?: number): number {
  if (edgePad !== undefined && boxHi - boxLo + 2 * edgePad > areaHi - areaLo + 1e-6) {
    // Overflowing axis: the map's edge may come no further in than edgePad from the area's edge.
    const lo = areaHi - edgePad - boxHi;
    const hi = areaLo + edgePad - boxLo;
    return v < lo ? lo : v > hi ? hi : v;
  }
  const k = Math.max(Math.min(keep, boxHi - boxLo, areaHi - areaLo), 0);
  const lo = areaLo + k - boxHi;
  const hi = areaHi - k - boxLo;
  return v < lo ? lo : v > hi ? hi : v;
}

/** Which axes of the map's box (bounds x `fit.scale`) plus `padding` each side are larger than `area`. */
export function overflows(bounds: Bounds, fit: Fit, area: Rect, padding: number): { x: boolean; y: boolean } {
  const bw = (bounds.maxX - bounds.minX) * fit.scale;
  const bh = (bounds.maxY - bounds.minY) * fit.scale;
  return { x: bw + 2 * padding > area.right - area.left + 1e-6, y: bh + 2 * padding > area.bottom - area.top + 1e-6 };
}

/**
 * Clamp `pan` so the panned `box` overlaps `area` by min(keep, box size, area size) on each axis.
 * With `edgePad`, an axis whose box plus edgePad each side is larger than the area is edge-stopped
 * instead: the box's edge can come no further in than edgePad from the area's edge on that side.
 */
export function clampPan(pan: Pan, box: Rect, area: Rect, keep: number = PAN_KEEP, edgePad?: number): Pan {
  return {
    x: clampAxis(pan.x, box.left, box.right, area.left, area.right, keep, edgePad),
    y: clampAxis(pan.y, box.top, box.bottom, area.top, area.bottom, keep, edgePad),
  };
}

/** The pan that puts map point (mx, my) at the centre of `area`; `fit` is the fit with no pan. Unclamped. */
export function panToCentre(mx: number, my: number, fit: Fit, area: Rect): Pan {
  return { x: (area.left + area.right) / 2 - (mx * fit.scale + fit.offsetX), y: (area.top + area.bottom) / 2 - (my * fit.scale + fit.offsetY) };
}

/**
 * The pan a view opens with (and Home returns to). A map that fits on both axes: {0,0}. Otherwise the first
 * feed sits at the free area's centre on each overflowing axis, clamped; a fitting axis stays centred.
 */
export function initialPan(puzzle: Puzzle, width: number, height: number, padding: number, insets?: Insets, scale?: number): Pan {
  const b = puzzleBounds(puzzle);
  const fit = computeFit(b, width, height, padding, insets, undefined, scale);
  const area = freeArea(width, height, insets);
  const ov = overflows(b, fit, area, padding);
  if (!ov.x && !ov.y) return { x: 0, y: 0 };
  const feed = puzzle.nodes.find((n) => n.type === "feed");
  if (!feed) return { x: 0, y: 0 };
  const p = panToCentre(feed.pos[0], feed.pos[1], fit, area);
  return clampPan({ x: ov.x ? p.x : 0, y: ov.y ? p.y : 0 }, mapBox(b, fit), area, PAN_KEEP, padding);
}

/** True if the canvas point is inside the free area. */
export function inArea(area: Rect, x: number, y: number): boolean {
  return x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;
}

function near(area: Rect, margin: number, loX: number, hiX: number, loY: number, hiY: number): boolean {
  return hiX >= area.left - margin && loX <= area.right + margin && hiY >= area.top - margin && loY <= area.bottom + margin;
}

/** Fill `out` with the indices of lines whose screen box is within `margin` px of `area`; returns the count. */
export function visibleLinesInto(g: Geometry, area: Rect, margin: number, out: Int32Array): number {
  let n = 0;
  for (let i = 0; i < g.ax.length; i++) {
    const ax = g.ax[i]!;
    const bx = g.bx[i]!;
    const ay = g.ay[i]!;
    const by = g.by[i]!;
    if (near(area, margin, Math.min(ax, bx), Math.max(ax, bx), Math.min(ay, by), Math.max(ay, by))) out[n++] = i;
  }
  return n;
}

/** Fill `out` with the indices of nodes within `margin` px of `area`; returns the count. */
export function visibleNodesInto(g: Geometry, area: Rect, margin: number, out: Int32Array): number {
  let n = 0;
  for (let i = 0; i < g.nx.length; i++) {
    const x = g.nx[i]!;
    const y = g.ny[i]!;
    if (near(area, margin, x, x, y, y)) out[n++] = i;
  }
  return n;
}

/** Indices of the lines within `margin` px of `area` (allocates; the draw loop uses visibleLinesInto). */
export function visibleLines(g: Geometry, area: Rect, margin: number): Int32Array {
  const out = new Int32Array(g.ax.length);
  return out.slice(0, visibleLinesInto(g, area, margin, out));
}

/** Indices of the nodes within `margin` px of `area` (allocates; the draw loop uses visibleNodesInto). */
export function visibleNodes(g: Geometry, area: Rect, margin: number): Int32Array {
  const out = new Int32Array(g.nx.length);
  return out.slice(0, visibleNodesInto(g, area, margin, out));
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

export function buildGeometry(puzzle: Puzzle, width: number, height: number, padding: number, insets?: Insets, pan?: Pan, scale?: number): Geometry {
  const fit = computeFit(puzzleBounds(puzzle), width, height, padding, insets, pan, scale);
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
    hitR[i] = n.type === "lamp" ? Math.max(NODE_HIT_RADIUS, clusterRadius(n.load ?? 1) + 6) : NODE_HIT_RADIUS;
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
