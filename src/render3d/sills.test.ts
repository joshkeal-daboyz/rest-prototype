/**
 * Ticket 055 section F: door sills, measured per building (`sills.ts`, and the sink, the dressing's offset and the steps in `models3d.ts`).
 *
 * CI-safe: every table value is typed in below (taken from the converted GLBs of 18 Nov 2026 by `measureDoor`) and every measurement has a synthetic mesh to run on. The real GLBs are read only
 * inside the one `it` that says so, which skips when `assets/private/out/` is absent; nothing is read at module or `describe` level but this repo's own puzzles and sources, and the fake
 * GLBs are groups built here. No WebGL, no timer, no path but forward slashes.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Raycaster, Vector3, type Object3D } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationKey, type Puzzle } from "../core";
import { dressKeys } from "./dressing";
import { BUILDING_FRONTS, MODEL_TABLE, WORLD_PER_METRE, frontAxis, type ModelFront } from "./models";
import { allStackKeys, applyModels, loadModels, stepsGroup, stepsPlacement, type ModelSet } from "./models3d";
import { PAVEMENT_Y, YARD, buildScene } from "./scene";
import {
  DOOR_MIN_AREA_M2,
  DOOR_SILLS,
  NO_FRONT_WINDOW,
  NO_STREET_DOOR,
  RECESS_DOOR_HALF_M,
  SILL_CEIL_M,
  SILL_DEPTH_BY_KEY,
  SILL_DEPTH_MAX_M,
  SILL_DEPTH_M,
  SILL_DOOR_HALF_M,
  SILL_MAX_M,
  SILL_WINDOW_CLEAR_M,
  STEPS_D_M,
  STEPS_FIT_M,
  STEPS_KEY,
  STEPS_RISE_M,
  STEPS_SCALE_Y,
  STEPS_TUCK_M,
  STEPS_W_M,
  STEP_MIN_M,
  WINDOW_DEPTH_M,
  houseSill,
  leavesGap,
  measureDoor,
  modelPoint,
  planHouse,
  sillDepth,
  stackSill,
  stepsYaw,
  type DoorSill,
  type SillMesh,
  type SillTable,
} from "./sills";
import { STACK_STYLES, type Stack } from "./stacks";
import { tileCity } from "./tilecity";
import { buildCityScene, cityApplyOptions } from "./tilecity3d";
import { stubTextSurface } from "./text";

const CITY_PACK_GLB = join("assets", "private", "out", "city-pack.glb");
const TOWN_PACK_GLB = join("assets", "private", "out", "town-pack.glb");
const SIMPLE_TOWN_GLB = join("assets", "private", "out", "simple-town.glb");
const W = WORLD_PER_METRE;

// ---- the measured table, typed in: [key, sill, lowest window, door's centre along the front, lowest front step when there is one] ----

const PINNED: readonly (readonly [CalibrationKey, number, number | null, number, number?])[] = [
  ["city-pack:SM_Bld_Shop_01", 0.106, null, 0],
  ["city-pack:SM_Bld_Shop_02", 0.071, null, 0],
  ["city-pack:SM_Bld_Shop_03", 0.043, null, 0],
  ["city-pack:SM_Bld_Shop_04", 0.077, null, 0],
  ["city-pack:SM_Bld_Shop_05", 0.361, null, 0],
  ["city-pack:SM_Bld_Apartment_Door_01", 0.029, null, 0],
  ["city-pack:SM_Bld_Apartment_Door_02", 0.206, null, 0],
  ["city-pack:SM_Bld_Shop_Corner_01", 0.159, null, 0],
  ["city-pack:SM_Bld_Shop_Corner_02", 0.376, null, 0],
  ["city-pack:SM_Bld_OfficeOld_Small_Base_01", 0.915, null, 2.5],
  ["city-pack:SM_Bld_OfficeOld_Large_Base_01", 0.915, null, 0],
  ["city-pack:SM_Bld_OfficeOctagon_Base_01", 0.085, null, 0],
  ["town-pack:SM_Bld_House_Preset_01", 1.151, 1.851, 0],
  ["town-pack:SM_Bld_House_Preset_02", 1.052, 1.752, 1.271],
  ["town-pack:SM_Bld_House_Preset_03", 1.151, 1.851, -2.479],
  ["town-pack:SM_Bld_House_Preset_04", 1.151, 1.851, -2.5],
  ["town-pack:SM_Bld_House_Preset_05", 1.166, 1.866, -2.479],
  ["town-pack:SM_Bld_House_Preset_06", 1.052, 1.752, 0],
  ["town-pack:SM_Bld_House_Preset_07", 1.052, 1.752, 2.521],
  ["town-pack:SM_Bld_House_Preset_08", 1.102, 1.802, -4.979],
  ["town-pack:SM_Bld_House_Preset_09", 1.052, 1.752, -1.229],
  ["town-pack:SM_Bld_House_Preset_10", 1.052, 1.752, -2.666],
  ["town-pack:SM_Bld_House_Preset_11", 1.052, 1.752, 0],
  ["town-pack:SM_Bld_House_Preset_Garage_01", 1.052, null, 0],
  ["simple-town:Building_Shop_01", 0.337, 6.352, 0],
  ["simple-town:Building_Shop_02", 0.337, 6.352, 0],
  ["simple-town:Building_Shop_03", 0.199, 5.515, 0],
  ["simple-town:Building_Shop_04", 0.199, 5.515, 0],
  ["simple-town:Building_Shop_05", 0.199, 5.515, 0],
  ["simple-town:Building_BaberShop", 0.333, 1.299, 2.461],
  ["simple-town:Building_Gym", 0.337, 6.352, 0],
  ["simple-town:store_small_mesh", 0.212, null, 0],
  ["simple-town:store_corner_mesh", 0.212, 4.295, -3.799],
  ["simple-town:apartment_small_mesh", 0.212, 2.137, 0],
  ["simple-town:Building_House_01", 1.035, 1.721, 0, 0.601],
  ["simple-town:Building_House_02", 1.035, 1.721, 0, 0.601],
  ["simple-town:Building_House_03", 1.035, 1.721, 0, 0.601],
  ["simple-town:Building_House_04", 1.035, 1.721, 0, 0.601],
  ["simple-town:Building_House_09", 0.639, 2.832, 0, 0.213],
  ["simple-town:Building_House_010", 0.639, 2.832, 0, 0.213],
  ["simple-town:Building_House_011", 0.639, 2.832, 0, 0.213],
  ["simple-town:Building_House_012", 1.053, 1.33, 0, 0.682],
  ["simple-town:Building_House_013", 1.053, 1.33, 0, 0.682],
  ["simple-town:Building_House_014", 1.053, 1.33, 0, 0.682],
  ["simple-town:Building_House_015", 1.053, 1.33, 0, 0.682],
  ["simple-town:office_small_mesh", 0.505, 1.959, -2.991, 0.245],
  ["simple-town:Building_House_05", 0.33, 1.201, 0],
  ["simple-town:Building_House_06", 0.33, 1.201, 0],
  ["simple-town:Building_House_07", 0.33, 1.201, 0],
  ["simple-town:Building_House_08", 0.33, 1.201, 0],
  ["simple-town:Building_AutoRepair", 0.138, 1.182, -5.965],
  ["simple-town:Building_StripClub", 0.138, 0.765, 0],
  ["simple-town:Building_PoliceStation", 0.402, 0.529, 0],
  ["simple-town:Building_CoffeeShop", 0.333, 5.954, 0],
  ["simple-town:apartment_large_mesh", 0.212, 2.137, 0],
  ["simple-town:office_medium_mesh", 0.505, 1.959, -2.991, 0.245],
  ["simple-town:office_large_mesh", 0.505, 1.959, -2.991, 0.245],
];

/**
 * The 22 keys the table of `1a356b9` (ticket 055 F) had no entry for: the geometry could not settle them within `SILL_DEPTH_M` and they were drawn unchanged. Ticket 062 A settles each (a per-key depth, a typed
 * value, or `NO_STREET_DOOR`); the list stays here so the failing fixture can put the old table back.
 */
const UNSETTLED_1A356B9: readonly CalibrationKey[] = [
  "city-pack:SM_Bld_Shop_06",
  "town-pack:SM_Bld_House_Preset_04",
  "town-pack:SM_Bld_House_Preset_10",
  "town-pack:SM_Bld_House_Preset_11",
  "town-pack:SM_Bld_House_Preset_Garage_01",
  "simple-town:Building_Shop_03",
  "simple-town:Building_Shop_04",
  "simple-town:Building_Shop_05",
  "simple-town:Building_BaberShop",
  "simple-town:Building_Gym",
  "simple-town:store_small_mesh",
  "simple-town:store_corner_mesh",
  "simple-town:Building_Garage_01",
  "simple-town:Building_Garage_02",
  "simple-town:Building_Garage_03",
  "simple-town:house_mesh",
  "simple-town:Building_House_05",
  "simple-town:Building_House_06",
  "simple-town:Building_House_07",
  "simple-town:Building_House_08",
  "simple-town:Building_PetrolStation",
  "simple-town:Building_CoffeeShop",
];

/** Every key the town can place on the ground: the base, door and corner pieces of every stack style, and every whole building of the model table. */
function groundKeys(): CalibrationKey[] {
  const out = new Set<CalibrationKey>();
  for (const s of STACK_STYLES) for (const k of [...s.base.mid, ...(s.base.door ?? []), ...s.base.corner]) out.add(k);
  for (const row of MODEL_TABLE) if (row.slot === "building") for (const name of row.names) out.add(`${row.pack}:${name}`);
  return [...out];
}

/** The problems with a table of door sills against the keys the town places: a key with neither an entry nor a reason, or with both, or with a reason that is empty. Empty means the table is accounted for. */
function accountingProblems(keys: readonly CalibrationKey[], table: SillTable, noStreet: Readonly<Partial<Record<CalibrationKey, string>>>): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const has = Object.prototype.hasOwnProperty.call(table, key);
    const why = Object.prototype.hasOwnProperty.call(noStreet, key);
    if (!has && !why) out.push(`${key}: neither an entry nor a reason`);
    else if (has && why) out.push(`${key}: an entry and a reason it has none`);
    else if (why && (noStreet[key] ?? "").trim() === "") out.push(`${key}: an empty reason`);
  }
  for (const key of [...Object.keys(table), ...Object.keys(noStreet)]) if (!keys.includes(key as CalibrationKey)) out.push(`${key}: not a key the town places`);
  return out;
}

/** The measure's search depth for a key, as `SILL_DEPTH_BY_KEY` gives it. */
const depthOf = (key: CalibrationKey): number => sillDepth(key);

describe("the measured table (criterion 33; ticket 062 A criteria 1 to 3)", () => {
  it("pins every entry's values, and changing one fails", () => {
    const typed: Record<string, { sill_m: number; window_m: number | null; door_x_m: number; step_m?: number }> = {};
    for (const [key, sill, window, door, step] of PINNED) typed[key] = { sill_m: sill, window_m: window, door_x_m: door, ...(step !== undefined ? { step_m: step } : {}) };
    // The two typed-in entries carry a `why` the pin does not repeat (below); everything else is the pin.
    const withoutWhy = Object.fromEntries(Object.entries(DOOR_SILLS).map(([k, v]) => [k, Object.fromEntries(Object.entries(v!).filter(([p]) => p !== "why"))]));
    expect(withoutWhy).toEqual(typed);
    expect(Object.keys(DOOR_SILLS)).toHaveLength(PINNED.length);
    // The comparison is exact, so a changed value is a failure (checked on a copy: the table is not edited).
    const changed = { ...DOOR_SILLS, [PINNED[0]![0]]: { ...DOOR_SILLS[PINNED[0]![0]]!, sill_m: DOOR_SILLS[PINNED[0]![0]]!.sill_m + 0.001 } };
    expect(changed).not.toEqual(DOOR_SILLS);
  });

  it("accounts for every key the town can place on the ground: an entry or a NO_STREET_DOOR reason, never both and never neither (criterion 1)", () => {
    const keys = groundKeys();
    // 13 stack ground pieces (6 shops, 2 doors, 2 corners, 3 office bases) + 12 Town Pack buildings + the 38 SIMPLE Town buildings of the table.
    expect(keys.filter((k) => k.startsWith("city-pack:"))).toHaveLength(13);
    expect(keys.filter((k) => k.startsWith("town-pack:"))).toHaveLength(12);
    expect(keys.filter((k) => k.startsWith("simple-town:"))).toHaveLength(38);
    expect(accountingProblems(keys, DOOR_SILLS, NO_STREET_DOOR)).toEqual([]);
    expect(Object.keys(DOOR_SILLS).length + Object.keys(NO_STREET_DOOR).length).toBe(keys.length);
    expect(Object.keys(NO_STREET_DOOR).sort()).toEqual(
      ["city-pack:SM_Bld_Shop_06", "simple-town:Building_Garage_01", "simple-town:Building_Garage_02", "simple-town:Building_Garage_03", "simple-town:Building_PetrolStation", "simple-town:house_mesh"].sort(),
    );
  });

  it("fails when the table of 1a356b9 is put back: the 22 keys it had no entry for, with no reason, are 22 problems (criterion 4)", () => {
    const old = { ...DOOR_SILLS } as Record<string, DoorSill>;
    for (const k of UNSETTLED_1A356B9) delete old[k];
    expect(Object.keys(old)).toHaveLength(41);
    const problems = accountingProblems(groundKeys(), old, {});
    expect(problems).toHaveLength(22);
    expect(problems.every((p) => p.endsWith("neither an entry nor a reason"))).toBe(true);
    // A reason given for a key that has an entry is also a problem, and so is an empty one.
    expect(accountingProblems(groundKeys(), DOOR_SILLS, { ...NO_STREET_DOOR, "city-pack:SM_Bld_Shop_01": "x" })).toHaveLength(1);
    expect(accountingProblems(groundKeys(), DOOR_SILLS, { ...NO_STREET_DOOR, "simple-town:house_mesh": " " })).toHaveLength(1);
  });

  it("gives every SILL_DEPTH_BY_KEY entry a depth between SILL_DEPTH_M and SILL_DEPTH_MAX_M, a reason, and an entry in the table (criterion 1)", () => {
    expect(SILL_DEPTH_MAX_M).toBe(4);
    const keys = Object.keys(SILL_DEPTH_BY_KEY) as CalibrationKey[];
    expect(keys).toHaveLength(17);
    for (const key of keys) {
      const row = SILL_DEPTH_BY_KEY[key]!;
      expect(row.depth_m, key).toBeGreaterThan(SILL_DEPTH_M);
      expect(row.depth_m, key).toBeLessThanOrEqual(SILL_DEPTH_MAX_M);
      expect(row.why.trim().length, key).toBeGreaterThan(10);
      expect(Object.prototype.hasOwnProperty.call(DOOR_SILLS, key), `${key} has a depth but no entry`).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(NO_STREET_DOOR, key), key).toBe(false);
    }
    expect(depthOf("simple-town:Building_CoffeeShop")).toBe(3.6);
    expect(depthOf("city-pack:SM_Bld_Shop_01")).toBe(SILL_DEPTH_M);
    // The two keys with a typed-in sill are beyond the limit, so they have no depth.
    for (const k of ["town-pack:SM_Bld_House_Preset_04", "town-pack:SM_Bld_House_Preset_Garage_01"] as const) expect(SILL_DEPTH_BY_KEY[k], k).toBeUndefined();
  });

  it("types in Preset_04 and the Town Pack garage with their reasons, and lists every typed-in sill (criteria 1 and 2)", () => {
    const typedIn = Object.entries(DOOR_SILLS).filter(([, r]) => r!.why !== undefined);
    expect(typedIn.map(([k]) => k).sort()).toEqual(["town-pack:SM_Bld_House_Preset_04", "town-pack:SM_Bld_House_Preset_Garage_01"]);
    for (const [k, r] of typedIn) expect(r!.why!.length, k).toBeGreaterThan(20);
    // Preset_04: the 1.15 m threshold of its porch; the garage sinks like its houses, by their 1.052 m.
    expect(DOOR_SILLS["town-pack:SM_Bld_House_Preset_04"]!.sill_m).toBe(1.151);
    expect(DOOR_SILLS["town-pack:SM_Bld_House_Preset_Garage_01"]!.sill_m).toBe(DOOR_SILLS["town-pack:SM_Bld_House_Preset_09"]!.sill_m);
    // Preset_10 and _11 read 1.05 m (+-0.02 m) with a 3 m search.
    for (const k of ["town-pack:SM_Bld_House_Preset_10", "town-pack:SM_Bld_House_Preset_11"] as const) {
      expect(Math.abs(DOOR_SILLS[k]!.sill_m - 1.05), k).toBeLessThanOrEqual(0.02);
      expect(depthOf(k), k).toBe(3);
    }
  });

  it("holds sensible numbers: every sill under the ceiling, a window above its sill, a step under it, a door inside the front", () => {
    for (const [key, row] of Object.entries(DOOR_SILLS)) {
      expect(row!.sill_m, key).toBeGreaterThan(0);
      expect(row!.sill_m, key).toBeLessThanOrEqual(SILL_CEIL_M);
      if (row!.window_m !== null) expect(row!.window_m, key).toBeGreaterThan(row!.sill_m);
      if (row!.step_m !== undefined) {
        expect(row!.step_m, key).toBeGreaterThanOrEqual(STEP_MIN_M);
        expect(row!.step_m, key).toBeLessThan(row!.sill_m);
      }
    }
  });

  it("measures a window where the model has one, or says why it has none: no entry has window_m null without a reason (criterion 3)", () => {
    const nullWindow = Object.entries(DOOR_SILLS).filter(([, r]) => r!.window_m === null).map(([k]) => k);
    // Every null window is listed as having no front window, and every listed key has a null window.
    expect(nullWindow.sort()).toEqual(Object.keys(NO_FRONT_WINDOW).sort());
    for (const [k, why] of Object.entries(NO_FRONT_WINDOW)) expect(why!.length, k).toBeGreaterThan(10);
    // The SIMPLE Town models, which have no glass material, now have a window read from their recessed faces, apart from the one flat front.
    const simple = Object.entries(DOOR_SILLS).filter(([k]) => k.startsWith("simple-town:"));
    expect(simple.filter(([, r]) => r!.window_m !== null)).toHaveLength(simple.length - 1);
  });

  it("says which keys are over SILL_MAX_M, which stand steps and which leave a gap (criterion 3)", () => {
    const over = Object.entries(DOOR_SILLS).filter(([, r]) => r!.sill_m > SILL_MAX_M);
    expect(over.length).toBeGreaterThan(33);
    // Where the plan leaves a gap, a model whose steps are out of the concrete steps' range or cannot take them: none.
    const whole = Object.keys(DOOR_SILLS).filter((k) => !k.startsWith("city-pack:")) as CalibrationKey[];
    expect(whole.filter((k) => leavesGap(houseSill(k)))).toEqual([]);
    // Only a model with a window near its sill or a step in front of it takes the concrete steps.
    const stepped = whole.filter((k) => houseSill(k).steps !== null).sort();
    expect(stepped.length).toBeGreaterThan(0);
    for (const k of stepped) {
      const r = DOOR_SILLS[k]!;
      expect(r.step_m !== undefined || (r.window_m !== null && r.window_m - SILL_WINDOW_CLEAR_M < r.sill_m), `${k} takes steps for no reason`).toBe(true);
    }
  });

  it("never lets a window end less than SILL_WINDOW_CLEAR_M above the walk after the sink, and never buries a front step (criterion 3)", () => {
    for (const k of Object.keys(DOOR_SILLS) as CalibrationKey[]) {
      if (k.startsWith("city-pack:")) continue; // a stack's pieces sink as one: the lift in 062 B is judged against the first floor's window sill
      const r = DOOR_SILLS[k]!;
      const plan = houseSill(k);
      if (r.window_m !== null) expect(r.window_m - plan.sink_m >= SILL_WINDOW_CLEAR_M - 1e-9 || plan.sink_m === 0, `${k}: window ${r.window_m} sunk to ${r.window_m - plan.sink_m}`).toBe(true);
      if (r.step_m !== undefined) expect(r.step_m - plan.sink_m, `${k}: front step ${r.step_m} sunk by ${plan.sink_m}`).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it("fails a house with a 1.04 m floor, a 0.6 m front step and no window, planned by the rule of 1a356b9 (criterion 4)", () => {
    // 1a356b9: sink by the whole sill when no window is known. The 0.6 m step ends 0.44 m under the walk.
    const old = planHouse(1.04, null, 0);
    expect(old.sink_m).toBe(1.04);
    expect(0.6 - old.sink_m).toBeLessThan(-0.4);
    // The step check says so; the rule of 062 does not fail it: the sink stops at the step, and concrete steps make up the rest.
    const now = planHouse(1.04, null, 0, 0.6);
    expect(now.sink_m).toBeCloseTo(0.6, 9);
    expect(0.6 - now.sink_m).toBeGreaterThanOrEqual(-1e-9);
    expect(now.steps).not.toBeNull();
    expect(leavesGap(now)).toBe(false);
  });
});

describe("the plan: what a sill and a window make of a building (criterion 34)", () => {
  it("exports the constants of the ticket", () => {
    expect(SILL_MAX_M).toBe(0.15);
    expect(SILL_WINDOW_CLEAR_M).toBe(0.3);
    expect(STEPS_KEY).toBe("town-pack:SM_Bld_House_Concrete_Steps_01");
    expect(STEPS_RISE_M).toBe(0.5);
    expect(STEPS_SCALE_Y).toEqual({ min: 0.5, max: 1.5 });
  });

  it("leaves a sill of 0.1 alone", () => {
    expect(planHouse(0.1, null, 0)).toEqual({ sink_m: 0, steps: null, leftOver_m: 0.1 });
    expect(planHouse(SILL_MAX_M, 0.2, 0)).toEqual({ sink_m: 0, steps: null, leftOver_m: SILL_MAX_M });
  });

  it("sinks a sill of 0.6 with no window by 0.6, and takes no steps", () => {
    expect(planHouse(0.6, null, 1)).toEqual({ sink_m: 0.6, steps: null, leftOver_m: 0 });
  });

  it("sinks a sill of 0.6 under a window at 0.6 by 0.3 and stands steps scaled 0.3 / 0.5 = 0.6", () => {
    const p = planHouse(0.6, 0.6, 1.25);
    expect(p.sink_m).toBeCloseTo(0.3, 9);
    expect(p.leftOver_m).toBeCloseTo(0.3, 9);
    expect(p.steps!.scaleY).toBeCloseTo(0.6, 9);
    expect(p.steps!.x_m).toBe(1.25);
  });

  it("sinks a sill of 0.6 under a window at 0.35 by 0.05 and leaves 0.55, which the steps make up at scale 1.1 (inside their range)", () => {
    const p = planHouse(0.6, 0.35, 0);
    expect(p.sink_m).toBeCloseTo(0.05, 9);
    expect(p.leftOver_m).toBeCloseTo(0.55, 9);
    expect(p.steps!.scaleY).toBeCloseTo(1.1, 9);
    expect(p.steps!.scaleY).toBeGreaterThanOrEqual(STEPS_SCALE_Y.min);
    expect(p.steps!.scaleY).toBeLessThanOrEqual(STEPS_SCALE_Y.max);
    expect(leavesGap(p)).toBe(false);
  });

  it("stands the steps against the front face, tucked in, at the door", () => {
    const p = planHouse(0.6, 0.6, -2.479);
    expect(p.steps!.x_m).toBe(-2.479);
    expect(p.steps!.z_m).toBeCloseTo(STEPS_D_M / 2 - STEPS_TUCK_M, 9);
  });

  it("sinks a stack by the largest sill of its ground pieces, never takes steps, and leaves one within SILL_MAX_M alone", () => {
    const table: SillTable = { "city-pack:A": { sill_m: 0.2, window_m: null, door_x_m: 0 }, "city-pack:B": { sill_m: 0.45, window_m: 0.5, door_x_m: 0 }, "city-pack:C": { sill_m: 0.1, window_m: null, door_x_m: 0 }, "city-pack:Floor": { sill_m: 2, window_m: null, door_x_m: 0 } };
    const piece = (key: CalibrationKey, role: "base" | "floor" | "roof"): Stack["pieces"][number] => ({ key, x: 0, y: 0, z: 0, yaw: 0, role, column: 0, w: 5, h: 3, d: 5, street: "front" });
    expect(stackSill({ pieces: [piece("city-pack:A", "base"), piece("city-pack:B", "base")] }, table)).toEqual({ sink_m: 0.45, steps: null, leftOver_m: 0 });
    // Only ground pieces count: a floor piece's key is not read.
    expect(stackSill({ pieces: [piece("city-pack:A", "base"), piece("city-pack:Floor", "floor")] }, table).sink_m).toBe(0.2);
    expect(stackSill({ pieces: [piece("city-pack:C", "base")] }, table)).toEqual({ sink_m: 0, steps: null, leftOver_m: 0.1 });
    expect(stackSill({ pieces: [piece("city-pack:Nope", "base")] }, table)).toEqual({ sink_m: 0, steps: null, leftOver_m: 0 });
    expect(stackSill({ pieces: [] }, table).sink_m).toBe(0);
  });

  it("changes nothing for a key with no entry", () => {
    expect(houseSill("city-pack:SM_Bld_Shop_06")).toEqual({ sink_m: 0, steps: null, leftOver_m: 0 });
    expect(houseSill("nowhere:Nothing", {})).toEqual({ sink_m: 0, steps: null, leftOver_m: 0 });
    // A name on Object.prototype is not an entry.
    expect(houseSill("x:toString" as CalibrationKey, {})).toEqual({ sink_m: 0, steps: null, leftOver_m: 0 });
  });

  it("caps the sink at the lowest front step so it stays at the walk, and makes the rest up with steps (062 A)", () => {
    // A 1.04 m floor with a 0.6 m step in front and no window: sink 0.6, 0.44 left, steps scaled 0.88.
    const p = planHouse(1.04, null, 0.5, 0.6);
    expect(p.sink_m).toBeCloseTo(0.6, 9);
    expect(p.leftOver_m).toBeCloseTo(0.44, 9);
    expect(p.steps!.scaleY).toBeCloseTo(0.88, 9);
    // A step above the window's room does not lift the sink; the window still decides.
    expect(planHouse(1.04, 0.8, 0, 0.9).sink_m).toBeCloseTo(0.5, 9);
    // A step as high as the sill is the sill: the whole sink stands.
    expect(planHouse(0.4, null, 0, 0.4).sink_m).toBeCloseTo(0.4, 9);
    // No step given: as it was.
    expect(planHouse(1.04, null, 0, null)).toEqual(planHouse(1.04, null, 0));
    // The cap never makes a sink that buries the step, over a grid.
    for (let sill = 0.2; sill <= 1.5; sill += 0.05) for (const step of [0.05, 0.2, 0.4, 0.6, 0.9]) if (step < sill) expect(planHouse(sill, null, 0, step).sink_m, `${sill}/${step}`).toBeLessThanOrEqual(step + 1e-9);
  });

  it("after the rule, on every sill and window of a grid: the door is within SILL_MAX_M of the walk, or the steps' scaled top meets it within STEPS_FIT_M, and the window keeps its clearance", () => {
    const gaps: string[] = [];
    let withSteps = 0;
    for (let sill = 0.02; sill <= 1.5; sill += 0.01) {
      for (const win of [null, 0.1, 0.35, 0.6, 0.9, 1.2, 2, 4]) {
        const p = planHouse(sill, win, 0.5);
        const door = sill - p.sink_m;
        expect(door, `door height after sinking, sill ${sill} window ${win}`).toBeCloseTo(p.leftOver_m, 9);
        expect(p.sink_m, `sill ${sill} window ${win}`).toBeGreaterThanOrEqual(0);
        expect(p.sink_m, `sill ${sill} window ${win}`).toBeLessThanOrEqual(sill + 1e-9);
        // No window is buried: it stays at least SILL_WINDOW_CLEAR_M over the walk, unless it was lower than that to begin with (then nothing sinks).
        if (win !== null && sill > SILL_MAX_M) expect(win - p.sink_m >= SILL_WINDOW_CLEAR_M - 1e-9 || p.sink_m === 0, `buried window: sill ${sill} window ${win}`).toBe(true);
        if (p.steps) {
          withSteps++;
          expect(p.steps.scaleY).toBeGreaterThanOrEqual(STEPS_SCALE_Y.min - 1e-9);
          expect(p.steps.scaleY).toBeLessThanOrEqual(STEPS_SCALE_Y.max + 1e-9);
        }
        const reaches = door <= SILL_MAX_M + 1e-9 || (p.steps !== null && Math.abs(door - STEPS_RISE_M * p.steps.scaleY) <= STEPS_FIT_M + 1e-9);
        expect(leavesGap(p), `sill ${sill} window ${win}`).toBe(!reaches);
        if (!reaches) gaps.push(`${sill.toFixed(2)}/${String(win)}`);
      }
    }
    expect(withSteps).toBeGreaterThan(30);
    // The only doors left out of reach are a sill just over SILL_MAX_M that a window stops sinking (under the steps' smallest rise), and a rise past the steps' tallest.
    expect(gaps.length).toBeGreaterThan(0);
    for (const g of gaps) {
      const [s, w] = g.split("/");
      const sill = Number(s);
      const room = w === "null" ? sill : Math.max(0, Number(w) - SILL_WINDOW_CLEAR_M);
      const rest = sill - Math.min(sill, room);
      expect(sill < 0.2 + 1e-9 || rest > STEPS_RISE_M * STEPS_SCALE_Y.max + STEPS_FIT_M - 1e-9, `an unexpected gap: ${g}`).toBe(true);
    }
  });

  it("reports a rise the steps cannot make up (a sill of 1.5 under a window at 0.35: 1.45 to climb, the steps top out at 0.75)", () => {
    const p = planHouse(1.5, 0.35, 0);
    expect(p.steps!.scaleY).toBe(STEPS_SCALE_Y.max);
    expect(p.leftOver_m).toBeCloseTo(1.45, 9);
    expect(leavesGap(p)).toBe(true);
  });
});

describe("the front frame", () => {
  it("turns a point along the front and out from the centre into the model's own x and z, to the right as seen from outside", () => {
    // Typed in by hand: u along the front, d out through it.
    const want: Record<ModelFront, (u: number, d: number) => [number, number]> = {
      "+z": (u, d) => [u, d],
      "-z": (u, d) => [-u, -d],
      "+x": (u, d) => [d, -u],
      "-x": (u, d) => [-d, u],
    };
    for (const f of ["+z", "-z", "+x", "-x"] as const) {
      const got = modelPoint(f, 1.5, 3);
      const [x, z] = want[f](1.5, 3);
      expect(got.x, f).toBeCloseTo(x, 9);
      expect(got.z, f).toBeCloseTo(z, 9);
      // The out axis is the front's axis.
      const [ax, az] = frontAxis(f);
      expect(modelPoint(f, 0, 1).x, f).toBeCloseTo(ax, 9);
      expect(modelPoint(f, 0, 1).z, f).toBeCloseTo(az, 9);
    }
  });

  it("turns the steps (which descend toward their own +z) to face the front's axis", () => {
    for (const f of ["+z", "-z", "+x", "-x"] as const) {
      const yaw = stepsYaw(f);
      const [ax, az] = frontAxis(f);
      // Rotating +z by `yaw` about y gives (sin, cos).
      expect(Math.sin(yaw), f).toBeCloseTo(ax, 9);
      expect(Math.cos(yaw), f).toBeCloseTo(az, 9);
    }
  });
});

// ---- measuring: meshes built here ----

/** A mesh in the front frame (u along the front to the right, d out through the face, y up), turned into the model frame whose front is `front`. */
class Frame {
  readonly pos: number[] = [];
  readonly idx: number[] = [];
  readonly glass: number[] = [];
  constructor(readonly front: ModelFront) {}
  private v(u: number, y: number, d: number): number {
    const to: Record<ModelFront, [number, number]> = { "+z": [u, d], "-z": [-u, -d], "+x": [d, -u], "-x": [-d, u] };
    const [x, z] = to[this.front];
    this.pos.push(x, y, z);
    return this.pos.length / 3 - 1;
  }
  private tri(a: number, b: number, c: number, glass: boolean): void {
    this.idx.push(a, b, c);
    if (glass) this.glass.push(a, b, c);
  }
  /** An upward-facing quad at height y over [u0, u1] along the front and [d0, d1] out (d1 is nearer the front face). */
  up(y: number, u0: number, u1: number, d0: number, d1: number): this {
    // Counter-clockwise seen from above in the model frame, whichever way the frame is turned: try one order, and flip when the turn mirrors it.
    const a = this.v(u0, y, d0);
    const b = this.v(u1, y, d0);
    const c = this.v(u1, y, d1);
    const e = this.v(u0, y, d1);
    const flip = this.faceUp(a, b, c) < 0;
    if (flip) {
      this.tri(a, c, b, false);
      this.tri(a, e, c, false);
    } else {
      this.tri(a, b, c, false);
      this.tri(a, c, e, false);
    }
    return this;
  }
  /** A quad in the front plane at depth d (a wall or a window), over [u0, u1] and [y0, y1]. */
  wall(d: number, u0: number, u1: number, y0: number, y1: number, glass = false): this {
    const a = this.v(u0, y0, d);
    const b = this.v(u1, y0, d);
    const c = this.v(u1, y1, d);
    const e = this.v(u0, y1, d);
    this.tri(a, b, c, glass);
    this.tri(a, c, e, glass);
    return this;
  }
  /** A downward-facing quad (a ceiling or an underside), the reverse of `up`. */
  down(y: number, u0: number, u1: number, d0: number, d1: number): this {
    const n = this.idx.length;
    this.up(y, u0, u1, d0, d1);
    for (let i = n; i < this.idx.length; i += 3) {
      const t = this.idx[i + 1]!;
      this.idx[i + 1] = this.idx[i + 2]!;
      this.idx[i + 2] = t;
    }
    return this;
  }
  private faceUp(a: number, b: number, c: number): number {
    const p = (i: number): number[] => [this.pos[i * 3]!, this.pos[i * 3 + 1]!, this.pos[i * 3 + 2]!];
    const A = p(a);
    const B = p(b);
    const C = p(c);
    return (B[2]! - A[2]!) * (C[0]! - A[0]!) - (B[0]! - A[0]!) * (C[2]! - A[2]!);
  }
  mesh(): SillMesh {
    return { pos: this.pos, idx: this.idx, glass: this.glass };
  }
}

const FRONTS: readonly ModelFront[] = ["+z", "-z", "+x", "-x"];

/** A building 6 m wide and 8 deep, whose front face (d = 4) is a wall 4 m high, with a floor at `floor` from the face back. */
function building(front: ModelFront, floor: number): Frame {
  return new Frame(front).wall(4, -3, 3, 0, 4).wall(-4, -3, 3, 0, 4).up(floor, -3, 3, -4, 4);
}

describe("measureDoor reads a door from a mesh (criterion 33's method)", () => {
  it("reads a floor under the whole front as the sill, the door at the front's centre, whichever way the front faces", () => {
    for (const f of FRONTS) expect(measureDoor(building(f, 0.35).mesh(), f), f).toEqual({ sill_m: 0.35, window_m: null, door_x_m: 0 });
  });

  it("ignores a fitting too small to be a floor (a kick plate), and a counter beside the door", () => {
    for (const f of FRONTS) {
      const m = building(f, 0.1).up(1.0, -0.3, 0.3, 3.4, 3.5).up(0.9, -2.9, -1, 3.2, 3.9);
      expect(m.pos.length).toBeGreaterThan(0);
      expect(measureDoor(m.mesh(), f), f).toEqual({ sill_m: 0.1, window_m: null, door_x_m: 0 });
    }
    expect(0.6 * 0.1).toBeLessThan(DOOR_MIN_AREA_M2);
  });

  it("puts the door at a threshold slab when no floor covers the front's centre, and reads the sill there", () => {
    for (const f of FRONTS) {
      const m = new Frame(f).wall(4, -3, 3, 0, 4).wall(-4, -3, 3, 0, 4).up(1.05, 1.5, 2.5, 3.4, 3.7).up(1.75, -2.5, -1.5, 3.6, 3.74);
      expect(measureDoor(m.mesh(), f), f).toEqual({ sill_m: 1.05, window_m: null, door_x_m: 2 });
    }
  });

  it("reads the highest floor in the door opening: a step up inside is the sill", () => {
    for (const f of FRONTS) {
      const m = building(f, 0.2).up(0.5, -0.4, 0.4, 2.2, 3.4);
      expect(measureDoor(m.mesh(), f)!.sill_m, f).toBe(0.5);
    }
  });

  it("leaves out a floor that starts more than SILL_DEPTH_M behind the front face, and one above SILL_CEIL_M", () => {
    for (const f of FRONTS) {
      const deep = new Frame(f).wall(4, -3, 3, 0, 4).up(0.4, -3, 3, -4, 4 - SILL_DEPTH_M - 0.2);
      expect(measureDoor(deep.mesh(), f), f).toBeNull();
      const tall = new Frame(f).wall(4, -3, 3, 0, 4).up(SILL_CEIL_M + 0.1, -3, 3, -4, 4);
      expect(measureDoor(tall.mesh(), f), f).toBeNull();
      const edge = new Frame(f).wall(4, -3, 3, 0, 4).up(0.4, -3, 3, -4, 4 - SILL_DEPTH_M + 0.2);
      expect(measureDoor(edge.mesh(), f)!.sill_m, f).toBe(0.4);
    }
  });

  it("does not take a downward-facing surface for a floor, and says null for a mesh with none", () => {
    for (const f of FRONTS) {
      expect(measureDoor(new Frame(f).wall(4, -3, 3, 0, 4).down(0.4, -3, 3, -4, 4).mesh(), f), f).toBeNull();
      expect(measureDoor(new Frame(f).wall(4, -3, 3, 0, 4).mesh(), f), f).toBeNull();
    }
    expect(measureDoor({ pos: [], idx: [] }, "+z")).toBeNull();
  });

  it("reads the lowest point of the glass within SILL_DEPTH_M of the front face, and null when there is none", () => {
    for (const f of FRONTS) {
      const m = building(f, 0.3).wall(3.9, -2.5, -1.5, 1.8, 2.6, true).wall(3.9, 1.5, 2.5, 3.0, 3.6, true).wall(0, -2.5, -1.5, 1.2, 2.0, true);
      expect(measureDoor(m.mesh(), f)!.window_m, f).toBe(1.8);
      expect(measureDoor(building(f, 0.3).mesh(), f)!.window_m, f).toBeNull();
    }
  });

  it("rounds to a millimetre and joins surfaces of one level along the front", () => {
    // Three slabs of one level (a few tenths of a millimetre apart) touching along the front are one floor of 0.27 m2; each alone (0.09 m2) is under the floor size.
    const m = new Frame("+z").wall(4, -3, 3, 0, 4).up(0.5004, -0.4, -0.1, 3.7, 4).up(0.5, -0.1, 0.2, 3.7, 4).up(0.5002, 0.2, 0.5, 3.7, 4);
    expect(measureDoor(m.mesh(), "+z")).toEqual({ sill_m: 0.5, window_m: null, door_x_m: 0 });
    expect(measureDoor(new Frame("+z").wall(4, -3, 3, 0, 4).up(0.5, -0.4, -0.1, 3.7, 4).mesh(), "+z")).toBeNull();
    expect(DOOR_MIN_AREA_M2).toBe(0.2);
    expect(SILL_DOOR_HALF_M).toBe(0.45);
  });

  it("looks as far back as it is told: a floor 2.57 m behind the front face is read with a 3 m search and not with the default (062 A)", () => {
    for (const f of FRONTS) {
      // A recessed porch: the building's floor starts 2.57 m behind the face.
      const porch = new Frame(f).wall(4, -3, 3, 0, 4).wall(-4, -3, 3, 0, 4).up(1.05, -3, 3, -4, 4 - 2.57);
      expect(measureDoor(porch.mesh(), f), f).toBeNull();
      expect(measureDoor(porch.mesh(), f, SILL_DEPTH_M), f).toBeNull();
      expect(measureDoor(porch.mesh(), f, 3)!.sill_m, f).toBe(1.05);
      expect(measureDoor(porch.mesh(), f, 2.5), f).toBeNull();
    }
  });

  it("reads the lowest front step: a level in front of the door floor, over STEP_MIN_M and under the floor, and none where there is none (062 A)", () => {
    for (const f of FRONTS) {
      // A floor at 1.0 from 0.6 m behind the face, and a 0.6 m step in front of it across the face.
      const house = new Frame(f).wall(4, -3, 3, 0, 4).wall(-4, -3, 3, 0, 4).up(1, -3, 3, -4, 4 - 0.6).up(0.6, -2, 2, 4 - 0.6, 4);
      expect(measureDoor(house.mesh(), f), f).toEqual({ sill_m: 1, window_m: null, door_x_m: 0, step_m: 0.6 });
      // Two treads: the lowest is the step.
      const stair = new Frame(f).wall(4, -3, 3, 0, 4).wall(-4, -3, 3, 0, 4).up(1, -3, 3, -4, 3).up(0.7, -2, 2, 3, 3.5).up(0.35, -2, 2, 3.5, 4);
      expect(measureDoor(stair.mesh(), f)!.step_m, f).toBe(0.35);
      // A level behind the floor's start, a level too low to be a step, and one too small are not steps.
      const behind = new Frame(f).wall(4, -3, 3, 0, 4).wall(-4, -3, 3, 0, 4).up(1, -3, 3, -1, 4).up(0.5, -2, 2, -4, -1.5);
      expect(measureDoor(behind.mesh(), f)!.step_m, f).toBeUndefined();
      const low = new Frame(f).wall(4, -3, 3, 0, 4).wall(-4, -3, 3, 0, 4).up(1, -3, 3, -4, 3).up(STEP_MIN_M / 2, -2, 2, 3, 4);
      expect(measureDoor(low.mesh(), f)!.step_m, f).toBeUndefined();
      const small = new Frame(f).wall(4, -3, 3, 0, 4).wall(-4, -3, 3, 0, 4).up(1, -3, 3, -4, 3).up(0.5, 0, 0.3, 3.5, 4);
      expect(measureDoor(small.mesh(), f)!.step_m, f).toBeUndefined();
      // No step at all: the plain building.
      expect(measureDoor(building(f, 0.35).mesh(), f)!.step_m).toBeUndefined();
    }
  });

  it("reads a window from the lowest recessed front face over the door floor where the model has no glass (062 A)", () => {
    for (const f of FRONTS) {
      // A window's reveal 0.2 m behind the face, 1 x 0.8 m, over a door floor at 0.3; and a higher one.
      const m = building(f, 0.3).wall(3.8, -2.5, -1.5, 1.2, 2, false).wall(3.8, 1.5, 2.5, 2.6, 3.4, false);
      expect(measureDoor(m.mesh(), f)!.window_m, f).toBe(1.2);
      // Not a window: a face in the front plane itself (no recess), one under the door floor, one under 0.3 m2, one behind WINDOW_DEPTH_M, and the door's own leaf.
      const flat = building(f, 0.3).wall(4, -2.5, -1.5, 1.2, 2).wall(3.8, -2.5, -1.5, 0.2, 0.8).wall(3.8, 1.5, 1.9, 1.2, 1.6).wall(4 - WINDOW_DEPTH_M - 0.5, 0.5, 2.5, 1.2, 2.4);
      expect(measureDoor(flat.mesh(), f)!.window_m, f).toBeNull();
      const leaf = building(f, 0.3).wall(3.8, -RECESS_DOOR_HALF_M, RECESS_DOOR_HALF_M, 0.5, 2.1);
      expect(measureDoor(leaf.mesh(), f)!.window_m, f).toBeNull();
      // A reveal of several triangles on one plane joins into one surface; each triangle alone is under the area.
      const split = building(f, 0.3).wall(3.8, -2.5, -2.2, 1.2, 1.9).wall(3.8, -2.2, -1.9, 1.2, 1.9).wall(3.8, -1.9, -1.6, 1.2, 1.9);
      expect(measureDoor(split.mesh(), f)!.window_m, f).toBe(1.2);
      // A model with glass takes the glass, as before.
      const glassy = building(f, 0.3).wall(3.8, -2.5, -1.5, 1.2, 2).wall(3.9, 1.5, 2.5, 1.8, 2.6, true);
      expect(measureDoor(glassy.mesh(), f)!.window_m, f).toBe(1.8);
    }
  });
});

// ---- the real geometry: re-measured where the GLBs are on this machine ----

interface Gltf {
  nodes: { name?: string; mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number }; indices?: number; material?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number; type: string }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
  materials?: { name?: string }[];
}

interface Glb {
  gltf: Gltf;
  bin: Buffer;
}

function readGlb(file: string): Glb {
  const glb = readFileSync(file);
  const jsonLen = glb.readUInt32LE(12);
  return { gltf: JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf, bin: glb.subarray(20 + jsonLen + 8) };
}

type M4 = number[];
const IDENT: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a: M4, b: M4): M4 {
  const o = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r]! += a[k * 4 + r]! * b[c * 4 + k]!;
  return o;
}
function localOf(n: Gltf["nodes"][number]): M4 {
  if (n.matrix) return n.matrix;
  const t = n.translation ?? [0, 0, 0];
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const s = n.scale ?? [1, 1, 1];
  return [
    (1 - 2 * (y! * y! + z! * z!)) * s[0]!, 2 * (x! * y! + z! * w!) * s[0]!, 2 * (x! * z! - y! * w!) * s[0]!, 0,
    2 * (x! * y! - z! * w!) * s[1]!, (1 - 2 * (x! * x! + z! * z!)) * s[1]!, 2 * (y! * z! + x! * w!) * s[1]!, 0,
    2 * (x! * z! + y! * w!) * s[2]!, 2 * (y! * z! - x! * w!) * s[2]!, (1 - 2 * (x! * x! + y! * y!)) * s[2]!, 0,
    t[0]!, t[1]!, t[2]!, 1,
  ];
}

/** The mesh of the node named `name` and everything under it, in that node's frame (its own transform included), with the triangles of a glass material listed apart. */
function sillMeshOf(g: Glb, name: string): SillMesh | null {
  const root = g.gltf.nodes.findIndex((n) => n.name === name);
  if (root < 0) return null;
  const pos: number[] = [];
  const idx: number[] = [];
  const glass: number[] = [];
  const read = (i: number, n: number, comps: number): number[] => {
    const a = g.gltf.accessors[i]!;
    const bv = g.gltf.bufferViews[a.bufferView]!;
    const size = a.componentType === 5126 || a.componentType === 5125 ? 4 : 2;
    const stride = bv.byteStride ?? n * size;
    const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const out: number[] = [];
    for (let k = 0; k < a.count; k++) {
      for (let c = 0; c < comps; c++) {
        const at = base + k * stride + c * size;
        out.push(a.componentType === 5126 ? g.bin.readFloatLE(at) : a.componentType === 5125 ? g.bin.readUInt32LE(at) : g.bin.readUInt16LE(at));
      }
    }
    return out;
  };
  const walk = (i: number, acc: M4): void => {
    const n = g.gltf.nodes[i]!;
    const m = mul(acc, localOf(n));
    for (const prim of n.mesh !== undefined ? g.gltf.meshes[n.mesh]!.primitives : []) {
      const p = read(prim.attributes.POSITION, 3, 3);
      const first = pos.length / 3;
      for (let v = 0; v < p.length; v += 3) {
        const x = p[v]!;
        const y = p[v + 1]!;
        const z = p[v + 2]!;
        pos.push(m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, m[1]! * x + m[5]! * y + m[9]! * z + m[13]!, m[2]! * x + m[6]! * y + m[10]! * z + m[14]!);
      }
      const ids = prim.indices !== undefined ? read(prim.indices, 1, 1) : [...Array(p.length / 3).keys()];
      const isGlass = /glass/i.test(g.gltf.materials?.[prim.material ?? -1]?.name ?? "");
      for (const id of ids) idx.push(first + id);
      if (isGlass) for (const id of ids) glass.push(first + id);
    }
    for (const c of n.children ?? []) walk(c, m);
  };
  walk(root, IDENT);
  return { pos, idx, glass };
}

describe("the real geometry (criterion 33; skipped on a machine with no converted GLBs)", () => {
  const have = existsSync(CITY_PACK_GLB) && existsSync(TOWN_PACK_GLB) && existsSync(SIMPLE_TOWN_GLB);

  // Shown as skipped, not passed, where the GLBs are absent (CI, a fresh checkout).
  it.skipIf(!have)("re-measures every entry within 0.02 m at its own depth, finds nothing for every NO_STREET_DOOR key and for the typed-in ones within the limit, and measures the steps", () => {
    const glbs: Record<string, Glb> = {};
    const open = (pack: string): Glb => (glbs[pack] ??= readGlb(join("assets", "private", "out", `${pack}.glb`)));
    const bad: string[] = [];
    const near = (label: string, got: number | null | undefined, want: number | null | undefined): void => {
      const g = got ?? null;
      const w = want ?? null;
      if ((g === null) !== (w === null) || (g !== null && w !== null && Math.abs(g - w) > 0.02)) bad.push(`${label}: measured ${String(g)}, table ${String(w)}`);
    };
    const frontOf = (key: CalibrationKey): ModelFront => BUILDING_FRONTS[key]?.front ?? "+z";
    for (const key of groundKeys()) {
      const [pack, name] = key.split(":") as [string, string];
      const mesh = sillMeshOf(open(pack), name);
      expect(mesh, `${key} is not in its GLB`).not.toBeNull();
      const want = DOOR_SILLS[key];
      if (!want) {
        // No street door: nothing within the deepest search.
        const got = measureDoor(mesh!, frontOf(key), SILL_DEPTH_MAX_M);
        if (got !== null) bad.push(`${key}: has no entry but measures ${JSON.stringify(got)}`);
        continue;
      }
      if (want.why !== undefined) {
        // A typed-in entry: the geometry gives nothing within the deepest search; with no limit it reads the door typed in (the back door of the garage, the porch of Preset_04).
        const within = measureDoor(mesh!, frontOf(key), SILL_DEPTH_MAX_M);
        if (within !== null) bad.push(`${key}: is typed in but measures ${JSON.stringify(within)} within ${SILL_DEPTH_MAX_M} m`);
        const deep = measureDoor(mesh!, frontOf(key), 30);
        if (!deep) bad.push(`${key}: measures nothing at any depth, table ${JSON.stringify(want)}`);
        else near(`${key} typed sill`, deep.sill_m, want.sill_m);
        continue;
      }
      const got = measureDoor(mesh!, frontOf(key), sillDepth(key));
      if (!got) {
        bad.push(`${key}: measures nothing, table ${JSON.stringify(want)}`);
        continue;
      }
      near(`${key} sill`, got.sill_m, want.sill_m);
      near(`${key} door`, got.door_x_m, want.door_x_m);
      // A stack's ground piece (the City Pack's) has no window or step read: a stack sinks as one and its lift is judged against the first floor's window sill (062 B).
      if (key.startsWith("city-pack:")) continue;
      near(`${key} window`, got.window_m, want.window_m);
      near(`${key} step`, got.step_m, want.step_m);
      // Preset_10 and _11 read 1.05 m with a 3 m search.
      if (key.endsWith("Preset_10") || key.endsWith("Preset_11")) near(`${key} 3 m search`, measureDoor(mesh!, frontOf(key), 3)!.sill_m, 1.05);
    }
    expect(bad).toEqual([]);
    // The steps: 1.2 wide, 0.5 high, 0.9 deep to the tenth of a metre (1.19 x 0.513 x 0.871 in the GLB), the rise at the top landing on the building side (-z).
    const steps = sillMeshOf(open("town-pack"), STEPS_KEY.slice(STEPS_KEY.indexOf(":") + 1))!;
    let hi = -Infinity;
    let wMin = Infinity;
    let wMax = -Infinity;
    let dMin = Infinity;
    let dMax = -Infinity;
    for (let i = 0; i < steps.pos.length; i += 3) {
      hi = Math.max(hi, steps.pos[i + 1]!);
      wMin = Math.min(wMin, steps.pos[i]!);
      wMax = Math.max(wMax, steps.pos[i]!);
      dMin = Math.min(dMin, steps.pos[i + 2]!);
      dMax = Math.max(dMax, steps.pos[i + 2]!);
    }
    expect(Math.abs(hi - STEPS_RISE_M)).toBeLessThan(0.02);
    expect(Math.abs(wMax - wMin - STEPS_W_M)).toBeLessThan(0.02);
    expect(Math.abs(dMax - dMin - STEPS_D_M)).toBeLessThan(0.05);
    // Its top landing is the half toward -z, the step down toward +z: the steps descend toward their own +z.
    let landing = 0;
    let lower = 0;
    for (let i = 0; i < steps.idx.length; i += 3) {
      const ys = [0, 1, 2].map((k) => steps.pos[steps.idx[i + k]! * 3 + 1]!);
      const zs = [0, 1, 2].map((k) => steps.pos[steps.idx[i + k]! * 3 + 2]!);
      if (Math.max(...ys) - Math.min(...ys) > 0.02) continue;
      if (Math.abs(ys[0]! - hi) < 0.02 && zs.every((z) => z <= 0.06)) landing++;
      if (Math.abs(ys[0]! - hi / 2) < 0.03 && zs.every((z) => z >= 0.04)) lower++;
    }
    expect(landing).toBeGreaterThan(0);
    expect(lower).toBeGreaterThan(0);
  });
});

// ---- the plan applied: models3d.ts ----

const SIZES: [string, number, number, number][] = [
  ["SM_Bld_Apartment_01", 5.0, 3.0, 5.196],
  ["SM_Bld_Apartment_02", 5.17, 3.0, 5.214],
  ["SM_Bld_Apartment_03", 5.281, 3.0, 5.497],
  ["SM_Bld_Apartment_Corner_01", 5.196, 3.0, 5.196],
  ["SM_Bld_Apartment_Corner_02", 5.214, 3.0, 5.214],
  ["SM_Bld_Apartment_Corner_03", 5.491, 3.0, 5.497],
  ["SM_Bld_Apartment_Door_01", 5.096, 3.0, 5.577],
  ["SM_Bld_Apartment_Door_02", 5.114, 3.0, 5.115],
  ["SM_Bld_Apartment_Roof_01", 5.31, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_02", 5.252, 0.744, 5.488],
  ["SM_Bld_Apartment_Roof_03", 5.31, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_01", 5.904, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_Corner_02", 5.611, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_03", 5.462, 0.744, 5.488],
  ["SM_Bld_Apartment_Stack_01", 5.0, 9.0, 5.196],
  ["SM_Bld_Apartment_Stack_02", 5.17, 9.0, 5.214],
  ["SM_Bld_Apartment_Stack_03", 5.281, 9.0, 5.497],
  ["SM_Bld_Shop_01", 5.0, 3.054, 5.536],
  ["SM_Bld_Shop_02", 5.0, 3.3, 5.425],
  ["SM_Bld_Shop_03", 10.087, 3.084, 5.493],
  ["SM_Bld_Shop_04", 5.106, 3.17, 5.886],
  ["SM_Bld_Shop_05", 5.108, 3.0, 5.224],
  ["SM_Bld_Shop_06", 5.175, 3.0, 5.877],
  ["SM_Bld_Shop_Corner_01", 5.377, 3.0, 5.471],
  ["SM_Bld_Shop_Corner_02", 5.332, 3.0, 5.332],
  ["SM_Bld_OfficeOld_Small_Base_01", 10.936, 6.0, 10.936],
  ["SM_Bld_OfficeOld_Small_Floor_01", 10.0, 3.193, 10.0],
  ["SM_Bld_OfficeOld_Small_Roof_01", 11.12, 4.215, 11.2],
  ["SM_Bld_OfficeOld_Large_Base_01", 15.936, 6.0, 15.936],
  ["SM_Bld_OfficeOld_Large_Floor_01", 15.0, 3.193, 15.0],
  ["SM_Bld_OfficeOld_Large_Roof_01", 16.087, 4.227, 16.123],
  ["SM_Bld_OfficeOctagon_Base_01", 20.781, 3.896, 20.781],
  ["SM_Bld_OfficeOctagon_Floor_01", 20.465, 3.0, 20.465],
  ["SM_Bld_OfficeOctagon_Roof_01", 20.465, 5.382, 20.465],
  ["SM_Bld_FireEscape_01", 3.251, 1.492, 1.644],
  ["SM_Bld_FireEscape_02", 3.251, 3.609, 1.644],
  ["SM_Bld_FireEscape_03", 4.252, 3.802, 1.76],
];
const STACK_NAMES: ReadonlySet<string> = new Set(allStackKeys().map((k) => k.slice("city-pack:".length)));
const entryOf = ([name, w, h, d]: [string, number, number, number], i: number): AssetEntry => ({ name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles: 100 + i, textures: [], missingTextures: [], warnings: [] });
const manifestOf = (assets: AssetEntry[], pack: string): AssetManifest => ({ version: ASSET_MANIFEST_VERSION, generatedAt: "2026-01-01T00:00:00Z", blenderVersion: "5.0.0", packs: [{ pack, glb: `${pack}.glb`, atlas: null, assets, failures: [] }] });

const BOX = new BoxGeometry(1, 1, 1);
const PLAIN = new MeshStandardMaterial({ color: 0x888888 });

/** A GLB's scene: an empty node per entry, and a one-box mesh under each name in `solid`. */
function glbOf(manifest: AssetManifest, solid: ReadonlySet<string>): Group {
  const g = new Group();
  for (const e of manifest.packs[0]?.assets ?? []) {
    const n = new Group();
    n.name = e.name;
    if (solid.has(e.name)) n.add(new Mesh(BOX, PLAIN));
    g.add(n);
  }
  return g;
}

// The City Pack: the stack pieces, the three fire-escape pieces, and a plain 1 x 1 x 0.3 box for every other dressing key.
const DRESS_NAMES = dressKeys().map((k) => k.slice("city-pack:".length));
const CITY_ASSETS = [...SIZES, ...DRESS_NAMES.filter((n) => !SIZES.some((s) => s[0] === n)).map((n): [string, number, number, number] => [n, 1, 1, 0.3])].map(entryOf);
const CITY_MANIFEST = manifestOf(CITY_ASSETS, "city-pack");
const SOLID_CITY: ReadonlySet<string> = new Set(DRESS_NAMES);
const CITY_SET: ModelSet = await loadModels({ fetchJson: async (): Promise<unknown> => CITY_MANIFEST, loadGlb: async () => glbOf(CITY_MANIFEST, SOLID_CITY), stackKeys: allStackKeys(), dressKeys: dressKeys(), info: () => {} });

const loadMap = (file: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));
const MAPS = ["01-first-light", "09-shrine-circuit", "64-the-whole-chain"];
const sceneOf = (file: string): ReturnType<typeof buildScene> => buildScene(loadMap(file), { text: stubTextSurface });

/** Every `stack:*` group of a scene: the lone stacks (children of the models group) and the terrace blocks (`terrace-stacks`), in the order applyModels stood them. */
function stackGroups(scene: Object3D): Object3D[] {
  const out: Object3D[] = [];
  scene.traverse((o) => {
    if (o.name.startsWith("stack:") && o.userData["sharedModel"] === true) out.push(o);
  });
  return out;
}

describe("applyModels sinks a stack by its measured sill and takes the dressing down with it (criterion 35)", () => {
  for (const file of MAPS) {
    it(`on ${file}: every stack group is lowered by stackSill, and each block's dressing frame by the same`, () => {
      const bundle = sceneOf(file);
      const applied = applyModels(bundle, CITY_SET);
      const groups = stackGroups(bundle.scene);
      expect(groups.length, file).toBeGreaterThan(0);
      expect(applied.doors.length, "some block sinks").toBeGreaterThan(0);
      let sunk = 0;
      const lone = applied.buildings.filter((b) => b.stack).map((b) => b.stack!);
      const stacks = [...lone, ...applied.terrace.map((b) => b.stack)];
      // `stackGroups` finds the lone stacks first (the models group is the scene's first child) and then the terrace row, as `stacks` lists them.
      expect(groups).toHaveLength(stacks.length);
      const byPlace = new Map<string, number>();
      groups.forEach((g, i) => {
        const sink = stackSill(stacks[i]!).sink_m;
        expect(g.position.y, `${g.name} #${i}`).toBeCloseTo(-sink * W, 12);
        if (sink > 0) sunk++;
        byPlace.set(`${g.position.x.toFixed(6)},${g.position.z.toFixed(6)}`, -sink * W);
      });
      expect(sunk, "blocks that sink").toBe(applied.doors.length);
      expect(applied.doors.every((d) => d.kind === "stack" && !d.steps), "stacks never take steps").toBe(true);
      // The dressing's frame is the group's origin, so its y is the group's.
      let dressed = 0;
      for (const p of applied.dress) {
        const want = byPlace.get(`${p.frame.x.toFixed(6)},${p.frame.z.toFixed(6)}`);
        expect(want, "a dressing frame is a block's origin").toBeDefined();
        expect(p.frame.y ?? 0, "dressing frame y").toBeCloseTo(want!, 12);
        if (want! < 0) dressed++;
      }
      expect(dressed, "some dressing sinks").toBeGreaterThan(0);
      applied.remove();
      bundle.dispose();
    });

    it(`on ${file}: with an empty table nothing moves, and the furniture, the packed terrace and the dressing's pieces are what the full table gives`, () => {
      const a = sceneOf(file);
      const b = sceneOf(file);
      const full = applyModels(a, CITY_SET);
      const empty = applyModels(b, CITY_SET, { sills: {} });
      expect(empty.doors).toEqual([]);
      expect(empty.steps).toEqual([]);
      expect(b.scene.getObjectByName("door-steps")).toBeUndefined();
      for (const g of stackGroups(b.scene)) expect(g.position.y, g.name).toBe(0);
      expect(empty.dress.every((p) => p.frame.y === undefined)).toBe(true);
      // Nothing but heights changes: the same blocks, the same pieces on them, the same furniture.
      expect(full.terrace.map((t) => t.stack)).toEqual(empty.terrace.map((t) => t.stack));
      expect(full.dress.map((p) => p.piece)).toEqual(empty.dress.map((p) => p.piece));
      expect(full.dress.map((p) => [p.frame.x, p.frame.z, p.frame.yaw])).toEqual(empty.dress.map((p) => [p.frame.x, p.frame.z, p.frame.yaw]));
      expect(full.furniture).toEqual(empty.furniture);
      expect(full.buildings.map((p) => [p.lot, p.x, p.z, p.yaw])).toEqual(empty.buildings.map((p) => [p.lot, p.x, p.z, p.yaw]));
      // A table that gives every key a sill within SILL_MAX_M is the empty table.
      const flat: Record<string, { sill_m: number; window_m: null; door_x_m: number }> = {};
      for (const k of Object.keys(DOOR_SILLS)) flat[k] = { sill_m: 0.1, window_m: null, door_x_m: 0 };
      const c = sceneOf(file);
      const low = applyModels(c, CITY_SET, { sills: flat });
      expect(low.doors).toEqual([]);
      for (const g of stackGroups(c.scene)) expect(g.position.y, g.name).toBe(0);
      full.remove();
      empty.remove();
      low.remove();
      a.dispose();
      b.dispose();
      c.dispose();
    });
  }

  it("on the default tile city: every block sinks by stackSill (the walk is y 0), and with an empty table nothing moves and nothing else changes", () => {
    const city = tileCity({});
    const a = buildCityScene(city);
    const full = applyModels(a, CITY_SET, cityApplyOptions(city));
    const b = buildCityScene(city);
    const empty = applyModels(b, CITY_SET, { ...cityApplyOptions(city), sills: {} });
    const groups = stackGroups(a.scene);
    const stacks = [...full.buildings.filter((p) => p.stack).map((p) => p.stack!), ...full.terrace.map((t) => t.stack)];
    expect(groups.length).toBeGreaterThan(20);
    expect(groups).toHaveLength(stacks.length);
    groups.forEach((g, i) => expect(g.position.y, `${g.name} #${i}`).toBeCloseTo(-stackSill(stacks[i]!).sink_m * W, 12));
    expect(full.doors.length, "blocks that sink").toBeGreaterThan(0);
    expect(full.doors.length).toBeLessThan(groups.length);
    expect(empty.doors).toEqual([]);
    expect(empty.steps).toEqual([]);
    for (const g of stackGroups(b.scene)) expect(g.position.y, g.name).toBe(0);
    expect(empty.dress.every((p) => p.frame.y === undefined)).toBe(true);
    expect(full.terrace.map((t) => t.stack)).toEqual(empty.terrace.map((t) => t.stack));
    expect(full.dress.map((p) => p.piece)).toEqual(empty.dress.map((p) => p.piece));
    expect(full.furniture).toEqual(empty.furniture);
    full.remove();
    empty.remove();
    a.dispose();
    b.dispose();
  });

  it("lowers the dressing instances by the sink: an instance's height is its frame's plus its piece's", () => {
    const bundle = sceneOf("64-the-whole-chain");
    const applied = applyModels(bundle, CITY_SET);
    const group = bundle.scene.getObjectByName("city-dressing")!;
    expect(group).toBeDefined();
    const meshes = group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh && c.name.startsWith("dress:SM_"));
    let sunkInstances = 0;
    const m = new Matrix4();
    const pos = new Vector3();
    for (const im of meshes) {
      const key = `city-pack:${im.name.slice("dress:".length)}`;
      const list = applied.dress.filter((p) => p.piece.key === key);
      // Every key here is a one-box mesh at the root's origin, so an instance is at its piece's place.
      expect(im.count).toBe(list.length);
      list.forEach((p, i) => {
        im.getMatrixAt(i, m);
        pos.setFromMatrixPosition(m);
        expect(Math.abs(pos.y - ((p.frame.y ?? 0) + p.piece.y * W + 0))).toBeLessThan(0.5 * W * Math.max(1, p.piece.h));
        if ((p.frame.y ?? 0) < 0) sunkInstances++;
      });
    }
    expect(sunkInstances).toBeGreaterThan(0);
    applied.remove();
    bundle.dispose();
  });
});

// ---- whole models: sunk, and with steps ----

const HOUSE = "SM_Bld_House_Preset_02";
const HOUSE_KEY: CalibrationKey = `town-pack:${HOUSE}`;
const HOUSE_HALF = 2.85;
const TOWN_ASSETS: AssetEntry[] = [entryOf([HOUSE, 2 * HOUSE_HALF, 4.14, 2 * HOUSE_HALF], 0), entryOf(["SM_Bld_House_Concrete_Steps_01", 1.1897, 0.5126, 0.8710], 1)];
const TOWN_MANIFEST = manifestOf(TOWN_ASSETS, "town-pack");
const townSet = (steps: boolean, solid: boolean): Promise<ModelSet> =>
  loadModels({ fetchJson: async (): Promise<unknown> => TOWN_MANIFEST, loadGlb: async () => glbOf(TOWN_MANIFEST, solid ? new Set(["SM_Bld_House_Concrete_Steps_01"]) : new Set()), ...(steps ? { stepKeys: [STEPS_KEY] } : {}), info: () => {} });
const STEP_TABLE: SillTable = { [HOUSE_KEY]: { sill_m: 0.6, window_m: 0.6, door_x_m: 1.271 } };
const houseGroups = (scene: Object3D): Object3D[] => {
  const out: Object3D[] = [];
  scene.traverse((o) => {
    if (o.name === `model:${HOUSE}`) out.push(o);
  });
  return out;
};

describe("applyModels sinks a whole model and stands steps where the window forbids sinking (criterion 35)", () => {
  it("loads the steps only when asked, and drops them when the manifest or the GLB has none", async () => {
    expect((await townSet(false, true)).steps).toBeUndefined();
    const set = await townSet(true, true);
    expect(set.steps!.map((m) => `${m.pack}:${m.entry.name}`)).toEqual([STEPS_KEY]);
    const noSteps = await loadModels({ fetchJson: async (): Promise<unknown> => manifestOf([TOWN_ASSETS[0]!], "town-pack"), loadGlb: async () => glbOf(manifestOf([TOWN_ASSETS[0]!], "town-pack"), new Set()), stepKeys: [STEPS_KEY], info: () => {} });
    expect(noSteps.steps).toBeNull();
  });

  it("sinks every house by its sill when its window allows: no steps, the model group lowered", async () => {
    const set = await townSet(true, true);
    const bundle = sceneOf("64-the-whole-chain");
    const applied = applyModels(bundle, set);
    const groups = houseGroups(bundle.scene);
    expect(groups.length, "houses were stood").toBeGreaterThan(0);
    const row = DOOR_SILLS[HOUSE_KEY]!;
    for (const g of groups) expect(g.position.y).toBeCloseTo(-row.sill_m * W, 12);
    expect(applied.doors).toHaveLength(groups.length);
    expect(applied.doors.every((d) => d.kind === "house" && d.sink_m === row.sill_m && !d.steps && d.key === HOUSE_KEY)).toBe(true);
    expect(applied.steps).toEqual([]);
    expect(bundle.scene.getObjectByName("door-steps")).toBeUndefined();
    applied.remove();
    bundle.dispose();
  });

  it("leaves a house alone with an empty table", async () => {
    const set = await townSet(true, true);
    const bundle = sceneOf("64-the-whole-chain");
    const applied = applyModels(bundle, set, { sills: {} });
    for (const g of houseGroups(bundle.scene)) expect(g.position.y).toBe(0);
    expect(applied.doors).toEqual([]);
    applied.remove();
    bundle.dispose();
  });

  it("sinks by what the window leaves and stands the steps at the door, outside the front face, turned to the road, scaled in y alone", async () => {
    const set = await townSet(true, true);
    const bundle = sceneOf("64-the-whole-chain");
    const applied = applyModels(bundle, set, { sills: STEP_TABLE });
    const groups = houseGroups(bundle.scene);
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) expect(g.position.y).toBeCloseTo(-0.3 * W, 12);
    expect(applied.steps).toHaveLength(groups.length);
    expect(applied.doors.every((d) => d.steps && Math.abs(d.sink_m - 0.3) < 1e-9 && Math.abs(d.leftOver_m - 0.3) < 1e-9)).toBe(true);
    const drawn = bundle.scene.getObjectByName("door-steps")!;
    expect(drawn).toBeDefined();
    const meshes = drawn.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
    expect(meshes).toHaveLength(1);
    const im = meshes[0]!;
    expect(im.name).toBe("dress:SM_Bld_House_Concrete_Steps_01");
    expect(im.count).toBe(groups.length);
    const m = new Matrix4();
    applied.buildings.forEach((b, i) => {
      im.getMatrixAt(i, m);
      const pos = new Vector3().setFromMatrixPosition(m);
      const scale = new Vector3().setFromMatrixScale(m);
      expect(scale.x).toBeCloseTo(W, 6);
      expect(scale.y).toBeCloseTo(W * 0.6, 6);
      expect(scale.z).toBeCloseTo(W, 6);
      expect(pos.y, "stands on the walk").toBeCloseTo(0, 6);
      // The house's front is -z, so in the road's frame (the lot's yaw, forward (sin, cos), along the road (cos, -sin)) the steps stand out from the front face by half the depth and 0.4 m,
      // and along the front by the door's centre, which for a -z front runs along the lot's +x.
      const lot = bundle.slots.blocks.list[b.lot]!;
      const f = { x: Math.sin(lot.yaw), z: Math.cos(lot.yaw) };
      const e = { x: Math.cos(lot.yaw), z: -Math.sin(lot.yaw) };
      const d = (HOUSE_HALF + STEPS_D_M / 2 - STEPS_TUCK_M) * W;
      const u = 1.271 * W;
      // An instance matrix is a float32, so positions around 20 m hold about six digits.
      expect(pos.x, "x").toBeCloseTo(b.x + e.x * u + f.x * d, 4);
      expect(pos.z, "z").toBeCloseTo(b.z + e.z * u + f.z * d, 4);
      // The steps' own +z (where they step down) is the road's: their turn is the lot's.
      const out = new Vector3(0, 0, 1).transformDirection(m);
      expect(out.x).toBeCloseTo(f.x, 6);
      expect(out.z).toBeCloseTo(f.z, 6);
    });
    // The group holds nothing a ray can hit: it is shared with no scene disposal, and the instanced mesh answers no ray.
    expect(drawn.userData["sharedModel"]).toBe(true);
    expect(im.raycast(new Raycaster(), [])).toBeUndefined();
    applied.remove();
    expect(bundle.scene.getObjectByName("door-steps")).toBeUndefined();
    bundle.dispose();
  });

  it("draws plain boxes of the same size in the lot's colour when the steps model is not loaded (CI)", async () => {
    const set = await townSet(false, false);
    const bundle = sceneOf("64-the-whole-chain");
    const applied = applyModels(bundle, set, { sills: STEP_TABLE });
    const drawn = bundle.scene.getObjectByName("door-steps")!;
    expect(drawn).toBeDefined();
    const im = drawn.children[0] as InstancedMesh;
    expect(im.name).toBe("dress:steps-box");
    expect(im.count).toBe(applied.steps.length);
    expect((im.material as MeshStandardMaterial).color.getHex()).toBe(YARD);
    const m = new Matrix4();
    im.getMatrixAt(0, m);
    const s = new Vector3().setFromMatrixScale(m);
    expect([s.x, s.y, s.z].map((v) => Math.round((v / W) * 1000) / 1000)).toEqual([STEPS_W_M, 0.3, STEPS_D_M]);
    // Its base is on the walk, so its centre is half its height up.
    expect(new Vector3().setFromMatrixPosition(m).y).toBeCloseTo(0.15 * W, 6);
    const hits: unknown[] = [];
    im.raycast(new Raycaster(new Vector3(0, 10, 0), new Vector3(0, -1, 0)), hits as never);
    expect(hits).toEqual([]);
    applied.remove();
    expect(bundle.scene.getObjectByName("door-steps")).toBeUndefined();
    bundle.dispose();
  });

  it("stands the steps by `stepsPlacement`: out through the front face for each of the four fronts", () => {
    for (const f of FRONTS) {
      const entry = entryOf(["x", 6, 4, 10], 0);
      const p = stepsPlacement({ entry, front: f }, { x: 0, z: 0, yaw: 0 }, { x_m: 2, z_m: 0.4, scaleY: 1 });
      const half = f === "+z" || f === "-z" ? 5 : 3;
      const [ax, az] = frontAxis(f);
      // Along the front's axis it is `half + 0.4` out, and 2 m along the front across it.
      expect(p.piece.x * ax + p.piece.z * az, f).toBeCloseTo(half + 0.4, 9);
      expect(Math.abs(p.piece.x * az - p.piece.z * ax), f).toBeCloseTo(2, 9);
      expect(p.piece.key).toBe(STEPS_KEY);
      expect(p.piece.y).toBe(0);
    }
  });

  it("builds the steps group alone: a pack root draws the pack's meshes, and no root draws the boxes", () => {
    const placements = [stepsPlacement({ entry: entryOf(["x", 6, 4, 6], 0), front: "+z" }, { x: 1, z: 2, yaw: 0.5 }, { x_m: 0, z_m: 0.4, scaleY: 1 })];
    const root = new Group();
    root.name = "SM_Bld_House_Concrete_Steps_01";
    root.add(new Mesh(BOX, PLAIN));
    const withRoot = stepsGroup(placements, root);
    expect(withRoot.group.name).toBe("door-steps");
    expect(withRoot.calls).toBe(1);
    withRoot.dispose();
    const without = stepsGroup(placements, undefined);
    expect(without.group.name).toBe("door-steps");
    expect(without.calls).toBe(1);
    expect(without.group.userData["sharedModel"]).toBe(true);
    without.dispose();
    // A root with no mesh draws nothing, so the boxes stand in.
    const hollow = stepsGroup(placements, new Group());
    expect(hollow.group.children[0]!.name).toBe("dress:steps-box");
    hollow.dispose();
  });
});

describe("the ladder maps change only as the ticket says (criterion 36)", () => {
  it("keeps the layout and the pure plans out of the sink: sills.ts imports no three, models.ts and the plans are untouched by it", () => {
    const src = readFileSync("src/render3d/sills.ts", "utf8");
    expect(/from "three"/.test(src)).toBe(false);
    expect(/document\.|window\.|fetch\(|location\./.test(src)).toBe(false);
    for (const f of ["stacks.ts", "dressing.ts", "town.ts", "furniture.ts", "tilecity.ts", "tilecity3d.ts", "models.ts"]) expect(/from "\.\/sills"/.test(readFileSync(`src/render3d/${f}`, "utf8")), `${f} must not read sills.ts (the sink is applied when drawing)`).toBe(false);
  });

  it("meets the lot's ground on the ladder: its pavement is far under SILL_MAX_M, so the sill is measured to y 0", () => {
    expect(PAVEMENT_Y / W).toBeLessThan(SILL_MAX_M);
  });
});
