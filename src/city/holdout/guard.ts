/**
 * Stage 12, section E2: the circuit guard (T-1). A piece the pass is about to place is checked against the circuit's points with the same reading as `t1Failures` (`pipeline/readable.ts`), but with a margin, so a piece
 * that passes here always passes the check. The check still runs on the whole layer at the end (`assertEraReadable`) and throws; this guard only decides where a piece may stand. Pure.
 */

import type { CircuitPoints } from "../pipeline/readable";
import { DROP_HIGH_M, DROP_REACH_M } from "../pipeline/readable";
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
