/**
 * The tile kit's drawing (ticket 055, section C): what `plan3d.ts` (the pipeline's city, `city=tiles`) and the tile sheet (`city=tiles&sheet=1`) draw tiles with. The old tile city that this file also drew
 * went in ticket 081 A1 (070 L2d).
 *
 * - `tileGroupOf` draws every cell: one `InstancedMesh` per City Pack key (and per sub-mesh of it), each instance at its cell centre, turned by the cell's yaw plus the key's
 *   `TILE_FRONTS` line, at `WORLD_PER_METRE` and never otherwise scaled. A cell whose role has no loaded piece is drawn in code at the same cell and level, in today's street,
 *   pavement and kerb colours (a flat quad for a road, a box from the carriageway to the pavement top for a pavement or a build-out, a pale strip for each kerb edge). No tile can be picked.
 *   Ticket 056 B: a `buildout` cell is drawn as a pavement from the plain straight, and each build-out tree is one of `SM_Env_Tree_01..03` (`buildoutTreePlan`) at y 0.
 *   Ticket 063 F, the kerb: the kerb runs as one line (`kerbline.ts`), and `tileGroupOf` draws what is on it: code-drawn strips at the pack's lip height and colour, in one InstancedMesh (`tile:kerb-strips`).
 * - Ticket 057 D, the block interiors: `interiorGroupOf` draws the interiors' surfaces, props, passage floors and gates the caller hands it.
 * - `buildSheetScene` lays each tile piece once on a grid, labelled, with an arrow along the front the city expects, so each piece's orientation can be confirmed by eye. It is shown
 *   from above on the city rig, every piece inside the insets, in a grid shaped to the window (labels keep a pixel size; see `sheetLayout`).
 * - `createCityRenderer3d` is the sheet's renderer, switched on in renderer.ts behind `import.meta.env.DEV`. It reads no address: renderer.ts passes the query string in.
 */

import { AmbientLight, BoxGeometry, BufferGeometry, Color, DirectionalLight, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, Quaternion, Scene, Vector3, type Material, type WebGLRenderer, } from "three";
import { calibrationKey, type AssetEntry, type CalibrationKey } from "../core";
import type { CityRect } from "../render/city";
import { stableHash } from "../render/city";
import { ZOOM_STEP, type Insets } from "../render/geometry";
import { WORLD_PER_METRE } from "./models";
import { meshParts, sharedTileModels, tileInput, type ModelSet } from "./models3d";
import { ELEVATION, FOV_DEG, KERB, PAVEMENT, STREET, YARD, scaleForPx } from "./kitunits";
import { addSurface, newLightOwners, setRendererMode } from "./lightrig";
import { LANE_PATCH, LANE_RIGHT, PAVEMENT_FLUSH, PAVEMENT_GRATE, SIDEWALK_WALK_M, TILE_M, type BuildoutTree, type TileCell, type TileYaw, type TileRole } from "./tilecity";
import { type KerbPlan } from "./kerbline";
import { GATE_COLOUR, INTERIOR_KEYS, INTERIOR_DRAW_CALLS_MAX, KERB_LIP_TOP_M, KERB_LIP_W_M, KERB_STRIP_COLOUR, PASSAGE_FLOOR_KEYS, PAVING_SLAB_COLOUR, STALL_DIVIDERS_X_M, STALL_DIVIDER_L_M, STALL_DIVIDER_W_M, STALL_LINES_LIFT_M, TILE_DRAW_CALLS_MAX, TILE_LEVELS, TILE_PATCH, TILE_PROPS, TILE_PROP_TURN, TILE_SHEET_EXTRA, TILE_SLOTS, TILE_TREES, gateParts, type GatePlan, passageFloorCells, sheetColumns, sheetLabel, sheetLayout, sheetLegend, tileFront, tileKeys, tileLevelY_m, type CityTilesRequest, type GroundRect, type InteriorItem, type SheetLayout, type SlotRole, } from "./tileslots";
import { createCaptionSprite, defaultTextSurface, type CaptionSprite, type TextSurfaceFactory } from "./text";
import type { MapRenderer3d } from "./renderer";

const S = WORLD_PER_METRE;
const UP = /* @__PURE__ */ new Vector3(0, 1, 0);

/** A decal (the pothole patch) lies this far (metres) above its lane's surface, so it does not fight it. */
export const PATCH_LIFT_M = 0.01;
/** The sheet's ground lies this far (metres) below the carriageway surface. */
const GROUND_BELOW_M = 0.02;

const roadLike = (role: TileRole): boolean => TILE_LEVELS[role] !== "pavement";

const noRay = (o: Object3D): void => {
  o.raycast = () => {};
};

// ---- one tile's matrix and level ----

/** A cell's footprint on the ground in metres, along world x then z: a two-cell piece is 10 m along its street. */
export function cellFootprint(cell: Pick<TileCell, "cells" | "yaw">): { w_m: number; d_m: number } {
  if (cell.cells === 1) return { w_m: TILE_M, d_m: TILE_M };
  const alongX = cell.yaw === 0 || cell.yaw === 180;
  return alongX ? { w_m: 2 * TILE_M, d_m: TILE_M } : { w_m: TILE_M, d_m: 2 * TILE_M };
}

/**
 * Where a piece's origin stands (metres): carriageway pieces at `-SIDEWALK_WALK_M`, a parking lot's surface at 0, and a sidewalk piece on the carriageway's level so its walking surface
 * (0.23 m up its own height, not the 0.30 m of its kerb lip) is at 0 (criterion 28). `key` picks the walk of a key that has its own (`TILE_WALK_M`).
 */
export function tileOriginY_m(role: SlotRole, key?: CalibrationKey): number {
  return tileLevelY_m(role, key);
}

const tmpP = /* @__PURE__ */ new Vector3();
const tmpQ = /* @__PURE__ */ new Quaternion();
const tmpS = /* @__PURE__ */ new Vector3();

/** The world matrix of a tile at its cell: centre x and z, `yM` metres up, yaw plus the key's turn (degrees), at `WORLD_PER_METRE` on every axis and no other scale. */
export function tileMatrix(cell: Pick<TileCell, "x_m" | "z_m" | "yaw">, yM: number, turnDeg: number, out: Matrix4 = new Matrix4()): Matrix4 {
  tmpQ.setFromAxisAngle(UP, ((cell.yaw + turnDeg) * Math.PI) / 180);
  return out.compose(tmpP.set(cell.x_m * S, yM * S, cell.z_m * S), tmpQ, tmpS.set(S, S, S));
}

/** The index into a role's keys a cell's variant picks. */
function variantIndex(cell: TileCell): number {
  if (cell.role === "lane") return cell.variant & LANE_RIGHT;
  if (cell.role === "pavement") return cell.variant & PAVEMENT_GRATE;
  // 063 A: a build-out is always the one plain straight (variant 0), so the sidewalk is one colour.
  return 0;
}

/** The role whose level a cell's piece stands at: a flush pavement cell drawn from the plain slab (063 F) stands at the slab's ground level (the walk), not at a sidewalk piece's. */
function levelRole(c: TileCell, key: CalibrationKey): SlotRole {
  return c.role === "pavement" && (c.variant & PAVEMENT_FLUSH) !== 0 && PASSAGE_FLOOR_KEYS.includes(key) ? "apron" : c.role;
}

/** Where one street tree stands and which piece and turn it has: the tree's point and the key and quarter turn the hash gave it. */
export interface TreePlace {
  x_m: number;
  z_m: number;
  key: CalibrationKey;
  /** Degrees about y: 0, 90, 180 or 270, so neighbouring trees do not look cloned. */
  yaw: TileYaw;
}

/**
 * The tree on each `city.buildoutTrees` entry: one of `TILE_TREES` and a quarter turn, each a hash of the city's seed and the tree's point (the same city gives the same trees every time, and
 * two trees of a street are not the same one repeated). Pure.
 */
export function buildoutTreePlan(trees: readonly BuildoutTree[], seed: number): TreePlace[] {
  return trees.map((t) => {
    const h = stableHash(`tiletree:${seed}:${t.x_m}:${t.z_m}`);
    return { x_m: t.x_m, z_m: t.z_m, key: TILE_TREES[h % TILE_TREES.length]!, yaw: ([0, 90, 180, 270] as const)[(h >>> 8) % 4]! };
  });
}

/** The pieces of `TILE_TREES` a loaded model set offers (the page loads them as furniture): roots and entries by key, empty when it has none. */
export function treeInput(set: Pick<ModelSet, "dress">): { entries: Map<CalibrationKey, AssetEntry>; roots: Map<CalibrationKey, Object3D> } {
  const entries = new Map<CalibrationKey, AssetEntry>();
  const roots = new Map<CalibrationKey, Object3D>();
  for (const m of set.dress ?? []) {
    const key = calibrationKey(m.pack, m.entry.name);
    if (!TILE_TREES.includes(key)) continue;
    entries.set(key, m.entry);
    roots.set(key, m.root);
  }
  return { entries, roots };
}

/**
 * The key that draws `cell` among the `active` ones: its variant's, else another of its role's, else null (drawn in code). A `paved` cell (an inlet's, `inletKeys`) is the plain paving slab (the interiors', `PASSAGE_FLOOR_KEYS`) when that
 * is active, and falls to its role's keys (the bare road) when it is not.
 */
export function tileKeyOf(cell: TileCell, active: ReadonlySet<CalibrationKey>, paved = false): CalibrationKey | null {
  // 063 F: a pavement cell with a build-out in front of it is flush with it: the plain slab at the walk, with no kerb and no gutter, and the code pavement box when the slab is absent. Never a sidewalk piece (it would bring its kerb).
  if (cell.role === "pavement" && (cell.variant & PAVEMENT_FLUSH) !== 0) return PASSAGE_FLOOR_KEYS.find((key) => active.has(key)) ?? null;
  if (paved) {
    const slab = PASSAGE_FLOOR_KEYS.find((key) => active.has(key));
    if (slab !== undefined) return slab;
  }
  const keys = TILE_SLOTS[cell.role];
  const want = keys[Math.min(variantIndex(cell), keys.length - 1)];
  if (want !== undefined && active.has(want)) return want;
  for (const key of keys) if (active.has(key)) return key;
  return null;
}

// ---- the tiles ----

export interface TileDraw {
  group: Group;
  /** Cells drawn from the pack and cells drawn in code: always `city.cells.length` together. */
  fromPack: number;
  codeDrawn: number;
  /** The kerb line's faces (063 F): each pack piece's own and each code strip. */
  kerb: KerbPlan;
  /** The InstancedMeshes in `group` (draw calls), pack and code together. */
  calls: number;
  /** Instances per pack key (a key a role lost to the draw-call cap, or that never loaded, is absent). */
  perKey: ReadonlyMap<CalibrationKey, number>;
  /** The code-drawn materials by surface key (`street`, `pavement`, `kerb`), for the light rig. */
  surfaces: ReadonlyMap<string, readonly Material[]>;
  /** Frees the instance buffers and the code-drawn geometry and materials (never a pack piece's geometry or textures). */
  dispose(): void;
}

/**
 * What `tileGroupOf` draws (ticket 070 E): the cells, the build-out trees and the seed that picks them, the keys it may use, the key a cell is drawn from among the active ones (null: in code), and the kerb line's faces
 * once the keys are known. `fronts` is the turn table (default `TILE_FRONTS`). `tileGroup` is this with a `TileCity`'s own; the pipeline's drawing (plan3d.ts) is this with its plan's.
 */
export interface TileGroupInput {
  cells: readonly TileCell[];
  buildoutTrees: readonly BuildoutTree[];
  seed: number;
  keys: readonly CalibrationKey[];
  keyOf(cell: TileCell, active: ReadonlySet<CalibrationKey>): CalibrationKey | null;
  kerb(keyOf: (c: TileCell) => CalibrationKey | null): KerbPlan;
  fronts?: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>>;
}

/** The body of `tileGroup`, on a `TileGroupInput` (see it, and `tileGroup`). */
export function tileGroupOf(city: TileGroupInput, roots: ReadonlyMap<CalibrationKey, Object3D>, entries: ReadonlyMap<CalibrationKey, AssetEntry>, maxCalls: number = TILE_DRAW_CALLS_MAX): TileDraw {
  const parts = new Map<CalibrationKey, { mesh: Mesh; local: Matrix4 }[]>();
  const active = new Set<CalibrationKey>();
  for (const key of city.keys) {
    const root = roots.get(key);
    if (!root || !entries.has(key)) continue;
    const found = meshParts(root);
    if (found.length === 0) continue;
    parts.set(key, found);
    active.add(key);
  }

  interface Plan {
    keyOf: (CalibrationKey | null)[];
    counts: Map<CalibrationKey, number>;
    patches: number;
    codeKinds: number;
    /** What the kerb line is drawn from: each pack piece's own face, and the code strips (flanks, returns, a fallback cell's). */
    kerb: KerbPlan;
    /** The build-out trees whose piece is in the pack: place and key (a tree whose own piece is missing takes another of the three, and none is drawn when none is there). */
    trees: TreePlace[];
  }
  const cellIndex = new Map<TileCell, number>(city.cells.map((c, i) => [c, i]));
  const planFor = (): Plan => {
    const keyOf = city.cells.map((c) => city.keyOf(c, active));
    const counts = new Map<CalibrationKey, number>();
    let quads = 0;
    let boxes = 0;
    let patches = 0;
    city.cells.forEach((c, i) => {
      const key = keyOf[i]!;
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      else if (roadLike(c.role)) quads++;
      else boxes++;
      if (c.role === "lane" && (c.variant & LANE_PATCH) !== 0 && active.has(TILE_PATCH)) patches++;
    });
    if (patches > 0) counts.set(TILE_PATCH, patches);
    // The build-out trees (056 B): a key's instances count with the tiles', so the draw-call cap covers them; with the fewest instances they are the first to go.
    const trees: TreePlace[] = [];
    for (const t of buildoutTreePlan(city.buildoutTrees, city.seed)) {
      const key = active.has(t.key) ? t.key : (TILE_TREES.find((k) => active.has(k)) ?? null);
      if (key === null) continue;
      trees.push({ ...t, key });
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const kerb = city.kerb((c) => keyOf[cellIndex.get(c)!] ?? null);
    const strips = kerb.faces.some((f) => f.kind === "code");
    return { keyOf, counts, patches, codeKinds: (quads > 0 ? 1 : 0) + (boxes > 0 ? 1 : 0) + (strips ? 1 : 0), kerb, trees };
  };
  let plan = planFor();
  for (;;) {
    let calls = plan.codeKinds;
    for (const [key, n] of plan.counts) if (n > 0) calls += parts.get(key)!.length;
    if (calls <= maxCalls || plan.counts.size === 0) break;
    // The key with the fewest cells goes (ties: the later key), so the roles with most cells keep the pack.
    let drop: CalibrationKey | null = null;
    for (const [key, n] of plan.counts) {
      if (drop === null || n < plan.counts.get(drop)! || (n === plan.counts.get(drop)! && key > drop)) drop = key;
    }
    active.delete(drop!);
    plan = planFor();
  }

  const group = new Group();
  group.name = "city-tiles";
  // The pack's geometry and textures are the page's cache: a scene's disposal leaves this group to `TileDraw.dispose`. It is also not a node's group (`furnitureInput` reads the scene's other groups as nodes).
  group.userData["sharedModel"] = true;
  noRay(group);
  const owned: { dispose(): void }[] = [];
  const instanced: InstancedMesh[] = [];
  const surfaces = newLightOwners();
  const m = new Matrix4();

  // The pack: one InstancedMesh per key and sub-mesh.
  const byKey = new Map<CalibrationKey, TileCell[]>();
  city.cells.forEach((c, i) => {
    const key = plan.keyOf[i];
    if (!key) return;
    const list = byKey.get(key);
    if (list) list.push(c);
    else byKey.set(key, [c]);
  });
  let fromPack = 0;
  const perKey = new Map<CalibrationKey, number>();
  for (const [key, list] of byKey) {
    perKey.set(key, list.length);
    fromPack += list.length;
    const turn = tileFront(key, city.fronts);
    for (const part of parts.get(key)!) {
      const im = new InstancedMesh(part.mesh.geometry, part.mesh.material, list.length);
      im.name = `tile:${key.slice(key.indexOf(":") + 1)}`;
      list.forEach((c, i) => im.setMatrixAt(i, tileMatrix(c, tileOriginY_m(levelRole(c, key), key), turn, m).multiply(part.local)));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      noRay(im);
      group.add(im);
      instanced.push(im);
    }
  }
  // The street trees of the build-outs: one InstancedMesh per tree key and sub-mesh, each instance at its point on the walk (y 0), turned a quarter turn by hash, at WORLD_PER_METRE.
  const treesByKey = new Map<CalibrationKey, TreePlace[]>();
  for (const t of plan.trees) {
    const list = treesByKey.get(t.key);
    if (list) list.push(t);
    else treesByKey.set(t.key, [t]);
  }
  for (const [key, list] of treesByKey) {
    perKey.set(key, list.length);
    for (const part of parts.get(key)!) {
      const im = new InstancedMesh(part.mesh.geometry, part.mesh.material, list.length);
      im.name = `tile:${key.slice(key.indexOf(":") + 1)}`;
      list.forEach((t, i) => im.setMatrixAt(i, tileMatrix({ x_m: t.x_m, z_m: t.z_m, yaw: t.yaw }, 0, 0, m).multiply(part.local)));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      noRay(im);
      group.add(im);
      instanced.push(im);
    }
  }
  if (plan.patches > 0) {
    const turn = tileFront(TILE_PATCH, city.fronts);
    const decals = city.cells.filter((c) => c.role === "lane" && (c.variant & LANE_PATCH) !== 0);
    for (const part of parts.get(TILE_PATCH)!) {
      const im = new InstancedMesh(part.mesh.geometry, part.mesh.material, decals.length);
      im.name = "tile:patch";
      decals.forEach((c, i) => im.setMatrixAt(i, tileMatrix(c, tileOriginY_m("lane") + PATCH_LIFT_M, turn, m).multiply(part.local)));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      noRay(im);
      group.add(im);
      instanced.push(im);
    }
  }

  // The code-drawn cells: roads as flat quads, pavements as boxes from the carriageway up to the walk, a pale strip on each pavement edge that meets a carriageway.
  const codeCells = city.cells.filter((_, i) => plan.keyOf[i] === null);
  const quads = codeCells.filter((c) => roadLike(c.role));
  const boxes = codeCells.filter((c) => !roadLike(c.role));
  const own = <T extends { dispose(): void }>(o: T): T => {
    owned.push(o);
    return o;
  };
  const q = new Quaternion();
  if (quads.length > 0) {
    const roadMat = own(new MeshStandardMaterial({ color: STREET, roughness: 1 }));
    addSurface(surfaces, "street", roadMat);
    const im = new InstancedMesh(own(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), roadMat, quads.length);
    im.name = "tile:code-road";
    quads.forEach((c, i) => {
      const f = cellFootprint(c);
      im.setMatrixAt(i, m.compose(tmpP.set(c.x_m * S, tileOriginY_m(c.role) * S, c.z_m * S), q, tmpS.set(f.w_m * S, 1, f.d_m * S)));
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    noRay(im);
    group.add(im);
    instanced.push(im);
  }
  if (boxes.length > 0) {
    const paveMat = own(new MeshStandardMaterial({ color: PAVEMENT, roughness: 1 }));
    addSurface(surfaces, "pavement", paveMat);
    const im = new InstancedMesh(own(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), paveMat, boxes.length);
    im.name = "tile:code-pavement";
    boxes.forEach((c, i) => {
      const f = cellFootprint(c);
      im.setMatrixAt(i, m.compose(tmpP.set(c.x_m * S, -SIDEWALK_WALK_M * S, c.z_m * S), q, tmpS.set(f.w_m * S, SIDEWALK_WALK_M * S, f.d_m * S)));
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    noRay(im);
    group.add(im);
    instanced.push(im);
  }
  // The kerb strips (063 F): the flanks of the build-outs, the returns of the inlets and a fallback strip for a pavement or build-out cell drawn in code, all on the kerb line (kerbline.ts), at the pack's lip height and colour. They are
  // not a cell's fallback (a city drawn wholly from the pack has them too), so the mesh is not named `tile:code-...`.
  const strips = kerbStrips(plan.kerb);
  if (strips.length > 0) {
    const kerbMat = own(new MeshStandardMaterial({ color: KERB_STRIP_COLOUR, roughness: 1 }));
    const im = new InstancedMesh(own(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), kerbMat, strips.length);
    im.name = "tile:kerb-strips";
    strips.forEach((s, i) => im.setMatrixAt(i, m.compose(tmpP.set(s.x, -SIDEWALK_WALK_M * S, s.z), q, tmpS.set(s.w, KERB_LIP_TOP_M * S, s.d))));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    noRay(im);
    group.add(im);
    instanced.push(im);
  }

  return {
    group,
    fromPack,
    codeDrawn: codeCells.length,
    kerb: plan.kerb,
    calls: instanced.length,
    perKey,
    surfaces: surfaces.materials,
    dispose() {
      for (const im of instanced) im.dispose();
      for (const o of owned) o.dispose();
      instanced.length = 0;
      owned.length = 0;
    },
  };
}

/** A code-drawn kerb strip: its centre (map units) and size (x, z). It stands from the carriageway (-`SIDEWALK_WALK_M`) up `KERB_LIP_TOP_M`, so its top is the pack's lip. */
export interface KerbStrip {
  x: number;
  z: number;
  w: number;
  d: number;
}

/**
 * The boxes of the plan's code-drawn faces (063 F): along each face, `KERB_LIP_W_M` wide on the walk side of it (a face is the strip's carriageway-side edge, so the strip lies behind the line, as the pack's lip does). A flank or a return
 * runs the length of its face. Pure.
 */
export function kerbStrips(plan: KerbPlan): KerbStrip[] {
  const out: KerbStrip[] = [];
  for (const f of plan.faces) {
    if (f.kind !== "code") continue;
    const dx = Math.abs(f.b.x - f.a.x);
    const dz = Math.abs(f.b.z - f.a.z);
    const alongX = dx >= dz;
    const length = alongX ? dx : dz;
    const cx = (f.a.x + f.b.x) / 2 + f.walk.x * (KERB_LIP_W_M / 2);
    const cz = (f.a.z + f.b.z) / 2 + f.walk.z * (KERB_LIP_W_M / 2);
    out.push({ x: cx * S, z: cz * S, w: (alongX ? length : KERB_LIP_W_M) * S, d: (alongX ? KERB_LIP_W_M : length) * S });
  }
  return out;
}

// ---- the block interiors (ticket 057 D) ----

/** One prop the interiors stand: what it is, its piece, its point (metres) and the turn the layout gave it (degrees: its front toward the path or the lane). */
export interface PropPlace {
  what: "tree" | "bench" | "bin";
  key: CalibrationKey;
  x_m: number;
  z_m: number;
  yaw: TileYaw;
}

/** The pieces of `TILE_PROPS` (the trees, the bench, the bins) a loaded model set offers: the page loads them as furniture, so they are in `dress`. Roots and entries by key, empty when it has none. */
export function propInput(set: Pick<ModelSet, "dress">): { entries: Map<CalibrationKey, AssetEntry>; roots: Map<CalibrationKey, Object3D> } {
  const entries = new Map<CalibrationKey, AssetEntry>();
  const roots = new Map<CalibrationKey, Object3D>();
  for (const m of set.dress ?? []) {
    const key = calibrationKey(m.pack, m.entry.name);
    if (!TILE_PROPS.includes(key)) continue;
    entries.set(key, m.entry);
    roots.set(key, m.root);
  }
  return { entries, roots };
}

export interface InteriorDraw {
  group: Group;
  /** The surface items (`interiorItems`) drawn from the pack and in code: always `interiorItems(city).length` together (a row of stalls is one item, and a floor, a gate and a prop is none). */
  fromPack: number;
  codeDrawn: number;
  /** The gated passages' floors and gates drawn (always in code), and the props stood from the pack (a tree, bench or bin whose piece is absent, or lost to the cap, is not drawn). */
  floors: number;
  gates: number;
  props: number;
  /** The InstancedMeshes in `group` (draw calls). */
  calls: number;
  /** Instances per pack key, tiles and props together. */
  perKey: ReadonlyMap<CalibrationKey, number>;
  /** The code-drawn materials by surface key (`street`, `kerb`, `grass`), for the light rig. The code-drawn pavement is the slab's own colour (`PAVING_SLAB_COLOUR`) and is not a surface key. */
  surfaces: ReadonlyMap<string, readonly Material[]>;
  dispose(): void;
}

/** The body of `interiorGroup` on the things it draws (ticket 070 E): the surface items, the props, the gates, the passage floors and the seed that turns the greens. See `interiorGroup`. */
export function interiorGroupOf(
  items: readonly InteriorItem[],
  props: readonly PropPlace[],
  gates: readonly GatePlan[],
  floors: readonly GroundRect[],
  seed: number,
  roots: ReadonlyMap<CalibrationKey, Object3D>,
  entries: ReadonlyMap<CalibrationKey, AssetEntry>,
  maxCalls: number = INTERIOR_DRAW_CALLS_MAX,
): InteriorDraw {
  const floorCells = floors.map(passageFloorCells);
  const parts = new Map<CalibrationKey, { mesh: Mesh; local: Matrix4 }[]>();
  const active = new Set<CalibrationKey>();
  const wanted = new Set<CalibrationKey>([...Object.values(INTERIOR_KEYS).flat(), ...TILE_PROPS]);
  for (const key of wanted) {
    const root = roots.get(key);
    if (!root || !entries.has(key)) continue;
    const found = meshParts(root);
    if (found.length === 0) continue;
    parts.set(key, found);
    active.add(key);
  }

  const keyOfItem = (it: InteriorItem): CalibrationKey | null => INTERIOR_KEYS[it.kind].find((key) => active.has(key)) ?? null;
  /** A tree whose own piece is missing takes another of the three; a bench or a bin has only its own. */
  const keyOfProp = (p: PropPlace): CalibrationKey | null => (active.has(p.key) ? p.key : p.what === "tree" ? (TILE_TREES.find((key) => active.has(key)) ?? null) : null);

  interface Plan {
    itemKey: (CalibrationKey | null)[];
    propKey: (CalibrationKey | null)[];
    counts: Map<CalibrationKey, number>;
    codeKinds: number;
    /** The pack's slab the passages' floors are laid from (a whole cell each), or null: then every floor is one code quad. */
    floorKey: CalibrationKey | null;
    /** The floors' rectangles drawn in code: the part cells (or the whole floors with no slab). */
    floorCode: readonly GroundRect[];
  }
  const planFor = (): Plan => {
    const itemKey = items.map(keyOfItem);
    const propKey = props.map(keyOfProp);
    const counts = new Map<CalibrationKey, number>();
    const bump = (key: CalibrationKey | null, n = 1): void => {
      if (key) counts.set(key, (counts.get(key) ?? 0) + n);
    };
    itemKey.forEach((key) => bump(key));
    propKey.forEach((key) => bump(key));
    const floorKey = PASSAGE_FLOOR_KEYS.find((key) => active.has(key)) ?? null;
    const floorCode = floorKey === null ? floors : floorCells.flatMap((c) => c.part);
    if (floorKey !== null) bump(floorKey, floorCells.reduce((n, c) => n + c.whole.length, 0));
    const code = (kinds: readonly InteriorItem["kind"][]): boolean => items.some((it, i) => itemKey[i] === null && kinds.includes(it.kind));
    const pavement = code(["strip", "apron", "path", "parkEdge", "inlet"]) || floorCode.length > 0;
    return { itemKey, propKey, counts, floorKey, floorCode, codeKinds: [pavement, code(["green"]), code(["bare"]), code(["stalls"]), gates.length > 0].filter(Boolean).length };
  };
  let plan = planFor();
  for (;;) {
    let calls = plan.codeKinds;
    for (const [key, n] of plan.counts) if (n > 0) calls += parts.get(key)!.length;
    if (calls <= maxCalls || plan.counts.size === 0) break;
    // The key with the fewest instances goes (ties: the later key), so the kinds with most instances keep the pack.
    let drop: CalibrationKey | null = null;
    for (const [key, n] of plan.counts) {
      if (drop === null || n < plan.counts.get(drop)! || (n === plan.counts.get(drop)! && key > drop)) drop = key;
    }
    active.delete(drop!);
    plan = planFor();
  }

  const group = new Group();
  group.name = "city-interior";
  // The pack's geometry and textures are the page's cache, as for the tiles: a scene's disposal leaves this group to `InteriorDraw.dispose`.
  group.userData["sharedModel"] = true;
  noRay(group);
  const owned: { dispose(): void }[] = [];
  const instanced: InstancedMesh[] = [];
  const surfaces = newLightOwners();
  const m = new Matrix4();
  const q = new Quaternion();
  const own = <T extends { dispose(): void }>(o: T): T => {
    owned.push(o);
    return o;
  };
  const add = (im: InstancedMesh, name: string): void => {
    im.name = name;
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    noRay(im);
    group.add(im);
    instanced.push(im);
  };
  const shortOf = (key: CalibrationKey): string => key.slice(key.indexOf(":") + 1);
  /** Green cells take a quarter turn by hash, so a lawn is not one tile repeated; every other item is turned as the layout says. */
  const yawOfItem = (it: InteriorItem): number => (it.kind === "green" ? ((stableHash(`grass:${seed}:${it.i}:${it.j}`) >>> 8) % 4) * 90 : it.yaw);

  // The pack: one InstancedMesh per key and sub-mesh, items and props together.
  type Place = { x_m: number; z_m: number; yaw: number; y_m: number; turn: number };
  const byKey = new Map<CalibrationKey, Place[]>();
  const put = (key: CalibrationKey, p: Place): void => {
    const list = byKey.get(key);
    if (list) list.push(p);
    else byKey.set(key, [p]);
  };
  let fromPack = 0;
  items.forEach((it, i) => {
    const key = plan.itemKey[i]!;
    if (!key) return;
    fromPack++;
    put(key, { x_m: it.x_m, z_m: it.z_m, yaw: yawOfItem(it), y_m: tileLevelY_m(it.role, key) + (it.kind === "stalls" ? STALL_LINES_LIFT_M : 0), turn: tileFront(key) });
  });
  let propsDrawn = 0;
  props.forEach((p, i) => {
    const key = plan.propKey[i];
    if (!key) return;
    propsDrawn++;
    put(key, { x_m: p.x_m, z_m: p.z_m, yaw: p.yaw, y_m: 0, turn: Object.prototype.hasOwnProperty.call(TILE_PROP_TURN, key) ? (TILE_PROP_TURN[key] ?? 0) : 0 });
  });
  // The passages' floors: one whole slab per whole 5 m cell of each floor's rectangle (no slab is scaled), at the apron's level; the part cells are code quads below.
  if (plan.floorKey !== null) {
    const y_m = tileLevelY_m("apron", plan.floorKey);
    for (const f of floorCells) for (const c of f.whole) put(plan.floorKey, { x_m: c.x_m, z_m: c.z_m, yaw: 0, y_m, turn: tileFront(plan.floorKey) });
  }
  const perKey = new Map<CalibrationKey, number>();
  for (const [key, list] of byKey) {
    perKey.set(key, list.length);
    for (const part of parts.get(key)!) {
      const im = new InstancedMesh(part.mesh.geometry, part.mesh.material, list.length);
      list.forEach((p, i) => im.setMatrixAt(i, tileMatrix({ x_m: p.x_m, z_m: p.z_m, yaw: p.yaw as TileYaw }, p.y_m, p.turn, m).multiply(part.local)));
      add(im, `interior:${shortOf(key)}`);
    }
  }

  // The code-drawn items: flat quads at the walk's level, one mesh per kind of surface; a row of stalls with no lines piece gets its dividers.
  const quad = (): PlaneGeometry => own(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const flat = (cells: { x_m: number; z_m: number; w_m: number; d_m: number }[], mat: MeshStandardMaterial, name: string): void => {
    if (cells.length === 0) return;
    const im = new InstancedMesh(quad(), mat, cells.length);
    cells.forEach((c, i) => im.setMatrixAt(i, m.compose(tmpP.set(c.x_m * S, 0, c.z_m * S), q.identity(), tmpS.set(c.w_m * S, 1, c.d_m * S))));
    add(im, name);
  };
  const cellRect = (it: InteriorItem): { x_m: number; z_m: number; w_m: number; d_m: number } => ({ x_m: it.x_m, z_m: it.z_m, w_m: TILE_M, d_m: TILE_M });
  const codeItems = (kinds: readonly InteriorItem["kind"][]): InteriorItem[] => items.filter((it, i) => plan.itemKey[i] === null && kinds.includes(it.kind));
  const pavementCells = [...codeItems(["strip", "apron", "path", "parkEdge", "inlet"]).map(cellRect), ...plan.floorCode];
  if (pavementCells.length > 0) {
    // The slab's own colour, and not the light rig's `pavement` surface (a pale daylight grey): a floor drawn in code reads the same as one laid from the slab (063 D).
    const mat = own(new MeshStandardMaterial({ color: PAVING_SLAB_COLOUR, roughness: 1 }));
    flat(pavementCells, mat, "interior:code-pavement");
  }
  const greens = codeItems(["green"]);
  if (greens.length > 0) {
    const mat = own(new MeshStandardMaterial({ color: YARD, roughness: 1 }));
    addSurface(surfaces, "grass", mat);
    flat(greens.map(cellRect), mat, "interior:code-grass");
  }
  const bares = codeItems(["bare"]);
  if (bares.length > 0) {
    const mat = own(new MeshStandardMaterial({ color: STREET, roughness: 1 }));
    addSurface(surfaces, "street", mat);
    flat(bares.map(cellRect), mat, "interior:code-bare");
  }
  const stalls = codeItems(["stalls"]);
  if (stalls.length > 0) {
    const mat = own(new MeshStandardMaterial({ color: KERB, roughness: 1 }));
    addSurface(surfaces, "kerb", mat);
    const im = new InstancedMesh(quad(), mat, stalls.length * STALL_DIVIDERS_X_M.length);
    let n = 0;
    for (const it of stalls) {
      const a = (it.yaw * Math.PI) / 180;
      for (const dx of STALL_DIVIDERS_X_M) {
        // The row's own x runs along the row: (cos yaw, -sin yaw) in the world.
        q.setFromAxisAngle(UP, a);
        im.setMatrixAt(n++, m.compose(tmpP.set((it.x_m + dx * Math.cos(a)) * S, STALL_LINES_LIFT_M * S, (it.z_m - dx * Math.sin(a)) * S), q, tmpS.set(STALL_DIVIDER_W_M * S, 1, STALL_DIVIDER_L_M * S)));
      }
    }
    add(im, "interior:code-stalls");
  }
  // The gates: a box each for the panel and the posts, in the gate's own frame (x along the passage, z through the wall line), standing on the walk.
  if (gates.length > 0) {
    const mat = own(new MeshStandardMaterial({ color: GATE_COLOUR, roughness: 0.9 }));
    const boxes = gates.flatMap((g) => gateParts(g).map((part) => ({ g, part })));
    const im = new InstancedMesh(own(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), mat, boxes.length);
    boxes.forEach(({ g, part }, i) => {
      const a = (g.yaw * Math.PI) / 180;
      q.setFromAxisAngle(UP, a);
      im.setMatrixAt(i, m.compose(tmpP.set((g.x_m + part.x_m * Math.cos(a)) * S, 0, (g.z_m - part.x_m * Math.sin(a)) * S), q, tmpS.set(part.w_m * S, part.h_m * S, part.d_m * S)));
    });
    add(im, "interior:code-gates");
  }

  return {
    group,
    fromPack,
    codeDrawn: items.length - fromPack,
    floors: floors.length,
    gates: gates.length,
    props: propsDrawn,
    calls: instanced.length,
    perKey,
    surfaces: surfaces.materials,
    dispose() {
      for (const im of instanced) im.dispose();
      for (const o of owned) o.dispose();
      instanced.length = 0;
      owned.length = 0;
    },
  };
}

// ---- the tile sheet ----

export interface SheetPieceRect {
  key: CalibrationKey;
  /** The piece's footprint on the ground, map units: its centre and its size along x and along z. */
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface SheetScene {
  scene: Scene;
  /** What the city rig frames (map units): the grid and a margin round it. The labels and the legend hang outside it, in the room `insetsPx` asks the rig for. */
  frame: CityRect;
  /** The css pixels the rig must keep clear on top of the page's own insets: at the top for the legend, at the bottom for the last row's labels, at each side for the outer columns' labels. */
  insetsPx: { top: number; bottom: number; left: number; right: number };
  layout: SheetLayout;
  /** Every piece's footprint, in `sheetPieces()` order. */
  rects: readonly SheetPieceRect[];
  /** Pieces whose root was found in the pack, and pieces that were not. */
  present: number;
  missing: number;
  /** One label per piece, under its piece, in the order of `sheetPieces()`, then the legend (last), above the grid. */
  labels: readonly CaptionSprite[];
  /** Size the labels to the canvas (they keep a fixed pixel size at any zoom). */
  setViewport(heightPx: number): void;
  dispose(): void;
}

const SHEET_ARROW = 0xffc247;
const SHEET_OUTLINE = 0xeef1f7;
export const SHEET_FONT_PX = 12;
/** Metres between a piece's near edge and its label. */
const SHEET_LABEL_GAP_M = 0.3;
/** Css pixels between a label and the edge it is kept clear of when the rig's insets are widened for it. */
const SHEET_ROOM_PX = 8;
/** A sheet piece no role draws sits at the level of the role it is nearest to: the plain corner with the sidewalks, the others with the road. */
const sheetRole = (roles: readonly SlotRole[], key: CalibrationKey): SlotRole => roles[0] ?? (key.includes("Sidewalk") ? "pavementCorner" : "lane");

/**
 * Every tile piece once, on a grid (`sheetLayout(aspect)`: four columns in a wide window, two in a tall one), standing on a plain ground the way the city stands it (a road piece
 * at the carriageway level, a sidewalk piece on it so its walk is at 0), each turned by its `TILE_FRONTS` line, with its own outline (so a piece the pack lacks still shows its place), a
 * yellow arrow along +z (toward the camera: the front the city expects) and a label under it. A corner piece has a second arrow along +x. The legend above the grid says what each kind of
 * piece must show on the arrow's side. The sheet's own lights are always on, in both light modes (ticket 060): it is the view that already reads well.
 */
export function buildSheetScene(
  roots: ReadonlyMap<CalibrationKey, Object3D>,
  entries: ReadonlyMap<CalibrationKey, AssetEntry>,
  opts: { surface?: TextSurfaceFactory; dpr?: number; aspect?: number } = {},
): SheetScene {
  const surface = opts.surface ?? defaultTextSurface;
  const dpr = opts.dpr ?? 1;
  const aspect = opts.aspect ?? 16 / 9;
  const scene = new Scene();
  scene.name = "tile-sheet";
  scene.background = new Color(0x2b3240);
  scene.add(new AmbientLight(0xffffff, 1.5));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(-8, 14, 22);
  scene.add(sun);

  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T): T => {
    owned.push(x);
    return x;
  };
  const layout = sheetLayout(aspect);
  const tile = TILE_M * S;
  const fm = layout.frame_m;
  const frame: CityRect = { minX: fm.minX * S, maxX: fm.maxX * S, minY: fm.minZ * S, maxY: fm.maxZ * S };

  const groundMat = own(new MeshStandardMaterial({ color: 0x3d4658, roughness: 1 }));
  const ground = new Mesh(own(new PlaneGeometry(frame.maxX - frame.minX + 6, frame.maxY - frame.minY + 6)), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((frame.minX + frame.maxX) / 2, -SIDEWALK_WALK_M * S - GROUND_BELOW_M * S, (frame.minY + frame.maxY) / 2);
  noRay(ground);
  scene.add(ground);

  const outlineMat = own(new MeshBasicMaterial({ color: SHEET_OUTLINE }));
  const arrowMat = own(new MeshBasicMaterial({ color: SHEET_ARROW, side: DoubleSide }));
  const shaftGeo = own(new BoxGeometry(0.06, 0.02, 0.42));
  const headGeo = own(new BufferGeometry());
  headGeo.setAttribute("position", new Float32BufferAttribute([0, 0, 0.2, -0.11, 0, 0, 0.11, 0, 0], 3));
  const arrow = (x: number, z: number, turn: number): Group => {
    const g = new Group();
    const shaft = new Mesh(shaftGeo, arrowMat);
    shaft.position.set(0, 0, -0.1);
    const head = new Mesh(headGeo, arrowMat);
    head.position.set(0, 0, 0.11);
    g.add(shaft, head);
    g.position.set(x, 0.03, z);
    g.rotation.y = turn;
    return g;
  };
  const outlineBox = (w: number, d: number, x: number, z: number): Mesh => {
    const mesh = new Mesh(own(new BoxGeometry(w, 0.02, d)), outlineMat);
    mesh.position.set(x, 0.01, z);
    return mesh;
  };

  const labels: CaptionSprite[] = [];
  /** A caption at (x, y, z): `side` "below" hangs it under the anchor, "above" grows it upward from it; both centre it on the anchor. */
  const caption = (lines: readonly string[], x: number, y: number, z: number, side: "below" | "above"): void => {
    const cs = createCaptionSprite(surface, SHEET_FONT_PX, dpr, false, 0);
    cs.sprite.center.set(0.5, side === "below" ? 1 : 0);
    cs.draw(lines, "text");
    cs.sprite.position.set(x, y, z);
    own(cs.sprite.material);
    noRay(cs.sprite);
    labels.push(cs);
    scene.add(cs.sprite);
  };

  const rects: SheetPieceRect[] = [];
  const pieceHave: { key: CalibrationKey; present: boolean; roles: readonly SlotRole[] }[] = [];
  let present = 0;
  for (const slot of layout.slots) {
    const p = slot.piece;
    const cx = slot.x_m * S;
    const cz = slot.z_m * S;
    const root = roots.get(p.key);
    const entry = entries.get(p.key);
    const have = root !== undefined && entry !== undefined && meshParts(root).length > 0;
    const w = p.cells * tile;
    rects.push({ key: p.key, x: cx, z: cz, w, d: tile });
    const t = 0.03;
    for (const [bw, bd, bx, bz] of [
      [w, t, 0, -tile / 2],
      [w, t, 0, tile / 2],
      [t, tile, -w / 2, 0],
      [t, tile, w / 2, 0],
    ] as const) {
      scene.add(outlineBox(bw, bd, cx + bx, cz + bz));
    }
    if (have) {
      present++;
      const wrap = new Group();
      wrap.name = `tile-piece:${p.key}`;
      wrap.position.set(cx, tileOriginY_m(sheetRole(p.roles, p.key), p.key) * S, cz);
      wrap.rotation.y = (tileFront(p.key) * Math.PI) / 180;
      wrap.scale.setScalar(S);
      const clone = root.clone(true);
      clone.traverse(noRay);
      wrap.add(clone);
      scene.add(wrap);
    }
    scene.add(arrow(cx, cz, 0));
    if (p.roles.includes("pavementCorner") || p.key === TILE_SHEET_EXTRA[0]) scene.add(arrow(cx, cz, Math.PI / 2));
    // The label hangs from the piece's near (+z) edge, centred on it: its name, or in a numbered sheet its number.
    pieceHave.push({ key: p.key, present: have, roles: p.roles });
    caption(layout.numbered ? [String(pieceHave.length)] : sheetLabel(p.key, have, undefined, p.roles), cx, 0, cz + tile / 2 + SHEET_LABEL_GAP_M * S, "below");
  }
  // The legend stands above the grid, centred over it, its text growing upward from the frame's top edge (into the room the rig keeps clear for it).
  caption(sheetLegend(layout.numbered, pieceHave), ((fm.minX + fm.maxX) / 2) * S, 0, fm.minZ * S, "above");
  const pieceLabels = labels.slice(0, layout.slots.length);
  const side = Math.max(...pieceLabels.map((l) => l.sprite.userData["cssW"] as number)) / 2 + SHEET_ROOM_PX;
  const insetsPx = { top: (labels[labels.length - 1]!.sprite.userData["cssH"] as number) + SHEET_ROOM_PX, bottom: Math.max(...pieceLabels.map((l) => l.sprite.userData["cssH"] as number)) + SHEET_ROOM_PX, left: side, right: side };

  return {
    scene,
    frame,
    insetsPx,
    layout,
    rects,
    present,
    missing: layout.slots.length - present,
    labels,
    setViewport(heightPx) {
      const unit = scaleForPx(1, heightPx, FOV_DEG);
      for (const cs of labels) cs.setUnit(unit);
    },
    dispose() {
      for (const x of owned) x.dispose();
      owned.length = 0;
    },
  };
}

// ---- the overhead camera ----

const SIN_E = Math.sin(ELEVATION);
const COS_E = Math.cos(ELEVATION);
/** The city is framed inside the free area less this fraction of it on each side. */
const CITY_FIT_PAD = 0.04;
/** The framing includes the roofline: the tallest stack is about 33 m (6 map units). */
const CITY_FIT_TOP = 6;
/** The closest the camera dollies in, as a fraction of the fitting distance, and the furthest it backs off. */
const CITY_ZOOM_IN = 0.06;
const CITY_ZOOM_OUT = 1.6;
/**
 * The camera's near plane is this fraction of its distance from the target (never under 0.1). The depth buffer's resolution at distance d is about d squared over (near x 2^24), so a near
 * plane at the old 0.1 left the overhead view ~0.006 world units (3 cm) of depth resolution at 100 units, and the lot lines, 1 to 3 cm over the lot surface, flickered against it (criterion 31).
 * At a tenth of the distance the resolution is 0.0001 units (about 0.5 mm): the 1 cm separations hold. Nothing stands within a tenth of the distance of the camera (the tallest roof is 6 units).
 */
export const CITY_NEAR_FRACTION = 0.1;
export interface CityRig {
  camera: PerspectiveCamera;
  resize(width: number, height: number, insets?: Insets): void;
  getPan(): { x: number; y: number };
  setPan(x: number, y: number): { x: number; y: number };
  resetView(): void;
  getScale(): number;
  zoomStep(dir: 1 | -1): number;
  centreOn(x: number, z: number): { x: number; y: number };
}

/**
 * The play camera's pose (a tilted camera from the south: screen right is +x, screen down is +z) over a city rectangle instead of a puzzle: it opens framing the whole city,
 * pans over it and dollies in and out. The gallery's rig looks along a line from 15 degrees up and pans along x only, which cannot judge a street grid from above. The sheet is framed by it too
 * (`rigOpts.fitTop` 0: nothing on the sheet stands tall).
 */
export function createCityRig(frame: CityRect, width = 1280, height = 720, startInsets?: Insets, rigOpts: { fitTop?: number } = {}): CityRig {
  const fitTop = rigOpts.fitTop ?? CITY_FIT_TOP;
  const camera = new PerspectiveCamera(FOV_DEG, width / height, 0.1, 2000);
  const size = { width, height };
  let insets: Insets = { ...(startInsets ?? {}) };
  const baseX = (frame.minX + frame.maxX) / 2;
  const baseZ = (frame.minY + frame.maxY) / 2;
  let tx = baseX;
  let tz = baseZ;
  let dist = 20;
  let fitDist = 20;
  const target = new Vector3();
  const probe = new Vector3();
  const tanHalf = Math.tan((FOV_DEG * Math.PI) / 360);
  const scale = (): number => size.height / 2 / (tanHalf * dist);

  function apply(): void {
    target.set(tx, 0, tz);
    camera.position.set(tx, dist * SIN_E, tz + dist * COS_E);
    camera.lookAt(target);
    camera.near = Math.max(0.1, dist * CITY_NEAR_FRACTION);
    camera.aspect = size.width / size.height;
    const shift = ((insets.top ?? 0) - (insets.bottom ?? 0)) / 2;
    const side = ((insets.left ?? 0) - (insets.right ?? 0)) / 2;
    camera.setViewOffset(size.width, size.height, -side, -shift, size.width, size.height);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }
  function fits(): boolean {
    const freeW = size.width - (insets.left ?? 0) - (insets.right ?? 0);
    const freeH = size.height - (insets.top ?? 0) - (insets.bottom ?? 0);
    const left = (insets.left ?? 0) + freeW * CITY_FIT_PAD;
    const right = size.width - (insets.right ?? 0) - freeW * CITY_FIT_PAD;
    const top = (insets.top ?? 0) + freeH * CITY_FIT_PAD;
    const bottom = size.height - (insets.bottom ?? 0) - freeH * CITY_FIT_PAD;
    for (const x of [frame.minX, frame.maxX]) {
      for (const z of [frame.minY, frame.maxY]) {
        for (const y of [0, fitTop]) {
          probe.set(x, y, z).project(camera);
          const px = ((probe.x + 1) / 2) * size.width;
          const py = ((1 - probe.y) / 2) * size.height;
          if (px < left || px > right || py < top || py > bottom) return false;
        }
      }
    }
    return true;
  }
  function fit(): void {
    tx = baseX;
    tz = baseZ;
    let lo = 3;
    let hi = 3000;
    for (let i = 0; i < 32; i++) {
      dist = (lo + hi) / 2;
      apply();
      if (fits()) hi = dist;
      else lo = dist;
    }
    dist = hi;
    fitDist = hi;
    apply();
  }
  const clampT = (): void => {
    tx = Math.min(Math.max(tx, frame.minX), frame.maxX);
    tz = Math.min(Math.max(tz, frame.minY), frame.maxY);
  };
  const getPan = (): { x: number; y: number } => ({ x: -(tx - baseX) * scale(), y: -(tz - baseZ) * scale() * SIN_E });
  fit();
  return {
    camera,
    resize(w, h, next) {
      size.width = Math.max(w, 1);
      size.height = Math.max(h, 1);
      if (next) insets = { ...next };
      fit();
    },
    getPan,
    setPan(x, y) {
      const s = scale();
      tx = baseX - x / s;
      tz = baseZ - y / (s * SIN_E);
      clampT();
      apply();
      return getPan();
    },
    resetView: fit,
    getScale: scale,
    zoomStep(dir) {
      const next = dir === 1 ? dist / ZOOM_STEP : dist * ZOOM_STEP;
      dist = Math.min(Math.max(next, fitDist * CITY_ZOOM_IN), fitDist * CITY_ZOOM_OUT);
      apply();
      return scale();
    },
    centreOn(x, z) {
      tx = x;
      tz = z;
      clampT();
      apply();
      return getPan();
    },
  };
}

// ---- the renderer ----

export interface CityRendererOptions {
  insets?: Insets | undefined;
  dpr: number;
  /** The page's query string; renderer.ts reads the address and passes it in. */
  search: string;
  /** The models to load once the view is up (default: the page's shared tile load). A test passes its own so nothing is fetched. */
  load?: () => Promise<ModelSet>;
  /** The sheet's text surface (default: the browser's; a test passes the stub). */
  surface?: TextSurfaceFactory;
}

/** The rig's insets for a sheet: the page's own, widened for the legend at the top and the labels at the bottom and sides. */
export function sheetRigInsets(base: Insets, sheet: Pick<SheetScene, "insetsPx">): Insets {
  const e = sheet.insetsPx;
  return { ...base, top: (base.top ?? 0) + e.top, bottom: (base.bottom ?? 0) + e.bottom, left: (base.left ?? 0) + e.left, right: (base.right ?? 0) + e.right };
}

/** The sheet's fit ignores the roofline the city's fit allows for: nothing on it stands taller than a label's anchor. */
const SHEET_FIT_TOP = 0.3;

/**
 * The 3D view's tile sheet (dev only, `city=tiles&sheet=1`): the same interface as the town's renderer, so play and ui are unchanged. The puzzle, the state, the hover and the Relight it is handed
 * are ignored; nothing in the scene can be picked (`hitTest` is null). The sheet is shown from above on the city rig, lit by its own lights. The models load once the view is up; until they do (and if they never do) every
 * tile is code-drawn. (The old tile city that shared this renderer went in ticket 081 A1.)
 */
export function createCityRenderer3d(gl: WebGLRenderer, canvas: HTMLCanvasElement, _req: CityTilesRequest, opts: CityRendererOptions): MapRenderer3d {
  const w0 = Math.max(canvas.clientWidth, 1);
  const h0 = Math.max(canvas.clientHeight, 1);
  let insets: Insets = { ...(opts.insets ?? {}) };
  let disposed = false;

  let rig: CityRig;
  let sheet: SheetScene | null = null;
  let tileRoots: ReadonlyMap<CalibrationKey, Object3D> = new Map();
  let tileEntries: ReadonlyMap<CalibrationKey, AssetEntry> = new Map();

  /** The sheet for a window of this size, on a rig of its own (the grid's columns follow the window's shape, so a window of another shape needs another grid). */
  const makeSheet = (w: number, h: number): void => {
    const next = buildSheetScene(tileRoots, tileEntries, { dpr: opts.dpr, aspect: w / h, ...(opts.surface ? { surface: opts.surface } : {}) });
    sheet?.dispose();
    sheet = next;
    rig = createCityRig(next.frame, w, h, sheetRigInsets(insets, next), { fitTop: SHEET_FIT_TOP });
  };

  // The sheet has its own lights: a renderer left in day's tone mapping goes back to none for it.
  setRendererMode(gl, "night");
  makeSheet(w0, h0);

  function sizeLabels(): void {
    sheet?.setViewport(Math.max(canvas.clientHeight, 1));
  }
  function resize(): void {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    gl.setPixelRatio(opts.dpr);
    gl.setSize(w, h, false);
    if (sheet && sheetColumns(w / h) !== sheet.layout.cols) makeSheet(w, h);
    else rig.resize(w, h, sheet ? sheetRigInsets(insets, sheet) : insets);
    sizeLabels();
  }
  resize();

  // The models: one load for the page, then the pieces swap in. A failure (no City Pack, no manifest) leaves every tile code-drawn and costs one line.
  const load = opts.load ?? ((): Promise<ModelSet> => sharedTileModels(tileKeys()));
  void load()
    .then((set) => {
      if (disposed) return;
      const input = tileInput(set);
      const props = propInput(set);
      tileRoots = new Map<CalibrationKey, Object3D>([...(input?.roots ?? []), ...props.roots]);
      tileEntries = new Map<CalibrationKey, AssetEntry>([...(input?.entries ?? []), ...props.entries]);
      makeSheet(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1));
      sizeLabels();
      console.info(`tile sheet: ${sheet!.present} of ${sheet!.present + sheet!.missing} pieces are in the pack`);
    })
    .catch((e: unknown) => {
      console.info(`3D models: not applied (${e instanceof Error ? e.message : String(e)}).`);
    });

  // Left-drag pans (a touch drag too); the arrows, right-drag and wheel are play's.
  let drag: { id: number; startX: number; startY: number; startPan: { x: number; y: number } } | null = null;
  const onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, startPan: rig.getPan() };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured; the drag still works inside the canvas.
    }
  };
  const onMove = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    rig.setPan(drag.startPan.x + (e.clientX - drag.startX), drag.startPan.y + (e.clientY - drag.startY));
  };
  const onUp = (e: PointerEvent): void => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  const touchAction = canvas.style.touchAction;
  canvas.style.touchAction = "none";

  const play: MapRenderer3d = {
    draw() {
      gl.render(sheet!.scene, rig.camera);
    },
    hitTest: () => null,
    resize,
    setInsets(next) {
      insets = { ...next };
      rig.resize(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), sheet ? sheetRigInsets(insets, sheet) : insets);
      sizeLabels();
    },
    notify() {},
    setBlockers() {},
    placeAt: () => null,
    getPan: () => rig.getPan(),
    setPan: (x, y) => rig.setPan(x, y),
    resetView() {
      rig.resetView();
      sizeLabels();
    },
    getScale: () => rig.getScale(),
    zoomStep: (dir) => rig.zoomStep(dir),
    fitWhole() {
      rig.resetView();
      sizeLabels();
    },
    centreOn: () => rig.getPan(),
    dispose() {
      disposed = true;
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.style.touchAction = touchAction;
      setRendererMode(gl, "night");
      sheet?.dispose();
    },
  };
  return play;
}
