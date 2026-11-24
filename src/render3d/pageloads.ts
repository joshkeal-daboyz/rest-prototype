/**
 * What the page asks the model loader for, in one place (ticket 082 A). Pure: it imports neither `models3d.ts` nor `plan3d.ts`, so the game-pack list (`gamemodels.ts`) and the loader read
 * the same lists and a key the page asks for cannot be left out of the game pack.
 */

import { calibrationKey, type CalibrationKey } from "../core";
import { TECH_BOUNDS } from "../city/tech/kit";
import { KIT_KEYS as HOLDOUT_KIT_KEYS } from "../city/holdout/kit";
import { KIT_KEYS as RUIN_KIT_KEYS } from "../city/ruin/kit";
import { dressKeys } from "./dressing";
import { furnitureKeys } from "./furniture";
import { MODEL_TABLE, type ModelChoice } from "./models";
import { STEPS_KEY } from "./sills";
import { STACK_STYLES, stackKeys } from "./stacks";

/** The key lists `loadModels` is called with by the page (a subset of `LoadDeps`). */
export interface PageLoadLists {
  table?: readonly ModelChoice[];
  stackKeys?: readonly CalibrationKey[];
  dressKeys?: readonly CalibrationKey[];
  tileKeys?: readonly CalibrationKey[];
  stepKeys?: readonly CalibrationKey[];
  signColourways?: readonly string[];
}

/** The tech pass Sci-Fi City pieces (ticket 073 D1g): loaded as dressing by the plan view only (it asks for tile keys and sign colourways), drawn only at an era above clean. */
export const TECH_KEYS = Object.keys(TECH_BOUNDS) as CalibrationKey[];

/** The hold-out pass Sci-Fi Frontier pieces (ticket 073 E2g): loaded as dressing by the plan view only, as `TECH_KEYS`, drawn only at the hold-out and ruin eras. */
export const HOLDOUT_KEYS = [...HOLDOUT_KIT_KEYS] as CalibrationKey[];

/** The ruin pass Apocalypse, Nature and Palm City pieces (ticket 073 F1g): loaded as dressing by the plan view only, drawn only at the ruin era. */
export const RUIN_KEYS = [...RUIN_KIT_KEYS] as CalibrationKey[];

/** Every piece key any stack recipe names, once each: what the town asks the loader for (ticket 050 C). */
export function allStackPieceKeys(): CalibrationKey[] {
  return [...new Set(STACK_STYLES.flatMap((s) => stackKeys(s)))];
}

/**
 * The lists the page calls `loadModels` with. `extra` is the caller's own (`table`, `tileKeys`, `signColourways`); a plan view (it has `signColourways`) also asks for the era kits as dressing, and a page that
 * asks for tiles has no door steps. `extra` is laid over the defaults, as it always was.
 */
export function pageLoadLists(extra: Pick<PageLoadLists, "table" | "tileKeys" | "signColourways">): PageLoadLists {
  return {
    stackKeys: allStackPieceKeys(),
    dressKeys: [...dressKeys(), ...furnitureKeys(), ...(extra.signColourways ? [...TECH_KEYS, ...HOLDOUT_KEYS, ...RUIN_KEYS] : [])],
    stepKeys: extra.tileKeys ? [] : [STEPS_KEY],
    ...extra,
  };
}

/** Every `pack:name` a set of lists asks for, once each (the table's names included). */
export function listedKeys(lists: PageLoadLists): CalibrationKey[] {
  const table = lists.table ?? MODEL_TABLE;
  return [...new Set([...table.flatMap((c) => c.names.map((n) => calibrationKey(c.pack, n))), ...(lists.stackKeys ?? []), ...(lists.dressKeys ?? []), ...(lists.tileKeys ?? []), ...(lists.stepKeys ?? [])])];
}
