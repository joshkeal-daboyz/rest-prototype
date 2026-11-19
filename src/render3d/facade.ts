/**
 * Ticket 057 A: where each stack piece's wall is. Pure: no three, no DOM, no fetch, no GLB. A piece's bounds include its sills, frames, signs and cornices, so the bound
 * stands further out than the wall a walker reads as the building's face. `WALL_FRONT_M[key]` is how far that wall plane stands behind the piece's front bound, metres, on the face
 * `BUILDING_FRONTS` calls its front; `WALL_SIDE_M[key]` is the same for a corner piece's second face (its open side, the model's +x). `assembleStack`'s `align: "wall"` puts the
 * wall plane of every piece on one line (the lot's front, which in the tile city is the pavement's back edge), so no storey stands back from the pavement by what its neighbour's
 * sill or sign stands out by, which is what left the dark strip Josh saw (18 Nov 2026).
 *
 * How the numbers were measured (`measureWallPlane`, run on the converted `city-pack.glb` of 18 Nov 2026; `facade.test.ts` re-measures every key within 0.02 m when the GLB is on the
 * machine, and pins every value below as a fixture when it is not):
 * - the front-facing triangles of the piece (unit normal within about 8 degrees of the face's, `WALL_FACE_COS`) whose centroid is below `WALL_BAND_M` (3.5 m, the ground floor and the first
 *   storey; a floor piece is 3 m and a `Stack` piece 9 m of the same wall);
 * - grouped into planes (centroids within `WALL_PLANE_TOL_M` of each other), each with its summed area;
 * - the wall is the one of largest area (the frontmost on a tie) among the planes between the front bound and `reach` behind it, of at least `WALL_MIN_AREA_M2`; and
 *   for a GROUND piece (a base: shop, door, corner, office base; `rule: "ground"`) only a plane that reaches the ground (its lowest vertex at most `WALL_GROUND_Y_M` up) counts, so a sign
 *   band or fascia above the shopfront (Shop_01's sign at y 2.22 to 2.84, Shop_06's fascia at 2.43 to 3.0) is never the wall: the wall is the face that meets the pavement. A ground
 *   piece's reach is `WALL_REACH_M` (0.6 m, the overlap Josh allows: "overlap a little bit"); a floor piece keeps the first rule (reach `WALL_FLOOR_REACH_M`, 0.5 m, no ground test:
 *   every floor piece's walls start at its bottom edge, and Office floors are set back on purpose).
 *   The ticket's wording is "the largest front-facing planar area below 3.5 m". Taken over the whole piece it names the back wall of a shop's interior (Shop_01's at 1.37 m behind its
 *   front bound, Shop_02's 1.80, Shop_03's 2.60, Shop_04's 2.76, Shop_05's 1.02), which would put the shop's frame up to 2.6 m onto the pavement. The reach window keeps the rule's
 *   meaning (the biggest flat face) and the limit the ticket gives sills and signs.
 * A key the rule cannot settle (a roof: a cornice has no wall) has no entry, and its pieces align on their front bound (`wallOffset` gives 0).
 */

import type { CalibrationKey } from "../core";
import { BUILDING_FRONTS, type FrontTable, type ModelFront } from "./models";

/** How far behind the front bound a ground piece's wall may stand, metres: the most a sill, frame or sign may stand past the wall, and the most a wall may stand onto the pavement (frontage.ts's `OVERLAP_MAX_M`, the same number; the ticket's 0.5 m became 0.6 m after the 057 A review). */
export const WALL_REACH_M = 0.6;
/** The same for a floor piece (the first round's rule, kept for the storeys above the ground floor), metres. */
export const WALL_FLOOR_REACH_M = 0.5;
/** A ground piece's wall plane must have a vertex at most this high, metres: it meets the pavement. */
export const WALL_GROUND_Y_M = 0.3;
/** Only the triangles whose centroid is below this height count, metres. */
export const WALL_BAND_M = 3.5;
/** The least area, m^2, a plane needs to be a wall. */
export const WALL_MIN_AREA_M2 = 0.5;
/** Centroids this close along the face's axis, metres, are one plane. */
export const WALL_PLANE_TOL_M = 0.02;
/** The least cosine of the angle between a triangle's normal and the face's, to count as front-facing. */
export const WALL_FACE_COS = 0.99;

const k = (name: string): CalibrationKey => `city-pack:${name}`;

/**
 * The distance from a piece's front bound back to its wall plane, metres, on its front face, measured from the converted City Pack (see the file's comment). Every base, door,
 * corner, shop, floor and `Stack` piece of every `STACK_STYLES` recipe has one. Roof pieces have none.
 */
export const WALL_FRONT_M: Readonly<Partial<Record<CalibrationKey, number>>> = {
  [k("SM_Bld_Shop_01")]: 0.219,
  [k("SM_Bld_Shop_02")]: 0.425,
  [k("SM_Bld_Shop_03")]: 0.103,
  [k("SM_Bld_Shop_04")]: 0.557,
  [k("SM_Bld_Shop_05")]: 0.076,
  [k("SM_Bld_Shop_06")]: 0.52,
  [k("SM_Bld_Apartment_Door_01")]: 0.529,
  [k("SM_Bld_Apartment_Door_02")]: 0.058,
  [k("SM_Bld_Shop_Corner_01")]: 0.211,
  [k("SM_Bld_Shop_Corner_02")]: 0.166,
  [k("SM_Bld_Apartment_01")]: 0.196,
  [k("SM_Bld_Apartment_Corner_01")]: 0.196,
  [k("SM_Bld_Apartment_Stack_01")]: 0.196,
  [k("SM_Bld_Apartment_02")]: 0.129,
  [k("SM_Bld_Apartment_Corner_02")]: 0.129,
  [k("SM_Bld_Apartment_Stack_02")]: 0.129,
  [k("SM_Bld_Apartment_03")]: 0.351,
  [k("SM_Bld_Apartment_Corner_03")]: 0.351,
  [k("SM_Bld_Apartment_Stack_03")]: 0.351,
  [k("SM_Bld_OfficeOld_Small_Base_01")]: 0.348,
  [k("SM_Bld_OfficeOld_Small_Floor_01")]: 0,
  [k("SM_Bld_OfficeOld_Large_Base_01")]: 0.348,
  [k("SM_Bld_OfficeOld_Large_Floor_01")]: 0,
  [k("SM_Bld_OfficeOctagon_Base_01")]: 0.595,
  [k("SM_Bld_OfficeOctagon_Floor_01")]: 0.232,
};

/**
 * The same for a corner piece's second face, its open side (the model's +x face: every City Pack corner piece has `open: "+x"` in `BUILDING_FRONTS`). A corner piece at the end of
 * a row where that side is not on the row's cross street is turned so this face is on the row's own street (`StackPiece.street` "open"), and it is this wall that stands on the pavement then.
 * The roof corners have none.
 */
export const WALL_SIDE_M: Readonly<Partial<Record<CalibrationKey, number>>> = {
  [k("SM_Bld_Shop_Corner_01")]: 0.188,
  [k("SM_Bld_Shop_Corner_02")]: 0.166,
  [k("SM_Bld_Apartment_Corner_01")]: 0,
  [k("SM_Bld_Apartment_Corner_02")]: 0.085,
  [k("SM_Bld_Apartment_Corner_03")]: 0.14,
};

/**
 * How far behind its front bound, on the face that stands on the road, `key`'s wall plane is, metres; 0 for a key with no entry, and for a key whose front in `fronts` is not the
 * face `BUILDING_FRONTS` measured (a front Josh recalibrated in the stack gallery: the numbers no longer describe the face on the road, so the piece aligns on its bounds).
 * `street` is `StackPiece.street`: "front" (the piece's front faces the road) or "open" (its open side does). `open` is the piece's open side (default the table's, else "+x").
 */
export function wallOffset(key: CalibrationKey, street: "front" | "open", fronts: FrontTable = BUILDING_FRONTS, open?: "+x" | "-x"): number {
  const own = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key] : undefined;
  const measured = Object.prototype.hasOwnProperty.call(BUILDING_FRONTS, key) ? BUILDING_FRONTS[key] : undefined;
  if (!measured || (own?.front ?? "+z") !== measured.front) return 0;
  if (street === "front") return WALL_FRONT_M[key] ?? 0;
  // The side wall was measured on the model's +x face, with the front on +z.
  return (open ?? own?.open ?? measured.open ?? "+x") === "+x" && measured.front === "+z" ? (WALL_SIDE_M[key] ?? 0) : 0;
}

/** Which rule a piece is measured by: "ground" (a base: only a plane that reaches the ground counts, reach `WALL_REACH_M`) or "floor" (reach `WALL_FLOOR_REACH_M`, no ground test). */
export type WallRule = "ground" | "floor";

/** What `measureWallPlane` finds. */
export interface WallPlane {
  /** The wall plane's coordinate along the face's axis, metres (in the face's direction: larger is further out). */
  plane: number;
  /** The front bound's coordinate on that axis, in the same direction. */
  bound: number;
  /** `bound - plane`, metres: what `WALL_FRONT_M` holds. */
  offset: number;
  /** The wall's area, m^2. */
  area: number;
}

/**
 * The wall plane of a mesh on one face, by the rule in the file's comment, or null when no plane qualifies. `positions` is x,y,z per vertex and `indices` the triangle list (null: the
 * vertices are consecutive triangles). `face` is the face to measure, as a `ModelFront`: "+z" for a City Pack piece's front, "+x" for a corner piece's open side. Pure and deterministic.
 */
export function measureWallPlane(positions: ArrayLike<number>, indices: ArrayLike<number> | null, face: ModelFront, rule: WallRule = "floor"): WallPlane | null {
  const ground = rule === "ground";
  const reach = ground ? WALL_REACH_M : WALL_FLOOR_REACH_M;
  const axis = face === "+z" || face === "-z" ? 2 : 0;
  const sign = face === "+z" || face === "+x" ? 1 : -1;
  const at = (v: number, c: number): number => positions[v * 3 + c]!;
  const count = indices ? indices.length : Math.floor(positions.length / 3);
  let bound = -Infinity;
  for (let v = 0; v < Math.floor(positions.length / 3); v++) bound = Math.max(bound, sign * at(v, axis));
  if (!Number.isFinite(bound)) return null;
  const tris: { c: number; area: number; low: number }[] = [];
  for (let i = 0; i + 2 < count; i += 3) {
    const a = indices ? indices[i]! : i;
    const b = indices ? indices[i + 1]! : i + 1;
    const c = indices ? indices[i + 2]! : i + 2;
    const ux = at(b, 0) - at(a, 0);
    const uy = at(b, 1) - at(a, 1);
    const uz = at(b, 2) - at(a, 2);
    const vx = at(c, 0) - at(a, 0);
    const vy = at(c, 1) - at(a, 1);
    const vz = at(c, 2) - at(a, 2);
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const len = Math.hypot(n[0]!, n[1]!, n[2]!);
    if (len < 1e-12) continue;
    if ((sign * n[axis]!) / len < WALL_FACE_COS) continue;
    if ((at(a, 1) + at(b, 1) + at(c, 1)) / 3 >= WALL_BAND_M) continue;
    tris.push({ c: (sign * (at(a, axis) + at(b, axis) + at(c, axis))) / 3, area: len / 2, low: Math.min(at(a, 1), at(b, 1), at(c, 1)) });
  }
  tris.sort((p, q) => p.c - q.c);
  const planes: { sum: number; area: number; last: number; low: number }[] = [];
  for (const t of tris) {
    const p = planes[planes.length - 1];
    if (p && t.c - p.last <= WALL_PLANE_TOL_M) {
      p.sum += t.c * t.area;
      p.area += t.area;
      p.last = t.c;
      p.low = Math.min(p.low, t.low);
    } else planes.push({ sum: t.c * t.area, area: t.area, last: t.c, low: t.low });
  }
  let best: WallPlane | null = null;
  for (const p of planes) {
    const plane = p.sum / p.area;
    const offset = bound - plane;
    if (offset < -0.01 || offset > reach + 1e-9 || p.area < WALL_MIN_AREA_M2) continue;
    if (ground && p.low > WALL_GROUND_Y_M + 1e-9) continue;
    if (!best || p.area > best.area + 1e-9 || (Math.abs(p.area - best.area) <= 1e-9 && plane > best.plane)) best = { plane, bound, offset, area: p.area };
  }
  return best;
}
