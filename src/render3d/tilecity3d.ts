/**
 * The tile city, drawn (ticket 055, section C; dev only: `/?puzzle=<any>&view=3d&city=tiles`). `tilecity.ts` lays the cells; this file turns them into a scene.
 *
 * - `tileGroup` draws every cell: one `InstancedMesh` per City Pack key (and per sub-mesh of it), each instance at its cell centre, turned by the cell's yaw plus the key's
 *   `TILE_FRONTS` line, at `WORLD_PER_METRE` and never otherwise scaled. A cell whose role has no loaded piece is drawn in code at the same cell and level, in today's street,
 *   pavement and kerb colours (a flat quad for a road, a box from the carriageway to the pavement top for a pavement, a pale strip for each kerb edge). No tile can be picked.
 * - `buildCityScene` is a puzzle-free `SceneBundle` (no wires, places, poles or captions) over the tile city's `Town`: the ground, the yards, the placeholder buildings on its lots,
 *   and the tiles. `applyModels` runs on it unchanged, so stacks, dressing, furniture and colourways stand as on a ladder map.
 * - `buildSheetScene` lays each tile piece once on a grid, labelled, with an arrow along the front the city expects, so each piece's orientation can be confirmed by eye. It is shown
 *   from above on the city rig, every piece inside the insets, in a grid shaped to the window (labels keep a pixel size; see `sheetLayout`).
 * - `createCityRenderer3d` is the renderer for both, switched on in renderer.ts behind `import.meta.env.DEV`. It reads no address: renderer.ts passes the query string in. The city and
 *   the street camera open in day (ticket 060: a testing daylight, `light=night` for the game's night; the light rig owns the lights) and a key and a button flip the mode; the sheet
 *   keeps its own lights. `cityApplyOptions` is what the models are applied with (keep-outs, bay meters, the walk's furniture level).
 */

import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector3,
  type Material,
  type WebGLRenderer,
} from "three";
import type { AssetEntry, CalibrationKey } from "../core";
import type { CityRect } from "../render/city";
import { ZOOM_STEP, type Insets } from "../render/geometry";
import { ELEVATION, FOV_DEG } from "./camera";
import { scaleForPx } from "./captions";
import { WORLD_PER_METRE, atFront } from "./models";
import { applyModels, meshParts, sharedTileModels, tileInput, type AppliedModels, type ApplyOptions, type FurnitureLevels, type ModelSet } from "./models3d";
import { KERB_H, LOT_TYPE_NAMES, STOREY_M, type Lot, type LotType } from "./town";
import { ROOF_SHADE, TINTS, pickPlaceholders } from "./placeholders";
import { KERB, PAVEMENT, STREET, GROUND, YARD, KERB_W, type SceneBundle } from "./scene";
import { createStreetView, streetCamRequested, streetMode, type StreetView } from "./streetcam";
import { applyLightMode, addSurface, newLightOwners, sceneLightMode, setRendererMode } from "./lightrig";
import { lightModeFor, type LightModeId } from "./lighting";
import { createDayToggle, pageDayToggleHost, type DayToggle, type DayToggleHost } from "./daytoggle";
import { LANE_PATCH, LANE_RIGHT, SIDEWALK_WALK_M, TILE_M, bayMeters, tileCity, tileKeepouts, type TileCell, type TileCity, type TileRole } from "./tilecity";
import { TILE_DRAW_CALLS_MAX, TILE_LEVELS, TILE_PATCH, TILE_SHEET_EXTRA, TILE_SLOTS, sheetColumns, sheetLabel, sheetLayout, sheetLegend, tileFront, tileKeys, tileLevelY_m, type CityTilesRequest, type SheetLayout } from "./tileslots";
import { createCaptionSprite, defaultTextSurface, type CaptionSprite, type TextSurfaceFactory } from "./text";
import type { MapRenderer3d } from "./renderer";

const S = WORLD_PER_METRE;
const UP = /* @__PURE__ */ new Vector3(0, 1, 0);

/** A decal (the pothole patch) lies this far (metres) above its lane's surface, so it does not fight it. */
export const PATCH_LIFT_M = 0.01;
/** The ground under the whole city lies this far (metres) below the carriageway surface, and reaches this far (map units) past the city's edge. */
const GROUND_BELOW_M = 0.02;
const GROUND_MARGIN = 14;
/** The yard ground outside the edge streets' outer pavements, how far it reaches (metres), and how far under the pavement top the yards stand (metres, so a lot surface at 0 lies over them). */
export const OUTER_YARD_M = 15;
const YARD_BELOW_M = 0.02;

const roadLike = (role: TileRole): boolean => TILE_LEVELS[role] !== "pavement";
const carriageRole = (role: TileRole): boolean => role === "lane" || role === "parking" || role === "parkingPlain";

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
export function tileOriginY_m(role: TileRole, key?: CalibrationKey): number {
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
  if (cell.role === "pavement") return cell.variant & 3;
  return 0;
}

/** The key that draws `cell` among the `active` ones: its variant's, else another of its role's, else null (drawn in code). */
export function tileKeyOf(cell: TileCell, active: ReadonlySet<CalibrationKey>): CalibrationKey | null {
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
 * Every cell of `city` as tiles. A key is usable when its entry and a root with at least one mesh are both given; a role with no usable key is drawn in code, cell by cell (and a
 * role with some usable keys uses them for every cell). If the usable keys would take more than `maxCalls` InstancedMeshes (with the code-drawn ones), the keys with the fewest cells
 * are dropped first and their cells fall to the role's other keys or to code. Nothing here reads the state or takes a ray.
 */
export function tileGroup(city: TileCity, roots: ReadonlyMap<CalibrationKey, Object3D>, entries: ReadonlyMap<CalibrationKey, AssetEntry>, maxCalls: number = TILE_DRAW_CALLS_MAX): TileDraw {
  const parts = new Map<CalibrationKey, { mesh: Mesh; local: Matrix4 }[]>();
  const active = new Set<CalibrationKey>();
  for (const key of tileKeys()) {
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
  }
  const planFor = (): Plan => {
    const keyOf = city.cells.map((c) => tileKeyOf(c, active));
    const counts = new Map<CalibrationKey, number>();
    let quads = 0;
    let boxes = 0;
    let strips = 0;
    let patches = 0;
    city.cells.forEach((c, i) => {
      const key = keyOf[i]!;
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      else if (roadLike(c.role)) quads++;
      else {
        boxes++;
        if (c.role === "pavement") strips++;
      }
      if (c.role === "lane" && (c.variant & LANE_PATCH) !== 0 && active.has(TILE_PATCH)) patches++;
    });
    if (patches > 0) counts.set(TILE_PATCH, patches);
    return { keyOf, counts, patches, codeKinds: (quads > 0 ? 1 : 0) + (boxes > 0 ? 1 : 0) + (strips > 0 ? 1 : 0) };
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
    const turn = tileFront(key);
    for (const part of parts.get(key)!) {
      const im = new InstancedMesh(part.mesh.geometry, part.mesh.material, list.length);
      im.name = `tile:${key.slice(key.indexOf(":") + 1)}`;
      list.forEach((c, i) => im.setMatrixAt(i, tileMatrix(c, tileOriginY_m(c.role, key), turn, m).multiply(part.local)));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      noRay(im);
      group.add(im);
      instanced.push(im);
    }
  }
  if (plan.patches > 0) {
    const turn = tileFront(TILE_PATCH);
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
  const strips = kerbStrips(city, codeCells);
  if (strips.length > 0) {
    const kerbMat = own(new MeshStandardMaterial({ color: KERB, roughness: 1 }));
    addSurface(surfaces, "kerb", kerbMat);
    const im = new InstancedMesh(own(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), kerbMat, strips.length);
    im.name = "tile:code-kerb";
    strips.forEach((s, i) => im.setMatrixAt(i, m.compose(tmpP.set(s.x, 0, s.z), q, tmpS.set(s.w, KERB_H, s.d))));
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

/** A code-drawn kerb: its centre (map units) and size (x, z), standing on the pavement's top. */
export interface KerbStrip {
  x: number;
  z: number;
  w: number;
  d: number;
}

/**
 * The kerb strips of the code-drawn pavement cells: one `TILE_M` long on each edge of a `pavement` cell whose neighbour is a lane or parking cell (never against a junction, a
 * crossing or a kerb cut: the kerb is the sidewalk tile's own edge, and there is none where the pavement drops), `KERB_W` wide just inside the pavement.
 */
export function kerbStrips(city: TileCity, drawn: readonly TileCell[]): KerbStrip[] {
  const pavements = drawn.filter((c) => c.role === "pavement");
  if (pavements.length === 0) return [];
  const at = new Map<number, TileCell>();
  const stride = 4096;
  for (const c of city.cells) {
    at.set(c.j * stride + c.i, c);
    if (c.cells === 2) at.set(c.yaw === 0 || c.yaw === 180 ? c.j * stride + c.i + 1 : (c.j + 1) * stride + c.i, c);
  }
  const out: KerbStrip[] = [];
  const half = (TILE_M * S) / 2;
  for (const c of pavements) {
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = at.get((c.j + dj) * stride + c.i + di);
      if (!n || !carriageRole(n.role)) continue;
      const cx = c.x_m * S;
      const cz = c.z_m * S;
      out.push({ x: cx + di * (half - KERB_W / 2), z: cz + dj * (half - KERB_W / 2), w: di !== 0 ? KERB_W : TILE_M * S, d: di !== 0 ? TILE_M * S : KERB_W });
    }
  }
  return out;
}

// ---- the puzzle-free scene ----

export interface CityScene extends SceneBundle {
  city: TileCity;
  /** The tiles on screen now: all code-drawn until `useTiles` is given the pack's. */
  tileDraw(): TileDraw;
  /** Replace the tiles with ones drawn from these pieces (the first call replaces the code-drawn ones). */
  useTiles(roots: ReadonlyMap<CalibrationKey, Object3D>, entries: ReadonlyMap<CalibrationKey, AssetEntry>): TileDraw;
}

/** The "tile city: ..." line the dev view logs once its models are applied. */
export function tileCityLine(city: Pick<TileCity, "blocksX" | "blocksZ" | "seed" | "cells">, draw: Pick<TileDraw, "fromPack" | "codeDrawn">): string {
  return `tile city: ${city.blocksX}x${city.blocksZ} blocks, seed ${city.seed}, ${city.cells.length} cells, ${draw.fromPack} from the pack, ${draw.codeDrawn} code-drawn`;
}

const unitBox = (): BoxGeometry => new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

/** A gable roof: base 1 x 1 on y = 0, ridge along x at y = 1 (the same shape `scene.ts` gives its placeholders; that one is private to it). */
function pitchedRoof(): BufferGeometry {
  type V = [number, number, number];
  const A: V = [-0.5, 0, -0.5];
  const B: V = [0.5, 0, -0.5];
  const C: V = [0.5, 0, 0.5];
  const D: V = [-0.5, 0, 0.5];
  const R1: V = [-0.5, 1, 0];
  const R2: V = [0.5, 1, 0];
  const tris: V[] = [D, C, R2, D, R2, R1, B, A, R1, B, R1, R2, A, D, R1, C, B, R2];
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}

/**
 * The placeholder buildings of the town's lots, laid out as `scene.ts` lays them (one group per lot type and one for the terrace lots, each of four InstancedMeshes: bodies, storey
 * bands, flat roofs, pitched roofs, in lot order), so `applyModels` finds and blanks them exactly as on a ladder map. Without a City Pack they are what stands on the blocks.
 */
function placeholdersOf(lots: readonly Lot[]): { root: Object3D; byType: Record<LotType, Object3D> } {
  const specs = pickPlaceholders(lots);
  const root = new Object3D();
  root.name = "placeholders";
  const byType = {} as Record<LotType, Object3D>;
  const pitched = pitchedRoof();
  const wall = (): MeshStandardMaterial => new MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  const colour = new Color();
  const o = new Object3D();
  const put = (im: InstancedMesh, i: number, x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number, hex: number, k: number): void => {
    o.position.set(x, y, z);
    o.rotation.set(0, yaw, 0);
    o.scale.set(sx, sy, sz);
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
    im.setColorAt(i, colour.setHex(hex).multiplyScalar(k));
  };
  const storeyH = STOREY_M * S;
  const bandH = 0.5 * S;
  for (const type of [...LOT_TYPE_NAMES, "terrace"] as const) {
    const group = new Object3D();
    group.name = `placeholders:${type}`;
    const mine: number[] = [];
    lots.forEach((l, i) => {
      if (type === "terrace" ? l.terrace !== undefined : l.type === type && l.terrace === undefined) mine.push(i);
    });
    const bands = mine.reduce((n, i) => n + specs[i]!.storeys - 1, 0);
    const flats = mine.filter((i) => specs[i]!.roof === "flat");
    const slopes = mine.filter((i) => specs[i]!.roof === "pitched");
    const bodies = new InstancedMesh(unitBox(), wall(), Math.max(mine.length, 1));
    const bandMesh = new InstancedMesh(unitBox(), wall(), Math.max(bands, 1));
    const flatRoofs = new InstancedMesh(unitBox(), wall(), Math.max(flats.length, 1));
    const pitchedRoofs = new InstancedMesh(pitched, wall(), Math.max(slopes.length, 1));
    let b = 0;
    mine.forEach((li, k) => {
      const l = lots[li]!;
      const s = specs[li]!;
      const hex = TINTS[s.tint]!;
      const at = atFront(l, s.d);
      put(bodies, k,at.x, 0, at.z, l.yaw, s.w, s.bodyH, s.d, hex, 1);
      for (let j = 1; j < s.storeys; j++) put(bandMesh, b++, at.x, j * storeyH - bandH / 2, at.z, l.yaw, s.w * 1.03, bandH, s.d * 1.03, hex, 1.6);
    });
    flats.forEach((li, k) => {
      const l = lots[li]!;
      const s = specs[li]!;
      const at = atFront(l, s.d);
      put(flatRoofs, k,at.x, s.bodyH, at.z, l.yaw, s.w * 1.04, s.roofH, s.d * 1.04, TINTS[s.tint]!, ROOF_SHADE);
    });
    slopes.forEach((li, k) => {
      const l = lots[li]!;
      const s = specs[li]!;
      const at = atFront(l, s.d);
      put(pitchedRoofs, k,at.x, s.bodyH, at.z, l.yaw, s.w * 1.04, s.roofH, s.d * 1.04, TINTS[s.tint]!, ROOF_SHADE);
    });
    bodies.count = mine.length;
    bandMesh.count = bands;
    flatRoofs.count = flats.length;
    pitchedRoofs.count = slopes.length;
    for (const im of [bodies, bandMesh, flatRoofs, pitchedRoofs]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      group.add(im);
    }
    if (type !== "terrace") byType[type] = group;
    root.add(group);
  }
  return { root, byType };
}

/**
 * The tile city's scene as a `SceneBundle` with no puzzle in it: no wires, places, poles, hardware, captions or node parts (the fields are there, empty, for `applyModels` and the
 * furniture layout to read), the ground and yards, the placeholder buildings of the town's lots, and the tiles (code-drawn until `useTiles` gives it the pack's). Nothing in it can be
 * picked. `update` does nothing: a city has no state.
 */
export function buildCityScene(city: TileCity): CityScene {
  const town = city.town;
  const scene = new Scene();
  // The scene's global lights and background are the light rig's (ticket 060): night here, as the game is; the tile view puts the scene in its mode.
  const lightOwners = newLightOwners();
  applyLightMode(scene, null, "night", lightOwners);

  const win = town.window;
  const carriageY = -SIDEWALK_WALK_M * S;
  // The ground lies just under the carriageway; the yards are the blocks' open ground and the ring of yard round the city, a hair under 0 so a lot surface at 0 lies over them.
  const ground = new Mesh(new BoxGeometry(win.maxX - win.minX + 2 * GROUND_MARGIN, 0.1, win.maxY - win.minY + 2 * GROUND_MARGIN), new MeshStandardMaterial({ color: GROUND, roughness: 1 }));
  ground.position.set((win.minX + win.maxX) / 2, carriageY - GROUND_BELOW_M * S - 0.05, (win.minY + win.maxY) / 2);
  addSurface(lightOwners, "ground", ground.material as Material);
  noRay(ground);
  scene.add(ground);

  const yardTop = -YARD_BELOW_M * S;
  const yardBase = carriageY;
  const outer = OUTER_YARD_M * S;
  const yardRects: { x0: number; z0: number; x1: number; z1: number }[] = town.blocks.map((b) => ({ x0: b.minX, z0: b.minZ, x1: b.maxX, z1: b.maxZ }));
  yardRects.push(
    { x0: win.minX - outer, z0: win.minY - outer, x1: win.maxX + outer, z1: win.minY },
    { x0: win.minX - outer, z0: win.maxY, x1: win.maxX + outer, z1: win.maxY + outer },
    { x0: win.minX - outer, z0: win.minY, x1: win.minX, z1: win.maxY },
    { x0: win.maxX, z0: win.minY, x1: win.maxX + outer, z1: win.maxY },
  );
  const yardMat = new MeshStandardMaterial({ color: YARD, roughness: 1 });
  addSurface(lightOwners, "yard", yardMat);
  const yards = new InstancedMesh(unitBox(), yardMat, yardRects.length);
  const o = new Object3D();
  yardRects.forEach((r, i) => {
    o.position.set((r.x0 + r.x1) / 2, yardBase, (r.z0 + r.z1) / 2);
    o.rotation.set(0, 0, 0);
    o.scale.set(r.x1 - r.x0, yardTop - yardBase, r.z1 - r.z0);
    o.updateMatrix();
    yards.setMatrixAt(i, o.matrix);
  });
  yards.instanceMatrix.needsUpdate = true;
  noRay(yards);
  scene.add(yards);

  // The junction boxes as hidden pad meshes (never in the scene): `furnitureInput` keeps furniture out of the boxes it reads here.
  const padGeo: BufferGeometry[] = [];
  const padMat = new MeshBasicMaterial({ color: STREET });
  const pads = town.pads
    .filter((p) => p.pts.length >= 3)
    .map((p) => {
      const g = new BufferGeometry();
      const pos: number[] = [];
      for (const v of [p.pts[0]!, p.pts[1]!, p.pts[2]!, p.pts[0]!, p.pts[2]!, p.pts[3] ?? p.pts[2]!]) pos.push(v.x, 0, v.z);
      g.setAttribute("position", new Float32BufferAttribute(pos, 3));
      padGeo.push(g);
      const mesh = new Mesh(g, padMat);
      mesh.userData["pad"] = p.id;
      return mesh;
    });

  const placeholders = placeholdersOf(town.lots);
  scene.add(placeholders.root);
  const modelGroup = new Object3D();
  modelGroup.name = "models";
  scene.add(modelGroup);

  let tiles = tileGroup(city, new Map(), new Map());
  scene.add(tiles.group);
  const syncTileSurfaces = (): void => {
    for (const [key, mats] of tiles.surfaces) lightOwners.materials.set(key, [...mats]);
    for (const key of ["street", "pavement", "kerb"]) if (!tiles.surfaces.has(key)) lightOwners.materials.delete(key);
    // The tiles' materials are new: bring them to the mode the scene is in.
    applyLightMode(scene, null, sceneLightMode(scene) ?? "night", lightOwners);
  };
  syncTileSurfaces();

  // The fields a puzzle scene has and a city has none of: empty, and never added to the scene.
  const emptyGeo = new BufferGeometry();
  const emptyMat = new MeshBasicMaterial();
  const none = (): InstancedMesh => {
    const im = new InstancedMesh(emptyGeo, emptyMat, 1);
    im.count = 0;
    return im;
  };
  const emptyMesh = new Mesh(emptyGeo, emptyMat);
  // Nothing in a city can be picked, placeholders included (the models `applyModels` adds later take no ray either).
  scene.traverse(noRay);

  return {
    city,
    scene,
    lightOwners,
    captions: [],
    parts: new Map(),
    wires: new Map(),
    places: new Map(),
    poles: { poles: none(), arms: none() },
    slots: { poles: { spots: [], placeholders: [] }, lamps: [], blocks: { list: town.lots, placeholder: placeholders.root, byType: placeholders.byType, terraces: town.terraces }, models: modelGroup },
    streets: { yards, roads: none(), kerbs: none(), dashes: none(), pavements: emptyMesh, pads },
    hardware: { insulators: none(), cans: none(), drops: none(), canList: [], dropList: [] },
    setViewport() {},
    update() {},
    tileDraw: () => tiles,
    useTiles(roots, entries) {
      scene.remove(tiles.group);
      tiles.dispose();
      tiles = tileGroup(city, roots, entries);
      scene.add(tiles.group);
      syncTileSurfaces();
      return tiles;
    },
    dispose() {
      tiles.dispose();
      const mats = new Set<Material>();
      // A model clone shares its geometry and textures with the page's cache, so its subtree is left alone.
      const visit = (obj: Object3D): void => {
        if (obj.userData["sharedModel"] === true) return;
        const mesh = obj as Mesh;
        mesh.geometry?.dispose();
        const mm = mesh.material as Material | Material[] | undefined;
        if (Array.isArray(mm)) mm.forEach((x) => mats.add(x));
        else if (mm) mats.add(mm);
        if ((obj as InstancedMesh).isInstancedMesh === true) (obj as InstancedMesh).dispose();
        for (const c of obj.children) visit(c);
      };
      visit(scene);
      mats.forEach((x) => x.dispose());
      for (const g of padGeo) g.dispose();
      padMat.dispose();
      emptyGeo.dispose();
      emptyMat.dispose();
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
const sheetRole = (roles: readonly TileRole[], key: CalibrationKey): TileRole => roles[0] ?? (key.includes("Sidewalk") ? "pavementCorner" : "lane");

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
  const pieceHave: { key: CalibrationKey; present: boolean }[] = [];
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
    pieceHave.push({ key: p.key, present: have });
    caption(layout.numbered ? [String(pieceHave.length)] : sheetLabel(p.key, have), cx, 0, cz + tile / 2 + SHEET_LABEL_GAP_M * S, "below");
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

/**
 * The height the tile city's pavement furniture stands at, metres: its walk is at 0 (design item 7; the ladder's pavement is 4.4 cm up), so a bench stands on the walk and does not float.
 * The yard layer (a lot's pieces, an alley's) keeps the ladder's 2.2 cm over the lot surface at 0, so a flat piece (lot lines, a panel) is a hair above it (criterion 26).
 */
export const TILE_FURNITURE_LEVELS: FurnitureLevels = { pavement_m: 0 };

/**
 * What `applyModels` is given for a tile city (ticket 055 E): the keep-outs of `tileKeepouts` (pole slots, kerb cuts, the corner cells the crossings land on), the meters that stand beside
 * no bay taken out (`bayMeters`), and the furniture on the walk. The puzzle path passes nothing.
 */
export function cityApplyOptions(city: TileCity): ApplyOptions {
  const keep = tileKeepouts(city);
  return { keepPoints: keep.keepPoints, keepRects: keep.keepRects, furnitureFilter: (pieces) => bayMeters(city, pieces), furnitureLevels: TILE_FURNITURE_LEVELS };
}

export interface CityRendererOptions {
  insets?: Insets | undefined;
  dpr: number;
  /** The page's query string (`cam=street`, `run`, `at`, `light=night`); renderer.ts reads the address and passes it in. */
  search: string;
  /** The models to load once the view is up (default: the page's shared tile load). A test passes its own so nothing is fetched. */
  load?: () => Promise<ModelSet>;
  /** The sheet's text surface (default: the browser's; a test passes the stub). */
  surface?: TextSurfaceFactory;
  /** The window's keys and the button maker for the day and night switch (default: the page's). A test passes fakes. */
  toggleHost?: DayToggleHost;
  /** The city to show (default: the one `req` asks for). A test passes one with no terraces to reach the street camera's fallback. */
  city?: TileCity;
}

/** The rig's insets for a sheet: the page's own, widened for the legend at the top and the labels at the bottom and sides. */
export function sheetRigInsets(base: Insets, sheet: Pick<SheetScene, "insetsPx">): Insets {
  const e = sheet.insetsPx;
  return { ...base, top: (base.top ?? 0) + e.top, bottom: (base.bottom ?? 0) + e.bottom, left: (base.left ?? 0) + e.left, right: (base.right ?? 0) + e.right };
}

/** The sheet's fit ignores the roofline the city's fit allows for: nothing on it stands taller than a label's anchor. */
const SHEET_FIT_TOP = 0.3;

/**
 * The 3D view's tile city mode (dev only): the same interface as the town's renderer, so play and ui are unchanged. The puzzle, the state, the hover and the Relight it is handed
 * are ignored; nothing in the scene can be picked (`hitTest` is null). `?sheet=1` shows the tile sheet, from above on the city rig; otherwise the city, on a tilted camera over the
 * whole city (or `cam=street` on the tile city's own Town). The city, the street camera and the fallback to the overhead view open in day (`lightModeFor`: `light=night` opens the game's night); the L key and a
 * "Day / Night" button flip the mode through the light rig (dev builds only). The sheet is lit by its own lights in either mode. The models load once the view is up; until they do (and if they never do) every tile
 * is code-drawn.
 */
export function createCityRenderer3d(gl: WebGLRenderer, canvas: HTMLCanvasElement, req: CityTilesRequest, opts: CityRendererOptions): MapRenderer3d {
  const w0 = Math.max(canvas.clientWidth, 1);
  const h0 = Math.max(canvas.clientHeight, 1);
  let insets: Insets = { ...(opts.insets ?? {}) };
  let disposed = false;
  const city = opts.city ?? tileCity({ blocksX: req.blocksX, blocksZ: req.blocksZ, seed: req.seed });
  const lightId0: LightModeId = lightModeFor("tiles", opts.search, import.meta.env.DEV);

  let rig: CityRig;
  let cityScene: CityScene | null = null;
  let sheet: SheetScene | null = null;
  let applied: AppliedModels | null = null;
  let street: StreetView | null = null;
  let toggle: DayToggle | null = null;
  let tileRoots: ReadonlyMap<CalibrationKey, Object3D> = new Map();
  let tileEntries: ReadonlyMap<CalibrationKey, AssetEntry> = new Map();

  /** The sheet for a window of this size, on a rig of its own (the grid's columns follow the window's shape, so a window of another shape needs another grid). */
  const makeSheet = (w: number, h: number): void => {
    const next = buildSheetScene(tileRoots, tileEntries, { dpr: opts.dpr, aspect: w / h, ...(opts.surface ? { surface: opts.surface } : {}) });
    sheet?.dispose();
    sheet = next;
    rig = createCityRig(next.frame, w, h, sheetRigInsets(insets, next), { fitTop: SHEET_FIT_TOP });
  };

  if (req.sheet) {
    // The sheet has its own lights, in both modes: a renderer left in day's tone mapping goes back to none for it.
    setRendererMode(gl, "night");
    makeSheet(w0, h0);
  } else {
    cityScene = buildCityScene(city);
    const win = city.town.window;
    rig = createCityRig({ minX: win.minX, minY: win.minY, maxX: win.maxX, maxY: win.maxY }, w0, h0, insets);
    const asked = streetCamRequested(opts.search);
    // The light is the rig's, not the street view's: one set of lights whatever the camera, so the overhead view and the fallback to it are lit as the street camera is.
    applyLightMode(cityScene.scene, gl, lightId0, cityScene.lightOwners);
    if (asked) street = createStreetView(city.town, { ...asked, day: false }, cityScene.scene, w0, h0);
    if (asked && !street) console.info("tile city: no row of buildings to look along yet, showing the city from above.");
  }
  const sceneNow = (): Scene => (sheet ? sheet.scene : cityScene!.scene);
  // The key and the button that flip day and night (dev only; the sheet has nothing to flip).
  if (import.meta.env.DEV && cityScene) {
    const lit = cityScene;
    let mode: LightModeId = lightId0;
    toggle = createDayToggle(opts.toggleHost ?? pageDayToggleHost(), mode, () => {
      mode = mode === "day" ? "night" : "day";
      applyLightMode(lit.scene, gl, mode, lit.lightOwners);
      toggle?.sync(mode);
    });
  }

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
    street?.resize(w, h);
    sizeLabels();
  }
  resize();

  // The models: one load for the page, then the pieces swap in. A failure (no City Pack, no manifest) leaves every tile code-drawn and costs one line.
  const load = opts.load ?? ((): Promise<ModelSet> => sharedTileModels(tileKeys()));
  void load()
    .then((set) => {
      if (disposed) return;
      const input = tileInput(set);
      tileRoots = input?.roots ?? new Map<CalibrationKey, Object3D>();
      tileEntries = input?.entries ?? new Map<CalibrationKey, AssetEntry>();
      if (sheet) {
        makeSheet(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1));
        sizeLabels();
        console.info(`tile sheet: ${sheet.present} of ${sheet.present + sheet.missing} pieces are in the pack`);
        return;
      }
      const scene = cityScene!;
      applied = applyModels(scene, set, cityApplyOptions(city));
      const draw = scene.useTiles(tileRoots, tileEntries);
      console.info(tileCityLine(city, draw));
      street?.markReady();
    })
    .catch((e: unknown) => {
      console.info(`3D models: not applied (${e instanceof Error ? e.message : String(e)}).`);
      if (cityScene) console.info(tileCityLine(city, cityScene.tileDraw()));
      street?.markReady();
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
    if (!drag || e.pointerId !== drag.id || street) return;
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
      gl.render(sceneNow(), rig.camera);
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
      applied?.remove();
      applied = null;
      toggle?.dispose();
      toggle = null;
      setRendererMode(gl, "night");
      cityScene?.dispose();
      sheet?.dispose();
    },
  };
  const view = street;
  if (view && cityScene) {
    const scene = cityScene.scene;
    return streetMode(play, view, () => view.draw(gl, scene));
  }
  return play;
}
