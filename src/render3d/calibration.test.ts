/**
 * Ticket 045 A: the pack:name keys, the dev-only loader of the saved calibration file and its merge with the code's tables.
 * No WebGL, no network, no real file: the loader is driven by a fake `fetchJson`.
 */

import { describe, expect, it, vi } from "vitest";
import { ASSET_MANIFEST_VERSION, CALIBRATION_FILE, applyCalibrationPatch, calibrationKey, type AssetEntry, type AssetManifest, type CalibrationFile, type CalibrationKey } from "../core";
import { effectiveFronts, loadSavedCalibration, type FrontTables } from "./calibration";
import { galleryEntries } from "./gallery";
import { BUILDING_EXCLUDE, BUILDING_FRONTS, buildingPlan, planModels, type BuildingFront, type FrontTable, type ModelChoice } from "./models";

const NOW = new Date("2026-11-18T10:00:00.000Z");
const save = (patches: { key: CalibrationKey; entry: { front?: "+z" | "-z" | "+x" | "-x"; exclude?: true } | null }[]): CalibrationFile => {
  let file: CalibrationFile | null = null;
  for (const p of patches) file = applyCalibrationPatch(file, p, NOW);
  return file!;
};

describe("the re-key: BUILDING_FRONTS is the 043 B table with simple-town: in front, values unchanged", () => {
  const NZ: BuildingFront = { front: "-z" };
  // The table as it stood before ticket 045 (bare names), spelled out.
  const OLD: Record<string, BuildingFront> = {
    Building_Shop_01: NZ,
    Building_Shop_02: NZ,
    Building_Shop_03: NZ,
    Building_Shop_04: NZ,
    Building_Shop_05: NZ,
    Building_BaberShop: NZ,
    Building_Gym: NZ,
    store_small_mesh: { front: "+z" },
    store_corner_mesh: { front: "-z", corner: true, open: "-x" },
    apartment_small_mesh: NZ,
    Building_House_01: NZ,
    Building_House_02: NZ,
    Building_House_03: NZ,
    Building_House_04: NZ,
    Building_House_09: NZ,
    Building_House_010: NZ,
    Building_House_011: NZ,
    Building_House_012: NZ,
    Building_House_013: NZ,
    Building_House_014: NZ,
    Building_House_015: NZ,
    Building_Garage_01: NZ,
    Building_Garage_02: NZ,
    Building_Garage_03: NZ,
    office_small_mesh: NZ,
    house_mesh: NZ,
    Building_House_05: NZ,
    Building_House_06: NZ,
    Building_House_07: NZ,
    Building_House_08: NZ,
    Building_AutoRepair: NZ,
    Building_StripClub: NZ,
    Building_PoliceStation: NZ,
    Building_PetrolStation: NZ,
    Building_CoffeeShop: NZ,
    apartment_large_mesh: NZ,
    office_medium_mesh: NZ,
    office_large_mesh: NZ,
    memorial_mesh: { front: "+z" },
  };

  it("has exactly the old lines, each key prefixed simple-town:, each value the same", () => {
    const want = Object.fromEntries(Object.entries(OLD).map(([n, v]) => [`simple-town:${n}`, v]));
    // Ticket 048 added the Town Pack's lines (checked in polygon.test.ts); SIMPLE Town's are exactly the old ones.
    const simple = Object.fromEntries(Object.entries(BUILDING_FRONTS).filter(([k]) => k.startsWith("simple-town:")));
    expect(simple).toEqual(want);
    expect(Object.keys(simple)).toHaveLength(39);
  });

  it("excludes only the video rental store in BUILDING_EXCLUDE (ticket 047)", () => {
    expect(BUILDING_EXCLUDE).toEqual(["simple-town:store_small_mesh"]);
  });
});

// ---- two packs, one name ----

function entry(name: string, w = 10, h = 10, d = 10): AssetEntry {
  return { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles: 100, textures: [], missingTextures: [], warnings: [] };
}
const TWO_PACKS: AssetManifest = {
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: [
    { pack: "city-pack", glb: "city-pack.glb", atlas: null, assets: [entry("SM_Bld_Shop_01", 10, 10, 11), entry("SM_Bld_Only_City", 10, 10, 11)], failures: [] },
    { pack: "town-pack", glb: "town-pack.glb", atlas: null, assets: [entry("SM_Bld_Shop_01", 10, 10, 11)], failures: [] },
  ],
};
const TWO_TABLE: readonly ModelChoice[] = [
  { slot: "building", pack: "city-pack", names: ["SM_Bld_Shop_01"] },
  { slot: "building", pack: "town-pack", names: ["SM_Bld_Shop_01"] },
];

describe("two packs, one name", () => {
  const fronts: FrontTable = { "city-pack:SM_Bld_Shop_01": { front: "+x" }, "town-pack:SM_Bld_Shop_01": { front: "-z" } };

  it("planModels gives each pack's SM_Bld_Shop_01 its own front", () => {
    const plan = planModels(TWO_PACKS, TWO_TABLE, fronts).building!;
    expect(plan.map((p) => [p.pack, p.front])).toEqual([
      ["city-pack", "+x"],
      ["town-pack", "-z"],
    ]);
  });

  it("galleryEntries gives each pack's entry its own front, and marks only the pack with a line as not guessed", () => {
    const city = galleryEntries(TWO_PACKS, "city-pack", fronts, [], TWO_TABLE);
    const town = galleryEntries(TWO_PACKS, "town-pack", fronts, [], TWO_TABLE);
    expect(city.find((g) => g.entry.name === "SM_Bld_Shop_01")!.front).toBe("+x");
    expect(town.find((g) => g.entry.name === "SM_Bld_Shop_01")!.front).toBe("-z");
    expect(city.find((g) => g.entry.name === "SM_Bld_Shop_01")!.guessed).toBe(false);
    expect(city.find((g) => g.entry.name === "SM_Bld_Only_City")!.guessed).toBe(true);
  });

  it("a line for one pack's name does not list or turn the other pack's", () => {
    const only: FrontTable = { "city-pack:SM_Bld_Shop_01": { front: "+x" } };
    const town = galleryEntries(TWO_PACKS, "town-pack", only, [], []);
    expect(town.every((g) => g.entry.name !== "SM_Bld_Shop_01" || g.guessed)).toBe(true);
    expect(planModels(TWO_PACKS, TWO_TABLE, only).building!.map((p) => p.front)).toEqual(["+x", "+z"]);
  });

  it("excludes by pack:name, so the other pack's model of that name stays", () => {
    const plan = planModels(TWO_PACKS, TWO_TABLE, fronts).building!;
    const left = buildingPlan(plan, ["city-pack:SM_Bld_Shop_01"]);
    expect(Object.values(left).flat()).toHaveLength(1);
    expect(galleryEntries(TWO_PACKS, "town-pack", fronts, ["city-pack:SM_Bld_Shop_01"], TWO_TABLE)[0]!.excluded).toBe(false);
    expect(galleryEntries(TWO_PACKS, "city-pack", fronts, ["city-pack:SM_Bld_Shop_01"], TWO_TABLE).find((g) => g.entry.name === "SM_Bld_Shop_01")!.excluded).toBe(true);
  });
});

// ---- the merge ----

const deepFreeze = <T>(v: T): T => {
  if (typeof v === "object" && v !== null && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const c of Object.values(v)) deepFreeze(c);
  }
  return v;
};

describe("effectiveFronts", () => {
  const code: FrontTables = {
    fronts: {
      "simple-town:Building_Gym": { front: "-z" },
      "simple-town:store_corner_mesh": { front: "-z", corner: true, open: "-x" },
    },
    exclude: ["simple-town:memorial_mesh"],
  };

  it("with no saved file, deep-equals the code's tables (and the shipped ones)", () => {
    expect(effectiveFronts(code, null)).toEqual(code);
    expect(effectiveFronts({ fronts: BUILDING_FRONTS, exclude: BUILDING_EXCLUDE }, null)).toEqual({ fronts: BUILDING_FRONTS, exclude: BUILDING_EXCLUDE });
  });

  it("a saved front replaces only the front: a corner model keeps corner and open, and one info line says its open side is not recalibrated", () => {
    const info = vi.fn();
    const saved = save([
      { key: "simple-town:Building_Gym", entry: { front: "+x" } },
      { key: "simple-town:store_corner_mesh", entry: { front: "+z" } },
    ]);
    const out = effectiveFronts(code, saved, info);
    expect(out.fronts["simple-town:Building_Gym"]).toEqual({ front: "+x" });
    expect(out.fronts["simple-town:store_corner_mesh"]).toEqual({ front: "+z", corner: true, open: "-x" });
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0]![0]).toContain("simple-town:store_corner_mesh");
    expect(info.mock.calls[0]![0]).toContain("not recalibrated");
  });

  it("is quiet when a corner model's saved front is the code's", () => {
    const info = vi.fn();
    effectiveFronts(code, save([{ key: "simple-town:store_corner_mesh", entry: { front: "-z" } }]), info);
    expect(info).not.toHaveBeenCalled();
  });

  it("adds a saved key the code lacks", () => {
    const out = effectiveFronts(code, save([{ key: "city-pack:SM_Bld_Shop_01", entry: { front: "-x" } }]));
    expect(out.fronts["city-pack:SM_Bld_Shop_01"]).toEqual({ front: "-x" });
    expect(Object.keys(out.fronts)).toHaveLength(3);
  });

  it("a saved exclude: true lands in exclude, with or without a front, once", () => {
    const saved = save([
      { key: "simple-town:Building_Gym", entry: { exclude: true } },
      { key: "city-pack:SM_Bld_Shop_01", entry: { front: "+x", exclude: true } },
      { key: "simple-town:memorial_mesh", entry: { exclude: true } },
    ]);
    const out = effectiveFronts(code, saved);
    expect(out.exclude).toEqual(["simple-town:memorial_mesh", "city-pack:SM_Bld_Shop_01", "simple-town:Building_Gym"]);
    // An exclude-only entry changes no front.
    expect(out.fronts["simple-town:Building_Gym"]).toEqual({ front: "-z" });
    expect(out.fronts["city-pack:SM_Bld_Shop_01"]).toEqual({ front: "+x" });
  });

  it("does not change its inputs", () => {
    const frozen = deepFreeze({ fronts: structuredClone(code.fronts), exclude: [...code.exclude] });
    const saved = deepFreeze(save([{ key: "simple-town:Building_Gym", entry: { front: "+x", exclude: true } }]));
    const before = JSON.stringify([frozen, saved]);
    const out = effectiveFronts(frozen, saved);
    expect(JSON.stringify([frozen, saved])).toBe(before);
    expect(out.fronts).not.toBe(frozen.fronts);
    expect(out.exclude).not.toBe(frozen.exclude);
  });
});

// ---- the dev loader ----

describe("loadSavedCalibration", () => {
  const FILE = save([{ key: "city-pack:SM_Bld_Shop_01", entry: { front: "-x" } }]);

  it("makes no fetch with dev false", async () => {
    const fetchJson = vi.fn();
    expect(await loadSavedCalibration({ dev: false, fetchJson })).toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("in dev fetches the file under the base with cache: no-store and returns it when valid", async () => {
    const fetchJson = vi.fn(async () => structuredClone(FILE) as unknown);
    const info = vi.fn();
    const out = await loadSavedCalibration({ dev: true, fetchJson, info, base: "/rest/" });
    expect(out).toEqual(FILE);
    expect(fetchJson).toHaveBeenCalledTimes(1);
    expect(fetchJson).toHaveBeenCalledWith(`/rest/${CALIBRATION_FILE}`, { cache: "no-store" });
    expect(info).not.toHaveBeenCalled();
  });

  it("is quiet when the file is absent: a 404, a network error, a page that is not JSON", async () => {
    for (const why of ["HTTP 404", "Failed to fetch", "Unexpected token < in JSON"]) {
      const info = vi.fn();
      const out = await loadSavedCalibration({ dev: true, fetchJson: async () => Promise.reject(new Error(why)), info, base: "/" });
      expect(out, why).toBeNull();
      expect(info, why).not.toHaveBeenCalled();
    }
  });

  it("is null with one info line naming the first error when the file is invalid", async () => {
    for (const bad of [{ version: 2, savedAt: FILE.savedAt, entries: {} }, { ...FILE, entries: { "city-pack:x": { at: FILE.savedAt } } }, "not an object", null]) {
      const info = vi.fn();
      const out = await loadSavedCalibration({ dev: true, fetchJson: async () => bad as unknown, info, base: "/" });
      expect(out).toBeNull();
      expect(info).toHaveBeenCalledTimes(1);
      expect(String(info.mock.calls[0]![0])).toContain(CALIBRATION_FILE);
    }
  });

  it("never rejects, even when fetchJson throws at once", async () => {
    const out = await loadSavedCalibration({
      dev: true,
      fetchJson: () => {
        throw new Error("boom");
      },
      info: () => {},
      base: "/",
    });
    expect(out).toBeNull();
  });

  it("calibrationKey spells the key the file uses", () => {
    expect(calibrationKey("city-pack", "SM_Bld_Shop_01")).toBe("city-pack:SM_Bld_Shop_01");
  });
});
