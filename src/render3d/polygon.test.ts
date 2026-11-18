/**
 * Ticket 048: the town's houses come from the POLYGON Town Pack where it fills a lot type, SIMPLE Town stays as the fallback.
 * Fixture entries only: names, sizes in metres and triangle counts are typed in as numbers (the way facing.test.ts's SIZES is), copied from the converted manifest
 * of 17 Nov 2026. Nothing here reads assets/private/. The maps are the repo's own puzzles.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Group } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationKey } from "../core";
import {
  BUILDING_EXCLUDE,
  BUILDING_FRONTS,
  FAMILY_SHARE_MAX,
  MODEL_TABLE,
  NEIGHBOUR_GAP,
  POLYGON_MIN_FAMILIES,
  STREET_REPEAT_GAP,
  buildingPlan,
  lotGap,
  lotTypeOf,
  pickBuildings,
  planModels,
  traitsOf,
  type FrontTable,
  type ModelChoice,
  type ModelFront,
  type PlannedModel,
} from "./models";
import { loadModels } from "./models3d";
import { LOT_TYPE_NAMES, townLayout, type LotType, type Town } from "./town";

// ---- fixtures: [name, width, height, depth (m), triangles] ----
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

function entryOf([name, w, h, d, triangles]: (typeof SIMPLE)[number]): AssetEntry {
  return { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles, textures: [], missingTextures: [], warnings: [] };
}
const manifestOf = (packs: Record<string, AssetEntry[]>): AssetManifest => ({
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: Object.entries(packs).map(([pack, assets]) => ({ pack, glb: `${pack}.glb`, atlas: null, assets, failures: [] })),
});
const SIMPLE_ENTRIES = SIMPLE.map(entryOf);
const TOWN_ENTRIES = TOWN_PACK.map(entryOf);
const BOTH = manifestOf({ "simple-town": SIMPLE_ENTRIES, "town-pack": TOWN_ENTRIES });
const SIMPLE_ONLY = manifestOf({ "simple-town": SIMPLE_ENTRIES });

/** Josh's saved file, savedAt 2026-11-18T03:10:05.703Z: the 14 Town Pack doors, copied by hand (ticket 048). */
const JOSH_FRONTS: Record<string, ModelFront> = {
  "town-pack:SM_Bld_Church_01": "+z",
  "town-pack:SM_Bld_House_Preset_01": "-x",
  "town-pack:SM_Bld_House_Preset_02": "-z",
  "town-pack:SM_Bld_House_Preset_03": "-x",
  "town-pack:SM_Bld_House_Preset_04": "-x",
  "town-pack:SM_Bld_House_Preset_05": "-x",
  "town-pack:SM_Bld_House_Preset_06": "+x",
  "town-pack:SM_Bld_House_Preset_07": "-z",
  "town-pack:SM_Bld_House_Preset_08": "-x",
  "town-pack:SM_Bld_House_Preset_09": "-x",
  "town-pack:SM_Bld_House_Preset_10": "-z",
  "town-pack:SM_Bld_House_Preset_11": "-z",
  "town-pack:SM_Bld_House_Preset_Garage_01": "-z",
  "town-pack:SM_Bld_Shop_01": "+z",
};

/** The lot type each new building lands in, worked out from the fixture sizes and Josh's fronts. */
const POLYGON_TYPES: Record<string, LotType> = {
  SM_Bld_House_Preset_01: "small",
  SM_Bld_House_Preset_02: "small",
  SM_Bld_House_Preset_03: "house",
  SM_Bld_House_Preset_04: "house",
  SM_Bld_House_Preset_05: "house",
  SM_Bld_House_Preset_06: "house",
  SM_Bld_House_Preset_07: "house",
  SM_Bld_House_Preset_08: "large",
  SM_Bld_House_Preset_09: "small",
  SM_Bld_House_Preset_10: "house",
  SM_Bld_House_Preset_11: "large",
  SM_Bld_House_Preset_Garage_01: "small",
};

const mapFiles = [...readdirSync("puzzles").filter((f) => f.endsWith(".json")), "lamp-row.grid.json"].map((f) => join("puzzles", f)).filter((f, i, all) => existsSync(f) && all.indexOf(f) === i);
const maps: { name: string; town: Town }[] = mapFiles.map((f) => ({ name: f, town: townLayout(loadPuzzle(JSON.parse(readFileSync(f, "utf8"))), { terraces: false }) }));

const buildingsOf = (m: AssetManifest, fronts: FrontTable = BUILDING_FRONTS, table: readonly ModelChoice[] = MODEL_TABLE): PlannedModel[] => planModels(m, table, fronts).building ?? [];
const packOf = (models: readonly PlannedModel[], name: string): string => models.find((p) => p.entry.name === name)!.pack;

describe("MODEL_TABLE building rows (048)", () => {
  const rows = MODEL_TABLE.filter((r) => r.slot === "building");
  const townRows = rows.filter((r) => r.pack === "town-pack");

  it("has the twelve whole Town Pack houses, and no City Pack row (Josh named none whole)", () => {
    expect(townRows.flatMap((r) => r.names)).toEqual(Object.keys(POLYGON_TYPES));
    expect(rows.some((r) => r.pack === "city-pack")).toBe(false);
  });

  it("puts every POLYGON row before every SIMPLE Town row, and marks only the SIMPLE Town rows as the fallback", () => {
    const lastPolygon = Math.max(...rows.map((r, i) => (r.pack === "town-pack" ? i : -1)));
    const firstSimple = rows.findIndex((r) => r.pack === "simple-town");
    expect(lastPolygon).toBeLessThan(firstSimple);
    for (const r of rows) expect(r.fallback === true, r.pack).toBe(r.pack === "simple-town");
  });

  it("holds back the Church, the City Hall, the garden shed, Shop_01 and every modular piece", () => {
    const named = new Set(rows.flatMap((r) => r.names));
    for (const n of ["SM_Bld_Church_01", "SM_Bld_CityHall_01", "SM_Bld_GardenShed_01", "SM_Bld_Shop_01", "SM_Bld_Shop_02"]) expect(named.has(n), n).toBe(false);
    for (const n of named) expect(n, n).not.toMatch(/_Base_|_Floor_|_Roof_|_Corner_|_Glass_|_Stack_|_Apartment_|_Station_|_Cover|_FireEscape/);
    for (const n of townRows.flatMap((r) => r.names)) expect(n).toMatch(/^SM_Bld_House_Preset_(\d\d|Garage_01)$/);
  });

  it("has unique building names across packs (the plan keys buildings by bare name)", () => {
    const names = rows.flatMap((r) => r.names);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("the promoted fronts (savedAt 2026-11-18T03:10:05.703Z)", () => {
  it("has exactly Josh's 14 Town Pack lines, and none for the City Pack", () => {
    const have = Object.fromEntries(Object.entries(BUILDING_FRONTS).filter(([k]) => !k.startsWith("simple-town:")));
    expect(have).toEqual(Object.fromEntries(Object.entries(JOSH_FRONTS).map(([k, f]) => [k, { front: f }])));
    for (const f of Object.values(have)) expect(f.corner, "no POLYGON corner model (048 Q5)").toBeUndefined();
  });

  it("has a front for every name in a building row (pack:name)", () => {
    for (const r of MODEL_TABLE) if (r.slot === "building") for (const n of r.names) expect(BUILDING_FRONTS[`${r.pack}:${n}`], `${r.pack}:${n}`).toBeDefined();
  });

  it("excludes no POLYGON model (Josh Shift+clicked none), so BUILDING_EXCLUDE is still the video rental store", () => {
    expect(BUILDING_EXCLUDE).toEqual(["simple-town:store_small_mesh"]);
  });

  it("puts each new name in the lot type listed, from the fixture bounds and Josh's front", () => {
    for (const [name, type] of Object.entries(POLYGON_TYPES)) {
      const e = TOWN_ENTRIES.find((x) => x.name === name)!;
      expect(lotTypeOf(e, BUILDING_FRONTS[`town-pack:${name}`]!.front), name).toBe(type);
    }
    // The Church is tall at its front; the shop is small; neither is in a row.
    expect(lotTypeOf(TOWN_ENTRIES.find((x) => x.name === "SM_Bld_Church_01")!, "+z")).toBe("tall");
    expect(lotTypeOf(TOWN_ENTRIES.find((x) => x.name === "SM_Bld_Shop_01")!, "+z")).toBe("small");
  });
});

describe("buildingPlan: POLYGON where it fills a type, SIMPLE Town otherwise, never both", () => {
  const models = buildingsOf(BOTH);

  it("gives small and house the Town Pack and keeps SIMPLE Town for large (two families) and tall (none)", () => {
    const plan = buildingPlan(models);
    expect(plan.small.slice().sort()).toEqual(["SM_Bld_House_Preset_01", "SM_Bld_House_Preset_02", "SM_Bld_House_Preset_09", "SM_Bld_House_Preset_Garage_01"]);
    expect(plan.house.slice().sort()).toEqual(["SM_Bld_House_Preset_03", "SM_Bld_House_Preset_04", "SM_Bld_House_Preset_05", "SM_Bld_House_Preset_06", "SM_Bld_House_Preset_07", "SM_Bld_House_Preset_10"]);
    expect(plan.large).toEqual(["Building_House_05", "Building_House_06", "Building_House_07", "Building_House_08", "Building_AutoRepair", "Building_StripClub", "Building_PoliceStation", "Building_PetrolStation", "Building_CoffeeShop"]);
    expect(plan.tall).toEqual(["apartment_large_mesh", "office_medium_mesh", "office_large_mesh"]);
  });

  it("never mixes the two styles within a type", () => {
    const plan = buildingPlan(models);
    for (const t of LOT_TYPE_NAMES) expect(new Set(plan[t].map((n) => packOf(models, n))).size, t).toBe(1);
  });

  it("takes a type back to SIMPLE Town when exclusions leave POLYGON under POLYGON_MIN_FAMILIES, and not before", () => {
    expect(POLYGON_MIN_FAMILIES).toEqual({ small: 4, house: 4, large: 4, tall: 3 });
    const one = buildingPlan(models, [...BUILDING_EXCLUDE, "town-pack:SM_Bld_House_Preset_01"]);
    expect(one.small).toEqual(["Building_Shop_01", "Building_Shop_02", "Building_Shop_03", "Building_Shop_04", "Building_Shop_05", "Building_BaberShop", "Building_Gym", "store_corner_mesh", "apartment_small_mesh"]);
    // House has six families: two exclusions still leave four.
    const two = buildingPlan(models, ["town-pack:SM_Bld_House_Preset_03", "town-pack:SM_Bld_House_Preset_04"]);
    expect(two.house.every((n) => packOf(models, n) === "town-pack")).toBe(true);
    expect(two.house).toHaveLength(4);
    const three = buildingPlan(models, ["town-pack:SM_Bld_House_Preset_03", "town-pack:SM_Bld_House_Preset_04", "town-pack:SM_Bld_House_Preset_05"]);
    expect(three.house.every((n) => packOf(models, n) === "simple-town")).toBe(true);
  });

  it("counts families, not names: names that are one mesh are one family", () => {
    const twin = (n: string): AssetEntry => ({ ...entryOf(["x", 10, 8, 10, 500]), name: n });
    const m = manifestOf({ simple: SIMPLE_ENTRIES.slice(0, 3), poly: ["A", "B", "C", "D"].map(twin) });
    const table: ModelChoice[] = [
      { slot: "building", pack: "poly", names: ["A", "B", "C", "D"] },
      { slot: "building", pack: "simple", fallback: true, names: SIMPLE_ENTRIES.slice(0, 3).map((e) => e.name) },
    ];
    const got = buildingPlan(buildingsOf(m, {}, table), []);
    // Four names, one family: below the threshold of four, so the fallback.
    expect(got.small).toEqual(SIMPLE_ENTRIES.slice(0, 3).filter((e) => lotTypeOf(e) === "small").map((e) => e.name));
  });

  it("keeps a POLYGON type that has no SIMPLE Town model to fall back to, however few its families", () => {
    const only = buildingsOf(manifestOf({ "town-pack": TOWN_ENTRIES }));
    const plan = buildingPlan(only);
    expect(plan.large.slice().sort()).toEqual(["SM_Bld_House_Preset_08", "SM_Bld_House_Preset_11"]);
    expect(plan.tall).toEqual([]);
  });
});

describe("with no POLYGON pack the town is exactly today's SIMPLE Town town (the CI case)", () => {
  // Today's table: SIMPLE Town's rows as they were before 048 (no fallback flag).
  const OLD_TABLE: ModelChoice[] = MODEL_TABLE.filter((r) => r.pack !== "town-pack").map((r) => {
    const { fallback: _f, ...rest } = r;
    return rest;
  });
  const oldModels = buildingsOf(SIMPLE_ONLY, BUILDING_FRONTS, OLD_TABLE);
  const oldPlan = buildingPlan(oldModels);
  const oldPicks = maps.map((m) => pickBuildings(m.town.lots, oldPlan, traitsOf(oldModels)));

  const same = (models: readonly PlannedModel[]): void => {
    const plan = buildingPlan(models);
    expect(plan).toEqual(oldPlan);
    maps.forEach((m, i) => expect(pickBuildings(m.town.lots, plan, traitsOf(models)), m.name).toEqual(oldPicks[i]));
  };

  it("pins today's plan: small has nine names (the rental store out), house sixteen, large nine, tall three", () => {
    expect(LOT_TYPE_NAMES.map((t) => oldPlan[t].length)).toEqual([9, 16, 9, 3]);
    expect(oldPlan.small).not.toContain("store_small_mesh");
  });

  it("gives the same plan and the same picks on every map when the manifest has no town-pack or city-pack", () => {
    same(buildingsOf(SIMPLE_ONLY));
  });

  it("gives the same plan and picks when the Town Pack is in the manifest and its GLB fails to load", async () => {
    const info: string[] = [];
    const set = await loadModels({
      fetchJson: async (): Promise<unknown> => BOTH,
      loadGlb: async (url) => {
        if (url.endsWith("town-pack.glb")) throw new Error("HTTP 404");
        const g = new Group();
        for (const e of SIMPLE_ENTRIES) {
          const n = new Group();
          n.name = e.name;
          g.add(n);
        }
        return g;
      },
      info: (m) => info.push(m),
    });
    expect(set.building!.some((m) => m.pack === "town-pack")).toBe(false);
    expect(info.some((m) => m.includes("town-pack.glb"))).toBe(true);
    same(set.building!);
  });
});

describe("variety on the POLYGON fixture (every map)", () => {
  const models = buildingsOf(BOTH);
  const plan = buildingPlan(models);
  const traits = traitsOf(models);
  const familyOf = (n: string): string => traits.get(n)!.family;
  const familiesIn = (t: LotType): number => new Set(plan[t].map(familyOf)).size;

  it("has at least three families in every type, four in small, house and large", () => {
    for (const t of LOT_TYPE_NAMES) expect(familiesIn(t), t).toBeGreaterThanOrEqual(3);
    for (const t of ["small", "house", "large"] as const) expect(familiesIn(t), t).toBeGreaterThanOrEqual(4);
  });

  it("is deterministic and leaves no lot bare", () => {
    for (const { name, town } of maps.filter((m) => /09-|56-/.test(m.name))) {
      const a = pickBuildings(town.lots, plan, traits);
      expect(pickBuildings(town.lots, plan, traits), name).toEqual(a);
      town.lots.forEach((l, i) => expect(a[i] === null || plan[l.type].includes(a[i]!), `${name} ${l.key}`).toBe(true));
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
    expect(pairs).toBeGreaterThan(1000);
  });

  it("does not bring a family back within STREET_REPEAT_GAP lots on one road side (types with more families than that)", () => {
    let checked = 0;
    for (const { name, town } of maps) {
      const names = pickBuildings(town.lots, plan, traits);
      const rows = new Map<string, number[]>();
      town.lots.forEach((l, i) => rows.set(`${l.street}:${l.side}`, [...(rows.get(`${l.street}:${l.side}`) ?? []), i]));
      for (const [k, row] of rows) {
        row.forEach((i, p) => {
          if (familiesIn(town.lots[i]!.type) <= STREET_REPEAT_GAP) return;
          for (let q = Math.max(0, p - STREET_REPEAT_GAP); q < p; q++) {
            checked++;
            expect(familyOf(names[i]!), `${name} ${k} lots ${q} and ${p}`).not.toBe(familyOf(names[row[q]!]!));
          }
        });
      }
    }
    expect(checked).toBeGreaterThan(1000);
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
});

describe("families never span packs, and no POLYGON model is a corner model unless named", () => {
  it("gives two entries with equal bounds and triangles in different packs different families", () => {
    const a = entryOf(["Alpha", 10, 8, 10, 500]);
    const b = entryOf(["Beta", 10, 8, 10, 500]);
    const table: ModelChoice[] = [
      { slot: "building", pack: "one", names: ["Alpha"] },
      { slot: "building", pack: "two", names: ["Beta"] },
    ];
    const got = buildingsOf(manifestOf({ one: [a], two: [b] }), {}, table);
    expect(got.map((p) => p.family)).toEqual(["Alpha", "Beta"]);
    // In one pack the same two are one family.
    const same = buildingsOf(manifestOf({ one: [a, b] }), {}, [{ slot: "building", pack: "one", names: ["Alpha", "Beta"] }]);
    expect(new Set(same.map((p) => p.family)).size).toBe(1);
  });

  it("plans no Town Pack model as a corner model", () => {
    for (const p of buildingsOf(BOTH).filter((m) => m.pack === "town-pack")) expect(p.corner, p.entry.name).toBe(false);
  });

  it("puts a POLYGON model flagged corner (open -x) only on a lot whose cornerSides has -x, never mid-row", () => {
    const key: CalibrationKey = "town-pack:SM_Bld_House_Preset_03";
    const fronts: FrontTable = { ...BUILDING_FRONTS, [key]: { front: "-x", corner: true, open: "-x" } };
    const models = buildingsOf(BOTH, fronts);
    expect(models.find((m) => m.entry.name === "SM_Bld_House_Preset_03")!.corner).toBe("-x");
    const plan = buildingPlan(models);
    expect(plan.house).toContain("SM_Bld_House_Preset_03");
    let placed = 0;
    for (const { name, town } of maps) {
      const picks = pickBuildings(town.lots, plan, traitsOf(models));
      town.lots.forEach((l, i) => {
        if (picks[i] !== "SM_Bld_House_Preset_03") return;
        placed++;
        expect(
          l.cornerSides.some((s) => s.side === "-x"),
          `${name} ${l.key}`,
        ).toBe(true);
      });
    }
    expect(placed).toBeGreaterThan(0);
  });
});
