/**
 * Ticket 055 E, integration: B's pure helpers wired into the drawn tile city (keep-outs, bay meters, the dressing's and R10's frame), the walking level, the yellow centre line, three bays
 * to a parking tile, lot and plaza cells drawn, a readable sheet, the light on every tile-view URL, and the street camera on the tile city. No WebGL: every GLB is a fake group (a one-box
 * mesh per tile, dressing and furniture key, an empty node per stack piece), every size a number typed in from the converted City Pack manifest (18 Nov 2026). The real GLB is read only
 * inside an `it` that skips when it is absent; no timer, no path but forward slashes.
 */

import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, Group, MeshBasicMaterial, Mesh, Scene, Vector3, type Object3D, type WebGLRenderer } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationKey, type Puzzle } from "../core";
import { SIDEWALK_TOP_M, SIDEWALK_WALK_M, TILE_CITY_R6_MIN, TILE_CITY_R7_MIN, TILE_M, tileCity, tileKeepouts, bayMeters, BAYS_PER_PARKING_TILE, LANE_RIGHT, type TileCity, type TileRole } from "./tilecity";
import { CITY_ATM_BLOCKS_MIN, CITY_CHECK, cityMetrics, evaluateCity, isNeverUsed, runBlocks, type CityMetrics } from "./citymetrics";
import { dressInput, dressSites, furnitureInput, furniturePlacement, loadModels, NO_MODELS, allStackKeys, applyModels, stackInput, type DressPlacement, type ModelSet } from "./models3d";
import { AWNING_KERB_M, KERB_FROM_FRONT_M, dressKeys, dressTown, type DressBlockInput } from "./dressing";
import { FURN_KEEP_M, FURN_KERB_M, KERB_M, METERS, furnitureKeys, furnitureLayout, type FurniturePiece } from "./furniture";
import { STACK_STYLES } from "./stacks";
import { packTown, type PackResult, type PackedBlock } from "./terrace";
import { buildScene } from "./scene";
import { WORLD_PER_METRE } from "./models";
import { createStreetView, streetRows } from "./streetcam";
import { ELEVATION } from "./camera";
import { CITY_NEAR_FRACTION, TILE_FURNITURE_LEVELS, buildCityScene, buildSheetScene, cityApplyOptions, createCityRenderer3d, createCityRig, sheetRigInsets, tileGroup, tileOriginY_m } from "./tilecity3d";
import { TILE_FRONTS, TILE_SLOTS, TILE_WALK_M, cityTilesRequested, sheetPieces, tileKeys, tileLevelY_m, tileFront } from "./tileslots";
import { stubTextSurface } from "./text";
import type { TerraceRun } from "./town";

const U = WORLD_PER_METRE;
const SEEDS = Array.from({ length: 10 }, (_, k) => k + 1);

// ---- fixtures: sizes [name, width, height, depth] in metres, centred bounds, minimum y 0 ----

const PIECE_SIZES: [string, number, number, number][] = [
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

/** The furniture's own sizes (`ParkingLines` is a flat tile: height 0). */
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

/** The tile keys' sizes: the flat road tiles 5 x 0 x 5 (the parking lines 10 x 0 x 5, the patch 1.8 square), the sidewalk pieces 5 x 0.30 x 5. */
const tileSize = (key: CalibrationKey): [number, number, number] => {
  const name = key.slice(key.indexOf(":") + 1);
  if (name.includes("ParkingLines")) return [10, 0, 5];
  if (name.includes("Patch")) return [1.8, 0, 1.8];
  if (name.includes("Sidewalk")) return [5, 0.3, 5];
  return [5, 0, 5];
};
const FIXTURE: [string, number, number, number][] = [...PIECE_SIZES, ...FURN_SIZES];
for (const key of tileKeys()) {
  const name = key.slice(key.indexOf(":") + 1);
  if (!FIXTURE.some((f) => f[0] === name)) FIXTURE.push([name, ...tileSize(key)]);
}
const ALL = FIXTURE.map(entryOf);
const ENTRY_OF = new Map<CalibrationKey, AssetEntry>(ALL.map((e) => [`city-pack:${e.name}` as CalibrationKey, e]));
const MANIFEST: AssetManifest = { version: ASSET_MANIFEST_VERSION, generatedAt: "2026-01-01T00:00:00Z", blenderVersion: "5.0.0", packs: [{ pack: "city-pack", glb: "city-pack.glb", atlas: null, assets: ALL, failures: [] }] };
const MESHED: ReadonlySet<string> = new Set([...dressKeys(), ...furnitureKeys(), ...tileKeys()].map((k) => k.slice("city-pack:".length)));
const BOX = new BoxGeometry(1, 1, 1);
const PLAIN = new MeshBasicMaterial();

const SET: ModelSet = await loadModels({
  fetchJson: async (): Promise<unknown> => MANIFEST,
  loadGlb: async () => {
    const g = new Group();
    for (const e of ALL) {
      const n = new Group();
      n.name = e.name;
      if (MESHED.has(e.name)) n.add(new Mesh(BOX, PLAIN));
      g.add(n);
    }
    return g;
  },
  table: [],
  stackKeys: allStackKeys(),
  dressKeys: [...dressKeys(), ...furnitureKeys()],
  tileKeys: tileKeys(),
  info: () => {},
});
const DRESSING = dressInput(SET)!;

// ---- the integrated plan of a tile city: what `applyModels` stands, and what the pure helpers say it should ----

interface Plan {
  city: TileCity;
  terrace: PackedBlock[];
  dress: DressPlacement[];
  furniture: FurniturePiece[];
  expected: FurniturePiece[];
  packed: Map<string, PackResult>;
  keepPoints: { x: number; z: number }[];
  keepRects: { minX: number; minZ: number; maxX: number; maxZ: number }[];
}
const frameMap = (runs: readonly TerraceRun[]): Map<string, TerraceRun["frame"]> => new Map(runs.filter((r) => r.frame).map((r) => [r.id, r.frame] as const));
const plans = new Map<string, Plan>();
function planOf(city: TileCity): Plan {
  const id = `${city.blocksX}x${city.blocksZ}:${city.seed}`;
  const known = plans.get(id);
  if (known) return known;
  const bundle = buildCityScene(city);
  const applied = applyModels(bundle, SET, cityApplyOptions(city));
  const stacks = stackInput(SET)!;
  const packed = packTown({ terraces: city.town.terraces, lots: city.town.lots }, STACK_STYLES, stacks.entries, stacks.fronts);
  const base = furnitureInput(bundle, packed, applied.dress);
  const keep = tileKeepouts(city);
  const keepPoints = [...(base.keepPoints ?? []), ...keep.keepPoints];
  const keepRects = [...(base.keepRects ?? []), ...keep.keepRects];
  const expected = bayMeters(city, furnitureLayout({ ...base, keepPoints, keepRects }, DRESSING.entries, DRESSING.fronts));
  const plan: Plan = { city, terrace: [...applied.terrace], dress: [...applied.dress], furniture: [...applied.furniture], expected, packed, keepPoints, keepRects };
  applied.remove();
  bundle.dispose();
  plans.set(id, plan);
  return plan;
}
const cityAt = (seed: number): TileCity => tileCity({ blocksX: 3, blocksZ: 3, seed });
const CITIES: TileCity[] = [tileCity(), ...SEEDS.map(cityAt)];

/** A role lookup per unit cell of a city. */
const roleGrid = (c: TileCity): ((x_m: number, z_m: number) => TileRole | null) => {
  const W = Math.round(c.town.window.maxX / U / TILE_M);
  const H = Math.round(c.town.window.maxY / U / TILE_M);
  const g = new Array<TileRole | null>(W * H).fill(null);
  for (const cell of c.cells) {
    g[cell.j * W + cell.i] = cell.role;
    if (cell.cells === 2) g[(cell.j + (cell.street!.startsWith("x:") ? 0 : 1)) * W + cell.i + (cell.street!.startsWith("x:") ? 1 : 0)] = cell.role;
  }
  return (x, z) => {
    const i = Math.floor(x / TILE_M + 1e-9);
    const j = Math.floor(z / TILE_M + 1e-9);
    return i < 0 || j < 0 || i >= W || j >= H ? null : (g[j * W + i] ?? null);
  };
};

// ---- criterion 23: furniture on the drawn city ----

describe("furniture on the drawn city (criterion 23)", () => {
  it("places exactly bayMeters(furnitureLayout with the tile keep-outs), and each piece passes the tile checks of criterion 12", { timeout: 120000 }, () => {
    const fails: string[] = [];
    let pavementPieces = 0;
    let meters = 0;
    for (const c of [CITIES[0]!, CITIES[1]!, CITIES[2]!]) {
      const plan = planOf(c);
      expect(plan.furniture, `seed ${c.seed}`).toEqual(plan.expected);
      expect(plan.furniture.length, `seed ${c.seed}`).toBeGreaterThan(100);
      const t = c.town;
      const role = roleGrid(c);
      const runs = new Map(t.terraces.map((r) => [r.id, r] as const));
      for (const p of plan.furniture) {
        if (p.kind !== "pavement") continue;
        pavementPieces++;
        const run = runs.get(p.run)!;
        const lot0 = t.lots[run.lots[0]!]!;
        const tM = ((p.x - run.ax) * Math.sin(lot0.yaw) + (p.z - run.az) * Math.cos(lot0.yaw)) / U;
        if (tM - p.d / 2 < run.frame!.wall_m - 1e-6 || tM + p.d / 2 > run.frame!.kerb_m - FURN_KERB_M + 1e-6) fails.push(`${c.seed} ${p.key} off the frame lines (t ${tM.toFixed(2)})`);
        const alongX = Math.abs(run.ux) > 0.5;
        const hx = (alongX ? p.w : p.d) / 2;
        const hz = (alongX ? p.d : p.w) / 2;
        const cx = p.x / U;
        const cz = p.z / U;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const r = role(cx + sx * (hx - 1e-6), cz + sz * (hz - 1e-6));
          if (r !== "pavement") fails.push(`${c.seed} ${p.key} at ${cx.toFixed(1)},${cz.toFixed(1)} stands on ${r}`);
        }
        const gap = (x0: number, x1: number, z0: number, z1: number): number => Math.hypot(Math.max(0, x0 - (cx + hx), cx - hx - x1), Math.max(0, z0 - (cz + hz), cz - hz - z1));
        for (const s of c.poleSlots) if (gap(s.x_m, s.x_m, s.z_m, s.z_m) < FURN_KEEP_M - 1e-6) fails.push(`${c.seed} ${p.key} is near a pole slot`);
        for (const cell of c.cells) {
          if (cell.role !== "kerbCut" && cell.role !== "pavementCorner") continue;
          if (Math.abs(cell.x_m - cx) > TILE_M * 2 || Math.abs(cell.z_m - cz) > TILE_M * 2) continue;
          if (gap(cell.x_m - TILE_M / 2, cell.x_m + TILE_M / 2, cell.z_m - TILE_M / 2, cell.z_m + TILE_M / 2) < FURN_KEEP_M - 1e-6) fails.push(`${c.seed} ${p.key} is near a ${cell.role}`);
        }
        if (METERS.includes(p.key)) {
          meters++;
          const beside = c.bays.some((b) => b.street === run.road && b.block === run.block && Math.abs(alongX ? cx - b.x_m : cz - b.z_m) <= b.w_m / 2 + 1e-6);
          if (!beside) fails.push(`${c.seed} meter ${p.key} on ${run.id} is beside no bay`);
        }
      }
    }
    expect(pavementPieces).toBeGreaterThan(200);
    expect(meters).toBeGreaterThan(0);
    expect(fails.slice(0, 8)).toEqual([]);
  });

  it("the keep-outs and the filter are what keeps the pieces off the slots and the unbayed meters out: without them the layout is different", () => {
    const c = cityAt(1);
    const bundle = buildCityScene(c);
    const bare = applyModels(bundle, SET);
    const plain = [...bare.furniture];
    bare.remove();
    const withOpts = applyModels(bundle, SET, cityApplyOptions(c));
    expect(withOpts.furniture.length).toBeLessThan(plain.length);
    expect(plain.some((p) => p.kind === "pavement" && c.poleSlots.some((s) => Math.hypot(p.x / U - s.x_m, p.z / U - s.z_m) < FURN_KEEP_M))).toBe(true);
    expect(withOpts.furniture.some((p) => p.kind === "pavement" && c.poleSlots.some((s) => Math.hypot(p.x / U - s.x_m, p.z / U - s.z_m) < FURN_KEEP_M - 1e-6))).toBe(false);
    withOpts.remove();
    // A filter that keeps nothing leaves no furniture and no group; one that keeps everything is the layout as it is.
    const none = applyModels(bundle, SET, { furnitureFilter: () => [] });
    expect(none.furniture).toEqual([]);
    expect(bundle.scene.getObjectByName("city-furniture")).toBeUndefined();
    none.remove();
    const all = applyModels(bundle, SET, { furnitureFilter: (pieces) => [...pieces] });
    expect(all.furniture).toEqual(plain);
    all.remove();
    bundle.dispose();
  });

  it("stands the tile city's pavement furniture on its walk (y 0) and everything else where the ladder does; a ladder map's furniture is the pure layout of its own input", () => {
    expect(TILE_FURNITURE_LEVELS).toEqual({ pavement_m: 0 });
    const pave = planOf(cityAt(1)).furniture.find((p) => p.kind === "pavement" && !p.flat)!;
    expect(furniturePlacement(pave, TILE_FURNITURE_LEVELS).piece.y).toBeCloseTo(pave.lift, 9);
    // The ladder's default is untouched: PAVEMENT_Y over WORLD_PER_METRE, 4.4 cm.
    expect(furniturePlacement(pave).piece.y).toBeCloseTo(0.008 / U + pave.lift, 9);
    const yard = planOf(cityAt(1)).furniture.find((p) => p.ground === "yard" && !p.flat)!;
    expect(furniturePlacement(yard, TILE_FURNITURE_LEVELS).piece.y).toBe(furniturePlacement(yard).piece.y);
    for (const file of ["09-shrine-circuit", "64-the-whole-chain", "01-first-light"]) {
      const bundle = buildScene(mapOf(file), { text: stubTextSurface });
      const applied = applyModels(bundle, SET);
      const packed = packTown({ terraces: bundle.slots.blocks.terraces ?? [], lots: bundle.slots.blocks.list }, STACK_STYLES, stackInput(SET)!.entries, stackInput(SET)!.fronts);
      const pure = furnitureLayout(furnitureInput(bundle, packed, applied.dress), DRESSING.entries, DRESSING.fronts);
      expect(applied.furniture, file).toEqual(pure);
      expect(applied.furniture.length, file).toBeGreaterThan(3);
      const again = applyModels(buildScene(mapOf(file), { text: stubTextSurface }), SET, {});
      expect(again.furniture, file).toEqual(applied.furniture);
      again.remove();
      applied.remove();
      bundle.dispose();
    }
  });
});

const mapOf = (file: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));

// ---- criterion 24: the dressing reads the frame ----

describe("the dressing reads the frame (criterion 24)", () => {
  it("puts each run's frame inside its sites' run, not at the top level, and a kerb-side piece stands within the 5 m pavement", () => {
    const plan = planOf(cityAt(1));
    const runs = new Map(plan.city.town.terraces.map((r) => [r.id, r] as const));
    const frames = frameMap(plan.city.town.terraces);
    expect(frames.size).toBe(plan.city.town.terraces.length);
    const withFrames = dressSites(plan.terrace, [], plan.city.town.lots, frames);
    expect(withFrames.length).toBe(plan.terrace.length);
    for (const s of withFrames) {
      expect(s.run.frame, s.run.id).toEqual(runs.get(s.run.id)!.frame);
      expect(Object.keys(s.frame).sort(), "the top-level frame is the stack's placement frame").toEqual(["x", "yaw", "z"]);
    }
    const without = dressSites(plan.terrace, [], plan.city.town.lots);
    for (const s of without) expect("frame" in s.run, s.run.id).toBe(false);
    // The awnings of one set of sites reach the ladder's 3.03 m (the 3.33 m kerb less AWNING_KERB_M), the other's up to 4.7 m (the 5 m pavement).
    const reach = (sites: readonly DressBlockInput[]): number => {
      let max = 0;
      dressTown(sites, DRESSING.entries, DRESSING.fronts).forEach((pieces) => {
        for (const p of pieces) if (p.slot === "awning") max = Math.max(max, p.z + p.d / 2);
      });
      return max;
    };
    const ladderReach = KERB_FROM_FRONT_M - AWNING_KERB_M;
    expect(reach(without)).toBeLessThanOrEqual(ladderReach + 1e-6);
    expect(reach(withFrames)).toBeGreaterThan(ladderReach + 0.3);
    expect(reach(withFrames)).toBeLessThanOrEqual(5 - AWNING_KERB_M + 1e-6);
  });

  it("leaves dressSites and the dressing exactly as they were on the three protocol maps: no run carries a frame", () => {
    for (const file of ["09-shrine-circuit", "64-the-whole-chain", "01-first-light"]) {
      const bundle = buildScene(mapOf(file), { text: stubTextSurface });
      const applied = applyModels(bundle, SET);
      const lots = bundle.slots.blocks.list;
      const frames = frameMap(bundle.slots.blocks.terraces ?? []);
      expect(frames.size, file).toBe(0);
      const a = dressSites(applied.terrace, applied.buildings, lots);
      const b = dressSites(applied.terrace, applied.buildings, lots, frames);
      expect(b, file).toEqual(a);
      expect(a.length, file).toBeGreaterThan(10);
      for (const s of a) expect("frame" in s.run, `${file} ${s.run.id}`).toBe(false);
      expect(dressTown(b, DRESSING.entries, DRESSING.fronts), file).toEqual(dressTown(a, DRESSING.entries, DRESSING.fronts));
      applied.remove();
      bundle.dispose();
    }
  });
});

// ---- criterion 25: R10 reads the frame ----

describe("R10 reads the frame (criterion 25)", () => {
  const metricsOf = (plan: Plan, furniture: readonly FurniturePiece[] = plan.furniture): CityMetrics => {
    const t = plan.city.town;
    const list = runBlocks(t.terraces, plan.packed);
    const sites = dressSites(list.map((x) => x.block), [], t.lots, frameMap(t.terraces));
    return cityMetrics(t, plan.packed, dressTown(sites, DRESSING.entries, DRESSING.fronts), furniture, { keep: { points: plan.keepPoints, rects: plan.keepRects } });
  };

  it("is 0 on the integrated tile city (default and seeds 1 to 10 at 3 x 3, with furniture), and the other R checks pass with it (R7 on the tile city's floor)", { timeout: 300000 }, () => {
    for (const c of CITIES) {
      const m = metricsOf(planOf(c));
      expect(m.pavementPieces, `seed ${c.seed}`).toBeGreaterThan(60);
      expect(m.spacingViolations + m.keepOutViolations, `seed ${c.seed} ${JSON.stringify(m)}`).toBe(0);
      const failing = evaluateCity(m).filter((v) => !v.pass && v.id !== "R6" && v.id !== "R7");
      expect(failing, `seed ${c.seed} ${JSON.stringify(evaluateCity(m))}`).toEqual([]);
      // R6 on the tile city's floor (Josh, 18 Nov 2026: 0.45; the ladder's stays 0.5), with the ladder's ATM floor.
      expect(m.signedShopBays / m.shopBays, `seed ${c.seed} R6`).toBeGreaterThanOrEqual(TILE_CITY_R6_MIN);
      expect(m.atmBlocks / m.blocks, `seed ${c.seed} ATM`).toBeGreaterThanOrEqual(CITY_ATM_BLOCKS_MIN);
      const r7 = m.escapeQualifying === 0 ? 1 : m.escapeBlocks / m.escapeQualifying;
      expect(r7, `seed ${c.seed}`).toBeGreaterThanOrEqual(TILE_CITY_R7_MIN);
      expect(m.furniturePieces, `seed ${c.seed}`).toBeGreaterThan(100);
    }
    expect(CITY_CHECK.R7).toBe(0.5);
  });

  it("reads the run's own kerb line: a bin 3 m nearer the road is fine on a 5 m pavement and past the kerb on today's 3.33 m one; 5.5 m nearer is past the 5 m pavement's kerb too", () => {
    const plan = planOf(cityAt(1));
    const t = plan.city.town;
    const p = plan.furniture.find((q) => q.kind === "pavement" && q.key.includes("Trashbin"))!;
    const run = t.terraces.find((r) => r.id === p.run)!;
    const lot0 = t.lots[run.lots[0]!]!;
    const shift = (m: number): FurniturePiece => ({ ...p, x: p.x + Math.sin(lot0.yaw) * m * U, z: p.z + Math.cos(lot0.yaw) * m * U });
    expect(metricsOf(plan, [p]).spacingViolations).toBe(0);
    // A bin on the wall line is about 0.7 m from the front. 3 m nearer the road it is at 3.7 m: inside the 5 m pavement's kerb line (4.5 m), past today's (2.83 m).
    expect(metricsOf(plan, [shift(3)]).spacingViolations).toBe(0);
    // 5.5 m nearer it is past the 5 m pavement's kerb line too.
    expect(metricsOf(plan, [shift(5.5)]).spacingViolations).toBeGreaterThan(0);
    // The same piece against a run with no frame (the ladder's 3.33 m kerb): today's numbers are the defaults.
    const noFrame = { ...plan, city: { ...plan.city, town: { ...t, terraces: t.terraces.map(({ frame: _f, ...r }) => r as TerraceRun) } } };
    expect(KERB_M).toBeCloseTo(KERB_FROM_FRONT_M, 9);
    expect(metricsOf(noFrame as Plan, [shift(3)]).spacingViolations).toBeGreaterThan(0);
  });
});

// ---- criterion 26: lot and plaza cells drawn ----

describe("lot and plaza cells drawn (criterion 26)", () => {
  const rootsOf = (): { roots: Map<CalibrationKey, Object3D>; entries: Map<CalibrationKey, AssetEntry> } => {
    const roots = new Map<CalibrationKey, Object3D>();
    const entries = new Map<CalibrationKey, AssetEntry>();
    for (const key of tileKeys()) {
      const g = new Group();
      g.add(new Mesh(BOX, PLAIN));
      roots.set(key, g);
      entries.set(key, ENTRY_OF.get(key)!);
    }
    return { roots, entries };
  };

  it("draws every lotSurface and plaza cell, from the pack (the instance counts include them) or in code, per role", () => {
    const c = tileCity();
    const lot = c.cells.filter((q) => q.role === "lotSurface").length;
    const plaza = c.cells.filter((q) => q.role === "plaza").length;
    expect(lot).toBeGreaterThan(0);
    expect(plaza).toBeGreaterThan(0);
    expect(lot).toBe(4 * c.town.openLots.filter((o) => o.kind === "parking").length);
    expect(plaza).toBe(4 * c.town.openLots.filter((o) => o.kind === "plaza").length);
    const p = rootsOf();
    const draw = tileGroup(c, p.roots, p.entries);
    expect(draw.codeDrawn).toBe(0);
    expect(draw.fromPack).toBe(c.cells.length);
    const bare = TILE_SLOTS.junction[0]!;
    expect(draw.perKey.get(bare)).toBe(c.cells.filter((q) => q.role === "junction").length + lot);
    expect(draw.perKey.get(TILE_SLOTS.plaza[0]!)).toBe(plaza);
    draw.dispose();
    // No pack: every cell, lot and plaza cells included, is code-drawn: lot surfaces as road quads, plazas as pavement boxes.
    const none = tileGroup(c, new Map(), new Map());
    expect(none.codeDrawn).toBe(c.cells.length);
    const roadCount = (none.group.children.find((o) => o.name === "tile:code-road") as { count: number }).count;
    const boxCount = (none.group.children.find((o) => o.name === "tile:code-pavement") as { count: number }).count;
    expect(roadCount).toBe(c.cells.filter((q) => ["lane", "parking", "parkingPlain", "junction", "crossing", "lotSurface"].includes(q.role)).length);
    expect(boxCount).toBe(c.cells.filter((q) => ["pavement", "pavementCorner", "kerbCut", "buildout", "plaza"].includes(q.role)).length);
    none.dispose();
  });

  it("stands every piece of a lot or plaza at least 0.005 m above its surface (the lot surface at 0, the plaza's walk at 0): no two are coplanar", () => {
    expect(tileLevelY_m("lotSurface")).toBe(0);
    expect(tileLevelY_m("plaza", TILE_SLOTS.plaza[0]!) + SIDEWALK_WALK_M).toBeCloseTo(0, 12);
    let lotPieces = 0;
    let flat = 0;
    for (const c of [cityAt(1), cityAt(2)]) {
      for (const p of planOf(c).furniture) {
        if (p.kind !== "parking" && p.kind !== "plaza") continue;
        lotPieces++;
        if (p.flat) flat++;
        const base = furniturePlacement(p, TILE_FURNITURE_LEVELS).piece.y;
        expect(base, `${p.kind} ${p.key}`).toBeGreaterThanOrEqual(0.005);
      }
    }
    expect(lotPieces).toBeGreaterThan(20);
    expect(flat, "lot lines and panels are flat pieces").toBeGreaterThan(0);
  });
});

describe("the overhead camera's depth precision (criterion 31: lot lines do not flicker)", () => {
  /** The depth buffer's resolution at distance d, world units, for a 24-bit buffer and a near plane: about d squared over (near x 2^24). */
  const resolution = (d: number, near: number): number => (d * d) / (near * 16777216);

  it("keeps its near plane at a tenth of its distance from the target, so a 1 cm lift (0.0018 units) is several times the depth resolution at any zoom", () => {
    expect(CITY_NEAR_FRACTION).toBe(0.1);
    for (const [bx, bz] of [[1, 1], [3, 3], [6, 6]] as const) {
      const c = tileCity({ blocksX: bx, blocksZ: bz, seed: 3 });
      const win = c.town.window;
      const rig = createCityRig({ minX: win.minX, minY: win.minY, maxX: win.maxX, maxY: win.maxY }, 1280, 720);
      for (let step = 0; step < 6; step++) {
        const dist = rig.camera.position.y / Math.sin(ELEVATION);
        expect(rig.camera.near, `${bx}x${bz} step ${step}`).toBeCloseTo(Math.max(0.1, dist * CITY_NEAR_FRACTION), 9);
        // The tile city's lot lines stand 1 cm over their surface (GROUND_LIFT_M): at least four times the buffer's resolution at the target's distance.
        expect(resolution(dist, rig.camera.near), `${bx}x${bz} step ${step}`).toBeLessThan((0.01 * U) / 4);
        rig.zoomStep(1);
      }
      // With the old fixed 0.1 near plane the resolution at the fitting distance of the biggest city was about 0.006 units, over three times a 1 cm lift: the flicker.
      if (bx === 6) {
        const fit = createCityRig({ minX: win.minX, minY: win.minY, maxX: win.maxX, maxY: win.maxY }, 1280, 720);
        expect(resolution(fit.camera.position.y / Math.sin(ELEVATION), 0.1)).toBeGreaterThan(0.01 * U);
      }
    }
  });
});

// ---- criterion 27: bays per parking tile ----

describe("bays per parking tile (criterion 27)", () => {
  /** Where the real GLB's bay dividers stand along its 10 m, centred at 0 (18 Nov 2026): x of about -5, -1.75, +1.6 and +5. */
  const DIVIDERS = [-5, -1.75, 1.6, 5];

  it("is 3, with bays 2 x TILE_M / 3 wide, each centred within 0.2 m of the middle between two neighbouring dividers; 056 replaces the block minimum with chapter 18.3", () => {
    expect(BAYS_PER_PARKING_TILE).toBe(3);
    const mids = DIVIDERS.slice(1).map((d, i) => (DIVIDERS[i]! + d) / 2);
    let tiles = 0;
    for (const c of [tileCity(), cityAt(2), cityAt(3)]) {
      const tilesOf = c.cells.filter((q) => q.cells === 2);
      expect(c.bays.length).toBe(tilesOf.length * 3);
      for (const t of tilesOf) {
        tiles++;
        const alongX = t.street!.startsWith("x:");
        const mine = c.bays.filter((b) => b.street === t.street && Math.abs((alongX ? b.x_m - t.x_m : b.z_m - t.z_m)) <= TILE_M && Math.abs((alongX ? b.z_m - t.z_m : b.x_m - t.x_m)) < 1e-6);
        expect(mine.length).toBe(3);
        const local = mine.map((b) => (alongX ? b.x_m - t.x_m : b.z_m - t.z_m)).sort((a, b) => a - b);
        local.forEach((v, k) => expect(Math.abs(v - mids[k]!), `tile (${t.i},${t.j}) bay ${k}`).toBeLessThanOrEqual(0.2));
        for (const b of mine) expect(b.w_m).toBeCloseTo((2 * TILE_M) / 3, 9);
      }
    }
    expect(tiles).toBeGreaterThan(50);
  });
});

// ---- criterion 28: the walking level ----

describe("the walking level (criterion 28)", () => {
  it("is 0.23 m with a 0.30 m lip: the carriageway at -0.23, every sidewalk-family piece on it, the code-drawn box from -0.23 to 0", () => {
    expect(SIDEWALK_WALK_M).toBe(0.23);
    expect(SIDEWALK_TOP_M).toBe(0.3);
    expect(Object.keys(TILE_WALK_M)).toEqual([]);
    const c = tileCity();
    const p = { roots: new Map<CalibrationKey, Object3D>(), entries: new Map<CalibrationKey, AssetEntry>() };
    for (const key of tileKeys()) {
      const g = new Group();
      g.add(new Mesh(BOX, PLAIN));
      p.roots.set(key, g);
      p.entries.set(key, ENTRY_OF.get(key)!);
    }
    const draw = tileGroup(c, p.roots, p.entries);
    for (const role of ["lane", "crossing", "junction"] as const) expect(tileOriginY_m(role, TILE_SLOTS[role][0]), role).toBe(-SIDEWALK_WALK_M);
    for (const role of ["pavement", "pavementCorner", "kerbCut", "plaza"] as const) {
      expect(tileOriginY_m(role, TILE_SLOTS[role][0]) + SIDEWALK_WALK_M, role).toBe(0);
      expect(tileOriginY_m(role, TILE_SLOTS[role][0]) + SIDEWALK_TOP_M, `${role}: the lip is 0.07 m above the walk`).toBeCloseTo(0.07, 12);
    }
    draw.dispose();
  });

  it("agrees with the converted City Pack geometry when this machine has it: every sidewalk key has a flat walking level at 0.23 m and a lip at 0.30 m (skipped when it does not)", () => {
    const file = join("assets", "private", "out", "city-pack.glb");
    if (!existsSync(file)) return;
    const glb = readFileSync(file);
    const jsonLen = glb.readUInt32LE(12);
    interface Prim {
      attributes: { POSITION: number };
      indices?: number;
    }
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as {
      nodes: { name?: string; mesh?: number; children?: number[] }[];
      meshes: { primitives: Prim[] }[];
      accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number }[];
      bufferViews: { byteOffset?: number; byteStride?: number }[];
    };
    const bin = glb.subarray(20 + jsonLen + 8);
    const index = (a: number, i: number): number => {
      const acc = gltf.accessors[a]!;
      const bv = gltf.bufferViews[acc.bufferView]!;
      const at = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
      return acc.componentType === 5125 ? bin.readUInt32LE(at + i * 4) : acc.componentType === 5123 ? bin.readUInt16LE(at + i * 2) : bin.readUInt8(at + i);
    };
    const vertex = (a: number, i: number): [number, number, number] => {
      const acc = gltf.accessors[a]!;
      const bv = gltf.bufferViews[acc.bufferView]!;
      const at = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0) + i * (bv.byteStride ?? 12);
      return [bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8)];
    };
    /** The flat, up-facing levels of a piece, mm to area in square metres. */
    const levels = (name: string): Map<number, number> => {
      const out = new Map<number, number>();
      const root = gltf.nodes.find((n) => n.name === name);
      expect(root, name).toBeDefined();
      const walk = (n: { mesh?: number; children?: number[] }): void => {
        for (const prim of n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives : []) {
          const count = gltf.accessors[prim.indices!]!.count;
          for (let k = 0; k + 2 < count; k += 3) {
            const [a, b, c] = [0, 1, 2].map((o) => vertex(prim.attributes.POSITION, index(prim.indices!, k + o))) as [[number, number, number], [number, number, number], [number, number, number]];
            if (Math.abs(a[1] - b[1]) > 1e-4 || Math.abs(a[1] - c[1]) > 1e-4) continue;
            const cross = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
            if (Math.abs(cross) < 1e-9) continue;
            const mm = Math.round(a[1] * 1000);
            out.set(mm, (out.get(mm) ?? 0) + Math.abs(cross) / 2);
          }
        }
        for (const ch of n.children ?? []) walk(gltf.nodes[ch]!);
      };
      walk(root!);
      return out;
    };
    const bad: string[] = [];
    for (const name of ["SM_Env_Sidewalk_Straight_01", "SM_Env_Sidewalk_Straight_02", "SM_Env_Sidewalk_Grate_01", "SM_Env_Sidewalk_Dip_01", "SM_Env_Sidewalk_Dip_Corner_01", "SM_Env_Sidewalk_Corner_01", "SM_Env_Sidewalk_Panel_01"]) {
      const lv = levels(name);
      const key = `city-pack:${name}` as CalibrationKey;
      const walk = (TILE_WALK_M[key] ?? SIDEWALK_WALK_M) * 1000;
      const area = (mm: number): number => [...lv].filter(([h]) => Math.abs(h - mm) <= 2).reduce((s, [, a]) => s + a, 0);
      if (!(area(walk) >= 0.5)) bad.push(`${name}: only ${area(walk).toFixed(2)} m2 of flat surface at ${walk} mm (levels ${[...lv].map(([h, a]) => `${h}:${a.toFixed(1)}`).join(" ")})`);
      if (!(area(300) >= 0.5)) bad.push(`${name}: only ${area(300).toFixed(2)} m2 of lip at 300 mm`);
      // The kerb face is inside the cell edge: the lowest surface, the gutter, is at the road's level (0) more than 0.1 m in (the report's re-cut item).
      const lowest = Math.min(...[...lv.keys()]);
      if (lowest < 0 - 1) bad.push(`${name}: a flat level below the road at ${lowest} mm`);
    }
    expect(bad).toEqual([]);
  });
});

// ---- criterion 29: the centre line ----

describe("the centre line (criterion 29)", () => {
  /** Which local side carries the yellow line (the GLB's geometry, read 18 Nov 2026; tileslots.test.ts checks it against the real file). */
  const YELLOW: Record<string, 1 | -1> = { SM_Env_Road_YellowLines_01: 1, SM_Env_Road_YellowLines_02: -1 };

  it("takes the yellow pieces for every lane cell, not on the never-used list, and the white ones are the sheet's extras", () => {
    expect(TILE_SLOTS.lane.map((k) => k.slice("city-pack:".length))).toEqual(["SM_Env_Road_YellowLines_01", "SM_Env_Road_YellowLines_02"]);
    for (const k of TILE_SLOTS.lane) expect(isNeverUsed(k), k).toBe(false);
    const sheetKeys = sheetPieces().map((p) => p.key.slice("city-pack:".length));
    expect(sheetKeys).toContain("SM_Env_Road_Lines_01");
    expect(sheetKeys).toContain("SM_Env_Road_Lines_02");
    expect(TILE_SLOTS.lane.some((k) => k.includes("Road_Lines_0"))).toBe(false);
  });

  it("lies the yellow edge of every lane cell on its street's centre line, so two lanes show one yellow pair", () => {
    let checked = 0;
    for (const c of [tileCity(), cityAt(2), tileCity({ blocksX: 5, blocksZ: 4, seed: 2 })]) {
      const streets = new Map(c.streets.map((s) => [s.id, s] as const));
      const ends = new Map<string, Set<string>>();
      for (const cell of c.cells) {
        if (cell.role !== "lane") continue;
        const key = TILE_SLOTS.lane[cell.variant & LANE_RIGHT]!;
        const name = key.slice("city-pack:".length);
        const theta = ((cell.yaw + tileFront(key)) * Math.PI) / 180;
        // three's rotation about y turns the piece's local +x to (cos, -sin) in (x, z).
        const dx = Math.cos(theta) * YELLOW[name]!;
        const dz = -Math.sin(theta) * YELLOW[name]!;
        const street = streets.get(cell.street!)!;
        const edge = { x: cell.x_m + dx * (TILE_M / 2), z: cell.z_m + dz * (TILE_M / 2) };
        // The edge is a line across the street, on the centre line: its across-coordinate is the centre's.
        const across = street.axis === "x" ? edge.z : edge.x;
        expect(Math.abs(across - street.centre_m), `${cell.street} cell (${cell.i},${cell.j})`).toBeLessThan(1e-6);
        // The lines run along the street.
        expect(Math.abs(street.axis === "x" ? dz : dx), "the yellow edge is across the street").toBeCloseTo(1, 6);
        const set = ends.get(cell.street!) ?? new Set<string>();
        set.add(`${cell.variant & LANE_RIGHT}`);
        ends.set(cell.street!, set);
        checked++;
      }
      for (const [id, set] of ends) expect(set.size, `${id} has a lane on each side of the centre`).toBe(2);
    }
    expect(checked).toBeGreaterThan(300);
    expect(TILE_FRONTS[TILE_SLOTS.lane[0]!]).toBe(270);
    expect(TILE_FRONTS[TILE_SLOTS.lane[1]!]).toBe(90);
  });
});

// ---- criterion 30: the sheet, and daylight ----

describe("a readable sheet (criterion 30)", () => {
  /** A text surface that measures like a 12 px sans-serif at 0.6 em a character (the real average is nearer 0.5): label widths here are on the safe side. */
  const surface = (): HTMLCanvasElement => {
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (t, k) => (k === "measureText" ? (s: string) => ({ width: s.length * 0.6 * Number.parseFloat(String(t["font"] ?? "12px").replace(/^bold /, "")) }) : k in t ? t[k as string] : () => undefined),
      set: (t, k, v) => {
        t[k as string] = v;
        return true;
      },
    });
    return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
  };
  type Box = { x0: number; x1: number; y0: number; y1: number };
  const overlap = (a: Box, b: Box): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

  for (const [w, h] of [[1280, 720], [390, 844]] as const) {
    for (const present of [false, true]) {
      it(`at ${w} x ${h}${present ? ", with the pack" : ", with no pack"}: no two labels overlap, none overlaps a piece's footprint, and everything is inside the picture and the insets`, () => {
        const roots = new Map<CalibrationKey, Object3D>();
        const entries = new Map<CalibrationKey, AssetEntry>();
        if (present) {
          for (const key of tileKeys()) {
            const g = new Group();
            g.add(new Mesh(BOX, PLAIN));
            roots.set(key, g);
            entries.set(key, ENTRY_OF.get(key)!);
          }
        }
        const insets = { top: 60, bottom: 40 };
        const sheet = buildSheetScene(roots, entries, { surface, aspect: w / h });
        const rig = createCityRig(sheet.frame, w, h, sheetRigInsets(insets, sheet), { fitTop: 0.3 });
        sheet.setViewport(h);
        const px = (x: number, y: number, z: number): [number, number] => {
          const p = new Vector3(x, y, z).project(rig.camera);
          return [((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h];
        };
        const labels: Box[] = sheet.labels.map((cs) => {
          const [x, y] = px(cs.sprite.position.x, cs.sprite.position.y, cs.sprite.position.z);
          const cw = cs.sprite.userData["cssW"] as number;
          const ch = cs.sprite.userData["cssH"] as number;
          const { x: cx, y: cy } = cs.sprite.center;
          return { x0: x - cx * cw, x1: x + (1 - cx) * cw, y0: y - (1 - cy) * ch, y1: y + cy * ch };
        });
        const feet: Box[] = sheet.rects.map((r) => {
          const pts = ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz]) => px(r.x + (sx * r.w) / 2, 0, r.z + (sz * r.d) / 2));
          return { x0: Math.min(...pts.map((q) => q[0])), x1: Math.max(...pts.map((q) => q[0])), y0: Math.min(...pts.map((q) => q[1])), y1: Math.max(...pts.map((q) => q[1])) };
        });
        const bad: string[] = [];
        labels.forEach((a, i) => {
          labels.forEach((b, j) => {
            if (j > i && overlap(a, b)) bad.push(`label ${i} overlaps label ${j}`);
          });
          feet.forEach((f, j) => {
            if (overlap(a, f)) bad.push(`label ${i} overlaps the footprint of piece ${j}`);
          });
        });
        for (const [i, f] of feet.entries()) {
          if (f.x0 < 0 || f.x1 > w || f.y0 < insets.top || f.y1 > h - insets.bottom) bad.push(`piece ${i} is outside the free area (${f.x0.toFixed(0)}..${f.x1.toFixed(0)}, ${f.y0.toFixed(0)}..${f.y1.toFixed(0)})`);
        }
        for (const [i, l] of labels.entries()) if (l.x0 < 0 || l.x1 > w || l.y0 < insets.top || l.y1 > h - insets.bottom) bad.push(`label ${i} is outside the free area (${l.x0.toFixed(0)}..${l.x1.toFixed(0)}, ${l.y0.toFixed(0)}..${l.y1.toFixed(0)})`);
        expect(bad).toEqual([]);
        expect(sheet.labels).toHaveLength(sheetPieces().length + 1);
        sheet.dispose();
      });
    }
  }
});

describe("the light on every tile-view URL (criterion 30, then ticket 060: the tile view opens in day)", () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const canvas = (): HTMLCanvasElement => ({ clientWidth: 1280, clientHeight: 720, style: { touchAction: "" }, addEventListener() {}, removeEventListener() {}, setPointerCapture() {} }) as unknown as HTMLCanvasElement;

  /** The lights of a scene by kind: the rig's tag, or "own" for a light the rig did not add. */
  type Kinds = Record<string, number>;
  /** Open the tile view for a URL's search string, draw one frame, and return the scene it drew and how many lights of each kind it holds. */
  async function open(search: string, mutate?: (c: TileCity) => TileCity): Promise<{ kinds: Kinds; scene: Scene; text: string[] }> {
    const scenes: Scene[] = [];
    const gl = { setPixelRatio() {}, setSize() {}, render: (s: Scene) => scenes.push(s) } as unknown as WebGLRenderer;
    const req = cityTilesRequested(search)!;
    const city = mutate ? mutate(tileCity({ blocksX: req.blocksX, blocksZ: req.blocksZ, seed: req.seed })) : undefined;
    const r = createCityRenderer3d(gl, canvas(), req, { dpr: 1, search, load: async () => NO_MODELS, surface: stubTextSurface, ...(city ? { city } : {}) });
    r.draw(undefined as never, undefined as never, 0);
    await new Promise<void>((done) => setTimeout(done, 0));
    r.draw(undefined as never, undefined as never, 0);
    const scene = scenes[scenes.length - 1]!;
    const kinds: Kinds = {};
    scene.traverse((o) => {
      if ((o as { isLight?: boolean }).isLight !== true) return;
      const k = typeof o.userData["lightRig"] === "string" ? (o.userData["lightRig"] as string) : "own";
      kinds[k] = (kinds[k] ?? 0) + 1;
    });
    const text = info.mock.calls.map((c) => String(c[0]));
    r.dispose();
    return { kinds, scene, text };
  }
  /** The default city with no terrace row at all, so the street camera has nothing to look along and falls back to the overhead view. */
  const noRows = (c: TileCity): TileCity => ({ ...c, town: { ...c.town, terraces: [], lots: [], openLots: [] } });

  const URLS = [
    ["the overhead view", "?puzzle=01-first-light&view=3d&city=tiles"],
    ["the street camera", "?puzzle=01-first-light&view=3d&city=tiles&cam=street&run=0"],
    ["the street camera at a row's end", "?puzzle=01-first-light&view=3d&city=tiles&cam=street&run=1&at=0"],
    ["a bigger city", "?puzzle=01-first-light&view=3d&city=tiles&blocks=5x4&seed=2"],
  ] as const;

  for (const [label, search] of URLS) {
    it(`${label}: opens in day (one sun and one HemisphereLight, no ambient) and with light=night in the game's night (one ambient and one moon)`, async () => {
      const day = await open(search);
      expect(day.kinds, label).toEqual({ key: 1, hemi: 1 });
      const night = await open(`${search}&light=night`);
      expect(night.kinds, label).toEqual({ ambient: 1, moon: 1 });
    });
  }

  it("the sheet is lit by its own lights in both modes and has no rig light", async () => {
    const plain = await open("?city=tiles&sheet=1");
    const night = await open("?city=tiles&sheet=1&light=night");
    for (const o of [plain, night]) {
      expect(o.kinds["own"]).toBeGreaterThanOrEqual(2);
      expect(Object.keys(o.kinds)).toEqual(["own"]);
    }
    expect(plain.kinds).toEqual(night.kinds);
  });

  it("the street camera that finds no row falls back to the overhead view, says so, and is lit all the same (the lack found in 4d952c6)", async () => {
    info.mockClear();
    const day = await open("?city=tiles&cam=street", noRows);
    expect(day.kinds).toEqual({ key: 1, hemi: 1 });
    expect(day.text.some((t) => t.includes("no row of buildings to look along yet"))).toBe(true);
    const night = await open("?city=tiles&cam=street&light=night", noRows);
    expect(night.kinds).toEqual({ ambient: 1, moon: 1 });
  });
});

// ---- criterion 32: the street camera on the tile city ----

describe("the street camera on the tile city (criterion 32)", () => {
  it("returns a view for run 0 and run 1 on the default city and seeds 1 to 10 at 3 x 3, and never reports a missing row", () => {
    const lines: string[] = [];
    for (const c of CITIES) {
      const rows = streetRows(c.town);
      expect(rows.length, `seed ${c.seed}`).toBeGreaterThan(8);
      for (const run of [0, 1]) {
        const view = createStreetView(c.town, { run, at: 0.5, day: false }, new Scene(), 1280, 720, (l) => lines.push(l));
        expect(view, `seed ${c.seed} run ${run}`).not.toBeNull();
        view!.markReady();
        view!.draw({ render() {} }, new Scene());
        view!.dispose();
      }
    }
    expect(lines.filter((l) => l.includes("no row"))).toEqual([]);
    expect(lines.length).toBe(CITIES.length * 2);
  });

  it("does not edit streetcam.ts: it is the file the ladder maps use, and the tile view calls it as it is", () => {
    const src = readFileSync("src/render3d/tilecity3d.ts", "utf8");
    expect(src).toMatch(/createStreetView\(city\.town, \{ \.\.\.asked, day: false \}/);
  });
});

