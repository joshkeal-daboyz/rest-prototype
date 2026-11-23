/**
 * Stage 11: the pavement runs, in stage 8's frame (a copy of the parts of stage 8's `runs.ts` the pass needs; the runs themselves are `ground.runs`, read as the layer wrote them). `s` runs along the street from `lo_m`,
 * `t` across from the wall edge (0) to the kerb edge (5 m).
 */

import type { CityPavementRun } from "../../core";
import { SIDE_YAW, type Rect } from "./geom";

/** A run with what the walk along it needs: the axis it runs along, which way its pavement lies, its length and the turn its pieces take. */
export interface RunGeo extends CityPavementRun {
  /** The axis the run runs along: "x" for a "-z" or "+z" front, "z" for a "-x" or "+x" front. */
  readonly along: "x" | "z";
  /** +1 when the pavement is at larger x or z than the wall (a "+x" or "+z" front), else -1. */
  readonly sgn: 1 | -1;
  /** `hi_m - lo_m`. */
  readonly len: number;
  /** Every piece of the run faces the street: the turn that brings its own +z onto the front. */
  readonly yaw: 0 | 90 | 180 | 270;
}

export function geoOf(run: CityPavementRun): RunGeo {
  const sgn = run.side === "+z" || run.side === "+x" ? 1 : -1;
  return { ...run, along: run.side === "+z" || run.side === "-z" ? "x" : "z", sgn, len: run.hi_m - run.lo_m, yaw: SIDE_YAW[run.side] };
}

/** The world point and the footprint (own width `w` along the run, depth `d` across it) at (`s`, `t`) of a run's frame. */
export function worldOf(run: RunGeo, s: number, t: number, w: number, d: number): { x: number; z: number; rect: Rect } {
  const u = run.lo_m + s;
  const a = run.wall_m + run.sgn * t;
  return run.along === "x"
    ? { x: u, z: a, rect: { x0: u - w / 2, x1: u + w / 2, z0: a - d / 2, z1: a + d / 2 } }
    : { x: a, z: u, rect: { x0: a - d / 2, x1: a + d / 2, z0: u - w / 2, z1: u + w / 2 } };
}

/** A footprint's extent in a run's frame: along the street (`s0`, `s1`) and across it (`t0`, `t1`). */
export function bandOf(run: RunGeo, r: Rect): { s0: number; s1: number; t0: number; t1: number } {
  if (run.along === "x") {
    const t = run.sgn === 1 ? [r.z0 - run.wall_m, r.z1 - run.wall_m] : [run.wall_m - r.z1, run.wall_m - r.z0];
    return { s0: r.x0 - run.lo_m, s1: r.x1 - run.lo_m, t0: t[0]!, t1: t[1]! };
  }
  const t = run.sgn === 1 ? [r.x0 - run.wall_m, r.x1 - run.wall_m] : [run.wall_m - r.x1, run.wall_m - r.x0];
  return { s0: r.z0 - run.lo_m, s1: r.z1 - run.lo_m, t0: t[0]!, t1: t[1]! };
}
