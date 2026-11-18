/**
 * The tile city, drawn (ticket 055, section C; dev only: `/?puzzle=<any>&view=3d&city=tiles`). `tilecity.ts` lays the cells; this file turns them into a scene.
 *
 * - `tileGroup` draws every cell: one `InstancedMesh` per City Pack key (and per sub-mesh of it), each instance at its cell centre, turned by the cell's yaw plus the key's
 *   `TILE_FRONTS` line, at `WORLD_PER_METRE` and never otherwise scaled. A cell whose role has no loaded piece is drawn in code at the same cell and level, in today's street,
 *   pavement and kerb colours (a flat quad for a road, a box from the carriageway to the pavement top for a pavement, a pale strip for each kerb edge). No tile can be picked.
 * - `buildCityScene` is a puzzle-free `SceneBundle` (no wires, places, poles or captions) over the tile city's `Town`: the ground, the yards, the placeholder buildings on its lots,
 *   and the tiles. `applyModels` runs on it unchanged, so stacks, dressing, furniture and colourways stand as on a ladder map.
 * - `buildSheetScene` lays each tile piece once in a row, labelled, with an arrow along the front the city expects, so each piece's orientation can be confirmed by eye.
 * - `createCityRenderer3d` is the renderer for both, switched on in renderer.ts behind `import.meta.env.DEV`. It reads no address: renderer.ts passes the query string in.
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
  HemisphereLight,
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
import { createGalleryRig, type GalleryView } from "./gallery";
import { WORLD_PER_METRE, atFront } from "./models";
import { applyModels, meshParts, sharedTileModels, tileInput, type AppliedModels } from "./models3d";
import { KERB_H, LOT_TYPE_NAMES, STOREY_M, type Lot, type LotType } from "./town";
import { ROOF_SHADE, TINTS, pickPlaceholders } from "./placeholders";
import { KERB, PAVEMENT, STREET, GROUND, YARD, KERB_W, type SceneBundle } from "./scene";
import { createStreetView, streetCamRequested, streetMode, STREET_CAM_DAY_INTENSITY, STREET_CAM_GROUND, STREET_CAM_SKY, type StreetView } from "./streetcam";
import { LANE_PATCH, LANE_RIGHT, SIDEWALK_TOP_M, TILE_M, tileCity, type TileCell, type TileCity, type TileRole } from "./tilecity";
import { TILE_DRAW_CALLS_MAX, TILE_FRONTS, TILE_FRONT_TEXT, TILE_LEVELS, TILE_PATCH, TILE_SHEET_EXTRA, TILE_SLOTS, sheetPieces, tileFront, tileKeys, type CityTilesRequest } from "./tileslots";
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
const CITY_BACKGROUND = 0x0b0f17;

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
 * Where a piece's origin stands (metres): carriageway pieces at `-SIDEWALK_TOP_M`, a parking lot's surface at 0, and a pavement piece with its top at 0, so its origin is
 * its own height below (every piece's pivot is centred with its minimum y at 0): 0.30 m for the sidewalk tile, whatever its entry says.
 */
export function tileOriginY_m(role: TileRole, entry?: Pick<AssetEntry, "bounds">): number {
  const level = TILE_LEVELS[role];
  if (level === "carriage") return -SIDEWALK_TOP_M;
  if (level === "ground") return 0;
  return -(entry ? entry.bounds.max[1] : SIDEWALK_TOP_M);
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
    const entry = entries.get(key);
    for (const part of parts.get(key)!) {
      const im = new InstancedMesh(part.mesh.geometry, part.mesh.material, list.length);
      im.name = `tile:${key.slice(key.indexOf(":") + 1)}`;
      list.forEach((c, i) => im.setMatrixAt(i, tileMatrix(c, tileOriginY_m(c.role, entry), turn, m).multiply(part.local)));
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

  // The code-drawn cells: roads as flat quads, pavements as boxes from the carriageway to the pavement top, a pale strip on each pavement edge that meets a carriageway.
  const codeCells = city.cells.filter((_, i) => plan.keyOf[i] === null);
  const quads = codeCells.filter((c) => roadLike(c.role));
  const boxes = codeCells.filter((c) => !roadLike(c.role));
  const own = <T extends { dispose(): void }>(o: T): T => {
    owned.push(o);
    return o;
  };
  const q = new Quaternion();
  if (quads.length > 0) {
    const im = new InstancedMesh(own(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), own(new MeshStandardMaterial({ color: STREET, roughness: 1 })), quads.length);
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
    const im = new InstancedMesh(own(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), own(new MeshStandardMaterial({ color: PAVEMENT, roughness: 1 })), boxes.length);
    im.name = "tile:code-pavement";
    boxes.forEach((c, i) => {
      const f = cellFootprint(c);
      im.setMatrixAt(i, m.compose(tmpP.set(c.x_m * S, -SIDEWALK_TOP_M * S, c.z_m * S), q, tmpS.set(f.w_m * S, SIDEWALK_TOP_M * S, f.d_m * S)));
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    noRay(im);
    group.add(im);
    instanced.push(im);
  }
  const strips = kerbStrips(city, codeCells);
  if (strips.length > 0) {
    const im = new InstancedMesh(own(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), own(new MeshStandardMaterial({ color: KERB, roughness: 1 })), strips.length);
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
  scene.background = new Color(CITY_BACKGROUND);
  scene.add(new AmbientLight(0x4a5a7a, 1.1));
  const moon = new DirectionalLight(0x8fa6d0, 0.7);
  moon.position.set(-6, 12, 4);
  scene.add(moon);

  const win = town.window;
  const carriageY = -SIDEWALK_TOP_M * S;
  // The ground lies just under the carriageway; the yards are the blocks' open ground and the ring of yard round the city, a hair under 0 so a lot surface at 0 lies over them.
  const ground = new Mesh(new BoxGeometry(win.maxX - win.minX + 2 * GROUND_MARGIN, 0.1, win.maxY - win.minY + 2 * GROUND_MARGIN), new MeshStandardMaterial({ color: GROUND, roughness: 1 }));
  ground.position.set((win.minX + win.maxX) / 2, carriageY - GROUND_BELOW_M * S - 0.05, (win.minY + win.maxY) / 2);
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
  const yards = new InstancedMesh(unitBox(), new MeshStandardMaterial({ color: YARD, roughness: 1 }), yardRects.length);
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

export interface SheetScene {
  scene: Scene;
  /** What the gallery's rig frames: the whole row, and the first screen (the first few pieces). */
  view: GalleryView;
  /** Pieces whose root was found in the pack, and pieces that were not. */
  present: number;
  missing: number;
  /** One label per piece plus the title, in the order of `sheetPieces()` (title last). */
  labels: readonly CaptionSprite[];
  /** Size the labels to the canvas (they keep a fixed pixel size at any zoom). */
  setViewport(heightPx: number): void;
  dispose(): void;
}

const SHEET_GAP = 1.0;
const SHEET_ARROW = 0xffc247;
const SHEET_OUTLINE = 0xeef1f7;
const SHEET_FONT_PX = 14;
const SHEET_SCREEN_PIECES = 3;

const wrapAt = (text: string, max: number): string[] => {
  const out: string[] = [];
  for (const part of text.split("; ")) {
    let cur = "";
    for (const w of part.split(" ")) {
      if (cur && cur.length + 1 + w.length > max) {
        out.push(cur);
        cur = w;
      } else cur = cur ? `${cur} ${w}` : w;
    }
    if (cur) out.push(cur);
  }
  return out;
};

/** The lines of a piece's label: its name, its roles, the turn it has now, what its front must show, or that it is not in the pack. */
export function sheetLabel(key: CalibrationKey, roles: readonly TileRole[], present: boolean, fronts: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = TILE_FRONTS): string[] {
  const name = key.slice(key.indexOf(":") + 1).replace(/^SM_Env_/, "");
  const lines = [name, roles.length > 0 ? roles.join(", ") : "(not used by a role yet)", `turn ${tileFront(key, fronts)}`];
  const first = roles[0];
  if (first !== undefined) lines.push(...wrapAt(TILE_FRONT_TEXT[first], 28));
  if (!present) lines.push("NOT IN THE PACK");
  return lines;
}

/**
 * Every tile piece once, in a row along x, standing on a plain ground the way the city stands it (a road piece at the carriageway level, a sidewalk piece with its top at 0), each
 * turned by its `TILE_FRONTS` line, with its own outline (so a piece the pack lacks still shows its place), a yellow arrow along +z (toward the camera: the front the city expects) and
 * a label. A corner piece has a second arrow along +x. The piece must show its kerb, centre line, dip or stripes on the arrow's side; the label says which.
 */
export function buildSheetScene(roots: ReadonlyMap<CalibrationKey, Object3D>, entries: ReadonlyMap<CalibrationKey, AssetEntry>, opts: { surface?: TextSurfaceFactory; dpr?: number } = {}): SheetScene {
  const surface = opts.surface ?? defaultTextSurface;
  const dpr = opts.dpr ?? 1;
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
  const pieces = sheetPieces();
  const tile = TILE_M * S;
  const widths = pieces.map((p) => p.cells * tile);
  let cursor = 0;
  const centres = widths.map((w) => {
    const c = cursor + w / 2;
    cursor += w + SHEET_GAP;
    return c;
  });
  const end = cursor - SHEET_GAP;

  const groundMat = own(new MeshStandardMaterial({ color: 0x3d4658, roughness: 1 }));
  const ground = new Mesh(own(new PlaneGeometry(end + 6, 4)), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(end / 2, -SIDEWALK_TOP_M * S - GROUND_BELOW_M * S, 0.4);
  noRay(ground);
  scene.add(ground);

  const outlineMat = own(new MeshBasicMaterial({ color: SHEET_OUTLINE }));
  const arrowMat = own(new MeshBasicMaterial({ color: SHEET_ARROW, side: DoubleSide }));
  const shaftGeo = own(new BoxGeometry(0.06, 0.02, 0.42));
  const headGeo = own(new BufferGeometry());
  headGeo.setAttribute("position", new Float32BufferAttribute([0, 0, 0.2, -0.11, 0, 0, 0.11, 0, 0], 3));
  const arrow = (x: number, turn: number): Group => {
    const g = new Group();
    const shaft = new Mesh(shaftGeo, arrowMat);
    shaft.position.set(0, 0, -0.1);
    const head = new Mesh(headGeo, arrowMat);
    head.position.set(0, 0, 0.11);
    g.add(shaft, head);
    g.position.set(x, 0.03, 0);
    g.rotation.y = turn;
    return g;
  };
  const outlineBox = (w: number, d: number, x: number, z: number): Mesh => {
    const mesh = new Mesh(own(new BoxGeometry(w, 0.02, d)), outlineMat);
    mesh.position.set(x, 0.01, z);
    return mesh;
  };

  const labels: CaptionSprite[] = [];
  const caption = (lines: readonly string[], x: number, y: number, z: number, anchorY: 0 | 1): void => {
    const cs = createCaptionSprite(surface, SHEET_FONT_PX, dpr, false, anchorY);
    cs.draw(lines, "text");
    cs.sprite.position.set(x, y, z);
    own(cs.sprite.material);
    noRay(cs.sprite);
    labels.push(cs);
    scene.add(cs.sprite);
  };

  let present = 0;
  pieces.forEach((p, i) => {
    const cx = centres[i]!;
    const root = roots.get(p.key);
    const entry = entries.get(p.key);
    const have = root !== undefined && entry !== undefined && meshParts(root).length > 0;
    const w = widths[i]!;
    const t = 0.03;
    for (const [bw, bd, bx, bz] of [
      [w, t, 0, -tile / 2],
      [w, t, 0, tile / 2],
      [t, tile, -w / 2, 0],
      [t, tile, w / 2, 0],
    ] as const) {
      scene.add(outlineBox(bw, bd, cx + bx, bz));
    }
    if (have) {
      present++;
      const wrap = new Group();
      wrap.name = `tile-piece:${p.key}`;
      const role: TileRole = p.roles[0] ?? (p.key === TILE_PATCH ? "lane" : "pavementCorner");
      wrap.position.set(cx, tileOriginY_m(role, entry) * S, 0);
      wrap.rotation.y = (tileFront(p.key) * Math.PI) / 180;
      wrap.scale.setScalar(S);
      const clone = root.clone(true);
      clone.traverse(noRay);
      wrap.add(clone);
      scene.add(wrap);
    }
    scene.add(arrow(cx, 0));
    if (p.roles.includes("pavementCorner") || p.key === TILE_SHEET_EXTRA[0]) scene.add(arrow(cx, Math.PI / 2));
    caption(sheetLabel(p.key, p.roles, have), cx, 0, tile / 2 + 0.18, 1);
  });
  caption(
    [
      "tile sheet (city-pack): each piece once, turned by its TILE_FRONTS line",
      "yellow arrow = the front the city expects (+z, toward you)",
      "a kerb or dip must be on the arrow's side; a road piece's lines run left-right (the street runs along x)",
      "wrong? set that key's turn (90, 180 or 270) in TILE_FRONTS, src/render3d/tileslots.ts",
      "the road pieces stand at the carriageway level, the sidewalk pieces with their top at 0",
      "drag or arrow keys to move along the row",
    ],
    0,
    0,
    -tile / 2 - 0.3,
    0,
  );

  const first = Math.min(SHEET_SCREEN_PIECES, pieces.length) - 1;
  const screenMaxX = (centres[first] ?? 0) + (widths[first] ?? tile) / 2 + 0.6;
  const frame = { minX: -0.9, maxX: screenMaxX, minY: -0.1, maxY: 0.5, minZ: -0.9, maxZ: 1.6 };
  const view: GalleryView = { world: { ...frame, minX: -0.9, maxX: end + 0.9 }, screens: [frame] };
  return {
    scene,
    view,
    present,
    missing: pieces.length - present,
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
 * pans over it and dollies in and out. The gallery's rig looks along a line from 15 degrees up and pans along x only, which cannot judge a street grid from above.
 */
export function createCityRig(frame: CityRect, width = 1280, height = 720, startInsets?: Insets): CityRig {
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
        for (const y of [0, CITY_FIT_TOP]) {
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
  /** The page's query string (`cam=street`, `run`, `at`, `light=day`); renderer.ts reads the address and passes it in. */
  search: string;
}

interface PanRig {
  resize(width: number, height: number, insets?: Insets): void;
  getPan(): { x: number; y: number };
  setPan(x: number, y: number): { x: number; y: number };
  resetView(): void;
  getScale(): number;
  zoomStep(dir: 1 | -1): number;
}

/**
 * The 3D view's tile city mode (dev only): the same interface as the town's renderer, so play and ui are unchanged. The puzzle, the state, the hover and the Relight it is handed
 * are ignored; nothing in the scene can be picked (`hitTest` is null). `?sheet=1` shows the tile sheet on the gallery's rig; otherwise the city, on a tilted camera over the
 * whole city (or `cam=street` on the tile city's own Town). The models load once the view is up; until they do (and if they never do) every tile is code-drawn.
 */
export function createCityRenderer3d(gl: WebGLRenderer, canvas: HTMLCanvasElement, req: CityTilesRequest, opts: CityRendererOptions): MapRenderer3d {
  const w0 = Math.max(canvas.clientWidth, 1);
  const h0 = Math.max(canvas.clientHeight, 1);
  let insets: Insets = { ...(opts.insets ?? {}) };
  let disposed = false;
  const city = tileCity({ blocksX: req.blocksX, blocksZ: req.blocksZ, seed: req.seed });
  const query = new URLSearchParams(opts.search);

  let rig: PanRig;
  let cityScene: CityScene | null = null;
  let sheet: SheetScene | null = null;
  let camera: () => PerspectiveCamera;
  let applied: AppliedModels | null = null;
  let street: StreetView | null = null;
  let daylight: HemisphereLight | null = null;
  let sceneNow: () => Scene;
  let fitWhole: () => void;

  if (req.sheet) {
    sheet = buildSheetScene(new Map(), new Map(), { dpr: opts.dpr });
    const gr = createGalleryRig(sheet.view, w0, h0, insets);
    rig = gr;
    camera = () => gr.camera;
    sceneNow = () => sheet!.scene;
    fitWhole = () => gr.resetView();
  } else {
    cityScene = buildCityScene(city);
    const win = city.town.window;
    const cr = createCityRig({ minX: win.minX, minY: win.minY, maxX: win.maxX, maxY: win.maxY }, w0, h0, insets);
    rig = cr;
    camera = () => cr.camera;
    sceneNow = () => cityScene!.scene;
    fitWhole = () => cr.resetView();
    const asked = streetCamRequested(opts.search);
    if (asked) street = createStreetView(city.town, asked, cityScene.scene, w0, h0);
    else if (query.get("light") === "day") {
      daylight = new HemisphereLight(STREET_CAM_SKY, STREET_CAM_GROUND, STREET_CAM_DAY_INTENSITY);
      cityScene.scene.add(daylight);
    }
    if (asked && !street) console.info("tile city: no row of buildings to look along yet, showing the city from above.");
  }

  function sizeLabels(): void {
    sheet?.setViewport(Math.max(canvas.clientHeight, 1));
  }
  function resize(): void {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    gl.setPixelRatio(opts.dpr);
    gl.setSize(w, h, false);
    rig.resize(w, h, insets);
    street?.resize(w, h);
    sizeLabels();
  }
  resize();

  // The models: one load for the page, then the pieces swap in. A failure (no City Pack, no manifest) leaves every tile code-drawn and costs one line.
  void sharedTileModels(tileKeys())
    .then((set) => {
      if (disposed) return;
      const input = tileInput(set);
      const roots = input?.roots ?? new Map<CalibrationKey, Object3D>();
      const entries = input?.entries ?? new Map<CalibrationKey, AssetEntry>();
      if (sheet) {
        const next = buildSheetScene(roots, entries, { dpr: opts.dpr });
        sheet.dispose();
        sheet = next;
        (rig as ReturnType<typeof createGalleryRig>).setView(next.view);
        sizeLabels();
        console.info(`tile sheet: ${next.present} of ${next.present + next.missing} pieces are in the pack`);
        return;
      }
      const scene = cityScene!;
      applied = applyModels(scene, set);
      const draw = scene.useTiles(roots, entries);
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
      gl.render(sceneNow(), camera());
    },
    hitTest: () => null,
    resize,
    setInsets(next) {
      insets = { ...next };
      rig.resize(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), insets);
      sizeLabels();
    },
    notify() {},
    setBlockers() {},
    placeAt: () => null,
    getPan: () => rig.getPan(),
    setPan: (x, y) => rig.setPan(x, y),
    resetView() {
      fitWhole();
      sizeLabels();
    },
    getScale: () => rig.getScale(),
    zoomStep: (dir) => rig.zoomStep(dir),
    fitWhole() {
      fitWhole();
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
      if (daylight) {
        cityScene?.scene.remove(daylight);
        daylight.dispose();
        daylight = null;
      }
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
