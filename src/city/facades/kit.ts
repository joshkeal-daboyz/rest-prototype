/**
 * Stage 7, H1: the ground kit table (R-6; ticket 070 H1 criterion 1; readings D2, D4, D5). Every City Pack key the stage may place on a ground storey: the six shops, the two residents' doors, the two shop corners, the two
 * residents' corner doors, and each apartment style's mid floor and corner floor as ground pieces. Typed in from the converted manifest (bounds, as `facade.test.ts`'s fixture has them), `BODY_M` (how far inside its bounds
 * each wall plane stands, in the piece's own frame, its front on +z), `DOOR_SILLS` (the door sill), `OPEN_SIDE_MEASURED` (a corner piece's second face is its own -x) and `WINDOW_SILL_M` (a floor piece's lowest window sill).
 * The corner doors are in no old table: their numbers are the pre-check's (D4), measured from `city-pack.glb`. `src/render3d/groundpin.test.ts` pins every number, and the bounds to the GLB when it is on the machine.
 *
 * A piece's pivot is its bounds' centre in x and z and its base at y (the converter centres every pivot, src/core/assets.ts). Own frame: front +z, a corner's second face -x.
 */

import type { CalibrationKey } from "../../core";

/** The distances, metres, from a piece's bounds in to its four wall planes (`BODY_M`'s `Body`). */
export interface GroundBody {
  readonly front: number;
  readonly back: number;
  readonly nx: number;
  readonly px: number;
}

export interface GroundEntry {
  readonly key: CalibrationKey;
  /** Bounds as the manifest has them, metres: width (x), height (y), depth (z). */
  readonly w: number;
  readonly h: number;
  readonly d: number;
  readonly body: GroundBody;
  /** A corner key's second face (`OPEN_SIDE_MEASURED`, and D4 for the corner doors); null on every other key. */
  readonly face: "-x" | null;
  /** The door's sill over the key's base (`DOOR_SILLS`' `sill_m`, D4's for the corner doors); null for a key with no door (`Shop_06`, a floor piece). */
  readonly sill: number | null;
  /** A floor key's lowest window sill (`WINDOW_SILL_M`); null for a base key. */
  readonly windowSill: number | null;
}

const key = (name: string): CalibrationKey => `city-pack:${name}`;
const entry = (name: string, w: number, h: number, d: number, front: number, back: number, nx: number, px: number, face: "-x" | null, sill: number | null, windowSill: number | null = null): GroundEntry => ({
  key: key(name),
  w,
  h,
  d,
  body: { front, back, nx, px },
  face,
  sill,
  windowSill,
});

/** The kit, in the order: the six shops (`STACK_STYLES`' `base.mid` order, `Shop_03` last), the two doors, the two shop corners, the two corner doors, then each style's mid floor and corner floor. */
export const GROUND_KIT: readonly GroundEntry[] = [
  entry("SM_Bld_Shop_01", 5.0, 3.054, 5.536, 0.219, 0, 0, 0, null, 0.106),
  entry("SM_Bld_Shop_02", 5.0, 3.3, 5.425, 0.425, 0, 0, 0, null, 0.071),
  entry("SM_Bld_Shop_04", 5.106, 3.17, 5.886, 0.557, 0.059, 0.053, 0.053, null, 0.077),
  entry("SM_Bld_Shop_05", 5.108, 3.0, 5.224, 0.076, 0.091, 0.054, 0.054, null, 0.361),
  entry("SM_Bld_Shop_06", 5.175, 3.0, 5.877, 0.52, 0.088, 0.088, 0.088, null, null),
  entry("SM_Bld_Shop_03", 10.087, 3.084, 5.493, 0.103, 0, 0.044, 0.044, null, 0.043),
  entry("SM_Bld_Apartment_Door_01", 5.096, 3.0, 5.577, 0.529, 0.048, 0.048, 0.048, null, 0.029),
  entry("SM_Bld_Apartment_Door_02", 5.114, 3.0, 5.115, 0.058, 0.057, 0.057, 0.057, null, 0.206),
  entry("SM_Bld_Shop_Corner_01", 5.377, 3.0, 5.471, 0.211, 0.188, 0.188, 0.188, "-x", 0.159),
  entry("SM_Bld_Shop_Corner_02", 5.332, 3.0, 5.332, 0.166, 0.166, 0.166, 0.166, "-x", 0.376),
  entry("SM_Bld_Apartment_Door_Corner_01", 5.577, 3.0, 5.577, 0.529, 0.048, 0.529, 0.048, "-x", 0.029),
  entry("SM_Bld_Apartment_Door_Corner_02", 5.115, 3.0, 5.115, 0.058, 0.057, 0.058, 0.057, "-x", 0.206),
  entry("SM_Bld_Apartment_01", 5.0, 3.0, 5.196, 0.196, 0, 0, 0, null, null, 0.756),
  entry("SM_Bld_Apartment_Corner_01", 5.196, 3.0, 5.196, 0.196, 0, 0.196, 0, "-x", null, 0.756),
  entry("SM_Bld_Apartment_02", 5.17, 3.0, 5.214, 0.129, 0.085, 0.085, 0.085, null, null, 0.417),
  entry("SM_Bld_Apartment_Corner_02", 5.214, 3.0, 5.214, 0.129, 0.085, 0.129, 0.085, "-x", null, 0.417),
  entry("SM_Bld_Apartment_03", 5.281, 3.0, 5.497, 0.351, 0.146, 0.14, 0.14, null, null, 0.517),
  entry("SM_Bld_Apartment_Corner_03", 5.491, 3.0, 5.497, 0.351, 0.146, 0.351, 0.14, "-x", null, 0.517),
];

const BY_KEY = new Map<CalibrationKey, GroundEntry>(GROUND_KIT.map((e) => [e.key, e] as const));

/** The kit entry of a key, or undefined when the key is not one of the 18. */
export function groundOf(k: CalibrationKey): GroundEntry | undefined {
  return BY_KEY.get(k);
}

/** The kit entry of a key the stage placed itself: throws on a key that is not in the table. */
export function groundEntry(k: CalibrationKey): GroundEntry {
  const e = BY_KEY.get(k);
  if (!e) throw new Error(`${k} is not in the ground kit table`);
  return e;
}

/** The deep keys (D5): the six ground keys whose body is deeper than 5.00 m (by 0.057 to 0.390 m). Their back plane may run up to `OVERLAP_MAX_M` into the built cell behind. */
export const DEEP_KEYS: readonly CalibrationKey[] = ["SM_Bld_Shop_01", "SM_Bld_Shop_03", "SM_Bld_Shop_04", "SM_Bld_Shop_05", "SM_Bld_Shop_06", "SM_Bld_Shop_Corner_01"].map(key);

/** The two-bay shop: the only key that stands over two columns (10.00 m wide). */
export const DOUBLE_KEY: CalibrationKey = key("SM_Bld_Shop_03");

/** A style's ground keys by kind, in `STACK_STYLES`' order. A key that has no level on a column (S1's window is empty) is not picked there. */
export interface GroundStyle {
  readonly id: string;
  /** One-cell shops (`base.mid` less `Shop_03`). */
  readonly shop: readonly CalibrationKey[];
  readonly shopDouble: readonly CalibrationKey[];
  readonly shopCorner: readonly CalibrationKey[];
  readonly door: readonly CalibrationKey[];
  readonly doorCorner: readonly CalibrationKey[];
  readonly floor: readonly CalibrationKey[];
  readonly floorCorner: readonly CalibrationKey[];
}

const SHOP_KEYS = ["SM_Bld_Shop_01", "SM_Bld_Shop_02", "SM_Bld_Shop_04", "SM_Bld_Shop_05", "SM_Bld_Shop_06"].map(key);
const DOOR_KEYS = ["SM_Bld_Apartment_Door_01", "SM_Bld_Apartment_Door_02"].map(key);
const SHOP_CORNER_KEYS = ["SM_Bld_Shop_Corner_01", "SM_Bld_Shop_Corner_02"].map(key);
const DOOR_CORNER_KEYS = ["SM_Bld_Apartment_Door_Corner_01", "SM_Bld_Apartment_Door_Corner_02"].map(key);

const style = (n: "01" | "02" | "03"): GroundStyle => ({
  id: `apartment-${n}`,
  shop: SHOP_KEYS,
  shopDouble: [DOUBLE_KEY],
  shopCorner: SHOP_CORNER_KEYS,
  door: DOOR_KEYS,
  doorCorner: DOOR_CORNER_KEYS,
  floor: [key(`SM_Bld_Apartment_${n}`)],
  floorCorner: [key(`SM_Bld_Apartment_Corner_${n}`)],
});

/** The three apartment styles' ground keys. */
export const GROUND_STYLES: readonly GroundStyle[] = [style("01"), style("02"), style("03")];

/**
 * The lowest window sill of the first floor piece standing over a ground slot, metres (`WINDOW_SILL_M`, a stack piece's first storey): the mid floor, the corner floor and the three-storey piece of each style.
 * S1's top rule reads it: a ground piece's top stays `LIFT_CLEAR_M` under the first floor's lowest sill.
 */
export const FIRST_FLOOR_SILL_M: Readonly<Record<CalibrationKey, number>> = {
  [key("SM_Bld_Apartment_01")]: 0.756,
  [key("SM_Bld_Apartment_Corner_01")]: 0.756,
  [key("SM_Bld_Apartment_Stack_01")]: 0.756,
  [key("SM_Bld_Apartment_02")]: 0.417,
  [key("SM_Bld_Apartment_Corner_02")]: 0.417,
  [key("SM_Bld_Apartment_Stack_02")]: 0.417,
  [key("SM_Bld_Apartment_03")]: 0.517,
  [key("SM_Bld_Apartment_Corner_03")]: 0.517,
  [key("SM_Bld_Apartment_Stack_03")]: 0.517,
};
