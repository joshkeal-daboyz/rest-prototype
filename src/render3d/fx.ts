/**
 * Ticket 081 FX2: the city view's particle effects: the pool, the textures and meshes, live-break sparks and repair flashes. Josh's particle pack is Unity prefabs, so each effect is rebuilt here from camera-facing
 * sprites (`FX_TEXTURES`) and two instanced pack meshes (`FX_MESHES`), moved by a small CPU pool, under the renderer's own additive material. The pack's textures and meshes arrive through the game pack
 * (`npm run assets:game`, FX1) and are fetched by URL at run time; with none (CI, a fresh clone, an older pack) each effect uses a texture drawn in code and a mesh-less particle is a sprite.
 *
 * Pure parts (testable without a canvas): `createParticlePool`, `sparkingCuts`, `repairedFaults`, `fxSwitch`, `fxTextures`, `fxMeshes`, `fxFallback`. `createFxLayer` makes the draw meshes (a few instanced meshes made once, at their
 * full size, compiled by the view's first frame; per frame only their arrays and `count` are written).
 */

import {
  AdditiveBlending, BoxGeometry, BufferGeometry, Color, DataTexture, DynamicDrawUsage, Euler, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Quaternion, RGBAFormat, TextureLoader, Vector3, type Object3D, type Texture,
} from "three";
import { FX_MESHES, FX_TEXTURES, GAME_PACK_DIR, type FxMeshId, type FxTextureId } from "../core";
import type { GridState } from "../grid";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { WORLD_PER_METRE } from "./models";
import { defaultDir, loadModels, type LoadDeps } from "./models3d";

const S = WORLD_PER_METRE;

// ---- the switch ----

export type FxSwitch = "on" | "off" | "all";

/** `fx=0` draws no effect and `fx=all` runs every effect at once, without stopping (dev only, for the measure). Anything else, and every production build, is "on". */
export function fxSwitch(search: string, dev: boolean): FxSwitch {
  if (!dev) return "on";
  const v = new URLSearchParams(search).get("fx");
  return v === "0" ? "off" : v === "all" ? "all" : "on";
}

// ---- the pool ----

/** What a spawn is given (one object a caller reuses, so a spawn allocates nothing): position, velocity (world units, per second), life (s), size (world units), `grow` (the size at the end of life, as a multiple), `spin`, and the colour from the start of life to its end. */
export interface ParticleInit {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
  grow: number;
  spin: number;
  r0: number;
  g0: number;
  b0: number;
  r1: number;
  g1: number;
  b1: number;
}

export function newParticleInit(): ParticleInit {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, size: 1, grow: 1, spin: 0, r0: 1, g0: 1, b0: 1, r1: 1, g1: 1, b1: 1 };
}

/** A fixed-size particle store in typed arrays, dense in `[0, count)`. Neither `spawn` nor `step` allocates. */
export interface ParticlePool {
  readonly max: number;
  count: number;
  readonly pos: Float32Array;
  readonly vel: Float32Array;
  readonly age: Float32Array;
  readonly life: Float32Array;
  readonly size: Float32Array;
  readonly grow: Float32Array;
  readonly spin: Float32Array;
  /** Start and end colour, r g b each. */
  readonly c0: Float32Array;
  readonly c1: Float32Array;
  /** Adds a particle; when full, it takes the place of the oldest. Returns its index. */
  spawn(p: Readonly<ParticleInit>): number;
  /** Moves, ages and frees: `gravity` pulls y down (units per second squared), `drag` slows (per second). */
  step(dt: number, gravity: number, drag: number): void;
  clear(): void;
}

export function createParticlePool(max: number): ParticlePool {
  const n = Math.max(1, Math.floor(max));
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const age = new Float32Array(n);
  const life = new Float32Array(n);
  const size = new Float32Array(n);
  const grow = new Float32Array(n);
  const spin = new Float32Array(n);
  const c0 = new Float32Array(n * 3);
  const c1 = new Float32Array(n * 3);
  const copy = (from: number, to: number): void => {
    for (let k = 0; k < 3; k++) {
      pos[to * 3 + k] = pos[from * 3 + k]!;
      vel[to * 3 + k] = vel[from * 3 + k]!;
      c0[to * 3 + k] = c0[from * 3 + k]!;
      c1[to * 3 + k] = c1[from * 3 + k]!;
    }
    age[to] = age[from]!;
    life[to] = life[from]!;
    size[to] = size[from]!;
    grow[to] = grow[from]!;
    spin[to] = spin[from]!;
  };
  const pool: ParticlePool = {
    max: n,
    count: 0,
    pos,
    vel,
    age,
    life,
    size,
    grow,
    spin,
    c0,
    c1,
    spawn(p) {
      let i = pool.count;
      if (i >= n) {
        i = 0;
        for (let k = 1; k < n; k++) if (age[k]! > age[i]!) i = k;
      } else pool.count++;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      vel[i * 3] = p.vx;
      vel[i * 3 + 1] = p.vy;
      vel[i * 3 + 2] = p.vz;
      age[i] = 0;
      life[i] = p.life;
      size[i] = p.size;
      grow[i] = p.grow;
      spin[i] = p.spin;
      c0[i * 3] = p.r0;
      c0[i * 3 + 1] = p.g0;
      c0[i * 3 + 2] = p.b0;
      c1[i * 3] = p.r1;
      c1[i * 3 + 1] = p.g1;
      c1[i * 3 + 2] = p.b1;
      return i;
    },
    step(dt, gravity, drag) {
      const k = Math.max(0, 1 - drag * dt);
      let i = 0;
      while (i < pool.count) {
        const a = age[i]! + dt;
        if (a >= life[i]!) {
          pool.count--;
          if (i !== pool.count) copy(pool.count, i);
          continue;
        }
        age[i] = a;
        vel[i * 3 + 1] = vel[i * 3 + 1]! - gravity * dt;
        for (let j = 0; j < 3; j++) {
          vel[i * 3 + j] = vel[i * 3 + j]! * k;
          pos[i * 3 + j] = pos[i * 3 + j]! + vel[i * 3 + j]! * dt;
        }
        i++;
      }
    },
    clear() {
      pool.count = 0;
    },
  };
  return pool;
}

// ---- which cuts spark, which faults were repaired (pure, from the state) ----

/** A cut span as the effects need it: its fault and the line it cuts. */
export interface FxCut {
  readonly fault: string;
  readonly line: string;
}

/**
 * The cuts that spark this frame, by E2's rule moved out of the draw loop unchanged: the cut is still there (`faults` holds it), `sparking` holds its line, and `reached` says current gets to it (always in play; while
 * the Relight runs, its line's fraction is past 0). Writes the indexes into `cuts` to `out` (cleared first) and returns it. A cut whose fault is repaired, or that current does not reach (an unreadable one), never sparks.
 */
export function sparkingCuts(state: Pick<GridState, "faults" | "sparking">, cuts: readonly FxCut[], reached: (cut: FxCut, index: number) => boolean, out: number[]): number[] {
  out.length = 0;
  for (let i = 0; i < cuts.length; i++) {
    const cut = cuts[i]!;
    let there = false;
    for (const f of state.faults) if (f.id === cut.fault) there = true;
    if (there && state.sparking.has(cut.line) && reached(cut, i)) out.push(i);
  }
  return out;
}

/**
 * The fault ids that left `faults` between two frames while `parts` got shorter: a repair (it spends a part). An undo or a reset removes a fault only by giving parts back, and a fuse that blows adds a fault, so
 * none of those flash. Writes into `out` (cleared first) and returns it.
 */
export function repairedFaults(prev: Pick<GridState, "faults" | "parts"> | null, now: Pick<GridState, "faults" | "parts">, out: string[]): string[] {
  out.length = 0;
  if (prev === null || now.parts.length >= prev.parts.length) return out;
  for (const f of prev.faults) {
    let still = false;
    for (const g of now.faults) if (g.id === f.id) still = true;
    if (!still) out.push(f.id);
  }
  return out;
}

// ---- the textures ----

export interface FxTextureDeps {
  /** Resolves to the parsed JSON, and rejects on a network error or a non-OK status. */
  fetchJson(url: string): Promise<unknown>;
  /** Resolves to the image at `url` as a texture, and rejects if it cannot be fetched. */
  loadTexture(url: string): Promise<Texture>;
  /** Folder of the manifest, ending in "/". Default: `defaultDir()`. */
  dir?: string;
  /** Where the one line naming the fallbacks goes. Default: console.info. */
  info?: (message: string) => void;
}

export const FX_TEXTURE_IDS = Object.keys(FX_TEXTURES) as FxTextureId[];
export const FX_MESH_IDS = Object.keys(FX_MESHES) as FxMeshId[];

const hash = (n: number): number => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** A texture drawn in code, for when the pack's PNG is not there: a four-point star, a soft dot, a jagged vertical bolt, a soft blob. White, with the shape in alpha. */
export function fxFallback(id: FxTextureId): DataTexture {
  const w = id === "lightning" ? 32 : 64;
  const h = id === "lightning" ? 128 : 64;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = ((x + 0.5) / w) * 2 - 1;
      const ny = ((y + 0.5) / h) * 2 - 1;
      const d = Math.hypot(nx, ny);
      const edge = Math.max(0, 1 - d);
      let a = 0;
      if (id === "sparkle") a = Math.min(1, Math.exp(-14 * Math.min(Math.abs(nx), Math.abs(ny))) * edge * 1.4 + Math.exp(-d * d * 22));
      else if (id === "softSpot") a = Math.exp(-d * d * 5) * edge;
      else if (id === "smoke") a = edge * edge * (0.65 + 0.35 * hash(x * 7 + y * 131));
      else {
        const row = Math.floor(y / 6);
        const c = (hash(row * 3.7) - 0.5) * 0.7;
        const dx = (nx - c) / 0.16;
        a = Math.exp(-dx * dx) * (1 - Math.abs(ny) * 0.2);
      }
      const o = (y * w + x) * 4;
      data[o] = 255;
      data[o + 1] = 255;
      data[o + 2] = 255;
      data[o + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255);
    }
  }
  const tex = new DataTexture(data, w, h, RGBAFormat);
  tex.needsUpdate = true;
  tex.name = `fx-fallback:${id}`;
  return tex;
}

const describe = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * The four effect textures: those the game manifest's `fx` lists, loaded by URL under `game/`; any id not listed, or whose image fails, takes `fxFallback(id)`, with one line naming the fallbacks. Never throws.
 */
export async function fxTextures(deps: FxTextureDeps): Promise<Record<FxTextureId, Texture>> {
  const info = deps.info ?? ((m: string) => console.info(m));
  const dir = deps.dir ?? defaultDir();
  const listed = new Map<FxTextureId, string>();
  try {
    const m = (await deps.fetchJson(`${dir}${GAME_PACK_DIR}manifest.json`)) as { fx?: unknown } | null;
    if (m && Array.isArray(m.fx)) {
      for (const e of m.fx as { id?: unknown; image?: unknown }[]) {
        if (e && typeof e.id === "string" && e.id in FX_TEXTURES && typeof e.image === "string" && !e.image.includes("..")) listed.set(e.id as FxTextureId, e.image);
      }
    }
  } catch {
    // No game pack: every texture is drawn in code.
  }
  const out = {} as Record<FxTextureId, Texture>;
  const fallen: FxTextureId[] = [];
  await Promise.all(
    FX_TEXTURE_IDS.map(async (id) => {
      const image = listed.get(id);
      if (image !== undefined) {
        try {
          out[id] = await deps.loadTexture(`${dir}${GAME_PACK_DIR}${image}`);
          return;
        } catch {
          // Falls through to the drawn texture.
        }
      }
      fallen.push(id);
    }),
  );
  fallen.sort((a, b) => FX_TEXTURE_IDS.indexOf(a) - FX_TEXTURE_IDS.indexOf(b));
  for (const id of fallen) out[id] = fxFallback(id);
  if (fallen.length > 0) info(`3D effects: drawn textures for ${fallen.join(", ")}; run npm run assets:game.`);
  return out;
}

// ---- the pack meshes ----

/**
 * The pack's `spark` and `shard` meshes, as geometry, through a `loadModels` call of their own (after the city's, so a game pack without them never sends the city's models to the full packs). Each is null when the set
 * lacks it, with one line naming the missing ids. The geometry is a clone with the node's transform baked in, centred and scaled to one unit (the spark's longest axis along +z, the shard's largest extent 1), so the
 * pack's units never matter. Never throws.
 */
export async function fxMeshes(deps: LoadDeps): Promise<Record<FxMeshId, BufferGeometry | null>> {
  const info = deps.info ?? ((m: string) => console.info(m));
  const out = { spark: null, shard: null } as Record<FxMeshId, BufferGeometry | null>;
  try {
    const set = await loadModels({ ...deps, table: [], tileKeys: FX_MESH_IDS.map((id) => FX_MESHES[id]) });
    for (const id of FX_MESH_IDS) {
      const name = FX_MESHES[id].slice(FX_MESHES[id].indexOf(":") + 1);
      const root = set.tile?.find((m) => m.entry.name === name)?.root;
      const geometry = root ? unitGeometry(root, id === "spark") : null;
      out[id] = geometry;
    }
  } catch (e) {
    info(`3D effects: pack meshes not loaded (${describe(e)}).`);
  }
  const missing = FX_MESH_IDS.filter((id) => out[id] === null);
  if (missing.length > 0) info(`3D effects: no pack mesh for ${missing.join(", ")}; drawn as sprites. Run npm run assets:convert particle-fx-pack, then npm run assets:game.`);
  return out;
}

const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);

/** The first mesh under `root`, as a clone in the root's frame, centred and scaled to one unit; the streak's longest axis is turned to +z. */
function unitGeometry(root: Object3D, streak: boolean): BufferGeometry | null {
  root.updateWorldMatrix(true, true);
  let found: Mesh | null = null;
  root.traverse((o) => {
    if (!found && (o as Mesh).isMesh && (o as Mesh).geometry) found = o as Mesh;
  });
  if (!found) return null;
  const mesh: Mesh = found;
  const g = mesh.geometry.clone();
  g.applyMatrix4(new Matrix4().copy(mesh.matrixWorld).premultiply(new Matrix4().copy(root.matrixWorld).invert()));
  g.computeBoundingBox();
  const box = g.boundingBox;
  if (!box || box.isEmpty()) {
    g.dispose();
    return null;
  }
  const c = box.getCenter(new Vector3());
  g.translate(-c.x, -c.y, -c.z);
  const size = box.getSize(new Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!(longest > 0) || !Number.isFinite(longest)) {
    g.dispose();
    return null;
  }
  if (streak) {
    const axis = size.x >= size.y && size.x >= size.z ? AXIS_X : size.y >= size.z ? AXIS_Y : AXIS_Z;
    if (axis !== AXIS_Z) g.applyQuaternion(new Quaternion().setFromUnitVectors(axis, AXIS_Z));
  }
  g.scale(1 / longest, 1 / longest, 1 / longest);
  g.computeBoundingSphere();
  return g;
}

/** The page's textures and meshes, fetched once with the real fetch, TextureLoader and GLTFLoader (dev only: the pack lives under `assets/private/`, which a production build never holds). */
let sharedFxLoad: Promise<{ textures: Record<FxTextureId, Texture>; meshes: Record<FxMeshId, BufferGeometry | null> }> | null = null;

export function sharedFx(): Promise<{ textures: Record<FxTextureId, Texture>; meshes: Record<FxMeshId, BufferGeometry | null> }> {
  sharedFxLoad ??= (async () => {
    const dev = import.meta.env.DEV;
    const fetchJson = async (url: string): Promise<unknown> => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as unknown;
    };
    const textures = dev
      ? await fxTextures({ fetchJson, loadTexture: (url) => new TextureLoader().loadAsync(url) })
      : { sparkle: fxFallback("sparkle"), softSpot: fxFallback("softSpot"), lightning: fxFallback("lightning"), smoke: fxFallback("smoke") };
    let meshes: Record<FxMeshId, BufferGeometry | null> = { spark: null, shard: null };
    if (dev) {
      meshes = await fxMeshes({ fetchJson, loadGlb: async (url) => (await new GLTFLoader().loadAsync(url)).scene });
    }
    return { textures, meshes };
  })();
  return sharedFxLoad;
}

/** Forget the page's effect assets (tests). */
export function resetSharedFx(): void {
  sharedFxLoad = null;
}

// ---- the draw layer ----

interface Layer {
  readonly pool: ParticlePool;
  readonly mesh: InstancedMesh;
  readonly gravity: number;
  readonly drag: number;
  readonly kind: "sprite" | "streak" | "chip";
  readonly fade: (u: number) => number;
}

const fadeLinear = (u: number): number => 1 - u;
const fadeSoft = (u: number): number => (1 - u) * (1 - u);
const fadeWisp = (u: number): number => Math.sin(Math.PI * u) * 0.5;

const POOL_SIZES = { sparkle: 384, softSpot: 64, smoke: 48, spark: 256, shard: 96 } as const;

/** What `createFxLayer` hands back. All positions are world units (metres x `WORLD_PER_METRE`). */
export interface FxLayer {
  readonly group: Group;
  /** Swap in the loaded textures (the code-drawn ones stand in until then). */
  setTextures(t: Partial<Record<FxTextureId, Texture>>): void;
  /** Swap in the pack meshes; an id left null keeps being drawn as sprites. */
  setMeshes(m: Partial<Record<FxMeshId, BufferGeometry | null>>): void;
  /** One live break's sparks, soft flash and smoke, at emitter `slot` (each slot has its own timers): a burst every 0.1 to 0.3 s, a wisp a second. Call each frame the cut sparks. */
  breakAt(slot: number, x: number, y: number, z: number, time: number): void;
  /** A repair's flash, once: a soft bloom and a ring of sparkle with a few chips. */
  repairAt(x: number, y: number, z: number): void;
  /** Moves the particles and writes the draw arrays. `camera` is the view's rotation (sprites face it). */
  update(dt: number, camera: Quaternion): void;
  clear(): void;
  /** Particles alive, for the measure's label. */
  alive(): number;
  dispose(): void;
}

/**
 * Makes the effect meshes: one sprite mesh per texture (sparkle, soft spot, smoke) and one instanced mesh per pack mesh (spark, shard), each at its full pool size, additive, `depthWrite` off. They are in the group from
 * the start with `count` 0 (a mesh with no geometry yet holds a unit box), so the view's first frame compiles every program and nothing is added or removed later. `emitters` is how many break emitters there can be.
 */
export function createFxLayer(emitters: number, seed = 1): FxLayer {
  const group = new Group();
  group.name = "city-play:fx";
  const placeholder: Record<FxTextureId, DataTexture> = { sparkle: fxFallback("sparkle"), softSpot: fxFallback("softSpot"), lightning: fxFallback("lightning"), smoke: fxFallback("smoke") };
  const spriteMat = (id: FxTextureId): MeshBasicMaterial => new MeshBasicMaterial({ map: placeholder[id], color: 0xffffff, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const meshMat = new MeshBasicMaterial({ color: 0xffffff, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const quad = new BoxGeometry(1, 1, 0.001);
  const unit = new BoxGeometry(1, 1, 1);
  const geoms: BufferGeometry[] = [quad, unit];
  const mats: MeshBasicMaterial[] = [meshMat];
  const ownTextures = new Set<Texture>(Object.values(placeholder));

  const makeLayer = (max: number, geometry: BufferGeometry, material: MeshBasicMaterial, kind: Layer["kind"], gravity: number, drag: number, fade: (u: number) => number): Layer => {
    const mesh = new InstancedMesh(geometry, material, max);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    // The colour attribute exists from the start, so the program never changes shape later.
    mesh.setColorAt(0, new Color(0, 0, 0));
    mesh.instanceColor!.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.raycast = () => {};
    group.add(mesh);
    return { pool: createParticlePool(max), mesh, gravity: gravity * S, drag, kind, fade };
  };
  const sparkleMat = spriteMat("sparkle");
  const softMat = spriteMat("softSpot");
  const smokeMat = spriteMat("smoke");
  mats.push(sparkleMat, softMat, smokeMat);
  const sparkle = makeLayer(POOL_SIZES.sparkle, quad, sparkleMat, "sprite", 6, 1.4, fadeLinear);
  const soft = makeLayer(POOL_SIZES.softSpot, quad, softMat, "sprite", 0, 2.5, fadeSoft);
  const smoke = makeLayer(POOL_SIZES.smoke, quad, smokeMat, "sprite", -0.6, 1.6, fadeWisp);
  const spark = makeLayer(POOL_SIZES.spark, unit, meshMat, "streak", 9.8, 1.0, fadeLinear);
  const shard = makeLayer(POOL_SIZES.shard, unit, meshMat, "chip", 12, 0.6, fadeLinear);
  const layers = [sparkle, soft, smoke, spark, shard];
  let haveSpark = false;
  let haveShard = false;
  const matByTexture: Record<FxTextureId, MeshBasicMaterial | null> = { sparkle: sparkleMat, softSpot: softMat, lightning: null, smoke: smokeMat };

  // A small seeded generator, so a given run looks the same.
  let rs = (seed >>> 0) || 1;
  const rnd = (): number => {
    rs = (rs + 0x6d2b79f5) >>> 0;
    let t = rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nextBurst = new Float64Array(Math.max(emitters, 1));
  const nextSmoke = new Float64Array(Math.max(emitters, 1));
  const p = newParticleInit();

  const sparkOut = (x: number, y: number, z: number, hot: number): void => {
    // Orange to white, by chance; flies out and up, then falls.
    const a = rnd() * Math.PI * 2;
    const h = (1.2 + rnd() * 3) * S;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = Math.cos(a) * h;
    p.vz = Math.sin(a) * h;
    p.vy = (1.5 + rnd() * 3.5) * S;
    p.life = 0.4 + rnd() * 0.4;
    p.size = 0.5 * S;
    p.grow = 0.6;
    p.spin = 0;
    const w = rnd() * hot;
    p.r0 = 1.4;
    p.g0 = 0.75 + 0.7 * w;
    p.b0 = 0.25 + 1.1 * w;
    p.r1 = 1.2;
    p.g1 = 0.35;
    p.b1 = 0.1;
    (haveSpark ? spark : sparkle).pool.spawn(p);
  };
  const chipOut = (x: number, y: number, z: number, speed: number, cool: number): void => {
    const a = rnd() * Math.PI * 2;
    const h = (speed * (0.5 + rnd() * 0.7)) * S;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = Math.cos(a) * h;
    p.vz = Math.sin(a) * h;
    p.vy = (1.5 + rnd() * 2.5) * S;
    p.life = 0.5 + rnd() * 0.4;
    p.size = (haveShard ? 0.13 : 0.3) * S;
    p.grow = 1;
    p.spin = (rnd() - 0.5) * 18;
    p.r0 = 1.3;
    p.g0 = 0.65 + cool * 0.5;
    p.b0 = 0.2 + cool * 0.9;
    p.r1 = 1.1;
    p.g1 = 0.3;
    p.b1 = 0.08;
    (haveShard ? shard : sparkle).pool.spawn(p);
  };
  const flash = (x: number, y: number, z: number, size: number, grow: number, life: number, r: number, g: number, b: number, r1: number, g1: number, b1: number): void => {
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.life = life;
    p.size = size * S;
    p.grow = grow;
    p.spin = 0;
    p.r0 = r;
    p.g0 = g;
    p.b0 = b;
    p.r1 = r1;
    p.g1 = g1;
    p.b1 = b1;
    soft.pool.spawn(p);
  };

  const m4 = new Matrix4();
  const q = new Quaternion();
  const pv = new Vector3();
  const sv = new Vector3();
  const dv = new Vector3();
  const eu = new Euler();
  const one = new Quaternion();

  const paint = (l: Layer, camera: Quaternion): void => {
    const pool = l.pool;
    const arr = l.mesh.instanceMatrix.array as Float32Array;
    const col = l.mesh.instanceColor!.array as Float32Array;
    for (let i = 0; i < pool.count; i++) {
      const u = pool.age[i]! / pool.life[i]!;
      const f = l.fade(u);
      const size = pool.size[i]! * (1 + (pool.grow[i]! - 1) * u);
      pv.set(pool.pos[i * 3]!, pool.pos[i * 3 + 1]!, pool.pos[i * 3 + 2]!);
      if (l.kind === "sprite") {
        q.copy(camera);
        sv.set(size, size, size);
      } else if (l.kind === "streak") {
        dv.set(pool.vel[i * 3]!, pool.vel[i * 3 + 1]!, pool.vel[i * 3 + 2]!);
        const speed = dv.length();
        if (speed > 1e-6) q.setFromUnitVectors(AXIS_Z, dv.divideScalar(speed));
        else q.copy(one);
        const stretch = 0.6 + Math.min(speed / (4 * S), 1.4);
        sv.set(size * 0.5, size * 0.5, size * 2.2 * stretch);
      } else {
        const t = pool.age[i]! * pool.spin[i]!;
        q.setFromEuler(eu.set(t, t * 0.7, t * 0.4));
        sv.set(size, size, size);
      }
      m4.compose(pv, q, sv).toArray(arr, i * 16);
      const k = f;
      col[i * 3] = (pool.c0[i * 3]! + (pool.c1[i * 3]! - pool.c0[i * 3]!) * u) * k;
      col[i * 3 + 1] = (pool.c0[i * 3 + 1]! + (pool.c1[i * 3 + 1]! - pool.c0[i * 3 + 1]!) * u) * k;
      col[i * 3 + 2] = (pool.c0[i * 3 + 2]! + (pool.c1[i * 3 + 2]! - pool.c0[i * 3 + 2]!) * u) * k;
    }
    l.mesh.count = pool.count;
    if (pool.count > 0) {
      l.mesh.instanceMatrix.needsUpdate = true;
      l.mesh.instanceColor!.needsUpdate = true;
    }
  };

  return {
    group,
    setTextures(t) {
      for (const id of FX_TEXTURE_IDS) {
        const tex = t[id];
        const mat = matByTexture[id];
        if (!tex || !mat) continue;
        const old = mat.map;
        mat.map = tex;
        mat.needsUpdate = false;
        if (old && ownTextures.has(old) && old !== tex) {
          old.dispose();
          ownTextures.delete(old);
        }
      }
    },
    setMeshes(m) {
      if (m.spark) {
        spark.mesh.geometry = m.spark;
        geoms.push(m.spark);
        haveSpark = true;
      }
      if (m.shard) {
        shard.mesh.geometry = m.shard;
        geoms.push(m.shard);
        haveShard = true;
      }
    },
    breakAt(slot, x, y, z, time) {
      if (time >= nextBurst[slot]!) {
        nextBurst[slot] = time + 0.1 + rnd() * 0.2;
        const n = 6 + Math.floor(rnd() * 4);
        for (let i = 0; i < n; i++) sparkOut(x, y, z, 1);
        const c = 2 + Math.floor(rnd() * 2);
        for (let i = 0; i < c; i++) chipOut(x, y, z, 3.5, 0);
        flash(x, y, z, 1.5, 1.5, 0.2, 1.1, 0.55, 0.2, 0.5, 0.15, 0.05);
      }
      if (time >= nextSmoke[slot]!) {
        nextSmoke[slot] = time + 0.7 + rnd() * 0.6;
        p.x = x;
        p.y = y + 0.2 * S;
        p.z = z;
        p.vx = (rnd() - 0.5) * 0.6 * S;
        p.vy = (0.8 + rnd() * 0.5) * S;
        p.vz = (rnd() - 0.5) * 0.6 * S;
        p.life = 1.1 + rnd() * 0.5;
        p.size = 0.5 * S;
        p.grow = 3;
        p.spin = 0;
        p.r0 = 0.45;
        p.g0 = 0.4;
        p.b0 = 0.35;
        p.r1 = 0.3;
        p.g1 = 0.28;
        p.b1 = 0.26;
        smoke.pool.spawn(p);
      }
    },
    repairAt(x, y, z) {
      flash(x, y, z, 1.4, 2.2, 0.4, 1.6, 1.6, 1.5, 1.2, 0.7, 0.3);
      const n = 10;
      const phase = rnd() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = phase + (i / n) * Math.PI * 2;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = Math.cos(a) * 3.2 * S;
        p.vz = Math.sin(a) * 3.2 * S;
        p.vy = (0.3 + rnd() * 0.8) * S;
        p.life = 0.35 + rnd() * 0.15;
        p.size = 0.42 * S;
        p.grow = 0.7;
        p.spin = 0;
        p.r0 = 1.6;
        p.g0 = 1.6;
        p.b0 = 1.5;
        p.r1 = 1.3;
        p.g1 = 0.75;
        p.b1 = 0.3;
        sparkle.pool.spawn(p);
      }
      const c = 3 + Math.floor(rnd() * 2);
      for (let i = 0; i < c; i++) chipOut(x, y, z, 2.2, 1);
    },
    update(dt, camera) {
      for (const l of layers) {
        l.pool.step(dt, l.gravity, l.drag);
        paint(l, camera);
      }
    },
    clear() {
      for (const l of layers) {
        l.pool.clear();
        l.mesh.count = 0;
      }
    },
    alive() {
      let n = 0;
      for (const l of layers) n += l.pool.count;
      return n;
    },
    dispose() {
      for (const l of layers) {
        group.remove(l.mesh);
        l.mesh.dispose();
      }
      for (const g of geoms) g.dispose();
      for (const m of mats) m.dispose();
      for (const t of ownTextures) t.dispose();
    },
  };
}
