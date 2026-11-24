/**
 * Ticket 081 L1: the lit building's windows. A building a puzzle lamp stands for is dark until current lights it; then its windows (and its shopfront glass) glow warm.
 *
 * - `windowMask()` is one shared emissive texture made in code, in the City Pack atlas's UV layout: black everywhere but the glass rectangle, and each of its three panes in the colour the pack's own night
 *   image (`Textures/Emissive_01.png`, Josh's card L-Q1 "Pack's night glow") lights it. The rectangle and pane colours were read from that image once and are typed in; nothing from the pack is committed.
 * - `buildingGlow` is the pure level of one building this frame, from E2's `lampState` and `lampFlicker`, so the Relight's order, the flare and the brownout dip are the lamps' own.
 * - `windowLit` is the building materials' window-lit twin, and `setBuildingGlow` writes a building's level into its instances' `windowLevel` slots (081 F1b), so every building stays in the shared instancers.
 * - `litGlass` is one more InstancedMesh per shop glass key over the dark glass, for the lit buildings' shopfronts only.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DataTexture, Matrix4, Mesh as ThreeMesh, MeshBasicMaterial, NearestFilter, PointLight, RGBAFormat, SRGBColorSpace, UnsignedByteType, type Material, type Mesh, type Object3D, type Texture } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CalibrationKey, CityBuilding, CityNodePlace, CityPlan, CityRoofMast, CitySide } from "../core";
import type { GridState } from "../grid";
import { FLARE_SECONDS } from "../render/relight";
import { SHOP_GLASS } from "./dressing";
import { lampFlicker } from "./look";
import { dressMatrix, meshParts } from "./models3d";
import type { BuildingsDraw, PlanDressDraw } from "./plan3d";
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
export function setBuildingGlow(draw: Pick<BuildingsDraw, "instances">, building: string, g: BuildingGlow): void {
  const list = draw.instances.get(building);
  if (!list) return;
  const v = windowIntensity(g) / WINDOW_LIT;
  for (const { mesh, index } of list) {
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

/** The most street lights a city makes. 10 until the frame-time budgets of ticket 081 L2 criterion 3 pass at 25 and 32, then 32. */
export const STREET_LIGHTS_MAX = 10;
/** Where a light stands, metres: out from its street face, and up (the first floor's windows). */
export const STREET_LIGHT_OUT_M = 2;
export const STREET_LIGHT_UP_M = 3;
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
  const out: LightPlace[] = [];
  for (const id of buildingIds) {
    if (out.length >= max) break;
    const b = byId.get(id);
    if (!b) continue;
    let corner: LightPlace | null = null;
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
      if (sides.length >= 2 && !corner) corner = { building: id, x, y: STREET_LIGHT_UP_M, z };
      sx += x;
      sz += z;
      n++;
    }
    if (n === 0) continue;
    out.push(corner ?? { building: id, x: sx / n, y: STREET_LIGHT_UP_M, z: sz / n });
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
    const light = new PointLight(PANE_COLOURS[0], 0, STREET_LIGHT_REACH_M * scale, STREET_LIGHT_DECAY);
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
