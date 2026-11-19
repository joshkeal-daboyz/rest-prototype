/**
 * Ticket 057: the checks on the tile city's frontage, pure (no three, no DOM, no assets). Section A holds G1; B to G add G2 to G4 and V1 to V4 here.
 *
 * G1, no recess (19.1): on every terrace column, the street-level wall plane (`facade.ts`) stands between the pavement's back edge and `OVERLAP_MAX_M` onto the pavement. Josh, 18 Nov 2026:
 * "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."
 * A recess is a wall behind the edge by more than `RECESS_MAX_M` (0) and `FRONTAGE_TOL_M`. A sill, frame or sign may stand past the wall (`WALL_REACH_M`, the same 0.5 m) and is not measured here.
 *
 * Where the wall plane of a piece is: `z + d / 2 - wallOffset(key, street)` in the lot frame (z is the piece's centre, d its depth after the turn, z = 0 the lot's front line), less the run's
 * `frame.wall_m` (where the pavement's back edge stands in front of the front line: 0 for every tile-city run). A key with no measured wall counts as its front bound.
 */

import { WALL_FRONT_M, WALL_REACH_M, WALL_SIDE_M, wallOffset } from "./facade";
import { BUILDING_FRONTS, type FrontTable } from "./models";
import type { PackResult } from "./terrace";
import type { TileCity } from "./tilecity";

/** The most a street-level wall may stand onto the pavement, metres (and the most a sill, frame or sign may stand past the wall: `WALL_REACH_M`). */
export const OVERLAP_MAX_M = WALL_REACH_M;
/** The most a street-level wall may stand behind the pavement's back edge, metres. */
export const RECESS_MAX_M = 0;
/** How far from the limits a wall may be and still pass, metres (float noise, and the 0.01 m the ticket allows). */
export const FRONTAGE_TOL_M = 0.01;

export type FrontageCheckId = "G1";

/** What each check allows: G1, how many street-level columns may stand off the wall line (behind the edge, or over the overlap limit). */
export const FRONTAGE_CHECK: Readonly<Record<FrontageCheckId, number>> = { G1: 0 };

export interface FrontageMetrics {
  /** Terrace runs, and the columns and street-level pieces measured on them. */
  runs: number;
  columns: number;
  groundPieces: number;
  /** The most recessed street-level wall (negative: behind the pavement's back edge) and the one furthest onto the pavement, metres. 0 and 0 with nothing measured. */
  wallMin_m: number;
  wallMax_m: number;
  /** Street-level pieces whose wall is behind the edge by more than `RECESS_MAX_M` + `FRONTAGE_TOL_M`, and those over the pavement by more than `OVERLAP_MAX_M` + `FRONTAGE_TOL_M`. */
  recessed: number;
  overlapped: number;
  /** The most recessed upper-storey wall and the furthest-out one, metres (information: the storeys stand on the same line as the ground floor). */
  upperMin_m: number;
  upperMax_m: number;
  /** The farthest any piece's front bound stands onto the pavement, metres (a sill, frame, sign or cornice: information). */
  frontMax_m: number;
  /** Street-level pieces whose key has no measured wall in `facade.ts` (aligned on their front bound), by key. */
  unmeasured: readonly string[];
}

/** The wall plane of a piece, metres from the lot's front line toward the road. */
const wallZ = (p: { z: number; d: number; key: `${string}:${string}`; street: "front" | "open" }, fronts: FrontTable): number => p.z + p.d / 2 - wallOffset(p.key, p.street, fronts);

/**
 * Where every street-level wall of a packed tile city stands against its pavement's back edge. `packed` is `packTown`'s result for the city (the map is keyed by run id); `fronts` as for
 * `assembleStack`. Pure: nothing is read but the packed stacks and the wall table.
 */
export function frontageMetrics(city: Pick<TileCity, "town">, packed: ReadonlyMap<string, PackResult>, fronts: FrontTable = BUILDING_FRONTS): FrontageMetrics {
  let runs = 0;
  let columns = 0;
  let groundPieces = 0;
  let wallMin = Infinity;
  let wallMax = -Infinity;
  let recessed = 0;
  let overlapped = 0;
  let upperMin = Infinity;
  let upperMax = -Infinity;
  let frontMax = -Infinity;
  const unmeasured = new Set<string>();
  for (const run of city.town.terraces) {
    const blocks = packed.get(run.id)?.blocks ?? [];
    if (blocks.length === 0) continue;
    runs++;
    const edge = run.frame?.wall_m ?? 0;
    for (const b of blocks) {
      columns += b.stack.columns.length;
      for (const p of b.stack.pieces) {
        const onto = wallZ(p, fronts) - edge;
        frontMax = Math.max(frontMax, p.z + p.d / 2 - edge);
        if (p.role === "base") {
          groundPieces++;
          wallMin = Math.min(wallMin, onto);
          wallMax = Math.max(wallMax, onto);
          if (onto < -RECESS_MAX_M - FRONTAGE_TOL_M) recessed++;
          if (onto > OVERLAP_MAX_M + FRONTAGE_TOL_M) overlapped++;
          if (!hasWall(p.key, p.street)) unmeasured.add(p.key);
        } else if (p.role === "floor") {
          upperMin = Math.min(upperMin, onto);
          upperMax = Math.max(upperMax, onto);
        }
      }
    }
  }
  const fin = (v: number): number => (Number.isFinite(v) ? v : 0);
  return {
    runs,
    columns,
    groundPieces,
    wallMin_m: fin(wallMin),
    wallMax_m: fin(wallMax),
    recessed,
    overlapped,
    upperMin_m: fin(upperMin),
    upperMax_m: fin(upperMax),
    frontMax_m: fin(frontMax),
    unmeasured: [...unmeasured].sort(),
  };
}

/** Whether `facade.ts` has a measured wall for the piece's street face (a key with none aligns on its front bound). */
function hasWall(key: string, street: "front" | "open"): boolean {
  return Object.prototype.hasOwnProperty.call(street === "front" ? WALL_FRONT_M : WALL_SIDE_M, key);
}

export interface FrontageVerdict {
  id: FrontageCheckId;
  /** The number the check is judged on (a count of columns off the wall line). */
  value: number;
  pass: boolean;
}

/**
 * Each check against `FRONTAGE_CHECK`. G1 counts the street-level pieces behind the pavement's back edge or over the overlap limit, and a city with no street-level piece measured at all
 * fails (value 1): a city with nothing packed has not shown its walls on the pavement.
 */
export function evaluateFrontage(m: FrontageMetrics): FrontageVerdict[] {
  const g1 = m.recessed + m.overlapped + (m.groundPieces === 0 ? 1 : 0);
  return [{ id: "G1", value: g1, pass: g1 <= FRONTAGE_CHECK.G1 }];
}
