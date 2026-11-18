/**
 * Loads the converted GLB models at runtime and puts them in the scene (ticket 039).
 * The files are fetched by URL string from `assets/private/out/`, which only exists on the machine that ran
 * `npm run assets:convert` (or a site where the owner copied it). They are never imported, never in `public/`, never bundled.
 * Any failure leaves today's placeholder shapes in place and costs one console.info line; nothing here throws or waits for play.
 */

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Group, InstancedMesh, Matrix4, NearestFilter, Texture, type Material, type Mesh, type Object3D } from "three";
import { calibrationKey, type AssetEntry, type AssetManifest, type CalibrationKey } from "../core";
import { stableHash } from "../render/city";
import { effectiveFronts, loadSavedCalibration } from "./calibration";
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
  modelScale,
  pickBuildings,
  pickIndex,
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
import { packTown, type PackedBlock } from "./terrace";
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
    const globs = new Set<string>();
    for (const slot of MODEL_SLOTS) for (const p of plan[slot] ?? []) globs.add(p.glb);
    for (const p of stackPlan ?? []) globs.add(p.glb);
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
  const fetchJson = async (url: string, init?: { cache: "no-store" }): Promise<unknown> => {
    const r = await fetch(url, init);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as unknown;
  };
  // In a dev build Josh's saved fronts (ticket 045) are laid over the code's table before the plan is made; a production build never fetches the file.
  shared ??= loadSavedCalibration({ dev: import.meta.env.DEV, fetchJson }).then((saved) => {
    const tables = effectiveFronts({ fronts: BUILDING_FRONTS, exclude: BUILDING_EXCLUDE }, saved);
    // The City Pack's stack pieces load too (ticket 050 C); with no City Pack in the manifest nothing extra is fetched and the set has no stack slot.
    return loadModels({ fetchJson, loadGlb: async (url) => (await new GLTFLoader().loadAsync(url)).scene, fronts: tables.fronts, exclude: tables.exclude, stackKeys: allStackKeys() });
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
  return {
    buildings: placed,
    terrace,
    remove() {
      for (let i = undo.length - 1; i >= 0; i--) undo[i]!();
      undo.length = 0;
    },
  };
}

