/**
 * Ticket 053: the automatic half of the reference checklist (R1 to R12, chapter 16 of docs/city-style-guide.md). `cityMetrics` counts what the town plan holds, and each item
 * is checked against `CITY_CHECK` on the three maps of the evaluation protocol; every threshold is also shown to fail on a plan made to break it. No WebGL: the GLBs are fake
 * groups, every size is typed in as a number copied from the converted City Pack manifest (18 Nov 2026), the maps are the repo's own puzzles. Nothing here reads assets/private/,
 * no timer, no wall-clock wait, no path but `puzzles/`.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationKey, type Puzzle } from "../core";
import { CITY_ATM_BLOCKS_MIN, CITY_CHECK, CITY_NEVER_USED, CITY_STOREYS, cityMetrics, evaluateCity, isNeverUsed, runBlocks, type CityExtra, type CityMetrics, type CityTown } from "./citymetrics";
import { assignColourways } from "./colourway";
import { dressKeys, dressTown, type DressPiece } from "./dressing";
import { alleyOf, furnitureKeys, furnitureLayout, type Alley, type FurnitureInput, type FurniturePiece, type Rect } from "./furniture";
import { dropLayout, wireLayout } from "./layout";
import { WORLD_PER_METRE } from "./models";
import { allStackKeys, applyModels, avoidBoxOf, dressInput, dressSites, loadModels, stackInput, type DressPlacement, type ModelSet } from "./models3d";
import { buildScene } from "./scene";
import { STACK_STYLES, stackKeys } from "./stacks";
import { ALLEY_MAX_M, ALLEY_MIN_M, packTown, type PackResult } from "./terrace";
import { stubTextSurface } from "./text";
import { townLayout, type TerraceRun } from "./town";

// ---- fixture: [name, width, height, depth] in metres, centred bounds ----
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
  // dressing
  ["SM_Bld_Cover_01", 4.832, 1.075, 1.0],
  ["SM_Bld_Cover_02", 1.366, 0.974, 0.701],
  ["SM_Bld_FireEscape_01", 3.251, 1.492, 1.644],
  ["SM_Bld_FireEscape_02", 3.251, 3.609, 1.644],
  ["SM_Bld_FireEscape_03", 4.252, 3.802, 1.76],
  ["SM_Bld_Roof_Access_01", 2.758, 2.744, 2.851],
  ["SM_Bld_Shop_01_Glass", 4.891, 1.863, 0.323],
  ["SM_Bld_Shop_02_Glass", 4.311, 2.513, 0],
  ["SM_Bld_Shop_03_Glass", 8.738, 2.211, 0.293],
  ["SM_Bld_Shop_04_Glass", 4.765, 2.442, 0.705],
  ["SM_Bld_Shop_05_Glass", 4.817, 2.017, 0.054],
  ["SM_Bld_Shop_Corner_01_Glass", 4.809, 1.698, 4.787],
  ["SM_Bld_Shop_Corner_02_Glass", 4.729, 2.189, 4.729],
  ["SM_Bld_Shop_Cover_01", 4.574, 0.297, 2.815],
  ["SM_Bld_Shop_Cover_02", 4.706, 1.202, 3.235],
  ["SM_Bld_Shop_Cover_03", 5.0, 1.758, 3.501],
  ["SM_Bld_Shop_Cover_04", 5.104, 0.663, 0.732],
  ["SM_Bld_Shop_Cover_05", 5.394, 0.682, 5.394],
  ["SM_Prop_ATM_01", 1.128, 1.537, 0.519],
  ["SM_Prop_Aircon_01", 0.823, 0.995, 0.651],
  ["SM_Prop_Billboard_Roof_01", 4.428, 3.063, 1.611],
  ...(["01", "02", "03", "04", "05", "06", "07"].map((n) => [`SM_Prop_Billboard_Sign_${n}`, 4.193, 2.028, 0.118]) as [string, number, number, number][]),
  ["SM_Prop_LargeSign_Beer_01", 2.005, 3.333, 2.019],
  ["SM_Prop_LargeSign_Bottle_01", 1.8, 5.818, 1.8],
  ["SM_Prop_LargeSign_BowlingBall_01", 3.019, 3.174, 3.174],
  ["SM_Prop_LargeSign_BowlingPin_01", 1.631, 5.156, 1.631],
  ["SM_Prop_LargeSign_Burger_01", 3.715, 2.178, 3.717],
  ["SM_Prop_LargeSign_Coffee_01", 2.194, 1.346, 1.625],
  ["SM_Prop_LargeSign_Donut_01", 3.818, 1.355, 3.818],
  ["SM_Prop_LargeSign_Guitar_01", 2.098, 6.378, 0.377],
  ["SM_Prop_LargeSign_Hotdog_01", 1.411, 1.143, 3.926],
  ["SM_Prop_LargeSign_Icecream_01", 1.93, 5.04, 1.93],
  ["SM_Prop_LargeSign_Lollypop_01", 3.365, 6.36, 0.512],
  ["SM_Prop_LargeSign_Milkshake_01", 2.238, 4.699, 1.721],
  ["SM_Prop_LargeSign_Noodles_01", 2.948, 3.601, 2.515],
  ["SM_Prop_LargeSign_Pizza_01", 3.368, 0.562, 2.957],
  ["SM_Prop_LargeSign_Popcorn_01", 1.737, 2.797, 1.737],
  ["SM_Prop_LargeSign_Soda_01", 1.915, 5.595, 1.915],
  ["SM_Prop_LargeSign_Taco_01", 1.215, 2.223, 3.701],
  ["SM_Prop_PlanterWindow_01", 0.988, 0.743, 0.37],
  ["SM_Prop_PlanterWindow_02", 0.87, 0.743, 0.332],
  ["SM_Prop_Roof_Aircon_01", 0.948, 0.592, 0.467],
  ["SM_Prop_Roof_Aircon_02", 1.586, 1.073, 0.798],
  ["SM_Prop_Roof_Aircon_03", 1.546, 1.05, 1.0],
  ["SM_Prop_SatDish_01", 1.21, 1.344, 0.682],
  ["SM_Prop_Sign_Bar_01", 1.327, 0.673, 0.138],
  ["SM_Prop_Sign_Barber_01", 0.316, 0.948, 0.474],
  ["SM_Prop_Sign_Cafe_01", 1.347, 0.553, 0.11],
  ["SM_Prop_Sign_Chinese_Noodles_01", 0.853, 0.507, 0.179],
  ["SM_Prop_Sign_DeliPizza_01", 0.301, 1.551, 0.14],
  ["SM_Prop_Sign_Entrance_01", 1.0, 0.436, 0.063],
  ["SM_Prop_Sign_Hotel_01", 1.267, 3.801, 0.3],
  ["SM_Prop_Sign_Pizza_01", 2.211, 0.704, 0.144],
  ["SM_Prop_Sign_Pub_01", 1.13, 0.547, 0.112],
  ["SM_Prop_Vents_Exhaust_01", 0.868, 1.63, 2.727],
  ["SM_Prop_Vents_Straight_01", 0.868, 0.803, 2.5],
  ["SM_Prop_Water_Tower_01", 2.42, 5.509, 2.419],
];

/** The furniture's own sizes: [name, width, height, depth] in metres (the converted manifest, 18 Nov 2026). `ParkingLines` is a flat tile: height 0. */
const FURN_SIZES: [string, number, number, number][] = [
  ["SM_Prop_Trashbin_01", 0.647, 1.178, 0.647],
  ["SM_Prop_Trashbin_02", 0.721, 1.595, 0.582],
  ["SM_Prop_Planter_01", 2.301, 0.81, 0.701],
  ["SM_Prop_Planter_02", 1.511, 0.782, 0.463],
  ["SM_Prop_PotPlant_01", 0.565, 0.797, 0.578],
  ["SM_Prop_PotPlant_02", 0.694, 1.555, 0.639],
  ["SM_Prop_ParkBench_01", 2.079, 1.048, 0.624],
  ["SM_Prop_Mailbox_01", 0.666, 1.216, 0.586],
  ["SM_Prop_Newspaper_02", 0.613, 1.172, 0.478],
  ["SM_Prop_ParkingMeter_01", 0.225, 1.455, 0.128],
  ["SM_Prop_Hydrant_01", 0.551, 1.053, 0.54],
  ["SM_Env_Tree_01", 1.866, 4.208, 2.511],
  ["SM_Env_Tree_02", 2.236, 4.676, 1.54],
  ["SM_Env_Tree_03", 2.217, 3.845, 1.894],
  ["SM_Prop_SidewalkPoles_02", 0.209, 1.124, 0.209],
  ["SM_Prop_BusStop_01", 4.511, 3.073, 1.571],
  ["SM_Env_Road_ParkingLines_01", 10, 0, 5],
  ["SM_Prop_Barrier_01", 1.435, 0.983, 0.664],
  ["SM_Prop_ParkingMeter_02", 0.772, 1.869, 0.526],
  ["SM_Prop_Billboard_Pole_01", 0.606, 6.897, 0.606],
  ["SM_Prop_Billboard_01", 4.428, 2.345, 0.82],
  ["SM_Env_Sidewalk_Panel_02", 5, 0.094, 5],
  ["SM_Prop_PicnicTable_01", 2.483, 1.008, 1.687],
  ["SM_Prop_Umbrella_01", 1.597, 1.349, 1.597],
  ["SM_Prop_HotdogStand_01", 2.961, 3.662, 2.393],
];
const entryOf = ([name, w, h, d]: [string, number, number, number], i: number): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles: 100 + i,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const manifestOf = (assets: AssetEntry[], pack = "city-pack"): AssetManifest => ({
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: [{ pack, glb: `${pack}.glb`, atlas: null, assets, failures: [] }],
});

const ALL = [...SIZES, ...FURN_SIZES].map(entryOf);
const ENTRIES = new Map<CalibrationKey, AssetEntry>(ALL.map((e) => [`city-pack:${e.name}` as CalibrationKey, e]));
const KEYWORDS: ReadonlySet<string> = new Set([...dressKeys(), ...furnitureKeys()].map((k) => k.slice("city-pack:".length)));

const GLOWING = new MeshStandardMaterial({ color: 0x888888, emissive: 0xffffff, emissiveIntensity: 1 });
const BOX = new BoxGeometry(1, 1, 1);
const PLAIN = new MeshStandardMaterial({ color: 0x888888 });
const LIT = "SM_Prop_Sign_Pizza_01";

/** A GLB's scene: an empty node per stack piece, a one-box mesh node per dressing or furniture key (the pizza sign's material carries emission, which the drawing must strip). */
function glbOf(manifest: AssetManifest): Group {
  const g = new Group();
  for (const e of manifest.packs[0]?.assets ?? []) {
    const n = new Group();
    n.name = e.name;
    if (KEYWORDS.has(e.name)) n.add(new Mesh(BOX, e.name === LIT ? GLOWING : PLAIN));
    g.add(n);
  }
  return g;
}

const SET: ModelSet = await loadModels({
  fetchJson: async (): Promise<unknown> => manifestOf(ALL),
  loadGlb: async () => glbOf(manifestOf(ALL)),
  stackKeys: allStackKeys(),
  dressKeys: [...dressKeys(), ...furnitureKeys()],
  info: () => {},
});
const STACKS = stackInput(SET)!;
const DRESS = dressInput(SET)!;

const W = WORLD_PER_METRE;
const loadMap = (file: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));
/** The protocol's maps: the 050 to 052 test map, the largest town and the smallest. */
const MAPS = ["09-shrine-circuit", "64-the-whole-chain", "01-first-light"] as const;
const LARGEST = "64-the-whole-chain";

interface Plan {
  town: CityTown;
  packed: Map<string, PackResult>;
  dressing: DressPiece[][];
  furniture: FurniturePiece[];
  extra: CityExtra;
}

/** A whole map the way the game plans it (`applyModels`): packed terraces, their dressing, the furniture on the pavements, from the pure parts alone. */
const plans = new Map<string, Plan>();
function planOf(file: string): Plan {
  const hit = plans.get(file);
  if (hit) return hit;
  const puzzle = loadMap(file);
  const town = townLayout(puzzle);
  const packed = packTown({ terraces: town.terraces, lots: town.lots }, STACK_STYLES, STACKS.entries, STACKS.fronts);
  const list = runBlocks(town.terraces, packed);
  const sites = dressSites(list.map((x) => x.block), [], town.lots);
  const dressing = dressTown(sites, DRESS.entries, DRESS.fronts).map((x) => [...x]);
  const placements: DressPlacement[] = sites.flatMap((s, i) => dressing[i]!.map((piece) => ({ frame: s.frame, piece })));
  const runs = town.terraces.filter((r) => (packed.get(r.id)?.blocks.length ?? 0) > 0);
  const alleys = new Map<string, Alley>();
  for (const r of runs) {
    const res = packed.get(r.id)!;
    const a = alleyOf(r, res.blocks[res.blocks.length - 1]?.lot ?? null, res.farGap_m, res.farOverhang_m, ALLEY_MIN_M, ALLEY_MAX_M);
    if (a) alleys.set(r.id, a);
  }
  const wire = wireLayout(puzzle);
  const bbox = (pts: readonly { x: number; z: number }[]): Rect => ({ minX: Math.min(...pts.map((p) => p.x)), minZ: Math.min(...pts.map((p) => p.z)), maxX: Math.max(...pts.map((p) => p.x)), maxZ: Math.max(...pts.map((p) => p.z)) });
  const keepPoints = [...puzzle.nodes.map((n) => ({ x: n.pos[0], z: n.pos[1] })), ...wire.flatMap((r) => r.attach.map((a) => ({ x: a.x, z: a.z })))];
  const keepSegments = dropLayout(town, wire).map((d) => [{ x: d.from.x, z: d.from.z }, { x: d.to.x, z: d.to.z }] as const);
  const keepRects = town.pads.map((p) => bbox(p.pts));
  const wireRects = wire.flatMap((r) => r.spans.map((sp) => bbox(sp)));
  const input: FurnitureInput = {
    runs,
    lots: town.lots,
    openLots: town.openLots,
    alleys,
    keepPoints,
    keepSegments: keepSegments.map(([a, b]) => [a, b] as [typeof a, typeof b]),
    keepRects,
    wireRects,
    avoid: placements.filter((p) => p.piece.slot !== "glass").map(avoidBoxOf),
  };
  const furniture = furnitureLayout(input, DRESS.entries, DRESS.fronts);
  const plan: Plan = { town, packed, dressing, furniture, extra: { keep: { points: keepPoints, segments: keepSegments, rects: keepRects, wireRects } } };
  plans.set(file, plan);
  return plan;
}
const metricsOf = (file: string, over: Partial<Plan> = {}): CityMetrics => {
  const p = { ...planOf(file), ...over };
  return cityMetrics(p.town, p.packed, p.dressing, p.furniture, p.extra);
};


const verdictOf = (m: CityMetrics, file: string = "09-shrine-circuit") => evaluateCity(m, { largestMap: file === LARGEST });
const failing = (m: CityMetrics, file?: string): string[] => verdictOf(m, file).filter((v) => !v.pass).map((v) => v.id);

describe("the thresholds", () => {
  it("name R1 to R13 once each, with the numbers the guide pins", () => {
    expect(Object.keys(CITY_CHECK)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12", "R13"]);
    expect(evaluateCity(metricsOf("09-shrine-circuit")).map((v) => v.id)).toEqual(Object.keys(CITY_CHECK));
    expect(CITY_STOREYS).toEqual({ min: 3, max: 5 });
    expect(CITY_ATM_BLOCKS_MIN).toBeGreaterThan(0);
  });
});

describe("every automatic item holds on the three maps of the protocol", () => {
  for (const file of MAPS) {
    it(`${file}: R1 to R12 meet CITY_CHECK on the plan the game stands, and the plan is not empty`, () => {
      const m = metricsOf(file);
      expect(failing(m, file), `${file} ${JSON.stringify(verdictOf(m, file))}`).toEqual([]);
      // Not vacuous: a town of blocks, dressing and furniture.
      expect(m.runs, file).toBeGreaterThan(20);
      expect(m.blocks, file).toBeGreaterThan(50);
      expect(m.dressPieces, file).toBeGreaterThan(m.blocks * 5);
      expect(m.furniturePieces, file).toBeGreaterThan(100);
      expect(m.neighbourPairs, file).toBeGreaterThan(30);
      // R1: neighbours abut, and the far gap is a seam, an alley or a wider gap, never a slit.
      expect(m.maxNeighbourGap_m, file).toBeLessThan(1e-6);
      expect(m.farGaps.slit, file).toBe(0);
      expect(m.farGaps.seam + m.farGaps.alley + m.farGaps.wide, file).toBe(m.runs);
      // R2: all three of 3, 4 and 5 storeys are there.
      for (const n of [3, 4, 5]) expect(m.storeys[n] ?? 0, `${file} ${n} storeys`).toBeGreaterThan(5);
      // R3: every block has one door bay at most and no ground piece that is not a shop.
      expect(m.groundBaysOther, file).toBe(0);
      expect(m.maxDoorBaysPerBlock, file).toBe(1);
      // R9: corner blocks exist, and every one is on a true corner.
      expect(m.cornerBlocks, file).toBeGreaterThan(5);
      expect(m.cornerBlocksOffCorner, file).toBe(0);
      // R10: furniture is not a wall: about one item every 8 m of frontage, never more than one every 5.
      expect(m.furniturePer10m, file).toBeGreaterThan(0.5);
      expect(m.furniturePer10m, file).toBeLessThan(2);
      // R12: nothing from the never-used list.
      expect(m.excludedKeysUsed, file).toBe(0);
    });
  }

  it("R11: the largest map has a parking lot and a plaza, at most one of each kind to a run", () => {
    const m = metricsOf(LARGEST);
    expect(m.parkingLots).toBeGreaterThanOrEqual(CITY_CHECK.R11);
    expect(m.plazas).toBeGreaterThanOrEqual(CITY_CHECK.R11);
    expect(m.maxParkingPerRun).toBeLessThanOrEqual(1);
    expect(m.maxPlazaPerRun).toBeLessThanOrEqual(1);
  });

  it("is deterministic: the same map gives the same numbers", () => {
    plans.delete("09-shrine-circuit");
    const first = metricsOf("09-shrine-circuit");
    plans.delete("09-shrine-circuit");
    expect(metricsOf("09-shrine-circuit")).toEqual(first);
  });

  it("R12: the drawn dressing and furniture of a map carry no emissive material (the fixture's pizza sign glows in its GLB and the drawing strips it), and the pure plan is the game's", () => {
    const file = "09-shrine-circuit";
    const bundle = buildScene(loadMap(file), { text: stubTextSurface });
    const applied = applyModels(bundle, SET);
    const count = (name: string): number => {
      let n = 0;
      bundle.scene.getObjectByName(name)?.traverse((o) => {
        const mesh = o as InstancedMesh;
        if (!mesh.isInstancedMesh) return;
        for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          const std = mat as MeshStandardMaterial;
          if (std.emissive.getHex() !== 0 || (std.emissiveMap ?? null) !== null) n++;
        }
      });
      return n;
    };
    expect(bundle.scene.getObjectByName("city-dressing"), "the dressing was drawn").toBeDefined();
    const emissive = count("city-dressing") + count("city-furniture");
    expect(GLOWING.emissive.getHex(), "the cached model's own material glows").toBe(0xffffff);
    expect(emissive).toBe(0);
    const plan = planOf(file);
    expect(failing(cityMetrics(plan.town, plan.packed, plan.dressing, plan.furniture, { ...plan.extra, emissiveMaterials: emissive }), file)).toEqual([]);
    // The pure plan is the game's: the same blocks and the same dressing.
    expect(applied.terrace.length).toBe(runBlocks(plan.town.terraces, plan.packed).length);
    // Ticket 062 B: a block whose lifted ground pieces would reach a window is drawn with its ground row assembled again within a sill band, which has other ground dressing. On every block that was not,
    // the dressing drawn is the plan's.
    const key = (f: { x: number; z: number }): string => `${f.x.toFixed(6)},${f.z.toFixed(6)}`;
    const ground = (s: { pieces: readonly { role: string; key: string }[] }): string => s.pieces.filter((p) => p.role === "base").map((p) => p.key).join();
    const planned = runBlocks(plan.town.terraces, plan.packed);
    const bandedFrames = new Set<string>();
    let kept = 0;
    dressSites(applied.terrace, [], bundle.slots.blocks.list).forEach((site, i) => {
      if (ground(site.stack) !== ground(planned[i]!.block.stack)) bandedFrames.add(key(site.frame));
      else kept += plan.dressing[i]!.length;
    });
    expect(applied.dress.filter((p) => !bandedFrames.has(key(p.frame))).length).toBe(kept);
    applied.remove();
    bundle.dispose();
  }, 60000);
});

describe("every threshold can fail: a plan made to break each item fails exactly that item", () => {
  const file = "09-shrine-circuit";
  const base = (): Plan => planOf(file);
  const clone = (over: Partial<Plan>): CityMetrics => metricsOf(file, over);
  const dropSlot = (pred: (p: DressPiece) => boolean): DressPiece[][] => base().dressing.map((d) => d.filter((p) => !pred(p)));
  /** The same packed map with every block changed by `edit`. */
  const editBlocks = (edit: (b: PackResult["blocks"][number], i: number, all: PackResult["blocks"]) => PackResult["blocks"][number]): Map<string, PackResult> =>
    new Map([...base().packed].map(([id, r]) => [id, { ...r, blocks: r.blocks.map((b, i, all) => edit(b, i, all)) }] as const));

  it("passes untouched", () => {
    expect(failing(clone({}), file)).toEqual([]);
  });

  it("R1: a wide far gap on every run, a block shifted off its neighbour, and two parking lots on one run", () => {
    const wide = new Map([...base().packed].map(([id, r]) => [id, { ...r, farGap_m: r.farGap_m + 12 }] as const));
    expect(failing(clone({ packed: wide }), file)).toEqual(["R1"]);
    const shifted = editBlocks((b, i) => (i === 1 ? { ...b, lot: { ...b.lot, x: b.lot.x + 0.5 * W, z: b.lot.z + 0.5 * W } } : b));
    expect(clone({ packed: shifted }).maxNeighbourGap_m).toBeGreaterThan(0.1);
    expect(failing(clone({ packed: shifted }), file)).toContain("R1");
    const park = base().town.openLots.find((o) => o.kind === "parking")!;
    expect(failing(clone({ town: { ...base().town, openLots: [...base().town.openLots, park] } }), file)).toEqual(["R1"]);
  });

  it("R2: neighbours that share a style, and a block of six storeys", () => {
    const sameStyle = editBlocks((b, i, all) => (i > 0 ? { ...b, style: all[0]!.style } : b));
    expect(failing(clone({ packed: sameStyle }), file)).toEqual(["R2"]);
    const tall = editBlocks((b, i) => (i === 0 ? { ...b, floors: 6 } : b));
    expect(failing(clone({ packed: tall }), file)).toEqual(["R2"]);
  });

  it("R3: a ground piece that is not a shop, and a block with two door bays", () => {
    const odd = editBlocks((b, i) => (i === 0 ? { ...b, stack: { ...b.stack, pieces: b.stack.pieces.map((p) => (p.role === "base" && p.key.includes("Shop_0") ? { ...p, key: "city-pack:SM_Prop_Hydrant_01" as CalibrationKey } : p)) } } : b));
    expect(failing(clone({ packed: odd }), file)).toContain("R3");
    const twoDoors = editBlocks((b) => {
      const door = b.stack.pieces.find((p) => p.role === "base" && p.key.includes("Apartment_Door"));
      return door ? { ...b, stack: { ...b.stack, pieces: [...b.stack.pieces, { ...door }] } } : b;
    });
    expect(failing(clone({ packed: twoDoors }), file)).toContain("R3");
  });

  it("R4: no glass anywhere", () => {
    expect(failing(clone({ dressing: dropSlot((p) => p.slot === "glass") }), file)).toEqual(["R4"]);
  });

  it("R5: no awnings, and awnings of two keys in one block", () => {
    expect(failing(clone({ dressing: dropSlot((p) => p.slot === "awning" && /Shop_Cover/.test(p.key)) }), file)).toEqual(["R5"]);
    let swapped = false;
    const mixed = base().dressing.map((d) => {
      const awnings = d.filter((p) => /Shop_Cover_0[1-4]/.test(p.key));
      if (swapped || awnings.length < 2) return d;
      swapped = true;
      const other = (awnings[0]!.key.endsWith("01") ? "city-pack:SM_Bld_Shop_Cover_02" : "city-pack:SM_Bld_Shop_Cover_01") as CalibrationKey;
      return d.map((p) => (p === awnings[0] ? { ...p, key: other } : p));
    });
    expect(swapped).toBe(true);
    expect(clone({ dressing: mixed }).mixedAwningBlocks).toBe(1);
    expect(failing(clone({ dressing: mixed }), file)).toEqual(["R5"]);
  });

  it("R6: no signs, and no ATM", () => {
    expect(failing(clone({ dressing: dropSlot((p) => p.slot === "sign") }), file)).toEqual(["R6"]);
    expect(failing(clone({ dressing: dropSlot((p) => /ATM/.test(p.key)) }), file)).toEqual(["R6"]);
  });

  it("R7: no fire escapes", () => {
    expect(failing(clone({ dressing: dropSlot((p) => p.slot === "escape") }), file)).toEqual(["R7"]);
  });

  it("R8: no roof props, and no big roof prop", () => {
    expect(failing(clone({ dressing: dropSlot((p) => p.slot === "roofSmall" || p.slot === "roofLarge") }), file)).toEqual(["R8"]);
    expect(failing(clone({ dressing: dropSlot((p) => p.slot === "roofLarge") }), file)).toEqual(["R8"]);
  });

  it("R9: a corner column on a block in the middle of a row", () => {
    const off = editBlocks((b, i) => (i === 1 ? { ...b, stack: { ...b.stack, cornerSides: ["-x" as const] } } : b));
    expect(failing(clone({ packed: off }), file)).toEqual(["R9"]);
  });

  it("R10: two items on one spot, an item on a pole, and an item off the pavement", () => {
    const first = base().furniture.find((f) => f.kind === "pavement")!;
    expect(failing(clone({ furniture: [...base().furniture, { ...first }] }), file)).toEqual(["R10"]);
    const onPole = clone({ extra: { keep: { ...base().extra.keep, points: [...(base().extra.keep?.points ?? []), { x: first.x, z: first.z }] } } });
    expect(onPole.keepOutViolations).toBeGreaterThan(0);
    expect(failing(onPole, file)).toEqual(["R10"]);
    // 2 m toward the road from where it stands: off the pavement band.
    const lot0 = base().town.lots[base().town.terraces.find((r) => r.id === first.run)!.lots[0]!]!;
    const moved = { ...first, x: first.x + Math.sin(lot0.yaw) * 2 * W, z: first.z + Math.cos(lot0.yaw) * 2 * W };
    expect(failing(clone({ furniture: [...base().furniture.filter((f) => f !== first), moved] }), file)).toEqual(["R10"]);
  });

  it("R11: no parking lot or no plaza on the largest map (and not asked of the other maps)", () => {
    const town = planOf(LARGEST).town;
    const m = (open: typeof town.openLots): CityMetrics => metricsOf(LARGEST, { town: { ...town, openLots: open } });
    expect(failing(m(town.openLots.filter((o) => o.kind !== "parking")), LARGEST)).toEqual(["R11"]);
    expect(failing(m(town.openLots.filter((o) => o.kind !== "plaza")), LARGEST)).toEqual(["R11"]);
    expect(failing(m([]), LARGEST)).toEqual(["R11"]);
    expect(failing(m([]), "09-shrine-circuit")).toEqual([]);
  });

  it("R12: a vehicle in the furniture, a person in the stack, and one emissive material", () => {
    const f0 = base().furniture[0]!;
    expect(failing(clone({ furniture: [...base().furniture, { ...f0, kind: "parking" as const, key: "city-pack:SM_Veh_Car_01" as CalibrationKey }] }), file)).toEqual(["R12"]);
    const person = editBlocks((b, i) => (i === 0 ? { ...b, stack: { ...b.stack, pieces: [...b.stack.pieces, { ...b.stack.pieces.find((p) => p.role === "floor")!, key: "city-pack:SK_Chr_Male_01" as CalibrationKey }] } } : b));
    expect(failing(clone({ packed: person }), file)).toEqual(["R12"]);
    expect(failing(clone({ extra: { ...base().extra, emissiveMaterials: 1 } }), file)).toEqual(["R12"]);
  });
});

describe("the never-used list", () => {
  it("has no entry inside another, names people and vehicles, and matches no key a rule table can place", () => {
    expect(new Set(CITY_NEVER_USED).size).toBe(CITY_NEVER_USED.length);
    for (const a of CITY_NEVER_USED) for (const b of CITY_NEVER_USED) if (a !== b) expect(b.startsWith(a), `${a} covers ${b}`).toBe(false);
    expect(isNeverUsed("city-pack:SK_Chr_Female_02")).toBe(true);
    expect(isNeverUsed("city-pack:SM_Veh_Car_Sedan_01")).toBe(true);
    expect(isNeverUsed("city-pack:SM_Prop_Soda_Can_01")).toBe(true);
    expect(isNeverUsed("city-pack:SM_Prop_LargeSign_Soda_01"), "a novelty sign is not a junk prop").toBe(false);
    const keys = [...dressKeys(), ...furnitureKeys(), ...STACK_STYLES.flatMap((s) => stackKeys(s))];
    expect(keys.length).toBeGreaterThan(120);
    for (const key of keys) expect(isNeverUsed(key), key).toBe(false);
    for (const key of [...dressKeys(), ...furnitureKeys()]) expect(ENTRIES.has(key), key).toBe(true);
  });
});

describe("R13: neighbouring blocks in a run differ in colourway (ticket 054 C)", () => {
  const FAKE_EIGHT = ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7"];
  const blocksOf = (file: string) => runBlocks(planOf(file).town.terraces, planOf(file).packed);
  /** The ids the metric assigns by default, so a test can break one pair. */
  const assigned = (file: string, available: readonly string[] = FAKE_EIGHT): string[] =>
    assignColourways(blocksOf(file).map(({ run, block }) => ({ key: block.lot.key, run: run.id })), available);

  it("is a threshold of 1", () => {
    expect(CITY_CHECK.R13).toBe(1);
  });

  for (const file of MAPS) {
    it(`${file}: every adjacent pair in a run differs with the fake set of 8 ids, and there are pairs to count`, () => {
      const m = metricsOf(file);
      expect(m.colourwayPairs, file).toBeGreaterThan(30);
      expect(m.colourwayNeighbourDiffer, file).toBe(1);
      const r13 = verdictOf(m, file).find((v) => v.id === "R13")!;
      expect(r13.pass, file).toBe(true);
      expect(r13.value, file).toBe(1);
    });
  }

  it("counts the pairs inside a run only: as many as the pairs of the neighbour rule", () => {
    const file = "09-shrine-circuit";
    expect(metricsOf(file).colourwayPairs).toBe(metricsOf(file).neighbourPairs);
  });

  it("fails when two neighbours in a run share an id, and only R13 fails", () => {
    const file = "09-shrine-circuit";
    const list = blocksOf(file);
    const ids = assigned(file);
    const i = list.findIndex((x, k) => k > 0 && list[k - 1]!.run.id === x.run.id);
    expect(i).toBeGreaterThan(0);
    ids[i] = ids[i - 1]!;
    const m = metricsOf(file, { extra: { ...planOf(file).extra, colourways: ids } });
    expect(m.colourwayNeighbourDiffer).toBeLessThan(1);
    expect(failing(m, file)).toEqual(["R13"]);
  });

  it("fails when every block has the same id, and when only one id is available (nothing to differ by)", () => {
    const file = "09-shrine-circuit";
    const same = metricsOf(file, { extra: { ...planOf(file).extra, colourways: blocksOf(file).map(() => "c0") } });
    expect(same.colourwayNeighbourDiffer).toBe(0);
    expect(failing(same, file)).toEqual(["R13"]);
    const alone = metricsOf(file, { extra: { ...planOf(file).extra, colourwayAvailable: ["base"] } });
    expect(alone.colourwayNeighbourDiffer).toBe(0);
    expect(failing(alone, file)).toEqual(["R13"]);
  });

  it("does not ask neighbours across two runs to differ", () => {
    const file = "09-shrine-circuit";
    const list = blocksOf(file);
    const ids = assigned(file);
    const i = list.findIndex((x, k) => k > 0 && list[k - 1]!.run.id !== x.run.id);
    expect(i).toBeGreaterThan(0);
    ids[i] = ids[i - 1]!;
    expect(failing(metricsOf(file, { extra: { ...planOf(file).extra, colourways: ids } }), file)).toEqual([]);
  });

  it("holds with as few as two ids available, and is the same on every call", () => {
    const file = "09-shrine-circuit";
    const two = metricsOf(file, { extra: { ...planOf(file).extra, colourwayAvailable: ["c0", "c1"] } });
    expect(two.colourwayNeighbourDiffer).toBe(1);
    expect(assigned(file)).toEqual(assigned(file));
  });
});
