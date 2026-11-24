/**
 * Every model the game loads, as one list (ticket 082 A). `npm run assets:game` (B) cuts the game pack from it; the loader uses the game pack only when it holds every key a call asks for.
 * The page's keys come from `pageLoadLists`, so a key the page asks for cannot be left out; the circuit's are also named on their own so the list is right before and after K3.
 */

import type { CalibrationKey } from "../core";
import { GROUND_POLE_MIX } from "../core";
import { COLOURWAY_POOL, STOP_SIGN_COLOURWAY } from "./colourway";
import { COMPONENT_MODELS } from "./componentmodels";
import { STREET_LIGHT_KEY } from "./circuitdraw";
import { listedKeys, pageLoadLists } from "./pageloads";
import { planKeys } from "./plan3d";
import { POWER_LINE } from "./powerkit";
import { tileKeys } from "./tileslots";

/** The schematic 3D page's call (`sharedModels`). */
export function schematicLoadLists(): ReturnType<typeof pageLoadLists> {
  return pageLoadLists({});
}

/** The city view's call (`sharedTileModels(planKeys(), [STOP_SIGN_COLOURWAY])`). */
export function cityLoadLists(): ReturnType<typeof pageLoadLists> {
  return pageLoadLists({ table: [], tileKeys: planKeys(), signColourways: [STOP_SIGN_COLOURWAY] });
}

/** Sorted, unique `pack:name` of every model the game loads. */
export function gameModelKeys(): CalibrationKey[] {
  const circuit = [...GROUND_POLE_MIX, POWER_LINE, ...Object.values(COMPONENT_MODELS).flatMap((c) => (c.key === null || c.removed ? [] : [c.key])), STREET_LIGHT_KEY] as CalibrationKey[];
  return [...new Set([...listedKeys(schematicLoadLists()), ...listedKeys(cityLoadLists()), ...tileKeys(), ...circuit])].sort();
}

/** The colourway ids the page's calls fetch: the City Pack pool (never the base) and the stop sign's. Sorted, unique. */
export function gameColourways(): string[] {
  return [...new Set([...COLOURWAY_POOL.filter((id) => id !== "base"), STOP_SIGN_COLOURWAY])].sort();
}
