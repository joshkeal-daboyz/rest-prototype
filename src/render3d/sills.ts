/**
 * Ticket 055 section F: door sills, measured per building (pure: no three, no DOM, no fetch, no GLB).
 *
 * Josh, 18 Nov 2026: "That's going to have to be a variable that we measure for each individual building." A building's sill is the height of the floor its door opens onto, above
 * the model's base (the converter grounds min y at 0). A sill over `SILL_MAX_M` leaves the door out of reach of the walk in front of it, so the building is sunk by it (a house keeps its
 * lowest window at least `SILL_WINDOW_CLEAR_M` over the walk and stands the Town Pack's concrete steps for what is left over; a City Pack stack always sinks, as one, by the largest sill of
 * its ground pieces, and never takes steps). `DOOR_SILLS` is the table of measured values, read from the converted GLBs by `measureDoor` (the same function `sills.test.ts` re-measures with
 * when the GLBs are on the machine); `houseSill` and `stackSill` turn a table into what to draw. `models3d.ts` draws it.
 *
 * Frames. A model's own frame is the GLB's (centred pivot, base at y 0). The front frame of a model is the one `BUILDING_FRONTS` gives it: `u` runs along the front face to the right as seen from
 * outside, `d` away from the building through the front face, and `v` is the depth behind the front face (`v` = 0 on the front face, growing inward). A steps plan is in the front frame:
 * `x_m` is `u` and `z_m` is `d` measured out from the front face to the steps' centre; `modelPoint` turns it into the model's own frame.
 */

import type { CalibrationKey } from "../core";
import { frontAxis, frontYaw, type ModelFront } from "./models";
import { stableHash } from "../render/city";
import { ESCAPE_TABLES, sillOf, type EscapeTables } from "./escapes";
import type { Stack, StackPiece } from "./stacks";

/** A sill up to this high is left alone: a door step (ticket 055 F, Josh's Q11 at its default). */
export const SILL_MAX_M = 0.15;
/** A house's lowest ground-floor window stays at least this far above the walk after sinking; the rest of the rise is steps (Q12). */
export const SILL_WINDOW_CLEAR_M = 0.3;
/** The steps model (Q13): the Town Pack's house steps, 1.2 x 0.5 x 0.9 m. `SM_Bld_House_DeckSteps_01` converts to 0 x 0 x 0 and is not used. */
export const STEPS_KEY: CalibrationKey = "town-pack:SM_Bld_House_Concrete_Steps_01";
/** The steps' measured height (0.5126 m in the GLB): the rise they make at scale 1. */
export const STEPS_RISE_M = 0.5;
/** The steps are scaled in y alone, between these. */
export const STEPS_SCALE_Y = { min: 0.5, max: 1.5 } as const;
/** The steps' footprint, metres: 1.2 wide along the front and 0.9 out from it. */
export const STEPS_W_M = 1.2;
export const STEPS_D_M = 0.9;
/** How far the steps' back edge tucks in behind the front face, so no gap shows between them and the wall. */
export const STEPS_TUCK_M = 0.05;
/** A door's rise has to be made up by the steps' scaled top to within this. */
export const STEPS_FIT_M = 0.05;

// ---- how a sill is measured (the method of `measureDoor`; 16.10 of the guide) ----

/** Only upward-facing surfaces up to this far behind the front face are door floors. */
export const SILL_DEPTH_M = 1;
/** Only upward-facing surfaces up to this high are door floors (a counter or a window ledge is above it). */
export const SILL_CEIL_M = 1.5;
/** A cluster of upward-facing surface smaller than this is a fitting, not a floor (a door's kick plate, a stair nosing). */
export const DOOR_MIN_AREA_M2 = 0.2;
/** The door opening, either side of its centre, along the front. */
export const SILL_DOOR_HALF_M = 0.45;
/** Surfaces within this height of each other are one level. */
export const SILL_LEVEL_GAP_M = 0.03;
/** Two surfaces on one level that are this close along the front are one cluster. */
export const SILL_JOIN_GAP_M = 0.1;

/** A front step is an upward-facing level at least this high (a lower one is the ground slab). */
export const STEP_MIN_M = 0.05;
/** And at least this far under the door floor (a level that close is the floor itself). */
export const STEP_BELOW_FLOOR_M = 0.1;
/** A window's reveal is a front-facing face at least this far behind the front plane (ticket 062 A). */
export const RECESS_MIN_M = 0.05;
/** At least this big (one surface of faces on a plane). */
export const RECESS_AREA_M2 = 0.3;
/** Faces within this depth of each other are one plane. */
export const RECESS_FLAT_M = 0.02;
/** Coplanar faces within this of each other (along the front and up) are one surface. */
export const RECESS_JOIN_M = 0.03;
/** And no deeper behind the front plane than this (a wall of a back room is not a front window). */
export const WINDOW_DEPTH_M = 4;
/** The reveal's lowest edge is at least this far above the door floor. */
export const RECESS_ABOVE_FLOOR_M = 0.05;
/** A recessed surface wholly within this far either side of the door's centre is the door's leaf or frame, not a window (ticket 062 A). */
export const RECESS_DOOR_HALF_M = 0.75;

/** One ground-floor model's door: the sill's height, the lowest window of its front (null when none can be told), and the door's centre along the front, all in metres in the model's frame. */
export interface DoorSill {
  sill_m: number;
  window_m: number | null;
  door_x_m: number;
  /** The top of the lowest step in front of the door floor (a porch step), metres; absent when the front has none. A sink never goes past it (ticket 062 A). */
  step_m?: number;
  /** For a typed-in entry that the geometry could not give: the reason (ticket 062 A). */
  why?: string;
}

export type SillTable = Readonly<Partial<Record<CalibrationKey, DoorSill>>>;

/**
 * The measured table (ticket 055 F, from the converted GLBs of 18 Nov 2026, by `measureDoor`; `sills.test.ts` pins every value and re-measures them where the GLBs are). Ticket 062 A: every key the town can
 * place on the ground has an entry here or a reason in `NO_STREET_DOOR`. A key whose door floor stands back is measured with its own search depth (`SILL_DEPTH_BY_KEY`); an entry with a `why` is typed in,
 * because the geometry cannot give it. `window_m` is the lowest glass or, where the model has none, the lowest recessed face (`measureDoor`); `step_m` is the lowest front step.
 */
export const DOOR_SILLS: SillTable = {
  "city-pack:SM_Bld_Shop_01": { sill_m: 0.106, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_02": { sill_m: 0.071, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_03": { sill_m: 0.043, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_04": { sill_m: 0.077, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_05": { sill_m: 0.361, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Apartment_Door_01": { sill_m: 0.029, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Apartment_Door_02": { sill_m: 0.206, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_Corner_01": { sill_m: 0.159, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_Corner_02": { sill_m: 0.376, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_OfficeOld_Small_Base_01": { sill_m: 0.915, window_m: null, door_x_m: 2.5 },
  "city-pack:SM_Bld_OfficeOld_Large_Base_01": { sill_m: 0.915, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_OfficeOctagon_Base_01": { sill_m: 0.085, window_m: null, door_x_m: 0 },
  "town-pack:SM_Bld_House_Preset_01": { sill_m: 1.151, window_m: 1.851, door_x_m: 0 },
  "town-pack:SM_Bld_House_Preset_02": { sill_m: 1.052, window_m: 1.752, door_x_m: 1.271 },
  "town-pack:SM_Bld_House_Preset_03": { sill_m: 1.151, window_m: 1.851, door_x_m: -2.479 },
  "town-pack:SM_Bld_House_Preset_04": { sill_m: 1.151, window_m: 1.851, door_x_m: -2.5, why: "typed in: its door threshold (1.15 m) is 5.05 m behind the -x front face, in a deep porch, beyond SILL_DEPTH_MAX_M; its lowest glass is 1.851 m" },
  "town-pack:SM_Bld_House_Preset_05": { sill_m: 1.166, window_m: 1.866, door_x_m: -2.479 },
  "town-pack:SM_Bld_House_Preset_06": { sill_m: 1.052, window_m: 1.752, door_x_m: 0 },
  "town-pack:SM_Bld_House_Preset_07": { sill_m: 1.052, window_m: 1.752, door_x_m: 2.521 },
  "town-pack:SM_Bld_House_Preset_08": { sill_m: 1.102, window_m: 1.802, door_x_m: -4.979 },
  "town-pack:SM_Bld_House_Preset_09": { sill_m: 1.052, window_m: 1.752, door_x_m: -1.229 },
  "town-pack:SM_Bld_House_Preset_10": { sill_m: 1.052, window_m: 1.752, door_x_m: -2.666 },
  "town-pack:SM_Bld_House_Preset_11": { sill_m: 1.052, window_m: 1.752, door_x_m: 0 },
  "town-pack:SM_Bld_House_Preset_Garage_01": { sill_m: 1.052, window_m: null, door_x_m: 0, why: "typed in: no floor on its front (the front is the vehicle door; its only threshold, 1.05 m, is on the back, 8.17 m in); it sinks like its houses, by the same 1.052 m, so no plinth is left beside them" },
  "simple-town:Building_Shop_01": { sill_m: 0.337, window_m: 6.352, door_x_m: 0 },
  "simple-town:Building_Shop_02": { sill_m: 0.337, window_m: 6.352, door_x_m: 0 },
  "simple-town:Building_Shop_03": { sill_m: 0.199, window_m: 5.515, door_x_m: 0 },
  "simple-town:Building_Shop_04": { sill_m: 0.199, window_m: 5.515, door_x_m: 0 },
  "simple-town:Building_Shop_05": { sill_m: 0.199, window_m: 5.515, door_x_m: 0 },
  "simple-town:Building_BaberShop": { sill_m: 0.333, window_m: 1.299, door_x_m: 2.461 },
  "simple-town:Building_Gym": { sill_m: 0.337, window_m: 6.352, door_x_m: 0 },
  "simple-town:store_small_mesh": { sill_m: 0.212, window_m: null, door_x_m: 0 },
  "simple-town:store_corner_mesh": { sill_m: 0.212, window_m: 4.295, door_x_m: -3.799 },
  "simple-town:apartment_small_mesh": { sill_m: 0.212, window_m: 2.137, door_x_m: 0 },
  "simple-town:Building_House_01": { sill_m: 1.035, window_m: 1.721, door_x_m: 0, step_m: 0.601 },
  "simple-town:Building_House_02": { sill_m: 1.035, window_m: 1.721, door_x_m: 0, step_m: 0.601 },
  "simple-town:Building_House_03": { sill_m: 1.035, window_m: 1.721, door_x_m: 0, step_m: 0.601 },
  "simple-town:Building_House_04": { sill_m: 1.035, window_m: 1.721, door_x_m: 0, step_m: 0.601 },
  "simple-town:Building_House_09": { sill_m: 0.639, window_m: 2.832, door_x_m: 0, step_m: 0.213 },
  "simple-town:Building_House_010": { sill_m: 0.639, window_m: 2.832, door_x_m: 0, step_m: 0.213 },
  "simple-town:Building_House_011": { sill_m: 0.639, window_m: 2.832, door_x_m: 0, step_m: 0.213 },
  "simple-town:Building_House_012": { sill_m: 1.053, window_m: 1.33, door_x_m: 0, step_m: 0.682 },
  "simple-town:Building_House_013": { sill_m: 1.053, window_m: 1.33, door_x_m: 0, step_m: 0.682 },
  "simple-town:Building_House_014": { sill_m: 1.053, window_m: 1.33, door_x_m: 0, step_m: 0.682 },
  "simple-town:Building_House_015": { sill_m: 1.053, window_m: 1.33, door_x_m: 0, step_m: 0.682 },
  "simple-town:office_small_mesh": { sill_m: 0.505, window_m: 1.959, door_x_m: -2.991, step_m: 0.245 },
  "simple-town:Building_House_05": { sill_m: 0.33, window_m: 1.201, door_x_m: 0 },
  "simple-town:Building_House_06": { sill_m: 0.33, window_m: 1.201, door_x_m: 0 },
  "simple-town:Building_House_07": { sill_m: 0.33, window_m: 1.201, door_x_m: 0 },
  "simple-town:Building_House_08": { sill_m: 0.33, window_m: 1.201, door_x_m: 0 },
  "simple-town:Building_AutoRepair": { sill_m: 0.138, window_m: 1.182, door_x_m: -5.965 },
  "simple-town:Building_StripClub": { sill_m: 0.138, window_m: 0.765, door_x_m: 0 },
  "simple-town:Building_PoliceStation": { sill_m: 0.402, window_m: 0.529, door_x_m: 0 },
  "simple-town:Building_CoffeeShop": { sill_m: 0.333, window_m: 5.954, door_x_m: 0 },
  "simple-town:apartment_large_mesh": { sill_m: 0.212, window_m: 2.137, door_x_m: 0 },
  "simple-town:office_medium_mesh": { sill_m: 0.505, window_m: 1.959, door_x_m: -2.991, step_m: 0.245 },
  "simple-town:office_large_mesh": { sill_m: 0.505, window_m: 1.959, door_x_m: -2.991, step_m: 0.245 },
};

/** The deepest search for a door floor behind the front face: a key whose floor stands further back is typed in, or has no street door (ticket 062 A). */
export const SILL_DEPTH_MAX_M = 4;

/**
 * Keys whose first door floor starts more than `SILL_DEPTH_M` behind the front face (a recessed porch, a set-back shop door): how far back to look, and why. Each is at most `SILL_DEPTH_MAX_M`; the depth is the
 * floor's measured start rounded up to a tenth of a metre.
 */
export const SILL_DEPTH_BY_KEY: Readonly<Partial<Record<CalibrationKey, { depth_m: number; why: string }>>> = {
  "town-pack:SM_Bld_House_Preset_10": { depth_m: 3, why: "its door threshold (1.05 m) is 2.57 m behind the -z front face, in a recessed porch" },
  "town-pack:SM_Bld_House_Preset_11": { depth_m: 3, why: "its door threshold (1.05 m) is 2.57 m behind the -z front face, in a recessed porch" },
  "simple-town:Building_Shop_03": { depth_m: 2.4, why: "the first floor (0.20 m) is 2.29 m behind the front face" },
  "simple-town:Building_Shop_04": { depth_m: 2.4, why: "the first floor (0.20 m) is 2.29 m behind the front face" },
  "simple-town:Building_Shop_05": { depth_m: 2.4, why: "the first floor (0.20 m) is 2.29 m behind the front face" },
  "simple-town:Building_BaberShop": { depth_m: 1.4, why: "the first floor (0.33 m) is 1.32 m behind the front face" },
  "simple-town:Building_Gym": { depth_m: 2.5, why: "the first floor (0.34 m) is 2.45 m behind the front face" },
  "simple-town:store_small_mesh": { depth_m: 1.4, why: "the only floor (0.21 m) starts 1.35 m behind the front face" },
  "simple-town:store_corner_mesh": { depth_m: 1.2, why: "the only floor (0.21 m) starts 1.08 m behind the front face" },
  "simple-town:Building_House_05": { depth_m: 2.5, why: "the first floor (0.33 m) is 2.43 m behind the front face" },
  "simple-town:Building_House_06": { depth_m: 2.5, why: "the first floor (0.33 m) is 2.43 m behind the front face" },
  "simple-town:Building_House_07": { depth_m: 2.5, why: "the first floor (0.33 m) is 2.43 m behind the front face" },
  "simple-town:Building_House_08": { depth_m: 2.5, why: "the first floor (0.33 m) is 2.43 m behind the front face" },
  "simple-town:Building_House_09": { depth_m: 1.3, why: "the door floor (0.64 m) is 1.24 m behind the front face, past the stoop's steps of 0.21 and 0.43 m" },
  "simple-town:Building_House_010": { depth_m: 1.3, why: "the door floor (0.64 m) is 1.24 m behind the front face, past the stoop's steps of 0.21 and 0.43 m" },
  "simple-town:Building_House_011": { depth_m: 1.3, why: "the door floor (0.64 m) is 1.24 m behind the front face, past the stoop's steps of 0.21 and 0.43 m" },
  "simple-town:Building_CoffeeShop": { depth_m: 3.6, why: "the first floor (0.33 m) is 3.49 m behind the front face" },
};

/** How far behind the front face a key's door floor is looked for: its own depth, or `SILL_DEPTH_M`. */
export function sillDepth(key: CalibrationKey): number {
  return Object.prototype.hasOwnProperty.call(SILL_DEPTH_BY_KEY, key) ? SILL_DEPTH_BY_KEY[key]!.depth_m : SILL_DEPTH_M;
}

/** Keys with no street door to sink to: drawn unchanged (sill 0), each with why (ticket 062 A). */
export const NO_STREET_DOOR: Readonly<Partial<Record<CalibrationKey, string>>> = {
  "city-pack:SM_Bld_Shop_06": "a flat front with no floor behind it: no upward surface of a door floor's size at all",
  "simple-town:Building_Garage_01": "vehicle bays at ground level: no floor within 14 m of the front face",
  "simple-town:Building_Garage_02": "vehicle bays at ground level: no floor within 14 m of the front face",
  "simple-town:Building_Garage_03": "vehicle bays at ground level: no floor within 14 m of the front face",
  "simple-town:Building_PetrolStation": "a forecourt at ground level: its first floor (0.40 m) is 18.37 m behind the front face",
  "simple-town:house_mesh": "its door is at the back: the first floor (0.53 m) is 9.28 m behind the front face, where its steps are",
};

/**
 * Entries of the table that have no front window to guard, each with why: the window check then does nothing and the model sinks by its whole sill (or, with a front step, no further than the step).
 * A City Pack ground piece is a stack's, which has no window check of its own (the first floor's window sill, `WINDOW_SILL_M`, is what the stack's lift is judged against).
 */
export const NO_FRONT_WINDOW: Readonly<Partial<Record<CalibrationKey, string>>> = {
  "city-pack:SM_Bld_Shop_01": "a stack's ground piece: the shop glass is the dressing's, at GLASS_SILL_M",
  "city-pack:SM_Bld_Shop_02": "a stack's ground piece: the shop glass is the dressing's, at GLASS_SILL_M",
  "city-pack:SM_Bld_Shop_03": "a stack's ground piece: the shop glass is the dressing's, at GLASS_SILL_M",
  "city-pack:SM_Bld_Shop_04": "a stack's ground piece: the shop glass is the dressing's, at GLASS_SILL_M",
  "city-pack:SM_Bld_Shop_05": "a stack's ground piece: the shop glass is the dressing's, at GLASS_SILL_M",
  "city-pack:SM_Bld_Apartment_Door_01": "a stack's ground piece: the first floor's window sill is the one that counts",
  "city-pack:SM_Bld_Apartment_Door_02": "a stack's ground piece: the first floor's window sill is the one that counts",
  "city-pack:SM_Bld_Shop_Corner_01": "a stack's ground piece: the shop glass is the dressing's, at GLASS_SILL_M",
  "city-pack:SM_Bld_Shop_Corner_02": "a stack's ground piece: the shop glass is the dressing's, at GLASS_SILL_M",
  "city-pack:SM_Bld_OfficeOld_Small_Base_01": "a stack's ground piece (an office base)",
  "city-pack:SM_Bld_OfficeOld_Large_Base_01": "a stack's ground piece (an office base)",
  "city-pack:SM_Bld_OfficeOctagon_Base_01": "a stack's ground piece (an office base)",
  "simple-town:store_small_mesh": "no recessed face above its floor within WINDOW_DEPTH_M: a flat painted front",
  "town-pack:SM_Bld_House_Preset_Garage_01": "its front is the vehicle door; the model has no glass",
};

// ---- the plan: what a sill and a window make of a building ----

/** Steps in the building's front frame (see the file's head) and the y-scale of the steps' model. */
export interface StepsPlan {
  x_m: number;
  z_m: number;
  scaleY: number;
}

export interface SillPlan {
  /** How far the building sinks, metres (zero: not changed). */
  sink_m: number;
  steps: StepsPlan | null;
  /** The rise left between the walk and the door after sinking: the sill less the sink. */
  leftOver_m: number;
}

const NO_CHANGE: SillPlan = { sink_m: 0, steps: null, leftOver_m: 0 };
const STEPS_MIN_RISE_M = STEPS_RISE_M * STEPS_SCALE_Y.min;
const STEPS_MAX_RISE_M = STEPS_RISE_M * STEPS_SCALE_Y.max;

/**
 * What to do with a house (a whole model) whose door floor is `sill_m` over its base, whose lowest ground-floor window is `window_m` (null: none known), whose door is at `door_x_m`, and whose lowest front step
 * has its top at `step_m` (null: none).
 * - a sill up to `SILL_MAX_M`: nothing;
 * - otherwise sink it by the sill, but no further than leaves the window `SILL_WINDOW_CLEAR_M` over the walk, and no further than leaves the lowest front step at the walk (ticket 062 A);
 * - what is left over, if more than `SILL_MAX_M`, is made up by the steps scaled in y so their top meets the door (within the scale range; a rise under the steps' smallest is made by sinking
 *   less, down to a sink of zero, so the steps' top still meets the door).
 */
export function planHouse(sill_m: number, window_m: number | null, door_x_m: number, step_m: number | null = null): SillPlan {
  if (!(sill_m > SILL_MAX_M)) return { sink_m: 0, steps: null, leftOver_m: Math.max(0, sill_m) };
  const room = window_m === null ? sill_m : Math.min(sill_m, Math.max(0, window_m - SILL_WINDOW_CLEAR_M));
  let sink = step_m === null ? room : Math.min(room, Math.max(0, step_m));
  let rest = sill_m - sink;
  if (rest <= SILL_MAX_M + 1e-9) return { sink_m: sink, steps: null, leftOver_m: rest };
  if (rest < STEPS_MIN_RISE_M) {
    // The smallest steps are taller than the rise: sink less so the steps' top meets the door; with a sill under their height, no steps can meet it.
    sink = Math.max(0, sill_m - STEPS_MIN_RISE_M);
    rest = sill_m - sink;
    if (rest < STEPS_MIN_RISE_M - STEPS_FIT_M) return { sink_m: sink, steps: null, leftOver_m: rest };
  }
  const scaleY = Math.min(STEPS_SCALE_Y.max, Math.max(STEPS_SCALE_Y.min, rest / STEPS_RISE_M));
  return { sink_m: sink, steps: { x_m: door_x_m, z_m: STEPS_D_M / 2 - STEPS_TUCK_M, scaleY }, leftOver_m: rest };
}

/** The plan for a whole model by its key: no change for a key with no entry. */
export function houseSill(key: CalibrationKey, table: SillTable = DOOR_SILLS): SillPlan {
  const row = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
  return row ? planHouse(row.sill_m, row.window_m, row.door_x_m, row.step_m ?? null) : NO_CHANGE;
}

/**
 * The plan for a stack: it sinks as one by the largest sill of its ground pieces (the pieces of role "base" that the table has), never takes steps (a terrace's front is the walk, and steps
 * would stand in the walkers' way), and is left alone when that sill is within `SILL_MAX_M`. A stack with no measured ground piece is not changed.
 */
export function stackSill(stack: Pick<Stack, "pieces">, table: SillTable = DOOR_SILLS): SillPlan {
  let sill = -1;
  for (const p of stack.pieces) {
    if (p.role !== "base") continue;
    const row = Object.prototype.hasOwnProperty.call(table, p.key) ? table[p.key] : undefined;
    if (row && row.sill_m > sill) sill = row.sill_m;
  }
  if (sill < 0) return NO_CHANGE;
  return sill > SILL_MAX_M ? { sink_m: sill, steps: null, leftOver_m: 0 } : { sink_m: 0, steps: null, leftOver_m: sill };
}

/** True when a plan leaves a door out of reach: a rise over `SILL_MAX_M` that no steps make up to within `STEPS_FIT_M`. The builder lists these keys from the real table for Josh. */
export function leavesGap(plan: SillPlan): boolean {
  if (plan.leftOver_m <= SILL_MAX_M + 1e-9) return false;
  if (!plan.steps) return true;
  return plan.leftOver_m - STEPS_RISE_M * plan.steps.scaleY > STEPS_FIT_M + 1e-9;
}

// ---- a stack's ground pieces: the lift (ticket 062 B) ----

/** A sill band's width (ticket 062 B): the ground pieces of a stack may be chosen from one band, so that the block's sink and its pieces' own sills differ by no more than a band. */
export const SILL_BAND_M = 0.16;
/** After sink and lift, a door's sill is at most this far under the walk (a sunk threshold; ticket 062 B). */
export const SILL_UNDER_M = 0.05;
/** A lifted ground piece's top stays at least this far under the first floor's measured window sill (ticket 062 B, over 058's `WINDOW_SILL_M`). */
export const LIFT_CLEAR_M = 0.05;

/** What `stackLift` says about a stack. `lift_m` is the lift of each ground piece by column (a piece two bays wide is in both), metres; `problems` is empty when every door meets the walk and no lifted top reaches a window sill (ticket 062 B). */
export interface StackLift {
  sink_m: number;
  lift_m: ReadonlyMap<number, number>;
  problems: readonly string[];
}

const rowOf = (table: SillTable, key: CalibrationKey): DoorSill | undefined => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined);

/** The columns a ground piece covers: every column whose axis lies inside the piece's width (a double-bay shop covers two). */
function columnsOf(stack: Pick<Stack, "columns">, p: Pick<StackPiece, "x" | "w" | "column">): number[] {
  const out = stack.columns.map((c, i) => (Math.abs(c.x - p.x) < p.w / 2 ? i : -1)).filter((i) => i >= 0);
  return out.length > 0 ? out : [p.column];
}

/**
 * The block's sink and each ground piece's lift (ticket 062 B; pure).
 * - The block sinks by `stackSill`'s sink, as it always did.
 * - Each ground piece with a measured sill is then lifted by (block sink - its own sill), so its door's sill meets the walk: its bottom stays at - its sill, under the walk, and its top rises into the first floor's lower band.
 * - A lift is held back where the piece's top (its height over the first floor's base, plus the lift) would come within `LIFT_CLEAR_M` of the first floor's window sill (`windowSills`, 058's `WINDOW_SILL_M`); the door then
 *   stands under the walk by what is left over, which is a problem when that is more than `SILL_UNDER_M`.
 * - A piece with no measured sill (the City Pack's `Shop_06`, which has no door) is not lifted.
 * `problems` names every door that is out of the +`SILL_MAX_M` and -`SILL_UNDER_M` range and every top that is too high; empty means the stack is fine as it is.
 */
export function stackLift(stack: Pick<Stack, "pieces" | "columns">, table: SillTable = DOOR_SILLS, windowSills: EscapeTables["sills"] = ESCAPE_TABLES.sills): StackLift {
  const sink = stackSill(stack, table).sink_m;
  const lift = new Map<number, number>();
  const problems: string[] = [];
  const floors = stack.pieces.filter((p) => p.role === "floor");
  const pitch = floors.length > 0 ? Math.min(...floors.map((p) => p.y)) : null;
  for (const p of stack.pieces) {
    if (p.role !== "base") continue;
    const row = rowOf(table, p.key);
    if (!row) continue;
    const cols = columnsOf(stack, p);
    const want = sink > 0 ? Math.max(0, sink - row.sill_m) : 0;
    let got = want;
    if (want > 0 && pitch !== null) {
      // The first floor's window sill above this piece: the lowest over the columns it covers.
      const ws = Math.min(
        ...cols.map((c) => {
          const above = floors.filter((f) => f.column === c).sort((a, b) => a.y - b.y)[0];
          return above ? sillOf(above.key, 0, windowSills) : Infinity;
        }),
      );
      const reach = p.y + p.h - pitch;
      got = Math.min(want, Math.max(0, ws - LIFT_CLEAR_M - reach));
      if (Number.isFinite(ws) && reach + got > ws - LIFT_CLEAR_M + 1e-9) problems.push(`${p.key} (column ${p.column}): its top is ${(reach + got).toFixed(3)} m over the first floor, the window sill is ${ws.toFixed(3)} m`);
    }
    const door = row.sill_m - sink + got;
    if (door < -SILL_UNDER_M - 1e-9 || door > SILL_MAX_M + 1e-9) problems.push(`${p.key} (column ${p.column}): its door ends ${door.toFixed(3)} m from the walk`);
    for (const c of cols) lift.set(c, got);
  }
  return { sink_m: sink, lift_m: lift, problems };
}

/**
 * The sill bands of a set of ground keys (ticket 062 B): the low band holds the keys whose sill is at most `SILL_BAND_M` and the high band the rest. A key with no measured sill (it has no door to
 * meet the walk) is in both. A band with no measured key is left out. With today's pieces the low band is `Shop_01` to `_04`, `Door_01` and `Corner_01` and the high band `Shop_05`, `Door_02` and `Corner_02`
 * (and `Shop_06` in both).
 */
export function sillBands(keys: readonly CalibrationKey[], table: SillTable = DOOR_SILLS): ReadonlySet<CalibrationKey>[] {
  const none = keys.filter((k) => !rowOf(table, k));
  const low = keys.filter((k) => rowOf(table, k) !== undefined && rowOf(table, k)!.sill_m <= SILL_BAND_M);
  const high = keys.filter((k) => rowOf(table, k) !== undefined && rowOf(table, k)!.sill_m > SILL_BAND_M);
  return [low, high].filter((b) => b.length > 0).map((b) => new Set<CalibrationKey>([...b, ...none]));
}

/**
 * A stack as it should stand (ticket 062 B): itself when `stackLift` has no problem with it, else assembled again within one sill band. `again` is given a band's keys and returns the stack assembled
 * with the same lot, floors and columns but its ground pieces picked from that band (`assembleStack`'s `sillBand`), or null. The band tried first is by `stableHash(salt)`, then the other; the first
 * that `stackLift` has no problem with wins. When none does, the stack is returned as it was (the problems stay for the test or the reviewer to name).
 */
export function fitSillBand(stack: Stack, table: SillTable, groundKeys: readonly CalibrationKey[], salt: string, again: (band: ReadonlySet<CalibrationKey>) => Stack | null, windowSills: EscapeTables["sills"] = ESCAPE_TABLES.sills): Stack {
  if (stackLift(stack, table, windowSills).problems.length === 0) return stack;
  const bands = sillBands([...new Set(groundKeys)], table);
  const order = bands.length < 2 || stableHash(salt) % 2 === 0 ? bands : [bands[1]!, bands[0]!];
  for (const band of order) {
    const again1 = again(band);
    if (again1 && stackLift(again1, table, windowSills).problems.length === 0) return again1;
  }
  return stack;
}

// ---- the front frame ----

/** The point of the model's own frame (x, z; metres) that is `u` along the front and `d` out from the centre of the model, along the front's axis. */
export function modelPoint(front: ModelFront, u_m: number, d_m: number): { x: number; z: number } {
  const [ax, az] = frontAxis(front);
  // `u` runs to the right as seen from outside: that is the axis turned a quarter, (az, -ax) in (x, z).
  return { x: ax * d_m + az * u_m, z: az * d_m - ax * u_m };
}

/** The turn about y that stands the steps' model (which descends toward its own +z) with its outward side along the model's front axis. */
export function stepsYaw(front: ModelFront): number {
  return -frontYaw(front);
}

// ---- measuring ----

/** A mesh as flat arrays: three numbers a vertex, three vertex indices a triangle. `glass` is the index list of the triangles of a glass material, when the model has one. */
export interface SillMesh {
  pos: ArrayLike<number>;
  idx: ArrayLike<number>;
  glass?: ArrayLike<number>;
}

interface Level {
  y: number;
  u0: number;
  u1: number;
  area: number;
  /** Nearest approach to the front face (the least `v`). */
  v0: number;
}

/** (u, d) of a vertex in the front frame: along the front to the right as seen from outside, and out through the front face. */
function frontCoords(front: ModelFront, x: number, z: number): [number, number] {
  switch (front) {
    case "+z":
      return [x, z];
    case "-z":
      return [-x, -z];
    case "+x":
      return [-z, x];
    case "-x":
      return [z, -x];
  }
}

/**
 * Read a ground-floor model's door from its mesh (the method of 16.10):
 * - the front face is the model's furthest vertex along the front's axis; `v` is the depth behind it;
 * - a door floor is a level, horizontal, upward-facing surface up to `SILL_CEIL_M` high and starting within `SILL_DEPTH_M` behind the front face; surfaces within `SILL_LEVEL_GAP_M` in height
 *   are one level, and those on a level within `SILL_JOIN_GAP_M` of each other along the front are one cluster; a cluster under `DOOR_MIN_AREA_M2` is a fitting and is dropped;
 * - the door is at the front's centre when a floor cluster covers it, else at the centre of the nearest floor cluster (a house's threshold slab, an office's lobby);
 * - the sill is the highest floor cluster within `SILL_DOOR_HALF_M` of the door's centre; `window_m` is the lowest vertex of the glass triangles that lie within `SILL_DEPTH_M` of the front face.
 * Returns null when the model has no door floor (the geometry cannot settle it). Values are rounded to a millimetre.
 */
export function measureDoor(mesh: SillMesh, front: ModelFront, depth_m: number = SILL_DEPTH_M): DoorSill | null {
  const n = Math.floor(mesh.idx.length / 3);
  if (n === 0) return null;
  let dMax = -Infinity;
  let uMin = Infinity;
  let uMax = -Infinity;
  for (let i = 0; i < mesh.pos.length; i += 3) {
    const [u, d] = frontCoords(front, mesh.pos[i]!, mesh.pos[i + 2]!);
    if (d > dMax) dMax = d;
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
  }
  const tri = (t: ArrayLike<number>, i: number): { u: number[]; v: number[]; y: number[]; ny: number; nd: number; area: number } => {
    const u: number[] = [];
    const v: number[] = [];
    const y: number[] = [];
    const p: number[][] = [];
    for (let k = 0; k < 3; k++) {
      const o = t[i * 3 + k]! * 3;
      const x = mesh.pos[o]!;
      const z = mesh.pos[o + 2]!;
      const c = frontCoords(front, x, z);
      u.push(c[0]);
      v.push(dMax - c[1]);
      y.push(mesh.pos[o + 1]!);
      p.push([x, mesh.pos[o + 1]!, z]);
    }
    const ab = [p[1]![0]! - p[0]![0]!, p[1]![1]! - p[0]![1]!, p[1]![2]! - p[0]![2]!];
    const ac = [p[2]![0]! - p[0]![0]!, p[2]![1]! - p[0]![1]!, p[2]![2]! - p[0]![2]!];
    const nx = ab[1]! * ac[2]! - ab[2]! * ac[1]!;
    const ny = ab[2]! * ac[0]! - ab[0]! * ac[2]!;
    const nz = ab[0]! * ac[1]! - ab[1]! * ac[0]!;
    const len = Math.hypot(nx, ny, nz);
    return { u, v, y, ny: len > 0 ? ny / len : 0, nd: len > 0 ? frontCoords(front, nx, nz)[1] / len : 0, area: len / 2 };
  };
  // The upward-facing horizontal triangles that could be a door floor.
  const floors: { y: number; u0: number; u1: number; area: number; v0: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = tri(mesh.idx, i);
    if (t.ny < 0.9 || t.area <= 0) continue;
    const y = (t.y[0]! + t.y[1]! + t.y[2]!) / 3;
    if (Math.max(...t.y) - Math.min(...t.y) > SILL_LEVEL_GAP_M || y < 0 || y > SILL_CEIL_M) continue;
    if (Math.min(...t.v) > depth_m) continue;
    floors.push({ y, u0: Math.min(...t.u), u1: Math.max(...t.u), area: t.area, v0: Math.min(...t.v) });
  }
  // Levels, then clusters along the front on each level.
  floors.sort((a, b) => a.y - b.y);
  const clusters: Level[] = [];
  let group: typeof floors = [];
  const flush = (): void => {
    group.sort((a, b) => a.u0 - b.u0);
    let cur: (Level & { w: number }) | null = null;
    const close = (): void => {
      if (cur) clusters.push({ y: cur.y / cur.w, u0: cur.u0, u1: cur.u1, area: cur.area, v0: cur.v0 });
      cur = null;
    };
    for (const f of group) {
      if (cur && f.u0 <= cur.u1 + SILL_JOIN_GAP_M) {
        cur.u1 = Math.max(cur.u1, f.u1);
        cur.area += f.area;
        cur.v0 = Math.min(cur.v0, f.v0);
        cur.y += f.y * f.area;
        cur.w += f.area;
      } else {
        close();
        cur = { y: f.y * f.area, u0: f.u0, u1: f.u1, area: f.area, v0: f.v0, w: f.area };
      }
    }
    close();
    group = [];
  };
  for (const f of floors) {
    if (group.length > 0 && f.y - group[group.length - 1]!.y > SILL_LEVEL_GAP_M) flush();
    group.push(f);
  }
  flush();
  const real = clusters.filter((c) => c.area >= DOOR_MIN_AREA_M2);
  if (real.length === 0) return null;
  const centre = (uMin + uMax) / 2;
  const gap = (c: Level): number => (centre < c.u0 ? c.u0 - centre : centre > c.u1 ? centre - c.u1 : 0);
  let door = centre;
  if (!real.some((c) => gap(c) === 0)) {
    const near = [...real].sort((a, b) => gap(a) - gap(b) || b.y - a.y)[0]!;
    door = (near.u0 + near.u1) / 2;
  }
  const inDoor = real.filter((c) => c.u1 >= door - SILL_DOOR_HALF_M && c.u0 <= door + SILL_DOOR_HALF_M);
  if (inDoor.length === 0) return null;
  const sill = Math.max(...inDoor.map((c) => c.y));
  // The lowest front step: the lowest upward-facing level of `STEP_MIN_M` or more, at least `STEP_BELOW_FLOOR_M` under the door floor, standing across the door and no further back than the floor starts.
  const doorV0 = Math.min(...inDoor.filter((c) => c.y >= sill - SILL_LEVEL_GAP_M).map((c) => c.v0));
  let step: number | null = null;
  for (const c of real) {
    if (c.y < STEP_MIN_M || c.y > sill - STEP_BELOW_FLOOR_M) continue;
    if (c.v0 > doorV0 + SILL_LEVEL_GAP_M) continue;
    if (step === null || c.y < step) step = c.y;
  }
  let window: number | null = null;
  const glass = mesh.glass ?? [];
  for (let i = 0; i < Math.floor(glass.length / 3); i++) {
    const t = tri(glass, i);
    if (Math.max(...t.v) > depth_m) continue;
    const low = Math.min(...t.y);
    if (window === null || low < window) window = low;
  }
  // No glass material (SIMPLE Town, the City Pack): the lowest front-facing face that is recessed from the front plane and stands above the door floor is a window's reveal.
  if (window === null && glass.length === 0) {
    const faces: { v: number; y0: number; y1: number; u0: number; u1: number; area: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = tri(mesh.idx, i);
      if (t.nd < 0.9 || t.area <= 0) continue;
      const v = (t.v[0]! + t.v[1]! + t.v[2]!) / 3;
      if (Math.max(...t.v) - Math.min(...t.v) > RECESS_FLAT_M || v < RECESS_MIN_M || v > WINDOW_DEPTH_M) continue;
      faces.push({ v, y0: Math.min(...t.y), y1: Math.max(...t.y), u0: Math.min(...t.u), u1: Math.max(...t.u), area: t.area });
    }
    // Faces on one plane (within `RECESS_FLAT_M`) that touch (within `RECESS_JOIN_M`) are one surface.
    const root = faces.map((_, i) => i);
    const find = (i: number): number => {
      while (root[i] !== i) {
        root[i] = root[root[i]!]!;
        i = root[i]!;
      }
      return i;
    };
    faces.sort((a, b) => a.v - b.v);
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length && faces[j]!.v - faces[i]!.v <= RECESS_FLAT_M; j++) {
        const a = faces[i]!;
        const b = faces[j]!;
        if (a.u0 <= b.u1 + RECESS_JOIN_M && b.u0 <= a.u1 + RECESS_JOIN_M && a.y0 <= b.y1 + RECESS_JOIN_M && b.y0 <= a.y1 + RECESS_JOIN_M) root[find(i)] = find(j);
      }
    }
    const surf = new Map<number, { y0: number; u0: number; u1: number; area: number }>();
    faces.forEach((f, i) => {
      const r = find(i);
      const c = surf.get(r);
      if (!c) surf.set(r, { y0: f.y0, u0: f.u0, u1: f.u1, area: f.area });
      else {
        c.y0 = Math.min(c.y0, f.y0);
        c.u0 = Math.min(c.u0, f.u0);
        c.u1 = Math.max(c.u1, f.u1);
        c.area += f.area;
      }
    });
    for (const c of surf.values()) {
      // A surface wholly within the door's leaf is the door, not a window (062 A).
      if (c.u0 >= door - RECESS_DOOR_HALF_M && c.u1 <= door + RECESS_DOOR_HALF_M) continue;
      if (c.area >= RECESS_AREA_M2 && c.y0 >= sill + RECESS_ABOVE_FLOOR_M && (window === null || c.y0 < window)) window = c.y0;
    }
  }
  const mm = (v: number): number => Math.round(v * 1000) / 1000 + 0;
  const out: DoorSill = { sill_m: mm(sill), window_m: window === null ? null : mm(window), door_x_m: mm(door) };
  if (step !== null) out.step_m = mm(step);
  return out;
}
