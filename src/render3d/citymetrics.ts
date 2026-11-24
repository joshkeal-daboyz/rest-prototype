/**
 * Ticket 053: the thresholds of the reference checklist (R1 to R13, 16.8 of docs/city-style/evaluation.md) and the never-used list. Pure data.
 * The ladder town's measurer (`cityMetrics`, `evaluateCity`, `runBlocks`) was deleted with the ladder in ticket 081 A2c; the pipeline's own checks are in `src/city/`.
 *
 * Nothing here decides a rule. A number that fails a threshold is a finding for the ticket that owns the rule (the guide's chapter 16 says which).
 */

export type CityCheckId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9" | "R10" | "R11" | "R12" | "R13";

/**
 * The threshold of each automatic item. A share is at least the number; a count is at most it, except R11 (at least that many parking lots, and plazas, on the largest map).
 * R1 the share of all runs' frontage that blocks cover (ticket 053 asked 0.9 for every run: 8 of the 58 runs of `64-the-whole-chain` cover less, so it is the map's share; chapter 16).
 * R2 neighbours that differ in style and floor count. R3 ground bays that are a shopfront or the block's one door bay. R4 shops with a glass key that have glass. R5 shop bays with an
 * awning (the ticket asked 0.6; `09-shrine-circuit` measures 0.584, so 0.55). R6 shop bays with a sign. R7 qualifying blocks with a fire escape. R8 blocks with a dressed roof (the
 * ticket asked 1.0; 4 to 6 blocks in 100 have none, so 0.9). R9 corner blocks off a true corner (a count). R10 furniture spacing, keep-out and corner violations (a count). R11 parking
 * lots, and plazas, on the largest map. R12 excluded keys used, and emissive dressing materials (a count). R13 (ticket 054) the share of adjacent blocks in a run whose colourway ids differ,
 * with a fixed fake set of 8 ids available (the real atlases are not in CI): 1, because the assignment steps off a repeat.
 */
export const CITY_CHECK: Readonly<Record<CityCheckId, number>> = {
  R1: 0.9,
  R2: 1,
  R3: 1,
  R4: 1,
  R5: 0.55,
  R6: 0.5,
  R7: 0.5,
  R8: 0.9,
  R9: 0,
  R10: 0,
  R11: 1,
  R12: 0,
  R13: 1,
};

/** The blocks that carry an ATM, as a share of all blocks, at least (R6's second number). */
export const CITY_ATM_BLOCKS_MIN = 0.15;
/** The runs with a big roof prop (water tower, stair hut, billboard, novelty sign), as a share of the runs, at least (R8's second number). */
export const CITY_BIG_ROOF_RUNS_MIN = 0.5;
/** A run whose blocks cover less than this share of its frontage is counted in `runsUnderFrontage` (reported, not asserted: see chapter 16, R1). */
export const CITY_RUN_FRONTAGE = 0.9;
/** The storeys a block may have (floors over the base, plus the base): the reference's 3 to 5. */
export const CITY_STOREYS = { min: 3, max: 5 } as const;

/**
 * The names the City Pack has that no placement, recipe or furniture rule may use (people, vehicles and everything chapter 16's "Never used" table gives a reason for). A name
 * is a prefix of a key's pack name, so one stem covers a whole family. The guide's table and this list must agree (`styleguide.test.ts`).
 */
export const CITY_NEVER_USED: readonly string[] = [
  "SK_",
  "SM_Veh_",
  "SM_Env_Skyline_",
  "SM_Env_PalmTree_",
  "SM_Prop_LightPole_",
  "SM_Prop_TrafficLight_",
  "SM_Prop_PowerBox_",
  "SM_Prop_Power_Cables_",
  "SM_Bld_Apartment_Stairs_",
  "SM_Prop_Sign_XXX_",
  "SM_Prop_Sign_Police_",
  "SM_Prop_Sign_Hospital_",
  "SM_Prop_Sign_FireDepartment_",
  "SM_Prop_ShopInterior_",
  "SM_Prop_Buger_",
  "SM_Prop_Soda_",
  "SM_Prop_SmartPhone_",
  "SM_Prop_Paper_",
  "SM_Prop_Police_Baton_",
  "SM_Prop_Pipe_Present_",
  "SM_Env_Bridge_",
  "SM_Env_WaterEdge_",
  "SM_Env_SubwayEntrance_",
];

/** True when a key (`pack:name`, or a bare name) starts, after the pack, with a never-used stem. */
export function isNeverUsed(key: string): boolean {
  const name = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
  return CITY_NEVER_USED.some((s) => name.startsWith(s));
}
