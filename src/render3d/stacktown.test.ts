/**
 * Ticket 050 C: City Pack stacks in the town. The chain (City Pack stacks, else Town Pack whole houses, else SIMPLE Town), the variety and corner rules on stacks,
 * the placements, the promoted fronts and the guide. No WebGL: the GLBs are fake groups with one empty node per entry, and every size is typed in as a number
 * copied from the converted manifests (SIMPLE Town and Town Pack of 17 Nov 2026, City Pack of 18 Nov 2026). Nothing here reads assets/private/. The maps are the repo's own puzzles.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3, type Object3D } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationKey, type Puzzle } from "../core";
import { createCameraRig } from "./camera";
import { declaredFrontDirection } from "./debug3d";
import { NODE_BODY_Y, wireLayout } from "./layout";
import {
  BUILDING_FRONTS,
  FAMILY_SHARE_MAX,
  MODEL_TABLE,
  NEIGHBOUR_GAP,
  POLYGON_MIN_FAMILIES,
  STACK_LOT_TYPES,
  STREET_REPEAT_GAP,
  WORLD_PER_METRE,
  buildingPlan,
  lotGap,
  pickBuildings,
  planModels,
  planStackPieces,
  stackName,
  stackStyleOf,
  traitsOf,
  type ModelChoice,
  type PlannedModel,
} from "./models";
import { NO_MODELS, allStackKeys, applyModels, buildingPlacements, loadModels, stackEntries, stackInput, type BuildingPlacement, type ModelSet } from "./models3d";
import { buildScene } from "./scene";
import { STACK_STYLES, assembleStack, offeredStacks, stackKeys, type StackPiece } from "./stacks";
import { stubTextSurface } from "./text";
import { LOT_TYPE_NAMES, townLayout, type Lot, type LotType, type Town } from "./town";

// ---- fixtures: [name, width, height, depth (m), triangles]; bounds are centred ----
const TOWN_PACK: [string, number, number, number, number][] = [
  ["SM_Bld_Church_01", 10.37123, 16.522998, 14.388206, 6629],
  ["SM_Bld_GardenShed_01", 2.345918, 2.780094, 2.501314, 2014],
  ["SM_Bld_House_Preset_01", 6.371228, 5.769236, 8.87122, 3084],
  ["SM_Bld_House_Preset_02", 5.693126, 4.140918, 5.698264, 763],
  ["SM_Bld_House_Preset_03", 13.87123, 6.457822, 13.87123, 4783],
  ["SM_Bld_House_Preset_04", 13.522782, 6.457822, 13.87123, 4005],
  ["SM_Bld_House_Preset_05", 8.87123, 6.472775, 13.87123, 3162],
  ["SM_Bld_House_Preset_06", 11.371226, 6.359276, 13.871226, 4190],
  ["SM_Bld_House_Preset_07", 13.203422, 7.702181, 13.87123, 4462],
  ["SM_Bld_House_Preset_08", 13.87123, 6.408776, 18.87123, 5786],
  ["SM_Bld_House_Preset_09", 8.871228, 8.670689, 11.37122, 5321],
  ["SM_Bld_House_Preset_10", 13.49694, 8.670689, 8.537326, 4667],
  ["SM_Bld_House_Preset_11", 18.163028, 9.359277, 13.537322, 5835],
  ["SM_Bld_House_Preset_Garage_01", 6.371232, 5.67069, 8.87122, 1699],
  ["SM_Bld_Shop_01", 10.56472, 4.876365, 10.3997, 1355],
];

// SIMPLE Town (the same numbers as facing.test.ts's SIZES, minus memorial_mesh which no row names).
const SIMPLE: [string, number, number, number, number][] = [
  ["Building_AutoRepair", 21.489, 10.6657, 10.8053, 1618],
  ["Building_BaberShop", 10.3994, 11.2909, 10.906, 600],
  ["Building_CoffeeShop", 10.3994, 15.6313, 12.9223, 776],
  ["Building_Garage_01", 12.3739, 11.6069, 14.7409, 464],
  ["Building_Garage_02", 12.3739, 11.6069, 14.7409, 464],
  ["Building_Garage_03", 12.3739, 11.6069, 14.7409, 464],
  ["Building_Gym", 10.5082, 11.4185, 11.985, 386],
  ["Building_House_01", 10.6301, 14.5245, 18.5211, 788],
  ["Building_House_010", 14.1854, 10.1431, 16.1033, 834],
  ["Building_House_011", 14.1854, 10.1431, 16.1033, 834],
  ["Building_House_012", 15.8606, 10.8695, 14.8303, 753],
  ["Building_House_013", 15.8606, 10.8695, 14.8303, 753],
  ["Building_House_014", 15.8606, 10.8695, 14.8303, 753],
  ["Building_House_015", 15.8606, 10.8695, 14.8303, 753],
  ["Building_House_02", 10.6301, 14.5245, 18.5211, 788],
  ["Building_House_03", 10.6301, 14.5245, 18.5211, 788],
  ["Building_House_04", 10.6301, 14.5245, 18.5211, 788],
  ["Building_House_05", 19.5643, 15.9763, 25.7115, 2244],
  ["Building_House_06", 19.5643, 15.9763, 25.7115, 2244],
  ["Building_House_07", 19.5643, 15.9763, 25.7115, 2244],
  ["Building_House_08", 19.5643, 15.9763, 25.7115, 2244],
  ["Building_House_09", 14.1854, 10.1431, 16.1033, 834],
  ["Building_PetrolStation", 22.4742, 9.4097, 27.7504, 804],
  ["Building_PoliceStation", 24.3111, 9.855, 14.9959, 1866],
  ["Building_Shop_01", 10.5082, 11.4185, 10.1611, 278],
  ["Building_Shop_02", 10.5082, 11.4185, 10.1611, 278],
  ["Building_Shop_03", 10.9169, 10.4123, 11.8753, 588],
  ["Building_Shop_04", 10.9169, 10.4123, 11.8753, 588],
  ["Building_Shop_05", 10.9169, 10.4123, 11.8753, 588],
  ["Building_StripClub", 20.9971, 7.9244, 15.8742, 1800],
  ["apartment_large_mesh", 11.632, 16.7468, 11.8194, 930],
  ["apartment_small_mesh", 11.632, 11.9546, 11.8194, 690],
  ["house_mesh", 11.8211, 8.4526, 13.4194, 478],
  ["office_large_mesh", 13.6209, 27.237, 15.1668, 780],
  ["office_medium_mesh", 13.6209, 20.0433, 15.1668, 620],
  ["office_small_mesh", 13.6209, 12.829, 15.1668, 460],
  ["store_corner_mesh", 11.0614, 6.6556, 11.2561, 247],
  ["store_small_mesh", 11.6319, 6.6556, 8.3694, 218],
];

// City Pack stack pieces: [name, width, height, depth] in metres (the same numbers as stacks.test.ts's fixture, from the manifest of 18 Nov 2026).
const CITY_SIZES: [string, number, number, number][] = [
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
];


const entryOf = ([name, w, h, d, triangles]: [string, number, number, number, number]): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const manifestOf = (packs: Record<string, AssetEntry[]>): AssetManifest => ({
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: Object.entries(packs).map(([pack, assets]) => ({ pack, glb: `${pack}.glb`, atlas: null, assets, failures: [] })),
});
const SIMPLE_E = SIMPLE.map(entryOf);
const TOWN_E = TOWN_PACK.map(entryOf);
// City Pack pieces: every one has a distinct triangle count, so no two are a mesh family.
const CITY_E = CITY_SIZES.map(([n, w, h, d], i) => entryOf([n, w, h, d, 100 + i]));
const keyOf = (name: string): CalibrationKey => `city-pack:${name}`;
const CITY_ENTRIES: ReadonlyMap<CalibrationKey, AssetEntry> = new Map(CITY_E.map((e) => [keyOf(e.name), e] as const));
const without = (...names: string[]): ReadonlyMap<CalibrationKey, AssetEntry> => new Map([...CITY_ENTRIES].filter(([k]) => !names.some((n) => k === keyOf(n))));

const WITH_CITY = manifestOf({ "simple-town": SIMPLE_E, "town-pack": TOWN_E, "city-pack": CITY_E });
const NO_CITY = manifestOf({ "simple-town": SIMPLE_E, "town-pack": TOWN_E });
const SIMPLE_ONLY = manifestOf({ "simple-town": SIMPLE_E });

/** Every GLB is a group with one empty node per entry of the pack the URL names, so `loadModels` finds each planned root. */
async function setOf(manifest: AssetManifest, opts: { failCity?: boolean; stackKeys?: readonly CalibrationKey[]; exclude?: readonly CalibrationKey[] } = {}): Promise<ModelSet> {
  return loadModels({
    fetchJson: async (): Promise<unknown> => manifest,
    loadGlb: async (url) => {
      const pack = manifest.packs.find((p) => url.endsWith(p.glb));
      if (!pack || (opts.failCity && pack.pack === "city-pack")) throw new Error("HTTP 404");
      const g = new Group();
      for (const e of pack.assets) {
        const n = new Group();
        n.name = e.name;
        g.add(n);
      }
      return g;
    },
    stackKeys: opts.stackKeys ?? allStackKeys(),
    ...(opts.exclude ? { exclude: opts.exclude } : {}),
    info: () => {},
  });
}

const mapFiles = [...readdirSync("puzzles").filter((f) => f.endsWith(".json")), "lamp-row.grid.json"].map((f) => join("puzzles", f)).filter((f, i, all) => existsSync(f) && all.indexOf(f) === i);
/**
 * The town the game draws (terraces on), as the picker sees it: a terrace lot is stood by its run's packed stacks (051 D) and `buildingPlacements` never hands it to `pickBuildings`, so the
 * rules below (variety, corners, a stack on every large and tall lot) are held on the other lots, `town.lots` here, exactly the list the picker gets.
 */
const maps: { name: string; town: Town }[] = mapFiles.map((f) => {
  const town = townLayout(loadPuzzle(JSON.parse(readFileSync(f, "utf8"))));
  return { name: f, town: { ...town, lots: town.lots.filter((l) => l.terrace === undefined) } };
});

const SET = await setOf(WITH_CITY);
const SET_NO_CITY = await setOf(NO_CITY);
const SET_SIMPLE = await setOf(SIMPLE_ONLY);
const OFFERS = offeredStacks(CITY_ENTRIES);

const planned = (m: AssetManifest): PlannedModel[] => planModels(m).building ?? [];
const stackNames = (names: readonly string[]): boolean => names.every((n) => stackStyleOf(n) !== null);
const noStackNames = (names: readonly string[]): boolean => names.every((n) => stackStyleOf(n) === null);

// ---- the chain (criterion 10) ----

describe("what the City Pack offers on each type", () => {
  it("offers the apartment styles on large and tall, Old Small on both, Old Large and the Octagon on large (the ticket's finding 3, within STACK_LOT_TYPES)", () => {
    expect(STACK_LOT_TYPES).toEqual(["large", "tall"]);
    expect(OFFERS).toEqual([
      { style: "apartment-01", types: ["large", "tall"] },
      { style: "apartment-02", types: ["large", "tall"] },
      { style: "apartment-03", types: ["large", "tall"] },
      { style: "office-old-small", types: ["large", "tall"] },
      { style: "office-old-large", types: ["large"] },
      { style: "office-octagon", types: ["large"] },
    ]);
  });

  it("offers nothing when the manifest has no City Pack piece, and drops only the styles a missing piece belongs to", () => {
    expect(offeredStacks(new Map())).toEqual([]);
    const noRoof = offeredStacks(without("SM_Bld_Apartment_Roof_01"));
    expect(noRoof.map((o) => o.style)).not.toContain("apartment-01");
    expect(noRoof.map((o) => o.style)).toContain("apartment-02");
    expect(noRoof.map((o) => o.style)).toContain("office-octagon");
  });
});

describe("buildingPlan: City Pack stacks, else the Town Pack, else SIMPLE Town, never mixed (050 C, criterion 10)", () => {
  const models = planned(WITH_CITY);

  it("with stacks: large and tall are stacks (six and four styles), small and house are the Town Pack", () => {
    const plan = buildingPlan(models, undefined, OFFERS);
    expect(plan.large).toEqual(["apartment-01", "apartment-02", "apartment-03", "office-old-small", "office-old-large", "office-octagon"].map(stackName));
    expect(plan.tall).toEqual(["apartment-01", "apartment-02", "apartment-03", "office-old-small"].map(stackName));
    expect(plan.small.slice().sort()).toEqual(["SM_Bld_House_Preset_01", "SM_Bld_House_Preset_02", "SM_Bld_House_Preset_09", "SM_Bld_House_Preset_Garage_01"]);
    expect(plan.house).toHaveLength(6);
    expect(plan.house.every((n) => TOWN_E.some((e) => e.name === n))).toBe(true);
  });

  it("never mixes the three within a type", () => {
    const plan = buildingPlan(models, undefined, OFFERS);
    for (const t of LOT_TYPE_NAMES) expect(stackNames(plan[t]) || noStackNames(plan[t]), t).toBe(true);
    for (const t of ["small", "house"] as const) expect(noStackNames(plan[t]), t).toBe(true);
    for (const t of ["small", "house"] as const) expect(plan[t].every((n) => TOWN_E.some((e) => e.name === n)), t).toBe(true);
  });

  it("without a City Pack, every type is as on main (small and house Town Pack, large and tall SIMPLE Town)", () => {
    const main = buildingPlan(planned(NO_CITY));
    expect(buildingPlan(planned(NO_CITY), undefined, offeredStacks(new Map()))).toEqual(main);
    expect(main.large).toEqual(["Building_House_05", "Building_House_06", "Building_House_07", "Building_House_08", "Building_AutoRepair", "Building_StripClub", "Building_PoliceStation", "Building_PetrolStation", "Building_CoffeeShop"]);
    expect(main.tall).toEqual(["apartment_large_mesh", "office_medium_mesh", "office_large_mesh"]);
    // And the City Pack's models in a manifest change nothing when no stack is offered.
    expect(buildingPlan(models)).toEqual(main);
  });

  it("falls a type back to the Town Pack, then SIMPLE Town, when too few styles are offered: tall needs 3, large 4", () => {
    expect(POLYGON_MIN_FAMILIES.tall).toBe(3);
    expect(POLYGON_MIN_FAMILIES.large).toBe(4);
    // Without the floors of apartment-01 and -02: tall keeps apartment-03 and office-old-small (two styles), large keeps four.
    const fewer = offeredStacks(without("SM_Bld_Apartment_01", "SM_Bld_Apartment_02"));
    const plan = buildingPlan(models, undefined, fewer);
    expect(plan.tall).toEqual(["apartment_large_mesh", "office_medium_mesh", "office_large_mesh"]);
    expect(plan.large).toEqual(["apartment-03", "office-old-small", "office-old-large", "office-octagon"].map(stackName));
    // One more style gone and large falls to the Town Pack: SM_Bld_House_Preset_08 and _11 are its two families, under 4, so SIMPLE Town.
    const fewest = offeredStacks(without("SM_Bld_Apartment_01", "SM_Bld_Apartment_02", "SM_Bld_OfficeOctagon_Roof_01"));
    expect(buildingPlan(models, undefined, fewest).large).toEqual(buildingPlan(models).large);
    expect(noStackNames(buildingPlan(models, undefined, fewest).large)).toBe(true);
  });

  it("only offers a style on the types in STACK_LOT_TYPES, even when its pieces fit another", () => {
    const wide = [{ style: "apartment-01", types: ["small", "house", "large", "tall"] as const }, { style: "apartment-02", types: ["small", "house", "large", "tall"] as const }, { style: "apartment-03", types: ["small", "house", "large", "tall"] as const }, { style: "office-old-small", types: ["small", "house", "large", "tall"] as const }];
    const plan = buildingPlan(models, undefined, wide);
    expect(noStackNames(plan.small)).toBe(true);
    expect(noStackNames(plan.house)).toBe(true);
    expect(stackNames(plan.large)).toBe(true);
  });
});

describe("with no POLYGON pack the plan and every pick are today's (the CI case)", () => {
  const OLD_TABLE: ModelChoice[] = MODEL_TABLE.filter((r) => r.pack !== "town-pack").map((r) => {
    const { fallback: _f, ...rest } = r;
    return rest;
  });
  const oldModels = planModels(SIMPLE_ONLY, OLD_TABLE).building ?? [];
  const oldPlan = buildingPlan(oldModels);
  const oldPicks = maps.map((m) => pickBuildings(m.town.lots, oldPlan, traitsOf(oldModels)));

  it("pins today's plan: nine small names (the rental store out), sixteen house, nine large, three tall", () => {
    expect(LOT_TYPE_NAMES.map((t) => oldPlan[t].length)).toEqual([9, 16, 9, 3]);
  });

  it("gives the same plan and picks on every map for a SIMPLE-Town-only manifest, whether or not stacks were asked for", () => {
    expect(SET_SIMPLE.stack ?? null).toBeNull();
    expect(stackInput(SET_SIMPLE)).toBeNull();
    const models = SET_SIMPLE.building!;
    const plan = buildingPlan(models, undefined, offeredStacks(new Map()));
    expect(plan).toEqual(oldPlan);
    maps.forEach((m, i) => expect(pickBuildings(m.town.lots, plan, traitsOf(models, [])), m.name).toEqual(oldPicks[i]));
  });

  it("gives the same placements when the City Pack is in the manifest and its GLB fails to load", async () => {
    const failed = await setOf(WITH_CITY, { failCity: true });
    expect(failed.stack ?? null).toBeNull();
    expect(stackInput(failed)).toBeNull();
    const plain = await setOf(NO_CITY, { stackKeys: [] });
    expect("stack" in plain).toBe(false);
    const key = (p: BuildingPlacement): (string | number)[] => [p.lot, p.model.entry.name, p.x, p.z, p.yaw];
    for (const { name, town } of maps.filter((m) => /09-|56-/.test(m.name))) {
      expect(buildingPlacements(town.lots, failed.building, stackInput(failed)).map(key), name).toEqual(buildingPlacements(town.lots, plain.building).map(key));
    }
  });

  it("asks the loader for no stack piece when the manifest has no City Pack, and sets no stack slot then", () => {
    expect(SET_NO_CITY.stack ?? null).toBeNull();
    expect(stackInput(NO_MODELS)).toBeNull();
    expect(stackInput({ ...NO_MODELS, stack: [] })).toBeNull();
  });
});

describe("the loader and the town agree on the pieces", () => {
  it("asks for every key every recipe names, once each, and the town's shared load passes them", () => {
    const keys = allStackKeys();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(34);
    for (const s of STACK_STYLES) for (const k of stackKeys(s)) expect(keys).toContain(k);
    expect(readFileSync("src/render3d/models3d.ts", "utf8")).toMatch(/stackKeys: allStackKeys\(\)/);
  });

  it("loads the whole recipe set for the fixture and takes each piece's front and open side from BUILDING_FRONTS", () => {
    expect(SET.stack).toHaveLength(34);
    const corner = SET.stack!.find((m) => m.entry.name === "SM_Bld_Shop_Corner_01")!;
    expect(corner.corner).toBe("-x"); // measured (063 E1), not the "+x" guess
    expect(SET.stack!.find((m) => m.entry.name === "SM_Bld_Shop_01")!.corner).toBe(false);
    const input = stackInput(SET)!;
    expect(input.fronts[keyOf("SM_Bld_Shop_Corner_01")]).toEqual({ front: "+z", corner: true, open: "-x" });
    expect(input.fronts[keyOf("SM_Bld_Apartment_01")]).toEqual({ front: "+z" });
  });

  it("drops an excluded piece like a missing one, so the styles that need it fall away", async () => {
    const set = await setOf(WITH_CITY, { exclude: [keyOf("SM_Bld_OfficeOctagon_Roof_01")] });
    expect(set.stack!.map((m) => m.entry.name)).not.toContain("SM_Bld_OfficeOctagon_Roof_01");
    expect(offeredStacks(stackEntries(set)).map((o) => o.style)).not.toContain("office-octagon");
  });
});

// ---- variety on the stack plan, every map (criterion 11) ----

describe("variety and corners on the stack fixture, on every map", () => {
  const models = SET.building!;
  const offers = offeredStacks(stackEntries(SET), stackInput(SET)!.fronts);
  const plan = buildingPlan(models, undefined, offers);
  const traits = traitsOf(models, offers);
  const familyOf = (n: string): string => traits.get(n)!.family;
  const familiesIn = (t: LotType): number => new Set(plan[t].map(familyOf)).size;

  it("has the families the ticket counts: six on large, four on tall, at least POLYGON_MIN_FAMILIES", () => {
    expect(familiesIn("large")).toBe(6);
    expect(familiesIn("tall")).toBe(4);
    for (const t of LOT_TYPE_NAMES) expect(familiesIn(t), t).toBeGreaterThanOrEqual(POLYGON_MIN_FAMILIES[t]);
    expect(familyOf(stackName("apartment-02"))).toBe("city-pack:stack:apartment-02");
  });

  it("is deterministic and leaves no lot bare", () => {
    for (const { name, town } of maps.filter((m) => /09-|56-|64-/.test(m.name))) {
      const a = pickBuildings(town.lots, plan, traits);
      expect(pickBuildings(town.lots, plan, traits), name).toEqual(a);
      expect(a.filter((x) => x === null).length, name).toBe(0);
    }
  });

  it("gives no two neighbours the same family", () => {
    let pairs = 0;
    for (const { name, town } of maps) {
      const names = pickBuildings(town.lots, plan, traits);
      const lots = town.lots;
      for (let i = 0; i < lots.length; i++) {
        for (let j = i + 1; j < lots.length; j++) {
          const a = lots[i]!;
          const b = lots[j]!;
          if (a.type !== b.type || Math.hypot(a.x - b.x, a.z - b.z) > 9 || lotGap(a, b) > NEIGHBOUR_GAP) continue;
          pairs++;
          expect(familyOf(names[i]!), `${name} ${a.key} beside ${b.key}`).not.toBe(familyOf(names[j]!));
        }
      }
    }
    // 051 D: the terrace lots are stood by their runs' packed stacks and not handed to the picker, so far fewer lots remain here (683 pairs on the ladder; was over 1000).
    expect(pairs).toBeGreaterThan(500);
  });

  it("does not bring a family back within STREET_REPEAT_GAP lots on one road side (large, with six families); tall, with exactly STREET_REPEAT_GAP + 1, only in the rule's documented forced fallback", () => {
    let checked = 0;
    let tallChecked = 0;
    let tallRepeats = 0;
    for (const { name, town } of maps) {
      const names = pickBuildings(town.lots, plan, traits);
      const rows = new Map<string, number[]>();
      town.lots.forEach((l, i) => rows.set(`${l.street}:${l.side}`, [...(rows.get(`${l.street}:${l.side}`) ?? []), i]));
      for (const [k, row] of rows) {
        row.forEach((i, p) => {
          const type = town.lots[i]!.type;
          if (familiesIn(type) <= STREET_REPEAT_GAP) return;
          for (let q = Math.max(0, p - STREET_REPEAT_GAP); q < p; q++) {
            // With exactly GAP + 1 families the window leaves one family free, and a neighbour (of any type: stacks share a family across types) can take it. pickBuildings then
            // drops the street rule before the neighbour rule, as documented, so those few repeats are the rule's own fallback and not a stack defect.
            if (familiesIn(type) === STREET_REPEAT_GAP + 1) {
              tallChecked++;
              if (familyOf(names[i]!) === familyOf(names[row[q]!]!)) tallRepeats++;
              continue;
            }
            checked++;
            expect(familyOf(names[i]!), `${name} ${k} lots ${q} and ${p}`).not.toBe(familyOf(names[row[q]!]!));
          }
        });
      }
    }
    expect(checked).toBeGreaterThan(200);
    expect(tallChecked).toBeGreaterThan(1000);
    expect(tallRepeats, `${tallRepeats} of ${tallChecked}`).toBeLessThanOrEqual(Math.ceil(tallChecked * 0.005));
  });

  it("keeps every family within FAMILY_SHARE_MAX of its type's lots (types with four or more families)", () => {
    for (const { name, town } of maps) {
      const names = pickBuildings(town.lots, plan, traits);
      for (const t of LOT_TYPE_NAMES) {
        if (familiesIn(t) < 4) continue;
        const idx = town.lots.map((l, i) => (l.type === t ? i : -1)).filter((i) => i >= 0);
        const counts = new Map<string, number>();
        for (const i of idx) counts.set(familyOf(names[i]!), (counts.get(familyOf(names[i]!)) ?? 0) + 1);
        const most = Math.max(Math.floor(FAMILY_SHARE_MAX * idx.length), Math.ceil(idx.length / familiesIn(t)));
        for (const [f, c] of counts) expect(c, `${name} ${t} ${f} of ${idx.length}`).toBeLessThanOrEqual(most);
      }
    }
  });

  it("puts a stack on every large and tall lot, and never a stack on a small or house lot", () => {
    for (const { name, town } of maps) {
      const placed = buildingPlacements(town.lots, models, stackInput(SET));
      for (const p of placed) {
        const lot = town.lots[p.lot]!;
        expect(p.stack !== undefined, `${name} ${lot.key}`).toBe(lot.type === "large" || lot.type === "tall");
      }
      const covered = new Set(placed.map((p) => p.lot));
      for (const [i, lot] of town.lots.entries()) expect(covered.has(i), `${name} ${lot.key} is bare`).toBe(true);
    }
  });
});

// ---- the placements (criteria 11 and 12) ----

const WPM = WORLD_PER_METRE;
const EPS = 1e-6;
/** A stack piece's four footprint corners in world units, from the placement (the group's origin is the lot's front-centre, turned by the placement's yaw). */
function worldCorners(p: BuildingPlacement, piece: StackPiece): [number, number][] {
  const half = (p.stack!.depth_m * WPM) / 2;
  const ox = p.x + Math.sin(p.yaw) * half;
  const oz = p.z + Math.cos(p.yaw) * half;
  const out: [number, number][] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = piece.x + (sx * piece.w) / 2;
      const cz = piece.z + (sz * piece.d) / 2;
      out.push([ox + (cx * Math.cos(p.yaw) + cz * Math.sin(p.yaw)) * WPM, oz + (-cx * Math.sin(p.yaw) + cz * Math.cos(p.yaw)) * WPM]);
    }
  }
  return out;
}
const insideLot = (lot: Lot, [x, z]: [number, number]): boolean => {
  const rx = x - lot.x;
  const rz = z - lot.z;
  const u = rx * Math.cos(lot.yaw) - rz * Math.sin(lot.yaw);
  const v = rx * Math.sin(lot.yaw) + rz * Math.cos(lot.yaw);
  return Math.abs(u) <= lot.w / 2 + EPS && Math.abs(v) <= lot.d / 2 + EPS;
};
const angleDeg = (a: readonly [number, number], b: readonly [number, number]): number => (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]))) * 180) / Math.PI;

describe("stacks in the town: inside the lot, under its cap, facing its road, corners only on corners", () => {
  let stackPlacements = 0;
  let cornerStacks = 0;

  it("keeps every stack's footprint inside its lot and its height under the lot's cap, on every map", () => {
    for (const { name, town } of maps) {
      for (const p of buildingPlacements(town.lots, SET.building, stackInput(SET))) {
        if (!p.stack) continue;
        stackPlacements++;
        const lot = town.lots[p.lot]!;
        expect(p.stack.height_m * WPM, `${name} ${lot.key} ${p.stack.style}`).toBeLessThanOrEqual(lot.hMax + 1e-9);
        for (const piece of p.stack.pieces) for (const c of worldCorners(p, piece)) expect(insideLot(lot, c), `${name} ${lot.key} ${piece.key}`).toBe(true);
      }
    }
    // 051 D: only the non-terrace large and tall lots are placed one by one now (32 on the ladder; the terrace blocks are checked in terracetown.test.ts and terracepack.test.ts).
    expect(stackPlacements).toBeGreaterThan(20);
  });

  it("stands the stack's frame at the lot's front-centre (the footprint centre by atFront, the group's origin half a depth toward the road)", () => {
    for (const { name, town } of maps.filter((m) => /09-|64-/.test(m.name))) {
      for (const p of buildingPlacements(town.lots, SET.building, stackInput(SET))) {
        if (!p.stack) continue;
        const lot = town.lots[p.lot]!;
        const half = (p.stack.depth_m * WPM) / 2;
        expect(p.x + Math.sin(p.yaw) * half, `${name} ${lot.key}`).toBeCloseTo(lot.x + Math.sin(lot.yaw) * (lot.d / 2), 6);
        expect(p.z + Math.cos(p.yaw) * half, `${name} ${lot.key}`).toBeCloseTo(lot.z + Math.cos(lot.yaw) * (lot.d / 2), 6);
        expect(p.yaw).toBe(lot.yaw);
        expect(p.scale).toBe(WPM);
      }
    }
  });

  it("points every street face at the lot's road: the stack's front marker, and each piece's own declared front after its yaw (the open side for a corner piece turned at the far end)", () => {
    const fronts = stackInput(SET)!.fronts;
    for (const { name, town } of maps.filter((m) => /09-|56-|64-/.test(m.name))) {
      for (const p of buildingPlacements(town.lots, SET.building, stackInput(SET))) {
        if (!p.stack) continue;
        const lot = town.lots[p.lot]!;
        const toRoad: readonly [number, number] = [Math.sin(lot.yaw), Math.cos(lot.yaw)];
        expect(angleDeg(declaredFrontDirection(p.model.front, p.yaw), toRoad), `${name} ${lot.key} marker`).toBeLessThan(0.5);
        for (const piece of p.stack.pieces) {
          if (piece.street !== "front") continue;
          const f = fronts[piece.key]?.front ?? "+z";
          expect(angleDeg(declaredFrontDirection(f, lot.yaw + piece.yaw), toRoad), `${name} ${lot.key} ${piece.key}`).toBeLessThan(0.5);
        }
      }
    }
  });

  it("gives a stack a corner column only on a side its lot has, and never on a mid-row lot", () => {
    for (const { name, town } of maps) {
      for (const p of buildingPlacements(town.lots, SET.building, stackInput(SET))) {
        if (!p.stack) continue;
        const lot = town.lots[p.lot]!;
        const have = lot.cornerSides.map((c) => c.side);
        for (const side of p.stack.cornerSides) expect(have, `${name} ${lot.key} ${p.stack.style}`).toContain(side);
        if (lot.cornerSides.length === 0) {
          expect(p.stack.cornerSides, `${name} ${lot.key} mid-row`).toEqual([]);
          for (const piece of p.stack.pieces) expect(piece.key, `${name} ${lot.key} mid-row`).not.toMatch(/Corner/);
        }
        if (p.stack.cornerSides.length > 0) cornerStacks++;
      }
    }
    expect(cornerStacks).toBeGreaterThan(0);
  });

  it("builds the corner columns the lot asks for whenever the style can be assembled with them, and a mid-row stack of the same style when it cannot (offices have no corner pieces)", () => {
    const input = stackInput(SET)!;
    let full = 0;
    for (const { name, town } of maps) {
      for (const p of buildingPlacements(town.lots, SET.building, input)) {
        if (!p.stack) continue;
        const lot = town.lots[p.lot]!;
        const recipe = STACK_STYLES.find((s) => s.id === p.stack!.style)!;
        const asked = assembleStack(recipe, lot, input.entries, input.fronts);
        if (asked) {
          expect(p.stack.cornerSides, `${name} ${lot.key} ${recipe.id}`).toEqual(asked.cornerSides);
          if (asked.cornerSides.length > 0) full++;
        } else {
          expect(p.stack.cornerSides, `${name} ${lot.key} ${recipe.id} fell back`).toEqual([]);
        }
        if (recipe.base.corner.length === 0) expect(p.stack.cornerSides, `${name} ${lot.key} ${recipe.id}`).toEqual([]);
      }
    }
    expect(full).toBeGreaterThan(0);
  });
});

describe("a stack in the 041 B occlusion test: nothing stands between the camera and a wire's middle or a node's pick point", () => {
  for (const file of ["09-shrine-circuit", "64-the-whole-chain"]) {
    it(`holds on ${file} with every stack at its fixture height`, () => {
      const puzzle: Puzzle = loadPuzzle(JSON.parse(readFileSync(`puzzles/${file}.json`, "utf8")));
      const bundle = buildScene(puzzle, { text: stubTextSurface });
      // The town the game draws: the non-terrace lots' stacks and every terrace block's, each at its fixture height.
      const applied = applyModels(bundle, SET);
      const placements = applied.buildings.filter((p) => p.stack);
      expect(placements.length + applied.terrace.length, file).toBeGreaterThan(0);
      const solid = (s: { width_m: number; height_m: number; depth_m: number }, x: number, z: number, yaw: number): Object3D => {
        const box = new Mesh(new BoxGeometry(s.width_m * WPM, s.height_m * WPM, s.depth_m * WPM), new MeshBasicMaterial({ side: DoubleSide }));
        box.position.set(x, (s.height_m * WPM) / 2, z);
        box.rotation.y = yaw;
        box.updateMatrixWorld(true);
        return box;
      };
      const solids: Object3D[] = [
        ...placements.map((p) => solid(p.stack!, p.x, p.z, p.yaw)),
        ...applied.terrace.map((b) => {
          const half = (b.stack.depth_m * WPM) / 2;
          return solid(b.stack, b.lot.x + Math.sin(b.lot.yaw) * (b.lot.d / 2 - half), b.lot.z + Math.cos(b.lot.yaw) * (b.lot.d / 2 - half), b.lot.yaw);
        }),
      ];
      const rig = createCameraRig(puzzle, 1280, 720, { top: 120, bottom: 90 });
      const eye = rig.camera.position;
      const targets: { name: string; p: Vector3 }[] = [
        ...wireLayout(puzzle).map((r) => ({ name: r.id, p: new Vector3(r.mid.x, r.mid.y, r.mid.z) })),
        ...puzzle.nodes.map((n) => ({ name: n.id, p: new Vector3(n.pos[0], NODE_BODY_Y, n.pos[1]) })),
      ];
      const caster = new Raycaster();
      for (const t of targets) {
        const dir = t.p.clone().sub(eye);
        const dist = dir.length();
        caster.set(eye, dir.normalize());
        caster.far = dist - 1e-6;
        const hits = caster.intersectObjects(solids, true);
        expect(hits.length, `${t.name} behind a stack at ${hits[0]?.distance}`).toBe(0);
      }
    });
  }
});

describe("applyModels stands one unpickable group per stack", () => {
  // 64 has non-terrace large lots that stand a stack one by one; 09's outer rows are all terraces now (051 D).
  const puzzle: Puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/64-the-whole-chain.json", "utf8")));

  it("adds a `stack:<style>` group at the lot's front-centre and yaw, hides the placeholders of the covered types, and takes it all back on remove()", () => {
    const bundle = buildScene(puzzle, { text: stubTextSurface });
    const lots = bundle.slots.blocks.list;
    const want = buildingPlacements(lots, SET.building, stackInput(SET));
    const stacks = want.filter((p) => p.stack);
    expect(stacks.length).toBeGreaterThan(0);
    const before = bundle.slots.models.children.length;
    const applied = applyModels(bundle, SET);
    const kids = bundle.slots.models.children.slice(before);
    expect(kids).toHaveLength(want.length);
    expect(applied.buildings.length).toBe(want.length);
    want.forEach((p, k) => {
      const g = kids[k]!;
      if (!p.stack) {
        expect(g.name).toBe(`model:${p.model.entry.name}`);
        return;
      }
      const lot = lots[p.lot]!;
      expect(g.name).toBe(`stack:${p.stack.style}`);
      expect(g.children).toHaveLength(p.stack.pieces.length);
      expect(g.position.x).toBeCloseTo(lot.x + Math.sin(lot.yaw) * (lot.d / 2), 6);
      expect(g.position.z).toBeCloseTo(lot.z + Math.cos(lot.yaw) * (lot.d / 2), 6);
      expect(g.rotation.y).toBeCloseTo(lot.yaw, 9);
    });
    for (const t of ["large", "tall"] as const) if (stacks.some((p) => lots[p.lot]!.type === t)) expect(bundle.slots.blocks.byType[t].visible, t).toBe(false);
    applied.remove();
    expect(bundle.slots.models.children.length).toBe(before);
    for (const t of LOT_TYPE_NAMES) expect(bundle.slots.blocks.byType[t].visible, t).toBe(true);
    bundle.dispose();
  });

  it("adds no stack group at all when no stack piece loaded (a fresh checkout and CI)", () => {
    const bundle = buildScene(puzzle, { text: stubTextSurface });
    const applied = applyModels(bundle, SET_NO_CITY);
    expect(bundle.slots.models.children.some((c) => c.name.startsWith("stack:"))).toBe(false);
    expect(applied.buildings.every((p) => p.stack === undefined)).toBe(true);
    applied.remove();
    bundle.dispose();
  });
});

// ---- the promoted fronts (criterion 13) ----

describe("the City Pack stack pieces in BUILDING_FRONTS (provisional, from the saved file of 2026-11-18T03:50:16.193Z)", () => {
  const SAVED_AT = "2026-11-18T03:50:16.193Z";
  /** The 25 recipe keys that Josh's saved file has, each saved as "+z" (a first click saves the "+z" guess, so they are not evidence that he saw a door). Copied by hand from the file. */
  const SAVED: readonly string[] = [
    ...["Shop_01", "Shop_02", "Shop_03", "Shop_04", "Shop_05", "Shop_06", "Shop_Corner_01", "Shop_Corner_02", "Apartment_Door_02"],
    ...["Apartment_01", "Apartment_02", "Apartment_03", "Apartment_Corner_02", "Apartment_Stack_01", "Apartment_Stack_02", "Apartment_Stack_03"],
    ...["OfficeOld_Small_Base_01", "OfficeOld_Small_Floor_01", "OfficeOld_Small_Roof_01", "OfficeOld_Large_Base_01", "OfficeOld_Large_Floor_01", "OfficeOld_Large_Roof_01"],
    ...["OfficeOctagon_Base_01", "OfficeOctagon_Floor_01", "OfficeOctagon_Roof_01"],
  ].map((n) => `SM_Bld_${n}`);
  /** The nine recipe keys that were not in the file: guessed "+z" like the rest, and listed so a reader sees which are which. */
  const NOT_SAVED: readonly string[] = ["Apartment_Corner_01", "Apartment_Corner_03", "Apartment_Door_01", "Apartment_Roof_01", "Apartment_Roof_02", "Apartment_Roof_03", "Apartment_Roof_Corner_01", "Apartment_Roof_Corner_02", "Apartment_Roof_Corner_03"].map((n) => `SM_Bld_${n}`);
  const recipeKeys = [...new Set(STACK_STYLES.flatMap((s) => stackKeys(s)))];
  const isCorner = (key: string): boolean => /_Corner_\d\d$/.test(key);

  it("lists the file's 25 and the nine guesses, which together are every recipe key", () => {
    expect(SAVED).toHaveLength(25);
    expect(NOT_SAVED).toHaveLength(9);
    expect([...SAVED, ...NOT_SAVED].map(keyOf).sort()).toEqual(recipeKeys.slice().sort());
  });

  it("has a line for every recipe key and for nothing else of the City Pack", () => {
    for (const key of recipeKeys) expect(BUILDING_FRONTS[key], key).toBeDefined();
    expect(Object.keys(BUILDING_FRONTS).filter((k) => k.startsWith("city-pack:")).sort()).toEqual(recipeKeys.slice().sort());
  });

  it('gives every line "+z", and `corner: true, open: "-x"` (measured, 063 E1) to the eight corner pieces only', () => {
    let corners = 0;
    for (const key of recipeKeys) {
      const line = BUILDING_FRONTS[key]!;
      if (isCorner(key)) {
        corners++;
        expect(line, key).toEqual({ front: "+z", corner: true, open: "-x" });
      } else {
        expect(line, key).toEqual({ front: "+z" });
      }
    }
    expect(corners).toBe(8);
  });

  it("gives the saved file's keys the front the file has (+z), and names the file's savedAt in the code comment and in the guide", () => {
    for (const n of SAVED) expect(BUILDING_FRONTS[keyOf(n)]!.front, n).toBe("+z");
    expect(readFileSync("src/render3d/models.ts", "utf8")).toContain(SAVED_AT);
    // The date is a reading, so it lives in evaluation.md (ticket 080 B2); the fronts domain says the fronts are provisional.
    expect(readFileSync("docs/city-style/evaluation.md", "utf8")).toContain(SAVED_AT);
    expect(readFileSync("docs/city-style/fronts.md", "utf8")).toMatch(/provisional/i);
  });

  it("is what the recipe pieces plan to: a corner piece's open side is the line's", () => {
    const pieces = planStackPieces(WITH_CITY, allStackKeys())!;
    expect(pieces).toHaveLength(34);
    for (const m of pieces) expect(m.corner, m.entry.name).toBe(isCorner(m.entry.name) ? "-x" : false);
  });
});

describe("the guide tells the three-step chain and the stack gallery (criterion 14)", () => {
  // Chapter 5 is in buildings.md, 6 in fronts.md, 7 in corner-buildings.md and 13 to 15 in packs.md (ticket 080 A and B2).
  const guide = ["buildings.md", "fronts.md", "corner-buildings.md", "packs.md"].map((f) => readFileSync(`docs/city-style/${f}`, "utf8").replace(/\r\n/g, "\n")).join("\n");
  const chapter = (n: number): string => {
    const from = guide.indexOf(`\n## ${n}. `);
    const to = guide.indexOf("\n## ", from + 1);
    return guide.slice(from, to);
  };

  it("chapter 5 has the chain and STACK_LOT_TYPES, chapter 6 the provisional fronts, chapter 7 the corner columns, chapter 13 the pack in use, chapter 15 the recipe step and gallery", () => {
    expect(chapter(5)).toMatch(/three-step chain/);
    expect(chapter(5)).toContain("`STACK_LOT_TYPES`");
    expect(chapter(6)).toContain("provisional");
    expect(chapter(6)).toContain("city-pack:SM_Bld_Shop_01");
    expect(chapter(7)).toMatch(/corner column/);
    expect(chapter(7)).toContain("city-pack:SM_Bld_Shop_Corner_01");
    expect(chapter(13)).toMatch(/\| city-pack \| POLYGON City Pack \| 100 \| in use \|/);
    expect(chapter(15)).toContain("gallery=city-pack");
    expect(chapter(15)).toContain("&stacks=1");
    expect(chapter(15)).toMatch(/\n10\. A modular pack/);
  });
});
