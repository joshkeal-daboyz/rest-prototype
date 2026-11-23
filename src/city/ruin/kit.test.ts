/**
 * Ticket 073 F1, criterion 9 (X-5, dark and textured) and the kit table's shape. No GLB here: the table is pinned against the converted GLBs and the converter's textured lists by
 * `src/render3d/ruinpin.test.ts`, inside `it.skipIf`. Also the constants the ticket names, and the folder's purity (no other stage folder, no `bi`, `bj` or street `line`).
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CITY_RUIN_PIECE_KINDS, type CalibrationKey } from "../../core";
import { BAND_PARK_TREES, CELL_M, P_CLUMP, P_ROOF, P_SAPLING, P_TREE_VINE, P_VINE, REACH_FACTOR } from "./constants";
import {
  CLEAN_ROOF_BOUNDS,
  EDGE_KEYS,
  FERN_BUSH_KEYS,
  GIANT_KEY,
  HOST_BOUNDS,
  KIT,
  KIT_KEYS,
  LARGE_KEY,
  MOUND_KEY,
  OVERGROWTH_KEYS,
  ROOF_DEAD_KEYS,
  SAPLING_KEYS,
  TREE_KEYS,
  TREE_VINE_KEYS,
  VINE_DRAPES,
  VINE_KEYS,
  VINE_POST_KEY,
  VINE_SHEETS,
  ruinBounds,
  ruinCrownBounds,
  trunkOf,
  ruinIsTree,
  UNPICKED_KEYS,
} from "./kit";

const PACKS = ["apocalypse-ruin:SM_", "nature-pack:SM_", "palm-city-pack:SM_"];

describe("the kit table (X-8, X-5)", () => {
  it("holds the ticket's pieces: 8 overgrowth patches and the mound, 4 edge strips, 2 ferns and 2 bushes, 9 saplings (4 birches kept in the table, never picked), the giant and the large tree, 2 dead trees, 8 vines, 4 tree-vines", () => {
    expect(OVERGROWTH_KEYS).toHaveLength(8);
    expect(KIT[MOUND_KEY]!.kinds).toEqual(["patch"]);
    expect(EDGE_KEYS).toHaveLength(4);
    expect(FERN_BUSH_KEYS).toHaveLength(4);
    expect(SAPLING_KEYS).toHaveLength(5);
    expect(UNPICKED_KEYS.size).toBe(4);
    expect(Object.keys(KIT).filter((k) => KIT[k as CalibrationKey]!.kinds.includes("sapling"))).toHaveLength(9);
    expect(SAPLING_KEYS.map((k) => k.split("SM_")[1])).toEqual(["Tree_Round_01", "Tree_Round_02", "Tree_Round_03", "Tree_Round_04", "Tree_Round_05"]);
    expect(KIT[GIANT_KEY]!.kinds).toEqual(["park-tree"]);
    expect(KIT[LARGE_KEY]!.kinds).toEqual(["park-tree"]);
    expect(ROOF_DEAD_KEYS).toHaveLength(2);
    expect(VINE_KEYS).toHaveLength(8);
    expect(TREE_VINE_KEYS).toHaveLength(4);
    expect(KIT_KEYS.size).toBe(42);
  });

  it("every kind of CityRuinPieceKind has a key, and each key is a Nature, Apocalypse ruin or Palm City key", () => {
    for (const k of CITY_RUIN_PIECE_KINDS) expect(Object.values(KIT).some((e) => e.kinds.includes(k)), k).toBe(true);
    for (const k of Object.keys(KIT)) expect(PACKS.some((p) => k.startsWith(p)), k).toBe(true);
  });

  it("nothing is emissive, and the keys the ticket leaves out are absent: Plant_Bush_Leaves_03, Plant_Grass_01, Plant_PalmBush_01, Env_Overgrowth_03 and _10, the wall and sidewalk overgrowth, wrecks, logs, stumps, rubble, damaged road", () => {
    for (const e of Object.values(KIT)) expect(e.emissive).toBe(false);
    for (const k of Object.keys(KIT)) expect(k).not.toMatch(/Bush_Leaves_03|Plant_Grass_01|PalmBush|Overgrowth_03|Overgrowth_10|Overgrowth_Wall|Sidewalk_Overgrown|Car_|Wrecked|Tree_Log|Tree_Stump|Rubble|RoadPiece|Powerpole/);
    expect(KIT_KEYS.has("nature-pack:SM_Plant_Grass_01")).toBe(false);
  });

  it("the vines: 01, 04 and 05 are the flat sheets, 02, 03, 07 and 08 the drapes, 06 the post wrap, and 06 is in neither list a wall vine is chosen from", () => {
    expect(VINE_SHEETS.map((k) => k.slice(-2))).toEqual(["01", "04", "05"]);
    expect(VINE_DRAPES.map((k) => k.slice(-2))).toEqual(["02", "03", "07", "08"]);
    expect(VINE_POST_KEY.endsWith("Env_Vines_06")).toBe(true);
    expect([...VINE_SHEETS, ...VINE_DRAPES]).not.toContain(VINE_POST_KEY);
    for (const k of VINE_SHEETS) expect(KIT[k]!.d, k).toBeLessThan(0.8);
    for (const k of VINE_DRAPES) expect(KIT[k]!.d, k).toBeGreaterThan(2);
    expect(KIT[VINE_POST_KEY]).toMatchObject({ w: 0.638, h: 2.985, d: 0.624 });
  });

  it("every overgrowth patch fits a 5 m cell unscaled, and every piece a roof deck takes fits the 4.4 m deck", () => {
    for (const k of OVERGROWTH_KEYS) {
      expect(Math.max(KIT[k]!.w, KIT[k]!.d), k).toBeLessThanOrEqual(CELL_M);
      expect(Math.max(KIT[k]!.w, KIT[k]!.d), k).toBeLessThanOrEqual(CELL_M - 0.6);
    }
    for (const [k, e] of Object.entries(KIT)) if (e.kinds.includes("roof")) expect(Math.max(e.w, e.d), k).toBeLessThanOrEqual(CELL_M - 0.6);
  });

  it("the giant tree is pinned at 12.6 x 11.19 x 13.12, so its crown is 13.12 m across: a 6.56 m radius", () => {
    expect(KIT[GIANT_KEY]).toMatchObject({ w: 12.604, h: 11.192, d: 13.12 });
    expect(KIT[LARGE_KEY]).toMatchObject({ w: 9.298, h: 8.833, d: 5.422 });
    expect(Math.max(KIT[GIANT_KEY]!.w, KIT[GIANT_KEY]!.d) / 2).toBeCloseTo(6.56, 2);
  });

  it("ruinIsTree is true only for the keys F1 plants as trees: the birches, the round trees, the large and the giant; never a vine, a dead tree or a bush", () => {
    expect(TREE_KEYS.size).toBe(9 + 2);
    for (const k of Object.keys(KIT) as CalibrationKey[]) expect(ruinIsTree(k), k).toBe(/Tree_(Birch|Round|Large|Generic_Giant)/.test(k));
  });

  it("ruinBounds reads the table (width x, depth z, height) and knows no other key", () => {
    expect(ruinCrownBounds(GIANT_KEY)).toEqual({ x_m: 12.604, z_m: 13.12, h_m: 11.192 }); // the whole crown (what the reports read)
    expect(ruinBounds(GIANT_KEY)).toEqual({ x_m: 2.2, z_m: 2.2, h_m: 1.7 }); // the trunk square (what T-2 reads)
    expect(ruinBounds(VINE_POST_KEY)).toEqual(ruinCrownBounds(VINE_POST_KEY));
    expect(ruinBounds("city-pack:SM_Bld_Apartment_Roof_01")).toBeUndefined();
    expect(Object.keys(HOST_BOUNDS)).toHaveLength(6);
    expect(Object.keys(CLEAN_ROOF_BOUNDS)).toHaveLength(9 + 7 + 17); // H3's nine roof keys, its seven billboard faces, and H1c's seventeen large signs
  });
});

describe("the trunks (F1b3, criterion 1)", () => {
  it("every sapling and park-tree key has a trunk radius (above 0, under half its narrower bound) and a trunk height (above 0, under its height); no other key has one", () => {
    for (const [key, e] of Object.entries(KIT)) {
      const treeKey = e.kinds.includes("sapling") || e.kinds.includes("park-tree");
      expect(e.trunk !== undefined, key).toBe(treeKey);
      if (e.trunk === undefined) continue;
      expect(e.trunk.r_m, key).toBeGreaterThan(0);
      expect(e.trunk.r_m, key).toBeLessThan(Math.min(e.w, e.d) / 2);
      expect(e.trunk.top_m, key).toBeGreaterThan(0);
      expect(e.trunk.top_m, key).toBeLessThan(e.h);
    }
  });

  it("pins the values (read from the GLBs 22 Nov 2026: the trunk primitive's widest extent below the lowest leaf vertex; the five round trees and the large tree are conservative, measured false)", () => {
    const want: Record<string, [number, number, boolean]> = {
      Tree_Birch_01: [0.11, 1.02, true],
      Tree_Birch_02: [0.1, 0.22, true],
      Tree_Birch_03: [0.09, 1.29, true],
      Tree_Birch_04: [0.11, 1.43, true],
      Tree_Round_01: [0.35, 1.5, false],
      Tree_Round_02: [0.35, 1.5, false],
      Tree_Round_03: [0.3, 1.5, false],
      Tree_Round_04: [0.3, 1.5, false],
      Tree_Round_05: [0.35, 1.5, false],
      Tree_Generic_Giant_01: [1.1, 1.7, true],
      Tree_Large_01: [1.65, 2.0, false],
    };
    for (const [name, [r, top, measured]] of Object.entries(want)) expect(trunkOf(`nature-pack:SM_${name}`), name).toEqual({ r_m: r, top_m: top, measured });
    expect(() => trunkOf(VINE_POST_KEY)).toThrow();
  });
});

describe("the named numbers", () => {
  it("are the ticket's: the reach factor 3, clump 0.9, sapling 0.3, roof 0.3, vine 0.5, tree-vine 0.3 of wild, the park trees from 1/3", () => {
    expect(REACH_FACTOR).toBe(3);
    expect([P_CLUMP, P_SAPLING, P_ROOF, P_VINE, P_TREE_VINE]).toEqual([0.9, 0.3, 0.3, 0.5, 0.3]);
    expect(BAND_PARK_TREES).toBeCloseTo(1 / 3, 12);
  });
});

describe("the folder is pure (X-1, X-8, R-6)", () => {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "fixtures.ts" && f !== "testcities.ts");
  it("no file imports another stage folder, three, the DOM or a file reader, and none reads bi, bj or a street's line", () => {
    for (const f of files) {
      const src = readFileSync(dir + f, "utf8");
      for (const m of src.matchAll(/from "([^"]+)"/g)) {
        const spec = m[1]!;
        expect(spec.startsWith("./") || spec.startsWith("../../core") || spec.startsWith("../pipeline/"), `${f} imports ${spec}`).toBe(true);
      }
      expect(src, f).not.toMatch(/Math\.random|Date\.now|performance\.now|document\.|window\.|node:fs/);
      expect(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""), f).not.toMatch(/\.bi\b|\.bj\b|\.line\b/);
    }
  });
});
