/**
 * Stage 8: making a prop (ticket 070 I). A prop's placement is its key's pivot (the bounds' centre in x and z, its base at y); its size is the key's bounds after the turn; every turn is a quarter. `lift` is the base over the surface it
 * stands on: 0, but a pole billboard's board.
 */

import type { CalibrationKey, CityGroundPlace, CityGroundProp, CityGroundPropKind } from "../../core";
import { SLAB_MAX_M } from "./constants";
import { cellOfPoint, normYaw, rectAt, turned, type Rect } from "./geom";
import { KIND_OF_KEY, boundsOf } from "./kit";

export interface PropSpec {
  readonly key: CalibrationKey;
  readonly on: CityGroundPlace;
  readonly block: string;
  readonly host: string;
  readonly line: "wall" | "kerb" | null;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly lift?: number;
}

/** The kind of a kit key. */
export function kindOf(key: CalibrationKey): CityGroundPropKind {
  const kind = KIND_OF_KEY.get(key);
  if (!kind) throw new Error(`${key} is not in the ground kit`);
  return kind;
}

/** A prop of the kit: its kind and size from the kit, its cell from its pivot. */
export function makeProp(s: PropSpec): CityGroundProp {
  const e = boundsOf(s.key);
  const yaw = normYaw(s.yaw);
  const size = turned(e.w, e.d, yaw);
  return {
    kind: kindOf(s.key),
    on: s.on,
    block: s.block,
    host: s.host,
    line: s.line,
    cell: cellOfPoint(s.x, s.z),
    placement: { key: s.key, x_m: s.x, y_m: s.lift ?? 0, z_m: s.z, yaw_deg: yaw },
    size: { x_m: size.x, z_m: size.z, h_m: e.h },
    flat: e.h < SLAB_MAX_M,
  };
}

/** A prop's footprint in plan. */
export function propRect(p: CityGroundProp): Rect {
  return { x0: p.placement.x_m - p.size.x_m / 2, x1: p.placement.x_m + p.size.x_m / 2, z0: p.placement.z_m - p.size.z_m / 2, z1: p.placement.z_m + p.size.z_m / 2 };
}

/** The footprint a key would have at (x, z) turned by `yaw`. */
export function keyRect(key: CalibrationKey, x: number, z: number, yaw: number): Rect {
  const e = boundsOf(key);
  return rectAt(x, z, e.w, e.d, yaw);
}
