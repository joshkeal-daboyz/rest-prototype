/**
 * Loads the converted GLB models at runtime and puts them in the scene (ticket 039).
 * The files are fetched by URL string from `assets/private/out/`, which only exists on the machine that ran
 * `npm run assets:convert` (or a site where the owner copied it). They are never imported, never in `public/`, never bundled.
 * Any failure leaves today's placeholder shapes in place and costs one console.info line; nothing here throws or waits for play.
 */

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Box3, Color, DoubleSide, Group, InstancedMesh, Matrix4, MeshStandardMaterial, NearestFilter, Quaternion, Texture, Vector3, type Material, type Mesh, type Object3D } from "three";
import { calibrationKey, parseCalibrationKey, type AssetEntry, type AssetManifest, type CalibrationKey } from "../core";
import { stableHash } from "../render/city";
import { effectiveFronts, loadSavedCalibration } from "./calibration";
import { DRESS_DRAW_CALLS_MAX, KERB_FROM_FRONT_M, SHOP_GLASS, dressKeys, dressTown, type DressBlockInput, type DressPiece } from "./dressing";
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
import { STACK_STYLES, assembleStack, offeredStacks, stackKeys, type Stack } from "./stacks";
import { ALLEY_MAX_M, ALLEY_MIN_M, packTown, type PackedBlock, type PackResult } from "./terrace";
import { PAVEMENT_Y, YARD_H } from "./scene";
import { LOT_TYPE_NAMES, type Lot } from "./town";

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
    const globs = new Set<string>();
    for (const slot of MODEL_SLOTS) for (const p of plan[slot] ?? []) globs.add(p.glb);
    for (const p of stackPlan ?? []) globs.add(p.glb);
    for (const p of dressPlan ?? []) globs.add(p.glb);
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
    return set;
  } catch (e) {
    info(`3D models: ${describe(e)}; using the placeholder shapes.`);
    return NO_MODELS;
  }
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

/** The page's models: fetched once with the real fetch and GLTFLoader, then reused by every map. */
export function sharedModels(): Promise<ModelSet> {
  const fetchJson = async (url: string, init?: { cache: "no-store" }): Promise<unknown> => {
    const r = await fetch(url, init);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as unknown;
  };
  // In a dev build Josh's saved fronts (ticket 045) are laid over the code's table before the plan is made; a production build never fetches the file.
  shared ??= loadSavedCalibration({ dev: import.meta.env.DEV, fetchJson }).then((saved) => {
    const tables = effectiveFronts({ fronts: BUILDING_FRONTS, exclude: BUILDING_EXCLUDE }, saved);
    // The City Pack's stack pieces load too (ticket 050 C); with no City Pack in the manifest nothing extra is fetched and the set has no stack slot.
    return loadModels({ fetchJson, loadGlb: async (url) => (await new GLTFLoader().loadAsync(url)).scene, fronts: tables.fronts, exclude: tables.exclude, stackKeys: allStackKeys(), dressKeys: [...dressKeys(), ...furnitureKeys()] });
  });
  return shared;
}

/** Forget the page's models (tests). */
export function resetSharedModels(): void {
  shared = null;
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
  /** The InstancedMeshes the dressing added (its draw calls); 0 when none. */
  dressCalls: number;
  /** The street furniture and open-lot dressing placed (ticket 052 C), in `furnitureLayout` order; empty when there is none. */
  furniture: readonly FurniturePiece[];
  /** The InstancedMeshes the furniture added (its draw calls); 0 when none. */
  furnitureCalls: number;
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
export function stackGroup(stack: Stack, roots: ReadonlyMap<CalibrationKey, Object3D>): Group {
  const group = new Group();
  group.name = `stack:${stack.style}`;
  group.userData["sharedModel"] = true;
  group.raycast = () => {};
  for (const p of stack.pieces) {
    const wrap = new Group();
    wrap.name = `piece:${p.key}`;
    wrap.position.set(p.x * WORLD_PER_METRE, p.y * WORLD_PER_METRE, p.z * WORLD_PER_METRE);
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

/** Where a stack group stands in the world: its origin (the lot's front-centre) and its turn about y. */
export interface DressFrame {
  x: number;
  z: number;
  yaw: number;
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
export function dressMatrix(frame: DressFrame, piece: Pick<DressPiece, "x" | "y" | "z" | "yaw">, out: Matrix4 = new Matrix4()): Matrix4 {
  const s = WORLD_PER_METRE;
  tmpA.compose(tmpP.set(frame.x, 0, frame.z), tmpQ.setFromAxisAngle(UP, frame.yaw), tmpS.set(1, 1, 1));
  tmpB.compose(tmpP.set(piece.x * s, piece.y * s, piece.z * s), tmpQ.setFromAxisAngle(UP, piece.yaw), tmpS.set(s, s, s));
  return out.multiplyMatrices(tmpA, tmpB);
}

/** One site to dress: a stack, its lot's key and height cap, the run it counts in, where it stands, and how far its front is from the road's edge. */
export interface DressSite extends DressBlockInput {
  frame: DressFrame;
}

/**
 * The stacks of a town as dressing sites, in the order `dressTown` threads its caps: each terrace run's packed blocks in run order, then each stack standing on a
 * lot. Terrace blocks count in their terrace run; stacks on lots in the street side they face. A run's lowest block (its shortest stack, the first of equals) is
 * the one a novelty sign may stand on. Every ordinary lot and terrace block faces a road at the pavement and setback, so the kerb is `KERB_FROM_FRONT_M` for all
 * (a service run's frontage, 2.08 m, is only ever a place's, and a place is not stacked).
 */
export function dressSites(terrace: readonly PackedBlock[], placements: readonly BuildingPlacement[], lots: readonly Lot[]): DressSite[] {
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
  return raw.map((r, k) => ({ stack: r.stack, lot: r.lot, run: { id: r.run, index: index[k]!, lowest: lowest.get(r.run) === k }, kerbM: KERB_FROM_FRONT_M, frame: r.frame }));
}

/** The placements of a set of sites, flattened in site order (pure: `dressTown`'s caps along each run). A piece whose key is not in `entries` is simply not placed. */
export function dressPlacements(sites: readonly DressSite[], entries: ReadonlyMap<CalibrationKey, AssetEntry>, fronts: FrontTable = {}): DressPlacement[] {
  const dressed = dressTown(sites, entries, fronts);
  const out: DressPlacement[] = [];
  sites.forEach((s, i) => {
    for (const piece of dressed[i] ?? []) out.push({ frame: s.frame, piece });
  });
  return out;
}

// ---- street furniture and open lots (ticket 052 C) ----

const GROUND_LIFT_M = 0.01;
const NO_FRAME: DressFrame = { x: 0, z: 0, yaw: 0 };

/** A piece of furniture as a placement the dressing instancer draws: world position to metres, standing on its ground layer (a flat tile a hair above it, so it does not fight the ground). */
export function furniturePlacement(p: FurniturePiece): DressPlacement {
  const base = (p.ground === "pavement" ? PAVEMENT_Y : YARD_H) / WORLD_PER_METRE + (p.flat ? GROUND_LIFT_M : 0) + p.lift;
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
function meshParts(root: Object3D): { mesh: Mesh; local: Matrix4 }[] {
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
  dispose(): void;
}

/**
 * Draw placements of dressing (ticket 052 B). One `InstancedMesh` per (key, sub-mesh) of every key that has a placement, in a group named `city-dressing`; an instance's
 * matrix is `dressMatrix(frame, piece)` times the sub-mesh's own matrix in its root. No instance takes a ray (`raycast` is a no-op on the group and every mesh), nothing is
 * animated, and nothing is emissive: a material that carries emission is swapped for a clone with none, and the shop glass shares one dark, slightly glossy, see-through
 * material. Geometry and every other material are the cached roots' (the group is `sharedModel`, so the scene's disposal leaves them alone). More than `maxCalls` InstancedMeshes
 * would be too many draw calls: the keys with the fewest instances are left out first. A key with no root, or no mesh in it, draws nothing.
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
  for (const { key, parts, list } of keys) {
    if (calls + parts.length > maxCalls) continue;
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
  return {
    group,
    calls,
    dispose() {
      for (const im of meshes) im.dispose();
      for (const o of owned) o.dispose();
      owned.length = 0;
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

/**
 * The clone every lot gets: a model of the lot's type (a lot of a type with no model gets none and keeps its placeholder),
 * picked by family (`pickBuildings`: no neighbour's family, no street repeat, no family over its share; a corner shop only on a corner lot). Pure given the set.
 *
 * With `stack` (ticket 050 C) the City Pack's stacks come first on the types in STACK_LOT_TYPES (`buildingPlan`): such a lot gets one assembled stack, with a corner column on
 * each of its `cornerSides` (a corner building, two street faces) or, if that cannot be assembled, a mid-row stack of the same style (an ordinary building, as any model may
 * stand on a corner). Without it (or with no stack piece loaded) the result is exactly what it was.
 */
export function buildingPlacements(lots: readonly Lot[], buildings: readonly LoadedModel[] | null, stack: StackInput | null = null): BuildingPlacement[] {
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
      const built = recipe ? (assembleStack(recipe, lot, stack.entries, stack.fronts) ?? assembleStack(recipe, { ...lot, cornerSides: [] }, stack.entries, stack.fronts)) : null;
      if (!built) return;
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
 * Swap the placeholders for model clones where the set has usable models: a clone at every intermediate pole (turned so a
 * cross-arm runs across the wire), on every lamp's post, and on every lot (a model of the lot's type, at one scale, its front to the road).
 * A lot type with no usable model keeps its placeholder buildings. Lamp heads, lights, pools, halos, flares, places and node objects
 * are untouched. Slots with no models stay as they are.
 */
export function applyModels(bundle: SceneBundle, set: ModelSet): AppliedModels {
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
  const stacks = stackInput(set);
  const stackRootsOf = stackRoots(set);
  let placed: readonly BuildingPlacement[] = [];
  const terrace: PackedBlock[] = [];
  const packedRuns = new Map<string, PackResult>();
  if (((buildings && buildings.length > 0) || stacks) && slots.blocks.list.length > 0) {
    const placements = buildingPlacements(slots.blocks.list, buildings, stacks);
    placed = placements;
    // A type's placeholders go only if some lot of that type got a model; the others stay.
    const covered = new Set(placements.map((p) => slots.blocks.list[p.lot]!.type));
    for (const t of LOT_TYPE_NAMES) if (covered.has(t)) hide(slots.blocks.byType[t]);
    for (const p of placements) {
      if (p.stack) {
        // The group's origin is the stack frame's: the lot's front-centre, which is the footprint centre moved toward the road by half its depth.
        const half = (p.stack.depth_m * WORLD_PER_METRE) / 2;
        const g = stackGroup(p.stack, stackRootsOf);
        g.position.set(p.x + Math.sin(p.yaw) * half, 0, p.z + Math.cos(p.yaw) * half);
        g.rotation.y = p.yaw;
        add(slots.models, g);
      } else add(slots.models, place(p.model, p.scale, p.x, p.z, p.yaw));
    }
  }
  // The terrace rows (ticket 051 D): each run's nominal placeholders give way to its packed stacks, one `stack:<style>` group per block, in a group of their own that is a sibling of `slots.models` (so the lots' clones there are exactly as before). With no City Pack stack
  // (a fresh checkout, CI) nothing is packed and the abutting placeholder boxes stay, exactly as 051 B made them. A run that packs no block keeps its placeholders.
  const runs = slots.blocks.terraces ?? [];
  if (stacks && runs.length > 0) {
    const lots = slots.blocks.list;
    const packed = packTown({ terraces: runs, lots }, STACK_STYLES, stacks.entries, stacks.fronts);
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
        const g = stackGroup(b.stack, stackRootsOf);
        g.position.set(b.lot.x + Math.sin(b.lot.yaw) * (b.lot.d / 2), 0, b.lot.z + Math.cos(b.lot.yaw) * (b.lot.d / 2));
        g.rotation.y = b.lot.yaw;
        row.add(g);
        terrace.push(b);
      }
    }
    if (terrace.length > 0) {
      add(slots.models.parent ?? slots.models, row);
      blankTerracePlaceholders(slots, covered, undo);
    }
  }
  // The dressing (ticket 052 B): awnings, glass, signs, fire escapes and roof props on every stack just stood, from the pure `dressTown`. A sibling group of its own, so the stacks
  // and the lots' clones are exactly as before; with no City Pack dressing (a fresh checkout, CI) or no stack there is no group at all.
  let dress: readonly DressPlacement[] = [];
  let dressCalls = 0;
  const dressing = stacks ? dressInput(set) : null;
  if (dressing) {
    const placements = dressPlacements(dressSites(terrace, placed, slots.blocks.list), dressing.entries, dressing.fronts);
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
    const pieces = furnitureLayout(furnitureInput(bundle, packedRuns, dress), dressing.entries, dressing.fronts);
    if (pieces.length > 0) {
      const drawn = dressGroup(pieces.map(furniturePlacement), dressing.roots, FURN_DRAW_CALLS_MAX);
      if (drawn.calls > 0) {
        drawn.group.name = "city-furniture";
        add(slots.models.parent ?? slots.models, drawn.group);
        undo.push(() => drawn.dispose());
        furniture = pieces;
        furnitureCalls = drawn.calls;
      } else drawn.dispose();
    }
  }
  return {
    buildings: placed,
    terrace,
    dress,
    dressCalls,
    furniture,
    furnitureCalls,
    remove() {
      for (let i = undo.length - 1; i >= 0; i--) undo[i]!();
      undo.length = 0;
    },
  };
}

