/**
 * Stage 13, section F1: the circuit guard (T-1; the hold-out's, copied). A piece the pass is about to place is checked against the circuit's points with the same reading as `t1Failures` (`pipeline/readable.ts`), but with a margin, so a piece
 * that passes here always passes the check. The check still runs on the whole layer at the end (`assertEraReadable`) and throws; this guard only decides where a piece may stand. Pure.
 */

import type { CircuitPoints } from "../pipeline/readable";
import { COVER_M, DROP_HIGH_M, DROP_REACH_M } from "../pipeline/readable";
import { containsPoint, grow, type Rect } from "./geom";

const DROP_STEP_M = 0.25;

/** True when a piece with this footprint and top would cover a pole, a street light, a lamp-post place or a drop's first stretch, with `margin` metres to spare. */
export function circuitHit(c: CircuitPoints, rect: Rect, top: number, margin: number): boolean {
  const g = grow(rect, margin);
  for (const p of c.poles) if (containsPoint(g, p.x_m, p.z_m)) return true;
  for (const p of c.lights) if (containsPoint(g, p.x_m, p.z_m)) return true;
  for (const p of c.lampPlaces) if (containsPoint(g, p.x_m, p.z_m)) return true;
  if (top > DROP_HIGH_M) {
    for (const d of c.drops) {
      for (let t = 0; t <= DROP_REACH_M + 1e-9; t += DROP_STEP_M) {
        if (containsPoint(g, d.wall.x_m + t * d.out.x_m, d.wall.z_m + t * d.out.z_m)) return true;
      }
    }
  }
  return false;
}

export type CrownVerdict = "clear" | "over-span" | "blocked";

/**
 * A tree's crown (T-1's disc: half the key's wider bound) against the circuit, with the same reading as `t1Failures` and `CROWN_MARGIN_M` to spare:
 * - "blocked": the crown covers a pole, a street light, a lamp-post place or a drop's first stretch (a tree over 5.5 m);
 * - "over-span": clear of those, but the crown meets a pole line's span in plan (B8's under-span spot: it fails T-1 as C1 reads it);
 * - "clear": neither.
 */
export function crownVerdict(c: CircuitPoints, x: number, z: number, radius: number, top: number, margin: number): CrownVerdict {
  const r = radius + COVER_M + margin;
  const hit = (px: number, pz: number): boolean => Math.hypot(px - x, pz - z) <= r;
  for (const p of c.poles) if (hit(p.x_m, p.z_m)) return "blocked";
  for (const p of c.lights) if (hit(p.x_m, p.z_m)) return "blocked";
  for (const p of c.lampPlaces) if (hit(p.x_m, p.z_m)) return "blocked";
  if (top > DROP_HIGH_M) {
    for (const d of c.drops) {
      for (let t = 0; t <= DROP_REACH_M + 1e-9; t += DROP_STEP_M) if (hit(d.wall.x_m + t * d.out.x_m, d.wall.z_m + t * d.out.z_m)) return "blocked";
    }
  }
  for (const s of c.lines) if (segmentDistance(x, z, s.a, s.b) <= radius + margin) return "over-span";
  return "clear";
}

function segmentDistance(x: number, z: number, a: { readonly x_m: number; readonly z_m: number }, b: { readonly x_m: number; readonly z_m: number }): number {
  const dx = b.x_m - a.x_m;
  const dz = b.z_m - a.z_m;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x_m) * dx + (z - a.z_m) * dz) / len2));
  return Math.hypot(x - (a.x_m + t * dx), z - (a.z_m + t * dz));
}

/** True when the segment a to b meets the rectangle in plan (an end inside it, or a crossing of an edge). Used for a roof piece and a rooftop line. */
export function segmentMeetsRect(a: { readonly x_m: number; readonly z_m: number }, b: { readonly x_m: number; readonly z_m: number }, r: Rect): boolean {
  // Liang-Barsky clip of the segment against the rectangle
  let t0 = 0;
  let t1 = 1;
  const dx = b.x_m - a.x_m;
  const dz = b.z_m - a.z_m;
  for (const [p, q] of [[-dx, a.x_m - r.x0], [dx, r.x1 - a.x_m], [-dz, a.z_m - r.z0], [dz, r.z1 - a.z_m]] as const) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/** The distance from a point to a rectangle (0 inside it). */
export function distToRect(x: number, z: number, r: Rect): number {
  const dx = Math.max(r.x0 - x, 0, x - r.x1);
  const dz = Math.max(r.z0 - z, 0, z - r.z1);
  return Math.hypot(dx, dz);
}

export interface CrownCovers {
  readonly pole: boolean;
  readonly light: boolean;
  readonly lampPlace: boolean;
  readonly dropEnd: boolean;
  readonly span: boolean;
}

/** What a crown (T-1's disc: radius `radius`, a tree `top` high) covers of the circuit, by T-1's own reading (`COVER_M` past the radius; a drop end only for a tree over `DROP_HIGH_M`; a span when the crown meets it in plan). Reported, never refused. */
export function crownCovers(c: CircuitPoints, x: number, z: number, radius: number, top: number): CrownCovers {
  const r = radius + COVER_M;
  const hit = (px: number, pz: number): boolean => Math.hypot(px - x, pz - z) <= r;
  let dropEnd = false;
  if (top > DROP_HIGH_M) {
    for (const d of c.drops) {
      for (let t = 0; t <= DROP_REACH_M + 1e-9 && !dropEnd; t += DROP_STEP_M) if (hit(d.wall.x_m + t * d.out.x_m, d.wall.z_m + t * d.out.z_m)) dropEnd = true;
    }
  }
  return {
    pole: c.poles.some((p) => hit(p.x_m, p.z_m)),
    light: c.lights.some((p) => hit(p.x_m, p.z_m)),
    lampPlace: c.lampPlaces.some((p) => hit(p.x_m, p.z_m)),
    dropEnd,
    span: c.lines.some((s) => segmentDistance(x, z, s.a, s.b) <= radius),
  };
}
