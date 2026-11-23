/**
 * Ticket 070, section E: the plan drawn in 3D (`plan3d.ts`, the two entries split out of `tilecity3d.ts`, the routing in `renderer.ts`). No WebGL: every GLB is a fake group (a one-box mesh per key). The 20 named runs
 * (6 x 6 seeds 1 to 10, one-way off and on) are built once, through a module-level cache. `city-pack.glb` is read only inside the `it` that says so, which skips when it is absent; no timer, no path but forward slashes.
 * HEAVY: 120 s.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Box3, Frustum, Matrix4, PerspectiveCamera, BoxGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Scene, Texture, Vector3, type Material, type Object3D, type WebGLRenderer } from "three";
import type { AssetEntry, CalibrationKey, CityBuildingsLayer, CityFacadesLayer, CityGroundLayer, CityGroundPiece, CityKerbPath, CityCell, CityMassLayer, CityPlan, CityPlacement, CitySide } from "../core";
import { stableHash } from "../render/city";
import { digestOf } from "../city/pipeline";
import { FULL_CITIES, NAMED, VARIED, sharedCity } from "../city/testing/namedcities";
import { yieldToWorker } from "../city/testing/yield";
import { KEY_OF_KIND, TRAFFIC_ALLOWED, TRAFFIC_BOUNDS, MAST, boundsOf } from "../city/traffic/kit";
import { KERB_GAP_MAX_M, KERB_HEIGHT_TOL_M, KERB_TOL_M, type KerbFace, type KerbPlan, type Mp } from "./kerbline";
import {
  PLAN_ARROW,
  PLAN_DOOR_CORNERS,
  PLAN_FRONTS,
  PLAN_LINES,
  PLAN_PARTY_PIPE,
  PLAN_PARTY_WINDOW,
  PLAN_TRAFFIC_ALLOWED,
  PLAN_TRAFFIC_KEYS,
  PlanStopError,
  furnitureStages,
  planTrafficDraws,
  type PlanTrafficDraw,
  dressStage,
  planAudit,
  planDressDraws,
  planInput,
  planPropDraws,
  planTileKeys,
  propStage,
  type PlanDressDraw,
  type PlanInstanced,
  type PlanPropDraw,
  planGroundDraws,
  planPieceDraws,
  type PlanDraw,
  type PlanGroundDraw,
  type PlanPieceDraw,
  arrowYaw,
  createPlanAssembleRenderer3d,
  kerbSegFaces,
  massInteriorItems,
  plan3dGroups,
  planAssembleRequested,
  tilesPlanRequested,
  planCells,
  planFailureText,
  planKerbPlan,
  planKeyOf,
  planKeys,
  planStreetPose,
} from "./plan3d";
import { NO_MODELS, allStackKeys, dressMatrix, partMatrix, type LoadedModel, type ModelSet } from "./models3d";
import { CODE_ESCAPE_KEY } from "./escapes";
import { CITY_NEVER_USED } from "./citymetrics";
import { DRESS_DRAW_CALLS_MAX, DRESS_MAX, dressKeys } from "./dressing";
import { FURN_DRAW_CALLS_MAX, furnitureKeys } from "./furniture";
import { tileCity, TILE_M, type TileCell } from "./tilecity";
import { interiorGroup, tileGroup } from "./tilecity3d";
import { INTERIOR_DRAW_CALLS_MAX, INTERIOR_KEYS, KERB_INSET_M, KERB_LIP_TOP_M, PASSAGE_FLOOR_KEYS, TILE_DRAW_CALLS_MAX, TILE_FRONTS, TILE_PROPS, TILE_SLOTS, TILE_TREES, tileKeys } from "./tileslots";
import { CITY_GROUND_VARIANT } from "../core";

// Most tests here are one long synchronous stretch (the named runs are built once, through the cache). A macrotask between tests lets the runner's reports to the main process through, so a slow file is not reported as a timeout.
beforeEach(async () => {
  await new Promise<void>((done) => setTimeout(done, 0));
});

// ---- the 20 named runs ----

interface City {
  readonly seed: number;
  readonly way: "on" | "off";
}
const label = (o: City): string => `6 x 6 seed ${o.seed} one-way ${o.way}`;
function planOf(o: City): CityPlan {
  const r = sharedCity({ blocksX: 6, blocksZ: 6, seed: o.seed, way: o.way }, "clean");
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  return r.plan;
}
const DEFAULT: City = { seed: 1, way: "on" };

// ---- a fake pack ----

const sizeOfKey = (key: CalibrationKey): [number, number, number] => {
  const name = key.slice(key.indexOf(":") + 1);
  if (name.includes("ParkingLines")) return [10, 0, 5];
  if (name.includes("Patch")) return [1.8, 0, 1.8];
  if (name.includes("Sidewalk")) return [5, 0.3, 5];
  if (name.includes("Tree")) return [2, 4.2, 2.5];
  return [5, 0, 5];
};
const entryOf = (key: CalibrationKey, i: number): AssetEntry => {
  const [w, h, d] = sizeOfKey(key);
  const name = key.slice(key.indexOf(":") + 1);
  return { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles: 10 + i, textures: [], missingTextures: [], warnings: [] };
};
const BOX = new BoxGeometry(1, 1, 1);
const MAT = new MeshBasicMaterial();
const rootOf = (key: CalibrationKey, meshes = 1): Object3D => {
  const g = new Group();
  g.name = key.slice(key.indexOf(":") + 1);
  for (let i = 0; i < meshes; i++) {
    const m = new Mesh(BOX, MAT);
    m.position.set(0, i, 0);
    m.updateMatrix();
    g.add(m);
  }
  return g;
};
interface Pack {
  roots: Map<CalibrationKey, Object3D>;
  entries: Map<CalibrationKey, AssetEntry>;
}
const pack = (keys: readonly CalibrationKey[], lack: readonly CalibrationKey[] = []): Pack => {
  const roots = new Map<CalibrationKey, Object3D>();
  const entries = new Map<CalibrationKey, AssetEntry>();
  keys.forEach((key, i) => {
    if (lack.includes(key)) return;
    roots.set(key, rootOf(key));
    entries.set(key, entryOf(key, i));
  });
  return { roots, entries };
};
const PLAN_PACK_KEYS = [...planKeys(), ...TILE_TREES];
const ACTIVE = new Set<CalibrationKey>(planKeys());
const none = { roots: new Map<CalibrationKey, Object3D>(), entries: new Map<CalibrationKey, AssetEntry>() };

const cellId = (i: number, j: number): string => `${i},${j}`;
const V = CITY_GROUND_VARIANT;

// ---- the page's flags ----

describe("planAssembleRequested", () => {
  it("is null unless city=plan with stage assemble or 9", () => {
    expect(planAssembleRequested("")).toBeNull();
    expect(planAssembleRequested("?city=tiles&stage=assemble")).toBeNull();
    expect(planAssembleRequested("?stage=assemble")).toBeNull();
    expect(planAssembleRequested("?city=plan")).toBeNull();
    expect(planAssembleRequested("?city=plan&stage=streets")).toBeNull();
    expect(planAssembleRequested("?city=plan&stage=8")).toBeNull();
    for (const text of ["assemble", "ASSEMBLE", "9"]) expect(planAssembleRequested(`?view=3d&city=plan&stage=${text}`), text).not.toBeNull();
  });

  it("reads blocks and seed as planViewRequested does (default 6 x 6 seed 1), and the street camera's flags", () => {
    expect(planAssembleRequested("?city=plan&stage=assemble")).toEqual({ blocksX: 6, blocksZ: 6, seed: 1, street: false, at: null, dir: null, era: "clean" });
    expect(planAssembleRequested("?city=plan&stage=9&blocks=6x6&seed=3")).toMatchObject({ blocksX: 6, blocksZ: 6, seed: 3 });
    expect(planAssembleRequested("?city=plan&stage=9&blocks=2x4&seed=x")).toMatchObject({ blocksX: 2, blocksZ: 4, seed: 1 });
    expect(planAssembleRequested("?city=plan&stage=9&cam=street&at=12,30&dir=-z")).toMatchObject({ street: true, at: { i: 12, j: 30 }, dir: "-z" });
    expect(planAssembleRequested("?city=plan&stage=9&cam=street&at=nope&dir=up")).toMatchObject({ street: true, at: null, dir: null });
  });
});

// ---- criterion 1: the two entries change nothing for city=tiles ----

describe("tileGroupOf and interiorGroupOf (criterion 1)", () => {
  // The hash of what `tileGroup` and `interiorGroup` gave on the default `city=tiles` city before they were split (`git show HEAD:src/render3d/tilecity3d.ts` at de39c42, run once and typed in): the counts, the instances
  // per key and every instance matrix, to 1e-5.
  function hashDraw(d: { group: Group; calls: number; fromPack: number; codeDrawn: number; perKey: ReadonlyMap<CalibrationKey, number> }): number {
    const parts: string[] = [`calls ${d.calls}`, `pack ${d.fromPack}`, `code ${d.codeDrawn}`, ...[...d.perKey].sort().map(([k, n]) => `${k}=${n}`)];
    for (const im of d.group.children as InstancedMesh[]) {
      parts.push(`${im.name}:${im.count}`);
      const a = im.instanceMatrix.array;
      for (let i = 0; i < im.count * 16; i++) parts.push(String(Math.round(a[i]! * 1e5) / 1e5));
    }
    return stableHash(parts.join("|"));
  }
  const city = tileCity({ blocksX: 3, blocksZ: 3, seed: 1 });
  const full = pack([...tileKeys(), ...TILE_PROPS]);
  const PINS = { codeTiles: 2604615310, codeInterior: 4165869471, packTiles: 563102844, packInterior: 2759357387 } as const;

  it("give the same counts, instances per key and matrices as before on the default tile city, in code and from a pack", () => {
    expect(hashDraw(tileGroup(city, none.roots, none.entries))).toBe(PINS.codeTiles);
    expect(hashDraw(interiorGroup(city, none.roots, none.entries))).toBe(PINS.codeInterior);
    expect(hashDraw(tileGroup(city, full.roots, full.entries))).toBe(PINS.packTiles);
    expect(hashDraw(interiorGroup(city, full.roots, full.entries))).toBe(PINS.packInterior);
  });
});

// ---- the arrow's turn ----

describe("the arrow's turn (criterion 5)", () => {
  const SIDES: readonly CitySide[] = ["+x", "-x", "+z", "-z"];
  const DIR: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };

  it("puts the arrow's own +z on the side it is asked to point at, for each of the four sides", () => {
    for (const side of SIDES) {
      const total = arrowYaw(side) + PLAN_FRONTS[PLAN_ARROW]!;
      const v = new Vector3(0, 0, 1).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (total * Math.PI) / 180));
      expect([Math.round(v.x) + 0, Math.round(v.z) + 0], side).toEqual(DIR[side]);
    }
    expect(PLAN_FRONTS[PLAN_ARROW]).toBe(90);
    // The other keys keep the tile city's turns.
    for (const [key, turn] of Object.entries(TILE_FRONTS)) expect(PLAN_FRONTS[key as CalibrationKey], key).toBe(turn);
  });

  const have = existsSync(join("assets", "private", "out", "city-pack.glb"));
  it.skipIf(!have)("is measured from the converted City Pack: the piece is a whole 5 m road tile, and its arrow head is on its +z side, so the turn is 90 (skipped when the GLB is absent)", () => {
    const glb = readFileSync(join("assets", "private", "out", "city-pack.glb"));
    const jsonLen = glb.readUInt32LE(12);
    interface Prim {
      attributes: { POSITION: number; TEXCOORD_0: number };
      indices: number;
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
    const floats = (a: number, i: number, n: number): number[] => {
      const acc = gltf.accessors[a]!;
      const bv = gltf.bufferViews[acc.bufferView]!;
      const at = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0) + i * (bv.byteStride ?? n * 4);
      return Array.from({ length: n }, (_, o) => bin.readFloatLE(at + o * 4));
    };
    interface Tri {
      p: number[][];
      t: number[][];
    }
    const trisOf = (name: string): Tri[] => {
      const out: Tri[] = [];
      const walk = (n: { mesh?: number; children?: number[] }): void => {
        for (const prim of n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives : []) {
          const count = gltf.accessors[prim.indices]!.count;
          for (let q = 0; q + 2 < count; q += 3) {
            const ids = [0, 1, 2].map((o) => index(prim.indices, q + o));
            out.push({ p: ids.map((i) => floats(prim.attributes.POSITION, i, 3)), t: ids.map((i) => floats(prim.attributes.TEXCOORD_0, i, 2)) });
          }
        }
        for (const c of n.children ?? []) walk(gltf.nodes[c]!);
      };
      const root = gltf.nodes.find((n) => n.name === name);
      expect(root, name).toBeDefined();
      walk(root!);
      return out;
    };
    const area = (t: Tri): number => Math.abs((t.p[1]![2]! - t.p[0]![2]!) * (t.p[2]![0]! - t.p[0]![0]!) - (t.p[1]![0]! - t.p[0]![0]!) * (t.p[2]![2]! - t.p[0]![2]!)) / 2;
    const arrow = trisOf("SM_Env_Road_Arrow_01");
    // A whole 5 m road tile: its triangles cover the 5 x 5 square (25 m2), and it stands flat (every vertex at y 0).
    expect(arrow.reduce((s, t) => s + area(t), 0)).toBeCloseTo(25, 2);
    expect(Math.max(...arrow.flatMap((t) => t.p.map((q) => Math.abs(q[1]!))))).toBeLessThan(1e-4);
    // The white paint's texel: the one the edge lines of `Road_Lines_01` use (its triangles at |x| over 2.3).
    const edge = trisOf("SM_Env_Road_Lines_01").find((t) => Math.abs((t.p[0]![0]! + t.p[1]![0]! + t.p[2]![0]!) / 3) > 2.3)!;
    const white = edge.t[0]!;
    const paint = arrow.filter((t) => t.t.every((u) => Math.abs(u[0]! - white[0]!) < 0.02 && Math.abs(u[1]! - white[1]!) < 0.02) && t.p.every((q) => Math.abs(q[0]!) < 2.2));
    expect(paint.length).toBeGreaterThan(5);
    const inTri = (x: number, z: number, t: Tri): boolean => {
      const [a, b, c] = t.p as [number[], number[], number[]];
      const d = (b[0]! - a[0]!) * (c[2]! - a[2]!) - (c[0]! - a[0]!) * (b[2]! - a[2]!);
      const u = ((x - a[0]!) * (c[2]! - a[2]!) - (c[0]! - a[0]!) * (z - a[2]!)) / d;
      const v = ((b[0]! - a[0]!) * (z - a[2]!) - (x - a[0]!) * (b[2]! - a[2]!)) / d;
      return u >= 0 && v >= 0 && u + v <= 1;
    };
    // The width of the paint at each z: the stem is narrow, the head wide. The widest slice is on the +z side.
    let widest = { z: 0, w: 0 };
    for (let z = -2.4; z <= 2.4; z += 0.1) {
      let w = 0;
      for (let x = -2.2; x <= 2.2; x += 0.05) if (paint.some((t) => inTri(x, z, t))) w += 0.05;
      if (w > widest.w) widest = { z, w };
    }
    expect(widest.z).toBeGreaterThan(0.5);
    expect(widest.w).toBeGreaterThan(1.5);
  });
});

// ---- the street pieces: the key choice ----

describe("planKeyOf and planCells (criteria 2 and 5)", () => {
  const plan = planOf(DEFAULT);
  const streets = plan.layers.streets!;
  const ground = plan.layers.edge!.ground!;

  it("copies every ground record as one cell with its own fields, and marks the arrows and the one-way lanes", () => {
    const set = planCells(streets, ground);
    expect(set.cells).toHaveLength(ground.length);
    set.cells.forEach((c, i) => {
      const g = ground[i]!;
      expect([c.i, c.j, c.cells, c.role, c.x_m, c.z_m, c.street]).toEqual([g.i, g.j, g.cells, g.role, g.x_m, g.z_m, g.street]);
    });
    expect(set.arrows.size).toBe(streets.arrows.length);
    expect(streets.arrows.length).toBeGreaterThan(0);
    const flow = new Map(streets.streets.map((s) => [s.id, s.flow] as const));
    for (const c of set.cells) expect(set.oneWay.has(c), `${c.i},${c.j}`).toBe(c.role === "lane" && c.street !== null && flow.get(c.street) !== "both");
    // An arrow with no lane record to draw it on is a plan the drawing cannot draw.
    const lost = { ...streets, arrows: [...streets.arrows, { i: 0, j: 0, street: "x:0", toward: "+x" as const }] };
    expect(() => planCells(lost, ground.filter((g) => !(g.i === 0 && g.j === 0)))).toThrow(PlanStopError);
  });

  it("draws a dipped pavement cell from Sidewalk_Dip_01 when it is active and in code when it is not; a flush cell is the slab", () => {
    const set = { arrows: new Set<TileCell>(), oneWay: new Set<TileCell>() };
    const cell = { i: 1, j: 1, cells: 1 as const, role: "pavement" as const, variant: V.pavementDip, x_m: 7.5, z_m: 7.5, yaw: 0 as const, street: "x:0" };
    expect(planKeyOf(cell, ACTIVE, set)).toBe(TILE_SLOTS.kerbCut[0]);
    const lacking = new Set(ACTIVE);
    lacking.delete(TILE_SLOTS.kerbCut[0]!);
    expect(planKeyOf(cell, lacking, set)).toBeNull();
    expect(() => planKeyOf({ ...cell, variant: V.pavementDip | V.pavementFlush }, ACTIVE, set)).toThrow(PlanStopError);
    expect(PASSAGE_FLOOR_KEYS).toContain(planKeyOf({ ...cell, variant: V.pavementFlush }, ACTIVE, set));
    expect(planKeyOf({ ...cell, variant: 0 }, ACTIVE, set)).toBe(TILE_SLOTS.pavement[0]);
    expect(planKeyOf({ ...cell, variant: V.pavementGrate }, ACTIVE, set)).toBe(TILE_SLOTS.pavement[1]);
  });

  it("draws a one-way lane from Road_Lines_01 (Road_Bare_01 without it), never a yellow-line piece, and an arrow cell from the arrow", () => {
    const lane = { i: 1, j: 1, cells: 1 as const, role: "lane" as const, variant: 0, x_m: 7.5, z_m: 7.5, yaw: 0 as const, street: "x:0" };
    const arrowCell = { ...lane, i: 2 };
    const set = { arrows: new Set([arrowCell]), oneWay: new Set([lane, arrowCell]) };
    expect(planKeyOf(lane, ACTIVE, set)).toBe(PLAN_LINES);
    expect(planKeyOf(arrowCell, ACTIVE, set)).toBe(PLAN_ARROW);
    const noArrow = new Set(ACTIVE);
    noArrow.delete(PLAN_ARROW);
    expect(planKeyOf(arrowCell, noArrow, set)).toBe(PLAN_LINES);
    const noLines = new Set(noArrow);
    noLines.delete(PLAN_LINES);
    expect(planKeyOf(lane, noLines, set)).toBe(TILE_SLOTS.junction[0]);
    noLines.delete(TILE_SLOTS.junction[0]!);
    expect(planKeyOf(lane, noLines, set)).toBeNull();
    // A two-way lane keeps the tile city's yellow lines, by its variant.
    const two = { arrows: new Set<TileCell>(), oneWay: new Set<TileCell>() };
    expect(planKeyOf(lane, ACTIVE, two)).toBe(TILE_SLOTS.lane[0]);
    expect(planKeyOf({ ...lane, variant: V.laneRight }, ACTIVE, two)).toBe(TILE_SLOTS.lane[1]);
  });
});

// ---- the stall rows ----

describe("massInteriorItems (criterion 2, the interiors)", () => {
  const cell = (i: number, j: number, use: CityMassLayer["cells"][number]["use"]): CityMassLayer["cells"][number] => ({ i, j, block: "block:0:0", part: null, use, opening: null });
  const massOf = (cells: CityMassLayer["cells"][number][], stall: [number, number][], aisle: [number, number][]): CityMassLayer => ({
    stage: "mass",
    cells,
    built: [],
    openings: [],
    courts: [{ block: "block:0:0", serves: "block:0:0", opening: "block:0:0/a/drive/0", stallCells: stall.map(([i, j]) => ({ i, j })), aisleCells: aisle.map(([i, j]) => ({ i, j })), stalls: 4 }],
    units: [],
  });

  it("pairs each run of stall cells from its low end and turns it toward the aisle", () => {
    // A row along x at j 7, the aisle at j 8 (on +z): yaw 0; its twin at j 9 with the aisle on -z: 180.
    const m = massOf([cell(12, 7, "stalls"), cell(13, 7, "stalls"), cell(14, 7, "stalls"), cell(15, 7, "stalls"), cell(12, 8, "aisle"), cell(13, 8, "aisle"), cell(14, 8, "aisle"), cell(15, 8, "aisle"), cell(12, 9, "stalls"), cell(13, 9, "stalls")], [[12, 7], [13, 7], [14, 7], [15, 7], [12, 9], [13, 9]], [[12, 8], [13, 8], [14, 8], [15, 8]]);
    const stalls = massInteriorItems(m).filter((it) => it.kind === "stalls");
    expect(stalls.map((s) => [s.i, s.j, s.x_m, s.z_m, s.yaw, s.cells])).toEqual([
      [12, 7, 13 * TILE_M, 7.5 * TILE_M, 0, 2],
      [14, 7, 15 * TILE_M, 7.5 * TILE_M, 0, 2],
      [12, 9, 13 * TILE_M, 9.5 * TILE_M, 180, 2],
    ]);
    // A row along z at i 7 with the aisle at i 8 (on +x): yaw 90; at i 9 with the aisle on -x: 270.
    const z = massOf([cell(7, 8, "stalls"), cell(7, 9, "stalls"), cell(8, 8, "aisle"), cell(8, 9, "aisle"), cell(9, 8, "stalls"), cell(9, 9, "stalls")], [[7, 8], [7, 9], [9, 8], [9, 9]], [[8, 8], [8, 9]]);
    expect(massInteriorItems(z).filter((it) => it.kind === "stalls").map((s) => [s.i, s.j, s.yaw])).toEqual([[7, 8, 90], [9, 8, 270]]);
  });

  it("stops (PlanStopError, the cells named) on an odd run, a row with aisle cells on both sides or on neither, and stalls that are not one row", () => {
    const odd = massOf([cell(0, 0, "stalls"), cell(1, 0, "stalls"), cell(2, 0, "stalls"), cell(0, 1, "aisle")], [[0, 0], [1, 0], [2, 0]], [[0, 1]]);
    expect(() => massInteriorItems(odd)).toThrow(/cannot be paired/);
    const both = massOf([cell(0, 1, "stalls"), cell(1, 1, "stalls"), cell(0, 0, "aisle"), cell(0, 2, "aisle")], [[0, 1], [1, 1]], [[0, 0], [0, 2]]);
    expect(() => massInteriorItems(both)).toThrow(/both sides/);
    const neither = massOf([cell(0, 0, "stalls"), cell(1, 0, "stalls")], [[0, 0], [1, 0]], []);
    expect(() => massInteriorItems(neither)).toThrow(/neither side/);
    const block = massOf([cell(0, 0, "stalls"), cell(1, 0, "stalls"), cell(0, 1, "stalls"), cell(1, 1, "stalls"), cell(0, 2, "aisle")], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 2]]);
    expect(() => massInteriorItems(block)).toThrow(/not one straight row/);
    try {
      massInteriorItems(odd);
    } catch (e) {
      expect((e as PlanStopError).cells).toHaveLength(3);
    }
  });


  it("leaves a frontage lot's cells bare (the layer gives them no row to line)", () => {
    const m = massOf([cell(0, 0, "frontLot"), cell(1, 0, "frontLot"), cell(0, 1, "frontLot"), cell(1, 1, "frontLot")], [], []);
    const items = massInteriorItems(m);
    expect(items).toHaveLength(4);
    expect(items.every((it) => it.kind === "bare")).toBe(true);
  });
});

// ---- the kerb on the line ----

function distToSeg(p: Mp, a: Mp, b: Mp): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}
interface Line {
  kind: string;
  a: Mp;
  b: Mp;
  path: string;
}
/** The lines the faces have to lie on, written out here from the paths alone (not from the plan): a street edge, a crossing dip, a dip and a flank stand `KERB_INSET_M` inside the nominal line, a return runs from the street kerb face to its building-line end. */
function expectedLines(paths: readonly CityKerbPath[]): Line[] {
  const out: Line[] = [];
  const shift = (p: Mp, d: Mp): Mp => ({ x: p.x + d.x * KERB_INSET_M, z: p.z + d.z * KERB_INSET_M });
  for (const p of paths) {
    for (const s of p.segs) {
      if (s.kind === "opening") continue;
      if (s.kind === "return") out.push({ kind: "return", a: shift(s.which === "near" ? s.a : s.b, p.across), b: s.which === "near" ? s.b : s.a, path: p.id });
      else out.push({ kind: s.kind, a: shift(s.a, s.kind === "flank" ? p.across : s.walk), b: shift(s.b, s.kind === "flank" ? p.across : s.walk), path: p.id });
    }
  }
  return out;
}
const BUCKET_M = 20;
const bucketOf = (p: Mp): string => `${Math.floor(p.x / BUCKET_M)},${Math.floor(p.z / BUCKET_M)}`;
function indexFaces(faces: readonly KerbFace[]): (near: Mp) => KerbFace[] {
  const by = new Map<string, KerbFace[]>();
  for (const f of faces) {
    const k = bucketOf({ x: (f.a.x + f.b.x) / 2, z: (f.a.z + f.b.z) / 2 });
    const list = by.get(k);
    if (list) list.push(f);
    else by.set(k, [f]);
  }
  return (p) => {
    const bx = Math.floor(p.x / BUCKET_M);
    const bz = Math.floor(p.z / BUCKET_M);
    const out: KerbFace[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) out.push(...(by.get(`${bx + dx},${bz + dz}`) ?? []));
    return out;
  };
}
/** The longest gap along a line the faces on it leave, and how far off the lip of the faces on it is. */
function coverage(line: Line, near: KerbFace[]): { gap: number; heightOff: number } {
  const len = Math.hypot(line.b.x - line.a.x, line.b.z - line.a.z);
  const ux = (line.b.x - line.a.x) / len;
  const uz = (line.b.z - line.a.z) / len;
  const spans: [number, number][] = [];
  let heightOff = 0;
  for (const f of near) {
    const off = (p: Mp): number => Math.abs((p.x - line.a.x) * uz - (p.z - line.a.z) * ux);
    if (off(f.a) > KERB_TOL_M + 1e-9 || off(f.b) > KERB_TOL_M + 1e-9) continue;
    if (distToSeg(f.a, line.a, line.b) > KERB_TOL_M + 1e-9 && distToSeg(f.b, line.a, line.b) > KERB_TOL_M + 1e-9) continue;
    const ta = (f.a.x - line.a.x) * ux + (f.a.z - line.a.z) * uz;
    const tb = (f.b.x - line.a.x) * ux + (f.b.z - line.a.z) * uz;
    spans.push([Math.min(ta, tb), Math.max(ta, tb)]);
    heightOff = Math.max(heightOff, Math.abs(f.top_m - KERB_LIP_TOP_M));
  }
  spans.sort((p, q) => p[0] - q[0]);
  let reach = 0;
  let gap = 0;
  for (const [lo, hi] of spans) {
    if (lo > reach) gap = Math.max(gap, lo - reach);
    reach = Math.max(reach, hi);
  }
  if (reach < len) gap = Math.max(gap, len - reach);
  return { gap, heightOff };
}
/** What is wrong with a plan against the paths' lines: a gap over `KERB_GAP_MAX_M`, a lip off by over `KERB_HEIGHT_TOL_M`, and a face on no line (in plan, within `KERB_TOL_M`). */
function problems(paths: readonly CityKerbPath[], plan: KerbPlan): string[] {
  const lines = expectedLines(paths);
  const nearFace = indexFaces(plan.faces);
  const bad: string[] = [];
  for (const l of lines) {
    const c = coverage(l, nearFace({ x: (l.a.x + l.b.x) / 2, z: (l.a.z + l.b.z) / 2 }));
    if (c.gap > KERB_GAP_MAX_M) bad.push(`${l.path} ${l.kind} ${JSON.stringify(l.a)}: a gap of ${c.gap.toFixed(2)} m`);
    if (c.heightOff > KERB_HEIGHT_TOL_M) bad.push(`${l.path} ${l.kind}: a lip ${c.heightOff.toFixed(3)} m off`);
  }
  const byMid = new Map<string, Line[]>();
  for (const l of lines) {
    const k = bucketOf({ x: (l.a.x + l.b.x) / 2, z: (l.a.z + l.b.z) / 2 });
    const list = byMid.get(k);
    if (list) list.push(l);
    else byMid.set(k, [l]);
  }
  for (const f of plan.faces) {
    const bx = Math.floor(f.a.x / BUCKET_M);
    const bz = Math.floor(f.a.z / BUCKET_M);
    let on = false;
    for (let dx = -1; dx <= 1 && !on; dx++) for (let dz = -1; dz <= 1 && !on; dz++) on = (byMid.get(`${bx + dx},${bz + dz}`) ?? []).some((l) => distToSeg(f.a, l.a, l.b) <= KERB_TOL_M + 1e-9 && distToSeg(f.b, l.a, l.b) <= KERB_TOL_M + 1e-9);
    if (!on) bad.push(`a ${f.part} face at ${JSON.stringify(f.a)}-${JSON.stringify(f.b)} is on no kerb line`);
    if (Math.abs(f.top_m - KERB_LIP_TOP_M) > KERB_HEIGHT_TOL_M) bad.push(`a ${f.part} face's lip is ${f.top_m} m`);
  }
  return bad;
}

describe("the kerb on the line, on the 20 named runs (criterion 3)", { timeout: 120_000 }, () => {
  it("puts every face on its seg within KERB_TOL_M and leaves no chain or dip seg uncovered for over KERB_GAP_MAX_M, drawn in code and from the pack", async () => {
    for (const o of NAMED) {
      const plan = planOf(o);
      const kerb = plan.layers.edge!.kerb!;
      const set = planCells(plan.layers.streets!, plan.layers.edge!.ground!);
      expect(kerb.length, label(o)).toBeGreaterThan(0);
      expect(problems(kerb, planKerbPlan(kerb, set.cells, () => null)), `${label(o)}, in code`).toEqual([]);
      expect(problems(kerb, planKerbPlan(kerb, set.cells, (c) => planKeyOf(c, ACTIVE, set))), `${label(o)}, from the pack`).toEqual([]);
      await yieldToWorker();
    }
  });

  it("draws every pavementDip record from Sidewalk_Dip_01 when it is active, and no one-way lane from a YellowLines piece", () => {
    let dips = 0;
    let oneWay = 0;
    for (const o of NAMED) {
      const plan = planOf(o);
      const set = planCells(plan.layers.streets!, plan.layers.edge!.ground!);
      for (const c of set.cells) {
        const key = planKeyOf(c, ACTIVE, set);
        if (c.role === "pavement" && (c.variant & V.pavementDip) !== 0) {
          dips++;
          expect(key, `${label(o)} ${c.i},${c.j}`).toBe(TILE_SLOTS.kerbCut[0]);
        }
        if (set.oneWay.has(c)) {
          oneWay++;
          expect(TILE_SLOTS.lane, `${label(o)} ${c.i},${c.j}`).not.toContain(key);
          expect([PLAN_ARROW, PLAN_LINES], `${label(o)} ${c.i},${c.j}`).toContain(key);
        }
      }
    }
    expect(dips).toBeGreaterThan(0);
    expect(oneWay).toBeGreaterThan(0);
  });

  it("fails a plan with one return seg removed, and one with a crossingDip seg's face removed", () => {
    const plan = planOf(DEFAULT);
    const kerb = plan.layers.edge!.kerb!;
    const set = planCells(plan.layers.streets!, plan.layers.edge!.ground!);
    const without = (kind: "return" | "crossingDip"): CityKerbPath[] => {
      let done = false;
      return kerb.map((p) => {
        const at = done ? -1 : p.segs.findIndex((s) => s.kind === kind);
        if (at < 0) return p;
        done = true;
        return { ...p, segs: p.segs.filter((_, i) => i !== at) };
      });
    };
    for (const kind of ["return", "crossingDip"] as const) {
      expect(kerb.some((p) => p.segs.some((s) => s.kind === kind)), `the default city has a ${kind} seg`).toBe(true);
      const bad = problems(kerb, planKerbPlan(without(kind), set.cells, () => null));
      expect(bad.length, kind).toBeGreaterThan(0);
      expect(bad.join("\n"), kind).toMatch(kind === "return" ? /return/ : /edge|crossingDip|dip/);
    }
    expect(problems(kerb, planKerbPlan(kerb, set.cells, () => null))).toEqual([]);
  });

  it("brings each seg's faces once: the plan is the sum of the segs', an opening brings none, and a seg whose cell is not flush brings at least one", () => {
    for (const o of [DEFAULT, { seed: 3, way: "on" } as City]) {
      const plan = planOf(o);
      const kerb = plan.layers.edge!.kerb!;
      const set = planCells(plan.layers.streets!, plan.layers.edge!.ground!);
      const keyOf = (c: (typeof set.cells)[number]): CalibrationKey | null => planKeyOf(c, ACTIVE, set);
      const cellOf = (r: { i: number; j: number }): (typeof set.cells)[number] | null => set.cells.find((c) => c.i === r.i && c.j === r.j) ?? null;
      let sum = 0;
      for (const p of kerb) {
        for (const s of p.segs) {
          const n = kerbSegFaces(p, s, cellOf, keyOf).length;
          sum += n;
          if (s.kind === "opening") expect(n).toBe(0);
          else if (s.kind === "flank" || s.kind === "return") expect(n, `${p.id} ${s.kind}`).toBe(1);
        }
      }
      expect(planKerbPlan(kerb, set.cells, keyOf).faces).toHaveLength(sum);
    }
  });
});

// ---- the whole draw, on the named runs ----

describe("plan3dGroups, on the 20 named runs (criteria 2, 4, 5 and 6)", { timeout: 120_000 }, () => {
  it("draws only, and draws every ground record, every mass cell and every kerb seg once: in code, within the draw-call caps", () => {
    for (const o of NAMED) {
      const plan = planOf(o);
      const layers = plan.layers;
      const before = { streets: digestOf(layers.streets), land: digestOf(layers.land), mass: digestOf(layers.mass), edge: digestOf(layers.edge) };
      expect(before, label(o)).toEqual({ streets: plan.digests.streets, land: plan.digests.land, mass: plan.digests.mass, edge: plan.digests.edge });
      const d = plan3dGroups(plan, none.roots, none.entries);
      expect({ streets: digestOf(layers.streets), land: digestOf(layers.land), mass: digestOf(layers.mass), edge: digestOf(layers.edge) }, `${label(o)}: no layer changed`).toEqual(before);
      const edge = layers.edge!;
      const mass = layers.mass!;
      // Every ground record is one cell, drawn once (in code here, so none from the pack).
      expect(d.tiles.fromPack + d.tiles.codeDrawn, label(o)).toBe(edge.ground!.length);
      expect(d.tiles.codeDrawn, label(o)).toBe(edge.ground!.length);
      // Every mass cell that is not built is one interior item (a stalls item is one more, over two of them); every built cell is one box.
      const open = mass.cells.filter((c) => c.use !== "built");
      const flat = d.items.filter((it) => it.kind !== "stalls");
      expect(flat, label(o)).toHaveLength(open.length);
      expect(new Set(flat.map((it) => cellId(it.i, it.j))).size, label(o)).toBe(open.length);
      expect(d.interior.fromPack + d.interior.codeDrawn, label(o)).toBe(d.items.length);
      expect(d.grey.count, label(o)).toBe(mass.built.length);
      expect(d.grey.mesh.count, label(o)).toBe(mass.built.length);
      expect(mass.cells.length, label(o)).toBe(open.length + mass.built.length);
      // Every kerb seg but an opening brings its faces, and the plan holds each once (the per-seg sum is the next block's test).
      expect(edge.kerb!.reduce((n, p) => n + p.segs.filter((s) => s.kind !== "opening").length, 0), label(o)).toBeGreaterThan(0);
      expect(d.kerb.faces.length, label(o)).toBeGreaterThan(0);
      // The caps: the street pieces within 40, the interiors within 24, and the mass one call more.
      expect(d.tiles.calls, label(o)).toBeLessThanOrEqual(TILE_DRAW_CALLS_MAX);
      expect(d.interior.calls, label(o)).toBeLessThanOrEqual(INTERIOR_DRAW_CALLS_MAX);
      expect(d.group.children.filter((c) => (c as InstancedMesh).isInstancedMesh === true)).toHaveLength(1);
      d.dispose();
    }
  });

  it("draws every arrow cell from the arrow and every one-way lane cell from Road_Lines_01, each arrow pointing the way its street flows", () => {
    let arrows = 0;
    for (const o of NAMED) {
      const plan = planOf(o);
      const streets = plan.layers.streets!;
      const set = planCells(streets, plan.layers.edge!.ground!);
      const at = new Map(set.cells.map((c) => [cellId(c.i, c.j), c] as const));
      for (const a of streets.arrows) {
        arrows++;
        const c = at.get(cellId(a.i, a.j))!;
        expect(c.role, `${label(o)} ${a.i},${a.j}`).toBe("lane");
        expect(planKeyOf(c, ACTIVE, set), `${label(o)} ${a.i},${a.j}`).toBe(PLAN_ARROW);
        const v = new Vector3(0, 0, 1).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), ((c.yaw + PLAN_FRONTS[PLAN_ARROW]!) * Math.PI) / 180));
        const dir = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] }[a.toward];
        expect([Math.round(v.x) + 0, Math.round(v.z) + 0], `${label(o)} ${a.i},${a.j}`).toEqual(dir);
        // The arrow's way is its street's flow.
        const s = streets.streets.find((q) => q.id === a.street)!;
        expect(a.toward, `${label(o)} ${a.i},${a.j}`).toBe(`${s.flow}${s.axis}`);
      }
      for (const c of set.oneWay) if (!set.arrows.has(c)) expect(planKeyOf(c, ACTIVE, set), `${label(o)} ${c.i},${c.j}`).toBe(PLAN_LINES);
    }
    expect(arrows).toBeGreaterThan(0);
  });

  it("draws a drive, a walk-through and a lane mouth as the paved inlet: the plain slab when it is active, code pavement when it is not (criterion 4)", () => {
    let n = 0;
    for (const o of NAMED) {
      const mass = planOf(o).layers.mass!;
      const items = massInteriorItems(mass);
      const kind = new Map(items.filter((it) => it.kind !== "stalls").map((it) => [cellId(it.i, it.j), it.kind] as const));
      for (const c of mass.cells) if (c.use === "drive" || c.use === "walk" || c.use === "laneMouth") {
        n++;
        expect(kind.get(cellId(c.i, c.j)), `${label(o)} ${c.i},${c.j}`).toBe("inlet");
      }
    }
    expect(n).toBeGreaterThan(0);
    const plan = planOf(DEFAULT);
    const mass = plan.layers.mass!;
    const paved = mass.cells.filter((c) => c.use === "drive" || c.use === "walk" || c.use === "laneMouth").length;
    const slab = PASSAGE_FLOOR_KEYS[0]!;
    const full = pack(PLAN_PACK_KEYS);
    const withSlab = plan3dGroups(plan, full.roots, full.entries);
    expect(INTERIOR_KEYS.inlet).toEqual([slab]);
    // The slab also lays the aprons, paths and park edges: it holds at least every paved cell.
    expect(withSlab.interior.perKey.get(slab) ?? 0).toBeGreaterThanOrEqual(paved);
    withSlab.dispose();
    const noSlab = pack(PLAN_PACK_KEYS, [slab]);
    const without = plan3dGroups(plan, noSlab.roots, noSlab.entries);
    expect(without.interior.perKey.get(slab) ?? 0).toBe(0);
    const code = without.interior.group.children.find((c) => c.name === "interior:code-pavement") as InstancedMesh;
    expect(code.count).toBeGreaterThanOrEqual(paved);
    without.dispose();
  });

  it("stays within the caps with a full fake pack too, on the default city and on 6 x 6 seed 3", () => {
    const full = pack(PLAN_PACK_KEYS);
    for (const o of [DEFAULT, { seed: 3, way: "on" } as City]) {
      const d = plan3dGroups(planOf(o), full.roots, full.entries);
      expect(d.tiles.calls, label(o)).toBeLessThanOrEqual(TILE_DRAW_CALLS_MAX);
      expect(d.interior.calls, label(o)).toBeLessThanOrEqual(INTERIOR_DRAW_CALLS_MAX);
      expect(d.tiles.perKey.get(PLAN_ARROW) ?? 0, label(o)).toBe(planOf(o).layers.streets!.arrows.length);
      expect(d.tiles.fromPack, label(o)).toBe(planOf(o).layers.edge!.ground!.length);
      d.dispose();
    }
  });

  it("gives the street camera a pose on a one-way street's arrow, looking along its way", () => {
    const streets = planOf(DEFAULT).layers.streets!;
    const a = streets.arrows[0]!;
    const pose = planStreetPose(streets, { at: null, dir: null })!;
    expect(pose.dir).toBe(a.toward);
    expect(pose.look[0]).toBeCloseTo((a.i + 0.5) * TILE_M * 0.18, 9);
    expect(pose.eye[1]).toBeGreaterThan(0);
    const aside = planStreetPose(streets, { at: { i: 10, j: 10 }, dir: "-z" })!;
    expect(aside.dir).toBe("-z");
    expect(aside.eye[2]).toBeGreaterThan(aside.look[2]);
  });
});

// ---- the buildings (ticket 070 G) ----

const STUB_SOURCE = new Texture();
STUB_SOURCE.name = "PolygonCity_Texture";
const STUB_MAT = new MeshBasicMaterial({ map: STUB_SOURCE });
const stubRoot = (key: CalibrationKey): Object3D => {
  const g = new Group();
  g.name = key.slice(key.indexOf(":") + 1);
  g.add(new Mesh(BOX, STUB_MAT));
  return g;
};
/** A small group per key the page loads for buildings (the stack keys and the two corner doors), one mesh each, whose material's map is the base atlas. `lack` leaves keys out. */
const stackRoots = (lack: readonly CalibrationKey[] = []): Map<CalibrationKey, Object3D> => new Map([...allStackKeys(), ...PLAN_DOOR_CORNERS].filter((k) => !lack.includes(k)).map((k) => [k, stubRoot(k)] as const));
const stubColourway = (id: string): Texture => {
  const t = new Texture();
  t.name = `stub-${id}`;
  return t;
};
const LOADED_WAYS = new Map<string, Texture>([["01_C", stubColourway("01_C")], ["02_A", stubColourway("02_A")]]);
const buildingsOf = (plan: CityPlan): CityBuildingsLayer => plan.layers.buildings!;
const PINS: City[] = [1, 2, 3, 8].map((seed) => ({ seed, way: "on" }));
/** Every piece of the layer is in the list exactly once (by the identity of its placement), and nothing else is. */
const listedOnce = (layer: CityBuildingsLayer, draws: readonly PlanPieceDraw[]): boolean => {
  const seen = new Map<CityPlacement, number>();
  for (const d of draws) seen.set(d.placement, (seen.get(d.placement) ?? 0) + 1);
  let n = 0;
  for (const c of layer.columns!) for (const p of c.pieces) {
    n++;
    if (seen.get(p.placement) !== 1) return false;
  }
  return seen.size === n && draws.length === n;
};
const wrappersOf = (group: Object3D): Object3D[] => group.children.filter((c) => c.name.startsWith("piece:"));
const meshesOf = (o: Object3D): Mesh[] => {
  const out: Mesh[] = [];
  o.traverse((m) => {
    if ((m as Mesh).isMesh === true) out.push(m as Mesh);
  });
  return out;
};
/** The wrapper's world matrix is exactly its placement's position, turn about y, and WORLD_PER_METRE scale. */
function expectWrapper(w: Object3D, pl: CityPlacement, what: string): void {
  expect(w.name, what).toBe(`piece:${pl.key}`);
  const want = new Matrix4().compose(new Vector3(pl.x_m * 0.18, pl.y_m * 0.18, pl.z_m * 0.18), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (pl.yaw_deg * Math.PI) / 180), new Vector3(0.18, 0.18, 0.18));
  w.matrixWorld.elements.forEach((e, k) => expect(e, `${what} ${pl.key} [${k}]`).toBeCloseTo(want.elements[k]!, 9));
  expect(w.children, what).toHaveLength(1);
}
/** With every root loaded: each building's floor wrappers (in the list's order) and then its ground wrappers (in the facades' order) are the listed placements, and nothing else is in the group. */
function expectPlaced(d: PlanDraw, label: string): void {
  d.group.updateMatrixWorld(true);
  const byBuilding = new Map<string, PlanPieceDraw[]>();
  for (const p of d.buildings.draws) byBuilding.set(p.building, [...(byBuilding.get(p.building) ?? []), p]);
  const groundBy = new Map<string, PlanGroundDraw[]>();
  for (const p of d.buildings.groundDraws) groundBy.set(p.building, [...(groundBy.get(p.building) ?? []), p]);
  let wrappers = 0;
  for (const g of d.buildings.groups) {
    const id = g.name.slice("building:".length);
    const pieces = byBuilding.get(id) ?? [];
    const ground = groundBy.get(id) ?? [];
    const ws = wrappersOf(g);
    wrappers += ws.length;
    expect(ws, `${label} ${id}`).toHaveLength(pieces.length + ground.length);
    ws.slice(0, pieces.length).forEach((w, n) => expectWrapper(w, pieces[n]!.placement, `${label} ${id}`));
    ws.slice(pieces.length).forEach((w, n) => expectWrapper(w, ground[n]!.placement, `${label} ${id} ground`));
  }
  expect(wrappers, label).toBe(d.buildings.draws.length + d.buildings.groundDraws.length);
}
/** The grey instances as (cell, base, height) in world units, in drawn order. */
function greyOf(d: PlanDraw): { i: number; j: number; y: number; h: number }[] {
  const out: { i: number; j: number; y: number; h: number }[] = [];
  for (let n = 0; n < d.grey.mesh.count; n++) {
    const m = new Matrix4();
    d.grey.mesh.getMatrixAt(n, m);
    const p = new Vector3();
    const s = new Vector3();
    m.decompose(p, new Quaternion(), s);
    out.push({ i: Math.round(p.x / (TILE_M * 0.18) - 0.5), j: Math.round(p.z / (TILE_M * 0.18) - 0.5), y: p.y, h: s.y });
  }
  return out;
}
/** Every ground piece of the facades layer is in the list exactly once (by the identity of its placement), and nothing else is. */
const groundListedOnce = (facades: CityFacadesLayer, draws: readonly PlanGroundDraw[]): boolean => {
  const seen = new Map<CityPlacement, number>();
  for (const d of draws) seen.set(d.placement, (seen.get(d.placement) ?? 0) + 1);
  for (const g of facades.ground) if (seen.get(g.placement) !== 1) return false;
  return seen.size === facades.ground.length && draws.length === facades.ground.length;
};
const facadesOf = (plan: CityPlan): CityFacadesLayer => plan.layers.facades!;

describe("the buildings: pieces from placements only (criteria 2 and 3)", { timeout: 120_000 }, () => {
  it("draws one wrapper per piece at its placement's position, turn and scale, one group per building, and every corner turn", () => {
    const plan = planOf(DEFAULT);
    const d = plan3dGroups(plan, stackRoots(), none.entries, LOADED_WAYS);
    const layer = buildingsOf(plan);
    expect(d.buildings.groups).toHaveLength(layer.buildings.length);
    expect(d.buildings.groups.map((g) => g.name)).toEqual(layer.buildings.map((b) => `building:${b.id}`));
    expect(d.buildings.pieces).toBe(d.buildings.draws.length);
    expectPlaced(d, "default");
    const corner = new Set(layer.columns!.filter((c) => c.kind === "corner").flatMap((c) => c.pieces.map((p) => p.placement.yaw_deg)));
    expect([...corner].sort((a, b) => a - b)).toEqual([0, 90, 180, 270]);
    d.dispose();
  });

  it("paints a building in its loaded colourway, and leaves a base building and one whose id did not load on the source material", () => {
    const plan = planOf(DEFAULT);
    const layer = buildingsOf(plan);
    const d = plan3dGroups(plan, stackRoots(), none.entries, LOADED_WAYS);
    const seen = { painted: 0, base: 0, missing: 0 };
    for (const b of layer.buildings) {
      const g = d.buildings.groups.find((x) => x.name === `building:${b.id}`)!;
      for (const m of meshesOf(g)) {
        const map = (m.material as MeshBasicMaterial).map!;
        if (LOADED_WAYS.has(b.colourway)) {
          expect(map.name, b.id).toBe(`stub-${b.colourway}`);
          seen.painted++;
        } else {
          expect(m.material, b.id).toBe(STUB_MAT);
          if (b.colourway === "base") seen.base++;
          else seen.missing++;
        }
      }
    }
    expect(seen.painted).toBeGreaterThan(0);
    expect(seen.base).toBeGreaterThan(0);
    expect(seen.missing).toBeGreaterThan(0);
    // The cached roots' own material is never written, and nothing is emissive.
    expect(STUB_MAT.map).toBe(STUB_SOURCE);
    for (const g of d.buildings.groups) for (const m of meshesOf(g)) expect((m.material as MeshBasicMaterial).color.getHex()).toBe(STUB_MAT.color.getHex());
    // With no colourways at all, every building keeps the source material.
    const plain = plan3dGroups(plan, stackRoots(), none.entries);
    for (const g of plain.buildings.groups) for (const m of meshesOf(g)) expect(m.material).toBe(STUB_MAT);
    plain.dispose();
    d.dispose();
  });

  it("with empty roots clones no piece and draws one grey box per column at its full height; with every root loaded no column is grey; with one above-ground key missing only the columns that use it fall back (their ground piece is not cloned)", () => {
    const plan = planOf(DEFAULT);
    const layer = buildingsOf(plan);
    const columns = layer.columns!;
    const roofY = (c: (typeof columns)[number]): number => c.pieces.find((p) => p.role === "roof")!.placement.y_m * 0.18;
    const e = plan3dGroups(plan, none.roots, none.entries);
    expect(e.buildings.pieces).toBe(0);
    expect(e.buildings.groundPieces).toBe(0);
    expect(e.buildings.groups.every((g) => g.children.length === 0)).toBe(true);
    expect(e.grey.count).toBe(columns.length);
    expect(e.grey.mesh.count).toBe(columns.length);
    expect(e.grey.fallback).toBe(columns.length);
    expect(e.grey.slots).toBe(0);
    const eg = greyOf(e);
    columns.forEach((c, n) => {
      expect({ i: eg[n]!.i, j: eg[n]!.j }, `${c.i},${c.j}`).toEqual({ i: c.i, j: c.j });
      expect(eg[n]!.y).toBeCloseTo(0, 5);
      expect(eg[n]!.h, `${c.i},${c.j}`).toBeCloseTo(roofY(c), 5);
    });
    e.dispose();

    // Every root loaded: every ground slot is filled by its piece, so no column is grey.
    const full = plan3dGroups(plan, stackRoots(), none.entries);
    expect(full.grey.fallback).toBe(0);
    expect(full.grey.slots).toBe(0);
    expect(full.grey.mesh.count).toBe(0);
    expect(full.buildings.groundPieces).toBe(full.buildings.groundDraws.length);
    full.dispose();

    const count = new Map<CalibrationKey, number>();
    for (const c of columns) for (const k of new Set(c.pieces.map((p) => p.placement.key))) count.set(k, (count.get(k) ?? 0) + 1);
    const [lack] = [...count.entries()].sort((a, b) => b[1] - a[1])[0]!;
    const part = plan3dGroups(plan, stackRoots([lack]), none.entries);
    const uses = columns.filter((c) => c.pieces.some((p) => p.placement.key === lack));
    expect(uses.length).toBeGreaterThan(0);
    expect(uses.length).toBeLessThan(columns.length);
    expect(part.grey.fallback).toBe(uses.length);
    expect(part.grey.slots).toBe(0);
    expect(part.buildings.pieces).toBe(columns.filter((c) => !uses.includes(c)).reduce((n, c) => n + c.pieces.length, 0));
    const pg = greyOf(part);
    expect(pg).toHaveLength(uses.length);
    uses.forEach((c, n) => {
      expect({ i: pg[n]!.i, j: pg[n]!.j }).toEqual({ i: c.i, j: c.j });
      expect(pg[n]!.h, `${c.i},${c.j}`).toBeCloseTo(roofY(c), 5);
    });
    // A fallback column's ground piece is not cloned.
    const fell = new Set(uses.map((c) => `${c.i},${c.j}`));
    const want = part.buildings.groundDraws.filter((g) => g.cells.every((c) => !fell.has(`${c.i},${c.j}`))).length;
    expect(part.buildings.groundPieces).toBe(want);
    expect(part.buildings.groundPieces).toBeLessThan(part.buildings.groundDraws.length);
    part.dispose();
  });

  it("draws every ground wrapper at its placement's position, turn and scale (all four turns), a shopDouble as one wrapper over two cells, in its own building's colourway", async () => {
    const turns = new Set<number>();
    let doubles = 0;
    let corners = 0;
    for (const o of [DEFAULT, ...PINS]) {
      const plan = planOf(o);
      const d = plan3dGroups(plan, stackRoots(), none.entries, LOADED_WAYS);
      expectPlaced(d, label(o));
      const facades = facadesOf(plan);
      expect(d.buildings.groundDraws, label(o)).toHaveLength(facades.ground.length);
      expect(d.buildings.groundPieces, label(o)).toBe(facades.ground.length);
      for (const g of facades.ground) turns.add(g.placement.yaw_deg);
      for (const g of facades.ground.filter((x) => x.kind === "shopDouble")) {
        doubles++;
        expect(g.cells, label(o)).toHaveLength(2);
        expect(d.buildings.groundDraws.filter((x) => x.placement === g.placement), label(o)).toHaveLength(1);
      }
      corners += facades.ground.filter((g) => PLAN_DOOR_CORNERS.includes(g.placement.key)).length;
      // The colourway reaches the ground wrappers: a loaded one swaps the map, a base one keeps the source.
      for (const b of buildingsOf(plan).buildings) {
        const grp = d.buildings.groups.find((x) => x.name === `building:${b.id}`)!;
        const nFloor = d.buildings.draws.filter((p) => p.building === b.id).length;
        for (const w of wrappersOf(grp).slice(nFloor)) {
          for (const m of meshesOf(w)) {
            if (LOADED_WAYS.has(b.colourway)) expect((m.material as MeshBasicMaterial).map!.name, b.id).toBe(`stub-${b.colourway}`);
            else expect(m.material, b.id).toBe(STUB_MAT);
          }
        }
      }
      d.dispose();
      await yieldToWorker();
    }
    expect([...turns].sort((a, b) => a - b)).toEqual([0, 90, 180, 270]);
    expect(doubles).toBeGreaterThan(0);
    expect(corners).toBeGreaterThan(0);
  });

  it("with one ground key's root missing only the slots that use it are grey (both columns of a shopDouble)", () => {
    const plan = planOf(DEFAULT);
    const layer = buildingsOf(plan);
    const ground = facadesOf(plan).ground;
    const cols = new Map(layer.columns!.map((c) => [`${c.i},${c.j}`, c] as const));
    const above = new Set(layer.columns!.flatMap((c) => c.pieces.map((p) => p.placement.key)));
    // A ground key that no column above the ground uses, so only the ground slots are affected.
    const only = [...new Set(ground.map((g) => g.placement.key))].filter((key) => !above.has(key));
    expect(only.length).toBeGreaterThan(0);
    for (const lack of only) {
      const part = plan3dGroups(plan, stackRoots([lack]), none.entries);
      const uses = ground.filter((g) => g.placement.key === lack);
      const slots = uses.flatMap((g) => g.cells.map((c) => `${c.i},${c.j}`));
      expect(part.grey.fallback, lack).toBe(0);
      expect(part.grey.slots, lack).toBe(slots.length);
      expect(part.grey.mesh.count, lack).toBe(slots.length);
      expect(part.buildings.groundPieces, lack).toBe(ground.length - uses.length);
      const g = greyOf(part);
      expect(g.map((x) => `${x.i},${x.j}`).sort(), lack).toEqual([...slots].sort());
      for (const x of g) {
        const c = cols.get(`${x.i},${x.j}`)!;
        expect(x.y).toBeCloseTo(c.ground.y_m * 0.18, 5);
        expect(x.h).toBeCloseTo((c.ground.top_m - c.ground.y_m) * 0.18, 5);
      }
      part.dispose();
    }
    // A shopDouble's key missing: both of its columns are grey.
    const double = ground.find((g) => g.kind === "shopDouble")!;
    const lackDouble = plan3dGroups(plan, stackRoots([double.placement.key]), none.entries);
    const greyCells = new Set(greyOf(lackDouble).map((x) => `${x.i},${x.j}`));
    for (const c of double.cells) expect(greyCells.has(`${c.i},${c.j}`), `shopDouble ${c.i},${c.j}`).toBe(true);
    lackDouble.dispose();
  });

  it("brings the stack pieces and the colourways of a loaded set into the plan's input", () => {
    const key = allStackKeys()[0]!;
    const name = key.slice(key.indexOf(":") + 1);
    const root = stubRoot(key);
    const set: ModelSet = { ...NO_MODELS, stack: [{ pack: "city-pack", entry: { ...entryOf(key, 0), name }, root } as unknown as LoadedModel], colourways: LOADED_WAYS };
    const input = planInput(set);
    expect(input.roots.get(key)).toBe(root);
    expect(input.colourways).toBe(LOADED_WAYS);
    expect(planInput({ ...NO_MODELS }).colourways).toBeUndefined();
  });
});

describe("the buildings, on the 20 named runs (criterion 3)", { timeout: 120_000 }, () => {
  it("draws only, lists every piece exactly once with its building's colourway, and gives every column one grey instance and every Ls' column its own pieces", async () => {
    let ls = 0;
    for (const o of VARIED) {
      const plan = planOf(o);
      const layers = plan.layers;
      const digests = (): Record<string, string> => ({ streets: digestOf(layers.streets), land: digestOf(layers.land), mass: digestOf(layers.mass), edge: digestOf(layers.edge), buildings: digestOf(layers.buildings), facades: digestOf(layers.facades) });
      const before = digests();
      expect(before, label(o)).toEqual({ streets: plan.digests.streets, land: plan.digests.land, mass: plan.digests.mass, edge: plan.digests.edge, buildings: plan.digests.buildings, facades: plan.digests.facades });
      const d = plan3dGroups(plan, none.roots, none.entries);
      expect(digests(), `${label(o)}: no layer changed`).toEqual(before);
      const layer = buildingsOf(plan);
      expect(listedOnce(layer, d.buildings.draws), label(o)).toBe(true);
      const way = new Map(layer.buildings.map((b) => [b.id, b.colourway] as const));
      for (const p of d.buildings.draws) expect(p.colourway, `${label(o)} ${p.building}`).toBe(way.get(p.building));
      // G2: every ground piece once, in its own building's colourway, and every column filled by exactly one.
      expect(groundListedOnce(facadesOf(plan), d.buildings.groundDraws), label(o)).toBe(true);
      for (const p of d.buildings.groundDraws) expect(p.colourway, `${label(o)} ground ${p.building}`).toBe(way.get(p.building));
      expect(d.buildings.groundDraws.reduce((n, g) => n + g.cells.length, 0), label(o)).toBe(layer.columns!.length);
      expect(d.grey.count, label(o)).toBe(layer.columns!.length);
      expect(d.grey.mesh.count, label(o)).toBe(layers.mass!.built.length);
      expect(layer.columns!.length, label(o)).toBe(layers.mass!.built.length);
      // E's counts hold: every ground record, every non-built mass cell, every kerb seg but an opening.
      const edge = layers.edge!;
      const mass = layers.mass!;
      expect(d.tiles.fromPack + d.tiles.codeDrawn, label(o)).toBe(edge.ground!.length);
      expect(d.items.filter((it) => it.kind !== "stalls"), label(o)).toHaveLength(mass.cells.filter((c) => c.use !== "built").length);
      expect(d.interior.fromPack + d.interior.codeDrawn, label(o)).toBe(d.items.length);
      expect(d.kerb.faces.length, label(o)).toBeGreaterThan(0);
      expect(d.tiles.calls, label(o)).toBeLessThanOrEqual(TILE_DRAW_CALLS_MAX);
      expect(d.interior.calls, label(o)).toBeLessThanOrEqual(INTERIOR_DRAW_CALLS_MAX);
      expect(d.group.children.filter((c) => (c as InstancedMesh).isInstancedMesh === true), `${label(o)}: the grey boxes are one call`).toHaveLength(1);
      // An L's three columns are drawn from their own pieces, like any other column.
      for (const b of layer.buildings.filter((x) => x.bend !== null)) {
        ls++;
        for (const cell of b.cells) {
          const col = layer.columns!.find((c) => c.i === cell.i && c.j === cell.j)!;
          expect(col.building, `${label(o)} L ${b.id}`).toBe(b.id);
          const listed = d.buildings.draws.filter((p) => p.column.i === cell.i && p.column.j === cell.j);
          expect(listed.map((p) => p.placement), `${label(o)} L ${b.id}`).toEqual(col.pieces.map((p) => p.placement));
        }
      }
      d.dispose();
      await yieldToWorker();
    }
    expect(ls).toBeGreaterThan(0);
  });

  it("builds the full group with stub roots on the default city and the four pin cities: one wrapper per listed piece, each at its placement", async () => {
    const roots = stackRoots();
    for (const o of [DEFAULT, ...PINS]) {
      const d = plan3dGroups(planOf(o), roots, none.entries, LOADED_WAYS);
      expect(d.buildings.pieces, label(o)).toBe(d.buildings.draws.length);
      expectPlaced(d, label(o));
      d.dispose();
      await yieldToWorker();
    }
  });

  it("fails the exactly-once check for a draw list with one piece dropped, and with one piece listed twice", () => {
    const layer = buildingsOf(planOf(DEFAULT));
    const draws = planPieceDraws(layer);
    expect(listedOnce(layer, draws)).toBe(true);
    expect(listedOnce(layer, draws.slice(1))).toBe(false);
    expect(listedOnce(layer, [...draws, draws[5]!])).toBe(false);
  });

  it("fails the ground exactly-once check for a draw list with one ground piece dropped, and with one listed twice", () => {
    const plan = planOf(DEFAULT);
    const draws = planGroundDraws(facadesOf(plan), buildingsOf(plan));
    expect(groundListedOnce(facadesOf(plan), draws)).toBe(true);
    expect(groundListedOnce(facadesOf(plan), draws.slice(1))).toBe(false);
    expect(groundListedOnce(facadesOf(plan), [...draws, draws[5]!])).toBe(false);
  });

  it("stops (PlanStopError, the cell named) on a facades layer missing one column's ground piece, one that fills a column twice, one with no ground, and a ground key the page does not load", () => {
    const plan = planOf(DEFAULT);
    const facades = facadesOf(plan);
    const withFacades = (f: CityFacadesLayer): CityPlan => ({ ...plan, layers: { ...plan.layers, facades: f } });
    const single = facades.ground.findIndex((g) => g.cells.length === 1);
    const gone = facades.ground[single]!;
    let stop: unknown = null;
    try {
      plan3dGroups(withFacades({ ...facades, ground: facades.ground.filter((_, n) => n !== single) }), stackRoots(), none.entries);
    } catch (e) {
      stop = e;
    }
    expect(stop).toBeInstanceOf(PlanStopError);
    expect((stop as PlanStopError).cells).toEqual([gone.cells[0]]);
    const dup = [...facades.ground, facades.ground[single]!];
    expect(() => plan3dGroups(withFacades({ ...facades, ground: dup }), stackRoots(), none.entries)).toThrow(PlanStopError);
    const bare = { ...facades } as { -readonly [K in keyof CityFacadesLayer]?: CityFacadesLayer[K] };
    delete bare.ground;
    expect(() => planGroundDraws(bare as CityFacadesLayer, buildingsOf(plan))).toThrow(PlanStopError);
    const alien: CityGroundPiece = { ...gone, placement: { ...gone.placement, key: "city-pack:Nothing_01" as CalibrationKey } };
    expect(() => planGroundDraws({ ...facades, ground: facades.ground.map((g, n) => (n === single ? alien : g)) }, buildingsOf(plan))).toThrow(/not one the page loads/);
    const noFacades = { ...plan, layers: { ...plan.layers } } as { -readonly [K in keyof CityPlan]: CityPlan[K] };
    const noLayers = { ...plan.layers } as { -readonly [K in keyof typeof plan.layers]?: (typeof plan.layers)[K] };
    delete noLayers.facades;
    noFacades.layers = noLayers;
    expect(() => plan3dGroups(noFacades, stackRoots(), none.entries)).toThrow(PlanStopError);
  });

  it("loads the two corner doors by name: planKeys() names them and allStackKeys() does not", () => {
    expect(PLAN_DOOR_CORNERS).toHaveLength(2);
    for (const k of PLAN_DOOR_CORNERS) {
      expect(planKeys()).toContain(k);
      expect(allStackKeys()).not.toContain(k);
    }
  });

  it("stops (PlanStopError, the cell named) on a buildings layer with a built cell's column removed, with no columns, with a column that has no roof, and with a piece that is not a stack key", () => {
    const plan = planOf(DEFAULT);
    const layer = buildingsOf(plan);
    const withLayer = (b: CityBuildingsLayer): CityPlan => ({ ...plan, layers: { ...plan.layers, buildings: b } });
    const first = layer.columns![0]!;
    const cut = { ...layer, columns: layer.columns!.slice(1) };
    let stop: unknown = null;
    try {
      plan3dGroups(withLayer(cut), none.roots, none.entries);
    } catch (e) {
      stop = e;
    }
    expect(stop).toBeInstanceOf(PlanStopError);
    expect((stop as PlanStopError).cells).toEqual([{ i: first.i, j: first.j }]);

    const bare = { ...layer } as { -readonly [K in keyof CityBuildingsLayer]: CityBuildingsLayer[K] };
    delete bare.columns;
    expect(() => plan3dGroups(withLayer(bare), none.roots, none.entries)).toThrow(PlanStopError);

    const noRoof = { ...layer, columns: [{ ...first, pieces: first.pieces.filter((p) => p.role !== "roof") }, ...layer.columns!.slice(1)] };
    expect(() => planPieceDraws(noRoof)).toThrow(/no single roof/);
    const alien = { ...layer, columns: [{ ...first, pieces: first.pieces.map((p) => ({ ...p, placement: { ...p.placement, key: "city-pack:Nothing_01" as CalibrationKey } })) }, ...layer.columns!.slice(1)] };
    expect(() => planPieceDraws(alien)).toThrow(/not a stack key/);
  });

  const HAVE_GLB = existsSync(join("assets", "private", "out", "city-pack.glb"));
  it.skipIf(!HAVE_GLB)("reports the building draw calls from the converted City Pack on 6 x 6 seeds 1 and 3: the meshes each key's clones bring, times its pieces (skipped when the GLB is absent)", () => {
    const glb = readFileSync(join("assets", "private", "out", "city-pack.glb"));
    const jsonLen = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as { nodes: { name?: string; mesh?: number; children?: number[] }[]; meshes: { primitives: unknown[] }[] };
    // One three.js mesh (one draw call) per glTF primitive under the key's node.
    const prims = (name: string): number => {
      const root = gltf.nodes.find((n) => n.name === name);
      expect(root, name).toBeDefined();
      const walk = (n: { mesh?: number; children?: number[] }): number => (n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives.length : 0) + (n.children ?? []).reduce((s, c) => s + walk(gltf.nodes[c]!), 0);
      return walk(root!);
    };
    for (const o of [DEFAULT, { seed: 3, way: "on" } as City]) {
      const draws = planPieceDraws(buildingsOf(planOf(o)));
      const byRole = { floor: 0, floor3: 0, roof: 0 };
      const byKey = new Map<CalibrationKey, number>();
      let calls = 0;
      for (const d of draws) {
        const key = d.placement.key;
        const n = prims(key.slice(key.indexOf(":") + 1));
        expect(n, key).toBeGreaterThan(0);
        calls += n;
        byRole[d.role]++;
        byKey.set(key, (byKey.get(key) ?? 0) + 1);
      }
      expect(calls).toBeGreaterThan(1);
      console.info(`G draw calls, ${label(o)}: building calls before (E) 1, after ${calls + 1} (${calls} from ${draws.length} cloned pieces + 1 grey box call); pieces by role ${JSON.stringify(byRole)}; distinct keys ${byKey.size}`);
      const gdraws = planGroundDraws(facadesOf(planOf(o)), buildingsOf(planOf(o)));
      const byKind: Record<string, number> = {};
      let groundCalls = 0;
      for (const g of gdraws) {
        const key = g.placement.key;
        const n = prims(key.slice(key.indexOf(":") + 1));
        expect(n, key).toBeGreaterThan(0);
        groundCalls += n;
        byKind[g.kind] = (byKind[g.kind] ?? 0) + 1;
      }
      expect(groundCalls).toBeGreaterThan(0);
      console.info(`G2 draw calls, ${label(o)}: building calls after G ${calls + 1}, after G2 ${calls + groundCalls + 1} (${calls} floors and roofs from ${draws.length} pieces + ${groundCalls} from ${gdraws.length} ground pieces + 1 grey box call, empty when every model loads); ground pieces by kind ${JSON.stringify(byKind)}`);
    }
  });
});

// ---- the facades and the ground (ticket 070 J) ----

const IDENT = { x: 0, z: 0, yaw: 0 };
const RAD = Math.PI / 180;
const shortOf = (key: CalibrationKey): string => key.slice(key.indexOf(":") + 1);
const PIPE_01: CalibrationKey = "city-pack:SM_Prop_Pipe_Present_01";
/** One stub root (one mesh, the base atlas) per key the page loads for buildings, dressing, furniture and the plan's named keys. `lack` leaves keys out; `meshes` gives a key more than one mesh. */
const jRoots = (lack: readonly CalibrationKey[] = [], meshes: ReadonlyMap<CalibrationKey, number> = new Map()): Map<CalibrationKey, Object3D> => {
  const keys = new Set<CalibrationKey>([...allStackKeys(), ...PLAN_DOOR_CORNERS, ...dressKeys(), ...furnitureKeys(), ...planKeys(), ...TILE_PROPS]);
  const out = new Map<CalibrationKey, Object3D>();
  for (const key of keys) {
    if (lack.includes(key)) continue;
    const n = meshes.get(key);
    if (n === undefined) out.set(key, stubRoot(key));
    else {
      const g = new Group();
      g.name = shortOf(key);
      for (let i = 0; i < n; i++) g.add(new Mesh(BOX, STUB_MAT));
      out.set(key, g);
    }
  }
  return out;
};
const maxDiff = (a: Matrix4, b: Matrix4): number => a.elements.reduce((m, e, n) => Math.max(m, Math.abs(e - b.elements[n]!)), 0);
const instancedBy = (group: Object3D): Map<string, InstancedMesh> => new Map(group.children.filter((c) => (c as InstancedMesh).isInstancedMesh === true).map((c) => [c.name, c as InstancedMesh] as const));
const facadesWith = (plan: CityPlan, patch: Partial<{ -readonly [K in keyof CityFacadesLayer]: CityFacadesLayer[K] }>): CityPlan => ({ ...plan, layers: { ...plan.layers, facades: { ...facadesOf(plan), ...patch } } });
const groundWith = (plan: CityPlan, props: CityGroundLayer["props"]): CityPlan => ({ ...plan, layers: { ...plan.layers, ground: { ...plan.layers.ground!, props } } });
const reKey = (pl: CityPlacement, key: string): CityPlacement => ({ ...pl, key: key as CalibrationKey });
const groundOf = (plan: CityPlan): CityGroundLayer => plan.layers.ground!;

/** Every piece of the four stage 7 lists is in the draw list exactly once (by the identity of its placement), and nothing else is. */
const dressListedOnce = (f: CityFacadesLayer, draws: readonly PlanDressDraw[]): boolean => {
  const seen = new Map<CityPlacement, number>();
  for (const d of draws) seen.set(d.placement, (seen.get(d.placement) ?? 0) + 1);
  const all = [...(f.dressing ?? []), ...(f.walls ?? []), ...(f.roofs ?? []), ...(f.novelty ?? [])];
  return all.every((p) => seen.get(p.placement) === 1) && seen.size === all.length && draws.length === all.length;
};
const propsListedOnce = (g: CityGroundLayer, draws: readonly PlanPropDraw[]): boolean => {
  const seen = new Map<CityPlacement, number>();
  for (const d of draws) seen.set(d.placement, (seen.get(d.placement) ?? 0) + 1);
  return g.props.every((p) => seen.get(p.placement) === 1) && seen.size === g.props.length && draws.length === g.props.length;
};
/** The keys whose listed pieces (those with a root) do not all have an instance: the keys the cap left out. */
const notDrawn = (listed: readonly { placement: CityPlacement }[], stage: PlanInstanced, roots: ReadonlyMap<CalibrationKey, Object3D>): CalibrationKey[] => {
  const want = new Map<CalibrationKey, number>();
  for (const d of listed) if (d.placement.key !== CODE_ESCAPE_KEY && roots.has(d.placement.key)) want.set(d.placement.key, (want.get(d.placement.key) ?? 0) + 1);
  return [...want].filter(([key, n]) => stage.perKey.get(key) !== n).map(([key]) => key);
};
const allColumns = (plan: CityPlan): Map<string, boolean> => new Map(buildingsOf(plan).columns!.map((c) => [`${c.i},${c.j}`, true] as const));

/** With every root loaded, every stage 7 piece's instance matrix is `dressMatrix` of its placement (a wall piece's y-scale too), at its own position in its key's mesh. Returns the kinds and the turns seen. */
function expectDressPlaced(d: PlanDraw, what: string): { kinds: Set<string>; yaws: Set<number> } {
  const by = instancedBy(d.dress.group);
  const next = new Map<CalibrationKey, number>();
  const kinds = new Set<string>();
  const yaws = new Set<number>();
  const m = new Matrix4();
  let worst = 0;
  for (const p of d.dressDraws) {
    const key = p.placement.key;
    kinds.add(`${p.list}:${p.kind}`);
    yaws.add(p.placement.yaw_deg);
    if (key === CODE_ESCAPE_KEY) continue;
    const im = by.get(`dress:${shortOf(key)}`);
    expect(im, `${what} ${key}`).toBeDefined();
    const n = next.get(key) ?? 0;
    next.set(key, n + 1);
    im!.getMatrixAt(n, m);
    const want = dressMatrix(IDENT, { x: p.placement.x_m, y: p.placement.y_m, z: p.placement.z_m, yaw: p.placement.yaw_deg * RAD, scaleY: p.scaleY ?? 1 });
    worst = Math.max(worst, maxDiff(m, want));
  }
  expect(worst, `${what}: every stage 7 instance is dressMatrix of its placement`).toBeLessThan(1e-4);
  for (const [key, n] of next) expect(d.dress.perKey.get(key), `${what} ${key}`).toBe(n);
  return { kinds, yaws };
}

/** Every escape box (a pack escape's drop ladder, a code escape's every part) is `dressMatrix` of its piece (no y-scale) times `partMatrix`, in the one box mesh, in the pieces' order. Returns the number of boxes. */
function expectBoxes(d: PlanDraw, what: string): number {
  let box: InstancedMesh | null = null;
  d.dress.group.traverse((o) => {
    if (o.name === "dress:escape-code") box = o as InstancedMesh;
  });
  const boxed = d.dressDraws.filter((p) => (p.boxes?.length ?? 0) > 0);
  const total = boxed.reduce((n, p) => n + p.boxes!.length, 0);
  if (total === 0) {
    expect(box, what).toBeNull();
    return 0;
  }
  expect(box, what).not.toBeNull();
  const mesh = box as unknown as InstancedMesh;
  expect(mesh.count, what).toBe(total);
  const m = new Matrix4();
  let n = 0;
  let worst = 0;
  for (const p of boxed) {
    const base = dressMatrix(IDENT, { x: p.placement.x_m, y: p.placement.y_m, z: p.placement.z_m, yaw: p.placement.yaw_deg * RAD });
    for (const b of p.boxes!) {
      mesh.getMatrixAt(n++, m);
      worst = Math.max(worst, maxDiff(m, new Matrix4().multiplyMatrices(base, partMatrix({ x: b.x_m, y: b.y_m, z: b.z_m, w: b.w_m, h: b.h_m, d: b.d_m, rz: b.rz_rad }))));
    }
  }
  expect(worst, `${what}: every box`).toBeLessThan(1e-4);
  return total;
}

/** Every prop's instance matrix is its placement with the surface at 0: x, z and turn as placed, its base at `y_m` (a flat piece 0.01 m over it). Returns the kinds seen. */
function expectPropsPlaced(d: PlanDraw, what: string): Set<string> {
  const by = instancedBy(d.furniture.group);
  const next = new Map<CalibrationKey, number>();
  const kinds = new Set<string>();
  const m = new Matrix4();
  let worst = 0;
  for (const p of d.propDraws) {
    const key = p.placement.key;
    kinds.add(p.kind);
    const im = by.get(`dress:${shortOf(key)}`);
    expect(im, `${what} ${key}`).toBeDefined();
    const n = next.get(key) ?? 0;
    next.set(key, n + 1);
    im!.getMatrixAt(n, m);
    const want = dressMatrix(IDENT, { x: p.placement.x_m, y: p.placement.y_m + (p.flat ? 0.01 : 0), z: p.placement.z_m, yaw: p.placement.yaw_deg * RAD });
    worst = Math.max(worst, maxDiff(m, want));
  }
  expect(worst, `${what}: every stage 8 instance`).toBeLessThan(1e-4);
  for (const [key, n] of next) expect(d.furniture.perKey.get(key), `${what} ${key}`).toBe(n);
  return kinds;
}
const firstWith = (pred: (plan: CityPlan) => boolean): CityPlan => {
  for (const o of [DEFAULT, ...PINS]) if (pred(planOf(o))) return planOf(o);
  throw new Error("no named city has it");
};

describe("the facades and the ground: pieces from placements only (J criteria 2 and 3)", { timeout: 120_000 }, () => {
  it("draws every stage 7 piece at its placement through one dressGroup call, at the four turns, with a wall piece's y-scale and every box; and every stage 8 prop on the surfaces at 0", () => {
    const kinds = new Set<string>();
    const propKinds = new Set<string>();
    const turns = new Set<number>();
    let boxes = 0;
    let scaled = 0;
    for (const o of [DEFAULT, ...PINS]) {
      const plan = planOf(o);
      const d = plan3dGroups(plan, jRoots(), none.entries, LOADED_WAYS);
      const seen = expectDressPlaced(d, label(o));
      for (const kd of seen.kinds) kinds.add(kd);
      for (const y of seen.yaws) turns.add(y);
      boxes += expectBoxes(d, label(o));
      for (const kd of expectPropsPlaced(d, label(o))) propKinds.add(kd);
      scaled += d.dressDraws.filter((p) => p.scaleY !== undefined && p.scaleY !== 1).length;
      expect(d.dress.listed, label(o)).toBe(d.dress.placed);
      expect(d.dress.drawn, label(o)).toBe(d.dress.listed);
      expect(d.furniture.drawn, label(o)).toBe(d.furniture.listed);
      expect(d.dress.leftOut, label(o)).toEqual([]);
      expect(d.furniture.leftOut, label(o)).toEqual([]);
      d.dispose();
    }
    console.info(`J kinds checked: ${[...kinds].sort().join(" ")}; props: ${[...propKinds].sort().join(" ")}`);
    expect(kinds.size).toBeGreaterThan(15);
    expect(propKinds.size).toBeGreaterThan(8);
    expect([...turns].sort((a, b) => a - b)).toEqual([0, 90, 180, 270]);
    expect(boxes).toBeGreaterThan(0);
    expect(scaled).toBeGreaterThan(0);
  });

  it("stands a flat lotLines 0.01 m over the surface, and a billboardBoard at its own y_m; a tree and a bench stand on it", () => {
    const plan = firstWith((p) => groundOf(p).props.some((q) => q.kind === "lotLines") && groundOf(p).props.some((q) => q.kind === "billboardBoard"));
    const d = plan3dGroups(plan, jRoots(), none.entries);
    const by = instancedBy(d.furniture.group);
    const m = new Matrix4();
    const pos = new Vector3();
    // The height of each instance of a kind over its own placement's y_m, metres.
    const over = (kind: string): number[] => {
      const heights: number[] = [];
      const next = new Map<CalibrationKey, number>();
      for (const p of d.propDraws) {
        const n = next.get(p.placement.key) ?? 0;
        next.set(p.placement.key, n + 1);
        if (p.kind !== kind) continue;
        by.get(`dress:${shortOf(p.placement.key)}`)!.getMatrixAt(n, m);
        heights.push(pos.setFromMatrixPosition(m).y / 0.18 - p.placement.y_m);
      }
      return heights;
    };
    const lot = over("lotLines");
    expect(lot.length).toBeGreaterThan(0);
    for (const h of lot) expect(h).toBeCloseTo(0.01, 6);
    const board = over("billboardBoard");
    expect(board.length).toBeGreaterThan(0);
    for (const h of board) expect(h).toBeCloseTo(0, 6);
    expect(d.propDraws.find((p) => p.kind === "billboardBoard")!.placement.y_m).toBeGreaterThan(0);
    for (const kind of ["tree", "bench", "bin"]) for (const h of over(kind)) expect(h, kind).toBeCloseTo(0, 6);
    d.dispose();
  });

  it("draws a piece only when its key's root loaded: with one stage 7 key's root missing only that key's pieces are not drawn, and the same for stage 8; with empty roots none is", () => {
    const plan = planOf(DEFAULT);
    const e = plan3dGroups(plan, none.roots, none.entries);
    expect(e.dress.placed).toBe(0);
    expect(e.dress.drawn).toBe(0);
    expect(e.furniture.drawn).toBe(0);
    expect(e.dress.group.children).toHaveLength(0);
    expect(e.furniture.group.children).toHaveLength(0);
    e.dispose();
    const count = (draws: readonly { placement: CityPlacement }[]): Map<CalibrationKey, number> => {
      const c = new Map<CalibrationKey, number>();
      for (const d of draws) c.set(d.placement.key, (c.get(d.placement.key) ?? 0) + 1);
      return c;
    };
    const dd = planDressDraws(plan);
    const [lack7] = [...count(dd)].filter(([kd]) => kd !== CODE_ESCAPE_KEY).sort((a, b) => b[1] - a[1])[0]!;
    const part7 = plan3dGroups(plan, jRoots([lack7]), none.entries);
    expect(part7.dress.placed).toBe(dd.length - count(dd).get(lack7)!);
    expect(part7.dress.perKey.has(lack7)).toBe(false);
    expect(part7.dress.perKey.size).toBe(count(dd).size - 1 - (count(dd).has(CODE_ESCAPE_KEY) ? 1 : 0));
    part7.dispose();
    const pd = planPropDraws(plan);
    const [lack8] = [...count(pd)].sort((a, b) => b[1] - a[1])[0]!;
    const part8 = plan3dGroups(plan, jRoots([lack8]), none.entries);
    expect(part8.furniture.placed).toBe(pd.length - count(pd).get(lack8)!);
    expect(part8.furniture.perKey.has(lack8)).toBe(false);
    part8.dispose();
  });

  it("draws no stage 7 piece on a column that fell back to grey (it would float), and every piece on the other columns; a column whose ground slot alone is grey keeps its pieces", () => {
    const plan = planOf(DEFAULT);
    const columns = buildingsOf(plan).columns!;
    const count = new Map<CalibrationKey, number>();
    for (const c of columns) for (const kd of new Set(c.pieces.map((p) => p.placement.key))) count.set(kd, (count.get(kd) ?? 0) + 1);
    const [lack] = [...count.entries()].sort((a, b) => b[1] - a[1])[0]!;
    const fell = new Set(columns.filter((c) => c.pieces.some((p) => p.placement.key === lack)).map((c) => `${c.i},${c.j}`));
    const part = plan3dGroups(plan, jRoots([lack]), none.entries);
    const dd = planDressDraws(plan);
    const onFell = dd.filter((p) => fell.has(`${p.cell.i},${p.cell.j}`)).length;
    expect(onFell).toBeGreaterThan(0);
    expect(onFell).toBeLessThan(dd.length);
    expect(part.dress.placed).toBe(dd.length - onFell);
    expect(part.furniture.drawn).toBe(part.furniture.listed);
    part.dispose();
    // A ground key that no column above the ground uses: only ground slots are grey, and no stage 7 piece is lost.
    const above = new Set(columns.flatMap((c) => c.pieces.map((p) => p.placement.key)));
    const only = [...new Set(facadesOf(plan).ground.map((g) => g.placement.key))].filter((kd) => !above.has(kd));
    expect(only.length).toBeGreaterThan(0);
    for (const lackGround of only) {
      const g = plan3dGroups(plan, jRoots([lackGround]), none.entries);
      expect(g.grey.slots, lackGround).toBeGreaterThan(0);
      expect(g.dress.placed, lackGround).toBe(dd.length);
      g.dispose();
    }
  });

  it("swaps an emissive material for a plain one: with emissive stub roots no stage 7 or 8 mesh is emissive, and none carries an emissive map", () => {
    const plan = planOf(DEFAULT);
    const glow = new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffeecc, emissiveIntensity: 2, emissiveMap: new Texture() });
    const roots = jRoots();
    for (const key of new Set<CalibrationKey>([...planDressDraws(plan).map((p) => p.placement.key), ...planPropDraws(plan).map((p) => p.placement.key)])) {
      if (key === CODE_ESCAPE_KEY || !roots.has(key)) continue;
      const g = new Group();
      g.name = shortOf(key);
      g.add(new Mesh(BOX, glow));
      roots.set(key, g);
    }
    const d = plan3dGroups(plan, roots, none.entries);
    let meshes = 0;
    for (const grp of [d.dress.group, d.furniture.group]) {
      grp.traverse((o) => {
        if ((o as InstancedMesh).isInstancedMesh !== true || o.name === "dress:escape-code") return;
        meshes++;
        const mat = (o as InstancedMesh).material as MeshStandardMaterial;
        expect(mat.emissive?.getHex() ?? 0, o.name).toBe(0);
        expect(mat.emissiveMap ?? null, o.name).toBeNull();
      });
    }
    expect(meshes).toBeGreaterThan(10);
    expect(glow.emissive.getHex(), "the cached root's own material is never written").toBe(0xffeecc);
    d.dispose();
  });

  it("keeps the base atlas on every stage 7 and 8 piece, on a building painted in a loaded colourway", () => {
    const plan = planOf(DEFAULT);
    const d = plan3dGroups(plan, jRoots(), none.entries, LOADED_WAYS);
    let painted = 0;
    for (const b of buildingsOf(plan).buildings) {
      if (!LOADED_WAYS.has(b.colourway)) continue;
      const g = d.buildings.groups.find((x) => x.name === `building:${b.id}`)!;
      for (const m of meshesOf(g)) if ((m.material as MeshBasicMaterial).map!.name.startsWith("stub-")) painted++;
    }
    expect(painted).toBeGreaterThan(0);
    let checked = 0;
    for (const grp of [d.dress.group, d.furniture.group]) {
      grp.traverse((o) => {
        if ((o as InstancedMesh).isInstancedMesh !== true || o.name === "dress:escape-code") return;
        const map = ((o as InstancedMesh).material as MeshBasicMaterial).map;
        checked++;
        expect(map?.name.startsWith("stub-") ?? false, o.name).toBe(false);
        if (map) expect(map, o.name).toBe(STUB_SOURCE);
      });
    }
    expect(checked).toBeGreaterThan(10);
    d.dispose();
  });

  it("fails the exactly-once check with one piece dropped from each of dressing, walls, roofs, novelty and props in turn, and with one of each listed twice", () => {
    const plan = planOf(DEFAULT);
    const f = facadesOf(plan);
    const dd = planDressDraws(plan);
    const pd = planPropDraws(plan);
    expect(dressListedOnce(f, dd)).toBe(true);
    expect(propsListedOnce(groundOf(plan), pd)).toBe(true);
    for (const list of ["dressing", "walls", "roofs", "novelty"] as const) {
      const items = f[list] as readonly { placement: CityPlacement }[];
      expect(items.length, list).toBeGreaterThan(0);
      expect(dressListedOnce({ ...f, [list]: items.slice(1) }, dd), `${list} dropped from the layer`).toBe(false);
      expect(dressListedOnce(f, dd.filter((p) => p.placement !== items[0]!.placement)), `${list} dropped from the draws`).toBe(false);
      expect(dressListedOnce(f, [...dd, dd.find((p) => p.list === list)!]), `${list} listed twice`).toBe(false);
    }
    expect(propsListedOnce({ ...groundOf(plan), props: groundOf(plan).props.slice(1) }, pd)).toBe(false);
    expect(propsListedOnce(groundOf(plan), pd.slice(1))).toBe(false);
    expect(propsListedOnce(groundOf(plan), [...pd, pd[3]!])).toBe(false);
  });

  it("names the key a cap leaves out: a stub root with more meshes than DRESS_DRAW_CALLS_MAX leaves room for", () => {
    const plan = planOf(DEFAULT);
    const dd = planDressDraws(plan);
    const okRoots = jRoots();
    const ok = dressStage(dd, okRoots, allColumns(plan));
    expect(notDrawn(dd, ok, okRoots)).toEqual([]);
    ok.dispose();
    const key = dd.find((p) => p.list === "roofs" && p.kind === "waterTower")!.placement.key;
    const roots = jRoots([], new Map([[key, DRESS_DRAW_CALLS_MAX + 10]]));
    const big = dressStage(dd, roots, allColumns(plan));
    expect(notDrawn(dd, big, roots)).toEqual([key]);
    expect(big.leftOut).toEqual([key]);
    expect(big.drawn).toBe(big.placed - dd.filter((p) => p.placement.key === key).length);
    big.dispose();
    const pd = planPropDraws(plan);
    const pkey = pd[0]!.placement.key;
    const proots = jRoots([], new Map([[pkey, FURN_DRAW_CALLS_MAX + 10]]));
    const pbig = propStage(pd, proots);
    expect(notDrawn(pd, pbig, proots)).toEqual([pkey]);
    pbig.dispose();
  });

  it("stops (PlanStopError, the cell named) on a stage 7 piece whose key the page does not load, one whose cell is no column, a stage 8 prop whose key the page does not load, a missing list, and a plan with no ground layer", () => {
    const plan = planOf(DEFAULT);
    const f = facadesOf(plan);
    const roots = jRoots();
    const stop = (p: CityPlan): PlanStopError => {
      let caught: unknown = null;
      try {
        plan3dGroups(p, roots, none.entries);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(PlanStopError);
      return caught as PlanStopError;
    };
    const alien = "city-pack:Nothing_01";
    for (const list of ["dressing", "walls", "roofs", "novelty"] as const) {
      const items = f[list] as readonly { cell: CityCell; placement: CityPlacement }[];
      const e = stop(facadesWith(plan, { [list]: items.map((p, n) => (n === 0 ? { ...p, placement: reKey(p.placement, alien) } : p)) }));
      expect(e.cells, `${list} key`).toEqual([items[0]!.cell]);
      expect(e.message).toMatch(/not one the page loads/);
      const off = { i: -1, j: -1 };
      const e2 = stop(facadesWith(plan, { [list]: items.map((p, n) => (n === 0 ? { ...p, cell: off } : p)) }));
      expect(e2.cells, `${list} cell`).toEqual([off]);
      expect(e2.message).toMatch(/not a column/);
      const bare = { ...f } as { -readonly [K in keyof CityFacadesLayer]?: CityFacadesLayer[K] };
      delete bare[list];
      expect(stop({ ...plan, layers: { ...plan.layers, facades: bare as CityFacadesLayer } }).message, list).toMatch(new RegExp(`no ${list} list`));
    }
    const props = groundOf(plan).props;
    const e3 = stop(groundWith(plan, props.map((p, n) => (n === 0 ? { ...p, placement: reKey(p.placement, alien) } : p))));
    expect(e3.cells).toEqual([props[0]!.cell]);
    expect(e3.message).toMatch(/not one the page loads/);
    const noGround = { ...plan.layers } as { -readonly [K in keyof CityPlan["layers"]]?: CityPlan["layers"][K] };
    delete noGround.ground;
    expect(stop({ ...plan, layers: noGround }).message).toMatch(/ground layers/);
  });
});

describe("the facades and the ground, on the 20 named runs (J criteria 3, 4, 5 and 6)", { timeout: 120_000 }, () => {
  it("draws only, lists every stage 7 piece and every prop exactly once, draws every listed piece with a full stub pack (no key left out, both caps held), and leaves G, G2 and E's counts as they were", async () => {
    for (const o of NAMED) {
      const plan = planOf(o);
      const layers = plan.layers;
      const digests = (): Record<string, string> => ({ streets: digestOf(layers.streets), land: digestOf(layers.land), mass: digestOf(layers.mass), edge: digestOf(layers.edge), buildings: digestOf(layers.buildings), facades: digestOf(layers.facades), ground: digestOf(layers.ground) });
      const before = digests();
      expect(before, label(o)).toEqual({ streets: plan.digests.streets, land: plan.digests.land, mass: plan.digests.mass, edge: plan.digests.edge, buildings: plan.digests.buildings, facades: plan.digests.facades, ground: plan.digests.ground });
      const dd = planDressDraws(plan);
      const pd = planPropDraws(plan);
      expect(dressListedOnce(facadesOf(plan), dd), label(o)).toBe(true);
      expect(propsListedOnce(groundOf(plan), pd), label(o)).toBe(true);
      // The order is the lists': dressing, walls, roofs, novelty, each in its own order.
      const f = facadesOf(plan);
      expect(dd.map((p) => p.placement), label(o)).toEqual([...f.dressing!, ...f.walls!, ...f.roofs!, ...f.novelty!].map((p) => p.placement));
      expect(pd.map((p) => p.placement), label(o)).toEqual(groundOf(plan).props.map((p) => p.placement));
      // The instancer alone, over every column drawn from the pack: nothing is left out, and neither cap is passed.
      const roots = jRoots();
      const s7 = dressStage(dd, roots, allColumns(plan));
      const s8 = propStage(pd, roots);
      expect(s7.placed, label(o)).toBe(dd.length);
      expect(s7.drawn, label(o)).toBe(dd.length);
      expect(notDrawn(dd, s7, roots), label(o)).toEqual([]);
      expect(notDrawn(pd, s8, roots), label(o)).toEqual([]);
      expect(s8.drawn, label(o)).toBe(pd.length);
      expect(s7.leftOut, label(o)).toEqual([]);
      expect(s8.leftOut, label(o)).toEqual([]);
      expect(s7.calls, label(o)).toBeLessThanOrEqual(DRESS_DRAW_CALLS_MAX);
      expect(s8.calls, label(o)).toBeLessThanOrEqual(FURN_DRAW_CALLS_MAX);
      s7.dispose();
      s8.dispose();
      // In code (no roots) the whole draw leaves every layer alone, and G, G2 and E's counts hold.
      const d = plan3dGroups(plan, none.roots, none.entries);
      expect(digests(), `${label(o)}: no layer changed`).toEqual(before);
      expect(d.dressDraws, label(o)).toHaveLength(dd.length);
      expect(d.propDraws, label(o)).toHaveLength(pd.length);
      expect(d.dress.drawn + d.furniture.drawn, label(o)).toBe(0);
      expect(groundListedOnce(facadesOf(plan), d.buildings.groundDraws), label(o)).toBe(true);
      expect(listedOnce(buildingsOf(plan), d.buildings.draws), label(o)).toBe(true);
      expect(d.grey.count, label(o)).toBe(buildingsOf(plan).columns!.length);
      expect(d.tiles.fromPack + d.tiles.codeDrawn, label(o)).toBe(layers.edge!.ground!.length);
      expect(d.interior.fromPack + d.interior.codeDrawn, label(o)).toBe(d.items.length);
      expect(d.tiles.calls, label(o)).toBeLessThanOrEqual(TILE_DRAW_CALLS_MAX);
      expect(d.interior.calls, label(o)).toBeLessThanOrEqual(INTERIOR_DRAW_CALLS_MAX);
      d.dispose();
      await yieldToWorker();
    }
  });

  it("builds the full group (stub roots) on the default city and the four pin cities with the facades, ground and buildings digests unchanged", () => {
    for (const o of [DEFAULT, ...PINS]) {
      const plan = planOf(o);
      const before = digestOf(plan.layers.facades) + digestOf(plan.layers.ground) + digestOf(plan.layers.buildings);
      const d = plan3dGroups(plan, jRoots(), none.entries, LOADED_WAYS);
      expect(digestOf(plan.layers.facades) + digestOf(plan.layers.ground) + digestOf(plan.layers.buildings), label(o)).toBe(before);
      expect(d.dress.drawn, label(o)).toBe(d.dressDraws.length);
      expect(d.furniture.drawn, label(o)).toBe(d.propDraws.length);
      expect(d.dress.calls, label(o)).toBeLessThanOrEqual(DRESS_DRAW_CALLS_MAX);
      expect(d.furniture.calls, label(o)).toBeLessThanOrEqual(FURN_DRAW_CALLS_MAX);
      d.dispose();
    }
  });

  it("R12: planAudit is empty on every named run, no SM_Prop_Pipe_Present_01 stands on any, and the party pipe that does is _03 on a partyPipe", () => {
    let pipes = 0;
    for (const o of NAMED) {
      const plan = planOf(o);
      expect(planAudit(plan), label(o)).toEqual([]);
      const f = facadesOf(plan);
      for (const w of f.walls!) {
        expect(w.placement.key, label(o)).not.toBe(PIPE_01);
        if (w.placement.key === PLAN_PARTY_PIPE) {
          pipes++;
          expect(w.kind, label(o)).toBe("partyPipe");
        }
      }
      for (const p of [...f.dressing!, ...f.roofs!, ...f.novelty!, ...groundOf(plan).props]) expect(p.placement.key, label(o)).not.toBe(PIPE_01);
    }
    expect(pipes).toBeGreaterThan(0);
  });

  it("R12 fixtures: each makes planAudit name exactly that piece, and plan3dGroups stop", () => {
    const plan = planOf(DEFAULT);
    const f = facadesOf(plan);
    const stops = (p: CityPlan): boolean => {
      try {
        plan3dGroups(p, jRoots(), none.entries);
        return false;
      } catch (e) {
        return e instanceof PlanStopError && /R12/.test(e.message);
      }
    };
    expect(planAudit(plan)).toEqual([]);
    // A dressing piece re-keyed to a light pole.
    const lamp = "city-pack:SM_Prop_LightPole_01" as CalibrationKey;
    const a = facadesWith(plan, { dressing: f.dressing!.map((p, n) => (n === 2 ? { ...p, placement: reKey(p.placement, lamp) } : p)) });
    expect(planAudit(a)).toEqual([{ layer: "facades", list: "dressing", cell: f.dressing![2]!.cell, key: lamp }]);
    expect(stops(a)).toBe(true);
    // A partyPipe re-keyed to _01 (and _02), and _03 on a canopy; _03 on a partyPipe is the one allowance.
    const pipe = f.walls!.findIndex((w) => w.kind === "partyPipe");
    const canopy = f.walls!.findIndex((w) => w.kind === "canopy");
    expect(pipe).toBeGreaterThanOrEqual(0);
    expect(canopy).toBeGreaterThanOrEqual(0);
    expect(f.walls![pipe]!.placement.key).toBe(PLAN_PARTY_PIPE);
    const b = facadesWith(plan, { walls: f.walls!.map((w, n) => (n === pipe ? { ...w, placement: reKey(w.placement, PIPE_01) } : w)) });
    expect(planAudit(b)).toEqual([{ layer: "facades", list: "walls", cell: f.walls![pipe]!.cell, key: PIPE_01 }]);
    expect(stops(b)).toBe(true);
    const p02 = "city-pack:SM_Prop_Pipe_Present_02" as CalibrationKey;
    expect(planAudit(facadesWith(plan, { walls: f.walls!.map((w, n) => (n === pipe ? { ...w, placement: reKey(w.placement, p02) } : w)) })).map((e) => e.key)).toEqual([p02]);
    const c = facadesWith(plan, { walls: f.walls!.map((w, n) => (n === canopy ? { ...w, placement: reKey(w.placement, PLAN_PARTY_PIPE) } : w)) });
    expect(planAudit(c)).toEqual([{ layer: "facades", list: "walls", cell: f.walls![canopy]!.cell, key: PLAN_PARTY_PIPE }]);
    expect(stops(c)).toBe(true);
    // A stage 8 prop re-keyed to a car.
    const car = "city-pack:SM_Veh_Car_01" as CalibrationKey;
    const props = groundOf(plan).props;
    const d = groundWith(plan, props.map((p, n) => (n === 5 ? { ...p, placement: reKey(p.placement, car) } : p)));
    expect(planAudit(d)).toEqual([{ layer: "ground", list: "props", cell: props[5]!.cell, key: car }]);
    expect(stops(d)).toBe(true);
  });

  it("loads the party window and the party pipe by name: planKeys() names them and no other new key, and no dressing, furniture or stack list does; every key the plan places is loaded", () => {
    expect(planKeys()).toEqual([...planTileKeys(), PLAN_PARTY_WINDOW, PLAN_PARTY_PIPE, ...Object.values(PLAN_TRAFFIC_KEYS)]);
    expect(planKeys().slice(0, -9)).toEqual([...tileKeys(), PLAN_ARROW, ...PLAN_DOOR_CORNERS]);
    expect([PLAN_PARTY_WINDOW, PLAN_PARTY_PIPE]).toEqual(["city-pack:SM_Prop_Window_01", "city-pack:SM_Prop_Pipe_Present_03"]);
    for (const key of [PLAN_PARTY_WINDOW, PLAN_PARTY_PIPE]) {
      expect(dressKeys()).not.toContain(key);
      expect(furnitureKeys()).not.toContain(key);
      expect(allStackKeys()).not.toContain(key);
    }
    expect(planKeys()).not.toContain(PIPE_01);
    const loaded = new Set<CalibrationKey>([...dressKeys(), ...furnitureKeys(), ...planKeys()]);
    const missing = new Set<string>();
    for (const o of NAMED) {
      const plan = planOf(o);
      for (const d of planDressDraws(plan)) if (d.placement.key !== CODE_ESCAPE_KEY && !loaded.has(d.placement.key)) missing.add(d.placement.key);
      for (const d of planPropDraws(plan)) if (!loaded.has(d.placement.key)) missing.add(d.placement.key);
    }
    expect([...missing]).toEqual([]);
  });

  it("brings the dressing and furniture of a loaded set into the plan's input, and the tile keys of the street pieces are what they were before J", () => {
    const key = dressKeys()[0]!;
    const root = stubRoot(key);
    const set: ModelSet = { ...NO_MODELS, dress: [{ pack: "city-pack", entry: { ...entryOf(key, 0), name: shortOf(key) }, root } as unknown as LoadedModel] };
    expect(planInput(set).roots.get(key)).toBe(root);
    expect(planInput(set).entries.has(key)).toBe(true);
    expect(planTileKeys()).toEqual([...tileKeys(), PLAN_ARROW, ...PLAN_DOOR_CORNERS]);
    for (const kd of [PLAN_PARTY_WINDOW, PLAN_PARTY_PIPE]) expect(planTileKeys()).not.toContain(kd);
  });

  const HAVE_GLB = existsSync(join("assets", "private", "out", "city-pack.glb"));
  interface Gltf {
    nodes: { name?: string; mesh?: number; children?: number[] }[];
    meshes: { primitives: { material?: number }[] }[];
    materials: { emissiveFactor?: number[]; emissiveTexture?: unknown }[];
  }
  const readGlb = (): Gltf => {
    const glb = readFileSync(join("assets", "private", "out", "city-pack.glb"));
    return JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8")) as Gltf;
  };
  const primsOf = (gltf: Gltf, key: CalibrationKey): { prims: number; materials: number[] } => {
    const root = gltf.nodes.find((n) => n.name === shortOf(key));
    expect(root, key).toBeDefined();
    const mats: number[] = [];
    let prims = 0;
    const walk = (n: { mesh?: number; children?: number[] }): void => {
      if (n.mesh !== undefined) {
        for (const p of gltf.meshes[n.mesh]!.primitives) {
          prims++;
          if (p.material !== undefined) mats.push(p.material);
        }
      }
      for (const c of n.children ?? []) walk(gltf.nodes[c]!);
    };
    walk(root!);
    return { prims, materials: mats };
  };

  it.skipIf(!HAVE_GLB)("no key the plan places on 6 x 6 seed 1 has an emissive factor or map in city-pack.glb (skipped when the GLB is absent)", () => {
    const gltf = readGlb();
    const plan = planOf(DEFAULT);
    const keys = new Set<CalibrationKey>([...planDressDraws(plan).map((p) => p.placement.key), ...planPropDraws(plan).map((p) => p.placement.key)]);
    keys.delete(CODE_ESCAPE_KEY);
    expect(keys.size).toBeGreaterThan(40);
    for (const key of keys) {
      const { prims, materials } = primsOf(gltf, key);
      expect(prims, key).toBeGreaterThan(0);
      for (const m of materials) {
        const mat = gltf.materials[m]!;
        expect((mat.emissiveFactor ?? [0, 0, 0]).every((e) => e === 0), `${key} emissive factor`).toBe(true);
        expect(mat.emissiveTexture, `${key} emissive map`).toBeUndefined();
      }
    }
  });

  it.skipIf(!HAVE_GLB)("reports the draw calls of stages 7 and 8 from the converted City Pack on 6 x 6 seeds 1 and 3, and holds both caps (skipped when the GLB is absent)", () => {
    const gltf = readGlb();
    const manifest = JSON.parse(readFileSync(join("assets", "private", "out", "manifest.json"), "utf8")) as { packs: { pack: string; assets: { name: string; triangles: number }[] }[] };
    const triangles = new Map(manifest.packs.find((p) => p.pack === "city-pack")!.assets.map((a) => [a.name, a.triangles] as const));
    for (const o of [DEFAULT, { seed: 3, way: "on" } as City]) {
      const plan = planOf(o);
      const dd = planDressDraws(plan);
      const pd = planPropDraws(plan);
      const keyCalls = (draws: readonly { placement: CityPlacement }[]): { perKey: Map<CalibrationKey, number>; clone: number; tris: number } => {
        const pieces = new Map<CalibrationKey, number>();
        for (const d of draws) if (d.placement.key !== CODE_ESCAPE_KEY) pieces.set(d.placement.key, (pieces.get(d.placement.key) ?? 0) + 1);
        const perKey = new Map<CalibrationKey, number>();
        let clone = 0;
        let tris = 0;
        for (const [key, n] of pieces) {
          const { prims } = primsOf(gltf, key);
          perKey.set(key, prims);
          clone += prims * n;
          tris += (triangles.get(shortOf(key)) ?? 0) * n;
        }
        return { perKey, clone, tris };
      };
      const s7 = keyCalls(dd);
      const s8 = keyCalls(pd);
      const calls7 = [...s7.perKey.values()].reduce((a, b) => a + b, 0);
      const calls8 = [...s8.perKey.values()].reduce((a, b) => a + b, 0);
      const boxCall = dd.some((p) => (p.boxes?.length ?? 0) > 0) ? 1 : 0;
      expect(calls7, `${label(o)} stage 7 keys' meshes`).toBeLessThanOrEqual(DRESS_DRAW_CALLS_MAX);
      expect(calls8, `${label(o)} stage 8 keys' meshes`).toBeLessThanOrEqual(FURN_DRAW_CALLS_MAX);
      // The calls before J (G2's: floors and roofs, ground pieces, the grey call), counted per piece from the GLB.
      const g = planPieceDraws(buildingsOf(plan));
      const gd = planGroundDraws(facadesOf(plan), buildingsOf(plan));
      const floors = g.reduce((n, p) => n + primsOf(gltf, p.placement.key).prims, 0);
      const grounds = gd.reduce((n, p) => n + primsOf(gltf, p.placement.key).prims, 0);
      const before = floors + grounds + 1;
      const kinds7: Record<string, number> = {};
      for (const p of dd) kinds7[`${p.list}:${p.kind}`] = (kinds7[`${p.list}:${p.kind}`] ?? 0) + 1;
      const kinds8: Record<string, number> = {};
      for (const p of pd) kinds8[p.kind] = (kinds8[p.kind] ?? 0) + 1;
      const lists: Record<string, number> = {};
      for (const p of dd) lists[p.list] = (lists[p.list] ?? 0) + 1;
      console.info(
        `J draw calls, ${label(o)}: before J (G2's) ${before} (${floors} floors and roofs + ${grounds} ground pieces + 1 grey); after J ${before + calls7 + boxCall + calls8} (+${calls7} stage 7 calls from ${s7.perKey.size} keys, +${boxCall} escape boxes, +${calls8} stage 8 calls from ${s8.perKey.size} keys); ` +
          `cloning per piece would add ${s7.clone + s8.clone} (${before + s7.clone + s8.clone} in all); stage 7 pieces ${dd.length} by list ${JSON.stringify(lists)} (DRESS_MAX ${DRESS_MAX}, ${dd.length > DRESS_MAX ? `over by ${dd.length - DRESS_MAX}` : "under"}) by kind ${JSON.stringify(kinds7)}; ` +
          `stage 8 props ${pd.length} by kind ${JSON.stringify(kinds8)}; triangles added: stage 7 ${s7.tris}, stage 8 ${s8.tris}`,
      );
      expect(calls7 + calls8).toBeGreaterThan(0);
    }
  });
});

// ---- the renderer ----

describe("createPlanAssembleRenderer3d and the routing (criterion 7)", () => {
  const fakeCanvas = { clientWidth: 1280, clientHeight: 720, style: { touchAction: "" }, addEventListener() {}, removeEventListener() {}, setPointerCapture() {} } as unknown as HTMLCanvasElement;

  it("draws the plan into a scene, in day, once the models load; a failed run draws nothing and says the stage and the reason", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const scenes: Scene[] = [];
    const gl = { setPixelRatio() {}, setSize() {}, render: (s: Scene) => scenes.push(s) } as unknown as WebGLRenderer;
    const ok = createPlanAssembleRenderer3d(gl, fakeCanvas, planAssembleRequested("?city=plan&stage=assemble")!, { dpr: 1, search: "?city=plan&stage=assemble", load: async () => ({ ...NO_MODELS }), run: { ok: true, plan: planOf(DEFAULT) } });
    await new Promise<void>((done) => setTimeout(done, 0));
    ok.draw(undefined as never, undefined as never, 0);
    const scene = scenes[scenes.length - 1]!;
    expect(scene.getObjectByName("plan3d")).toBeDefined();
    expect(scene.userData["lightMode"]).toBe("day");
    let masses = 0;
    scene.traverse((o) => {
      if (o.name === "plan:grey") masses += (o as InstancedMesh).count;
    });
    expect(masses).toBe(planOf(DEFAULT).layers.buildings!.columns!.length);
    expect(scene.getObjectByName("plan:dress")).toBeDefined();
    expect(scene.getObjectByName("plan:furniture")).toBeDefined();
    expect(info.mock.calls.some((c) => String(c[0]).includes("stage 7: 0 of ") && String(c[0]).includes("stage 8: 0 of ") && String(c[0]).includes("keys left out: none"))).toBe(true);
    ok.dispose();

    const failure = { stage: "mass" as const, seed: 7, blocksX: 6, blocksZ: 6, reason: "M3: cell (14, 9) has opposite open sides", cells: [{ i: 14, j: 9 }] };
    const failed = createPlanAssembleRenderer3d(gl, fakeCanvas, planAssembleRequested("?city=plan&stage=9&seed=7")!, { dpr: 1, search: "?city=plan&stage=9&seed=7", load: async () => ({ ...NO_MODELS }), run: { ok: false, plan: planOf(DEFAULT), failure } });
    await new Promise<void>((done) => setTimeout(done, 0));
    failed.draw(undefined as never, undefined as never, 0);
    expect(scenes[scenes.length - 1]!.getObjectByName("plan3d")).toBeUndefined();
    expect(planFailureText(failure)).toBe('City plan failed at stage "mass" (seed 7, 6 x 6): M3: cell (14, 9) has opposite open sides');
    expect(info.mock.calls.some((c) => String(c[0]).includes('stage "mass"') && String(c[0]).includes("M3"))).toBe(true);
    failed.dispose();
    const atBuildings = { stage: "buildings" as const, seed: 7, blocksX: 6, blocksZ: 6, reason: "rule 6: a row stretch of 1 cell", cells: [{ i: 3, j: 4 }] };
    const stopped = createPlanAssembleRenderer3d(gl, fakeCanvas, planAssembleRequested("?city=plan&stage=9&seed=7")!, { dpr: 1, search: "?city=plan&stage=9&seed=7", load: async () => ({ ...NO_MODELS }), run: { ok: false, plan: planOf(DEFAULT), failure: atBuildings } });
    await new Promise<void>((done) => setTimeout(done, 0));
    stopped.draw(undefined as never, undefined as never, 0);
    expect(scenes[scenes.length - 1]!.getObjectByName("plan3d")).toBeUndefined();
    expect(planFailureText(atBuildings)).toBe('City plan failed at stage "buildings" (seed 7, 6 x 6): rule 6: a row stretch of 1 cell');
    stopped.dispose();
    const atGround = { stage: "ground" as const, seed: 7, blocksX: 6, blocksZ: 6, reason: "R10: a prop with no pavement", cells: [{ i: 3, j: 4 }] };
    const groundStopped = createPlanAssembleRenderer3d(gl, fakeCanvas, planAssembleRequested("?city=plan&stage=9&seed=7")!, { dpr: 1, search: "?city=plan&stage=9&seed=7", load: async () => ({ ...NO_MODELS }), run: { ok: false, plan: planOf(DEFAULT), failure: atGround } });
    await new Promise<void>((done) => setTimeout(done, 0));
    groundStopped.draw(undefined as never, undefined as never, 0);
    expect(scenes[scenes.length - 1]!.getObjectByName("plan3d")).toBeUndefined();
    expect(planFailureText(atGround)).toBe('City plan failed at stage "ground" (seed 7, 6 x 6): R10: a prop with no pavement');
    expect(info.mock.calls.some((c) => String(c[0]).includes('stage "ground"') && String(c[0]).includes("R10"))).toBe(true);
    groundStopped.dispose();
    const atTraffic = { stage: "traffic" as const, seed: 7, blocksX: 6, blocksZ: 6, reason: "TC5: a stop sign under an awning", cells: [{ i: 5, j: 6 }] };
    const trafficStopped = createPlanAssembleRenderer3d(gl, fakeCanvas, planAssembleRequested("?city=plan&stage=9&seed=7")!, { dpr: 1, search: "?city=plan&stage=9&seed=7", load: async () => ({ ...NO_MODELS }), run: { ok: false, plan: planOf(DEFAULT), failure: atTraffic } });
    await new Promise<void>((done) => setTimeout(done, 0));
    trafficStopped.draw(undefined as never, undefined as never, 0);
    expect(scenes[scenes.length - 1]!.getObjectByName("plan3d")).toBeUndefined();
    expect(planFailureText(atTraffic)).toBe('City plan failed at stage "traffic" (seed 7, 6 x 6): TC5: a stop sign under an awning');
    expect(info.mock.calls.some((c) => String(c[0]).includes('stage "traffic"') && String(c[0]).includes("TC5"))).toBe(true);
    trafficStopped.dispose();
    info.mockRestore();
  });


  it("the plan stands in the rendered scene and the overhead camera sees all of it, at a phone and a desktop size (the 6 x 6 city, in code and from a pack-less load)", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    for (const [w, h] of [[375, 812], [1280, 720]] as const) {
      const rendered: { scene: Scene; camera: PerspectiveCamera }[] = [];
      const gl = { setPixelRatio() {}, setSize() {}, render: (s: Scene, c: PerspectiveCamera) => rendered.push({ scene: s, camera: c }) } as unknown as WebGLRenderer;
      const canvas = { ...fakeCanvas, clientWidth: w, clientHeight: h } as unknown as HTMLCanvasElement;
      const r = createPlanAssembleRenderer3d(gl, canvas, planAssembleRequested("?city=plan&stage=assemble")!, { dpr: 1, search: "", load: async () => ({ ...NO_MODELS }), run: { ok: true, plan: planOf(DEFAULT) } });
      await new Promise<void>((done) => setTimeout(done, 0));
      r.draw(undefined as never, undefined as never, 0);
      const { scene, camera } = rendered[rendered.length - 1]!;
      const root = scene.getObjectByName("plan3d")!;
      let up: Object3D | null = root;
      while (up && up !== scene) up = up.parent;
      expect(up, "the plan is a descendant of the rendered scene").toBe(scene);
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      const box = new Box3().setFromObject(root);
      expect(box.isEmpty()).toBe(false);
      const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      const corners = [box.min.x, box.max.x].flatMap((x) => [box.min.z, box.max.z].map((z) => new Vector3(x, 0, z)));
      for (const c of corners) expect(frustum.containsPoint(c), `corner ${c.x},${c.z} at ${w}x${h}`).toBe(true);
      // Inside the depth range too: the far plane reaches past the far corner.
      const far = Math.max(...corners.map((c) => c.distanceTo(camera.position)));
      expect(far).toBeLessThan(camera.far);
      expect(box.min.distanceTo(camera.position)).toBeGreaterThan(camera.near);
      r.dispose();
    }
    vi.restoreAllMocks();
  });

  it("ignores the page's HUD insets: with a tall HUD the overhead camera still fits the city inside its far plane, at a phone and a desktop size", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    for (const [w, h] of [[375, 812], [1024, 768]] as const) {
      const rendered: PerspectiveCamera[] = [];
      const gl = { setPixelRatio() {}, setSize() {}, render: (_s: Scene, c: PerspectiveCamera) => rendered.push(c) } as unknown as WebGLRenderer;
      const canvas = { ...fakeCanvas, clientWidth: w, clientHeight: h } as unknown as HTMLCanvasElement;
      const tall = { top: Math.round(h * 0.5), bottom: Math.round(h * 0.45) };
      const r = createPlanAssembleRenderer3d(gl, canvas, planAssembleRequested("?city=plan&stage=assemble")!, { dpr: 1, search: "", insets: tall, load: async () => ({ ...NO_MODELS }), run: { ok: true, plan: planOf(DEFAULT) } });
      r.setInsets(tall);
      r.resetView();
      r.draw(undefined as never, undefined as never, 0);
      const cam = rendered[rendered.length - 1]!;
      const streets = planOf(DEFAULT).layers.streets!;
      const centre = new Vector3((streets.w * TILE_M * 0.18) / 2, 0, (streets.h * TILE_M * 0.18) / 2);
      expect(cam.position.distanceTo(centre), `${w}x${h}`).toBeLessThan(cam.far / 2);
      r.dispose();
    }
    vi.restoreAllMocks();
  });

  it("the street camera stands over the city, looks along its street at a point inside it, and sees the plan", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const plan = planOf(DEFAULT);
    const streets = plan.layers.streets!;
    const rendered: { scene: Scene; camera: PerspectiveCamera }[] = [];
    const gl = { setPixelRatio() {}, setSize() {}, render: (s: Scene, c: PerspectiveCamera) => rendered.push({ scene: s, camera: c }) } as unknown as WebGLRenderer;
    const req = planAssembleRequested("?city=plan&stage=assemble&cam=street")!;
    const r = createPlanAssembleRenderer3d(gl, fakeCanvas, req, { dpr: 1, search: "", load: async () => ({ ...NO_MODELS }), run: { ok: true, plan } });
    await new Promise<void>((done) => setTimeout(done, 0));
    r.draw(undefined as never, undefined as never, 0);
    const { scene, camera } = rendered[rendered.length - 1]!;
    const pose = planStreetPose(streets, req)!;
    const w = streets.w * TILE_M * 0.18;
    const d = streets.h * TILE_M * 0.18;
    expect(pose.look[0]).toBeGreaterThan(0);
    expect(pose.look[0]).toBeLessThan(w);
    expect(pose.look[2]).toBeGreaterThan(0);
    expect(pose.look[2]).toBeLessThan(d);
    camera.updateMatrixWorld(true);
    const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    expect(frustum.containsPoint(new Vector3(...pose.look))).toBe(true);
    scene.updateMatrixWorld(true);
    let seen = 0;
    scene.traverse((o) => {
      if ((o as Mesh).isMesh && o.name !== "" && frustum.intersectsObject(o as Mesh)) seen++;
    });
    expect(seen).toBeGreaterThan(0);
    r.dispose();
    vi.restoreAllMocks();
  });

  it("runs the pipeline to the ground stage when the page does not give a run (the flat picture at stage=ground stays planview.ts's)", () => {
    const source = readFileSync("src/render3d/plan3d.ts", "utf8");
    expect(source).toMatch(/runCity\(\{ blocksX: req\.blocksX, blocksZ: req\.blocksZ, seed: req\.seed \}, "traffic"\)/);
    expect(source).not.toMatch(/seed: req\.seed \}, "(facades|ground)"\)/);
    expect(planAssembleRequested("?city=plan&stage=ground")).toBeNull();
  });

  it("is routed in renderer.ts ahead of the flat picture and the town's scene, and takes no other address", () => {
    const renderer = readFileSync("src/render3d/renderer.ts", "utf8");
    expect(renderer).toMatch(/import\.meta\.env\.DEV && typeof location !== "undefined" \? planAssembleRequested\(location\.search\)/);
    expect(renderer).toMatch(/const planView = assemble === null && import\.meta\.env\.DEV/);
    expect(renderer).toMatch(/if \(assemble !== null\) \{[^}]*return createPlanAssembleRenderer3d\(/);
    expect(renderer.indexOf("planAssembleRequested(location.search)")).toBeLessThan(renderer.indexOf("planViewRequested(location.search)"));
    expect(renderer.indexOf("createPlanAssembleRenderer3d(renderer")).toBeLessThan(renderer.indexOf("createGalleryRenderer3d("));
    expect(renderer.indexOf("createPlanAssembleRenderer3d(renderer")).toBeLessThan(renderer.indexOf("buildScene(puzzle"));
  });
});

describe("tilesPlanRequested (ticket 070 L1, criterion 1)", () => {
  it("gives what planAssembleRequested gives for the same query with city=plan&stage=assemble", () => {
    for (const rest of ["", "&blocks=5x4&seed=2", "&cam=street&at=3,4&dir=%2Bx", "&cam=street&at=0", "&blocks=9x0&seed=x", "&cam=street&at=nope&dir=up"]) {
      expect(tilesPlanRequested(`?puzzle=01-first-light&view=3d&city=tiles${rest}`), rest).toEqual(planAssembleRequested(`?puzzle=01-first-light&view=3d&city=plan&stage=assemble${rest}`));
    }
  });

  it("the bare city=tiles is the 6 x 6 seed 1 overhead view", () => {
    expect(tilesPlanRequested("?city=tiles")).toEqual({ blocksX: 6, blocksZ: 6, seed: 1, street: false, at: null, dir: null, era: "clean" });
  });

  it("reads blocks, seed, cam=street, at and dir", () => {
    expect(tilesPlanRequested("?city=tiles&blocks=5x4&seed=2")).toMatchObject({ blocksX: 5, blocksZ: 4, seed: 2, street: false });
    expect(tilesPlanRequested("?city=tiles&cam=street&at=3,4&dir=%2Bx")).toMatchObject({ street: true, at: { i: 3, j: 4 }, dir: "+x" });
  });

  it("an old-style at=0 is a null at, and does not throw", () => {
    expect(() => tilesPlanRequested("?city=tiles&cam=street&at=0")).not.toThrow();
    expect(tilesPlanRequested("?city=tiles&cam=street&at=0")).toMatchObject({ street: true, at: null });
  });

  it("is null for sheet=1, city=plan, city=tiles-old and no city", () => {
    for (const s of ["?city=tiles&sheet=1", "?city=plan", "?city=plan&stage=assemble", "?city=tiles-old", "?city=tiles-old&sheet=1", "", "?stage=assemble"]) expect(tilesPlanRequested(s), s).toBeNull();
  });

  it("is routed in renderer.ts with the assembled plan, ahead of the old city branch", () => {
    const renderer = readFileSync("src/render3d/renderer.ts", "utf8");
    expect(renderer).toMatch(/planAssembleRequested\(location\.search\) \?\? tilesPlanRequested\(location\.search\)/);
    expect(renderer).toMatch(/oldTilesRequested\(location\.search\)/);
    expect(renderer.indexOf("tilesPlanRequested(location.search)")).toBeLessThan(renderer.indexOf("oldTilesRequested(location.search)"));
    expect(renderer.indexOf("createPlanAssembleRenderer3d(renderer")).toBeLessThan(renderer.indexOf("createCityRenderer3d("));
  });
});

// ---- stage 9: the traffic pieces drawn (ticket 070 TR2) ----

const SEVEN = Object.values(PLAN_TRAFFIC_KEYS);
const trafficWith = (plan: CityPlan, pieces: readonly { kind: string; cell: CityCell; placement: CityPlacement }[]): CityPlan => ({ ...plan, layers: { ...plan.layers, traffic: { ...plan.layers.traffic!, pieces: pieces as never } } });
const trafficPieces = (plan: CityPlan): NonNullable<CityPlan["layers"]["traffic"]>["pieces"] => plan.layers.traffic!.pieces;
/** Every piece of the traffic layer is in the draw list exactly once (by the identity of its placement), and nothing else is. */
const trafficListedOnce = (pieces: readonly { placement: CityPlacement }[], draws: readonly PlanTrafficDraw[]): boolean => {
  const seen = new Map<CityPlacement, number>();
  for (const d of draws) seen.set(d.placement, (seen.get(d.placement) ?? 0) + 1);
  return pieces.every((p) => seen.get(p.placement) === 1) && seen.size === pieces.length && draws.length === pieces.length;
};
const countByKey = (draws: readonly { placement: CityPlacement }[]): Map<CalibrationKey, number> => {
  const c = new Map<CalibrationKey, number>();
  for (const d of draws) c.set(d.placement.key, (c.get(d.placement.key) ?? 0) + 1);
  return c;
};
const lightsIn = (o: Object3D): number => {
  let n = 0;
  o.traverse((c) => {
    if ((c as unknown as { isLight?: boolean }).isLight === true) n++;
  });
  return n;
};
const turn = (yaw: number): number => ((Math.round(yaw) % 360) + 360) % 360;
const isNeverUsedKey = (key: string): boolean => CITY_NEVER_USED.some((s) => key.slice(key.indexOf(":") + 1).startsWith(s));

describe("stage 9: the traffic pieces, from placements only (TR2 criteria 2, 3, 6)", { timeout: 120_000 }, () => {
  it("draws one piece of each of the seven kinds at its placement, at every turn the list has for it, a fixed piece's base at its y_m over 0", () => {
    const turns = new Map<string, Set<number>>();
    const m = new Matrix4();
    const pos = new Vector3();
    let fixed = 0;
    for (const o of [DEFAULT, ...PINS]) {
      const done = new Set<string>();
      for (const d of planTrafficDraws(planOf(o))) {
        const id = `${d.kind}|${d.placement.yaw_deg}`;
        if (done.has(id)) continue;
        done.add(id);
        const stages = furnitureStages([], [d], jRoots());
        const im = instancedBy(stages.traffic.group).get(`dress:${shortOf(d.placement.key)}`);
        expect(im, `${label(o)} ${d.kind}`).toBeDefined();
        expect(im!.count).toBe(1);
        im!.getMatrixAt(0, m);
        const want = dressMatrix(IDENT, { x: d.placement.x_m, y: d.placement.y_m, z: d.placement.z_m, yaw: d.placement.yaw_deg * RAD });
        expect(maxDiff(m, want), `${label(o)} ${d.kind} at ${d.placement.yaw_deg}`).toBeLessThan(1e-4);
        pos.setFromMatrixPosition(m);
        expect(pos.y / 0.18, `${label(o)} ${d.kind}: its base is y_m over the walk (0)`).toBeCloseTo(d.placement.y_m, 6);
        if (!d.grounded) {
          fixed++;
          expect(d.placement.y_m, `${d.kind} is fixed to another piece at a height`).toBeGreaterThan(0);
        }
        expect(d.placement.key).toBe(PLAN_TRAFFIC_KEYS[d.kind]);
        (turns.get(d.kind) ?? turns.set(d.kind, new Set()).get(d.kind)!).add(turn(d.placement.yaw_deg));
        stages.furniture.dispose();
      }
    }
    expect([...turns.keys()].sort()).toEqual(Object.keys(PLAN_TRAFFIC_KEYS).sort());
    const all = new Set([...turns.values()].flatMap((t) => [...t]));
    expect([...all].sort((a, b) => a - b)).toEqual([0, 90, 180, 270]);
    expect(fixed).toBeGreaterThan(0);
    console.info(`TR2 turns by kind: ${[...turns].map(([k, t]) => `${k} ${[...t].sort((a, b) => a - b).join("/")}`).join("; ")}`);
  });

  it("draws a piece only when its key's root loaded: with one traffic key's root missing only that key's pieces are not drawn and stage 8's count is unchanged; with empty roots none is", () => {
    const plan = planOf(DEFAULT);
    const td = planTrafficDraws(plan);
    const full = plan3dGroups(plan, jRoots(), none.entries);
    expect(full.traffic.drawn).toBe(td.length);
    const e = plan3dGroups(plan, none.roots, none.entries);
    expect(e.traffic.placed).toBe(0);
    expect(e.traffic.drawn).toBe(0);
    expect(e.group.getObjectByName("plan:furniture")!.children).toHaveLength(0);
    e.dispose();
    for (const key of SEVEN) {
      const n = countByKey(td).get(key) ?? 0;
      const part = plan3dGroups(plan, jRoots([key]), none.entries);
      expect(part.traffic.perKey.has(key), key).toBe(false);
      expect(part.traffic.placed, key).toBe(td.length - n);
      expect(part.traffic.listed, key).toBe(td.length);
      expect(part.furniture.drawn, key).toBe(full.furniture.drawn);
      expect(part.furniture.listed, key).toBe(full.furniture.listed);
      for (const [other, c] of full.traffic.perKey) if (other !== key) expect(part.traffic.perKey.get(other), `${key} missing, ${other}`).toBe(c);
      part.dispose();
    }
    full.dispose();
  });

  it("lists every traffic piece once, in order, with every key one the page loads; the traffic keys and stage 8's are disjoint; planKeys() gains the seven and nothing else; the seven are in no other list", () => {
    const loaded = new Set<CalibrationKey>(planKeys());
    for (const key of SEVEN) expect(loaded.has(key), key).toBe(true);
    expect(planKeys().filter((key) => !planTileKeys().includes(key) && key !== PLAN_PARTY_WINDOW && key !== PLAN_PARTY_PIPE).sort()).toEqual([...SEVEN].sort());
    for (const key of SEVEN) {
      expect(dressKeys(), key).not.toContain(key);
      expect(furnitureKeys(), key).not.toContain(key);
      expect(allStackKeys(), key).not.toContain(key);
      expect(planTileKeys(), key).not.toContain(key);
    }
    expect(planTileKeys()).toEqual([...tileKeys(), PLAN_ARROW, ...PLAN_DOOR_CORNERS]);
    // The page's names are the traffic kit's, once each.
    expect(PLAN_TRAFFIC_KEYS).toEqual(KEY_OF_KIND);
    expect([...SEVEN].sort()).toEqual(Object.keys(TRAFFIC_BOUNDS).sort());
    let pieces = 0;
    for (const o of NAMED) {
      const plan = planOf(o);
      const td = planTrafficDraws(plan);
      pieces += td.length;
      expect(trafficListedOnce(trafficPieces(plan), td), label(o)).toBe(true);
      expect(td.map((d) => d.placement), label(o)).toEqual(trafficPieces(plan).map((p) => p.placement));
      for (const d of td) expect(loaded.has(d.placement.key), `${label(o)} ${d.placement.key}`).toBe(true);
      const eight = new Set(planPropDraws(plan).map((p) => p.placement.key));
      for (const d of td) expect(eight.has(d.placement.key), `${label(o)} ${d.placement.key} is also a stage 8 key`).toBe(false);
    }
    if (FULL_CITIES) expect(pieces).toBeGreaterThan(5000);
  });

  it("fails the exactly-once check with one traffic piece dropped and with one listed twice; stops on a plan with no traffic layer and on a piece whose key the page does not load (the cell named)", () => {
    const plan = planOf(DEFAULT);
    const pieces = trafficPieces(plan);
    const td = planTrafficDraws(plan);
    expect(trafficListedOnce(pieces, td)).toBe(true);
    expect(trafficListedOnce(pieces.slice(1), td)).toBe(false);
    expect(trafficListedOnce(pieces, td.slice(1))).toBe(false);
    expect(trafficListedOnce(pieces, [...td, td[3]!])).toBe(false);
    const stop = (p: CityPlan): PlanStopError => {
      let caught: unknown = null;
      try {
        plan3dGroups(p, jRoots(), none.entries);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(PlanStopError);
      return caught as PlanStopError;
    };
    const noTraffic = { ...plan.layers } as { -readonly [K in keyof CityPlan["layers"]]?: CityPlan["layers"][K] };
    delete noTraffic.traffic;
    expect(stop({ ...plan, layers: noTraffic }).message).toMatch(/no traffic layer/);
    let thrown: unknown = null;
    try {
      planTrafficDraws({ ...plan, layers: noTraffic });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlanStopError);
    const give = "city-pack:SM_Prop_Sign_GiveWay_01";
    const at = pieces.findIndex((p) => p.kind === "stopSign");
    const e = stop(trafficWith(plan, pieces.map((p, n) => (n === at ? { ...p, placement: reKey(p.placement, give) } : p))));
    expect(e.cells).toEqual([pieces[at]!.cell]);
    expect(e.message).toMatch(/not one the page loads/);
  });

  it("on the 20 named runs: the shared group holds every listed piece of both stages with a full stub pack (no key left out, the cap held), and each traffic key's instances are its listed count", () => {
    for (const o of NAMED) {
      const plan = planOf(o);
      const pd = planPropDraws(plan);
      const td = planTrafficDraws(plan);
      const roots = jRoots();
      const s = furnitureStages(pd, td, roots);
      const listed = countByKey(td);
      expect(s.traffic.placed, label(o)).toBe(td.length);
      expect(s.traffic.drawn, label(o)).toBe(td.length);
      expect(s.furniture.drawn, label(o)).toBe(pd.length);
      expect(s.traffic.leftOut, label(o)).toEqual([]);
      expect(s.furniture.leftOut, label(o)).toEqual([]);
      for (const [key, n] of listed) expect(s.traffic.perKey.get(key), `${label(o)} ${key}`).toBe(n);
      expect(notDrawn(pd, s.furniture, roots), label(o)).toEqual([]);
      expect(s.furniture.calls + s.traffic.calls, label(o)).toBe(s.furniture.group.children.length);
      expect(s.furniture.group.children.length, label(o)).toBeLessThanOrEqual(FURN_DRAW_CALLS_MAX);
      expect(s.traffic.calls, label(o)).toBeGreaterThanOrEqual(1);
      // Stage 8's summary is what J reports of it alone.
      const alone = propStage(pd, roots);
      expect(alone.drawn, label(o)).toBe(s.furniture.drawn);
      expect([...alone.perKey].sort()).toEqual([...s.furniture.perKey].sort());
      alone.dispose();
      s.furniture.dispose();
    }
  });

  it("builds the full group (stub roots) on the default city and the four pin cities: every layer's digest, streets to traffic, is the same before and after, and every cap holds", () => {
    for (const o of [DEFAULT, ...PINS]) {
      const plan = planOf(o);
      const layers = plan.layers;
      const digests = (): Record<string, string> => ({ streets: digestOf(layers.streets), land: digestOf(layers.land), mass: digestOf(layers.mass), edge: digestOf(layers.edge), buildings: digestOf(layers.buildings), facades: digestOf(layers.facades), ground: digestOf(layers.ground), traffic: digestOf(layers.traffic) });
      const before = digests();
      expect(before, label(o)).toEqual({ streets: plan.digests.streets, land: plan.digests.land, mass: plan.digests.mass, edge: plan.digests.edge, buildings: plan.digests.buildings, facades: plan.digests.facades, ground: plan.digests.ground, traffic: plan.digests.traffic });
      const d = plan3dGroups(plan, jRoots(), none.entries, LOADED_WAYS);
      expect(digests(), `${label(o)}: no layer changed`).toEqual(before);
      expect(d.trafficDraws, label(o)).toHaveLength(trafficPieces(plan).length);
      expect(d.traffic.drawn, label(o)).toBe(d.trafficDraws.length);
      expect(d.traffic.leftOut, label(o)).toEqual([]);
      expect(d.furniture.drawn, label(o)).toBe(d.propDraws.length);
      expect(d.tiles.calls, label(o)).toBeLessThanOrEqual(TILE_DRAW_CALLS_MAX);
      expect(d.interior.calls, label(o)).toBeLessThanOrEqual(INTERIOR_DRAW_CALLS_MAX);
      expect(d.dress.calls, label(o)).toBeLessThanOrEqual(DRESS_DRAW_CALLS_MAX);
      expect(d.furniture.group.children.length, label(o)).toBeLessThanOrEqual(FURN_DRAW_CALLS_MAX);
      expect(d.group.children.includes(d.furniture.group)).toBe(true);
      expect(d.traffic.group, "one group for stages 8 and 9").toBe(d.furniture.group);
      d.dispose();
    }
  });
});

describe("stage 9: dark, and R12's allowance (TR2 criteria 4 and 7)", { timeout: 120_000 }, () => {
  const HAVE_GLB = existsSync(join("assets", "private", "out", "city-pack.glb"));
  const glowRoots = (): { roots: Map<CalibrationKey, Object3D>; glow: MeshStandardMaterial } => {
    const glow = new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffeecc, emissiveIntensity: 2, emissiveMap: new Texture() });
    const roots = jRoots();
    for (const key of SEVEN) {
      const g = new Group();
      g.name = shortOf(key);
      g.add(new Mesh(BOX, glow));
      roots.set(key, g);
    }
    return { roots, glow };
  };

  it("draws every traffic mesh with no emissive and no emissive map, leaves the root's own material alone, and adds no Light", () => {
    const plan = planOf(DEFAULT);
    const { roots, glow } = glowRoots();
    const d = plan3dGroups(plan, roots, none.entries);
    const names = new Set(SEVEN.map((key) => `dress:${shortOf(key)}`));
    let meshes = 0;
    d.furniture.group.traverse((o) => {
      if ((o as InstancedMesh).isInstancedMesh !== true || !names.has(o.name)) return;
      meshes++;
      const mat = (o as InstancedMesh).material as MeshStandardMaterial;
      expect(mat.emissive?.getHex() ?? 0, o.name).toBe(0);
      expect(mat.emissiveMap ?? null, o.name).toBeNull();
    });
    expect(meshes).toBe(SEVEN.length);
    expect(glow.emissive.getHex(), "the root's material is never written").toBe(0xffeecc);
    const lights = lightsIn(d.group);
    const without = plan3dGroups(trafficWith(plan, []), jRoots(), none.entries);
    expect(without.trafficDraws).toHaveLength(0);
    expect(lightsIn(without.group)).toBe(lights);
    expect(lights).toBe(0);
    without.dispose();
    d.dispose();
  });

  it.skipIf(!HAVE_GLB)("none of the seven keys has an emissive factor or map in city-pack.glb (skipped when the GLB is absent)", () => {
    const glb = readFileSync(join("assets", "private", "out", "city-pack.glb"));
    const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8")) as { nodes: { name?: string; mesh?: number; children?: number[] }[]; meshes: { primitives: { material?: number }[] }[]; materials: { emissiveFactor?: number[]; emissiveTexture?: unknown }[] };
    for (const key of SEVEN) {
      const root = gltf.nodes.find((n) => n.name === shortOf(key));
      expect(root, key).toBeDefined();
      let prims = 0;
      const walk = (n: { mesh?: number; children?: number[] }): void => {
        for (const p of n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives : []) {
          prims++;
          const mat = p.material !== undefined ? gltf.materials[p.material]! : {};
          expect(((mat as { emissiveFactor?: number[] }).emissiveFactor ?? [0, 0, 0]).every((e) => e === 0), `${key} emissive factor`).toBe(true);
          expect((mat as { emissiveTexture?: unknown }).emissiveTexture, `${key} emissive map`).toBeUndefined();
        }
        for (const c of n.children ?? []) walk(gltf.nodes[c]!);
      };
      walk(root!);
      expect(prims, key).toBeGreaterThan(0);
    }
  });

  it("allows Q33's five keys on their own kinds only: the table is the kit's TRAFFIC_ALLOWED and KEY_OF_KIND, and planAudit is empty on the 20 named runs", () => {
    expect(new Set(Object.values(PLAN_TRAFFIC_ALLOWED))).toEqual(new Set(TRAFFIC_ALLOWED));
    expect(Object.values(PLAN_TRAFFIC_ALLOWED)).toHaveLength(5);
    for (const [kind, key] of Object.entries(PLAN_TRAFFIC_ALLOWED)) expect(KEY_OF_KIND[kind as keyof typeof KEY_OF_KIND], kind).toBe(key);
    for (const key of Object.values(PLAN_TRAFFIC_ALLOWED)) expect(isNeverUsedKey(key), key).toBe(true);
    expect(isNeverUsedKey(PLAN_TRAFFIC_KEYS.stopSign)).toBe(false);
    expect(isNeverUsedKey(PLAN_TRAFFIC_KEYS.parkingSign)).toBe(false);
    for (const o of NAMED) expect(planAudit(planOf(o)), label(o)).toEqual([]);
  });

  it("R12 fixtures: each makes planAudit name exactly that piece and plan3dGroups stop", () => {
    const plan = planOf(DEFAULT);
    const pieces = trafficPieces(plan);
    const stops = (p: CityPlan): boolean => {
      try {
        plan3dGroups(p, jRoots(), none.entries);
        return false;
      } catch (e) {
        return e instanceof PlanStopError && /R12/.test(e.message);
      }
    };
    const first = (kind: string): number => pieces.findIndex((p) => p.kind === kind);
    expect(planAudit(plan)).toEqual([]);
    // A stage 8 prop re-keyed to the mast's key: it is not a traffic piece, so it is not allowed.
    const props = groundOf(plan).props;
    const a = groundWith(plan, props.map((p, n) => (n === 4 ? { ...p, placement: reKey(p.placement, PLAN_TRAFFIC_KEYS.signalMast) } : p)));
    expect(planAudit(a)).toEqual([{ layer: "ground", list: "props", cell: props[4]!.cell, key: PLAN_TRAFFIC_KEYS.signalMast }]);
    expect(stops(a)).toBe(true);
    const named = (index: number, key: string): CityPlan => trafficWith(plan, pieces.map((p, n) => (n === index ? { ...p, placement: reKey(p.placement, key) } : p)));
    const cases: [string, number, string][] = [
      ["a stop sign re-keyed to SM_Prop_TrafficLight_01", first("stopSign"), "city-pack:SM_Prop_TrafficLight_01"],
      ["SM_Prop_LightPole_Arm_01 on a signalMast", first("signalMast"), PLAN_TRAFFIC_KEYS.signalArm],
      ["SM_Prop_LightPole_Lights_01 on a signalArm", first("signalArm"), "city-pack:SM_Prop_LightPole_Lights_01"],
      ["the mast's key on a walkHead", first("walkHead"), PLAN_TRAFFIC_KEYS.signalMast],
    ];
    for (const [what, index, key] of cases) {
      expect(index, what).toBeGreaterThanOrEqual(0);
      const p = named(index, key);
      expect(planAudit(p), what).toEqual([{ layer: "traffic", list: "pieces", cell: pieces[index]!.cell, key }]);
      expect(stops(p), what).toBe(true);
    }
  });
});

describe("stage 9: the stop sign from 01_A (TR2 criterion 5)", { timeout: 120_000 }, () => {
  const ATLAS = stubColourway("01_A");
  const mapsOf = (group: Object3D, names: ReadonlySet<string>): Map<string, string[]> => {
    const out = new Map<string, string[]>();
    group.traverse((o) => {
      if ((o as InstancedMesh).isInstancedMesh !== true || !names.has(o.name)) return;
      const map = ((o as InstancedMesh).material as MeshBasicMaterial).map;
      (out.get(o.name) ?? out.set(o.name, []).get(o.name)!).push(map?.name ?? "none");
    });
    return out;
  };

  it("paints the stop sign's meshes on 01_A and no other traffic, stage 7 or stage 8 mesh; the roots are never written; no building is painted differently", () => {
    const plan = planOf(DEFAULT);
    const roots = jRoots();
    const stopKey = PLAN_TRAFFIC_KEYS.stopSign;
    const stopRoot = roots.get(stopKey)!;
    const mats = new Map<CalibrationKey, Material>();
    for (const [key, r] of roots) mats.set(key, (r.children[0] as Mesh).material as Material);
    const withAtlas = plan3dGroups(plan, roots, none.entries, LOADED_WAYS, ATLAS);
    const without = plan3dGroups(plan, roots, none.entries, LOADED_WAYS);
    expect(withAtlas.stopPainted).toBe(true);
    expect(without.stopPainted).toBe(false);
    const stopName = `dress:${shortOf(stopKey)}`;
    const stopMaps = mapsOf(withAtlas.furniture.group, new Set([stopName]));
    expect(stopMaps.get(stopName)).toEqual(["stub-01_A"]);
    const others = new Set([...SEVEN.filter((key) => key !== stopKey).map((key) => `dress:${shortOf(key)}`)]);
    for (const [name, maps] of mapsOf(withAtlas.furniture.group, others)) expect(maps, name).toEqual(["PolygonCity_Texture"]);
    // Every stage 7 and stage 8 mesh keeps the stub's base map, with or without the atlas.
    const rest = (d: PlanDraw): string[] => {
      const out: string[] = [];
      for (const grp of [d.dress.group, d.furniture.group]) {
        grp.traverse((o) => {
          if ((o as InstancedMesh).isInstancedMesh !== true || o.name === "dress:escape-code" || o.name === stopName || others.has(o.name)) return;
          out.push(`${o.name}:${((o as InstancedMesh).material as MeshBasicMaterial).map?.name ?? "none"}`);
        });
      }
      return out;
    };
    expect(rest(withAtlas)).toEqual(rest(without));
    expect(rest(withAtlas).length).toBeGreaterThan(10);
    expect(mapsOf(without.furniture.group, new Set([stopName])).get(stopName)).toEqual(["PolygonCity_Texture"]);
    // The loaded root, its materials and its maps are as they were.
    expect(roots.get(stopKey)).toBe(stopRoot);
    for (const [key, r] of roots) {
      expect((r.children[0] as Mesh).material, key).toBe(mats.get(key));
      expect(((r.children[0] as Mesh).material as MeshBasicMaterial).map, key).toBe(STUB_SOURCE);
    }
    // No building is painted differently.
    const names = (d: PlanDraw): string[] => d.buildings.groups.flatMap((g) => meshesOf(g).map((m) => `${g.name}:${(m.material as MeshBasicMaterial).map?.name ?? "none"}`));
    expect(names(withAtlas)).toEqual(names(without));
    withAtlas.dispose();
    without.dispose();
  });

  it("leaves the stop sign on the base map with no atlas, and when its root did not load", () => {
    const plan = planOf(DEFAULT);
    const d = plan3dGroups(plan, jRoots(), none.entries, undefined, undefined);
    expect(d.stopPainted).toBe(false);
    const name = `dress:${shortOf(PLAN_TRAFFIC_KEYS.stopSign)}`;
    expect(mapsOf(d.furniture.group, new Set([name])).get(name)).toEqual(["PolygonCity_Texture"]);
    d.dispose();
    const lacking = plan3dGroups(plan, jRoots([PLAN_TRAFFIC_KEYS.stopSign]), none.entries, undefined, ATLAS);
    expect(lacking.stopPainted).toBe(false);
    lacking.dispose();
  });

  it("planInput returns the loaded 01_A texture as stopAtlas, and nothing without it", () => {
    expect(planInput({ ...NO_MODELS }).stopAtlas).toBeUndefined();
    expect(planInput({ ...NO_MODELS, signColourways: new Map([["01_A", ATLAS]]) }).stopAtlas).toBe(ATLAS);
    expect(planInput({ ...NO_MODELS, signColourways: new Map([["02_A", ATLAS]]) }).stopAtlas).toBeUndefined();
    const source = readFileSync("src/render3d/plan3d.ts", "utf8");
    expect(source).toMatch(/sharedTileModels\(planKeys\(\), \[STOP_SIGN_COLOURWAY\]\)/);
  });
});

describe("stage 9: the pack's numbers, and where to look (TR2 criteria 8 and 11)", { timeout: 120_000 }, () => {
  const HAVE_GLB = existsSync(join("assets", "private", "out", "city-pack.glb"));
  interface Gltf {
    nodes: { name?: string; mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
    meshes: { primitives: { attributes: { POSITION: number } }[] }[];
    accessors: { bufferView: number; byteOffset?: number; count: number }[];
    bufferViews: { byteOffset?: number; byteStride?: number }[];
  }
  const readGlb = (): { gltf: Gltf; bin: Buffer } => {
    const glb = readFileSync(join("assets", "private", "out", "city-pack.glb"));
    const jsonLen = glb.readUInt32LE(12);
    return { gltf: JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf, bin: glb.subarray(20 + jsonLen + 8) };
  };
  const localOf = (n: Gltf["nodes"][number]): Matrix4 => {
    if (n.matrix) return new Matrix4().fromArray(n.matrix);
    const t = n.translation ?? [0, 0, 0];
    const r = n.rotation ?? [0, 0, 0, 1];
    const sc = n.scale ?? [1, 1, 1];
    return new Matrix4().compose(new Vector3(t[0], t[1], t[2]), new Quaternion(r[0], r[1], r[2], r[3]), new Vector3(sc[0], sc[1], sc[2]));
  };
  /** Every vertex under the node `name`, each carried by the node transforms from its mesh up to and including the root's own (as `meshParts` draws them), and the number of primitives. */
  const verticesOf = (gltf: Gltf, bin: Buffer, name: string): { vs: Vector3[]; prims: number } => {
    const root = gltf.nodes.find((n) => n.name === name);
    expect(root, name).toBeDefined();
    const vs: Vector3[] = [];
    let prims = 0;
    const walk = (n: Gltf["nodes"][number], acc: Matrix4): void => {
      for (const prim of n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives : []) {
        prims++;
        const a = gltf.accessors[prim.attributes.POSITION]!;
        const bv = gltf.bufferViews[a.bufferView]!;
        const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
        for (let i = 0; i < a.count; i++) {
          const at = base + i * (bv.byteStride ?? 12);
          vs.push(new Vector3(bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8)).applyMatrix4(acc));
        }
      }
      for (const c of n.children ?? []) {
        const child = gltf.nodes[c]!;
        walk(child, new Matrix4().multiplyMatrices(acc, localOf(child)));
      }
    };
    walk(root!, localOf(root!));
    return { vs, prims };
  };
  const span = (vs: readonly Vector3[], axis: "x" | "y" | "z"): [number, number] => [Math.min(...vs.map((v) => v[axis])), Math.max(...vs.map((v) => v[axis]))];

  it.skipIf(!HAVE_GLB)("each of the seven keys' vertices, with the node transforms under its root applied, give the kit's bounds within 0.005 m, and the mast's foot is at MAST.axis within 0.01 m (skipped when the GLB is absent)", () => {
    const { gltf, bin } = readGlb();
    const bad: string[] = [];
    for (const key of SEVEN) {
      const { vs } = verticesOf(gltf, bin, shortOf(key));
      const want = boundsOf(key);
      for (const [n, v, axis] of [["w", want.w, "x"], ["h", want.h, "y"], ["d", want.d, "z"]] as const) {
        const r = span(vs, axis);
        if (Math.abs(v - (r[1] - r[0])) > 0.005) bad.push(`${key} ${n}: kit ${v}, GLB ${(r[1] - r[0]).toFixed(3)}`);
      }
    }
    expect(bad).toEqual([]);
    const mast = verticesOf(gltf, bin, shortOf(PLAN_TRAFFIC_KEYS.signalMast)).vs;
    const foot = mast.filter((v) => v.y < 0.1);
    const fx = span(foot, "x");
    const fz = span(foot, "z");
    expect(Math.abs((fx[0] + fx[1]) / 2 - MAST.axis.x)).toBeLessThan(0.01);
    expect(Math.abs((fz[0] + fz[1]) / 2 - MAST.axis.z)).toBeLessThan(0.01);
  });

  it.skipIf(!HAVE_GLB)("reports J's draw calls and the calls and triangles stage 9 adds on 6 x 6 seeds 1 and 3, one-way on, and holds the shared cap (skipped when the GLB is absent)", () => {
    const { gltf, bin } = readGlb();
    const manifest = JSON.parse(readFileSync(join("assets", "private", "out", "manifest.json"), "utf8")) as { packs: { pack: string; assets: { name: string; triangles: number }[] }[] };
    const triangles = new Map(manifest.packs.find((p) => p.pack === "city-pack")!.assets.map((a) => [a.name, a.triangles] as const));
    const prims = (key: CalibrationKey): number => verticesOf(gltf, bin, shortOf(key)).prims;
    for (const o of [DEFAULT, { seed: 3, way: "on" } as City]) {
      const plan = planOf(o);
      const dd = planDressDraws(plan);
      const pd = planPropDraws(plan);
      const td = planTrafficDraws(plan);
      const calls = (draws: readonly { placement: CityPlacement }[]): { perKey: Map<CalibrationKey, number>; n: number; tris: number } => {
        const per = new Map<CalibrationKey, number>();
        let n = 0;
        let tris = 0;
        for (const [key, pieces] of countByKey(draws)) {
          if (key === CODE_ESCAPE_KEY) continue;
          const p = prims(key);
          per.set(key, p);
          n += p;
          tris += (triangles.get(shortOf(key)) ?? 0) * pieces;
        }
        return { perKey: per, n, tris };
      };
      const s7 = calls(dd);
      const s8 = calls(pd);
      const s9 = calls(td);
      const g = planPieceDraws(buildingsOf(plan));
      const gd = planGroundDraws(facadesOf(plan), buildingsOf(plan));
      const before = g.reduce((n, p) => n + prims(p.placement.key), 0) + gd.reduce((n, p) => n + prims(p.placement.key), 0) + 1;
      const boxCall = dd.some((p) => (p.boxes?.length ?? 0) > 0) ? 1 : 0;
      expect(s8.n + s9.n, `${label(o)} stages 8 and 9 share the cap`).toBeLessThanOrEqual(FURN_DRAW_CALLS_MAX);
      expect(s7.n, label(o)).toBeLessThanOrEqual(DRESS_DRAW_CALLS_MAX);
      const kinds: Record<string, number> = {};
      for (const p of td) kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
      console.info(
        `TR2 draw calls, ${label(o)}: J's ${before + s7.n + boxCall + s8.n}; stage 9 adds ${s9.n} (${[...s9.perKey].map(([k, v]) => `${shortOf(k)} ${v}`).join(", ")}) -> ${before + s7.n + boxCall + s8.n + s9.n}; ` +
          `stages 8 and 9 share ${s8.n + s9.n} of ${FURN_DRAW_CALLS_MAX}; stage 9 adds ${s9.tris} triangles; pieces by kind ${JSON.stringify(kinds)} (${td.length})`,
      );
      expect(s9.n).toBeGreaterThanOrEqual(7);
    }
  });

  it("names, for 6 x 6 seeds 1 and 3 (one-way on), a street-camera address into one signal junction and one all-way stop from an approach, worked out from the layer", () => {
    const out: string[] = [];
    for (const seed of [1, 3]) {
      const plan = planOf({ seed, way: "on" });
      const streets = plan.layers.streets!;
      for (const control of ["signals", "allStop"] as const) {
        const j = plan.layers.traffic!.junctions.find((q) => q.control === control && streets.junctions.find((x) => x.id === q.junction)!.inner)!;
        expect(j, `seed ${seed} ${control}`).toBeDefined();
        const jun = streets.junctions.find((x) => x.id === j.junction)!;
        const centre = { i: Math.round(jun.cells.reduce((s, c) => s + c.i, 0) / jun.cells.length), j: Math.round(jun.cells.reduce((s, c) => s + c.j, 0) / jun.cells.length) };
        const inbound = j.approaches.find((a) => a.inbound && a.control !== "none")!;
        const into = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" }[inbound.arm];
        const pieces = trafficPieces(plan).filter((p) => p.host === j.junction).length;
        out.push(`seed ${seed} ${control === "signals" ? "signal junction" : "all-way stop"} ${j.junction} (${pieces} pieces): cam=street&at=${centre.i},${centre.j}&dir=${into}`);
        expect(planStreetPose(streets, { at: centre, dir: into as CitySide })).not.toBeNull();
      }
    }
    console.info(`TR2 street-camera addresses (?view=3d&city=plan&stage=assemble&seed=N):\n${out.join("\n")}`);
    expect(out).toHaveLength(4);
  });
});
