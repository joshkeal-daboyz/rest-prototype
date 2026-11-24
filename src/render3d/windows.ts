/**
 * Ticket 081 L1: the lit building's windows. A building a puzzle lamp stands for is dark until current lights it; then its windows (and its shopfront glass) glow warm.
 *
 * - `windowMask()` is one shared emissive texture made in code, in the City Pack atlas's UV layout: black everywhere but the glass rectangle, and each of its three panes in the colour the pack's own night
 *   image (`Textures/Emissive_01.png`, Josh's card L-Q1 "Pack's night glow") lights it. The rectangle and pane colours were read from that image once and are typed in; nothing from the pack is committed.
 * - `buildingGlow` is the pure level of one building this frame, from E2's `lampState` and `lampFlicker`, so the Relight's order, the flare and the brownout dip are the lamps' own.
 * - `litBuilding(group)` gives a building's pieces their own clones of their materials with the mask, made when the city builds (level 0), so no shader compiles in play. Other buildings keep the shared materials.
 * - `litGlass` is one more InstancedMesh per shop glass key over the dark glass, for the lit buildings' shopfronts only.
 */
import { AdditiveBlending, Color, DataTexture, MeshBasicMaterial, NearestFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType, type Group, type InstancedMesh, type Material, type Mesh, type Object3D, type Texture } from "three";
import type { CalibrationKey, CityNodePlace, CityRoofMast } from "../core";
import type { GridState } from "../grid";
import { FLARE_SECONDS } from "../render/relight";
import { lampState } from "./cityview";
import { SHOP_GLASS } from "./dressing";
import { lampFlicker } from "./look";
import { dressGroup, type DressDraw, type DressPlacement } from "./models3d";
import type { PlanDressDraw } from "./plan3d";
import type { LampIgnition } from "./relight3d";

/**
 * The glass rectangle of the City Pack atlas, in pixels of its 1024 square (glTF's v runs top down): x from `x0` to `x1`, y from `y0` to `y1` (both end-exclusive), in three panes split at `splits`.
 * Measured from `Emissive_01.png`: amber 512..625, cream 626..737, near dark 738..851; rows 910..1023.
 */
export const WINDOW_UV = { size: 1024, x0: 512, x1: 852, y0: 910, y1: 1024, splits: [626, 738] as readonly [number, number] } as const;

/** The three panes' colours (sRGB), read from `Emissive_01.png`: warm amber, pale cream, near dark. */
export const PANE_COLOURS: readonly [number, number, number] = [0xe8b461, 0xeec78d, 0x231600];

let mask: DataTexture | null = null;

/** The one shared window mask: `WINDOW_UV.size` square RGBA, black outside the rectangle, each pane's colour inside it. `flipY` false, as glTF's textures are; nearest filtering and no mipmaps, as the atlas has. */
export function windowMask(): DataTexture {
  if (mask) return mask;
  const n = WINDOW_UV.size;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const o = (y * n + x) * 4;
      data[o + 3] = 255;
      if (x < WINDOW_UV.x0 || x >= WINDOW_UV.x1 || y < WINDOW_UV.y0 || y >= WINDOW_UV.y1) continue;
      const c = PANE_COLOURS[x < WINDOW_UV.splits[0] ? 0 : x < WINDOW_UV.splits[1] ? 1 : 2];
      data[o] = (c >> 16) & 255;
      data[o + 1] = (c >> 8) & 255;
      data[o + 2] = c & 255;
    }
  }
  const t = new DataTexture(data, n, n, RGBAFormat, UnsignedByteType);
  t.name = "window-mask";
  t.flipY = false;
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  mask = t;
  return t;
}

/** A job lamp that stands for a building: its node id and its place in the puzzle's node list. */
export interface BuildingLamp {
  readonly id: string;
  readonly index: number;
}

/**
 * The job lamps of each building: a `{ building }` lamp lights its own building, a `{ roof }` lamp the building its mast stands on (card L-Q2 "Mast's building"); a `{ pole }` or `{ post }` lamp has no building
 * (a lamp post keeps E2's glow and pool). Pure.
 */
export function lampBuildings(nodes: readonly { id: string; type: string }[], places: Readonly<Record<string, CityNodePlace>>, roofs: readonly Pick<CityRoofMast, "id" | "building">[]): Map<string, BuildingLamp[]> {
  const out = new Map<string, BuildingLamp[]>();
  nodes.forEach((n, index) => {
    if (n.type !== "lamp") return;
    const place = places[n.id];
    if (!place) return;
    const building = "building" in place ? place.building : "roof" in place ? roofs.find((r) => r.id === place.roof)?.building : undefined;
    if (building === undefined) return;
    const list = out.get(building);
    if (list) list.push({ id: n.id, index });
    else out.set(building, [{ id: n.id, index }]);
  });
  return out;
}

/** A building's window state this frame: `level` 0..1 (0 dark, dipping in a brownout), `flare` 1 at ignition falling to 0 over `FLARE_SECONDS`. */
export interface BuildingGlow {
  level: number;
  flare: number;
}

const ign: LampIgnition = { on: false, flareAge: -1 };

/** The building's level and flare this frame, the brighter of its lamps. Dark while no lamp is lit; in the Relight, dark until its lamp's arrival. Writes into `out`. */
export function buildingGlow(plan: Parameters<typeof lampState>[0], state: GridState, lamps: readonly BuildingLamp[], relT: number, time: number, out: BuildingGlow): BuildingGlow {
  let level = 0;
  let flare = 0;
  for (const lamp of lamps) {
    lampState(plan, state, lamp.id, lamp.index, relT, ign);
    if (!ign.on) continue;
    level = Math.max(level, 1 - lampFlicker(state, lamp.index, time));
    if (ign.flareAge >= 0 && ign.flareAge < FLARE_SECONDS) flare = Math.max(flare, 1 - ign.flareAge / FLARE_SECONDS);
  }
  out.level = level;
  out.flare = flare;
  return out;
}

/** The emissive intensity of a window at full level, and how much the ignition flare adds at its peak (a fraction of it). */
export const WINDOW_LIT = 1.6;
export const WINDOW_FLARE_GAIN = 1.2;
export const windowIntensity = (g: BuildingGlow): number => g.level * WINDOW_LIT * (1 + WINDOW_FLARE_GAIN * g.flare);

/** What `litBuilding` made: set the building's window level, and free the clones. */
export interface LitBuilding {
  /** The clones made (one per source material with an atlas map). */
  readonly materials: readonly Material[];
  set(g: BuildingGlow): void;
  dispose(): void;
}

type Emissive = Material & { map?: Texture | null; emissive?: Color; emissiveMap?: Texture | null; emissiveIntensity?: number };

/**
 * Give a building's pieces their own clones of their materials with the window mask, at level 0. Only a material with a `map` (the atlas) is cloned; one clone per source material, shared by this building's
 * pieces. Every other building keeps the shared materials, untouched.
 */
export function litBuilding(group: Object3D): LitBuilding {
  const clones = new Map<Material, Material>();
  const swap = (m: Material): Material => {
    const src = m as Emissive;
    if (!src.map || !src.emissive) return m;
    let c = clones.get(m);
    if (!c) {
      c = m.clone();
      const lit = c as Emissive;
      lit.emissive = new Color(0xffffff);
      lit.emissiveMap = windowMask();
      lit.emissiveIntensity = 0;
      clones.set(m, c);
    }
    return c;
  };
  group.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.isMesh !== true) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
  const materials = [...clones.values()];
  return {
    materials,
    set(g) {
      const v = windowIntensity(g);
      for (const m of materials) (m as Emissive).emissiveIntensity = v;
    },
    dispose() {
      for (const m of materials) m.dispose();
    },
  };
}

const GLASS: ReadonlySet<CalibrationKey> = new Set(SHOP_GLASS);

/** What `litGlass` made: its group (one InstancedMesh per glass key and sub-mesh), its draw calls, and the setters. */
export interface LitGlass {
  readonly group: Group;
  readonly calls: number;
  /** Set one building's glass level for this frame (a building with no shop glass is a no-op). */
  set(building: string, g: BuildingGlow): void;
  /** Upload the levels set this frame. */
  commit(): void;
  dispose(): void;
}

const tint = new Color();
const AMBER = new Color(PANE_COLOURS[0]);

/**
 * The shop glass of `buildings` (the job's lamp buildings), drawn once more over the dark glass in warm light at the building's level. The dark glass instancer is not edited: this is a second `dressGroup`
 * call over those placements only, its glass material swapped for an additive one whose per-instance colour is the level. Dark at level 0.
 */
export function litGlass(draws: readonly PlanDressDraw[], buildings: ReadonlySet<string>, roots: ReadonlyMap<CalibrationKey, Object3D>): LitGlass {
  const mine = draws.filter((d) => buildings.has(d.building) && GLASS.has(d.placement.key) && roots.has(d.placement.key));
  const placements: DressPlacement[] = mine.map((d) => ({
    frame: { x: 0, z: 0, yaw: 0 },
    piece: { key: d.placement.key, slot: "wall", x: d.placement.x_m, y: d.placement.y_m, z: d.placement.z_m, yaw: (d.placement.yaw_deg * Math.PI) / 180, column: 0, w: 0, h: 0, d: 0 },
  }));
  const drawn: DressDraw = dressGroup(placements, roots);
  drawn.group.name = "plan:lit-glass";
  const material = new MeshBasicMaterial({ color: 0xffffff, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const byName = new Map<string, string[]>();
  for (const d of mine) {
    const name = `dress:${d.placement.key.slice(d.placement.key.indexOf(":") + 1)}`;
    const list = byName.get(name);
    if (list) list.push(d.building);
    else byName.set(name, [d.building]);
  }
  const meshes: { im: InstancedMesh; by: readonly string[] }[] = [];
  for (const c of drawn.group.children) {
    const im = c as InstancedMesh;
    const by = byName.get(c.name);
    if (im.isInstancedMesh !== true || !by) continue;
    im.material = material;
    for (let i = 0; i < by.length; i++) im.setColorAt(i, tint.setRGB(0, 0, 0));
    meshes.push({ im, by });
  }
  return {
    group: drawn.group,
    calls: drawn.calls,
    set(building, g) {
      tint.copy(AMBER).multiplyScalar(Math.min(g.level * (1 + 0.5 * g.flare), 1.5) * 0.9);
      for (const { im, by } of meshes) for (let i = 0; i < by.length; i++) if (by[i] === building) im.setColorAt(i, tint);
    },
    commit() {
      for (const { im } of meshes) if (im.instanceColor) im.instanceColor.needsUpdate = true;
    },
    dispose() {
      material.dispose();
      drawn.dispose();
    },
  };
}
