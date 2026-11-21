/**
 * Ticket 070, section E: the plan drawn in 3D (`plan3d.ts`, the two entries split out of `tilecity3d.ts`, the routing in `renderer.ts`). No WebGL: every GLB is a fake group (a one-box mesh per key). The 20 named runs
 * (6 x 6 seeds 1 to 10, one-way off and on) are built once, through a module-level cache. `city-pack.glb` is read only inside the `it` that says so, which skips when it is absent; no timer, no path but forward slashes.
 * HEAVY: 120 s.
 */

import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Box3, Frustum, Matrix4, PerspectiveCamera, BoxGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Quaternion, Scene, Texture, Vector3, type Object3D, type WebGLRenderer } from "three";
import type { AssetEntry, CalibrationKey, CityBuildingsLayer, CityKerbPath, CityMassLayer, CityPlan, CityPlacement, CityPlanRun, CitySide } from "../core";
import { stableHash } from "../render/city";
import { digestOf, runCity } from "../city/pipeline";
import type { CityStageDef } from "../city/pipeline/types";
import { buildingsStage } from "../city/buildings/stage";
import { edgeStage } from "../city/edge/stage";
import { landStage } from "../city/land/stage";
import { massStage } from "../city/mass/stage";
import { streetsStageWith } from "../city/streets/stage";
import { KERB_GAP_MAX_M, KERB_HEIGHT_TOL_M, KERB_TOL_M, type KerbFace, type KerbPlan, type Mp } from "./kerbline";
import {
  PLAN_ARROW,
  PLAN_FRONTS,
  PLAN_LINES,
  PlanStopError,
  planInput,
  planPieceDraws,
  type PlanDraw,
  type PlanPieceDraw,
  arrowYaw,
  createPlanAssembleRenderer3d,
  kerbSegFaces,
  massInteriorItems,
  plan3dGroups,
  planAssembleRequested,
  planCells,
  planFailureText,
  planKerbPlan,
  planKeyOf,
  planKeys,
  planStreetPose,
} from "./plan3d";
import { NO_MODELS, allStackKeys, type LoadedModel, type ModelSet } from "./models3d";
import { tileCity, TILE_M, type TileCell } from "./tilecity";
import { interiorGroup, tileGroup } from "./tilecity3d";
import { INTERIOR_DRAW_CALLS_MAX, INTERIOR_KEYS, KERB_INSET_M, KERB_LIP_TOP_M, PASSAGE_FLOOR_KEYS, TILE_DRAW_CALLS_MAX, TILE_FRONTS, TILE_PROPS, TILE_SLOTS, TILE_TREES, tileKeys } from "./tileslots";
import { CITY_GROUND_VARIANT } from "../core";

// ---- the 20 named runs ----

interface City {
  readonly seed: number;
  readonly way: "on" | "off";
}
const NAMED: City[] = [];
for (const way of ["on", "off"] as const) for (let seed = 1; seed <= 10; seed++) NAMED.push({ seed, way });
const label = (o: City): string => `6 x 6 seed ${o.seed} one-way ${o.way}`;
const offStages = (): CityStageDef[] => [streetsStageWith(0) as unknown as CityStageDef, landStage as unknown as CityStageDef, massStage as unknown as CityStageDef, edgeStage as unknown as CityStageDef, buildingsStage as unknown as CityStageDef];
const cache = new Map<string, CityPlanRun>();
function planOf(o: City): CityPlan {
  const k = `${o.seed}:${o.way}`;
  if (!cache.has(k)) {
    const opts = { blocksX: 6, blocksZ: 6, seed: o.seed };
    cache.set(k, o.way === "on" ? runCity(opts, "buildings") : runCity(opts, "buildings", offStages()));
  }
  const r = cache.get(k)!;
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
    expect(planAssembleRequested("?city=plan&stage=assemble")).toEqual({ blocksX: 6, blocksZ: 6, seed: 1, street: false, at: null, dir: null });
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
  it("puts every face on its seg within KERB_TOL_M and leaves no chain or dip seg uncovered for over KERB_GAP_MAX_M, drawn in code and from the pack", () => {
    for (const o of NAMED) {
      const plan = planOf(o);
      const kerb = plan.layers.edge!.kerb!;
      const set = planCells(plan.layers.streets!, plan.layers.edge!.ground!);
      expect(kerb.length, label(o)).toBeGreaterThan(0);
      expect(problems(kerb, planKerbPlan(kerb, set.cells, () => null)), `${label(o)}, in code`).toEqual([]);
      expect(problems(kerb, planKerbPlan(kerb, set.cells, (c) => planKeyOf(c, ACTIVE, set))), `${label(o)}, from the pack`).toEqual([]);
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
/** A small group per stack key, one mesh each, whose material's map is the base atlas. `lack` leaves keys out. */
const stackRoots = (lack: readonly CalibrationKey[] = []): Map<CalibrationKey, Object3D> => new Map(allStackKeys().filter((k) => !lack.includes(k)).map((k) => [k, stubRoot(k)] as const));
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
function expectPlaced(d: PlanDraw, label: string): void {
  d.group.updateMatrixWorld(true);
  const byBuilding = new Map<string, PlanPieceDraw[]>();
  for (const p of d.buildings.draws) byBuilding.set(p.building, [...(byBuilding.get(p.building) ?? []), p]);
  let wrappers = 0;
  for (const g of d.buildings.groups) {
    const id = g.name.slice("building:".length);
    const pieces = byBuilding.get(id) ?? [];
    const ws = wrappersOf(g);
    wrappers += ws.length;
    expect(ws, `${label} ${id}`).toHaveLength(pieces.length);
    ws.forEach((w, n) => {
      const pl = pieces[n]!.placement;
      expect(w.name, `${label} ${id}`).toBe(`piece:${pl.key}`);
      const want = new Matrix4().compose(new Vector3(pl.x_m * 0.18, pl.y_m * 0.18, pl.z_m * 0.18), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (pl.yaw_deg * Math.PI) / 180), new Vector3(0.18, 0.18, 0.18));
      w.matrixWorld.elements.forEach((e, k) => expect(e, `${label} ${id} ${pl.key} [${k}]`).toBeCloseTo(want.elements[k]!, 9));
      expect(w.children, `${label} ${id}`).toHaveLength(1);
    });
  }
  expect(wrappers, label).toBe(d.buildings.draws.length);
}

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

  it("with empty roots clones no piece and draws one grey box per column at its full height; with one root missing only the columns that use it fall back", () => {
    const plan = planOf(DEFAULT);
    const layer = buildingsOf(plan);
    const columns = layer.columns!;
    const heightOf = (d: PlanDraw, n: number): { y: number; h: number } => {
      const m = new Matrix4();
      d.grey.mesh.getMatrixAt(n, m);
      const p = new Vector3();
      const s = new Vector3();
      m.decompose(p, new Quaternion(), s);
      return { y: p.y, h: s.y };
    };
    const e = plan3dGroups(plan, none.roots, none.entries);
    expect(e.buildings.pieces).toBe(0);
    expect(e.buildings.groups.every((g) => g.children.length === 0)).toBe(true);
    expect(e.grey.count).toBe(columns.length);
    expect(e.grey.mesh.count).toBe(columns.length);
    expect(e.grey.fallback).toBe(columns.length);
    columns.forEach((c, n) => {
      const { y, h } = heightOf(e, n);
      expect(y).toBeCloseTo(0, 5);
      expect(h, `${c.i},${c.j}`).toBeCloseTo(c.pieces.find((p) => p.role === "roof")!.placement.y_m * 0.18, 5);
    });
    e.dispose();

    const full = plan3dGroups(plan, stackRoots(), none.entries);
    expect(full.grey.fallback).toBe(0);
    columns.forEach((c, n) => {
      const { y, h } = heightOf(full, n);
      expect(y).toBeCloseTo(c.ground.y_m * 0.18, 5);
      expect(h, `${c.i},${c.j}`).toBeCloseTo((c.ground.top_m - c.ground.y_m) * 0.18, 5);
    });
    full.dispose();

    const count = new Map<CalibrationKey, number>();
    for (const c of columns) for (const k of new Set(c.pieces.map((p) => p.placement.key))) count.set(k, (count.get(k) ?? 0) + 1);
    const [lack] = [...count.entries()].sort((a, b) => b[1] - a[1])[0]!;
    const part = plan3dGroups(plan, stackRoots([lack]), none.entries);
    const uses = columns.filter((c) => c.pieces.some((p) => p.placement.key === lack));
    expect(uses.length).toBeGreaterThan(0);
    expect(uses.length).toBeLessThan(columns.length);
    expect(part.grey.fallback).toBe(uses.length);
    expect(part.buildings.pieces).toBe(columns.filter((c) => !uses.includes(c)).reduce((n, c) => n + c.pieces.length, 0));
    columns.forEach((c, n) => {
      const { h } = heightOf(part, n);
      if (uses.includes(c)) expect(h).toBeCloseTo(c.pieces.find((p) => p.role === "roof")!.placement.y_m * 0.18, 5);
      else expect(h).toBeCloseTo(c.ground.top_m * 0.18, 5);
    });
    part.dispose();
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
  it("draws only, lists every piece exactly once with its building's colourway, and gives every column one grey instance and every Ls' column its own pieces", () => {
    let ls = 0;
    for (const o of NAMED) {
      const plan = planOf(o);
      const layers = plan.layers;
      const digests = (): Record<string, string> => ({ streets: digestOf(layers.streets), land: digestOf(layers.land), mass: digestOf(layers.mass), edge: digestOf(layers.edge), buildings: digestOf(layers.buildings) });
      const before = digests();
      expect(before, label(o)).toEqual({ streets: plan.digests.streets, land: plan.digests.land, mass: plan.digests.mass, edge: plan.digests.edge, buildings: plan.digests.buildings });
      const d = plan3dGroups(plan, none.roots, none.entries);
      expect(digests(), `${label(o)}: no layer changed`).toEqual(before);
      const layer = buildingsOf(plan);
      expect(listedOnce(layer, d.buildings.draws), label(o)).toBe(true);
      const way = new Map(layer.buildings.map((b) => [b.id, b.colourway] as const));
      for (const p of d.buildings.draws) expect(p.colourway, `${label(o)} ${p.building}`).toBe(way.get(p.building));
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
    }
    expect(ls).toBeGreaterThan(0);
  });

  it("builds the full group with stub roots on the default city and the four pin cities: one wrapper per listed piece, each at its placement", () => {
    const roots = stackRoots();
    for (const o of [DEFAULT, ...PINS]) {
      const d = plan3dGroups(planOf(o), roots, none.entries, LOADED_WAYS);
      expect(d.buildings.pieces, label(o)).toBe(d.buildings.draws.length);
      expectPlaced(d, label(o));
      d.dispose();
    }
  });

  it("fails the exactly-once check for a draw list with one piece dropped, and with one piece listed twice", () => {
    const layer = buildingsOf(planOf(DEFAULT));
    const draws = planPieceDraws(layer);
    expect(listedOnce(layer, draws)).toBe(true);
    expect(listedOnce(layer, draws.slice(1))).toBe(false);
    expect(listedOnce(layer, [...draws, draws[5]!])).toBe(false);
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
