/**
 * Stage 4, section D2: the ground pieces. Every cell of the edge layer becomes one `CityGroundCell` (a `ParkingLines_01` tile one record on its first cell) with the yaw and variant the assembler picks a piece by.
 * Moved from `src/render3d/tilecity.ts`'s "emit the cells" loop (lines 1557 to 1606), re-keyed on the stage's `rand` (R-3) and read from the street layer's own streets, so nothing depends on a lattice line.
 * Pure. Also here: where a T's far side drops its kerb (`dropCells`).
 */

import { CITY_GROUND_VARIANT as V } from "../../core";
import type { CityBayTile, CityCell, CityEdgeCell, CityGroundCell, CityPlanStreet, CitySide, CityStreetsLayer, CityYaw } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { GRATE_ONE_IN, PATCH_ONE_IN, TILE_M } from "./constants";

/** The yaw that points a piece's front toward +across (sign 1) or -across (sign -1) of a street running along `axis`. */
export const yawToward = (axis: "x" | "z", sign: number): CityYaw => (axis === "x" ? (sign > 0 ? 0 : 180) : sign > 0 ? 90 : 270);

/** A pavement corner's yaw from the signs (along x, along z) toward the junction it points at. */
export function cornerYaw(sx: number, sz: number): CityYaw {
  if (sx > 0) return sz > 0 ? 0 : 90;
  return sz > 0 ? 270 : 180;
}

/** A street's pavement band that faces `sign` (+1 toward the higher coordinate across the street, -1 the lower): its cell row (an "x" street) or column (a "z" street), and its index in `bands`. null for a street with none. */
export function pavementRow(s: CityPlanStreet, sign: 1 | -1): { across: number; k: number } | null {
  const n = s.bands.length;
  for (const k of [0, n - 1]) {
    if (s.bands[k] !== "pavement") continue;
    const across = s.axis === "x" ? s.across0 + k : s.across0 + n - 1 - k;
    const out = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
    if (out === sign) return { across, k };
  }
  return null;
}

const SIDES: readonly CitySide[] = ["-z", "+x", "+z", "-x"];

/**
 * The pavement cells whose kerb is dropped (S2, the far side of a T): for every T, the two cells on the through street's pavement across from the ending street, at the ends of its cross-section, where the crossings
 * across the through street land. The far side is the arm the T lacks; this works for an inner street and for the outer pavement of an edge street alike (stage 1 publishes a `CityJunctionFacing` only for the first).
 * Two per T, in the junctions' order.
 */
export function dropCells(streets: CityStreetsLayer): CityCell[] {
  const byId = new Map(streets.streets.map((s) => [s.id, s] as const));
  const out: CityCell[] = [];
  for (const j of streets.junctions) {
    if (j.kind !== "T") continue;
    const through = j.streets.find((x) => x.passes);
    const ending = j.streets.find((x) => !x.passes);
    const missing = SIDES.filter((s) => !j.arms.includes(s));
    if (!through || !ending || missing.length !== 1) throw new CityStageError(`dropped kerb: the T ${j.id} has no one through street, one ending street and one missing arm`, j.cells);
    const p = byId.get(through.street)!;
    const e = byId.get(ending.street)!;
    const row = pavementRow(p, missing[0]![0] === "+" ? 1 : -1);
    if (row === null) throw new CityStageError(`dropped kerb: the T ${j.id}'s through street ${p.id} has no pavement on its far side`, j.cells);
    for (const along of [e.across0, e.across0 + e.bands.length - 1]) out.push(p.axis === "x" ? { i: along, j: row.across } : { i: row.across, j: along });
  }
  return out;
}

/**
 * Lays the ground of an edge layer's cells (D2 criterion 1). `cells` is the edge layer's dressed cells in `streets.cells`' order, `tiles` its bay tiles. Records come row-major, as the cells do.
 * Throws `CityStageError` where a cell has no street to read its yaw from, or where a dropped kerb falls on a cell that is not its street's pavement.
 */
export function layGround(streets: CityStreetsLayer, cells: readonly CityEdgeCell[], tiles: readonly CityBayTile[], rand: StageRand): CityGroundCell[] {
  const W = streets.w;
  const H = streets.h;
  const streetOf = new Map(streets.streets.map((s) => [s.id, s] as const));
  const at: (CityEdgeCell | null)[] = new Array<CityEdgeCell | null>(W * H).fill(null);
  for (const c of cells) at[c.j * W + c.i] = c;
  const cellAt = (i: number, j: number): CityEdgeCell | null => (i < 0 || j < 0 || i >= W || j >= H ? null : at[j * W + i]!);
  const key = (c: CityCell): number => c.j * W + c.i;
  const second = new Set(tiles.map((t) => key(t.cells[1])));
  const first = new Set(tiles.map((t) => key(t.cells[0])));
  const drops = new Set(dropCells(streets).map(key));
  for (const d of drops) {
    const c = at[d];
    if (!c || c.role !== "pavement") throw new CityStageError(`dropped kerb: the cell (${d % W}, ${Math.floor(d / W)}) is not a pavement cell`, [{ i: d % W, j: Math.floor(d / W) }]);
  }

  // Which x street and which z street cover each cell, for a pavement corner's yaw. A corner junction's streets also cover the other street's outer pavement (stage 1's lattice).
  const kindOf = new Map(streets.junctions.map((j) => [j.id, j.kind] as const));
  const zAt: (CityPlanStreet | null)[] = new Array<CityPlanStreet | null>(W * H).fill(null);
  const xAt: (CityPlanStreet | null)[] = new Array<CityPlanStreet | null>(W * H).fill(null);
  for (const s of streets.streets) {
    const lo = s.span.lo - (kindOf.get(s.ends[0].junction) === "corner" ? 1 : 0);
    const hi = s.span.hi + (kindOf.get(s.ends[1].junction) === "corner" ? 1 : 0);
    const own = s.axis === "x" ? xAt : zAt;
    for (let a = s.across0; a < s.across0 + s.bands.length; a++) {
      for (let p = lo; p < hi; p++) {
        const i = s.axis === "x" ? p : a;
        const j = s.axis === "x" ? a : p;
        if (i >= 0 && j >= 0 && i < W && j < H) own[j * W + i] = s;
      }
    }
  }

  const ground: CityGroundCell[] = [];
  for (const c of cells) {
    const idx = c.j * W + c.i;
    if (second.has(idx)) continue;
    const two = first.has(idx);
    const cx = (c.i + 0.5) * TILE_M;
    const cz = (c.j + 0.5) * TILE_M;
    const own = c.street === null ? null : (streetOf.get(c.street) ?? null);
    if (c.street !== null && own === null) throw new CityStageError(`ground: the cell (${c.i}, ${c.j}) names street ${c.street}, which the streets layer does not have`, [{ i: c.i, j: c.j }]);
    let yaw: CityYaw = 0;
    let variant = 0;
    switch (c.role) {
      case "lane":
      case "parking":
      case "parkingPlain":
      case "buildout": {
        yaw = yawToward(own!.axis, own!.centre_m > ((own!.axis === "x" ? c.j : c.i) + 0.5) * TILE_M ? 1 : -1);
        if (c.role === "lane") {
          // A one-way street's one lane is always `laneRight` 0.
          if (own!.section === "twoWay" && c.band > own!.bands.indexOf("lane")) variant |= V.laneRight;
          if (rand("patch", c.i, c.j) % PATCH_ONE_IN === 0) variant |= V.lanePatch;
        }
        break;
      }
      case "pavement":
      case "kerbCut": {
        yaw = yawToward(own!.axis, own!.carriage.lo_m > (own!.axis === "x" ? cz : cx) ? 1 : -1);
        if (c.role === "pavement") {
          const x = own!.axis === "x";
          const beside = (d: 1 | -1): CityEdgeCell | null => {
            const n = x ? cellAt(c.i + d, c.j) : cellAt(c.i, c.j + d);
            return n !== null && n.street === c.street ? n : null;
          };
          const inward = own!.carriage.lo_m > (x ? cz : cx) ? 1 : -1;
          const front = x ? cellAt(c.i, c.j + inward) : cellAt(c.i + inward, c.j);
          let bits = 0;
          if (beside(1)?.role === "kerbCut") bits |= V.pavementReturnNear;
          if (beside(-1)?.role === "kerbCut") bits |= V.pavementReturnFar;
          if (front?.role === "buildout" && front.street === c.street) bits |= V.pavementFlush;
          if (drops.has(idx)) bits |= V.pavementDip;
          // A cell with any kerb bit (a return, a flush or a dropped kerb) is never a grate.
          variant = bits !== 0 ? bits : rand("pave", c.i, c.j) % GRATE_ONE_IN === 0 ? V.pavementGrate : 0;
        }
        break;
      }
      case "crossing":
        yaw = yawToward(own!.axis, 1);
        break;
      case "pavementCorner": {
        const zs = zAt[idx];
        const xs = xAt[idx];
        if (!zs || !xs) throw new CityStageError(`ground: the pavement corner (${c.i}, ${c.j}) is not covered by an x street and a z street`, [{ i: c.i, j: c.j }]);
        yaw = cornerYaw(zs.carriage.lo_m > cx ? 1 : -1, xs.carriage.lo_m > cz ? 1 : -1);
        break;
      }
      case "junction":
        break;
    }
    let x = cx;
    let z = cz;
    if (two) {
      if (own!.axis === "x") x += TILE_M / 2;
      else z += TILE_M / 2;
    }
    ground.push({ i: c.i, j: c.j, cells: two ? 2 : 1, role: c.role, variant, x_m: x, z_m: z, yaw, street: c.street });
  }
  return ground;
}
