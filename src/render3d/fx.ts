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
import { BLOW_TIMING, FX_MESHES, FX_TEXTURES, GAME_PACK_DIR, type FxMeshId, type FxTextureId } from "../core";
import type { RelightPlan } from "../render/relight";
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

/** What a spawn is given (one object a caller reuses, so a spawn allocates nothing): position, velocity (world units, per second), life (s), size (world units), `grow` (the size at the end of life, as a multiple), `spin`, the colour from the start of life to its end, `ramp` (1: the hot-spark colour ramp by age instead of that colour pair) and `floor` (the height it bounces off when the pool steps with bounces). */
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
  ramp: number;
  floor: number;
}

/** A floor nothing reaches. */
export const NO_FLOOR = -1e9;

export function newParticleInit(): ParticleInit {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, size: 1, grow: 1, spin: 0, r0: 1, g0: 1, b0: 1, r1: 1, g1: 1, b1: 1, ramp: 0, floor: NO_FLOOR };
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
  readonly ramp: Float32Array;
  /** Start and end colour, r g b each. */
  readonly c0: Float32Array;
  readonly c1: Float32Array;
  /** Adds a particle; when full, it takes the place of the oldest. Returns its index. */
  spawn(p: Readonly<ParticleInit>): number;
  /**
   * Moves, ages and frees: `gravity` pulls y down (units per second squared), `drag` slows (per second). With `bounces`, a particle that falls through its own floor bounces once (its fall reversed at 0.35 of its speed,
   * its sideways speed at 0.6; one in three splits into two at half size with the rest of its life) and dies at its second touch.
   */
  step(dt: number, gravity: number, drag: number, bounces?: boolean): void;
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
  const ramp = new Float32Array(n);
  const floor = new Float32Array(n);
  const touched = new Uint8Array(n);
  const c0 = new Float32Array(n * 3);
  const c1 = new Float32Array(n * 3);
  let rs = 0x9e3779b9;
  const rnd = (): number => {
    rs ^= rs << 13;
    rs ^= rs >>> 17;
    rs ^= rs << 5;
    return (rs >>> 0) / 4294967296;
  };
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
    ramp[to] = ramp[from]!;
    floor[to] = floor[from]!;
    touched[to] = touched[from]!;
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
    ramp,
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
      ramp[i] = p.ramp;
      floor[i] = p.floor;
      touched[i] = 0;
      c0[i * 3] = p.r0;
      c0[i * 3 + 1] = p.g0;
      c0[i * 3 + 2] = p.b0;
      c1[i * 3] = p.r1;
      c1[i * 3 + 1] = p.g1;
      c1[i * 3 + 2] = p.b1;
      return i;
    },
    step(dt, gravity, drag, bounces = false) {
      const k = Math.max(0, 1 - drag * dt);
      let i = 0;
      while (i < pool.count) {
        const a = age[i]! + dt;
        let dead = a >= life[i]!;
        if (!dead) {
          age[i] = a;
          vel[i * 3 + 1] = vel[i * 3 + 1]! - gravity * dt;
          for (let j = 0; j < 3; j++) {
            vel[i * 3 + j] = vel[i * 3 + j]! * k;
            pos[i * 3 + j] = pos[i * 3 + j]! + vel[i * 3 + j]! * dt;
          }
          if (bounces && pos[i * 3 + 1]! < floor[i]! && vel[i * 3 + 1]! < 0) {
            if (touched[i]! >= 1) dead = true;
            else {
              touched[i] = 1;
              pos[i * 3 + 1] = floor[i]!;
              vel[i * 3 + 1] = -vel[i * 3 + 1]! * 0.35;
              vel[i * 3] = vel[i * 3]! * 0.6;
              vel[i * 3 + 2] = vel[i * 3 + 2]! * 0.6;
              if (pool.count < n && rnd() < 1 / 3) {
                size[i] = size[i]! * 0.5;
                const j = pool.count++;
                copy(i, j);
                vel[j * 3] = vel[j * 3]! * (0.6 + rnd() * 0.8) + (rnd() - 0.5) * 0.2;
                vel[j * 3 + 2] = vel[j * 3 + 2]! * (0.6 + rnd() * 0.8) + (rnd() - 0.5) * 0.2;
                vel[j * 3 + 1] = vel[j * 3 + 1]! * (0.7 + rnd() * 0.6);
              }
            }
          }
        }
        if (dead) {
          pool.count--;
          if (i !== pool.count) copy(pool.count, i);
          continue;
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

// ---- crackle arcs at a cut (pure) ----

/** A cut span's sagged wire: `pts` is x y z flat (world units), `cum_m` the metres along it at each point, `len_m` its length. */
export interface FxSpan {
  readonly pts: readonly number[];
  readonly cum_m: readonly number[];
  readonly len_m: number;
}

/** One crackle arc this frame: two ends on the cut span (world units), its width (world units), its colour, and the time slot it started in (a new slot is a new arc). */
export interface FxArc {
  slot: number;
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  width: number;
  r: number;
  g: number;
  b: number;
}

export function newFxArcs(): FxArc[] {
  return [0, 1].map(() => ({ slot: 0, ax: 0, ay: 0, az: 0, bx: 0, by: 0, bz: 0, width: 0, r: 1, g: 1, b: 1 }));
}

const pt = new Float64Array(3);

/** The point `s` metres along the span (clamped), into `pt`. */
function spanPoint(span: FxSpan, s: number): void {
  const c = span.cum_m;
  const n = c.length - 1;
  const at = s < 0 ? 0 : s > span.len_m ? span.len_m : s;
  let j = 0;
  while (j < n - 1 && c[j + 1]! < at) j++;
  const d = c[j + 1]! - c[j]!;
  const t = d > 0 ? (at - c[j]!) / d : 0;
  for (let k = 0; k < 3; k++) pt[k] = span.pts[j * 3 + k]! + (span.pts[j * 3 + 3 + k]! - span.pts[j * 3 + k]!) * t;
}

/** The farthest from the middle an arc's end may be, in metres. */
export const ARC_REACH_M = 1.5;

/**
 * A sparking cut's crackle arcs at `time`, from the span and the time alone (a hash of the cut and the time slot, so it repeats for the same inputs and allocates nothing). One or two flick at once, each for 0.05 to
 * 0.12 s, a new one every 0.08 to 0.25 s; each runs between two points on the span within `ARC_REACH_M` either side of its middle (never past its ends), 0.25 to 0.4 m wide, white-hot to amber (blue at most 0.8 of red,
 * so it never reads as a cold brownout arc). Writes into `out` (two `FxArc`s from `newFxArcs`) and returns how many are on.
 */
export function cutArcs(cut: { readonly id: number; readonly span: FxSpan }, time: number, out: FxArc[]): number {
  let n = 0;
  const id = cut.id;
  const mid = cut.span.len_m / 2;
  for (let c = 0; c < 2; c++) {
    const period = 0.08 + 0.17 * hash(id * 3.1 + c * 7.7 + 0.5);
    const x = time / period + c * 0.37;
    const slot = Math.floor(x);
    const phase = (x - slot) * period;
    const h = hash(id * 11.3 + c * 2.9 + slot * 1.71);
    if (c === 1 && h < 0.5) continue;
    if (phase >= 0.05 + 0.07 * hash(h * 91.7 + slot * 0.37)) continue;
    const a = out[n]!;
    n++;
    a.slot = slot + c * 1e6;
    let s0 = mid - (0.3 + (ARC_REACH_M - 0.3) * hash(h * 13.1 + 1));
    let s1 = mid + (0.3 + (ARC_REACH_M - 0.3) * hash(h * 17.3 + 2));
    if (hash(h * 5.9 + 3) < 0.5) {
      const t = s0;
      s0 = s1;
      s1 = t;
    }
    spanPoint(cut.span, s0);
    a.ax = pt[0]!;
    a.ay = pt[1]!;
    a.az = pt[2]!;
    spanPoint(cut.span, s1);
    a.bx = pt[0]!;
    a.by = pt[1]!;
    a.bz = pt[2]!;
    a.width = (0.25 + 0.15 * hash(h * 7.7 + 4)) * S;
    const w = hash(h * 3.3 + 5);
    a.r = 1;
    a.g = 0.95 - 0.25 * w;
    a.b = 0.8 - 0.5 * w;
  }
  return n;
}

// ---- the blown fuse's bolt, brownout arcs and Relight bursts (pure; 081 FX4, FX3) ----

/** The sparks a blown fuse bursts: twice FX2's biggest single burst (a live break's pop, up to 70). */
export const BLOW_SPARKS = 140;
/** The bolt's length along the wire, in metres. */
export const BOLT_LEN_M = 5;

/** One wire of a route, as `FxSpan`, and whether the route runs it from its far end. */
export interface FxPiece extends FxSpan {
  readonly rev: boolean;
}

/** The wires from a blown fuse out to one lamp, in order, fuse first. `len_m` is their total. */
export interface FxRoute {
  readonly pieces: readonly FxPiece[];
  readonly len_m: number;
}

/** One bolt this frame: metres from the fuse, head nearest it. */
export interface FxBolt {
  route: number;
  head: number;
  tail: number;
}

export function newFxBolts(n: number): FxBolt[] {
  const out: FxBolt[] = [];
  for (let i = 0; i < n; i++) out.push({ route: 0, head: 0, tail: 0 });
  return out;
}

/** When the burst at the fuse comes: the sound's pop (`popAt`), or 0 when the blow has no path (as `BLOW_TIMING` says). */
export const blowBurstAt = (hasPath: boolean): number => (hasPath ? BLOW_TIMING.popAt : 0);

/** The burst is due in the frame that takes the blow's clock from `prevT` (exclusive) to `t` (inclusive): once. */
export const blowBurstDue = (hasPath: boolean, prevT: number, t: number): boolean => {
  const at = blowBurstAt(hasPath);
  return prevT < at && at <= t;
};

/**
 * The bolts `t` seconds after a blow, one per route, written to `out`; returns how many. Each runs from its lamp's end towards the fuse and reaches it at `popAt`, then shrinks to nothing over `pop`. Before the blow,
 * after `popAt + pop`, or with no routes, nothing.
 */
export function blowBolts(routes: readonly FxRoute[], t: number, out: FxBolt[]): number {
  if (t < 0 || t >= BLOW_TIMING.popAt + BLOW_TIMING.pop) return 0;
  let n = 0;
  for (let i = 0; i < routes.length && n < out.length; i++) {
    const len = routes[i]!.len_m;
    const b = out[n++]!;
    b.route = i;
    if (t <= BLOW_TIMING.popAt) {
      b.head = len * (1 - t / BLOW_TIMING.popAt);
      b.tail = Math.min(len, b.head + BOLT_LEN_M);
    } else {
      b.head = 0;
      b.tail = Math.min(len, BOLT_LEN_M * (1 - (t - BLOW_TIMING.popAt) / BLOW_TIMING.pop));
    }
  }
  return n;
}

/** The point `s` metres from the fuse along a route (clamped), into `out`. */
export function routePoint(route: FxRoute, s: number, out: { x: number; y: number; z: number }): void {
  let rest = s < 0 ? 0 : s;
  const last = route.pieces.length - 1;
  for (let i = 0; i <= last; i++) {
    const piece = route.pieces[i]!;
    if (rest <= piece.len_m || i === last) {
      const m = Math.min(rest, piece.len_m);
      spanPoint(piece, piece.rev ? piece.len_m - m : m);
      out.x = pt[0]!;
      out.y = pt[1]!;
      out.z = pt[2]!;
      return;
    }
    rest -= piece.len_m;
  }
}

/** A pole end of a job wire as the arcs need it: its line, and the segment from the pole's insulator to 0.6 m along the wire (world units). */
export interface FxPort {
  readonly line: string;
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  readonly bx: number;
  readonly by: number;
  readonly bz: number;
}

/** The most brownout arcs on at once. */
export const ARCS_AT_ONCE = 3;
const ARC_SLOT_S = 0.2;

/**
 * The brownout arcs this frame, as indexes into `ports` written to `out` (cleared first), at most `max`. Only while `state.brownout`, and only on a port whose line is powered and carried by a feed that is over. A
 * port's arc starts in a time slot by a hash of the port and the slot and lasts 0.08 to 0.15 s, so the answer depends on its inputs alone. `every` (fx=all, for the measure) skips the state and the hash.
 */
export function arcSpots(state: Pick<GridState, "brownout" | "powered" | "feedOf" | "feeds">, ports: readonly FxPort[], time: number, max: number, out: number[], every = false): number[] {
  out.length = 0;
  if (!every && !state.brownout) return out;
  const n = ports.length;
  if (n === 0) return out;
  const slot = Math.floor(time / ARC_SLOT_S);
  const phase = time - slot * ARC_SLOT_S;
  const from = Math.floor(hash(slot * 1.37) * n);
  for (let k = 0; k < n && out.length < max; k++) {
    const i = (from + k) % n;
    const port = ports[i]!;
    if (!every) {
      if (!state.powered.has(port.line)) continue;
      const feed = state.feedOf.get(port.line);
      if (feed === undefined || state.feeds.get(feed)?.over !== true) continue;
      const h = hash(i * 5.7 + slot * 2.3);
      if (h > 0.3) continue;
      const start = 0.05 * hash(h * 91.3 + i);
      const dur = 0.08 + 0.07 * hash(h * 33.1 + i * 1.9);
      if (phase < start || phase >= start + dur) continue;
    }
    out.push(i);
  }
  return out;
}

/** A job lamp the Relight may burst at: its node index and place (world units). */
export interface FxLamp {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * The lamps (indexes into `lamps`) whose arrival on the Relight clock falls in (`prevT`, `t`] and that end up lit, written to `out` (cleared first) in the order they ignite. From the plan and the clock alone, so a
 * click changes nothing.
 */
export function relightBursts(plan: Pick<RelightPlan, "nodeArrive">, lit: (index: number) => boolean, lamps: readonly FxLamp[], prevT: number, t: number, out: number[]): number[] {
  out.length = 0;
  for (let i = 0; i < lamps.length; i++) {
    const a = plan.nodeArrive[lamps[i]!.index]!;
    if (a > prevT && a <= t && lit(lamps[i]!.index)) out.push(i);
  }
  if (out.length > 1) out.sort((x, y) => plan.nodeArrive[lamps[x]!.index]! - plan.nodeArrive[lamps[y]!.index]!);
  return out;
}

// ---- the draw layer ----

/** The most quads the bolts and brownout arcs may queue in one frame. */
const DIRECT_MAX = 128;

interface Layer {
  readonly pool: ParticlePool;
  readonly mesh: InstancedMesh;
  readonly gravity: number;
  readonly drag: number;
  readonly kind: "sprite" | "streak" | "chip";
  readonly fade: (u: number) => number;
  /** Instances written straight each frame after the pool's (a glow per fed cut, the arcs). */
  direct: number;
  peak: number;
}

const fadeLinear = (u: number): number => 1 - u;
const fadeSoft = (u: number): number => (1 - u) * (1 - u);
const fadeWisp = (u: number): number => Math.sin(Math.PI * u) * 0.5;
const fadeHot = (u: number): number => (u < 0.6 ? 1 : (1 - u) / 0.4);

/** A hot spark's colour by age (the share of its life): white-hot to 30 %, then yellow-orange, then deep orange-red as it fades. Brightened, since the material adds. */
const HOT = 1.5;
function hotColour(u: number, out: Color): void {
  if (u < 0.3) out.setRGB(1.0, 0.97, 0.85);
  else if (u < 0.65) {
    const t = (u - 0.3) / 0.35;
    out.setRGB(1.0, 0.97 + (0.65 - 0.97) * t, 0.85 + (0.2 - 0.85) * t);
  } else {
    const t = (u - 0.65) / 0.35;
    out.setRGB(1.0 + (0.9 - 1.0) * t, 0.65 + (0.25 - 0.65) * t, 0.2 + (0.05 - 0.2) * t);
  }
  out.multiplyScalar(HOT);
}

/** One break emitter: where it sits (the cut span's middle sample), the ground height under it, and its span (for the arcs). World units. */
export interface FxEmitter {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly ground: number;
  readonly span: FxSpan;
}

/** Each layer's mesh `count` this frame. */
export interface FxCounts {
  sparkle: number;
  softSpot: number;
  smoke: number;
  lightning: number;
  spark: number;
  shard: number;
}

/** What `createFxLayer` hands back. All positions are world units (metres x `WORLD_PER_METRE`). */
export interface FxLayer {
  readonly group: Group;
  /** Swap in the loaded textures (the code-drawn ones stand in until then). */
  setTextures(t: Partial<Record<FxTextureId, Texture>>): void;
  /** Swap in the pack meshes; an id left null keeps being drawn as sprites. */
  setMeshes(m: Partial<Record<FxMeshId, BufferGeometry | null>>): void;
  /**
   * Feeds emitter `slot` for this frame: a burst every 0.05 to 0.12 s, a pop every 0.6 to 1.2 s, two smoke wisps a second, a steady flickering glow and crackle arcs. Call it each frame the cut sparks and
   * not on a frame it does not: an emitter not fed in a frame spawns nothing, shows no glow or arc that frame, and has its timers reset (sparks in flight finish their fall).
   */
  breakAt(slot: number, time: number): void;
  /** A repair's flash, once: a soft bloom and a ring of sparkle with a few chips. */
  repairAt(x: number, y: number, z: number): void;
  /** A blown fuse's burst, once, at the box: `BLOW_SPARKS` sparks, chips and a soft-spot flash. `ground` is the height the sparks bounce off. */
  blowAt(x: number, y: number, z: number, ground: number): void;
  /** A small cold flash for a brownout arc, for a few frames (call it each frame the arc is on). */
  arcFlashAt(x: number, y: number, z: number): void;
  /** A lit lamp's burst, once: a soft flash and a fountain of sparkle in the lit pane's amber. */
  bloomAt(x: number, y: number, z: number): void;
  /** Queues one lightning quad between two points for this frame (world units, `width` too; `r g b` before the layer's gain). Dropped past the frame's room. */
  arcAt(ax: number, ay: number, az: number, bx: number, by: number, bz: number, width: number, r: number, g: number, b: number): void;
  /** Queues a jagged bolt along `route` from `tail` to `head` metres from the fuse, for this frame. */
  bolt(route: FxRoute, head: number, tail: number): void;
  /** Moves the particles and writes the draw arrays. `camera` is the view's rotation (sprites face it). */
  update(dt: number, camera: Quaternion): void;
  clear(): void;
  /** Particles alive, for the measure's label. */
  alive(): number;
  /** The mesh counts as last written, and how many cut glows were drawn. */
  counts(): FxCounts;
  glowing(): number;
  /** The most particles each pool held at once, as a line for the measure. */
  peaks(): string;
  dispose(): void;
}

/**
 * Makes the effect meshes: one sprite mesh per texture (sparkle, soft spot, smoke, lightning) and one instanced mesh per pack mesh (spark, shard), each at its full size, additive, `depthWrite` off. The pools are sized from the
 * emitter count `n` (per cut: spark 512, sparkle 512, shard 128, soft spot 48, smoke 24, lightning 8; once: sparkle 256, shard 32, soft spot 16, for repair flashes). They are in the group from the start with `count` 0 (a mesh
 * with no geometry yet holds a unit box), so the view's first frame compiles every program and nothing is added or removed later.
 */
export function createFxLayer(emitters: readonly FxEmitter[], seed = 1): FxLayer {
  const n = emitters.length;
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

  const makeLayer = (max: number, geometry: BufferGeometry, material: MeshBasicMaterial, kind: Layer["kind"], gravity: number, drag: number, fade: (u: number) => number, extra = 0): Layer => {
    const mesh = new InstancedMesh(geometry, material, max + extra);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    // The colour attribute exists from the start, so the program never changes shape later.
    mesh.setColorAt(0, new Color(0, 0, 0));
    mesh.instanceColor!.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.raycast = () => {};
    group.add(mesh);
    return { pool: createParticlePool(max), mesh, gravity: gravity * S, drag, kind, fade, direct: 0, peak: 0 };
  };
  const sparkleMat = spriteMat("sparkle");
  const softMat = spriteMat("softSpot");
  const smokeMat = spriteMat("smoke");
  const lightMat = spriteMat("lightning");
  mats.push(sparkleMat, softMat, smokeMat, lightMat);
  const sparkle = makeLayer(512 * n + 768, quad, sparkleMat, "sprite", 6, 1.4, fadeLinear);
  const soft = makeLayer(48 * n + 64, quad, softMat, "sprite", 0, 2.5, fadeSoft, n);
  const smoke = makeLayer(24 * n + 1, quad, smokeMat, "sprite", -0.6, 1.6, fadeWisp);
  const spark = makeLayer(512 * n + 400, unit, meshMat, "streak", 9.8, 0.6, fadeHot);
  const shard = makeLayer(128 * n + 32, unit, meshMat, "chip", 12, 0.6, fadeHot);
  const lightning = makeLayer(1, quad, lightMat, "sprite", 0, 0, fadeLinear, 8 * n + DIRECT_MAX);
  const lightCap = 1 + 8 * n + DIRECT_MAX;
  const layers = [sparkle, soft, smoke, spark, shard, lightning];
  let haveSpark = false;
  let haveShard = false;
  const matByTexture: Record<FxTextureId, MeshBasicMaterial> = { sparkle: sparkleMat, softSpot: softMat, lightning: lightMat, smoke: smokeMat };

  // A small seeded generator, so a given run looks the same.
  let rs = (seed >>> 0) || 1;
  const rnd = (): number => {
    rs = (rs + 0x6d2b79f5) >>> 0;
    let t = rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const slots = Math.max(n, 1);
  const nextBurst = new Float64Array(slots);
  const nextPop = new Float64Array(slots);
  const nextSmoke = new Float64Array(slots);
  const fed = new Uint8Array(slots);
  const fedAt = new Float64Array(slots);
  const lastArc = new Float64Array(slots * 2).fill(Number.NaN);
  const arcs = newFxArcs();
  const p = newParticleInit();
  let glows = 0;
  const queue = new Float32Array(DIRECT_MAX * 10);
  let queued = 0;
  const boltPts = new Float64Array(3 * 7);
  const bp = { x: 0, y: 0, z: 0 };
  const blowAtE = { x: 0, y: 0, z: 0, ground: 0 };

  const sparkOut = (e: FxEmitter, mul: number): void => {
    const a = rnd() * Math.PI * 2;
    const h = (3 + rnd() * 5) * mul * S;
    p.x = e.x;
    p.y = e.y;
    p.z = e.z;
    p.vx = Math.cos(a) * h;
    p.vz = Math.sin(a) * h;
    p.vy = (rnd() < 0.2 ? -rnd() * 3 : 2 + rnd() * 5) * mul * S;
    p.life = 0.7 + rnd() * 0.7;
    p.size = (haveSpark ? 0.15 : 0.9) * S;
    p.grow = haveSpark ? 1 : 0.5;
    p.spin = 0;
    p.ramp = 1;
    p.floor = e.ground;
    (haveSpark ? spark : sparkle).pool.spawn(p);
  };
  const chipOut = (e: FxEmitter): void => {
    const a = rnd() * Math.PI * 2;
    const h = (2 + rnd() * 4) * S;
    p.x = e.x;
    p.y = e.y;
    p.z = e.z;
    p.vx = Math.cos(a) * h;
    p.vz = Math.sin(a) * h;
    p.vy = (1.5 + rnd() * 4) * S;
    p.life = 0.7 + rnd() * 0.6;
    p.size = (haveShard ? 0.16 : 0.4) * S;
    p.grow = 1;
    p.spin = (rnd() - 0.5) * 18;
    p.ramp = 1;
    p.floor = e.ground;
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
    p.ramp = 0;
    p.floor = NO_FLOOR;
    soft.pool.spawn(p);
  };

  const m4 = new Matrix4();
  const q = new Quaternion();
  const pv = new Vector3();
  const sv = new Vector3();
  const dv = new Vector3();
  const xv = new Vector3();
  const yv = new Vector3();
  const zv = new Vector3();
  const eu = new Euler();
  const one = new Quaternion();
  const hot = new Color();

  const paint = (l: Layer, camera: Quaternion): void => {
    const pool = l.pool;
    const arr = l.mesh.instanceMatrix.array as Float32Array;
    const col = l.mesh.instanceColor!.array as Float32Array;
    for (let i = 0; i < pool.count; i++) {
      const u = pool.age[i]! / pool.life[i]!;
      const isHot = pool.ramp[i]! > 0.5;
      const f = isHot ? fadeHot(u) : l.fade(u);
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
        // 0.5 to 1.5 m long by its speed; the unit streak's cross-section is about 0.14 of its length, so x and y give `size` of thickness.
        const len = (0.5 + Math.min(speed / S / 8, 1)) * S;
        sv.set(size * 7.3, size * 7.3, len);
      } else {
        const t = pool.age[i]! * pool.spin[i]!;
        q.setFromEuler(eu.set(t, t * 0.7, t * 0.4));
        sv.set(size, size, size);
      }
      m4.compose(pv, q, sv).toArray(arr, i * 16);
      if (isHot) {
        hotColour(u, hot);
        col[i * 3] = hot.r * f;
        col[i * 3 + 1] = hot.g * f;
        col[i * 3 + 2] = hot.b * f;
      } else {
        col[i * 3] = (pool.c0[i * 3]! + (pool.c1[i * 3]! - pool.c0[i * 3]!) * u) * f;
        col[i * 3 + 1] = (pool.c0[i * 3 + 1]! + (pool.c1[i * 3 + 1]! - pool.c0[i * 3 + 1]!) * u) * f;
        col[i * 3 + 2] = (pool.c0[i * 3 + 2]! + (pool.c1[i * 3 + 2]! - pool.c0[i * 3 + 2]!) * u) * f;
      }
    }
    if (pool.count > l.peak) l.peak = pool.count;
  };

  return {
    group,
    setTextures(t) {
      for (const id of FX_TEXTURE_IDS) {
        const tex = t[id];
        if (!tex) continue;
        const mat = matByTexture[id];
        const old = mat.map;
        mat.map = tex;
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
    breakAt(slot, time) {
      const e = emitters[slot];
      if (!e) return;
      fed[slot] = 1;
      fedAt[slot] = time;
      if (time >= nextBurst[slot]!) {
        nextBurst[slot] = time + 0.05 + rnd() * 0.07;
        const k = 18 + Math.floor(rnd() * 9);
        for (let i = 0; i < k; i++) sparkOut(e, 1);
        const c = 4 + Math.floor(rnd() * 3);
        for (let i = 0; i < c; i++) chipOut(e);
        flash(e.x, e.y, e.z, 2.5, 1.2, 0.12, 1.6, 1.4, 1.1, 1.0, 0.5, 0.15);
      }
      if (time >= nextPop[slot]!) {
        nextPop[slot] = time + 0.6 + rnd() * 0.6;
        const k = 50 + Math.floor(rnd() * 21);
        for (let i = 0; i < k; i++) sparkOut(e, 1.5);
        flash(e.x, e.y, e.z, 5, 1.3, 0.25, 2.0, 1.9, 1.5, 1.2, 0.6, 0.15);
      }
      if (time >= nextSmoke[slot]!) {
        nextSmoke[slot] = time + 0.35 + rnd() * 0.3;
        p.x = e.x;
        p.y = e.y + 0.2 * S;
        p.z = e.z;
        p.vx = (rnd() - 0.5) * 0.6 * S;
        p.vy = 1.0 * S;
        p.vz = (rnd() - 0.5) * 0.6 * S;
        p.life = 0.9 + rnd() * 0.4;
        p.size = 1.5 * S;
        p.grow = 2;
        p.spin = 0;
        p.r0 = 0.45;
        p.g0 = 0.4;
        p.b0 = 0.35;
        p.r1 = 0.3;
        p.g1 = 0.28;
        p.b1 = 0.26;
        p.ramp = 0;
        p.floor = NO_FLOOR;
        smoke.pool.spawn(p);
      }
    },
    repairAt(x, y, z) {
      flash(x, y, z, 1.4, 2.2, 0.4, 1.6, 1.6, 1.5, 1.2, 0.7, 0.3);
      const k = 10;
      const phase = rnd() * Math.PI * 2;
      for (let i = 0; i < k; i++) {
        const a = phase + (i / k) * Math.PI * 2;
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
        p.ramp = 0;
        p.floor = NO_FLOOR;
        sparkle.pool.spawn(p);
      }
      const c = 3 + Math.floor(rnd() * 2);
      for (let i = 0; i < c; i++) {
        const a = rnd() * Math.PI * 2;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = Math.cos(a) * 2.2 * S;
        p.vz = Math.sin(a) * 2.2 * S;
        p.vy = (1.5 + rnd() * 2) * S;
        p.life = 0.5 + rnd() * 0.3;
        p.size = (haveShard ? 0.13 : 0.3) * S;
        p.grow = 1;
        p.spin = (rnd() - 0.5) * 18;
        p.r0 = 1.5;
        p.g0 = 1.4;
        p.b0 = 1.2;
        p.r1 = 1.1;
        p.g1 = 0.5;
        p.b1 = 0.15;
        p.ramp = 0;
        p.floor = NO_FLOOR;
        (haveShard ? shard : sparkle).pool.spawn(p);
      }
    },
    blowAt(x, y, z, ground) {
      const e = blowAtE as unknown as FxEmitter;
      blowAtE.x = x;
      blowAtE.y = y;
      blowAtE.z = z;
      blowAtE.ground = ground;
      for (let i = 0; i < BLOW_SPARKS; i++) sparkOut(e, 2.2);
      for (let i = 0; i < 12; i++) chipOut(e);
      flash(x, y, z, 9, 1.5, BLOW_TIMING.pop, 2.2, 2.0, 1.6, 1.2, 0.5, 0.1);
      flash(x, y, z, 3, 1.2, 0.2, 2.4, 2.4, 2.4, 1.6, 1.2, 0.8);
    },
    arcFlashAt(x, y, z) {
      flash(x, y, z, 1, 1, 0.05, 0.8, 1.0, 1.5, 0.4, 0.5, 0.8);
    },
    bloomAt(x, y, z) {
      flash(x, y, z, 3.5, 1.6, 0.5, 1.8, 1.4, 0.8, 1.2, 0.6, 0.15);
      for (let i = 0; i < 14; i++) {
        const a = rnd() * Math.PI * 2;
        const h = (1.5 + rnd() * 2.5) * S;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = Math.cos(a) * h;
        p.vz = Math.sin(a) * h;
        p.vy = (1 + rnd() * 3) * S;
        p.life = 0.5 + rnd() * 0.4;
        p.size = 0.45 * S;
        p.grow = 0.5;
        p.spin = 0;
        p.r0 = 1.7;
        p.g0 = 1.3;
        p.b0 = 0.7;
        p.r1 = 1.2;
        p.g1 = 0.6;
        p.b1 = 0.15;
        p.ramp = 0;
        p.floor = NO_FLOOR;
        sparkle.pool.spawn(p);
      }
    },
    arcAt(ax, ay, az, bx, by, bz, width, r, g, b) {
      if (queued >= DIRECT_MAX) return;
      const o = queued++ * 10;
      queue[o] = ax;
      queue[o + 1] = ay;
      queue[o + 2] = az;
      queue[o + 3] = bx;
      queue[o + 4] = by;
      queue[o + 5] = bz;
      queue[o + 6] = width;
      queue[o + 7] = r;
      queue[o + 8] = g;
      queue[o + 9] = b;
    },
    bolt(route, head, tail) {
      const K = 6;
      const jag = 0.35 * S;
      for (let k = 0; k <= K; k++) {
        routePoint(route, head + ((tail - head) * k) / K, bp);
        const j = k === 0 || k === K ? 0 : jag;
        boltPts[k * 3] = bp.x + (rnd() - 0.5) * 2 * j;
        boltPts[k * 3 + 1] = bp.y + (rnd() - 0.5) * 2 * j;
        boltPts[k * 3 + 2] = bp.z + (rnd() - 0.5) * 2 * j;
      }
      for (let k = 0; k < K; k++) this.arcAt(boltPts[k * 3]!, boltPts[k * 3 + 1]!, boltPts[k * 3 + 2]!, boltPts[k * 3 + 3]!, boltPts[k * 3 + 4]!, boltPts[k * 3 + 5]!, 0.45 * S, 0.9, 1.1, 1.6);
    },
    update(dt, camera) {
      // The cuts fed this frame spawn their arcs' flashes first; an emitter not fed has its timers reset.
      for (let s = 0; s < n; s++) {
        if (fed[s] === 0) {
          nextBurst[s] = 0;
          nextPop[s] = 0;
          nextSmoke[s] = 0;
          lastArc[s * 2] = Number.NaN;
          lastArc[s * 2 + 1] = Number.NaN;
        }
      }
      for (const l of layers) {
        l.direct = 0;
        l.pool.step(dt, l.gravity, l.drag, l !== soft && l !== smoke && l !== lightning);
        paint(l, camera);
      }
      const sarr = soft.mesh.instanceMatrix.array as Float32Array;
      const scol = soft.mesh.instanceColor!.array as Float32Array;
      const larr = lightning.mesh.instanceMatrix.array as Float32Array;
      const lcol = lightning.mesh.instanceColor!.array as Float32Array;
      zv.set(0, 0, 1).applyQuaternion(camera);
      glows = 0;
      let drawn = 0;
      for (let s = 0; s < n; s++) {
        if (fed[s] === 0) continue;
        fed[s] = 0;
        const e = emitters[s]!;
        // The steady glow, flickering between 0.6 and 1.0 each frame.
        const gi = soft.pool.count + glows++;
        const flick = (0.6 + 0.4 * rnd()) * 0.9;
        m4.compose(pv.set(e.x, e.y, e.z), q.copy(camera), sv.setScalar(1.5 * S)).toArray(sarr, gi * 16);
        scol[gi * 3] = flick;
        scol[gi * 3 + 1] = 0.6 * flick;
        scol[gi * 3 + 2] = 0.25 * flick;
        // The crackle arcs.
        const k = cutArcs(e, fedAt[s]!, arcs);
        for (let a = 0; a < k; a++) {
          const arc = arcs[a]!;
          if (lastArc[s * 2 + a] !== arc.slot) {
            lastArc[s * 2 + a] = arc.slot;
            if (soft.pool.count < soft.pool.max) flash((arc.ax + arc.bx) / 2, (arc.ay + arc.by) / 2, (arc.az + arc.bz) / 2, 1, 1, 0.1, 1.5, 1.1, 0.5, 1.0, 0.6, 0.2);
          }
          yv.set(arc.bx - arc.ax, arc.by - arc.ay, arc.bz - arc.az);
          const len = yv.length();
          if (len < 1e-6) continue;
          yv.divideScalar(len);
          xv.crossVectors(yv, zv);
          if (xv.lengthSq() < 1e-8) xv.set(1, 0, 0);
          xv.normalize();
          dv.crossVectors(xv, yv);
          m4.makeBasis(xv.multiplyScalar(arc.width), yv.multiplyScalar(len), dv).setPosition((arc.ax + arc.bx) / 2, (arc.ay + arc.by) / 2, (arc.az + arc.bz) / 2).toArray(larr, drawn * 16);
          lcol[drawn * 3] = arc.r * 1.6;
          lcol[drawn * 3 + 1] = arc.g * 1.6;
          lcol[drawn * 3 + 2] = arc.b * 1.6;
          drawn++;
        }
      }
      for (let k = 0; k < queued && drawn < lightCap; k++) {
        const o = k * 10;
        const ax = queue[o]!;
        const ay = queue[o + 1]!;
        const az = queue[o + 2]!;
        const bx = queue[o + 3]!;
        const by = queue[o + 4]!;
        const bz = queue[o + 5]!;
        yv.set(bx - ax, by - ay, bz - az);
        const len = yv.length();
        if (len < 1e-6) continue;
        yv.divideScalar(len);
        xv.crossVectors(yv, zv);
        if (xv.lengthSq() < 1e-8) xv.set(1, 0, 0);
        xv.normalize();
        dv.crossVectors(xv, yv);
        m4.makeBasis(xv.multiplyScalar(queue[o + 6]!), yv.multiplyScalar(len), dv).setPosition((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2).toArray(larr, drawn * 16);
        lcol[drawn * 3] = queue[o + 7]! * 1.6;
        lcol[drawn * 3 + 1] = queue[o + 8]! * 1.6;
        lcol[drawn * 3 + 2] = queue[o + 9]! * 1.6;
        drawn++;
      }
      queued = 0;
      soft.direct = glows;
      lightning.direct = drawn;
      for (const l of layers) {
        l.mesh.count = l.pool.count + l.direct;
        if (l.mesh.count > 0) {
          l.mesh.instanceMatrix.needsUpdate = true;
          l.mesh.instanceColor!.needsUpdate = true;
        }
      }
    },
    clear() {
      for (const l of layers) {
        l.pool.clear();
        l.direct = 0;
        l.mesh.count = 0;
      }
      glows = 0;
      queued = 0;
    },
    alive() {
      let k = 0;
      for (const l of layers) k += l.pool.count;
      return k;
    },
    counts() {
      return { sparkle: sparkle.mesh.count, softSpot: soft.mesh.count, smoke: smoke.mesh.count, lightning: lightning.mesh.count, spark: spark.mesh.count, shard: shard.mesh.count };
    },
    glowing: () => glows,
    peaks: () => `peak alive sparkle ${sparkle.peak}, spark ${spark.peak}, shard ${shard.peak}, soft spot ${soft.peak}, smoke ${smoke.peak}`,
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
