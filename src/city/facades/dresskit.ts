/**
 * Stage 7, H1b: the dressing table (R-6; ticket 070 H1b criterion 1). The key lists, chances, caps and attachment numbers of the tile city's `dressBlock` (src/render3d/dressing.ts), the bounds of its 22 dressing keys
 * (as `dressing.test.ts`' fixture has them, from the converted manifest of 18 Nov 2026), and the first floor pieces' width, depth and front inset that a front-face piece is laid on (W1; the host above the ground
 * storey). Every number is a copy, pinned equal by `src/render3d/shopfrontpin.test.ts` while both paths exist (this folder cannot import `src/render3d/`, R-1). A piece's pivot is its bounds' centre in x and z and
 * its base at y; every key's own front is +z (`DRESS_NUDGE_M` and `DRESS_FRONTS` are empty and `BUILDING_FRONTS` names none of them).
 */

import type { CalibrationKey } from "../../core";

const key = (name: string): CalibrationKey => `city-pack:${name}`;
const seq = (prefix: string, ...nn: string[]): CalibrationKey[] => nn.map((n) => key(`${prefix}${n}`));

// ---- the keys (dressing.ts) ----
export const AWNINGS: readonly CalibrationKey[] = seq("SM_Bld_Shop_Cover_", "01", "02", "03", "04");
/** The L-shaped awning, for a corner column only. */
export const AWNING_CORNER: readonly CalibrationKey[] = seq("SM_Bld_Shop_Cover_", "05");
export const SIGNS_FASCIA: readonly CalibrationKey[] = seq("SM_Prop_Sign_", "Bar_01", "Cafe_01", "Chinese_Noodles_01", "Pizza_01", "Pub_01", "Entrance_01");
export const SIGNS_BLADE: readonly CalibrationKey[] = seq("SM_Prop_Sign_", "Barber_01", "DeliPizza_01", "Hotel_01");
export const ATMS: readonly CalibrationKey[] = seq("SM_Prop_ATM_", "01");
/** Shop glass: a shop's own key plus `_Glass`. `Shop_06` has none. */
export const SHOP_GLASS: readonly CalibrationKey[] = seq("SM_Bld_Shop_", "01_Glass", "02_Glass", "03_Glass", "04_Glass", "05_Glass", "Corner_01_Glass", "Corner_02_Glass");
const GLASS_SET: ReadonlySet<CalibrationKey> = new Set(SHOP_GLASS);

/** The glass key of a shop's key, or null when the shop has none (`Shop_06`). */
export function glassKeyOf(shop: CalibrationKey): CalibrationKey | null {
  const g = key(`${shop.slice("city-pack:".length)}_Glass`);
  return GLASS_SET.has(g) ? g : null;
}

// ---- the chances and caps ----
export const P_AWNING = 0.75;
export const P_SIGN = 0.6;
export const P_BLADE = 0.25;
export const P_ATM = 0.3;
export const ATM_PER_RUN = 2;
export const DRESS_PER_BAY_MAX = 6;
/** The whole-town budget (C1): reported beside each run's count, not applied. */
export const DRESS_MAX = 6000;

// ---- the attachment numbers ----
export const GLASS_INSET_M = 0.05;
export const GLASS_SILL_M = 0.3;
/** A glass piece deeper than this is a wrap (a corner shop's): centred on the shop's footprint instead of placed on its face. */
export const GLASS_WRAP_DEPTH_M = 1;
export const AWNING_BASE_M = 2.85;
export const SIGN_BASE_M = 2.85;
export const AWNING_KERB_M = 0.3;
export const ATM_Y_M = 0.6;
/** How far in from a door bay's edge the ATM's edge stands, metres. */
export const ATM_PIER_M = 0.35;
/** How far in from a bay's edge a blade sign's edge stands, metres. */
export const BLADE_INSET_M = 0.1;

// ---- the checks' thresholds (R4 to R6, copies of `CITY_CHECK` and the tile city's floors) ----
export const DRESS_R4_MIN = 1;
export const DRESS_R5_MIN = 0.55;
/** Josh, 18 Nov 2026: "Lower it to 0.45 (Recommended)" (`TILE_CITY_R6_MIN`). */
export const DRESS_R6_MIN = 0.45;
export const DRESS_ATM_MIN = 0.15;

// ---- the bounds of the 22 dressing keys (width, height, depth; metres) ----
export interface DressBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}
const b = (w: number, h: number, d: number): DressBounds => ({ w, h, d });

export const DRESS_BOUNDS: Readonly<Record<CalibrationKey, DressBounds>> = {
  [key("SM_Bld_Shop_01_Glass")]: b(4.891, 1.863, 0.323),
  [key("SM_Bld_Shop_02_Glass")]: b(4.311, 2.513, 0),
  [key("SM_Bld_Shop_03_Glass")]: b(8.738, 2.211, 0.293),
  [key("SM_Bld_Shop_04_Glass")]: b(4.765, 2.442, 0.705),
  [key("SM_Bld_Shop_05_Glass")]: b(4.817, 2.017, 0.054),
  [key("SM_Bld_Shop_Corner_01_Glass")]: b(4.809, 1.698, 4.787),
  [key("SM_Bld_Shop_Corner_02_Glass")]: b(4.729, 2.189, 4.729),
  [key("SM_Bld_Shop_Cover_01")]: b(4.574, 0.297, 2.815),
  [key("SM_Bld_Shop_Cover_02")]: b(4.706, 1.202, 3.235),
  [key("SM_Bld_Shop_Cover_03")]: b(5.0, 1.758, 3.501),
  [key("SM_Bld_Shop_Cover_04")]: b(5.104, 0.663, 0.732),
  [key("SM_Bld_Shop_Cover_05")]: b(5.394, 0.682, 5.394),
  [key("SM_Prop_ATM_01")]: b(1.128, 1.537, 0.519),
  [key("SM_Prop_Sign_Bar_01")]: b(1.327, 0.673, 0.138),
  [key("SM_Prop_Sign_Cafe_01")]: b(1.347, 0.553, 0.11),
  [key("SM_Prop_Sign_Chinese_Noodles_01")]: b(0.853, 0.507, 0.179),
  [key("SM_Prop_Sign_Pizza_01")]: b(2.211, 0.704, 0.144),
  [key("SM_Prop_Sign_Pub_01")]: b(1.13, 0.547, 0.112),
  [key("SM_Prop_Sign_Entrance_01")]: b(1.0, 0.436, 0.063),
  [key("SM_Prop_Sign_Barber_01")]: b(0.316, 0.948, 0.474),
  [key("SM_Prop_Sign_DeliPizza_01")]: b(0.301, 1.551, 0.14),
  [key("SM_Prop_Sign_Hotel_01")]: b(1.267, 3.801, 0.3),
};

/** The bounds of a dressing key the stage placed itself: throws on a key that is not in the table. */
export function dressBounds(k: CalibrationKey): DressBounds {
  const e = DRESS_BOUNDS[k];
  if (!e) throw new Error(`${k} is not in the dressing table`);
  return e;
}

// ---- the hosts above the ground storey (W1) ----
/** A first floor piece: its bounds' width (W1: a column's width) and depth (its front face is its pivot's z plus half of it), and `BODY_M`'s front inset. */
export interface FloorHost {
  readonly w: number;
  readonly d: number;
  readonly front: number;
}
const h = (w: number, d: number, front: number): FloorHost => ({ w, d, front });

/** The nine keys of `FIRST_FLOOR_SILL_M`: each style's mid floor, corner floor and three-storey piece. */
export const FLOOR_HOST: Readonly<Record<CalibrationKey, FloorHost>> = {
  [key("SM_Bld_Apartment_01")]: h(5.0, 5.196, 0.196),
  [key("SM_Bld_Apartment_Corner_01")]: h(5.196, 5.196, 0.196),
  [key("SM_Bld_Apartment_Stack_01")]: h(5.0, 5.196, 0.196),
  [key("SM_Bld_Apartment_02")]: h(5.17, 5.214, 0.129),
  [key("SM_Bld_Apartment_Corner_02")]: h(5.214, 5.214, 0.129),
  [key("SM_Bld_Apartment_Stack_02")]: h(5.17, 5.214, 0.129),
  [key("SM_Bld_Apartment_03")]: h(5.281, 5.497, 0.351),
  [key("SM_Bld_Apartment_Corner_03")]: h(5.491, 5.497, 0.351),
  [key("SM_Bld_Apartment_Stack_03")]: h(5.281, 5.497, 0.351),
};
