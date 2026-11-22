/**
 * Stage 11: what the pass keeps clear of in the circuit (ticket 073 D1; T-1, rule 10's `FURN_KEEP_M` and `FURN_MAX_H_M`, D1-Q6). Reads stage 6 only through C1's `CircuitPoints` (poles, street lights, lamp-post places,
 * drops, spans). Until K2 gives stage 6 its layer that reader returns nothing, so on the named runs these tests find nothing; fixtures pass their own points (`TechOptions.circuit`).
 */

import { COVER_M, DROP_REACH_M, type CircuitPoints, type PlanPoint } from "../pipeline/readable";
import { EPS, FURN_KEEP_M, FURN_MAX_H_M, SPAN_CLEAR_M } from "./constants";
import { rectDist, type Rect } from "./geom";

/** Sampling step along a drop's first stretch, metres (C1's). */
const DROP_STEP_M = 0.25;

const pointRect = (p: PlanPoint): Rect => ({ x0: p.x_m, x1: p.x_m, z0: p.z_m, z1: p.z_m });
const widened = (r: Rect, by: number): Rect => ({ x0: r.x0 - by, x1: r.x1 + by, z0: r.z0 - by, z1: r.z1 + by });
const within = (r: Rect, x: number, z: number): boolean => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

/** The plan distance from a rectangle to a segment (0 when they meet). */
export function rectSegmentDist(r: Rect, a: PlanPoint, b: PlanPoint): number {
  // the segment meets the rectangle: clip it to the rectangle's slab (Liang-Barsky)
  let t0 = 0;
  let t1 = 1;
  const dx = b.x_m - a.x_m;
  const dz = b.z_m - a.z_m;
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < EPS) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  if (clip(-dx, a.x_m - r.x0) && clip(dx, r.x1 - a.x_m) && clip(-dz, a.z_m - r.z0) && clip(dz, r.z1 - a.z_m)) return 0;
  let best = Math.min(rectDist(r, pointRect(a)), rectDist(r, pointRect(b)));
  const len2 = dx * dx + dz * dz;
  for (const c of [
    { x_m: r.x0, z_m: r.z0 },
    { x_m: r.x1, z_m: r.z0 },
    { x_m: r.x0, z_m: r.z1 },
    { x_m: r.x1, z_m: r.z1 },
  ]) {
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((c.x_m - a.x_m) * dx + (c.z_m - a.z_m) * dz) / len2));
    best = Math.min(best, Math.hypot(c.x_m - (a.x_m + t * dx), c.z_m - (a.z_m + t * dz)));
  }
  return best;
}

/**
 * T-1 for a solid piece the pass adds, read as C1 reads it: the footprint widened by `COVER_M` contains no pole, street light or lamp-post place, and (a piece whose top is over the drop's wall point, which every wall piece
 * is treated as) none of the first `DROP_REACH_M` of a drop. Returns what it covers, or null.
 */
export function coversCircuit(c: CircuitPoints, r: Rect, dropsToo: boolean): string | null {
  const w = widened(r, COVER_M);
  for (const q of c.poles) if (within(w, q.x_m, q.z_m)) return `pole ${q.id}`;
  for (const q of c.lights) if (within(w, q.x_m, q.z_m)) return `light ${q.id}`;
  for (const q of c.lampPlaces) if (within(w, q.x_m, q.z_m)) return `lampPlace ${q.id}`;
  if (dropsToo) {
    for (const d of c.drops) {
      for (let t = 0; t <= DROP_REACH_M + 1e-9; t += DROP_STEP_M) if (within(w, d.wall.x_m + t * d.out.x_m, d.wall.z_m + t * d.out.z_m)) return `drop ${d.id}`;
    }
  }
  return null;
}

export type CircuitWhy = "pole" | "light" | "lampPlace" | "span";

/**
 * Rule 10 on the pavement (X-3): `FURN_KEEP_M` from every pole, street light and lamp-post place (D1-Q6), and a piece taller than `FURN_MAX_H_M` stays `SPAN_CLEAR_M` from every span (a pole line's, or a thin wire).
 * Returns the first that refuses the footprint, or null.
 */
export function circuitRefusal(c: CircuitPoints, r: Rect, h: number): CircuitWhy | null {
  for (const q of c.poles) if (rectDist(r, pointRect(q)) < FURN_KEEP_M - EPS) return "pole";
  for (const q of c.lights) if (rectDist(r, pointRect(q)) < FURN_KEEP_M - EPS) return "light";
  for (const q of c.lampPlaces) if (rectDist(r, pointRect(q)) < FURN_KEEP_M - EPS) return "lampPlace";
  if (h > FURN_MAX_H_M) {
    for (const s of [...c.lines, ...c.wires]) if (rectSegmentDist(r, s.a, s.b) < SPAN_CLEAR_M - EPS) return "span";
  }
  return null;
}
