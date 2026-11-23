/**
 * Ticket 052 C: street furniture on the terrace pavements, the parking lots, the corner plazas and the alleys (`furniture.ts`), and its drawing (`applyModels`, `loadModels`).
 * No WebGL: the GLBs are fake groups (a one-box mesh per dressing or furniture key, an empty node per stack piece), and every size is typed in as a number copied from the
 * converted City Pack manifest (18 Nov 2026). Nothing here reads assets/private/, no timer, no path but `puzzles/`. The maps are the repo's own puzzles.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Raycaster, Vector3, type Object3D } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationKey, type Puzzle } from "../core";
import { dressKeys } from "./dressing";
import {
  BILLBOARD_BOARD,
  BILLBOARD_BOARD_LIFT_M,
  BILLBOARD_POLE,
  BOLLARD_PER_RUN,
  BOLLARDS,
  BUS_STOPS,
  BUS_STOP_MIN_RUN_M,
  FURN_CORNER_M,
  FURN_DRAW_CALLS_MAX,
  FURN_KEEP_M,
  FURN_KERB_M,
  FURN_MAX_H_M,
  FURN_PITCH_M,
  FURN_WALL_M,
  HYDRANTS,
  HYDRANT_PER_RUN,
  KERB_M,
  MAILBOXES,
  MAILBOX_PER_RUN,
  NEWSPAPERS,
  NEWSPAPER_PER_RUN,
  PARKING_LINES,
  TREES,
  TREE_PITCH_M,
  WALL_EDGE_M,
  alleyOf,
  furnitureKeys,
  furnitureLayout,
  openLotsOf,
  type Alley,
  type FurnitureInput,
  type FurniturePiece,
  type Rect,
} from "./furniture";
import { dropLayout, wireLayout } from "./layout";
import { BUILDING_FRONTS, WORLD_PER_METRE } from "./models";
import { NO_MODELS, allStackKeys, applyModels, dressMatrix, furniturePlacement, loadModels, stackInput, type ModelSet } from "./models3d";
import { buildScene } from "./scene";
import { STACK_STYLES } from "./stacks";
import { ALLEY_MAX_M, ALLEY_MIN_M, packTown } from "./terrace";
import { OCCLUDE_SLOPE, WIRE_CLEAR, townLayout, type OpenLot, type TerraceRun } from "./town";
import { stubTextSurface } from "./text";
import { yieldToWorker } from "../city/testing/yield";

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

const BOX = new BoxGeometry(1, 1, 1);
const PLAIN = new MeshStandardMaterial({ color: 0x888888 });

/** A GLB's scene: an empty node per stack piece, a one-box mesh node per dressing or furniture key, less the names in `lack`. */
function glbOf(manifest: AssetManifest, lack: readonly string[] = []): Group {
  const g = new Group();
  for (const e of manifest.packs[0]?.assets ?? []) {
    if (lack.includes(e.name)) continue;
    const n = new Group();
    n.name = e.name;
    if (KEYWORDS.has(e.name)) n.add(new Mesh(BOX, PLAIN));
    g.add(n);
  }
  return g;
}

async function setOf(manifest: AssetManifest, opts: { furniture?: boolean; lack?: readonly string[] } = {}): Promise<ModelSet> {
  return loadModels({
    fetchJson: async (): Promise<unknown> => manifest,
    loadGlb: async () => glbOf(manifest, opts.lack),
    stackKeys: allStackKeys(),
    dressKeys: opts.furniture === false ? dressKeys() : [...dressKeys(), ...furnitureKeys()],
    info: () => {},
  });
}

const SET = await setOf(manifestOf(ALL));
/** The same pack with every furniture key left out of the manifest: the town as 052 B drew it. */
const SET_NO_FURN = await setOf(manifestOf(ALL.filter((e) => !FURN_SIZES.some((f) => f[0] === e.name))));
const SET_NO_CITY = await setOf(manifestOf(ALL, "town-pack"));
const STACKS = stackInput(SET)!;

const W = WORLD_PER_METRE;
const loadMap = (file: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));
const ladder = (): string[] => readdirSync("puzzles").filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
const MAPS = ["01-first-light", "09-shrine-circuit", "64-the-whole-chain"];

const furnitureGroupOf = (bundle: { scene: Object3D }): Object3D | undefined => bundle.scene.getObjectByName("city-furniture");
const instanced = (g: Object3D): InstancedMesh[] => g.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
const pickTargets = (scene: Object3D): string[] => {
  const out: string[] = [];
  scene.traverse((o) => {
    if (o.userData["pickKind"] !== undefined) out.push(`${String(o.userData["pickKind"])}|${String(o.userData["pickId"])}|${o.matrixWorld.elements.join(",")}`);
  });
  return out;
};

// ---- geometry in the tests (independent of furniture.ts) ----

const rectDist = (a: Rect, b: Rect): number => Math.hypot(Math.max(0, a.minX - b.maxX, b.minX - a.maxX), Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ));
const overlap = (a: Rect, b: Rect): boolean => a.minX < b.maxX - 1e-9 && b.minX < a.maxX - 1e-9 && a.minZ < b.maxZ - 1e-9 && b.minZ < a.maxZ - 1e-9;
const bbox = (pts: readonly { x: number; z: number }[]): Rect => ({ minX: Math.min(...pts.map((p) => p.x)), minZ: Math.min(...pts.map((p) => p.z)), maxX: Math.max(...pts.map((p) => p.x)), maxZ: Math.max(...pts.map((p) => p.z)) });
const dot = (x: number, z: number): Rect => ({ minX: x, minZ: z, maxX: x, maxZ: z });
/** A piece's footprint in the world, given the yaw of the frame its `w` and `d` are measured in (the lot's). */
function rectOf(p: FurniturePiece, yaw0: number): Rect {
  const hx = ((Math.abs(Math.cos(yaw0)) * p.w + Math.abs(Math.sin(yaw0)) * p.d) / 2) * W;
  const hz = ((Math.abs(Math.sin(yaw0)) * p.w + Math.abs(Math.cos(yaw0)) * p.d) / 2) * W;
  return { minX: p.x - hx, minZ: p.z - hz, maxX: p.x + hx, maxZ: p.z + hz };
}
function inConvex(poly: readonly { x: number; z: number }[], x: number, z: number): boolean {
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const c = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
    if (c > 1e-9) pos++;
    else if (c < -1e-9) neg++;
  }
  return pos === 0 || neg === 0;
}

// ---- a whole map, the way `applyModels` builds it, but from the town and the layout parts alone ----

interface World {
  puzzle: Puzzle;
  town: ReturnType<typeof townLayout>;
  runs: TerraceRun[];
  input: FurnitureInput;
  alleys: Map<string, Alley>;
  keepPoints: { x: number; z: number }[];
  keepSegments: [{ x: number; z: number }, { x: number; z: number }][];
  keepRects: Rect[];
  wireRects: Rect[];
  pieces: FurniturePiece[];
}
const worlds = new Map<string, World>();
function worldOf(file: string): World {
  const hit = worlds.get(file);
  if (hit) return hit;
  const puzzle = loadMap(file);
  const town = townLayout(puzzle);
  const packed = packTown({ terraces: town.terraces, lots: town.lots }, STACK_STYLES, STACKS.entries, STACKS.fronts);
  const runs = town.terraces.filter((r) => (packed.get(r.id)?.blocks.length ?? 0) > 0) as TerraceRun[];
  const alleys = new Map<string, Alley>();
  for (const r of runs) {
    const res = packed.get(r.id)!;
    const a = alleyOf(r, res.blocks[res.blocks.length - 1]?.lot ?? null, res.farGap_m, res.farOverhang_m, ALLEY_MIN_M, ALLEY_MAX_M);
    if (a) alleys.set(r.id, a);
  }
  const wire = wireLayout(puzzle);
  const keepPoints = [...puzzle.nodes.map((n) => ({ x: n.pos[0], z: n.pos[1] })), ...wire.flatMap((r) => r.attach.map((a) => ({ x: a.x, z: a.z })))];
  const keepSegments = dropLayout(town, wire).map((d) => [{ x: d.from.x, z: d.from.z }, { x: d.to.x, z: d.to.z }] as [{ x: number; z: number }, { x: number; z: number }]);
  const keepRects = town.pads.map((p) => bbox(p.pts));
  const wireRects = wire.flatMap((r) => r.spans.map((sp) => bbox(sp)));
  const input: FurnitureInput = { runs, lots: town.lots, openLots: town.openLots, alleys, keepPoints, keepSegments, keepRects, wireRects };
  const w: World = { puzzle, town, runs, input, alleys, keepPoints, keepSegments, keepRects, wireRects, pieces: furnitureLayout(input, ENTRIES) };
  worlds.set(file, w);
  return w;
}

/** A piece in its run's frame: metres along the run from its start, and from the lots' front toward the road. */
function inRun(w: World, run: TerraceRun, p: { x: number; z: number }): { s: number; t: number; yaw: number } {
  const yaw = w.town.lots[run.lots[0]!]!.yaw;
  return { s: ((p.x - run.ax) * run.ux + (p.z - run.az) * run.uz) / W, t: ((p.x - run.ax) * Math.sin(yaw) + (p.z - run.az) * Math.cos(yaw)) / W, yaw };
}

const NEVER = /LightPole|TrafficLight|PowerBox|SM_Veh_|SK_|Skyline|PalmTree|Power_Cables|Apartment_Stairs|Sign_XXX|Police|Hospital|FireDepartment/;

describe("the furniture's keys", () => {
  it("are all city-pack keys that the fixture has; none is a lamp, a signal, a power box, a person or a vehicle", () => {
    for (const key of furnitureKeys()) {
      expect(key.startsWith("city-pack:"), key).toBe(true);
      expect(ENTRIES.has(key), key).toBe(true);
      expect(key, key).not.toMatch(NEVER);
    }
    // ...and the source names none of them anywhere (comments included).
    const src = readFileSync(join("src", "render3d", "furniture.ts"), "utf8");
    expect(src.match(NEVER)).toBeNull();
    expect(new Set(furnitureKeys()).size).toBe(furnitureKeys().length);
    for (const key of furnitureKeys()) expect(dressKeys(), key).not.toContain(key);
  });
});

describe("pavement furniture on every map (criterion 9)", () => {
  it("stands only on the pavements in front of terrace runs, on its two lines, with the pitch, the corner, keep-out and wire rules, the caps, and deterministically", async () => {
    const stats = { pieces: 0, metres: 0, runsWithAny: 0, runs: 0 };
    const kinds = new Map<string, number>();
    for (const file of ladder()) {
      const w = worldOf(file);
      const runById = new Map(w.runs.map((r) => [r.id, r] as const));
      const own = w.pieces.filter((p) => p.kind === "pavement");
      expect(furnitureLayout(w.input, ENTRIES), file).toEqual(w.pieces);
      const byRunLine = new Map<string, number[]>();
      const byRun = new Map<string, FurniturePiece[]>();
      for (const p of own) {
        const run = runById.get(p.run);
        expect(run, `${file} ${p.run}`).toBeDefined();
        if (!run) continue;
        const { s, t, yaw } = inRun(w, run, p);
        const len = run.len / W;
        const wall = Math.abs(t - p.d / 2 - (WALL_EDGE_M + FURN_WALL_M)) < 1e-6;
        const kerb = Math.abs(t + p.d / 2 - (KERB_M - FURN_KERB_M)) < 1e-6;
        expect(wall || kerb, `${file} ${p.key} t=${t}`).toBe(true);
        expect(s - p.w / 2, `${file} ${p.run} start corner`).toBeGreaterThanOrEqual(FURN_CORNER_M - 1e-6);
        expect(s + p.w / 2, `${file} ${p.run} end corner`).toBeLessThanOrEqual(len - FURN_CORNER_M + 1e-6);
        // The centre is on a pavement band of the road the run faces.
        const bands = w.town.pavements.filter((pv) => pv.road === run.road);
        expect(
          bands.some((pv) => inConvex(pv.pts, p.x, p.z)),
          `${file} ${p.key} on ${run.road}`,
        ).toBe(true);
        const key = `${p.run}|${wall ? "wall" : "kerb"}`;
        byRunLine.set(key, [...(byRunLine.get(key) ?? []), s]);
        byRun.set(p.run, [...(byRun.get(p.run) ?? []), p]);
        // Keep-outs, measured to the footprint.
        const r = rectOf(p, yaw);
        for (const q of w.keepPoints) expect(rectDist(r, dot(q.x, q.z)), `${file} ${p.key} near a pole, lamp or node`).toBeGreaterThanOrEqual(FURN_KEEP_M * W - 1e-9);
        for (const [a, b] of w.keepSegments) {
          for (let i = 0; i <= 20; i++) expect(rectDist(r, dot(a.x + ((b.x - a.x) * i) / 20, a.z + ((b.z - a.z) * i) / 20)), `${file} ${p.key} near a drop`).toBeGreaterThanOrEqual(FURN_KEEP_M * W - 1e-9);
        }
        for (const q of w.keepRects) expect(rectDist(r, q), `${file} ${p.key} near a pad`).toBeGreaterThanOrEqual(FURN_KEEP_M * W - 1e-9);
        if (p.h > FURN_MAX_H_M) for (const q of w.wireRects) expect(rectDist(r, q), `${file} ${p.key} under a wire`).toBeGreaterThanOrEqual(WIRE_CLEAR - 1e-9);
        stats.pieces++;
        kinds.set(p.key, (kinds.get(p.key) ?? 0) + 1);
      }
      for (const [key, ss] of byRunLine) {
        ss.sort((a, b) => a - b);
        for (let i = 1; i < ss.length; i++) expect(ss[i]! - ss[i - 1]!, `${file} ${key} pitch`).toBeGreaterThanOrEqual(FURN_PITCH_M - 1e-6);
      }
      for (const [id, list] of byRun) {
        const run = runById.get(id)!;
        const trees = list.filter((p) => TREES.includes(p.key)).map((p) => inRun(w, run, p).s).sort((a, b) => a - b);
        for (let i = 1; i < trees.length; i++) expect(trees[i]! - trees[i - 1]!, `${file} ${id} trees`).toBeGreaterThanOrEqual(TREE_PITCH_M - 1e-6);
        const count = (keys: readonly CalibrationKey[]): number => list.filter((p) => keys.includes(p.key)).length;
        expect(count(HYDRANTS), `${file} ${id} hydrants`).toBeLessThanOrEqual(HYDRANT_PER_RUN);
        expect(count(MAILBOXES), `${file} ${id} mailboxes`).toBeLessThanOrEqual(MAILBOX_PER_RUN);
        expect(count(NEWSPAPERS), `${file} ${id} newspaper boxes`).toBeLessThanOrEqual(NEWSPAPER_PER_RUN);
        expect(count(BOLLARDS), `${file} ${id} bollards`).toBeLessThanOrEqual(BOLLARD_PER_RUN);
        expect(count(BUS_STOPS), `${file} ${id} bus stops`).toBeLessThanOrEqual(1);
        if (count(BUS_STOPS) > 0) expect(run.len / W, `${file} ${id} bus stop run`).toBeGreaterThanOrEqual(BUS_STOP_MIN_RUN_M);
        stats.runsWithAny++;
      }
      stats.runs += w.runs.length;
      stats.metres += w.runs.reduce((s, r) => s + r.len / W, 0);
      await yieldToWorker();
    }
    // Busy, not cluttered: a piece every 4 to 20 m of frontage on average, on most runs; every kind of item shows up on the ladder.
    const perMetre = stats.pieces / stats.metres;
    expect(perMetre).toBeGreaterThan(0.05);
    expect(perMetre).toBeLessThan(0.25);
    expect(stats.runsWithAny / stats.runs).toBeGreaterThan(0.5);
    const names = [...kinds.keys()].map((k) => k.slice("city-pack:".length));
    for (const want of ["Trashbin_01", "Trashbin_02", "Planter_01", "PotPlant_01", "ParkBench_01", "Mailbox_01", "Newspaper_02", "ParkingMeter_01", "Hydrant_01", "Env_Tree_01", "Env_Tree_02", "SidewalkPoles_02", "BusStop_01"]) {
      expect(names.some((n) => n.endsWith(want)), want).toBe(true);
    }
  }, 240000);

  it("is the same on the circuit's own streets as before: none, since a piece stands only by a terrace run, and a run is in an outer block", () => {
    for (const file of MAPS) {
      const w = worldOf(file);
      const circuit = new Set(w.town.roads.filter((r) => r.kind === "line" || r.kind === "feed").map((r) => r.id));
      const runRoads = new Set(w.town.terraces.map((r) => r.road));
      for (const road of runRoads) expect(circuit.has(road), `${file} ${road}`).toBe(false);
    }
  });
});

describe("open lots and alleys (criterion 10)", () => {
  it("openLotsOf finds every parking lot and plaza of the ladder exactly where town.ts laid it", () => {
    let parking = 0;
    let plaza = 0;
    for (const file of ladder()) {
      const town = townLayout(loadMap(file));
      const found = openLotsOf(town.terraces as TerraceRun[], town.lots);
      for (const o of town.openLots) {
        const same = found.find((f) => f.kind === o.kind && Math.abs(f.x - o.x) < 1e-6 && Math.abs(f.z - o.z) < 1e-6 && Math.abs(f.w - o.w) < 1e-9 && Math.abs(f.d - o.d) < 1e-9 && Math.cos(f.yaw - o.yaw) > 1 - 1e-9);
        expect(same, `${file} ${o.kind} ${o.run}`).toBeDefined();
        if (o.kind === "parking") parking++;
        else plaza++;
      }
      expect(found.length, file).toBe(town.openLots.length);
    }
    expect(parking).toBeGreaterThan(0);
    expect(plaza).toBeGreaterThan(0);
  }, 120000);

  it("dresses every open lot inside its own rectangle; the parking tiles cover the lot without overlap; the pole billboard is under the run's lowest cap; nothing overlaps", () => {
    let lots = 0;
    let boards = 0;
    for (const file of ladder()) {
      const w = worldOf(file);
      for (const open of w.town.openLots as OpenLot[]) {
        const mine = w.pieces.filter((p) => p.kind === open.kind && p.run === open.run);
        // A run holds both its parking lot and a plaza that starts after another: only this lot's rectangle's pieces.
        const ex = { x: Math.cos(open.yaw), z: -Math.sin(open.yaw) };
        const fz = { x: Math.sin(open.yaw), z: Math.cos(open.yaw) };
        const local = (p: FurniturePiece): { x: number; z: number } => ({ x: ((p.x - open.x) * ex.x + (p.z - open.z) * ex.z) / W, z: ((p.x - open.x) * fz.x + (p.z - open.z) * fz.z) / W });
        expect(mine.length, `${file} ${open.kind} ${open.run}`).toBeGreaterThan(0);
        const HW = open.w / W / 2;
        const HD = open.d / W / 2;
        const here = mine;
        for (const p of here) {
          const l = local(p);
          expect(Math.abs(l.x) + p.w / 2, `${file} ${p.key} x`).toBeLessThanOrEqual(HW + 1e-6);
          expect(Math.abs(l.z) + p.d / 2, `${file} ${p.key} z`).toBeLessThanOrEqual(HD + 1e-6);
        }
        lots++;
        if (open.kind === "parking") {
          const tiles = here.filter((p) => p.key === PARKING_LINES).map((p) => local(p).z).sort((a, b) => a - b);
          expect(tiles, `${file} tiles`).toHaveLength(2);
          expect(tiles[0]! - 2.5, `${file} tiles start at the back edge`).toBeCloseTo(-HD, 3);
          expect(tiles[1]! - tiles[0]!, `${file} tiles abut: no gap, no overlap`).toBeCloseTo(5, 3);
          expect(tiles[1]! + 2.5, `${file} tiles reach the front edge`).toBeCloseTo(HD, 3);
          expect(here.every((p) => p.flat === (p.key === PARKING_LINES)), `${file} only the tiles are flat`).toBe(true);
          const pole = here.find((p) => p.key === BILLBOARD_POLE);
          if (pole) {
            const board = here.find((p) => p.key === BILLBOARD_BOARD)!;
            expect(board, `${file} board`).toBeDefined();
            const top = Math.max(pole.h, board.lift + board.h);
            const caps = w.town.lots.filter((l) => l.terrace?.run === open.run).map((l) => l.hMax / W);
            expect(caps.length).toBeGreaterThan(0);
            expect(top, `${file} billboard height vs the run's lowest cap`).toBeLessThanOrEqual(Math.min(...caps) + 1e-9);
            expect(board.lift).toBeCloseTo(BILLBOARD_BOARD_LIFT_M, 9);
            boards++;
          }
        } else {
          expect(here.filter((p) => TREES.includes(p.key)).length, `${file} plaza trees`).toBeGreaterThanOrEqual(1);
          expect(here.filter((p) => p.flat === false && p.h < 0.2).length, `${file} paving`).toBe(4);
        }
        // No two solid pieces overlap (a billboard's board and its pole are one piece of two parts).
        const solid = here.filter((p) => !p.flat && p.h >= 0.2);
        for (let i = 0; i < solid.length; i++) {
          for (let j = i + 1; j < solid.length; j++) {
            const a = solid[i]!;
            const b = solid[j]!;
            if ((a.key === BILLBOARD_POLE && b.key === BILLBOARD_BOARD) || (a.key === BILLBOARD_BOARD && b.key === BILLBOARD_POLE)) continue;
            const hit = overlap(rectOf(a, open.yaw), rectOf(b, open.yaw)) && a.lift < b.lift + b.h && b.lift < a.lift + a.h;
            expect(hit, `${file} ${a.key} and ${b.key} overlap`).toBe(false);
          }
        }
      }
    }
    expect(lots).toBeGreaterThan(5);
    expect(boards).toBeGreaterThan(0);
  }, 240000);

  it("alleyOf: a corner-ended run with a gap of 1.0 to 1.5 m, from the last block's pieces; nothing otherwise", () => {
    const run = { ax: 0, az: 0, ux: 1, uz: 0, endAbuts: "corner" } as const;
    const block = { x: 10 * W, z: 0, w: 10 * W };
    expect(alleyOf(run, block, 1.2, 0.2, 1, 1.5)!.s0).toBeCloseTo(15.2, 9);
    expect(alleyOf(run, block, 1.2, 0.2, 1, 1.5)!.gap).toBe(1.2);
    expect(alleyOf(run, block, 1.0, 0, 1, 1.5)!.gap).toBe(1);
    expect(alleyOf(run, block, 1.5, 0, 1, 1.5)!.gap).toBe(1.5);
    expect(alleyOf(run, block, 0.9, 0, 1, 1.5)).toBeNull();
    expect(alleyOf(run, block, 1.6, 0, 1, 1.5)).toBeNull();
    expect(alleyOf({ ...run, endAbuts: "parking" }, block, 1.2, 0, 1, 1.5)).toBeNull();
    expect(alleyOf({ ...run, endAbuts: "plaza" }, block, 1.2, 0, 1, 1.5)).toBeNull();
    expect(alleyOf(run, null, 1.2, 0, 1, 1.5)).toBeNull();
    // A run that heads south (u = +z) measures along it.
    const south = alleyOf({ ax: 5, az: 5, ux: 0, uz: 1, endAbuts: "corner" }, { x: 5, z: 5 + 12 * W, w: 6 * W }, 1.25, 0.1, 1, 1.5)!;
    expect(south.s0).toBeCloseTo(12 + 3 + 0.1, 9);
    expect(south.gap).toBe(1.25);
  });

  it("puts one or two bins in an alley, inside its walls and behind the front, and every alley of the ladder is a corner-ended run's", () => {
    let alleys = 0;
    let bins = 0;
    for (const file of ladder()) {
      const w = worldOf(file);
      const runById = new Map(w.runs.map((r) => [r.id, r] as const));
      for (const [id, a] of w.alleys) {
        expect(a.gap, file).toBeGreaterThanOrEqual(ALLEY_MIN_M - 1e-9);
        expect(a.gap, file).toBeLessThanOrEqual(ALLEY_MAX_M + 1e-9);
        expect(runById.get(id)?.endAbuts, `${file} ${id}`).toBe("corner");
        alleys++;
      }
      const inAlley = w.pieces.filter((p) => p.kind === "alley");
      const perRun = new Map<string, number>();
      for (const p of inAlley) {
        const run = runById.get(p.run)!;
        const a = w.alleys.get(p.run)!;
        expect(a, `${file} ${p.run} has an alley`).toBeDefined();
        const { s, t } = inRun(w, run, p);
        expect(s - p.w / 2, `${file} inside the left wall`).toBeGreaterThanOrEqual(a.s0 - 1e-6);
        expect(s + p.w / 2, `${file} inside the right wall`).toBeLessThanOrEqual(a.s0 + a.gap + 1e-6);
        expect(t + p.d / 2, `${file} behind the front`).toBeLessThanOrEqual(1e-6);
        expect(t - p.d / 2, `${file} not past the lot's depth`).toBeGreaterThanOrEqual(-6);
        expect(p.ground).toBe("yard");
        perRun.set(p.run, (perRun.get(p.run) ?? 0) + 1);
        bins++;
      }
      for (const n of perRun.values()) expect(n).toBeLessThanOrEqual(2);
      // No pavement piece stands in front of the alley's mouth.
      for (const p of w.pieces.filter((q) => q.kind === "pavement")) {
        const a = w.alleys.get(p.run);
        if (!a) continue;
        const { s } = inRun(w, runById.get(p.run)!, p);
        expect(s + p.w / 2 > a.s0 - 0.5 + 1e-6 && s - p.w / 2 < a.s0 + a.gap + 0.5 - 1e-6, `${file} ${p.key} blocks an alley mouth`).toBe(false);
      }
    }
    expect(alleys).toBeGreaterThan(10);
    expect(bins).toBeGreaterThan(5);
  }, 240000);
});

describe("furniture changes nothing else (criterion 11)", () => {
  it("leaves the town's lots, runs, open lots and places as they were (deep-equal, and the frozen town takes no write)", () => {
    for (const file of MAPS) {
      const puzzle = loadMap(file);
      const town = townLayout(puzzle);
      const before = JSON.stringify(town);
      const w = worldOf(file);
      expect(w.pieces.length, file).toBeGreaterThan(0);
      expect(JSON.stringify(townLayout(puzzle)), file).toBe(before);
      expect(townLayout(puzzle)).toBe(town);
      expect(Object.isFrozen(town.lots) && Object.isFrozen(town.terraces) && Object.isFrozen(town.openLots) && Object.isFrozen(town.places), file).toBe(true);
    }
  });

  for (const file of MAPS) {
    it(`on ${file}: the pick targets, the places, the lots and the dressing are identical with and without furniture`, () => {
      const a = buildScene(loadMap(file), { text: stubTextSurface });
      const withoutF = applyModels(a, SET_NO_FURN);
      const targetsWithout = pickTargets(a.scene);
      const placesWithout = [...a.places.keys()];
      const dressWithout = withoutF.dress;
      const lotsWithout = a.slots.blocks.list;
      expect(withoutF.furniture).toEqual([]);
      expect(furnitureGroupOf(a)).toBeUndefined();
      withoutF.remove();
      a.dispose();
      const b = buildScene(loadMap(file), { text: stubTextSurface });
      const withF = applyModels(b, SET);
      expect(furnitureGroupOf(b), file).toBeDefined();
      expect(pickTargets(b.scene)).toEqual(targetsWithout);
      expect([...b.places.keys()]).toEqual(placesWithout);
      expect(withF.dress).toEqual(dressWithout);
      expect(b.slots.blocks.list).toEqual(lotsWithout);
      withF.remove();
      b.dispose();
    }, 60000);
  }
});

describe("applyModels draws the furniture as instanced meshes", () => {
  for (const file of MAPS) {
    it(`on ${file}: one InstancedMesh per key at the pure placements, in a group of its own; none raycasts or glows; keep-outs and the dressing's footprints hold; remove() takes it away`, () => {
      const bundle = buildScene(loadMap(file), { text: stubTextSurface });
      const applied = applyModels(bundle, SET);
      const group = furnitureGroupOf(bundle)!;
      expect(group, file).toBeDefined();
      expect(group.name).toBe("city-furniture");
      expect(applied.furniture.length, file).toBeGreaterThan(file === "01-first-light" ? 3 : 30);
      const meshes = instanced(group);
      expect(applied.furnitureCalls).toBe(meshes.length);
      expect(meshes.length).toBeLessThanOrEqual(FURN_DRAW_CALLS_MAX);
      expect(meshes.reduce((s, m) => s + m.count, 0), "every fixture key is one mesh, so one instance per piece").toBe(applied.furniture.length);
      // Each instance's matrix is the pure placement's (float32 rounding aside).
      const byKey = new Map<string, FurniturePiece[]>();
      for (const p of applied.furniture) byKey.set(p.key, [...(byKey.get(p.key) ?? []), p]);
      const m = new Matrix4();
      for (const im of meshes) {
        const list = byKey.get(`city-pack:${im.name.slice("dress:".length)}`)!;
        expect(list, im.name).toBeDefined();
        expect(im.count).toBe(list.length);
        list.forEach((p, i) => {
          im.getMatrixAt(i, m);
          const want = dressMatrix(furniturePlacement(p).frame, furniturePlacement(p).piece).elements;
          m.elements.forEach((v, k) => expect(Math.abs(v - Math.fround(want[k]!)), `${im.name} ${i} [${k}]`).toBeLessThan(1e-6));
        });
        const mats = Array.isArray(im.material) ? im.material : [im.material];
        for (const mat of mats) expect((mat as MeshStandardMaterial).emissive.getHex(), im.name).toBe(0);
      }
      const hit: unknown[] = [];
      new Raycaster(new Vector3(0, 50, 0), new Vector3(0, -1, 0)).intersectObject(group, true, hit as never);
      expect(hit).toHaveLength(0);
      expect(group.userData["pickKind"]).toBeUndefined();
      // The keep-outs hold on the path the town takes (poles, lamps, nodes from the scene itself).
      const w = worldOf(file);
      for (const p of applied.furniture.filter((q) => q.kind === "pavement")) {
        const run = w.runs.find((r) => r.id === p.run)!;
        const r = rectOf(p, inRun(w, run, p).yaw);
        for (const q of w.keepPoints) expect(rectDist(r, dot(q.x, q.z)), `${file} ${p.key}`).toBeGreaterThanOrEqual(FURN_KEEP_M * W - 1e-9);
        // The nearest node or pole is far enough that a tall piece cannot hide it (the 25 degree occlusion rule of the lots).
        const nearest = Math.min(...w.keepPoints.map((q) => rectDist(r, dot(q.x, q.z))));
        expect(p.h * W, `${file} ${p.key} height vs distance to the circuit`).toBeLessThanOrEqual(OCCLUDE_SLOPE * nearest);
      }
      // A tall piece never stands under an awning, a sign or a fire escape: nothing of the dressing's footprint overlaps a taller piece of furniture.
      for (const p of applied.furniture.filter((q) => q.kind === "pavement" || q.kind === "alley")) {
        const run = w.runs.find((r) => r.id === p.run)!;
        const r = rectOf(p, inRun(w, run, p).yaw);
        for (const d of applied.dress) {
          if (d.piece.slot === "glass") continue;
          const c = Math.cos(d.frame.yaw);
          const n = Math.sin(d.frame.yaw);
          const x = d.frame.x + (d.piece.x * c + d.piece.z * n) * W;
          const z = d.frame.z + (-d.piece.x * n + d.piece.z * c) * W;
          const hx = ((Math.abs(c) * d.piece.w + Math.abs(n) * d.piece.d) / 2) * W;
          const hz = ((Math.abs(n) * d.piece.w + Math.abs(c) * d.piece.d) / 2) * W;
          if (overlap(r, { minX: x - hx, minZ: z - hz, maxX: x + hx, maxZ: z + hz })) expect(p.h, `${file} ${p.key} under ${d.piece.key}`).toBeLessThanOrEqual(d.piece.y + 1e-9);
        }
      }
      // Furniture stands on its layer: pavement pieces on the pavement, the rest on the yard, flat tiles a hair above.
      for (const p of applied.furniture) expect(["pavement", "yard"]).toContain(p.ground);
      applied.remove();
      expect(furnitureGroupOf(bundle)).toBeUndefined();
      bundle.dispose();
    }, 60000);
  }

  it("draws nothing without the City Pack, without the dressing asked for, or with no furniture key in the pack; a missing key drops only its own pieces", async () => {
    const bundle = buildScene(loadMap("64-the-whole-chain"), { text: stubTextSurface });
    for (const set of [NO_MODELS, SET_NO_CITY, await setOf(manifestOf(ALL), { furniture: false })]) {
      const applied = applyModels(bundle, set);
      expect(applied.furniture).toEqual([]);
      expect(applied.furnitureCalls).toBe(0);
      expect(furnitureGroupOf(bundle)).toBeUndefined();
      applied.remove();
    }
    const noTrees = await setOf(manifestOf(ALL.filter((e) => !/Env_Tree_/.test(e.name))));
    expect(noTrees.dress!.map((d) => d.entry.name)).not.toContain("SM_Env_Tree_01");
    const applied = applyModels(bundle, noTrees);
    expect(applied.furniture.length).toBeGreaterThan(30);
    expect(applied.furniture.some((p) => TREES.includes(p.key))).toBe(false);
    expect(applied.furniture.some((p) => p.key.endsWith("Trashbin_01") || p.key.endsWith("Trashbin_02"))).toBe(true);
    applied.remove();
    const noNode = await setOf(manifestOf(ALL), { lack: ["SM_Prop_ParkBench_01"] });
    const applied2 = applyModels(bundle, noNode);
    expect(applied2.furniture.some((p) => p.key.endsWith("ParkBench_01"))).toBe(false);
    expect(applied2.furniture.length).toBeGreaterThan(30);
    applied2.remove();
    bundle.dispose();
  }, 60000);
});

describe("loadModels carries the furniture keys, the flat parking tile included", () => {
  it("loads every furniture key after the dressing keys in order, the 10 x 0 x 5 m tile too, and drops only a key the pack lacks", async () => {
    const names = SET.dress!.map((m) => `${m.pack}:${m.entry.name}`);
    expect(names).toEqual([...dressKeys(), ...furnitureKeys()]);
    const tile = SET.dress!.find((m) => m.entry.name === "SM_Env_Road_ParkingLines_01")!;
    expect(tile.root.name).toBe("SM_Env_Road_ParkingLines_01");
    const lacking = await setOf(manifestOf(ALL.filter((e) => e.name !== "SM_Env_Road_ParkingLines_01")));
    expect(lacking.dress!.map((m) => m.entry.name)).not.toContain("SM_Env_Road_ParkingLines_01");
    expect(lacking.dress).toHaveLength(names.length - 1);
    // A flat tile that is `scale-suspect`, or one with no depth, is not a tile.
    const bad = ALL.map((e) => (e.name === "SM_Env_Road_ParkingLines_01" ? { ...e, warnings: ["scale-suspect" as const] } : e));
    expect((await setOf(manifestOf(bad))).dress!.map((m) => m.entry.name)).not.toContain("SM_Env_Road_ParkingLines_01");
    // With no City Pack nothing loads, and the set is the null the placer reads as "no dressing".
    expect(SET_NO_CITY.dress).toBeNull();
    // Passing a BUILDING_FRONTS line for a furniture key is not needed: the guess "+z" is the default.
    expect(BUILDING_FRONTS["city-pack:SM_Prop_Hydrant_01" as CalibrationKey]).toBeUndefined();
  });
});
