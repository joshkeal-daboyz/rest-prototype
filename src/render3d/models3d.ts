/**
 * Loads the converted GLB models at runtime and puts them in the scene (ticket 039).
 * The files are fetched by URL string from `assets/private/out/`, which only exists on the machine that ran
 * `npm run assets:convert` (or a site where the owner copied it). They are never imported, never in `public/`, never bundled.
 * Any failure leaves today's placeholder shapes in place and costs one console.info line; nothing here throws or waits for play.
 */

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BoxGeometry, Box3, Color, DoubleSide, Group, InstancedMesh, Matrix4, MeshStandardMaterial, NearestFilter, Quaternion, Texture, TextureLoader, Vector3, type Material, type Mesh, type Object3D } from "three";
import { calibrationKey, parseCalibrationKey, type AssetEntry, type AssetManifest, type CalibrationKey } from "../core";
import { stableHash } from "../render/city";
import { effectiveFronts, loadSavedCalibration } from "./calibration";
import { COLOURWAY_POOL, assignColourways, isBaseAtlasName, type ColourwayBlock } from "./colourway";
import { CODE_ESCAPE_KEY, type EscapePart } from "./escapes";
import { DRESS_DRAW_CALLS_MAX, KERB_FROM_FRONT_M, SHOP_GLASS, dressKeys, dressTown, type DressBlockInput, type DressPiece, type DressSlotKind, type DressTownOptions } from "./dressing";
import { FURN_DRAW_CALLS_MAX, alleyOf, furnitureKeys, furnitureLayout, openLotsOf, type Alley, type AvoidBox, type FurnitureInput, type FurniturePiece, type Rect } from "./furniture";
import {
  BUILDING_EXCLUDE,
  BUILDING_FRONTS,
  MODEL_SLOTS,
  MODEL_TABLE,
  WORLD_PER_METRE,
  atFront,
  buildingPlan,
  frontIsQuarter,
  frontYaw,
  isManifest,
  meshFamily,
  modelScale,
  pickBuildings,
  pickIndex,
  planDressPieces,
  planModels,
  planStackPieces,
  sizeOf,
  poleYaw,
  stackFamily,
  stackStyleOf,
  traitsOf,
  type BuildingFront,
  type FrontTable,
  type ModelChoice,
  type ModelSlot,
  type PlannedModel,
} from "./models";
import { pickPlaceholders } from "./placeholders";
import type { ModelSlots, SceneBundle } from "./scene";
import { STACK_STYLES, assembleStack, offeredStacks, stackKeys, type Stack, type StackAlign, type StackPiece, type StackStyle } from "./stacks";
import { ALLEY_MAX_M, ALLEY_MIN_M, alignOf, packTown, type PackedBlock, type PackResult } from "./terrace";
import { PAVEMENT_Y, YARD, YARD_H } from "./scene";
import { DOOR_SILLS, STEPS_D_M, STEPS_KEY, STEPS_RISE_M, STEPS_W_M, fitSillBand, houseSill, modelPoint, stackLift, stackSill, stepsYaw, type SillPlan, type SillTable } from "./sills";
import { LOT_TYPE_NAMES, TERRACE_DEPTH_M, type Lot, type Pt, type TerraceRun } from "./town";

/** The dressing that stands on a ground piece and rises with it (ticket 062 B): a shop's glass, an awning or door canopy, a sign and the ATM beside a door. */
const GROUND_DRESS: ReadonlySet<DressSlotKind> = new Set<DressSlotKind>(["glass", "awning", "sign", "wall"]);

/** No ground piece is lifted (a stack that has not sunk, or one drawn on its own). */
const NO_LIFT: ReadonlyMap<number, number> = new Map();

/** A planned model whose root node was found in its pack's GLB. */
export interface LoadedModel extends PlannedModel {
  root: Object3D;
}

/** What loading produced, per slot: the usable models in table order, or null (the slot keeps its placeholder). */
export type ModelSet = Record<ModelSlot, LoadedModel[] | null> & {
  /**
   * The City Pack stack pieces (ticket 050 B), in `LoadDeps.stackKeys` order; null when they were asked for and none loaded. Absent when not asked for
   * (the town today), so a set made without stacks is exactly what it was.
   */
  stack?: LoadedModel[] | null;
  /**
   * The City Pack dressing pieces (ticket 052 B: awnings, glass, signs, fire escapes, roof props), in `LoadDeps.dressKeys` order; null when they were asked for and none
   * loaded (no City Pack). Absent when not asked for, so a set made without dressing is exactly what it was.
   */
  dress?: LoadedModel[] | null;
  /**
   * The City Pack ground tiles (ticket 055 C: roads, sidewalks, the parking lines), in `LoadDeps.tileKeys` order; null when they were asked for and none loaded. Absent when not asked
   * for, which is every page but the dev-only tile city (`city=tiles`): the town and every puzzle map never ask.
   */
  tile?: LoadedModel[] | null;
  /**
   * The door steps (ticket 055 F: the Town Pack's `SM_Bld_House_Concrete_Steps_01`), in `LoadDeps.stepKeys` order; null when they were asked for and none loaded. Absent when not asked for, which is
   * every set but the puzzle pages' (the tile city has no house, so it never fetches the Town Pack for them): then a step is drawn as a plain box.
   */
  steps?: LoadedModel[] | null;
  /**
   * The City Pack colourway atlases that loaded (ticket 054 B), by id (`02_A`), each carrying its base atlas's name in `userData.colourwayBase`. Only ids in COLOURWAY_POOL are ever loaded. Absent when none
   * loaded or none was asked for (a fresh checkout, CI, no `colourways` in the manifest, no `loadTexture`): then every stack is drawn with the cached materials, exactly as before.
   */
  colourways?: ReadonlyMap<string, Texture>;
};

export const NO_MODELS: ModelSet = { pole: null, lamp: null, building: null };

export interface LoadDeps {
  /** Resolves to the parsed JSON, and rejects on a network error, a non-OK status or a body that is not JSON. */
  fetchJson(url: string): Promise<unknown>;
  /** Resolves to the GLB's scene, and rejects if it cannot be fetched or parsed. */
  loadGlb(url: string): Promise<Object3D>;
  /** Default: MODEL_TABLE. */
  table?: readonly ModelChoice[];
  /** Which way each building model's door faces, keyed `pack:name`. Default: BUILDING_FRONTS. */
  fronts?: FrontTable;
  /** Building models that are never placed, keyed `pack:name`. Default: BUILDING_EXCLUDE. */
  exclude?: readonly CalibrationKey[];
  /** The stack-recipe pieces to load too (ticket 050 B), keyed `pack:name`, into `ModelSet.stack`. Default: none, so no extra GLB is fetched. */
  stackKeys?: readonly CalibrationKey[];
  /** The dressing pieces to load too (ticket 052 B), keyed `pack:name`, into `ModelSet.dress`. Default: none, so nothing extra is read from the GLB. */
  dressKeys?: readonly CalibrationKey[];
  /** The ground tiles to load too (ticket 055 C, the dev-only tile city), keyed `pack:name`, into `ModelSet.tile`. Default: none, so nothing extra is read from the GLB. */
  tileKeys?: readonly CalibrationKey[];
  /** The door steps to load too (ticket 055 F), keyed `pack:name`, into `ModelSet.steps`. Default: none, so nothing extra is read from the GLB. */
  stepKeys?: readonly CalibrationKey[];
  /** Resolves to the image at `url` as a texture (ticket 054 B: the City Pack's colourways), and rejects if it cannot be fetched. Default: none, so no colourway is fetched. */
  loadTexture?: (url: string) => Promise<Texture>;
  /** Folder of the manifest, ending in "/". Default: `${BASE_URL}assets/private/out/`. */
  dir?: string;
  /** Where the one line saying why a fallback happened goes. Default: console.info. */
  info?: (message: string) => void;
}

/** Every piece key any stack recipe names, once each: what the town asks the loader for (ticket 050 C). */
export function allStackKeys(): CalibrationKey[] {
  return [...new Set(STACK_STYLES.flatMap((s) => stackKeys(s)))];
}

/** The folder the converter writes to, relative to the site's base. It is a plain string so no bundler sees it. */
export function defaultDir(): string {
  return `${import.meta.env.BASE_URL}assets/private/out/`;
}

/** Make every texture of every material under `root` crisp: pixel art has no smoothing. Idempotent. */
export function nearestTextures(root: Object3D): void {
  root.traverse((o) => {
    const mat = (o as Mesh).material as Material | Material[] | undefined;
    if (!mat) return;
    for (const m of Array.isArray(mat) ? mat : [mat]) {
      for (const v of Object.values(m)) {
        if (!(v instanceof Texture)) continue;
        if (v.magFilter === NearestFilter && v.minFilter === NearestFilter) continue;
        v.magFilter = NearestFilter;
        v.minFilter = NearestFilter;
        v.generateMipmaps = false;
        v.needsUpdate = true;
      }
    }
  });
}

/**
 * Fetch the manifest, plan the table against it, load each GLB the plan needs, and find each planned root in it.
 * Resolves to NO_MODELS (and says why, once) if the manifest is missing or unreadable; a GLB that fails drops that pack's
 * choices; a root missing from its GLB drops that choice only. Never rejects.
 */
export async function loadModels(deps: LoadDeps): Promise<ModelSet> {
  const info = deps.info ?? ((m: string) => console.info(m));
  const dir = deps.dir ?? defaultDir();
  try {
    let manifest: unknown;
    try {
      manifest = await deps.fetchJson(`${dir}manifest.json`);
    } catch (e) {
      info(`3D models: no manifest at ${dir}manifest.json (${describe(e)}); using the placeholder shapes.`);
      return NO_MODELS;
    }
    if (!isManifest(manifest)) {
      info("3D models: the asset manifest is not the version this build reads; using the placeholder shapes.");
      return NO_MODELS;
    }
    const plan = planModels(manifest as AssetManifest, deps.table ?? MODEL_TABLE, deps.fronts ?? BUILDING_FRONTS);
    const exclude = deps.exclude ?? BUILDING_EXCLUDE;
    if (plan.building && exclude.length > 0) {
      const kept = plan.building.filter((p) => !exclude.includes(calibrationKey(p.pack, p.entry.name)));
      plan.building = kept.length > 0 ? kept : null;
    }
    // A piece named in `exclude` is dropped like a missing one, so the styles that need it fall away (ticket 050 C); `exclude`'s default is BUILDING_EXCLUDE, which names no stack piece.
    const wantStack = (deps.stackKeys ?? []).filter((key) => !exclude.includes(key));
    const stackPlan = wantStack.length > 0 ? planStackPieces(manifest as AssetManifest, wantStack, deps.fronts ?? BUILDING_FRONTS) : null;
    const wantDress = (deps.dressKeys ?? []).filter((key) => !exclude.includes(key));
    const dressPlan = wantDress.length > 0 ? planDress(manifest as AssetManifest, wantDress, deps.fronts ?? BUILDING_FRONTS) : null;
    // The ground tiles (ticket 055 C) are planned like the dressing (a flat 5 x 0 x 5 road tile and a 5 x 0.30 x 5 sidewalk both pass); only a page that asks for them reads any.
    const wantTile = deps.tileKeys ?? [];
    const tilePlan = wantTile.length > 0 ? planDress(manifest as AssetManifest, wantTile, {}) : null;
    // The door steps (ticket 055 F) are planned like the dressing too (1.2 x 0.5 x 0.9 m passes); only a page that asks for them reads any.
    const wantSteps = (deps.stepKeys ?? []).filter((key) => !exclude.includes(key));
    const stepsPlan = wantSteps.length > 0 ? planDress(manifest as AssetManifest, wantSteps, {}) : null;
    const globs = new Set<string>();
    for (const slot of MODEL_SLOTS) for (const p of plan[slot] ?? []) globs.add(p.glb);
    for (const p of stepsPlan ?? []) globs.add(p.glb);
    for (const p of stackPlan ?? []) globs.add(p.glb);
    for (const p of dressPlan ?? []) globs.add(p.glb);
    for (const p of tilePlan ?? []) globs.add(p.glb);
    const roots = new Map<string, Object3D>();
    await Promise.all(
      [...globs].map(async (glb) => {
        try {
          roots.set(glb, await deps.loadGlb(`${dir}${glb}`));
        } catch (e) {
          info(`3D models: could not load ${glb} (${describe(e)}); its models fall back to the placeholder shapes.`);
        }
      }),
    );
    const set: ModelSet = { pole: null, lamp: null, building: null };
    for (const slot of MODEL_SLOTS) {
      for (const p of plan[slot] ?? []) {
        const scene = roots.get(p.glb);
        if (!scene) continue;
        const root = scene.getObjectByName(p.entry.name);
        if (!root) {
          info(`3D models: ${p.entry.name} is not in ${p.glb}; that choice is skipped.`);
          continue;
        }
        nearestTextures(root);
        (set[slot] ??= []).push({ ...p, root });
      }
    }
    if (deps.stackKeys && deps.stackKeys.length > 0) {
      set.stack = null;
      const planned = new Set((stackPlan ?? []).map((p) => calibrationKey(p.pack, p.entry.name)));
      const absent = wantStack.filter((key) => !planned.has(key));
      if (absent.length > 0) info(`3D models: ${absent.length} stack piece(s) are not in the manifest (${absent.slice(0, 3).join(", ")}${absent.length > 3 ? ", ..." : ""}); the styles that need them are dropped.`);
      for (const p of stackPlan ?? []) {
        const scene = roots.get(p.glb);
        if (!scene) continue;
        const root = scene.getObjectByName(p.entry.name);
        if (!root) {
          info(`3D models: ${p.entry.name} is not in ${p.glb}; the stack styles that need it are dropped.`);
          continue;
        }
        nearestTextures(root);
        (set.stack ??= []).push({ ...p, root });
      }
    }
    // The colourway atlases (ticket 054 B): only when stack pieces were asked for and loaded, only the ids the pool names, only with a texture loader; otherwise nothing is fetched.
    if ((set.stack?.length ?? 0) > 0 && deps.loadTexture && stackPlan && stackPlan.length > 0) {
      const found = await loadColourways(manifest as AssetManifest, stackPlan[0]!.pack, dir, deps.loadTexture, info);
      if (found.size > 0) set.colourways = found;
    }
    if (deps.dressKeys && deps.dressKeys.length > 0) {
      set.dress = null;
      // A key missing from the manifest or its GLB drops only its own placements (`dressInput` offers the loaded keys alone).
      for (const p of dressPlan ?? []) {
        const scene = roots.get(p.glb);
        const root = scene?.getObjectByName(p.entry.name);
        if (!root) continue;
        nearestTextures(root);
        (set.dress ??= []).push({ ...p, root });
      }
    }
    if (deps.tileKeys && deps.tileKeys.length > 0) {
      set.tile = null;
      // A key missing from the manifest or its GLB drops only its own cells to the code-drawn fallback (`tileGroup` offers the loaded keys alone).
      for (const p of tilePlan ?? []) {
        const root = roots.get(p.glb)?.getObjectByName(p.entry.name);
        if (!root) continue;
        nearestTextures(root);
        (set.tile ??= []).push({ ...p, root });
      }
      if ((set.tile?.length ?? 0) < deps.tileKeys.length) info(`3D models: ${set.tile?.length ?? 0} of ${deps.tileKeys.length} ground tile pieces loaded; the rest are drawn in code.`);
    }
    if (deps.stepKeys && deps.stepKeys.length > 0) {
      set.steps = null;
      // A steps model missing from the manifest or its GLB is drawn as a plain box instead (`applyModels`).
      for (const p of stepsPlan ?? []) {
        const root = roots.get(p.glb)?.getObjectByName(p.entry.name);
        if (!root) continue;
        nearestTextures(root);
        (set.steps ??= []).push({ ...p, root });
      }
    }
    return set;
  } catch (e) {
    info(`3D models: ${describe(e)}; using the placeholder shapes.`);
    return NO_MODELS;
  }
}

/**
 * Load the pool's colourway atlases that `pack` lists (ticket 054 B), in parallel through `loadTexture`. Only ids in COLOURWAY_POOL (never the base, which needs no file, nor a B tone, an emissive map or a
 * billboard), each once. A texture that fails drops that id with one line; the others are kept. Says once how many of the pool's non-base ids are in. Never rejects.
 */
async function loadColourways(manifest: AssetManifest, pack: string, dir: string, loadTexture: (url: string) => Promise<Texture>, info: (message: string) => void): Promise<Map<string, Texture>> {
  const listed = manifest.packs.find((p) => p.pack === pack)?.colourways ?? [];
  const wanted = COLOURWAY_POOL.filter((id) => id !== "base");
  const out = new Map<string, Texture>();
  if (listed.length === 0) return out;
  const jobs = wanted.flatMap((id) => {
    const cw = listed.find((c) => c.id === id);
    // The id is a pool id, so the only part of the URL that comes from the manifest is the file's path, which stays under the manifest's folder.
    return cw && typeof cw.image === "string" && !cw.image.includes("..") ? [{ id, cw }] : [];
  });
  const loaded = await Promise.all(
    jobs.map(async ({ id, cw }) => {
      try {
        const tex = await loadTexture(`${dir}${cw.image}`);
        tex.userData["colourwayBase"] = cw.base;
        if (tex.name === "") tex.name = `${cw.base}_${id}`;
        return [id, tex] as const;
      } catch (e) {
        info(`3D models: colourway ${id} could not be loaded (${describe(e)}); it is left out.`);
        return null;
      }
    }),
  );
  for (const l of loaded) if (l) out.set(l[0], l[1]);
  info(`3D models: ${pack} colourways: ${out.size} of ${wanted.length} loaded`);
  return out;
}

/**
 * The dressing and furniture pieces as planned models, in the order of `keys`: `planDressPieces`' (a width and a height above zero), plus a flat tile (a width and a depth and no
 * height: the parking lines are 10 x 0 x 5 m), which it skips. A flat tile is otherwise checked the same way (not `scale-suspect`, finite sizes).
 */
function planDress(manifest: AssetManifest, keys: readonly CalibrationKey[], fronts: FrontTable): PlannedModel[] | null {
  const solid = new Map((planDressPieces(manifest, keys, fronts) ?? []).map((p) => [calibrationKey(p.pack, p.entry.name), p] as const));
  const out: PlannedModel[] = [];
  for (const key of keys) {
    const have = solid.get(key);
    if (have) {
      out.push(have);
      continue;
    }
    const parsed = parseCalibrationKey(key);
    const pack = parsed ? manifest.packs.find((q) => q.pack === parsed.pack) : undefined;
    const entry = parsed ? pack?.assets.find((a) => a.name === parsed.name) : undefined;
    if (!pack || !entry || entry.warnings.includes("scale-suspect")) continue;
    const [w, h, d] = sizeOf(entry);
    if (![w, h, d].every((v) => Number.isFinite(v)) || !(w > 0 && d > 0 && h === 0)) continue;
    const bf = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key] : undefined;
    out.push({ pack: pack.pack, glb: pack.glb, entry, front: bf?.front ?? "+z", corner: bf?.corner ? (bf.open ?? "+x") : false, family: meshFamily(pack.assets, entry) });
  }
  return out.length > 0 ? out : null;
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

let shared: Promise<ModelSet> | null = null;
let sharedTile: Promise<ModelSet> | null = null;

/** The real fetch and GLTFLoader, with Josh's saved fronts laid over the code's table first (dev only, ticket 045; a production build never fetches the file). */
function loadPageModels(extra: Pick<LoadDeps, "table" | "tileKeys">): Promise<ModelSet> {
  const fetchJson = async (url: string, init?: { cache: "no-store" }): Promise<unknown> => {
    const r = await fetch(url, init);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as unknown;
  };
  return loadSavedCalibration({ dev: import.meta.env.DEV, fetchJson }).then((saved) => {
    const tables = effectiveFronts({ fronts: BUILDING_FRONTS, exclude: BUILDING_EXCLUDE }, saved);
    // The City Pack's stack pieces load too (ticket 050 C); with no City Pack in the manifest nothing extra is fetched and the set has no stack slot.
    return loadModels({ fetchJson, loadGlb: async (url) => (await new GLTFLoader().loadAsync(url)).scene, loadTexture: (url) => new TextureLoader().loadAsync(url), fronts: tables.fronts, exclude: tables.exclude, stackKeys: allStackKeys(), dressKeys: [...dressKeys(), ...furnitureKeys()], stepKeys: extra.tileKeys ? [] : [STEPS_KEY], ...extra });
  });
}

/** The page's models: fetched once with the real fetch and GLTFLoader, then reused by every map. */
export function sharedModels(): Promise<ModelSet> {
  shared ??= loadPageModels({});
  return shared;
}

/**
 * The dev-only tile city's models (ticket 055 C): the City Pack's stack, dressing and furniture pieces as every map has, plus the ground tiles `tileKeys` names, and
 * nothing else (an empty table: no building, pole or lamp model, so the Town Pack's 110 MB is never fetched for a city that has no puzzle). Fetched once. Only the tile view calls it.
 */
export function sharedTileModels(tileKeys: readonly CalibrationKey[]): Promise<ModelSet> {
  sharedTile ??= loadPageModels({ table: [], tileKeys });
  return sharedTile;
}

/** Forget the page's models (tests). */
export function resetSharedModels(): void {
  shared = null;
  sharedTile = null;
}

/** What the tile city can draw from a loaded set: the loaded tile keys' entries and roots, or null when the set has none (no City Pack, a failed GLB, not asked for). */
export interface TileInput {
  entries: ReadonlyMap<CalibrationKey, AssetEntry>;
  roots: ReadonlyMap<CalibrationKey, Object3D>;
}

export function tileInput(set: ModelSet): TileInput | null {
  if (!set.tile || set.tile.length === 0) return null;
  const entries = new Map<CalibrationKey, AssetEntry>();
  const roots = new Map<CalibrationKey, Object3D>();
  for (const m of set.tile) {
    const key = calibrationKey(m.pack, m.entry.name);
    entries.set(key, m.entry);
    roots.set(key, m.root);
  }
  return { entries, roots };
}

export interface AppliedModels {
  /** Put the placeholders back and drop the clones. */
  remove(): void;
  /** The building clones that were placed (empty when no building model applied): what the `fronts=1` overlay reads. Terrace blocks are not among them (see `terrace`). */
  buildings: readonly BuildingPlacement[];
  /** The terrace blocks that were stood (ticket 051 D), run by run, block by block: empty when there is no City Pack stack (the terrace placeholders stay). */
  terrace: readonly PackedBlock[];
  /** The dressing placed on the stacks (ticket 052 B), in `dressSites` order; empty when there is no dressing or no stack. */
  dress: readonly DressPlacement[];
  /**
   * `packTown`'s result for the terrace runs of the scene, by run id (ticket 057 D: the tile view reads it for `tilePassages`, the gated passages the runs leave); empty when nothing was packed
   * (no City Pack stack, a map with no terrace). A puzzle map ignores it.
   */
  packed: ReadonlyMap<string, PackResult>;
  /** The InstancedMeshes the dressing added (its draw calls); 0 when none. */
  dressCalls: number;
  /** The street furniture and open-lot dressing placed (ticket 052 C), in `furnitureLayout` order; empty when there is none. */
  furniture: readonly FurniturePiece[];
  /** The InstancedMeshes the furniture added (its draw calls); 0 when none. */
  furnitureCalls: number;
  /** The buildings that were sunk or given steps (ticket 055 F), in the order they were stood: whole models and lone stacks first, then the terrace blocks. Empty when nothing was changed. */
  doors: readonly DoorWork[];
  /** The door steps drawn (ticket 055 F), one placement per house that has them; empty when none. */
  steps: readonly DressPlacement[];
}

/** One building sunk to meet the walk, or stood on a rise that its steps make up (ticket 055 F). */
export interface DoorWork {
  key: CalibrationKey;
  kind: "house" | "stack";
  sink_m: number;
  steps: boolean;
  leftOver_m: number;
}

/** A clone of `m` in a wrapper that scales, turns and places it. The clone shares the cache's geometry and materials; nothing can pick it. */
function place(m: LoadedModel, scale: number, x: number, z: number, yaw: number): Group {
  const wrap = new Group();
  wrap.name = `model:${m.entry.name}`;
  wrap.userData["sharedModel"] = true;
  wrap.position.set(x, 0, z);
  wrap.rotation.y = yaw;
  wrap.scale.setScalar(scale);
  const clone = m.root.clone(true);
  clone.traverse((o) => {
    o.raycast = () => {};
  });
  nearestTextures(clone);
  wrap.add(clone);
  return wrap;
}

/** The loaded stack pieces' manifest entries by key: what `assembleStack` reads, so a piece whose root did not load drops the styles that need it. */
export function stackEntries(set: ModelSet): Map<CalibrationKey, AssetEntry> {
  return new Map((set.stack ?? []).map((m) => [calibrationKey(m.pack, m.entry.name), m.entry] as const));
}

/** The loaded stack pieces' roots by key: what `stackGroup` clones. */
export function stackRoots(set: ModelSet): Map<CalibrationKey, Object3D> {
  return new Map((set.stack ?? []).map((m) => [calibrationKey(m.pack, m.entry.name), m.root] as const));
}

/**
 * One placed stack (ticket 050 B): a `Group` named `stack:<style>` whose origin is the lot's front-centre (the stack's frame) and whose children are one
 * wrapper per piece, at the piece's position (metres x WORLD_PER_METRE) and yaw and at WORLD_PER_METRE scale, each holding a clone of the piece's root.
 * The clones share the cached geometry and materials; nothing in the group can be picked. A piece whose root is missing leaves a bare wrapper
 * (so the child count still equals the assembly's), never a throw.
 */
export function stackGroup(stack: Stack, roots: ReadonlyMap<CalibrationKey, Object3D>, lift_m: ReadonlyMap<number, number> = NO_LIFT): Group {
  const group = new Group();
  group.name = `stack:${stack.style}`;
  group.userData["sharedModel"] = true;
  group.raycast = () => {};
  for (const p of stack.pieces) {
    const wrap = new Group();
    wrap.name = `piece:${p.key}`;
    // A ground piece is lifted by its column's lift (ticket 062 B): its door's sill meets the walk once the block has sunk.
    const lift = p.role === "base" ? (lift_m.get(p.column) ?? 0) : 0;
    wrap.position.set(p.x * WORLD_PER_METRE, (p.y + lift) * WORLD_PER_METRE, p.z * WORLD_PER_METRE);
    wrap.rotation.y = p.yaw;
    wrap.scale.setScalar(WORLD_PER_METRE);
    wrap.raycast = () => {};
    const root = roots.get(p.key);
    if (root) {
      const clone = root.clone(true);
      clone.traverse((o) => {
        o.raycast = () => {};
      });
      wrap.add(clone);
    }
    group.add(wrap);
  }
  return group;
}

// ---- colourways (ticket 054 B): a block's walls in another atlas ----

/**
 * What a paint keeps so that nothing is made twice: the clone of each source material per colourway id, and the texture per (id, the replaced map's flipY, colour space, wrap and channel). Made per town
 * (`applyModels`) and per gallery scene, freed with them. A clone shares the colourway texture's image, so the GPU holds one upload per id.
 */
export interface ColourwayCache {
  materials: Map<string, Map<Material, Material>>;
  textures: Map<string, Texture>;
  /** Free the clones and the textures the cache made (never a loaded colourway texture, nor a cached root's material). */
  dispose(): void;
}

export function createColourwayCache(): ColourwayCache {
  const cache: ColourwayCache = {
    materials: new Map(),
    textures: new Map(),
    dispose() {
      for (const byMat of cache.materials.values()) for (const m of byMat.values()) m.dispose();
      for (const t of cache.textures.values()) t.dispose();
      cache.materials.clear();
      cache.textures.clear();
    },
  };
  return cache;
}

/** The colourway atlas `id`, carrying the replaced map's sampling, as one texture per combination. The map keeps nearest filtering and no mipmaps, as every City Pack atlas has. */
function colourwayTexture(source: Texture, like: Texture, id: string, cache: ColourwayCache): Texture {
  const key = `${id}|${like.flipY ? 1 : 0}|${like.colorSpace}|${like.wrapS}|${like.wrapT}|${like.channel}`;
  let tex = cache.textures.get(key);
  if (!tex) {
    tex = source.clone();
    tex.flipY = like.flipY;
    tex.colorSpace = like.colorSpace;
    tex.wrapS = like.wrapS;
    tex.wrapT = like.wrapT;
    tex.channel = like.channel;
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    cache.textures.set(key, tex);
  }
  return tex;
}

/**
 * Draw one stack group in the colourway `id` (ticket 054 B). Each mesh of the group whose material's `map` is the base atlas (named as the colourway's `base`, or one of its numbered colourways such as
 * `_01_A`) gets a clone of that material whose `map` is the colourway's texture; every other material (glass, a material with no map or another one) stays the very same object. The clone is cached
 * per (source material, id), so two blocks in one colourway share it. The group's meshes are clones of the cached roots' (`stackGroup`), so only they change: the cached roots' materials and maps are never
 * written. The base id, or an id the set did not load, changes nothing. Nothing emissive is ever set; a clone keeps its source's emissive as it is. Nothing here touches picking.
 */
export function paintStack(group: Object3D, id: string, set: { colourways?: ReadonlyMap<string, Texture> }, cache: ColourwayCache): void {
  const source = id === "base" ? undefined : set.colourways?.get(id);
  if (!source) return;
  const base = typeof source.userData["colourwayBase"] === "string" ? (source.userData["colourwayBase"] as string) : "PolygonCity_Texture";
  let byMat = cache.materials.get(id);
  if (!byMat) {
    byMat = new Map();
    cache.materials.set(id, byMat);
  }
  const paint = (m: Material): Material => {
    const map = (m as Material & { map?: Texture | null }).map;
    if (!map || !isBaseAtlasName(map.name, base)) return m;
    let c = byMat.get(m);
    if (!c) {
      c = m.clone();
      (c as Material & { map: Texture | null }).map = colourwayTexture(source, map, id, cache);
      byMat.set(m, c);
    }
    return c;
  };
  group.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.isMesh !== true) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(paint) : paint(mesh.material);
  });
}

// ---- the dressing (ticket 052 B): the pure placements of `dressing.ts`, drawn as one InstancedMesh per key and sub-mesh ----

/** What dressing a loaded set can offer: the loaded keys' entries, the fronts the table names (a "+z" line is the default, so it is left out), and the roots. */
export interface DressInput {
  entries: ReadonlyMap<CalibrationKey, AssetEntry>;
  fronts: FrontTable;
  roots: ReadonlyMap<CalibrationKey, Object3D>;
}

/** The dressing input of a loaded set, or null when it has no dressing piece (no City Pack, a failed GLB, not asked for): then the town is exactly what it was. */
export function dressInput(set: ModelSet): DressInput | null {
  if (!set.dress || set.dress.length === 0) return null;
  const fronts: Record<CalibrationKey, BuildingFront> = {};
  const entries = new Map<CalibrationKey, AssetEntry>();
  const roots = new Map<CalibrationKey, Object3D>();
  for (const m of set.dress) {
    const key = calibrationKey(m.pack, m.entry.name);
    entries.set(key, m.entry);
    roots.set(key, m.root);
    if (m.front !== "+z") fronts[key] = { front: m.front };
  }
  return { entries, fronts, roots };
}

/** Where a stack group stands in the world: its origin (the lot's front-centre) and its turn about y. `y` (ticket 055 F: how far the block was sunk) is absent for a block that stands on the walk. */
export interface DressFrame {
  x: number;
  z: number;
  yaw: number;
  y?: number;
}

/** One piece of dressing in its stack's frame, and that frame. */
export interface DressPlacement {
  frame: DressFrame;
  piece: DressPiece;
}

const UP = new Vector3(0, 1, 0);
const tmpP = new Vector3();
const tmpS = new Vector3();
const tmpQ = new Quaternion();
const tmpA = new Matrix4();
const tmpB = new Matrix4();

/**
 * The world matrix of a piece of dressing: its frame (a stack group's position and yaw), then the piece's own place in metres at WORLD_PER_METRE and its yaw, at
 * WORLD_PER_METRE scale. It is the matrix `stackGroup` gives a stack piece's wrapper, for a dressing piece, so a prop sits where the pure placement says.
 */
export function dressMatrix(frame: DressFrame, piece: Pick<DressPiece, "x" | "y" | "z" | "yaw"> & { scaleY?: number }, out: Matrix4 = new Matrix4()): Matrix4 {
  const s = WORLD_PER_METRE;
  tmpA.compose(tmpP.set(frame.x, frame.y ?? 0, frame.z), tmpQ.setFromAxisAngle(UP, frame.yaw), tmpS.set(1, 1, 1));
  tmpB.compose(tmpP.set(piece.x * s, piece.y * s, piece.z * s), tmpQ.setFromAxisAngle(UP, piece.yaw), tmpS.set(s, s * (piece.scaleY ?? 1), s));
  return out.multiplyMatrices(tmpA, tmpB);
}

const AXIS_Z = new Vector3(0, 0, 1);
/** A code-drawn box (ticket 058) as a matrix in its piece's frame, metres: a unit cube centred on its place, sized, and turned about z (a stringer). */
export function partMatrix(part: Pick<EscapePart, "x" | "y" | "z" | "w" | "h" | "d" | "rz">, out: Matrix4 = new Matrix4()): Matrix4 {
  return out.compose(tmpP.set(part.x, part.y, part.z), tmpQ.setFromAxisAngle(AXIS_Z, part.rz ?? 0), tmpS.set(part.w, part.h, part.d));
}

/** The colour of the code-drawn fire escapes' boxes: the pack escape's dark steel. */
const ESCAPE_STEEL = 0x30343b;

/** One site to dress: a stack, its lot's key and height cap, the run it counts in, where it stands, and how far its front is from the road's edge. */
export interface DressSite extends DressBlockInput {
  frame: DressFrame;
}

/**
 * The stacks of a town as dressing sites, in the order `dressTown` threads its caps: each terrace run's packed blocks in run order, then each stack standing on a
 * lot. Terrace blocks count in their terrace run; stacks on lots in the street side they face. A run's lowest block (its shortest stack, the first of equals) is
 * the one a novelty sign may stand on. Every ordinary lot and terrace block faces a road at the pavement and setback, so the kerb is `KERB_FROM_FRONT_M` for all
 * (a service run's frontage, 2.08 m, is only ever a place's, and a place is not stacked).
 *
 * `frames` (ticket 055 E): a run's pavement frame (`TerraceRun.frame`) by run id. A terrace block of a run that has one carries it in its site's `run.frame`, where `dressBlock` reads it (it
 * wins over `kerbM`), so a kerb-side piece stands on the tile city's 5 m pavement and not 3.33 m from the front. With none (the ladder maps), every site is exactly as it was.
 */
export function dressSites(terrace: readonly PackedBlock[], placements: readonly BuildingPlacement[], lots: readonly Lot[], frames: ReadonlyMap<string, TerraceRun["frame"]> = new Map()): DressSite[] {
  const raw: { stack: Stack; lot: Pick<Lot, "key" | "hMax">; run: string; frame: DressFrame }[] = [];
  for (const b of terrace) {
    const half = b.lot.d / 2;
    raw.push({ stack: b.stack, lot: { key: b.lot.key, hMax: b.lot.hMax }, run: b.lot.terrace?.run ?? `terrace:${b.lot.street}:${b.lot.side}`, frame: { x: b.lot.x + Math.sin(b.lot.yaw) * half, z: b.lot.z + Math.cos(b.lot.yaw) * half, yaw: b.lot.yaw } });
  }
  for (const p of placements) {
    const lot = lots[p.lot];
    if (!p.stack || !lot) continue;
    const half = (p.stack.depth_m * WORLD_PER_METRE) / 2;
    raw.push({ stack: p.stack, lot: { key: lot.key, hMax: lot.hMax }, run: `lots:${lot.street}:${lot.side}`, frame: { x: p.x + Math.sin(p.yaw) * half, z: p.z + Math.cos(p.yaw) * half, yaw: p.yaw } });
  }
  const count = new Map<string, number>();
  const lowest = new Map<string, number>();
  const index: number[] = [];
  raw.forEach((r, k) => {
    const i = count.get(r.run) ?? 0;
    index.push(i);
    count.set(r.run, i + 1);
    const low = lowest.get(r.run);
    if (low === undefined || r.stack.height_m < raw[low]!.stack.height_m) lowest.set(r.run, k);
  });
  return raw.map((r, k) => {
    const pave = frames.get(r.run);
    return { stack: r.stack, lot: r.lot, run: { id: r.run, index: index[k]!, lowest: lowest.get(r.run) === k, ...(pave ? { frame: pave } : {}) }, kerbM: KERB_FROM_FRONT_M, frame: r.frame };
  });
}

/**
 * Take the dressing of lifted ground pieces up with them (ticket 062 B; pure): a placement whose slot is on a ground piece (a shop's glass, an awning or door canopy, a sign, the ATM beside a door) rises by the
 * lift of its column on its site (`lifts`, by the site's frame object); every other placement, a floor's, a roof's and the fire escapes, is returned as it is.
 */
export function liftDressing(placements: readonly DressPlacement[], lifts: ReadonlyMap<DressFrame, ReadonlyMap<number, number>>): DressPlacement[] {
  return placements.map((p) => {
    const lift = GROUND_DRESS.has(p.piece.slot) ? (lifts.get(p.frame)?.get(p.piece.column) ?? 0) : 0;
    return lift > 0 ? { ...p, piece: { ...p.piece, y: p.piece.y + lift } } : p;
  });
}

/** The placements of a set of sites, flattened in site order (pure: `dressTown`'s caps along each run). A piece whose key is not in `entries` is simply not placed. */
export function dressPlacements(sites: readonly DressSite[], entries: ReadonlyMap<CalibrationKey, AssetEntry>, fronts: FrontTable = {}, opts: DressTownOptions = {}): DressPlacement[] {
  const dressed = dressTown(sites, entries, fronts, opts);
  const out: DressPlacement[] = [];
  sites.forEach((s, i) => {
    for (const piece of dressed[i] ?? []) out.push({ frame: s.frame, piece });
  });
  return out;
}

// ---- street furniture and open lots (ticket 052 C) ----

const GROUND_LIFT_M = 0.01;
const NO_FRAME: DressFrame = { x: 0, z: 0, yaw: 0 };

/**
 * Where the furniture stands (ticket 055 E): the height, metres, of the pavement layer and of the yard layer (the ground under a lot's pieces and an alley's). Absent: the ladder's
 * (`PAVEMENT_Y` and `YARD_H` over `WORLD_PER_METRE`: 4.4 cm and 2.2 cm). The tile city's walk is at 0 (design item 7), so it asks for 0 on its pavements.
 */
export interface FurnitureLevels {
  pavement_m?: number;
  yard_m?: number;
}

/** A piece of furniture as a placement the dressing instancer draws: world position to metres, standing on its ground layer (a flat tile a hair above it, so it does not fight the ground). */
export function furniturePlacement(p: FurniturePiece, levels: FurnitureLevels = {}): DressPlacement {
  const ground = p.ground === "pavement" ? (levels.pavement_m ?? PAVEMENT_Y / WORLD_PER_METRE) : (levels.yard_m ?? YARD_H / WORLD_PER_METRE);
  const base = ground + (p.flat ? GROUND_LIFT_M : 0) + p.lift;
  return { frame: NO_FRAME, piece: { key: p.key, slot: "wall", x: p.x / WORLD_PER_METRE, y: base, z: p.z / WORLD_PER_METRE, yaw: p.yaw, column: 0, w: p.w, h: p.h, d: p.d } };
}

/** The footprint of a piece of building dressing on the ground, world units, and the height of its base, metres: what a tall item of furniture keeps out from under. */
export function avoidBoxOf(pl: DressPlacement): AvoidBox {
  const s = WORLD_PER_METRE;
  const c = Math.cos(pl.frame.yaw);
  const n = Math.sin(pl.frame.yaw);
  const x = pl.frame.x + (pl.piece.x * c + pl.piece.z * n) * s;
  const z = pl.frame.z + (-pl.piece.x * n + pl.piece.z * c) * s;
  const hx = ((Math.abs(c) * pl.piece.w + Math.abs(n) * pl.piece.d) / 2) * s;
  const hz = ((Math.abs(n) * pl.piece.w + Math.abs(c) * pl.piece.d) / 2) * s;
  return { minX: x - hx, minZ: z - hz, maxX: x + hx, maxZ: z + hz, y: pl.piece.y };
}

function boxRect(o: Object3D): Rect | null {
  o.updateWorldMatrix(true, false);
  const b = new Box3().setFromObject(o);
  return b.isEmpty() ? null : { minX: b.min.x, minZ: b.min.z, maxX: b.max.x, maxZ: b.max.z };
}

/**
 * What the furniture layout reads of a scene (the town is not on the bundle, and 052 may not edit the scene): the terrace runs that were packed, the lots, the parking lots and plazas
 * found from the runs (`openLotsOf`), each run's alley (`alleyOf`, from the packer's far gap), the circuit's poles, lamps, nodes, drops, pads and wire spans (to keep out of), and the building
 * dressing's footprints. A run that packed no block (its placeholders stay) gets no furniture.
 */
export function furnitureInput(bundle: SceneBundle, packed: ReadonlyMap<string, PackResult>, dress: readonly DressPlacement[]): FurnitureInput {
  const { slots } = bundle;
  const lots = slots.blocks.list;
  const all = slots.blocks.terraces ?? [];
  const runs = all.filter((r) => (packed.get(r.id)?.blocks.length ?? 0) > 0);
  const alleys = new Map<string, Alley>();
  for (const r of runs) {
    const res = packed.get(r.id)!;
    const a = alleyOf(r, res.blocks[res.blocks.length - 1]?.lot ?? null, res.farGap_m, res.farOverhang_m, ALLEY_MIN_M, ALLEY_MAX_M);
    if (a) alleys.set(r.id, a);
  }
  const keepPoints = [
    ...slots.poles.spots.map((p) => ({ x: p.x, z: p.z })),
    ...slots.lamps.map((l) => ({ x: l.group.position.x, z: l.group.position.z })),
    // The nodes' groups are the scene's own children (the models, terrace and dressing groups are marked shared).
    ...bundle.scene.children.filter((o) => o.type === "Group" && o.userData["sharedModel"] !== true).map((o) => ({ x: o.position.x, z: o.position.z })),
  ];
  const keepRects: Rect[] = [];
  for (const m of bundle.streets.pads) {
    const r = boxRect(m);
    if (r) keepRects.push(r);
  }
  const wireRects: Rect[] = [];
  for (const w of bundle.wires.values()) {
    const r = boxRect(w.whole);
    if (r) wireRects.push(r);
  }
  return {
    runs,
    lots,
    openLots: openLotsOf(all, lots),
    alleys,
    keepPoints,
    keepSegments: bundle.hardware.dropList.map((d) => [{ x: d.from.x, z: d.from.z }, { x: d.to.x, z: d.to.z }] as const),
    keepRects,
    wireRects,
    avoid: dress.filter((p) => p.piece.slot !== "glass").map(avoidBoxOf),
  };
}

/** The mesh nodes of a model's root, each with the matrix that takes its own frame to the root's parent (the root's own local matrix included, as a clone in a wrapper has it). */
export function meshParts(root: Object3D): { mesh: Mesh; local: Matrix4 }[] {
  const out: { mesh: Mesh; local: Matrix4 }[] = [];
  const walk = (o: Object3D, acc: Matrix4): void => {
    if (!o.visible) return;
    if ((o as Mesh).isMesh === true && !(o as InstancedMesh).isInstancedMesh) out.push({ mesh: o as Mesh, local: acc });
    for (const c of o.children) walk(c, new Matrix4().multiplyMatrices(acc, c.matrix));
  };
  root.updateMatrix();
  walk(root, root.matrix.clone());
  return out;
}

const GLASS_KEYS: ReadonlySet<CalibrationKey> = new Set(SHOP_GLASS);

/** What `dressGroup` made: the group to add, how many InstancedMeshes (draw calls) it holds, and what frees what it owns (never the cached models' geometry or textures). */
export interface DressDraw {
  group: Group;
  calls: number;
  /** The code-drawn boxes (ticket 058: a pack escape's ladder to the walk, a whole escape drawn in code) are one more InstancedMesh, hung under the first mesh of `group` (so `group` keeps one child per drawn mesh); 1 when drawn, else 0. Not counted in `calls`, except when `group` has no mesh to hang it from. */
  boxCalls: number;
  dispose(): void;
}

/**
 * Draw placements of dressing (ticket 052 B). One `InstancedMesh` per (key, sub-mesh) of every key that has a placement, in a group named `city-dressing`; an instance's
 * matrix is `dressMatrix(frame, piece)` times the sub-mesh's own matrix in its root. No instance takes a ray (`raycast` is a no-op on the group and every mesh), nothing is
 * animated, and nothing is emissive: a material that carries emission is swapped for a clone with none, and the shop glass shares one dark, slightly glossy, see-through
 * material. Geometry and every other material are the cached roots' (the group is `sharedModel`, so the scene's disposal leaves them alone). More than `maxCalls` InstancedMeshes
 * would be too many draw calls: the keys with the fewest instances are left out first. A key with no root, or no mesh in it, draws nothing.
 * A piece may carry a y-scale (a fire escape's, ticket 058: `dressMatrix` applies it) and boxes of its own (`DressPiece.parts`: the first landing's ladder down to the walk, or a whole escape
 * drawn in code, `CODE_ESCAPE_KEY`): every box of every placement is one more InstancedMesh, hung under the escape's mesh, so the group keeps one child per drawn mesh (`DressDraw.boxCalls`).
 */
export function dressGroup(placements: readonly DressPlacement[], roots: ReadonlyMap<CalibrationKey, Object3D>, maxCalls: number = DRESS_DRAW_CALLS_MAX): DressDraw {
  const group = new Group();
  group.name = "city-dressing";
  group.userData["sharedModel"] = true;
  group.raycast = () => {};
  const byKey = new Map<CalibrationKey, DressPlacement[]>();
  for (const p of placements) {
    const list = byKey.get(p.piece.key);
    if (list) list.push(p);
    else byKey.set(p.piece.key, [p]);
  }
  const owned: Material[] = [];
  const geometries: BoxGeometry[] = [];
  const meshes: InstancedMesh[] = [];
  const swapped = new Map<Material, Material>();
  let glass: Material | null = null;
  const glassMaterial = (): Material => {
    if (!glass) {
      glass = new MeshStandardMaterial({ color: new Color(0x1b2733), roughness: 0.25, metalness: 0.4, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false });
      owned.push(glass);
    }
    return glass;
  };
  const plain = (m: Material): Material => {
    const lit = m as Material & { emissive?: Color; emissiveMap?: Texture | null };
    if (!lit.emissive || (lit.emissive.getHex() === 0 && !lit.emissiveMap)) return m;
    let c = swapped.get(m);
    if (!c) {
      c = m.clone();
      const dark = c as typeof lit;
      dark.emissive?.setHex(0);
      dark.emissiveMap = null;
      swapped.set(m, c);
      owned.push(c);
    }
    return c;
  };
  const m = new Matrix4();
  const keys = [...byKey.keys()]
    .map((key) => ({ key, parts: meshParts(roots.get(key) ?? new Group()), list: byKey.get(key)! }))
    .filter((k) => k.parts.length > 0)
    .sort((a, b) => b.list.length - a.list.length || (a.key < b.key ? -1 : 1));
  let calls = 0;
  const drawnKeys = new Set<CalibrationKey>();
  for (const { key, parts, list } of keys) {
    if (calls + parts.length > maxCalls) continue;
    drawnKeys.add(key);
    for (const part of parts) {
      const src = part.mesh.material as Material | Material[];
      const material = GLASS_KEYS.has(key) ? glassMaterial() : Array.isArray(src) ? src.map(plain) : plain(src);
      const im = new InstancedMesh(part.mesh.geometry, material, list.length);
      im.name = `dress:${key.slice(key.indexOf(":") + 1)}`;
      im.raycast = () => {};
      list.forEach((p, i) => im.setMatrixAt(i, m.multiplyMatrices(dressMatrix(p.frame, p.piece), part.local)));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      group.add(im);
      meshes.push(im);
      calls++;
    }
  }
  // The code-drawn parts (ticket 058: a pack escape's ladder down to the walk, or a whole escape drawn in code), every box of every placement in one InstancedMesh: one draw call, whatever the count.
  // A box's matrix is its piece's (at scale 1 in y: the piece's own y-scale is the pack mesh's) times its own. A code-drawn escape needs no model; a pack piece's ladder boxes are drawn only with the piece.
  const boxed = placements.filter((p) => p.piece.parts !== undefined && (p.piece.key === CODE_ESCAPE_KEY || drawnKeys.has(p.piece.key)));
  let boxCalls = 0;
  let boxes = 0;
  for (const p of boxed) boxes += p.piece.parts!.length;
  if (boxes > 0) {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshStandardMaterial({ color: new Color(ESCAPE_STEEL), roughness: 0.65, metalness: 0.35 });
    owned.push(material);
    const im = new InstancedMesh(geometry, material, boxes);
    im.name = "dress:escape-code";
    im.raycast = () => {};
    let i = 0;
    for (const p of boxed) {
      const base = dressMatrix(p.frame, { x: p.piece.x, y: p.piece.y, z: p.piece.z, yaw: p.piece.yaw });
      for (const part of p.piece.parts!) im.setMatrixAt(i++, m.multiplyMatrices(base, partMatrix(part)));
    }
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    // Under the escape's own mesh when there is one (an instanced mesh's own matrix is the identity, so its child draws in the group's frame).
    const host = group.children.find((c) => c.name === "dress:SM_Bld_FireEscape_03") ?? group.children[0];
    if (host) host.add(im);
    else {
      group.add(im);
      calls++;
    }
    boxCalls = 1;
    meshes.push(im);
    geometries.push(geometry);
  }
  return {
    group,
    calls,
    boxCalls,
    dispose() {
      for (const im of meshes) im.dispose();
      for (const o of owned) o.dispose();
      for (const g of geometries) g.dispose();
      owned.length = 0;
      geometries.length = 0;
      meshes.length = 0;
    },
  };
}

const at = (list: readonly LoadedModel[], key: string): LoadedModel => list[pickIndex(stableHash(key), list.length)]!;

/**
 * One building clone: which lot, which model, and where it stands. Its scale is WORLD_PER_METRE on every axis. (x, z) is the model's base
 * centre, moved off the lot's centre toward its front so the model's front face is against the lot's front edge (`atFront`).
 */
export interface BuildingPlacement {
  lot: number;
  model: LoadedModel;
  scale: number;
  x: number;
  z: number;
  /** `lot.yaw + frontYaw(front)`: the lot turns its front to the road, the model's declared front (BUILDING_FRONTS) turns its door to the lot's front. */
  yaw: number;
  /**
   * Ticket 050 C: set when the lot stands a City Pack stack instead of one model. Then `model` is a stand-in that carries the stack's size (its bounds, for the fronts overlay) and
   * an empty root, `front` is "+z" (a stack's frame faces the road), `scale` is WORLD_PER_METRE, (x, z) is the stack's footprint centre as `atFront` gives it, and `yaw` is `lot.yaw`.
   */
  stack?: Stack;
}

/** The loaded stack pieces' manifest entries and effective fronts: what the town needs to plan and assemble stacks (ticket 050 C). */
export interface StackInput {
  entries: ReadonlyMap<CalibrationKey, AssetEntry>;
  fronts: FrontTable;
}

/**
 * The stack input of a loaded set, or null when it has no stack pieces (no City Pack, a failed GLB, not asked for): then the town is exactly what it was.
 * The fronts are the ones the pieces were planned with, so Josh's saved calibration is already in them.
 */
export function stackInput(set: ModelSet): StackInput | null {
  if (!set.stack || set.stack.length === 0) return null;
  const fronts: Record<CalibrationKey, BuildingFront> = {};
  for (const m of set.stack) fronts[calibrationKey(m.pack, m.entry.name)] = { front: m.front, ...(m.corner ? { corner: true as const, open: m.corner } : {}) };
  return { entries: stackEntries(set), fronts };
}

/** A stand-in `LoadedModel` for a stack (see `BuildingPlacement.stack`): the stack's size as bounds, an empty root, the family the variety rules use. */
function stackModel(stack: Stack): LoadedModel {
  const w = stack.width_m;
  const d = stack.depth_m;
  return {
    pack: "city-pack",
    glb: "",
    entry: { name: `stack:${stack.style}`, source: "", bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, stack.height_m, d / 2] }, triangles: 0, textures: [], missingTextures: [], warnings: [] },
    front: "+z",
    corner: false,
    family: stackFamily(stack.style),
    root: new Group(),
  };
}

/** How far a stack's pieces reach past its columns on a side (the far-end overhang the packer measured), metres. */
function reach(stack: Stack, side: "-x" | "+x"): number {
  let m = 0;
  for (const p of stack.pieces) m = Math.max(m, side === "+x" ? p.x + p.w / 2 - stack.width_m / 2 : -(p.x - p.w / 2) - stack.width_m / 2);
  return m;
}

/**
 * True when `b` is `a` with other ground pieces (ticket 062 B): the same columns, floors and width, the same reach past the columns at both ends (so the packer's far gap and overhang still hold), and every piece above
 * the ground row the same piece in the same place in x and y. Not in z: a back-aligned stack (the ladder maps') stands every back face on one line and its frontmost face on the lot's front line, so a ground piece of
 * another depth moves its floors and its roof in z (`zShift`, up to 0.4 m with today's pieces); a wall-aligned stack (the tile city's) does not move.
 */
export function sameAboveGround(a: Stack, b: Stack): boolean {
  if (a.bays !== b.bays || a.floors !== b.floors || Math.abs(a.width_m - b.width_m) > 1e-9 || a.columns.length !== b.columns.length) return false;
  if (Math.abs(reach(a, "-x") - reach(b, "-x")) > 1e-9 || Math.abs(reach(a, "+x") - reach(b, "+x")) > 1e-9) return false;
  const up = (s: Stack): StackPiece[] => s.pieces.filter((p) => p.role !== "base");
  const x = up(a);
  const y = up(b);
  return x.length === y.length && x.every((p, i) => p.key === y[i]!.key && p.column === y[i]!.column && Math.abs(p.x - y[i]!.x) < 1e-9 && Math.abs(p.y - y[i]!.y) < 1e-9);
}

/** How far the pieces above the ground row of `b` stand from where they stand in `a` in z, metres (zero for a wall-aligned stack): the largest over the pieces, for two stacks that are `sameAboveGround`. */
export function zShift(a: Stack, b: Stack): number {
  const x = a.pieces.filter((p) => p.role !== "base");
  const y = b.pieces.filter((p) => p.role !== "base");
  return x.reduce((m, p, i) => Math.max(m, Math.abs(p.z - (y[i]?.z ?? p.z))), 0);
}

/** The keys a style's ground row is picked from. */
const groundKeysOf = (style: StackStyle): CalibrationKey[] => [...style.base.mid, ...(style.base.door ?? []), ...style.base.corner];

/**
 * A stack whose lifted ground pieces would reach their first floor's window sill, assembled again within one sill band (ticket 062 B, `fitSillBand`). `again` assembles the same stack with the band's keys as its ground
 * candidates; a result that differs above the ground row (another width, other floors) is not taken.
 */
export function bandedStack(stack: Stack, style: StackStyle, table: SillTable, salt: string, again: (band: ReadonlySet<CalibrationKey>) => Stack | null): Stack {
  return fitSillBand(stack, table, groundKeysOf(style), salt, (band) => {
    const b = again(band);
    return b && sameAboveGround(stack, b) ? b : null;
  });
}

/**
 * The clone every lot gets: a model of the lot's type (a lot of a type with no model gets none and keeps its placeholder),
 * picked by family (`pickBuildings`: no neighbour's family, no street repeat, no family over its share; a corner shop only on a corner lot). Pure given the set.
 *
 * With `stack` (ticket 050 C) the City Pack's stacks come first on the types in STACK_LOT_TYPES (`buildingPlan`): such a lot gets one assembled stack, with a corner column on
 * each of its `cornerSides` (a corner building, two street faces) or, if that cannot be assembled, a mid-row stack of the same style (an ordinary building, as any model may
 * stand on a corner). Without it (or with no stack piece loaded) the result is exactly what it was.
 */
/**
 * The packer's result with every block whose lifted ground pieces would reach their first floor's window sill assembled again within one sill band (ticket 062 B; pure). `terrace.ts` assembles with no band and is not
 * given one, so this pass runs on what `packTown` gave: the same lot, floors and columns, a ground row picked from one band, taken only where everything above the ground row is the same (`sameAboveGround`). `applyModels`
 * draws these blocks and hands them back as `applied.packed`, and the pure plan (metrics, frontage, the passage floors) is made from them, so what is checked is what is drawn. `align` is the packer's (default: each run's own).
 */
export function bandPacked(packed: ReadonlyMap<string, PackResult>, runs: readonly TerraceRun[], entries: ReadonlyMap<CalibrationKey, AssetEntry>, fronts: FrontTable, table: SillTable = DOOR_SILLS, align?: StackAlign): Map<string, PackResult> {
  const out = new Map<string, PackResult>();
  for (const [id, res] of packed) {
    const run = runs.find((r) => r.id === id);
    let changed = false;
    const blocks = res.blocks.map((b): PackedBlock => {
      const style = STACK_STYLES.find((st) => st.id === b.style);
      if (!style || !run) return b;
      const cap = Math.round((b.lot.hMax / WORLD_PER_METRE) * 1e6) / 1e6;
      const lot = { type: b.lot.type, key: b.lot.key, cornerSides: b.lot.cornerSides };
      const again = (sillBand: ReadonlySet<CalibrationKey>): Stack | null => assembleStack(style, lot, entries, fronts, { spec: { frontage: 40, depth: TERRACE_DEPTH_M, cap }, bays: b.bays, floors: b.floors, align: align ?? alignOf(run), sillBand });
      const fitted = bandedStack(b.stack, style, table, `${b.lot.key}${style.id}`, again);
      if (fitted === b.stack) return b;
      changed = true;
      return { ...b, stack: fitted };
    });
    out.set(id, changed ? { ...res, blocks } : res);
  }
  return out;
}

export function buildingPlacements(lots: readonly Lot[], buildings: readonly LoadedModel[] | null, stack: StackInput | null = null, sills?: SillTable): BuildingPlacement[] {
  const models = buildings ?? [];
  const offers = stack ? offeredStacks(stack.entries, stack.fronts) : [];
  if (models.length === 0 && offers.length === 0) return [];
  const byName = new Map(models.map((m) => [m.entry.name, m] as const));
  // A terrace lot (051 B) is stood by its run's packed stacks (`applyModels`), never by a whole model: `pickBuildings` does not see it, so it is not among `large`'s families.
  const idx: number[] = [];
  lots.forEach((l, i) => {
    if (!l.terrace) idx.push(i);
  });
  const own = idx.map((i) => lots[i]!);
  const names = pickBuildings(own, buildingPlan(models, undefined, offers), traitsOf(models, offers));
  const out: BuildingPlacement[] = [];
  own.forEach((lot, k) => {
    const i = idx[k]!;
    const style = names[k] ? stackStyleOf(names[k]!) : null;
    if (style !== null && stack) {
      const recipe = STACK_STYLES.find((s) => s.id === style);
      let built = recipe ? (assembleStack(recipe, lot, stack.entries, stack.fronts) ?? assembleStack(recipe, { ...lot, cornerSides: [] }, stack.entries, stack.fronts)) : null;
      if (!built || !recipe) return;
      // With the measured sills (ticket 062 B): where a lifted ground piece would reach its first floor's window sill, the ground row keeps to one sill band.
      if (sills) {
        const first = built;
        const corners = first.cornerSides.length > 0;
        built = bandedStack(first, recipe, sills, `${lot.key}${recipe.id}`, (sillBand) => assembleStack(recipe, corners ? lot : { ...lot, cornerSides: [] }, stack.entries, stack.fronts, { sillBand }));
      }
      const spot = atFront(lot, built.depth_m * WORLD_PER_METRE);
      out.push({ lot: i, model: stackModel(built), scale: WORLD_PER_METRE, x: spot.x, z: spot.z, yaw: lot.yaw, stack: built });
      return;
    }
    const m = names[k] ? byName.get(names[k]!) : undefined;
    if (!m) return;
    const scale = modelScale(m.entry, "building");
    // The model's footprint depth across the road is its own depth, or its width when its front is a quarter turn away.
    const [w, , d] = sizeOf(m.entry);
    const depth = (frontIsQuarter(m.front) ? w : d) * scale;
    const spot = atFront(lot, depth);
    out.push({ lot: i, model: m, scale, x: spot.x, z: spot.z, yaw: lot.yaw + frontYaw(m.front) });
  });
  return out;
}

/** The height a building of scale `scale` stands at when it is sunk `sink_m` metres: below the walk by that much, and exactly 0 (never -0) when it is not sunk. */
function lowered(sink_m: number, scale: number): number {
  return sink_m > 0 ? -sink_m * scale : 0;
}

/**
 * Where the door steps of a house stand (ticket 055 F): in the placement's frame (the model's own, in metres), `steps` is in the front frame (along the front, out from the front face), which
 * `modelPoint` turns into the model's x and z. The steps stand on the walk (world y 0, the model itself being sunk), turned to face the lot's road, and scaled in y alone to the rise left over.
 */
export function stepsPlacement(model: Pick<LoadedModel, "entry" | "front">, at: Pick<BuildingPlacement, "x" | "z" | "yaw">, steps: NonNullable<SillPlan["steps"]>): DressPlacement {
  const b = model.entry.bounds;
  const f = model.front;
  const half = f === "+z" ? b.max[2] : f === "-z" ? -b.min[2] : f === "+x" ? b.max[0] : -b.min[0];
  const pt = modelPoint(f, steps.x_m, half + steps.z_m);
  return { frame: { x: at.x, z: at.z, yaw: at.yaw }, piece: { key: STEPS_KEY, slot: "wall", x: pt.x, y: 0, z: pt.z, yaw: stepsYaw(f), column: 0, w: STEPS_W_M, h: STEPS_RISE_M * steps.scaleY, d: STEPS_D_M, scaleY: steps.scaleY } };
}

/**
 * Draw the door steps (ticket 055 F): the pack's model as one InstancedMesh per sub-mesh when `root` is given (the dressing's instancer, so nothing takes a ray and nothing is lit), else, with no model
 * loaded (a fresh checkout, CI), one InstancedMesh of plain boxes of the same size in the lot's ground colour. Either way the group is named `door-steps` and shared with no scene disposal; `dispose()`
 * frees what it owns (never the cached model's geometry or textures).
 */
export function stepsGroup(placements: readonly DressPlacement[], root: Object3D | undefined): DressDraw {
  if (root) {
    const drawn = dressGroup(placements, new Map([[STEPS_KEY, root]]), DRESS_DRAW_CALLS_MAX);
    if (drawn.calls > 0) {
      drawn.group.name = "door-steps";
      return drawn;
    }
    drawn.dispose();
  }
  const group = new Group();
  group.name = "door-steps";
  group.userData["sharedModel"] = true;
  group.raycast = () => {};
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({ color: new Color(YARD), roughness: 1 });
  const im = new InstancedMesh(geometry, material, placements.length);
  im.name = "dress:steps-box";
  im.raycast = () => {};
  const size = new Matrix4();
  const m = new Matrix4();
  placements.forEach((p, i) => {
    // The box's centre is half its height over the steps' base, in the piece's frame; its size is the steps' own, in metres, at the same WORLD_PER_METRE as every model.
    const base = dressMatrix(p.frame, { x: p.piece.x, y: p.piece.y + p.piece.h / 2, z: p.piece.z, yaw: p.piece.yaw });
    im.setMatrixAt(i, m.multiplyMatrices(base, size.makeScale(p.piece.w, p.piece.h, p.piece.d)));
  });
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  group.add(im);
  return {
    group,
    calls: 1,
    boxCalls: 0,
    dispose() {
      im.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}

const ZERO = new Matrix4().makeScale(0, 0, 0);

/**
 * Take the placeholder boxes of the terrace lots in `covered` out of sight (ticket 051 D). `scene.ts` draws all terrace placeholders in one group of four instanced meshes
 * (bodies, bands, flat roofs, pitched roofs), in the order of the terrace lots; a lot's instances are found from `pickPlaceholders`, which made them. When every terrace lot is
 * covered the group is hidden whole. Pushes what undoes it to `undo`.
 */
function blankTerracePlaceholders(slots: ModelSlots, covered: ReadonlySet<number>, undo: (() => void)[]): void {
  const group = slots.blocks.placeholder.getObjectByName("placeholders:terrace");
  if (!group) return;
  const lots = slots.blocks.list;
  const mine: number[] = [];
  lots.forEach((l, i) => {
    if (l.terrace) mine.push(i);
  });
  if (mine.length === 0 || !mine.some((i) => covered.has(i))) return;
  if (mine.every((i) => covered.has(i))) {
    const was = group.visible;
    group.visible = false;
    undo.push(() => {
      group.visible = was;
    });
    return;
  }
  const meshes = group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
  if (meshes.length !== 4) return;
  const [bodies, bands, flats, slopes] = meshes as [InstancedMesh, InstancedMesh, InstancedMesh, InstancedMesh];
  const specs = pickPlaceholders(lots);
  const blank = (mesh: InstancedMesh, i: number): void => {
    const was = new Matrix4();
    mesh.getMatrixAt(i, was);
    mesh.setMatrixAt(i, ZERO);
    mesh.instanceMatrix.needsUpdate = true;
    undo.push(() => {
      mesh.setMatrixAt(i, was);
      mesh.instanceMatrix.needsUpdate = true;
    });
  };
  let band = 0;
  let flat = 0;
  let slope = 0;
  mine.forEach((li, k) => {
    const s = specs[li]!;
    const gone = covered.has(li);
    if (gone) blank(bodies, k);
    for (let j = 1; j < s.storeys; j++) {
      if (gone) blank(bands, band);
      band++;
    }
    if (s.roof === "flat") {
      if (gone) blank(flats, flat);
      flat++;
    } else if (s.roof === "pitched") {
      if (gone) blank(slopes, slope);
      slope++;
    }
  });
}

/**
 * What `applyModels` is given beyond the bundle and the models (ticket 055 E). All optional; with none the call is exactly what it was, so a puzzle map's furniture is deep-equal to today's.
 * - `keepPoints` and `keepRects` (world units) are added to the furniture layout's keep-outs: the tile city's pole slots, kerb cuts and corner cells (`tileKeepouts`).
 * - `furnitureFilter` takes the layout's pieces and returns the ones to place: the tile city drops the meters that stand beside no bay (`bayMeters`).
 * - `furnitureLevels` sets the height the furniture stands at (see `FurnitureLevels`).
 */
export interface ApplyOptions {
  keepPoints?: readonly Pt[];
  keepRects?: readonly Rect[];
  furnitureFilter?: (pieces: readonly FurniturePiece[]) => FurniturePiece[];
  furnitureLevels?: FurnitureLevels;
  /** The measured door sills (ticket 055 F). Default: DOOR_SILLS. An empty table sinks nothing and stands no steps, so the scene is exactly what 055 E drew. */
  sills?: SillTable;
  /**
   * How the terrace stacks line up in z (ticket 057 D): the tile city passes `TILE_STACK_ALIGN` ("wall") explicitly, so it does not lean on `packTown`'s default (`alignOf`, which reads the runs' pavement frame).
   * Default: none, so `packTown` decides as it always did and a puzzle map is exactly what it was.
   */
  align?: StackAlign;
  /** The share of qualifying blocks that get a fire escape (ticket 061): the tile city passes its R7 floor (`TILE_CITY_R7_MIN`). Default: the ladder's (`ESCAPE_SHARE_LADDER`), so a puzzle map is unchanged by it. */
  escapeShare?: number;
}

/**
 * Swap the placeholders for model clones where the set has usable models: a clone at every intermediate pole (turned so a
 * cross-arm runs across the wire), on every lamp's post, and on every lot (a model of the lot's type, at one scale, its front to the road).
 * A lot type with no usable model keeps its placeholder buildings. Lamp heads, lights, pools, halos, flares, places and node objects
 * are untouched. Slots with no models stay as they are.
 */
export function applyModels(bundle: SceneBundle, set: ModelSet, opts: ApplyOptions = {}): AppliedModels {
  const { slots } = bundle;
  const undo: (() => void)[] = [];
  const hide = (o: Object3D): void => {
    const was = o.visible;
    o.visible = false;
    undo.push(() => {
      o.visible = was;
    });
  };
  const add = (parent: Object3D, child: Object3D): void => {
    parent.add(child);
    undo.push(() => {
      parent.remove(child);
    });
  };

  const poles = set.pole;
  if (poles && poles.length > 0 && slots.poles.spots.length > 0) {
    for (const o of slots.poles.placeholders) hide(o);
    for (const s of slots.poles.spots) {
      const m = at(poles, `pole${s.x.toFixed(2)},${s.z.toFixed(2)}`);
      add(slots.models, place(m, modelScale(m.entry, "pole"), s.x, s.z, poleYaw(m.entry, s.yaw)));
    }
  }
  const lamps = set.lamp;
  if (lamps && lamps.length > 0) {
    for (const l of slots.lamps) {
      const m = at(lamps, `lamp${l.id}`);
      hide(l.post);
      add(l.group, place(m, modelScale(m.entry, "lamp"), 0, 0, 0));
    }
  }
  const buildings = set.building;
  const sills = opts.sills ?? DOOR_SILLS;
  const doors: DoorWork[] = [];
  const stepPlacements: DressPlacement[] = [];
  const stacks = stackInput(set);
  const stackRootsOf = stackRoots(set);
  // Each stack's ground-piece lift by column (ticket 062 B), to take the glass, awning, sign and door canopy up with their piece.
  const liftOf = new Map<Stack, ReadonlyMap<number, number>>();
  let placed: readonly BuildingPlacement[] = [];
  // The groups to paint (ticket 054 B): each terrace block's, then each stack's on a lone lot, with the lot's key and the run.
  const paintTerrace: { group: Group; at: ColourwayBlock }[] = [];
  const paintLone: { group: Group; at: ColourwayBlock }[] = [];
  const terrace: PackedBlock[] = [];
  const packedRuns = new Map<string, PackResult>();
  if (((buildings && buildings.length > 0) || stacks) && slots.blocks.list.length > 0) {
    const placements = buildingPlacements(slots.blocks.list, buildings, stacks, sills);
    placed = placements;
    // A type's placeholders go only if some lot of that type got a model; the others stay.
    const covered = new Set(placements.map((p) => slots.blocks.list[p.lot]!.type));
    for (const t of LOT_TYPE_NAMES) if (covered.has(t)) hide(slots.blocks.byType[t]);
    for (const p of placements) {
      if (p.stack) {
        // The group's origin is the stack frame's: the lot's front-centre, which is the footprint centre moved toward the road by half its depth.
        const half = (p.stack.depth_m * WORLD_PER_METRE) / 2;
        const lifted = stackLift(p.stack, sills);
        const g = stackGroup(p.stack, stackRootsOf, lifted.lift_m);
        liftOf.set(p.stack, lifted.lift_m);
        // A stack sinks as one by its measured sill (ticket 055 F): its door meets the walk; each ground piece is lifted by the block's sink less its own sill (ticket 062 B).
        const plan = stackSill(p.stack, sills);
        g.position.set(p.x + Math.sin(p.yaw) * half, lowered(plan.sink_m, WORLD_PER_METRE), p.z + Math.cos(p.yaw) * half);
        g.rotation.y = p.yaw;
        add(slots.models, g);
        paintLone.push({ group: g, at: { key: slots.blocks.list[p.lot]!.key } });
        if (plan.sink_m > 0) doors.push({ key: `city-pack:${g.name}`, kind: "stack", sink_m: plan.sink_m, steps: false, leftOver_m: plan.leftOver_m });
      } else {
        // A whole model sinks by its measured sill, no further than keeps its lowest window clear of the walk, and stands steps for what is left (ticket 055 F).
        const key = calibrationKey(p.model.pack, p.model.entry.name);
        const plan = houseSill(key, sills);
        const g = place(p.model, p.scale, p.x, p.z, p.yaw);
        g.position.y = lowered(plan.sink_m, p.scale);
        add(slots.models, g);
        if (plan.steps) stepPlacements.push(stepsPlacement(p.model, p, plan.steps));
        if (plan.sink_m > 0 || plan.steps) doors.push({ key, kind: "house", sink_m: plan.sink_m, steps: plan.steps !== null, leftOver_m: plan.leftOver_m });
      }
    }
  }
  // The terrace rows (ticket 051 D): each run's nominal placeholders give way to its packed stacks, one `stack:<style>` group per block, in a group of their own that is a sibling of `slots.models` (so the lots' clones there are exactly as before). With no City Pack stack
  // (a fresh checkout, CI) nothing is packed and the abutting placeholder boxes stay, exactly as 051 B made them. A run that packs no block keeps its placeholders.
  const runs = slots.blocks.terraces ?? [];
  if (stacks && runs.length > 0) {
    const lots = slots.blocks.list;
    // The packer assembles with no sill band; a block whose lifted ground pieces would reach its first floor's window sill is assembled again within one band (ticket 062 B, `bandPacked`). What is drawn, what the
    // furniture is laid by and what `applied.packed` hands back are those blocks.
    const packed = bandPacked(packTown({ terraces: runs, lots }, STACK_STYLES, stacks.entries, stacks.fronts, opts.align ? { align: opts.align } : {}), runs, stacks.entries, stacks.fronts, sills, opts.align);
    for (const [id, res] of packed) packedRuns.set(id, res);
    const row = new Group();
    row.name = "terrace-stacks";
    row.userData["sharedModel"] = true;
    row.raycast = () => {};
    const covered = new Set<number>();
    for (const run of runs) {
      const blocks = packed.get(run.id)?.blocks ?? [];
      if (blocks.length === 0) continue;
      for (const i of run.lots) covered.add(i);
      for (const b of blocks) {
        // The stack frame's origin is the block's front-centre: its lot centre moved toward the road by half the lot's depth.
        const lifted = stackLift(b.stack, sills);
        const g = stackGroup(b.stack, stackRootsOf, lifted.lift_m);
        liftOf.set(b.stack, lifted.lift_m);
        // A terrace block always sinks, never takes steps: its front is the walk (ticket 055 F). Its ground pieces are lifted (ticket 062 B).
        const plan = stackSill(b.stack, sills);
        g.position.set(b.lot.x + Math.sin(b.lot.yaw) * (b.lot.d / 2), lowered(plan.sink_m, WORLD_PER_METRE), b.lot.z + Math.cos(b.lot.yaw) * (b.lot.d / 2));
        g.rotation.y = b.lot.yaw;
        row.add(g);
        if (plan.sink_m > 0) doors.push({ key: `city-pack:${g.name}`, kind: "stack", sink_m: plan.sink_m, steps: false, leftOver_m: plan.leftOver_m });
        paintTerrace.push({ group: g, at: { key: b.lot.key, run: run.id } });
        terrace.push(b);
      }
    }
    if (terrace.length > 0) {
      add(slots.models.parent ?? slots.models, row);
      blankTerracePlaceholders(slots, covered, undo);
    }
  }
  // The colourways (ticket 054 B): with none loaded (a fresh checkout, CI) nothing is touched and every stack holds the cached materials. Otherwise each block takes the id its lot's key hashes to, never its
  // run-mate's before it; the dressing below keeps the base atlas (one InstancedMesh per key is shared by every block).
  if (set.colourways && set.colourways.size > 0) {
    const available = COLOURWAY_POOL.filter((id) => id === "base" || set.colourways!.has(id));
    const all = [...paintTerrace, ...paintLone];
    const ids = assignColourways(all.map((p) => p.at), available);
    const cache = createColourwayCache();
    all.forEach((p, i) => paintStack(p.group, ids[i]!, set, cache));
    undo.push(() => cache.dispose());
  }
  // The dressing (ticket 052 B): awnings, glass, signs, fire escapes and roof props on every stack just stood, from the pure `dressTown`. A sibling group of its own, so the stacks
  // and the lots' clones are exactly as before; with no City Pack dressing (a fresh checkout, CI) or no stack there is no group at all.
  let dress: readonly DressPlacement[] = [];
  let dressCalls = 0;
  const dressing = stacks ? dressInput(set) : null;
  if (dressing) {
    // A run's pavement frame (the tile city's) goes to the dressing of its blocks, by run id; a ladder run has none.
    const frames = new Map<string, TerraceRun["frame"]>();
    for (const r of slots.blocks.terraces ?? []) if (r.frame) frames.set(r.id, r.frame);
    // A block's dressing sinks with it (ticket 055 F): the site's frame is lowered by the block's sink, so glass, awnings, signs, fire escapes and roof props stay where they were on the block.
    const liftByFrame = new Map<DressFrame, ReadonlyMap<number, number>>();
    const sites = dressSites(terrace, placed, slots.blocks.list, frames).map((s) => {
      const sink = stackSill(s.stack, sills).sink_m;
      const site = sink > 0 ? { ...s, frame: { ...s.frame, y: lowered(sink, WORLD_PER_METRE) } } : s;
      const lift = liftOf.get(s.stack);
      if (lift && lift.size > 0) liftByFrame.set(site.frame, lift);
      return site;
    });
    // A lifted ground piece takes its glass, awning, sign and door canopy up with it (ticket 062 B); nothing else on the block moves.
    const placements = liftDressing(dressPlacements(sites, dressing.entries, dressing.fronts, opts.escapeShare !== undefined ? { escapeShare: opts.escapeShare } : {}), liftByFrame);
    if (placements.length > 0) {
      const drawn = dressGroup(placements, dressing.roots);
      if (drawn.calls > 0) {
        add(slots.models.parent ?? slots.models, drawn.group);
        undo.push(() => drawn.dispose());
        dress = placements;
        dressCalls = drawn.calls;
      } else drawn.dispose();
    }
  }
  // The street furniture (ticket 052 C): on the pavements in front of the packed terrace runs, in the open lots and in the alleys, drawn through the same instancer into a group of
  // its own. Nothing without the dressing (a fresh checkout, CI): no group at all.
  let furniture: readonly FurniturePiece[] = [];
  let furnitureCalls = 0;
  if (dressing && terrace.length > 0) {
    const base = furnitureInput(bundle, packedRuns, dress);
    const input: FurnitureInput = opts.keepPoints || opts.keepRects ? { ...base, keepPoints: [...(base.keepPoints ?? []), ...(opts.keepPoints ?? [])], keepRects: [...(base.keepRects ?? []), ...(opts.keepRects ?? [])] } : base;
    const laid = furnitureLayout(input, dressing.entries, dressing.fronts);
    const pieces = opts.furnitureFilter ? opts.furnitureFilter(laid) : laid;
    if (pieces.length > 0) {
      const drawn = dressGroup(pieces.map((p) => furniturePlacement(p, opts.furnitureLevels)), dressing.roots, FURN_DRAW_CALLS_MAX);
      if (drawn.calls > 0) {
        drawn.group.name = "city-furniture";
        add(slots.models.parent ?? slots.models, drawn.group);
        undo.push(() => drawn.dispose());
        furniture = pieces;
        furnitureCalls = drawn.calls;
      } else drawn.dispose();
    }
  }
  // The door steps (ticket 055 F): one group, drawn last so a missing model (CI) costs nothing else.
  if (stepPlacements.length > 0) {
    const root = set.steps?.find((m) => calibrationKey(m.pack, m.entry.name) === STEPS_KEY)?.root;
    const drawn = stepsGroup(stepPlacements, root);
    add(slots.models.parent ?? slots.models, drawn.group);
    undo.push(() => drawn.dispose());
  }
  return {
    buildings: placed,
    terrace,
    dress,
    packed: packedRuns,
    dressCalls,
    furniture,
    furnitureCalls,
    doors,
    steps: stepPlacements,
    remove() {
      for (let i = undo.length - 1; i >= 0; i--) undo[i]!();
      undo.length = 0;
    },
  };
}

