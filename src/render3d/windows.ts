/**
 * Ticket 081 L1: the lit building's windows. A building a puzzle lamp stands for is dark until current lights it; then its windows (and its shopfront glass) glow warm.
 *
 * - `windowMask()` is one shared emissive texture made in code, in the City Pack atlas's UV layout: black everywhere but the glass rectangle, and each of its three panes in the colour the pack's own night
 *   image (`Textures/Emissive_01.png`, Josh's card L-Q1 "Pack's night glow") lights it. The rectangle and pane colours were read from that image once and are typed in; nothing from the pack is committed.
 * - `buildingGlow` is the pure level of one building this frame, from E2's `lampState` and `lampFlicker`, so the Relight's order, the flare and the brownout dip are the lamps' own.
 * - `windowLit` is the building materials' window-lit twin, and `setBuildingGlow` writes a building's level into its instances' `windowLevel` slots (081 F1b), so every building stays in the shared instancers.
 * - `glowCards` (081 W2) are the soft glow in front of every storey's glass on a lit building's street faces: one InstancedMesh for the job, its opacity from the building's level.
 * - `litGlass` is one more InstancedMesh per shop glass key over the dark glass, for the lit buildings' shopfronts only.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DataTexture, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh as ThreeMesh, PlaneGeometry, Quaternion, Vector3, MeshBasicMaterial, NearestFilter, PointLight, RGBAFormat, SRGBColorSpace, UnsignedByteType, type Material, type Mesh, type Object3D, type Texture } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CalibrationKey, CityBuilding, CityNodePlace, CityPlan, CityRoofMast, CitySide } from "../core";
import type { GridState } from "../grid";
import { FLARE_SECONDS } from "../render/relight";
import { SHOP_GLASS } from "./dressing";
import { lampFlicker } from "./look";
import { dressMatrix, meshParts } from "./models3d";
import type { BuildingsDraw, PlanDressDraw, PlanPieceDraw } from "./plan3d";
import { lampIgnition, type LampIgnition } from "./relight3d";
import type { RelightPlan } from "../render/relight";

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
 * The job lamps of each building. A `{ building }` lamp lights what reads as one building: its plan building, every building backed onto it (grammar rule 4: its followers, whose `partner` it is), and, when it is
 * itself a follower, its partner and the partner's other followers. A `{ roof }` lamp does the same from its mast's building (card L-Q2 "Mast's building"). A `{ pole }` or `{ post }` lamp has no building (a lamp post
 * keeps E2's glow and pool). Pure.
 */
export function lampBuildings(
  nodes: readonly { id: string; type: string }[],
  places: Readonly<Record<string, CityNodePlace>>,
  roofs: readonly Pick<CityRoofMast, "id" | "building">[],
  buildings: readonly Pick<CityBuilding, "id" | "partner">[] = [],
): Map<string, BuildingLamp[]> {
  const partnerOf = new Map(buildings.map((x) => [x.id, x.partner] as const));
  const out = new Map<string, BuildingLamp[]>();
  nodes.forEach((n, index) => {
    if (n.type !== "lamp") return;
    const place = places[n.id];
    if (!place) return;
    const base = "building" in place ? place.building : "roof" in place ? roofs.find((r) => r.id === place.roof)?.building : undefined;
    if (base === undefined) return;
    const lead = partnerOf.get(base) ?? base;
    const set = new Set<string>([base, lead]);
    for (const [id, p] of partnerOf) if (p === lead) set.add(id);
    for (const id of set) {
      const list = out.get(id);
      if (list) list.push({ id: n.id, index });
      else out.set(id, [{ id: n.id, index }]);
    }
  });
  return out;
}

/**
 * The hidden lamp of each scenery building (081 S1's `converted.scenery`), grouped as `lampBuildings` groups a job lamp's: the building, its lead and every building backed onto it light together. Entries in the
 * order of `scenery`, so L2 gives them their lights after the job lamps' buildings. Pure.
 */
export function sceneryLamps(
  converted: { readonly scenery?: Readonly<Record<string, string>>; readonly puzzle: { readonly nodes: readonly { id: string }[] } },
  buildings: readonly Pick<CityBuilding, "id" | "partner">[] = [],
): Map<string, BuildingLamp[]> {
  const out = new Map<string, BuildingLamp[]>();
  const scenery = converted.scenery;
  if (!scenery) return out;
  const indexOf = new Map(converted.puzzle.nodes.map((n, i) => [n.id, i] as const));
  const partnerOf = new Map(buildings.map((x) => [x.id, x.partner] as const));
  for (const [base, id] of Object.entries(scenery)) {
    const index = indexOf.get(id);
    if (index === undefined) continue;
    const lead = partnerOf.get(base) ?? base;
    const set = new Set<string>([base, lead]);
    for (const [bid, p] of partnerOf) if (p === lead) set.add(bid);
    for (const bid of set) {
      const list = out.get(bid);
      if (!list) out.set(bid, [{ id, index }]);
      else if (!list.some((l) => l.id === id)) list.push({ id, index });
    }
  }
  return out;
}

/** A building's window state this frame: `level` 0..1 (0 dark, dipping in a brownout), `flare` 1 at ignition falling to 0 over `FLARE_SECONDS`. */
export interface BuildingGlow {
  level: number;
  flare: number;
}

const ign: LampIgnition = { on: false, flareAge: -1 };

/** The building's level and flare this frame, the brighter of its lamps. Dark while no lamp is lit; in the Relight, dark until its lamp's arrival. Writes into `out`. */
export function buildingGlow(plan: RelightPlan | null, state: GridState, lamps: readonly BuildingLamp[], relT: number, time: number, out: BuildingGlow): BuildingGlow {
  let level = 0;
  let flare = 0;
  for (const lamp of lamps) {
    if (plan) lampIgnition(plan, state, lamp.id, lamp.index, relT, ign);
    else {
      ign.on = state.lit.has(lamp.id);
      ign.flareAge = -1;
    }
    if (!ign.on) continue;
    level = Math.max(level, 1 - lampFlicker(state, lamp.index, time));
    if (ign.flareAge >= 0 && ign.flareAge < FLARE_SECONDS) flare = Math.max(flare, 1 - ign.flareAge / FLARE_SECONDS);
  }
  out.level = level;
  out.flare = flare;
  return out;
}

/**
 * 081 W2: the offsets in each building's instance list (`BuildingsDraw.instances`) that are roof pieces, which have no glass and stay dark (`setBuildingGlow`'s `skip`). Ground pieces come after the floors and the roofs
 * in that list and are never listed here, so they take the level. From `dimBuildings`' order, pure.
 */
export function roofOffsets(buildings: readonly DimBuilding[]): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  for (const b of buildings) {
    let at = 0;
    const roofs = new Set<number>();
    for (const p of b.pieces) {
      if (p.role === "roof") for (let k = 0; k < p.parts; k++) roofs.add(at + k);
      at += p.parts;
    }
    out.set(b.id, roofs);
  }
  return out;
}

/** The emissive intensity of a window at full level, and how much the ignition flare adds at its peak (a fraction of it). */
export const WINDOW_LIT = 1.6;
export const WINDOW_FLARE_GAIN = 1.2;
export const windowIntensity = (g: BuildingGlow): number => g.level * WINDOW_LIT * (1 + WINDOW_FLARE_GAIN * g.flare);

/** The name of the per-instance window level on a building instancer's geometry: one float per instance, 0 dark, 1 at full level (more in the flare). */
export const WINDOW_LEVEL = "windowLevel";

type Emissive = Material & { map?: Texture | null; emissive?: Color; emissiveMap?: Texture | null; emissiveIntensity?: number };

/**
 * The window-lit twin of a building material (081 F1b): a clone (made once, when the city builds) whose emissive map is the window mask and whose shader multiplies the emissive by the instance's `windowLevel`,
 * so the emissive is mask x level x `WINDOW_LIT`. Only a material with an atlas `map` and an `emissive` colour has a twin; any other is returned as it is. The source is never written.
 */
export function windowLit(source: Material): Material {
  const src = source as Emissive;
  if (!src.map || !src.emissive) return source;
  const twin = source.clone() as Emissive;
  twin.emissive = new Color(0xffffff);
  twin.emissiveMap = windowMask();
  twin.emissiveIntensity = WINDOW_LIT;
  twin.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float windowLevel;\nvarying float vWindowLevel;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWindowLevel = windowLevel;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vWindowLevel;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vWindowLevel;");
  };
  twin.customProgramCacheKey = () => "window-lit";
  return twin;
}

/**
 * Set one building's windows for this frame: every one of its instances' `windowLevel` becomes the level with the ignition flare (`windowIntensity` without `WINDOW_LIT`, which the material holds). Only that
 * building's slots are written, and an attribute is marked for upload only when a slot changed. A building with no instances (a lamp's building drawn grey, or none) is a no-op.
 */
export function setBuildingGlow(draw: Pick<BuildingsDraw, "instances">, building: string, g: BuildingGlow, skip?: ReadonlySet<number>): void {
  const list = draw.instances.get(building);
  if (!list) return;
  const v = windowIntensity(g) / WINDOW_LIT;
  for (let at = 0; at < list.length; at++) {
    const { mesh, index } = list[at]!;
    if (skip?.has(at)) continue;
    const attr = mesh.geometry.getAttribute(WINDOW_LEVEL) as BufferAttribute | undefined;
    if (!attr || attr.array[index] === Math.fround(v)) continue;
    attr.array[index] = v;
    attr.needsUpdate = true;
  }
}

const GLASS: ReadonlySet<CalibrationKey> = new Set(SHOP_GLASS);

/** What `litGlass` made: its mesh (one draw call, or none when no lit building has shop glass), and the setters. */
export interface LitGlass {
  /** The one merged mesh; null when there is no glass to light. Hidden while every level is 0. */
  readonly mesh: ThreeMesh | null;
  readonly calls: number;
  /** Set one building's glass level for this frame (a building with no shop glass is a no-op). */
  set(building: string, g: BuildingGlow): void;
  /** Upload the levels set this frame and hide the mesh while all are 0. */
  commit(): void;
  dispose(): void;
}

const AMBER = new Color(PANE_COLOURS[0]);
const place = new Matrix4();

/**
 * The shop glass of `buildings` (the lit buildings), drawn once more over the dark glass in warm light at the building's level. The dark glass instancer is not edited: the lit placements' glass geometries are
 * merged (three's `mergeGeometries`) into one mesh, one draw call whatever the count, with a per-vertex colour written each frame (additive, so black is invisible). Hidden while every level is 0.
 */
export function litGlass(draws: readonly PlanDressDraw[], buildings: ReadonlySet<string>, roots: ReadonlyMap<CalibrationKey, Object3D>): LitGlass {
  const geoms: BufferGeometry[] = [];
  const ranges = new Map<string, { start: number; count: number }[]>();
  let verts = 0;
  for (const d of draws) {
    if (!buildings.has(d.building) || !GLASS.has(d.placement.key)) continue;
    const root = roots.get(d.placement.key);
    if (!root) continue;
    const pl = d.placement;
    const piece = { x: pl.x_m, y: pl.y_m, z: pl.z_m, yaw: (pl.yaw_deg * Math.PI) / 180 };
    for (const part of meshParts(root)) {
      const src = part.mesh.geometry;
      const g = new BufferGeometry();
      g.setAttribute("position", src.getAttribute("position"));
      if (src.index) g.setIndex(src.index);
      const flat = g.index ? g.toNonIndexed() : g;
      flat.applyMatrix4(place.multiplyMatrices(dressMatrix({ x: 0, z: 0, yaw: 0 }, piece), part.local));
      const n = flat.getAttribute("position").count;
      flat.setAttribute("color", new BufferAttribute(new Float32Array(n * 3), 3));
      const list = ranges.get(d.building);
      if (list) list.push({ start: verts, count: n });
      else ranges.set(d.building, [{ start: verts, count: n }]);
      verts += n;
      geoms.push(flat);
    }
  }
  if (geoms.length === 0) return { mesh: null, calls: 0, set() {}, commit() {}, dispose() {} };
  const merged = mergeGeometries(geoms, false)!;
  for (const g of geoms) g.dispose();
  const material = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new ThreeMesh(merged, material);
  mesh.name = "plan:lit-glass";
  mesh.raycast = () => {};
  mesh.frustumCulled = false;
  mesh.visible = false;
  const colours = merged.getAttribute("color") as BufferAttribute;
  const arr = colours.array as Float32Array;
  let any = false;
  return {
    mesh,
    calls: 1,
    set(building, g) {
      const list = ranges.get(building);
      if (!list) return;
      const v = Math.min(g.level * (1 + 0.5 * g.flare), 1.5) * 0.9;
      const r = AMBER.r * v;
      const gr = AMBER.g * v;
      const b = AMBER.b * v;
      if (v > 0) any = true;
      for (const { start, count } of list) for (let i = start; i < start + count; i++) (arr[i * 3] = r), (arr[i * 3 + 1] = gr), (arr[i * 3 + 2] = b);
    },
    commit() {
      colours.needsUpdate = true;
      mesh.visible = any;
      any = false;
    },
    dispose() {
      merged.dispose();
      material.dispose();
    },
  };
}

// ---- 081 L2: real lights on the street ----

/** The most street lights a city makes: 32, set when the frame-time budgets of ticket 081 L2 criterion 3 passed at 25 and 32. */
export const STREET_LIGHTS_MAX = 32;
/** Where a light stands, metres: out from its street face, and up (the first floor's windows). */
export const STREET_LIGHT_OUT_M = 2;
export const STREET_LIGHT_UP_M = 3;
/** 081 W2: a light stands at half its building's height, and reaches `STREET_LIGHT_REACH_M x (1 + storeys / STOREY_REACH_DIV)`, so the pool lies under every storey. A starting point Josh tunes by eye. */
export const STOREY_REACH_DIV = 4;
/** How far a light reaches, metres (`PointLight.distance`, drawn in world units), and its decay. Numbers Josh tunes by eye. */
export const STREET_LIGHT_REACH_M = 12;
export const STREET_LIGHT_DECAY = 2;
/** A light's intensity at full level: about 30 candela at metre scale, written for the city's 0.18 world units to a metre (candela fall with the square of the distance). */
export const STREET_LIGHT_INTENSITY = 1;
/** How much the ignition flare adds at its peak (a fraction of the intensity). */
export const STREET_LIGHT_FLARE_GAIN = 0.5;

/** One street light's place, in metres of the plan: the building it lights, and its point. */
export interface LightPlace {
  readonly building: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The building's storeys, when the plan holds columns for it (the light then stands at half its height and reaches further); absent: it stands at `STREET_LIGHT_UP_M` with the base reach. */
  readonly storeys?: number;
}

/** A building's height in metres (its tallest roof's base) and storeys, from the buildings layer's columns. Pure. */
export function buildingHeights(plan: Pick<CityPlan, "layers">): Map<string, { height_m: number; storeys: number }> {
  const out = new Map<string, { height_m: number; storeys: number }>();
  for (const c of plan.layers.buildings?.columns ?? []) {
    const roof = c.pieces.find((p) => p.role === "roof");
    if (!roof) continue;
    const have = out.get(c.building);
    if (!have || roof.placement.y_m > have.height_m) out.set(c.building, { height_m: roof.placement.y_m, storeys: roof.storey });
  }
  return out;
}

const SIDE_DIR: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };
const CELL = 5;

/**
 * The street lights of `buildingIds`, in that order, at most `max`. A building's street face is its columns' open sides that face a street (`mass.built`'s `faces: "street"`, never a yard, lane or park). A building
 * with a corner column that has two street sides gets its light over that corner's pavement (out from both sides); any other gets it in front of the middle of its street face (the mean of its street columns'
 * face points). A building with no street face gets none and does not count against `max`. Pure.
 */
export function lightPlaces(plan: Pick<CityPlan, "layers">, buildingIds: Iterable<string>, max: number): LightPlace[] {
  const buildings = plan.layers.buildings?.buildings;
  const built = plan.layers.mass?.built;
  if (!buildings || !built) return [];
  const byId = new Map(buildings.map((b) => [b.id, b] as const));
  const open = new Map(built.map((c) => [`${c.i},${c.j}`, c.open] as const));
  const heights = buildingHeights(plan);
  const out: LightPlace[] = [];
  for (const id of buildingIds) {
    if (out.length >= max) break;
    const b = byId.get(id);
    if (!b) continue;
    let corner: LightPlace | null = null;
    const h = heights.get(id);
    const y = h ? h.height_m / 2 : STREET_LIGHT_UP_M;
    let sx = 0;
    let sz = 0;
    let n = 0;
    for (const c of b.cells) {
      const sides = (open.get(`${c.i},${c.j}`) ?? []).filter((o) => o.faces === "street").map((o) => SIDE_DIR[o.side]);
      if (sides.length === 0) continue;
      let x = (c.i + 0.5) * CELL;
      let z = (c.j + 0.5) * CELL;
      for (const [dx, dz] of sides) {
        x += dx * (CELL / 2 + STREET_LIGHT_OUT_M);
        z += dz * (CELL / 2 + STREET_LIGHT_OUT_M);
      }
      if (sides.length >= 2 && !corner) corner = { building: id, x, y, z, ...(h ? { storeys: h.storeys } : {}) };
      sx += x;
      sz += z;
      n++;
    }
    if (n === 0) continue;
    out.push(corner ?? { building: id, x: sx / n, y, z: sz / n, ...(h ? { storeys: h.storeys } : {}) });
  }
  return out;
}

/** The lights of a city, made once: `lights[i]` lights `buildings[i]`. */
export interface StreetLights {
  readonly lights: readonly PointLight[];
  readonly buildings: readonly string[];
}

/**
 * The `PointLight`s of `places`, at intensity 0, never switched off and never shadowed (the count must not change in play, or every program recompiles). `scale` turns metres into world units. `extra` more
 * lights stand on the first place (the dev `lights=N` switch), each lighting the first building at its level.
 */
export function streetLights(places: readonly LightPlace[], scale: number, extra = 0): StreetLights {
  const lights: PointLight[] = [];
  const buildings: string[] = [];
  const total = places.length === 0 ? 0 : places.length + Math.max(0, extra);
  for (let i = 0; i < total; i++) {
    const p = i < places.length ? places[i]! : places[0]!;
    const light = new PointLight(PANE_COLOURS[0], 0, STREET_LIGHT_REACH_M * (1 + (p.storeys ?? 0) / STOREY_REACH_DIV) * scale, STREET_LIGHT_DECAY);
    light.name = "street-light";
    light.castShadow = false;
    light.position.set(p.x * scale, p.y * scale, p.z * scale);
    lights.push(light);
    buildings.push(p.building);
  }
  return { lights, buildings };
}

/** Write this frame's intensities, and nothing else: `STREET_LIGHT_INTENSITY x level`, with the flare's pop. A building with no entry in `glows` is dark. */
export function setStreetLights(pool: StreetLights, glows: ReadonlyMap<string, BuildingGlow>): void {
  for (let i = 0; i < pool.lights.length; i++) {
    const g = glows.get(pool.buildings[i]!);
    pool.lights[i]!.intensity = g ? STREET_LIGHT_INTENSITY * g.level * (1 + STREET_LIGHT_FLARE_GAIN * g.flare) : 0;
  }
}

// ---- 081 L3: a few dim windows in the dead city ----

/** The share of window pieces (floor and `floor3`) that glow faintly before any power: 1 in 25 (Josh, L-Q3, "1 in 25, steady amber (Recommended)"). */
export const DIM_SHARE = 1 / 25;
/** A dim window's level, a fraction of a lit window's. Steady: nothing writes it after the build. */
export const DIM_LEVEL = 0.15;

/** A building's pieces, bottom up, as its instancers hold them: each piece's role and how many sub-mesh instances it has. Only the buildings' pieces that are instanced (a grey column has none) are listed. */
export interface DimBuilding {
  readonly id: string;
  readonly pieces: readonly { readonly role: string; readonly parts: number }[];
}

/** A stable hash of (seed, building id, piece index) into [0, 1): FNV-1a over the id's characters, then the numbers, finished with an integer mix. */
function hash01(seed: number, id: string, index: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h = Math.imul(h ^ index, 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * The dim windows: for each building not in `exclude`, the offsets in its instance list (`BuildingsDraw.instances`) of the sub-meshes of the pieces picked. Only `floor` and `floor3` pieces can be picked (never the
 * ground storey, which is not in `pieces`, and never the roof); a piece is picked when a hash of `seed`, the building id and the piece index falls under `share`, so the pick is the same every load. Pure.
 */
export function dimPieces(buildings: readonly DimBuilding[], share: number, seed: number, exclude: ReadonlySet<string>): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const b of buildings) {
    if (exclude.has(b.id)) continue;
    let at = 0;
    b.pieces.forEach((p, n) => {
      const first = at;
      at += p.parts;
      if (p.role !== "floor" && p.role !== "floor3") return;
      if (hash01(seed, b.id, n) >= share) return;
      const list = out.get(b.id) ?? [];
      for (let k = 0; k < p.parts; k++) list.push(first + k);
      out.set(b.id, list);
    });
  }
  return out;
}

/**
 * The buildings' instanced pieces as `dimPieces` reads them, from the plan's piece list (columns in order, each bottom up): a column counts only when every one of its pieces has a loaded model
 * (`partsOf(key)` above 0), as `plan3dGroups` instances it; its floors come first in the building's instance list, as there. Pure.
 */
export function dimBuildings(draws: readonly Pick<PlanPieceDraw, "building" | "column" | "role" | "placement">[], partsOf: (key: CalibrationKey) => number): DimBuilding[] {
  const byColumn = new Map<string, typeof draws[number][]>();
  for (const d of draws) {
    const id = `${d.column.i},${d.column.j}`;
    const list = byColumn.get(id);
    if (list) list.push(d);
    else byColumn.set(id, [d]);
  }
  const out = new Map<string, { role: string; parts: number }[]>();
  for (const column of byColumn.values()) {
    if (!column.every((d) => partsOf(d.placement.key) > 0)) continue;
    for (const d of column) {
      const list = out.get(d.building) ?? [];
      list.push({ role: d.role, parts: partsOf(d.placement.key) });
      out.set(d.building, list);
    }
  }
  return [...out].map(([id, pieces]) => ({ id, pieces }));
}

/** Write `DIM_LEVEL` into the picked instances' `windowLevel` slots, once, when the city builds. Nothing else is touched: no material, no other slot. */
export function setDimWindows(draw: Pick<BuildingsDraw, "instances">, picks: ReadonlyMap<string, readonly number[]>): void {
  for (const [id, offsets] of picks) {
    const list = draw.instances.get(id);
    if (!list) continue;
    for (const o of offsets) {
      const inst = list[o];
      const attr = inst?.mesh.geometry.getAttribute(WINDOW_LEVEL) as BufferAttribute | undefined;
      if (!inst || !attr) continue;
      attr.array[inst.index] = DIM_LEVEL;
      attr.needsUpdate = true;
    }
  }
}

// ---- 081 W2: glow cards ----

/** How far a card stands out from its wall, metres; how much wider and taller than its glass it is (the spill); and its opacity at full level. Numbers Josh tunes by eye. */
export const GLOW_CARD_OUT_M = 0.25;
export const GLOW_CARD_SPILL = 1.0;
export const GLOW_CARD_GAIN = 0.06;

/** One glow card: its building, its centre (metres), the way it faces (a unit step in plan) and its size (metres). */
export interface GlowCard {
  readonly building: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly nx: number;
  readonly nz: number;
  readonly w: number;
  readonly h: number;
}

/**
 * The glow cards of `buildingIds`: for every column of each, one card per street face (`mass.built`'s `faces: "street"`, never a yard, lane or park) in front of each of its storeys that can have glass: the
 * ground storey and every floor piece, never the roof. A `floor3` is one card as tall as its three storeys. Pure.
 */
export function glowCards(plan: Pick<CityPlan, "layers">, buildingIds: Iterable<string>): GlowCard[] {
  const columns = plan.layers.buildings?.columns;
  const built = plan.layers.mass?.built;
  if (!columns || !built) return [];
  const want = new Set(buildingIds);
  const open = new Map(built.map((c) => [`${c.i},${c.j}`, c.open] as const));
  const out: GlowCard[] = [];
  for (const c of columns) {
    if (!want.has(c.building)) continue;
    const sides = (open.get(`${c.i},${c.j}`) ?? []).filter((o) => o.faces === "street").map((o) => SIDE_DIR[o.side]);
    if (sides.length === 0) continue;
    const bands: [number, number][] = [[c.ground.y_m, c.ground.top_m]];
    for (const p of c.pieces) if (p.role !== "roof") bands.push([p.placement.y_m, p.placement.y_m + 3 * p.span]);
    for (const [dx, dz] of sides) {
      for (const [lo, hi] of bands) {
        out.push({ building: c.building, x: (c.i + 0.5) * CELL + dx * (CELL / 2 + GLOW_CARD_OUT_M), y: (lo + hi) / 2, z: (c.j + 0.5) * CELL + dz * (CELL / 2 + GLOW_CARD_OUT_M), nx: dx, nz: dz, w: CELL * GLOW_CARD_SPILL, h: (hi - lo) * GLOW_CARD_SPILL });
      }
    }
  }
  return out;
}

/** What `glowCardMesh` made: its one mesh (null with no cards), and the setters, as `LitGlass`'s. */
export interface GlowCards {
  readonly mesh: InstancedMesh | null;
  readonly calls: number;
  set(building: string, g: BuildingGlow): void;
  commit(): void;
  dispose(): void;
}

let cardTexture: DataTexture | null = null;
/** One soft falloff, white in the middle to black at the edge, made in code (no asset): the card's `map`. */
function cardMap(): DataTexture {
  if (cardTexture) return cardTexture;
  const n = 32;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = ((x + 0.5) / n) * 2 - 1;
      const v = ((y + 0.5) / n) * 2 - 1;
      const d = Math.max(0, 1 - Math.hypot(u, v));
      const a = Math.round(255 * d * d * d);
      const o = (y * n + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = a;
      data[o + 3] = 255;
    }
  }
  const t = new DataTexture(data, n, n, RGBAFormat, UnsignedByteType);
  t.name = "glow-card";
  t.needsUpdate = true;
  cardTexture = t;
  return t;
}

const cardQ = new Quaternion();
const cardP = new Vector3();
const cardS = new Vector3();
const cardM = new Matrix4();
const UP = new Vector3(0, 1, 0);

/**
 * The one InstancedMesh of `cards`, additive, at `scale` world units to the metre, each card's colour (its brightness, the material being additive) written from its building's level and flare each frame. Hidden
 * while every level is 0, so the dark city costs no call. A card faces along `(nx, nz)` and cannot be picked.
 */
export function glowCardMesh(cards: readonly GlowCard[], scale: number): GlowCards {
  if (cards.length === 0) return { mesh: null, calls: 0, set() {}, commit() {}, dispose() {} };
  const geometry = new PlaneGeometry(1, 1);
  const material = new MeshBasicMaterial({ color: 0xffffff, map: cardMap(), blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new InstancedMesh(geometry, material, cards.length);
  mesh.name = "plan:glow-cards";
  mesh.raycast = () => {};
  mesh.frustumCulled = false;
  // Always visible, so its program compiles with the first frame of the loaded city and not on first light (a hidden mesh is skipped by three's compile); no cards lit is `count` 0, which draws nothing.
  mesh.count = 0;
  const ranges = new Map<string, number[]>();
  cards.forEach((c, k) => {
    cardQ.setFromAxisAngle(UP, Math.atan2(c.nx, c.nz));
    mesh.setMatrixAt(k, cardM.compose(cardP.set(c.x * scale, c.y * scale, c.z * scale), cardQ, cardS.set(c.w * scale, c.h * scale, 1)));
    const list = ranges.get(c.building);
    if (list) list.push(k);
    else ranges.set(c.building, [k]);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(cards.length * 3), 3);
  const arr = mesh.instanceColor.array as Float32Array;
  let any = false;
  return {
    mesh,
    calls: 1,
    set(building, g) {
      const list = ranges.get(building);
      if (!list) return;
      const v = Math.min(g.level * (1 + 0.5 * g.flare), 1.5) * GLOW_CARD_GAIN;
      if (v > 0) any = true;
      const r = AMBER.r * v;
      const gr = AMBER.g * v;
      const b = AMBER.b * v;
      for (const k of list) (arr[k * 3] = r), (arr[k * 3 + 1] = gr), (arr[k * 3 + 2] = b);
    },
    commit() {
      mesh.instanceColor!.needsUpdate = true;
      mesh.count = any ? cards.length : 0;
      any = false;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
