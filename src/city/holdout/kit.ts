/**
 * Stage 12, section E2: the hold-out's kit table (ticket 073 E2; X-8). The Sci-Fi Frontier keys the pass may use, with their bounds (width, height, depth; metres; the converted GLB's, measured 22 Nov 2026), and the
 * City Pack roof keys' bounds it must keep clear of. Every piece's pivot is its bounds' centre in x and z and its base at y, and its own front is +z. Pinned against the GLB and against the facades kit by
 * `src/render3d/holdoutpin.test.ts` (this folder cannot import a stage folder or `src/render3d/`).
 *
 * Which keys, and where each is used, is the ticket's kit table. Left out, on purpose: alien plants, sand, cliffs, weapons, character parts, the cantina interior; the `_Insert` pieces, the flat greebles,
 * `Bld_Wall_Large_01` and `Bld_Wall_Tower_01` (not shown in the pack's images); `Bld_Market_Stall_01` and `_03` (10.06 m, the plaza is 10.00 m); `Prop_Solar_Panel_03`, `_04` and `Prop_Fabric_03` (fit no roof deck);
 * the plant pieces (E1's); the Apocalypse pack's barricades (the ruin's kit). Nothing here is emissive (X-5).
 *
 * The 11 standing greebles are the ones free-standing on the ground: both plan extents at least 0.5 m and a height of at least 0.45 m (01, 05, 06, 07, 11, 15, 17, 19, 26, 27, 31). The rest are wall-mounted
 * strips or flat plates.
 */

import type { CalibrationKey, CityHoldoutPieceKind } from "../../core";
import type { BoundsOf, KitBounds } from "../pipeline/readable";

const key = (name: string): CalibrationKey => `sci-fi-frontier-pack:${name}`;

export interface KitEntry {
  readonly kind: CityHoldoutPieceKind;
  readonly w: number;
  readonly h: number;
  readonly d: number;
  /** X-5: nothing is emissive. A typed `false`, so a lit piece cannot be added without editing the type. */
  readonly emissive: false;
}
const e = (kind: CityHoldoutPieceKind, w: number, h: number, d: number): KitEntry => ({ kind, w, h, d, emissive: false });

/** The pass's kit: every key it may add, with its kind and bounds. */
export const KIT: Readonly<Record<CalibrationKey, KitEntry>> = {
  [key("SM_Bld_Tent_01")]: e("camp", 5.647, 3.775, 7.537),
  [key("SM_Bld_Tent_02")]: e("camp", 4.954, 3.751, 8.723),
  [key("SM_Bld_Tent_03")]: e("camp", 8.821, 4.91, 10.113),
  [key("SM_Bld_Pod_01")]: e("camp", 6.425, 6.441, 3.94),
  [key("SM_Bld_Pod_02")]: e("camp", 5.489, 6.352, 4.525),
  [key("SM_Bld_Pod_03")]: e("camp", 8.447, 9.983, 8.489),
  [key("SM_Bld_Pod_04")]: e("camp", 5.652, 5.532, 5.277),
  [key("SM_Bld_WaterTower_01")]: e("water-tower", 7.751, 14.21, 7.751),
  [key("SM_Env_Farm_Circle_01")]: e("farm", 13.121, 1.067, 13.171),
  [key("SM_Env_Farm_Circle_02")]: e("farm", 21.326, 1.098, 21.383),
  [key("SM_Env_Farm_Circle_03")]: e("farm", 33.261, 1.117, 33.21),
  [key("SM_Env_Farm_Straight_01")]: e("farm", 24.406, 0.905, 11.376),
  [key("SM_Prop_Irrigator_01")]: e("irrigator", 1.693, 3.763, 5.506),
  [key("SM_Prop_Irrigator_02")]: e("irrigator", 1.693, 3.763, 9.781),
  [key("SM_Bld_Market_Stall_02")]: e("stall", 5.231, 2.937, 5.79),
  [key("SM_Prop_Container_01")]: e("container", 2.175, 2.167, 4.075),
  [key("SM_Prop_Container_02")]: e("container", 2.404, 1.415, 4.398),
  [key("SM_Prop_Container_03")]: e("container", 2.656, 1.624, 4.463),
  [key("SM_Prop_Container_04")]: e("container", 2.742, 1.638, 3.202),
  [key("SM_Prop_Container_05")]: e("container", 2.338, 2.179, 3.17),
  [key("SM_Prop_Container_06")]: e("container", 1.434, 2.243, 4.572),
  [key("SM_Prop_Container_07")]: e("container", 2.171, 2.243, 3.517),
  [key("SM_Prop_Crate_01")]: e("clutter", 1.776, 0.775, 1.044),
  [key("SM_Prop_Crate_02")]: e("clutter", 1.241, 0.729, 0.887),
  [key("SM_Prop_Crate_03")]: e("clutter", 1.62, 0.93, 0.978),
  [key("SM_Prop_Crate_04")]: e("clutter", 1.798, 0.687, 0.679),
  [key("SM_Prop_Crate_05")]: e("clutter", 0.643, 0.959, 0.643),
  [key("SM_Prop_Fuel_Tank_01")]: e("clutter", 0.57, 0.864, 0.57),
  [key("SM_Prop_Fuel_Tank_02")]: e("clutter", 1.605, 0.644, 0.644),
  [key("SM_Prop_Greeble_01")]: e("clutter", 0.697, 1.018, 0.697),
  [key("SM_Prop_Greeble_05")]: e("clutter", 0.645, 1.999, 1.282),
  [key("SM_Prop_Greeble_06")]: e("clutter", 1.852, 0.829, 1.42),
  [key("SM_Prop_Greeble_07")]: e("clutter", 1.375, 3.093, 0.996),
  [key("SM_Prop_Greeble_11")]: e("clutter", 0.698, 0.457, 1.159),
  [key("SM_Prop_Greeble_15")]: e("clutter", 1.291, 1.739, 1.741),
  [key("SM_Prop_Greeble_17")]: e("clutter", 0.792, 0.944, 0.983),
  [key("SM_Prop_Greeble_19")]: e("clutter", 1.619, 0.893, 0.605),
  [key("SM_Prop_Greeble_26")]: e("clutter", 1.495, 2.048, 1.998),
  [key("SM_Prop_Greeble_27")]: e("clutter", 1.339, 2.025, 1.067),
  [key("SM_Prop_Greeble_31")]: e("clutter", 0.806, 0.577, 0.789),
  [key("SM_Prop_Solar_Panel_02")]: e("roof", 3.499, 5.606, 3.087),
  [key("SM_Prop_Fabric_01")]: e("roof", 3.024, 2.588, 1.877),
  [key("SM_Prop_Fabric_02")]: e("roof", 2.053, 2.1, 1.699),
  [key("SM_Bld_Wall_02")]: e("barricade", 5, 1.667, 0.577),
};

const keysOf = (kind: CityHoldoutPieceKind): readonly CalibrationKey[] => (Object.keys(KIT) as CalibrationKey[]).filter((k) => KIT[k]!.kind === kind);
export const CAMP_KEYS = keysOf("camp");
export const WATER_TOWER_KEY: CalibrationKey = key("SM_Bld_WaterTower_01");
export const FARM_KEYS = keysOf("farm");
export const IRRIGATOR_KEYS = keysOf("irrigator");
export const STALL_KEY: CalibrationKey = key("SM_Bld_Market_Stall_02");
export const CONTAINER_KEYS = keysOf("container");
export const CLUTTER_KEYS = keysOf("clutter");
export const ROOF_KEYS = keysOf("roof");
export const BARRICADE_KEY: CalibrationKey = key("SM_Bld_Wall_02");

/** Every key of the kit. */
export const KIT_KEYS: ReadonlySet<CalibrationKey> = new Set(Object.keys(KIT) as CalibrationKey[]);

/** Keys the pass never uses (a typed list, so a test can hold the kit against it). Alien, sand, cliff, weapon, character and cantina keys are excluded by being absent from `KIT`. */
export const EXCLUDED_KEYS: readonly CalibrationKey[] = [
  key("SM_Bld_Market_Stall_01"),
  key("SM_Bld_Market_Stall_03"),
  key("SM_Prop_Solar_Panel_03"),
  key("SM_Prop_Solar_Panel_04"),
  key("SM_Prop_Fabric_03"),
  key("SM_Bld_Wall_Large_01"),
  key("SM_Bld_Wall_Tower_01"),
  ...[38, 39, 40, 41, 42, 43, 44].map((n) => key(`SM_Prop_Greeble_${n}`)),
];

/** The kit's bounds in the readable checks' shape (width x, depth z, height), unturned; undefined for a key that is not the pass's. */
export const holdoutBounds: BoundsOf = (k: CalibrationKey): KitBounds | undefined => {
  const t = KIT[k];
  return t === undefined ? undefined : { x_m: t.w, z_m: t.d, h_m: t.h };
};

// ---- the City Pack roof keys the pass keeps clear of (H3's table and H1c's novelty table, copied; pinned equal by `holdoutpin.test.ts`) ----
const city = (name: string): CalibrationKey => `city-pack:${name}`;
const rb = (w: number, h: number, d: number): { readonly w: number; readonly h: number; readonly d: number } => ({ w, h, d });

export const CLEAN_ROOF_BOUNDS: Readonly<Record<CalibrationKey, { readonly w: number; readonly h: number; readonly d: number }>> = {
  [city("SM_Prop_Roof_Aircon_01")]: rb(0.948, 0.592, 0.467),
  [city("SM_Prop_Roof_Aircon_02")]: rb(1.586, 1.073, 0.798),
  [city("SM_Prop_Roof_Aircon_03")]: rb(1.546, 1.05, 1.0),
  [city("SM_Prop_SatDish_01")]: rb(1.21, 1.344, 0.682),
  [city("SM_Prop_Vents_Exhaust_01")]: rb(0.868, 1.63, 2.727),
  [city("SM_Prop_Vents_Straight_01")]: rb(0.868, 0.803, 2.5),
  [city("SM_Prop_Water_Tower_01")]: rb(2.42, 5.509, 2.419),
  [city("SM_Bld_Roof_Access_01")]: rb(2.758, 2.744, 2.851),
  [city("SM_Prop_Billboard_Roof_01")]: rb(4.428, 3.063, 1.611),
  ...Object.fromEntries(["01", "02", "03", "04", "05", "06", "07"].map((n) => [city(`SM_Prop_Billboard_Sign_${n}`), rb(4.193, 2.028, 0.118)] as const)),
  [city("SM_Prop_LargeSign_Beer_01")]: rb(2.005, 3.333, 2.019),
  [city("SM_Prop_LargeSign_Bottle_01")]: rb(1.8, 5.818, 1.8),
  [city("SM_Prop_LargeSign_BowlingBall_01")]: rb(3.019, 3.174, 3.174),
  [city("SM_Prop_LargeSign_BowlingPin_01")]: rb(1.631, 5.156, 1.631),
  [city("SM_Prop_LargeSign_Burger_01")]: rb(3.715, 2.178, 3.717),
  [city("SM_Prop_LargeSign_Coffee_01")]: rb(2.194, 1.346, 1.625),
  [city("SM_Prop_LargeSign_Donut_01")]: rb(3.818, 1.355, 3.818),
  [city("SM_Prop_LargeSign_Guitar_01")]: rb(2.098, 6.378, 0.377),
  [city("SM_Prop_LargeSign_Hotdog_01")]: rb(1.411, 1.143, 3.926),
  [city("SM_Prop_LargeSign_Icecream_01")]: rb(1.93, 5.04, 1.93),
  [city("SM_Prop_LargeSign_Lollypop_01")]: rb(3.365, 6.36, 0.512),
  [city("SM_Prop_LargeSign_Milkshake_01")]: rb(2.238, 4.699, 1.721),
  [city("SM_Prop_LargeSign_Noodles_01")]: rb(2.948, 3.601, 2.515),
  [city("SM_Prop_LargeSign_Pizza_01")]: rb(3.368, 0.562, 2.957),
  [city("SM_Prop_LargeSign_Popcorn_01")]: rb(1.737, 2.797, 1.737),
  [city("SM_Prop_LargeSign_Soda_01")]: rb(1.915, 5.595, 1.915),
  [city("SM_Prop_LargeSign_Taco_01")]: rb(1.215, 2.223, 3.701),
};

// ---- the stage 7 pieces the pass keeps clear of (the ruin pass's and the tech pass's `s7Boxes` reading; copies of the facades kits' bounds, pinned equal by `holdoutpin.test.ts`) ----
/** H1b's dressing but glass (the awning covers, the ATM, the trade signs) and H2's wall keys (canopies, escapes, air-conditioner, window planters). The novelty signs are in `CLEAN_ROOF_BOUNDS`. */
export const FACADE_BOUNDS: Readonly<Record<CalibrationKey, { readonly w: number; readonly h: number; readonly d: number }>> = {
  [city("SM_Bld_Shop_Cover_01")]: rb(4.574, 0.297, 2.815),
  [city("SM_Bld_Shop_Cover_02")]: rb(4.706, 1.202, 3.235),
  [city("SM_Bld_Shop_Cover_03")]: rb(5.0, 1.758, 3.501),
  [city("SM_Bld_Shop_Cover_04")]: rb(5.104, 0.663, 0.732),
  [city("SM_Bld_Shop_Cover_05")]: rb(5.394, 0.682, 5.394),
  [city("SM_Prop_ATM_01")]: rb(1.128, 1.537, 0.519),
  [city("SM_Prop_Sign_Bar_01")]: rb(1.327, 0.673, 0.138),
  [city("SM_Prop_Sign_Cafe_01")]: rb(1.347, 0.553, 0.11),
  [city("SM_Prop_Sign_Chinese_Noodles_01")]: rb(0.853, 0.507, 0.179),
  [city("SM_Prop_Sign_Pizza_01")]: rb(2.211, 0.704, 0.144),
  [city("SM_Prop_Sign_Pub_01")]: rb(1.13, 0.547, 0.112),
  [city("SM_Prop_Sign_Entrance_01")]: rb(1.0, 0.436, 0.063),
  [city("SM_Prop_Sign_Barber_01")]: rb(0.316, 0.948, 0.474),
  [city("SM_Prop_Sign_DeliPizza_01")]: rb(0.301, 1.551, 0.14),
  [city("SM_Prop_Sign_Hotel_01")]: rb(1.267, 3.801, 0.3),
  [city("SM_Bld_Cover_01")]: rb(4.832, 1.075, 1.0),
  [city("SM_Bld_Cover_02")]: rb(1.366, 0.974, 0.701),
  [city("SM_Bld_FireEscape_01")]: rb(3.251, 1.492, 1.644),
  [city("SM_Bld_FireEscape_02")]: rb(3.251, 3.609, 1.644),
  [city("SM_Bld_FireEscape_03")]: rb(4.252, 3.802, 1.76),
  [city("SM_Prop_Aircon_01")]: rb(0.823, 0.995, 0.651),
  [city("SM_Prop_PlanterWindow_01")]: rb(0.988, 0.743, 0.37),
  [city("SM_Prop_PlanterWindow_02")]: rb(0.87, 0.743, 0.332),
};
/** The key a code-drawn escape's piece carries, and its footprint. */
export const CODE_ESCAPE_KEY: CalibrationKey = "code:escape";
export const CODE_ESCAPE_W_M = 3.25;
export const CODE_ESCAPE_D_M = 1.64;
/** H2b's party-wall keys that are not a billboard face (those are in `CLEAN_ROOF_BOUNDS`): the window and two pipe runs. Only a roof item keeps clear of them (they stand on a wall above the lower roof across it). */
export const PARTY_BOUNDS: Readonly<Record<CalibrationKey, { readonly w: number; readonly h: number; readonly d: number }>> = {
  [city("SM_Prop_Window_01")]: rb(1.303, 2.313, 0.37),
  [city("SM_Prop_Pipe_Present_01")]: rb(4.459, 7.046, 0.498),
  [city("SM_Prop_Pipe_Present_03")]: rb(2.828, 4.243, 0.498),
};
