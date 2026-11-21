/**
 * Stage 7, H2: the wall table (R-6; ticket 070 H2 criterion 1). The key lists, chances, caps and numbers of the tile city's fire escapes (`src/render3d/escapes.ts`, tickets 058 and 061), door canopies, wall air-conditioners
 * and window planters (`dressBlock`, `src/render3d/dressing.ts`), the escapes' measured geometry and window sills, and the bounds of the eight keys (as `dressing.test.ts`' fixture has them, from the converted manifest of
 * 18 Nov 2026). Every number is a copy, pinned equal by `src/render3d/escapepin.test.ts` while both paths exist (this folder cannot import `src/render3d/`, R-1). A piece's pivot is its bounds' centre in x and z and its
 * base at y; every key's own front is +z.
 */

import type { CalibrationKey } from "../../core";

const key = (name: string): CalibrationKey => `city-pack:${name}`;
const seq = (prefix: string, ...nn: string[]): CalibrationKey[] => nn.map((n) => key(`${prefix}${n}`));

// ---- the keys ----

/** The top piece (a deck and a railing), the middle piece (a deck and a flight up), the first landing (a deck, a flight up and the drop ladder). */
export const ESCAPE_TOP: CalibrationKey = key("SM_Bld_FireEscape_01");
export const ESCAPE_MID: CalibrationKey = key("SM_Bld_FireEscape_02");
export const ESCAPE_FIRST: CalibrationKey = key("SM_Bld_FireEscape_03");
export const ESCAPES: readonly CalibrationKey[] = seq("SM_Bld_FireEscape_", "01", "02", "03");
/** The key a code-drawn escape's piece carries. */
export const CODE_ESCAPE_KEY: CalibrationKey = "code:escape";
export const DOOR_CANOPIES: readonly CalibrationKey[] = seq("SM_Bld_Cover_", "01", "02");
export const WALL_ACS: readonly CalibrationKey[] = seq("SM_Prop_Aircon_", "01");
export const WALL_PLANTERS: readonly CalibrationKey[] = seq("SM_Prop_PlanterWindow_", "01", "02");

// ---- the chances, caps and numbers (dressing.ts) ----

export const P_CANOPY = 0.5;
export const P_WALL_AC = 0.15;
export const P_PLANTER = 0.1;
export const ESCAPE_MIN_BAYS = 3;
export const WALL_PROPS_PER_BLOCK = 4;
/** Wall props stand on the second apartment floor and up (storey 2 and up). */
export const WALL_MIN_LEVEL = 2;
export const WALL_AC_LIFT_M = 1;
export const PLANTER_LIFT_M = 0.9;
export const WALL_AC_OFFSET_M = 1.5;
export const DOOR_CANOPY_Y_M = 2.3;
/** The share of qualifying street buildings that get a fire escape (R7's floor), `TILE_CITY_R7_MIN` (Josh, 18 Nov 2026). */
export const TILE_CITY_R7_MIN = 0.4;

// ---- the escape rule's numbers (escapes.ts) ----

/** The deck's top stands this far under the sill above it, metres. */
export const ESCAPE_DECK_BELOW_SILL_M = 0.15;
export const ESCAPE_DECK_TOL_M = 0.05;
export const ESCAPE_JOINT_TOL_M = 0.02;
export const ESCAPE_GROUND_TOL_M = 0.02;
/** The range a piece's y-scale may take to meet the storey pitch; outside it the whole escape is drawn in code. */
export const ESCAPE_SCALE_Y = { min: 0.8, max: 1.2 } as const;
export const LADDER_RUNG_PITCH_M = 0.3;
export const LADDER_RAIL_M = 0.04;
export const LADDER_RUNG_M = 0.03;
/** The code-drawn escape's parts, metres (see `escapes.ts`). */
export const CODE_ESCAPE = {
  w: 3.25,
  d: 1.64,
  deck: 0.08,
  rail: 0.9,
  bar: 0.05,
  tread: 0.25,
  riser: 0.2,
  hatch0: -0.9,
  hatch1: 1,
  stair0: 0.07,
  stair1: 0.67,
  ladderX0: 0.853,
  ladderX1: 1.303,
  ladderZ: 0.83,
} as const;

/** What one escape piece is, measured from the converted GLB (centred frame, metres, y up). */
export interface EscapeGeometry {
  deck_m: number;
  deckX0_m: number;
  deckX1_m: number;
  flightFoot_m: number | null;
  flightTop_m: number | null;
  flightFootX_m: number | null;
  flightTopX_m: number | null;
  hatchX_m: number | null;
  ladderFoot_m: number | null;
  ladder_m: readonly [x0: number, x1: number, z0: number, z1: number] | null;
  railTop_m: number;
}

export const ESCAPE_GEOMETRY: Readonly<Record<CalibrationKey, EscapeGeometry>> = {
  [ESCAPE_TOP]: {
    deck_m: 0.609,
    deckX0_m: -1.616,
    deckX1_m: 1.567,
    flightFoot_m: null,
    flightTop_m: null,
    flightFootX_m: null,
    flightTopX_m: null,
    hatchX_m: -0.939,
    ladderFoot_m: null,
    ladder_m: null,
    railTop_m: 1.492,
  },
  [ESCAPE_MID]: {
    deck_m: 0.609,
    deckX0_m: -1.616,
    deckX1_m: 1.567,
    flightFoot_m: 0.609,
    flightTop_m: 3.609,
    flightFootX_m: 0.867,
    flightTopX_m: -0.939,
    hatchX_m: -0.939,
    ladderFoot_m: null,
    ladder_m: null,
    railTop_m: 1.492,
  },
  [ESCAPE_FIRST]: {
    deck_m: 0.609,
    deckX0_m: -0.584,
    deckX1_m: 2.067,
    flightFoot_m: 0.609,
    flightTop_m: 3.609,
    flightFootX_m: -0.215,
    flightTopX_m: -2.02,
    hatchX_m: null,
    ladderFoot_m: 0.099,
    ladder_m: [0.853, 1.303, 0.798, 0.858],
    railTop_m: 1.492,
  },
};

/** The sill of the windows on each apartment floor piece's front, above the piece's base (one value, or one per storey of a three-storey piece). */
export const WINDOW_SILL_M: Readonly<Partial<Record<CalibrationKey, number | readonly number[]>>> = {
  [key("SM_Bld_Apartment_01")]: 0.756,
  [key("SM_Bld_Apartment_Corner_01")]: 0.756,
  [key("SM_Bld_Apartment_Stack_01")]: [0.756, 0.756, 0.756],
  [key("SM_Bld_Apartment_02")]: 0.417,
  [key("SM_Bld_Apartment_Corner_02")]: 0.417,
  [key("SM_Bld_Apartment_Stack_02")]: [0.417, 0.417, 0.417],
  [key("SM_Bld_Apartment_03")]: 0.517,
  [key("SM_Bld_Apartment_Corner_03")]: 0.517,
  [key("SM_Bld_Apartment_Stack_03")]: [0.517, 0.517, 0.517],
};

/** The tables a placement or a check reads: the tests swap them for fixtures. */
export interface EscapeTables {
  geometry: Readonly<Record<CalibrationKey, EscapeGeometry>>;
  sills: Readonly<Partial<Record<CalibrationKey, number | readonly number[]>>>;
}
export const ESCAPE_TABLES: EscapeTables = { geometry: ESCAPE_GEOMETRY, sills: WINDOW_SILL_M };

// ---- the bounds of the eight keys (width, height, depth; metres) ----

export interface WallBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}
const b = (w: number, h: number, d: number): WallBounds => ({ w, h, d });

export const WALL_BOUNDS: Readonly<Record<CalibrationKey, WallBounds>> = {
  [key("SM_Bld_Cover_01")]: b(4.832, 1.075, 1.0),
  [key("SM_Bld_Cover_02")]: b(1.366, 0.974, 0.701),
  [key("SM_Bld_FireEscape_01")]: b(3.251, 1.492, 1.644),
  [key("SM_Bld_FireEscape_02")]: b(3.251, 3.609, 1.644),
  [key("SM_Bld_FireEscape_03")]: b(4.252, 3.802, 1.76),
  [key("SM_Prop_Aircon_01")]: b(0.823, 0.995, 0.651),
  [key("SM_Prop_PlanterWindow_01")]: b(0.988, 0.743, 0.37),
  [key("SM_Prop_PlanterWindow_02")]: b(0.87, 0.743, 0.332),
};

/** The bounds of a wall key: throws on a key that is not in the table. */
export function wallBounds(k: CalibrationKey): WallBounds {
  const e = WALL_BOUNDS[k];
  if (!e) throw new Error(`${k} is not in the wall table`);
  return e;
}
