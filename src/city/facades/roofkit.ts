/**
 * Stage 7, H3: the roof kit table (R-6; ticket 070 H3 criterion 1). The key lists, chances and numbers of the tile city's rooftop items (`dressBlock`'s big roof prop and small roof props, src/render3d/dressing.ts), R8's two
 * numbers (src/render3d/citymetrics.ts), the bounds of the 14 roof keys (as `dressing.test.ts`' and `citymetrics.test.ts`' fixtures have them), the six roof keys' bounds heights (the buildings kit's), and the numbers H3 adds:
 * `ROOF_ACCESS_CLEAR_M` (grammar rule 11), and Josh's two of 21 Nov 2026 (Q24), `ROOF_DECK_M` (RT, answer 1) and `BILLBOARD_EDGE_M` (BB, answer 2). Every copied number is pinned equal by `src/render3d/roofpin.test.ts` while both
 * paths exist (this folder cannot import `src/render3d/`, R-1). A piece's pivot is its bounds' centre in x and z and its base at y; every key's own front is +z (`DRESS_NUDGE_M` and `DRESS_FRONTS` are empty), so the roof exit's door,
 * the recessed face the GLB shows, is its own +z (RD). No novelty key: H3 places no novelty sign (NV; section H1c's).
 */

import type { CalibrationKey, CityRoofPieceKind } from "../../core";

const key = (name: string): CalibrationKey => `city-pack:${name}`;
const seq = (prefix: string, ...nn: string[]): CalibrationKey[] => nn.map((n) => key(`${prefix}${n}`));

// ---- the keys (dressing.ts) ----
/** Small roof props. The skylight, its glass and the vent end pieces are left out. */
export const ROOF_SMALL: readonly CalibrationKey[] = seq("SM_Prop_", "Roof_Aircon_01", "Roof_Aircon_02", "Roof_Aircon_03", "SatDish_01", "Vents_Exhaust_01", "Vents_Straight_01");
export const ROOF_WATER_TOWER: CalibrationKey = key("SM_Prop_Water_Tower_01");
/** The roof exit's housing: the stair hut. */
export const ROOF_ACCESS: CalibrationKey = key("SM_Bld_Roof_Access_01");
/** A roof billboard is its structure plus one face, two pieces that count as one big prop. */
export const BILLBOARD_STRUCTURE: CalibrationKey = key("SM_Prop_Billboard_Roof_01");
export const BILLBOARD_FACES: readonly CalibrationKey[] = seq("SM_Prop_Billboard_Sign_", "01", "02", "03", "04", "05", "06", "07");

/** The small roof props that look the same from the back (they may turn a half-turn by hash); the dish keeps facing its column's front. */
export const isTurnable = (k: CalibrationKey): boolean => ROOF_SMALL.includes(k) && !/SatDish/.test(k);

// ---- the chances and numbers (dressing.ts) ----
export const P_ROOF_SMALL = 0.7;
export const P_ROOF_LARGE = 0.5;
/** Of the roof columns that get small props, the share that get a second one. */
export const P_ROOF_SECOND = 0.4;
export const ROOF_SMALL_PER_BAY = 2;
/** Rule 11: a roof prop stands this far inside the body's edge (the cell's, M1), metres. */
export const ROOF_EDGE_M = 0.3;
/** A roof billboard's face stands this high on its structure, metres. */
export const BILLBOARD_SIGN_Y_M = 0.9;

// ---- R8 (citymetrics.ts) ----
/** R8's first number: buildings with a roof piece, as a share of all buildings, at least (`CITY_CHECK.R8`). */
export const ROOF_DRESSED_MIN = 0.9;
/** R8's second number: runs with a big roof prop, as a share of the runs, at least (`CITY_BIG_ROOF_RUNS_MIN`). */
export const BIG_ROOF_RUNS_MIN = 0.5;
/** The kinds R8's `BIG_ROOF` pattern counts (a billboard's face is half of one billboard and is not counted twice). */
export const BIG_ROOF_KINDS: readonly CityRoofPieceKind[] = ["waterTower", "exit", "billboard", "novelty"];

// ---- what H3 adds ----
/** Rule 11 / 068's Interfaces: the clear deck in front of the exit's door is at least this deep, metres. Typed in for the first time (pinned at 1.2 by `roofpin.test.ts`). */
export const ROOF_ACCESS_CLEAR_M = 1.2;
/** RT (Josh, 21 Nov 2026, Q24 answer 1: "Yes"): a roof prop's base stands this far over the roof piece's base, on every roof key, metres. */
export const ROOF_DECK_M = 0.5;
/** BB (Josh, 21 Nov 2026, Q24 answer 2: "Yes"): a billboard's structure and face stand this far inside the cell's edge, metres (the board is 4.428 m wide, 0.028 m too wide for `ROOF_EDGE_M`'s 4.40 m deck). */
export const BILLBOARD_EDGE_M = 0.28;

/**
 * TX and X (H3b; Josh, 21 Nov 2026, Q25 answer 2, "Yes to all"; his rule: "You get one water tower per x amount of buildings. I don't want to see water towers across the entire city because they just fit"): each street block
 * holds at most one water tower for every 16 of its buildings. Decided; pinned by `roofpin.test.ts`, not compared (the old path has no cap).
 */
export const WATER_TOWER_PER_BUILDINGS = 16;

// ---- the bounds of the roof keys (width, height, depth; metres) ----
export interface RoofBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}
const b = (w: number, h: number, d: number): RoofBounds => ({ w, h, d });

export const ROOF_BOUNDS: Readonly<Record<CalibrationKey, RoofBounds>> = {
  [key("SM_Prop_Roof_Aircon_01")]: b(0.948, 0.592, 0.467),
  [key("SM_Prop_Roof_Aircon_02")]: b(1.586, 1.073, 0.798),
  [key("SM_Prop_Roof_Aircon_03")]: b(1.546, 1.05, 1.0),
  [key("SM_Prop_SatDish_01")]: b(1.21, 1.344, 0.682),
  [key("SM_Prop_Vents_Exhaust_01")]: b(0.868, 1.63, 2.727),
  [key("SM_Prop_Vents_Straight_01")]: b(0.868, 0.803, 2.5),
  [key("SM_Prop_Water_Tower_01")]: b(2.42, 5.509, 2.419),
  [key("SM_Bld_Roof_Access_01")]: b(2.758, 2.744, 2.851),
  [key("SM_Prop_Billboard_Roof_01")]: b(4.428, 3.063, 1.611),
  ...Object.fromEntries(BILLBOARD_FACES.map((k) => [k, b(4.193, 2.028, 0.118)] as const)),
};

/** The bounds of a roof key: throws on a key that is not in the table. */
export function roofBounds(k: CalibrationKey): RoofBounds {
  const e = ROOF_BOUNDS[k];
  if (!e) throw new Error(`${k} is not in the roof table`);
  return e;
}

/** The six roof keys' bounds heights, metres (the buildings kit's `h`). */
export const ROOF_KEY_H_M: Readonly<Record<CalibrationKey, number>> = {
  [key("SM_Bld_Apartment_Roof_01")]: 0.5,
  [key("SM_Bld_Apartment_Roof_Corner_01")]: 0.5,
  [key("SM_Bld_Apartment_Roof_02")]: 0.744,
  [key("SM_Bld_Apartment_Roof_Corner_02")]: 0.744,
  [key("SM_Bld_Apartment_Roof_03")]: 0.744,
  [key("SM_Bld_Apartment_Roof_Corner_03")]: 0.744,
};

/** RT: the deck height over the roof piece's base, per roof key: `ROOF_DECK_M` on all six (the 0.744 m bounds top of styles 2 and 3 is a rim outside the deck). */
export const ROOF_DECK_BY_KEY: Readonly<Record<CalibrationKey, number>> = Object.fromEntries(Object.keys(ROOF_KEY_H_M).map((k) => [k, ROOF_DECK_M] as const));

/** The deck height of a roof key: throws on a key that is not a roof of the buildings kit. */
export function deckHeight(k: CalibrationKey): number {
  const h = ROOF_DECK_BY_KEY[k];
  if (h === undefined) throw new Error(`${k} is not a roof key of the roof table`);
  return h;
}
