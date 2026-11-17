/**
 * Loads the converted GLB models at runtime and puts them in the scene (ticket 039).
 * The files are fetched by URL string from `assets/private/out/`, which only exists on the machine that ran
 * `npm run assets:convert` (or a site where the owner copied it). They are never imported, never in `public/`, never bundled.
 * Any failure leaves today's placeholder shapes in place and costs one console.info line; nothing here throws or waits for play.
 */

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Group, NearestFilter, Texture, type Material, type Mesh, type Object3D } from "three";
import type { AssetManifest } from "../core";
import { stableHash } from "../render/city";
import {
  MODEL_SLOTS,
  MODEL_TABLE,
  atFront,
  buildingPlan,
  isManifest,
  modelScale,
  pickBuildings,
  pickIndex,
  planModels,
  sizeOf,
  poleYaw,
  type ModelChoice,
  type ModelSlot,
  type PlannedModel,
} from "./models";
import type { SceneBundle } from "./scene";
import { LOT_TYPE_NAMES, type Lot } from "./town";

/** A planned model whose root node was found in its pack's GLB. */
export interface LoadedModel extends PlannedModel {
  root: Object3D;
}

/** What loading produced, per slot: the usable models in table order, or null (the slot keeps its placeholder). */
export type ModelSet = Record<ModelSlot, LoadedModel[] | null>;

export const NO_MODELS: ModelSet = { pole: null, lamp: null, building: null };

export interface LoadDeps {
  /** Resolves to the parsed JSON, and rejects on a network error, a non-OK status or a body that is not JSON. */
  fetchJson(url: string): Promise<unknown>;
  /** Resolves to the GLB's scene, and rejects if it cannot be fetched or parsed. */
  loadGlb(url: string): Promise<Object3D>;
  /** Default: MODEL_TABLE. */
  table?: readonly ModelChoice[];
  /** Folder of the manifest, ending in "/". Default: `${BASE_URL}assets/private/out/`. */
  dir?: string;
  /** Where the one line saying why a fallback happened goes. Default: console.info. */
  info?: (message: string) => void;
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
    const plan = planModels(manifest as AssetManifest, deps.table ?? MODEL_TABLE);
    const globs = new Set<string>();
    for (const slot of MODEL_SLOTS) for (const p of plan[slot] ?? []) globs.add(p.glb);
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
    return set;
  } catch (e) {
    info(`3D models: ${describe(e)}; using the placeholder shapes.`);
    return NO_MODELS;
  }
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

let shared: Promise<ModelSet> | null = null;

/** The page's models: fetched once with the real fetch and GLTFLoader, then reused by every map. */
export function sharedModels(): Promise<ModelSet> {
  shared ??= loadModels({
    fetchJson: async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as unknown;
    },
    loadGlb: async (url) => (await new GLTFLoader().loadAsync(url)).scene,
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
  /** `lot.yaw + front`: the lot turns its front to the road, the model's own `front` turns its door to the lot's front. */
  yaw: number;
}

/**
 * The clone every lot gets: a model of the lot's type (a lot of a type with no model gets none and keeps its placeholder),
 * picked by a hash of the lot's key and never the same as a neighbour's. Pure given the set.
 */
export function buildingPlacements(lots: readonly Lot[], buildings: readonly LoadedModel[] | null): BuildingPlacement[] {
  if (!buildings || buildings.length === 0) return [];
  const byName = new Map(buildings.map((m) => [m.entry.name, m] as const));
  const names = pickBuildings(lots, buildingPlan(buildings));
  const out: BuildingPlacement[] = [];
  lots.forEach((lot, i) => {
    const m = names[i] ? byName.get(names[i]!) : undefined;
    if (!m) return;
    const scale = modelScale(m.entry, "building");
    // The model's footprint depth across the road is its own depth, or its width when its front is a quarter turn away.
    const [w, , d] = sizeOf(m.entry);
    const depth = (Math.abs(Math.sin(m.front)) > 0.5 ? w : d) * scale;
    const spot = atFront(lot, depth);
    out.push({ lot: i, model: m, scale, x: spot.x, z: spot.z, yaw: lot.yaw + m.front });
  });
  return out;
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
  if (buildings && buildings.length > 0 && slots.blocks.list.length > 0) {
    const placements = buildingPlacements(slots.blocks.list, buildings);
    // A type's placeholders go only if some lot of that type got a model; the others stay.
    const covered = new Set(placements.map((p) => slots.blocks.list[p.lot]!.type));
    for (const t of LOT_TYPE_NAMES) if (covered.has(t)) hide(slots.blocks.byType[t]);
    for (const p of placements) add(slots.models, place(p.model, p.scale, p.x, p.z, p.yaw));
  }
  return {
    remove() {
      for (let i = undo.length - 1; i >= 0; i--) undo[i]!();
      undo.length = 0;
    },
  };
}

