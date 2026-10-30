/**
 * Ticket 027 A3: edge stars for targets that are off the free area. Pure: no DOM, no canvas.
 * Display only; the priests' list does the centring.
 */

import type { Geometry, Rect } from "./geometry";

/** Px the marker sits inside the free area's edge. */
export const MARKER_INSET = 14;
/** Smallest distance between two markers, px. */
export const MARKER_GAP = 14;
/** Size of the star, px (outer diameter). */
export const MARKER_SIZE = 10;

export interface OffscreenMarker {
  lamp: string;
  x: number;
  y: number;
  /** Direction from the free area's centre to the lamp, radians (canvas y down). */
  angle: number;
  filled: boolean;
}

/**
 * One marker per target whose node lies outside `area`, none for targets on screen or unknown ids.
 * Each sits on the edge of `area` inset by MARKER_INSET, on the ray from the area's centre to the lamp;
 * markers that would crowd are then spread along that edge so none is nearer than MARKER_GAP to another.
 * `filled` is true for a lit lamp. If `visible` (the canvas grown by the lamp's radius, ring and star) is given, a
 * target inside it is skipped too, because the lamp is drawn there with its own star.
 */
export function offscreenMarkers(
  g: Geometry,
  area: Rect,
  targets: readonly string[],
  lit: ReadonlySet<string>,
  visible?: Rect,
): OffscreenMarker[] {
  const cx = (area.left + area.right) / 2;
  const cy = (area.top + area.bottom) / 2;
  // The inset rectangle the markers run along; never inside out.
  const hw = Math.max((area.right - area.left) / 2 - MARKER_INSET, 0);
  const hh = Math.max((area.bottom - area.top) / 2 - MARKER_INSET, 0);
  const out: OffscreenMarker[] = [];
  const perim = 4 * (hw + hh);
  const pos: number[] = []; // distance along the perimeter, clockwise from the top-left corner
  for (const id of targets) {
    const i = g.nodeIndex.get(id);
    if (i === undefined) continue;
    const x = g.nx[i]!;
    const y = g.ny[i]!;
    if (x >= area.left && x <= area.right && y >= area.top && y <= area.bottom) continue;
    // A lamp still drawn on the canvas (e.g. in a HUD inset band) carries its own star; no second one at the edge.
    if (visible && x >= visible.left && x <= visible.right && y >= visible.top && y <= visible.bottom) continue;
    const dx = x - cx;
    const dy = y - cy;
    const tx = dx === 0 ? Infinity : hw / Math.abs(dx);
    const ty = dy === 0 ? Infinity : hh / Math.abs(dy);
    const t = Math.min(tx, ty);
    const ex = dx * t;
    const ey = dy * t;
    out.push({ lamp: id, x: cx + ex, y: cy + ey, angle: Math.atan2(dy, dx), filled: lit.has(id) });
    pos.push(alongPerimeter(ex, ey, hw, hh));
  }
  const n = out.length;
  if (n < 2 || perim <= 0) return out;
  // Spread. Two points on a rectangle's edge that are `gap` apart along it can be nearer in a straight line round
  // a corner (by up to 1/sqrt 2), so the walk-along gap is scaled up to keep the straight-line distance.
  const gap = Math.min(MARKER_GAP * Math.SQRT2, perim / n);
  const order = pos.map((_, k) => k).sort((a, b) => pos[a]! - pos[b]!);
  const s = order.map((k) => pos[k]!);
  for (let k = 1; k < n; k++) if (s[k]! < s[k - 1]! + gap) s[k] = s[k - 1]! + gap;
  if (s[n - 1]! - s[0]! > perim - gap) for (let k = 0; k < n; k++) s[k] = s[0]! + (k * perim) / n;
  const sorted: OffscreenMarker[] = [];
  for (let k = 0; k < n; k++) {
    const m = out[order[k]!]!;
    const p = pointAt(((s[k]! % perim) + perim) % perim, hw, hh);
    sorted.push({ lamp: m.lamp, x: cx + p[0], y: cy + p[1], angle: m.angle, filled: m.filled });
  }
  return sorted;
}

/** Distance clockwise from the top-left corner of the rectangle [-hw, hw] x [-hh, hh] to a point on its edge. */
function alongPerimeter(x: number, y: number, hw: number, hh: number): number {
  const eps = 1e-9;
  if (Math.abs(y + hh) <= eps) return x + hw; // top, left to right
  if (Math.abs(x - hw) <= eps) return 2 * hw + (y + hh); // right, top to bottom
  if (Math.abs(y - hh) <= eps) return 2 * hw + 2 * hh + (hw - x); // bottom, right to left
  return 4 * hw + 2 * hh + (hh - y); // left, bottom to top
}

function pointAt(d: number, hw: number, hh: number): [number, number] {
  if (d <= 2 * hw) return [d - hw, -hh];
  d -= 2 * hw;
  if (d <= 2 * hh) return [hw, d - hh];
  d -= 2 * hh;
  if (d <= 2 * hw) return [hw - d, hh];
  d -= 2 * hw;
  return [-hw, hh - d];
}
