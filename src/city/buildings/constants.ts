/**
 * Stage 5, buildings (ticket 070 F1): the typed-in tables the stage reads (R-6). Every one is a copy of the old path's, pinned equal to it by `src/render3d/stylepin.test.ts` while both exist:
 * `TERRACE_BAYS` (town.ts), `CITY_STOREYS` and the R2 and R13 thresholds (citymetrics.ts), `COLOURWAY_POOL` (colourway.ts) and the apartment styles (stacks.ts' `STACK_STYLES`).
 */

import type { CalibrationKey } from "../../core";

/** The metres one lattice cell covers (the grammar's 5 m lattice). */
export const CELL_M = 5;

/** A building is 2 to 4 columns (grammar rule 1): the typed-in copy of town.ts's `TERRACE_BAYS`. */
export const TERRACE_BAYS = { min: 2, max: 4 } as const;

/** The storeys a building may have, the ground storey included (R2): a copy of citymetrics.ts's `CITY_STOREYS`. */
export const CITY_STOREYS = { min: 3, max: 5 } as const;

/** R2's and R13's thresholds, copies of citymetrics.ts's `CITY_CHECK.R2` and `.R13`: the share of row-neighbour pairs that must differ (1: every pair). */
export const CITY_CHECK = { R2: 1, R13: 1 } as const;

/**
 * The colourways a building may take, in order: red, orange-red, green, bright green, cream-tan, bright tan, teal, bright teal. A copy of colourway.ts's `COLOURWAY_POOL`.
 */
export const COLOURWAY_POOL: readonly string[] = ["base", "01_C", "02_A", "02_C", "03_A", "03_C", "04_A", "04_C"];

/** The swatch of each colourway of the pool (0xRRGGBB), for the picture: red, orange-red, green, bright green, cream-tan, bright tan, teal, bright teal. */
export const COLOURWAY_SWATCH: Readonly<Record<string, number>> = {
  base: 0xb04a3c,
  "01_C": 0xd9663a,
  "02_A": 0x4f8a4a,
  "02_C": 0x6fc24f,
  "03_A": 0xc9b48a,
  "03_C": 0xe3c46a,
  "04_A": 0x3f8f8a,
  "04_C": 0x4fd0c8,
};

/**
 * PROPOSED (grammar rule 4, 19 Nov 2026): "one constant for Josh's eye". The share of following buildings that stand "through" (the same building as their partner, so the same style and colourway);
 * the rest stand "another" (a different colourway). Josh: "They can be either." It stays Proposed until he has seen F1's screenshots (his answer 3, Q19). No test pins its value.
 */
export const BACK_SAME_SHARE = 0.5;

/** An upper bound on random restarts when grouping one part (an implementation cap, not a rule: a part that uses them all fails the stage, rule 6). */
export const GROUP_TRIES_MAX = 4000;
/** An upper bound on search nodes when choosing one part's storeys (an implementation cap, not a rule). */
export const STOREY_NODES_MAX = 200_000;

type Role = "base" | "floor" | "roof";

/** A style of the typed-in table: the keys it may use by role (the pieces are stage 7's and F2's to pick), and its storey pitches. The row styles are the apartment ("bay") styles only; offices are not. */
export interface BuildingStyle {
  readonly id: string;
  readonly base: { readonly mid: readonly CalibrationKey[]; readonly door: readonly CalibrationKey[]; readonly corner: readonly CalibrationKey[] };
  readonly floor: { readonly mid: readonly CalibrationKey[]; readonly corner: readonly CalibrationKey[] };
  readonly roof: { readonly mid: readonly CalibrationKey[]; readonly corner: readonly CalibrationKey[] };
  readonly pitch_m: Readonly<Record<Role, number>>;
}

const k = (name: string): CalibrationKey => `city-pack:${name}`;
const SHOPS = ["SM_Bld_Shop_01", "SM_Bld_Shop_02", "SM_Bld_Shop_04", "SM_Bld_Shop_05", "SM_Bld_Shop_06", "SM_Bld_Shop_03"].map(k);
const DOORS = ["SM_Bld_Apartment_Door_01", "SM_Bld_Apartment_Door_02"].map(k);
const SHOP_CORNERS = ["SM_Bld_Shop_Corner_01", "SM_Bld_Shop_Corner_02"].map(k);

function apartment(n: "01" | "02" | "03", roofReserve: number): BuildingStyle {
  return {
    id: `apartment-${n}`,
    base: { mid: SHOPS, door: DOORS, corner: SHOP_CORNERS },
    floor: { mid: [k(`SM_Bld_Apartment_${n}`)], corner: [k(`SM_Bld_Apartment_Corner_${n}`)] },
    roof: { mid: [k(`SM_Bld_Apartment_Roof_${n}`)], corner: [k(`SM_Bld_Apartment_Roof_Corner_${n}`)] },
    pitch_m: { base: 3, floor: 3, roof: roofReserve },
  };
}

/** The three apartment styles, a copy of the `depth: "bay"` entries of stacks.ts' `STACK_STYLES`. */
export const BUILDING_STYLES: readonly BuildingStyle[] = [apartment("01", 0.5), apartment("02", 0.75), apartment("03", 0.75)];
export const STYLE_IDS: readonly string[] = BUILDING_STYLES.map((s) => s.id);
