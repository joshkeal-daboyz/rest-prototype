/**
 * Loads the converted GLB models at runtime and puts them in the scene (ticket 039).
 * The files are fetched by URL string from `assets/private/out/`, which only exists on the machine that ran
 * `npm run assets:convert` (or a site where the owner copied it). They are never imported, never in `public/`, never bundled.
 * Any failure leaves today's placeholder shapes in place and costs one console.info line; nothing here throws or waits for play.
 */

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BoxGeometry, Color, DoubleSide, Group, InstancedMesh, Matrix4, MeshStandardMaterial, NearestFilter, Quaternion, Texture, TextureLoader, Vector3, type Material, type Mesh, type Object3D } from "three";
import { GAME_PACK_DIR, ITCH_BUILD_MODE, calibrationKey, parseCalibrationKey, type AssetEntry, type AssetManifest, type CalibrationKey } from "../core";
import { effectiveFronts, loadSavedCalibration } from "./calibration";
import { COLOURWAY_POOL, isBaseAtlasName, isColourwayId } from "./colourway";
import { CODE_ESCAPE_KEY, type EscapePart } from "./escapes";
import { DRESS_DRAW_CALLS_MAX, SHOP_GLASS, type DressPiece, type DressSlotKind } from "./dressing";
import { type FurniturePiece } from "./furniture";
import { BUILDING_EXCLUDE, BUILDING_FRONTS, MODEL_SLOTS, MODEL_TABLE, WORLD_PER_METRE, atFront, buildingPlan, frontIsQuarter, frontYaw, isManifest, meshFamily, modelScale, pickBuildings, planDressPieces, planModels, planStackPieces, sizeOf, stackFamily, stackStyleOf, traitsOf, type BuildingFront, type FrontTable, type ModelChoice, type ModelSlot, type PlannedModel } from "./models";

import { STACK_STYLES, assembleStack, offeredStacks, type Stack, type StackPiece, type StackStyle } from "./stacks";
import { allStackPieceKeys, listedKeys, pageLoadLists, type PageLoadLists } from "./pageloads";
import { PAVEMENT_Y, YARD, YARD_H, type Lot } from "./kitunits";
import { STEPS_D_M, STEPS_KEY, STEPS_RISE_M, STEPS_W_M, fitSillBand, modelPoint, stepsYaw, type SillPlan, type SillTable } from "./sills";

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
  /**
   * The colourway atlases asked for by `LoadDeps.signColourways` (070 TR2: the stop sign's `01_A`), by id, loaded the way `colourways` are but kept apart from them: no block and no building is ever painted from this
   * map. Absent when none was asked for or none loaded.
   */
  signColourways?: ReadonlyMap<string, Texture>;
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
  /** Colourway ids to fetch for single pieces, not blocks (070 TR2: `["01_A"]` for the stop sign), into `ModelSet.signColourways`, under the pool's own conditions. An id that is not a colourway id, or is in the pool, is refused with one line. Default: none. */
  signColourways?: readonly string[];
  /** Resolves to the image at `url` as a texture (ticket 054 B: the City Pack's colourways), and rejects if it cannot be fetched. Default: none, so no colourway is fetched. */
  loadTexture?: (url: string) => Promise<Texture>;
  /** Folder of the manifest, ending in "/". Default: `${BASE_URL}assets/private/out/`. */
  dir?: string;
  /** Prefer the game pack in `${dir}game/` when it is there and holds every key asked for (ticket 082 A). Default true; false (`?packs=full`) never looks for it. */
  gamePack?: boolean;
  /** The itch build (ticket 083 A): the game pack is all there is. The full manifest is never fetched; a game manifest is used for what it has, and one console.error says what it lacks. Default false. */
  gameOnly?: boolean;
  /** Where gameOnly's one error line goes. Default: console.error. */
  error?: (message: string) => void;
  /** Where the one line saying why a fallback happened goes. Default: console.info. */
  info?: (message: string) => void;
}

/** Every piece key any stack recipe names, once each: what the town asks the loader for (ticket 050 C). */
export function allStackKeys(): CalibrationKey[] {
  return allStackPieceKeys();
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
  const fullDir = deps.dir ?? defaultDir();
  try {
    let dir = fullDir;
    let manifest: unknown = deps.gameOnly ? await readGameOnly(deps, fullDir) : deps.gamePack === false ? null : await readGamePack(deps, fullDir, info);
    if (manifest) dir = `${fullDir}${GAME_PACK_DIR}`;
    else if (deps.gameOnly) return NO_MODELS;
    else {
      try {
        manifest = await deps.fetchJson(`${fullDir}manifest.json`);
      } catch (e) {
        info(`3D models: no manifest at ${fullDir}manifest.json (${describe(e)}); using the placeholder shapes.`);
        return NO_MODELS;
      }
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
      // The sign colourways (070 TR2): the same path, only the ids the caller named, kept out of `colourways`.
      if (deps.signColourways && deps.signColourways.length > 0) {
        const refused = deps.signColourways.filter((id) => !isColourwayId(id) || COLOURWAY_POOL.includes(id));
        for (const id of refused) info(`3D models: sign colourway ${id.slice(0, 24)} is not a colourway id outside the pool; it is not fetched.`);
        const ids = [...new Set(deps.signColourways.filter((id) => !refused.includes(id)))];
        if (ids.length > 0) {
          const signs = await loadColourways(manifest as AssetManifest, stackPlan[0]!.pack, dir, deps.loadTexture, info, ids, "sign colourways");
          if (signs.size > 0) set.signColourways = signs;
        }
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
 * The itch build's game manifest (ticket 083 A): used for whatever it holds, with one console.error line if it lacks keys (the per-key drops draw those as placeholders) or if there is none (null, no fallback to the full packs).
 * Never rejects.
 */
async function readGameOnly(deps: LoadDeps, dir: string): Promise<AssetManifest | null> {
  const error = deps.error ?? ((m: string) => console.error(m));
  const url = `${dir}${GAME_PACK_DIR}manifest.json`;
  let found: unknown;
  try {
    found = await deps.fetchJson(url);
  } catch {
    found = null;
  }
  if (!isManifest(found) || !(found as AssetManifest).game) {
    error(`3D models: no game manifest at ${url}; this build ships only the game pack, so the placeholder shapes are drawn. Re-run npm run assets:game and npm run build:itch.`);
    return null;
  }
  const game = found as AssetManifest;
  const have = new Set(game.packs.flatMap((p) => p.assets.map((a) => calibrationKey(p.pack, a.name))));
  const asked: PageLoadLists = { table: deps.table ?? MODEL_TABLE, stackKeys: deps.stackKeys ?? [], dressKeys: deps.dressKeys ?? [], tileKeys: deps.tileKeys ?? [], stepKeys: deps.stepKeys ?? [] };
  const lacking = listedKeys(asked).filter((k) => !have.has(k));
  if (lacking.length > 0) error(`3D models: the game pack lacks ${lacking.length} model(s) (${lacking.slice(0, 3).join(", ")}${lacking.length > 3 ? ", ..." : ""}); this build ships only the game pack. Re-run npm run assets:game and npm run build:itch.`);
  return game;
}

/**
 * The game pack's manifest (ticket 082 A), or null with one line saying why the full packs are loaded instead. Used only when it is a manifest this build reads, carries `game`, and holds every key `deps` asks for
 * (a stale one is never used in part). Never rejects.
 */
async function readGamePack(deps: LoadDeps, dir: string, info: (message: string) => void): Promise<AssetManifest | null> {
  let found: unknown;
  try {
    found = await deps.fetchJson(`${dir}${GAME_PACK_DIR}manifest.json`);
  } catch {
    found = null;
  }
  if (!isManifest(found) || !(found as AssetManifest).game) {
    info("3D models: no game pack; loading the full packs (npm run assets:game makes it).");
    return null;
  }
  const game = found as AssetManifest;
  const have = new Set(game.packs.flatMap((p) => p.assets.map((a) => calibrationKey(p.pack, a.name))));
  const asked: PageLoadLists = { table: deps.table ?? MODEL_TABLE, stackKeys: deps.stackKeys ?? [], dressKeys: deps.dressKeys ?? [], tileKeys: deps.tileKeys ?? [], stepKeys: deps.stepKeys ?? [] };
  const lacking = listedKeys(asked).filter((k) => !have.has(k));
  if (lacking.length > 0) {
    info(`3D models: the game pack lacks ${lacking.length} model(s) (${lacking.slice(0, 3).join(", ")}${lacking.length > 3 ? ", ..." : ""}); loading the full packs. Run npm run assets:game.`);
    return null;
  }
  return game;
}

/**
 * Load the pool's colourway atlases that `pack` lists (ticket 054 B), in parallel through `loadTexture`. Only ids in COLOURWAY_POOL (never the base, which needs no file, nor a B tone, an emissive map or a
 * billboard), each once. A texture that fails drops that id with one line; the others are kept. Says once how many of the pool's non-base ids are in. Never rejects.
 */
async function loadColourways(manifest: AssetManifest, pack: string, dir: string, loadTexture: (url: string) => Promise<Texture>, info: (message: string) => void, ids?: readonly string[], what = "colourways"): Promise<Map<string, Texture>> {
  const listed = manifest.packs.find((p) => p.pack === pack)?.colourways ?? [];
  const wanted = ids ?? COLOURWAY_POOL.filter((id) => id !== "base");
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
  info(`3D models: ${pack} ${what}: ${out.size} of ${wanted.length} loaded`);
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
function loadPageModels(extra: Pick<LoadDeps, "table" | "tileKeys" | "signColourways">): Promise<ModelSet> {
  let started: number | null = null;
  // Dev's many module requests fill the default 250-entry resource timing buffer before the GLBs are fetched, so the load line would count none.
  if (import.meta.env.DEV && typeof performance !== "undefined") performance.setResourceTimingBufferSize(5000);
  const fetchJson = async (url: string, init?: { cache: "no-store" }): Promise<unknown> => {
    started ??= performance.now();
    const r = await fetch(url, init);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as unknown;
  };
  // `?packs=full` (dev only) skips the game pack, for the before-and-after measurement.
  const full = import.meta.env.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).get("packs") === "full";
  const itch = import.meta.env.MODE === ITCH_BUILD_MODE;
  return loadSavedCalibration({ dev: import.meta.env.DEV || itch, fetchJson }).then((saved) => {
    const tables = effectiveFronts({ fronts: BUILDING_FRONTS, exclude: BUILDING_EXCLUDE }, saved);
    // The City Pack's stack pieces load too (ticket 050 C); with no City Pack in the manifest nothing extra is fetched and the set has no stack slot.
    return loadModels({ fetchJson, loadGlb: async (url) => (await new GLTFLoader().loadAsync(url)).scene, loadTexture: (url) => new TextureLoader().loadAsync(url), fronts: tables.fronts, exclude: tables.exclude, gamePack: !full, gameOnly: itch, ...pageLoadLists(extra) }).then((set) => {
      if (import.meta.env.DEV) loadLine(started);
      return set;
    });
  });
}

/** Dev only (ticket 082 A criterion 5): one console line with the manifest used, the GLBs fetched, their MB and the time since the first manifest fetch. */
function loadLine(started: number | null): void {
  if (typeof performance === "undefined" || started === null) return;
  const glbs = performance.getEntriesByType("resource").filter((e) => /\.glb(\?|$)/.test(e.name)) as PerformanceResourceTiming[];
  const bytes = glbs.reduce((n, e) => n + (e.encodedBodySize || e.transferSize || 0), 0);
  const kind = glbs.length === 0 ? "none" : glbs.every((e) => e.name.includes(`/${GAME_PACK_DIR}`)) ? "game" : "full";
  console.info(`3D models: ${kind} manifest, ${glbs.length} GLB(s), ${(bytes / 1048576).toFixed(1)} MB, ${((performance.now() - started) / 1000).toFixed(1)} s from the first manifest fetch.`);
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
export function sharedTileModels(tileKeys: readonly CalibrationKey[], signColourways?: readonly string[]): Promise<ModelSet> {
  sharedTile ??= signColourways ? loadPageModels({ table: [], tileKeys, signColourways }) : loadPageModels({ table: [], tileKeys });
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

