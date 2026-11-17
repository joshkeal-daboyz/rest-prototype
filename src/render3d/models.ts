/**
 * Which converted models the 3D view uses, and how big they stand (ticket 039, 041). Pure: no three, no DOM, no fetch.
 * The manifest (src/core/assets.ts) is read as plain data; the GLB files and the manifest live in the gitignored
 * assets/private/ and are fetched at runtime by models3d.ts, never bundled. Model names are not licensed content.
 */

import { ASSET_MANIFEST_VERSION, type AssetEntry, type AssetManifest } from "../core";
import { stableHash } from "../render/city";
import { POLE_HEIGHT } from "./layout";
import { LOT_TYPES, LOT_TYPE_NAMES, type Lot, type LotType } from "./town";

/** World units per metre of a converted building: a 1.6-unit pole is about 9 m. Every building is at this scale, always (ticket 041). */
export const WORLD_PER_METRE = 0.18;
/** Two lots whose edges are within this many world units are neighbours: they never get the same model (or placeholder variant). */
export const NEIGHBOUR_GAP = 0.5;

export type ModelSlot = "pole" | "lamp" | "building";
export const MODEL_SLOTS: readonly ModelSlot[] = ["pole", "lamp", "building"];

/** One row of the table: the models of one pack that can fill a slot, in order of preference. A slot may have several rows. */
export interface ModelChoice {
  slot: ModelSlot;
  pack: string;
  names: readonly string[];
  /**
   * Buildings only: the yaw (radians) that turns these models' front to local +z, the way a lot faces its road. Default 0.
   * If a model's door faces the wrong way, give it a row of its own and set this (Math.PI turns it round; a quarter turn is
   * Math.PI / 2 or -Math.PI / 2, and swaps which of its sides is the frontage).
   */
  front?: number;
}

/**
 * Edit this to change the look. Names are root node names from `assets/private/out/manifest.json`.
 * - pole: the 6.3 m wooden utility pole with a cross-arm, one style only (ticket 041 C; wires, insulators and cans stay drawn in code, so no `_Preset_` or `_Lines_` models).
 * - lamp: a plain 5.8 m lamp post (the lamp's head, light and pool stay drawn in code).
 * - building: SIMPLE Town's houses and shops (a few hundred triangles each, one image), one style, at one scale (WORLD_PER_METRE).
 *   Which lots a model can stand on is worked out from its size (`lotTypeOf`), not from the row it is in; the rows only group
 *   names that share a `front`. Worked out from the manifest's bounds, against the ticket's listing: house_mesh (13.4 m deep)
 *   is a house lot's, Building_CoffeeShop (15.6 m high, over the small and house caps) is a large lot's, and office_stepped_mesh
 *   (20 m high, 20.3 m wide or 15.2 m across a quarter turn) fits no lot, so it is left out. Not used: Building_Cinema and
 *   Building_Mall_A/B (too big for any lot), town_hall_mesh (texture-guessed) and the Apocalypse buildings (another art style).
 */
export const MODEL_TABLE: readonly ModelChoice[] = [
  { slot: "pole", pack: "apocalypse-power", names: ["SM_Prop_Powerpole_01"] },
  { slot: "lamp", pack: "apocalypse-power", names: ["SM_Prop_LightPole_01"] },
  {
    // small lots: 12 x 13 m, at most 12 m high
    slot: "building",
    pack: "simple-town",
    names: [
      "Building_Shop_01",
      "Building_Shop_02",
      "Building_Shop_03",
      "Building_Shop_04",
      "Building_Shop_05",
      "Building_BaberShop",
      "Building_Gym",
      "store_small_mesh",
      "store_corner_mesh",
      "apartment_small_mesh",
    ],
    front: 0,
  },
  {
    // house lots: 16 x 19 m, at most 15 m high
    slot: "building",
    pack: "simple-town",
    names: [
      "Building_House_01",
      "Building_House_02",
      "Building_House_03",
      "Building_House_04",
      "Building_House_09",
      "Building_House_010",
      "Building_House_011",
      "Building_House_012",
      "Building_House_013",
      "Building_House_014",
      "Building_House_015",
      "Building_Garage_01",
      "Building_Garage_02",
      "Building_Garage_03",
      "office_small_mesh",
      "house_mesh",
    ],
    front: 0,
  },
  {
    // large lots: 25 x 28 m, at most 16 m high
    slot: "building",
    pack: "simple-town",
    names: ["Building_House_05", "Building_House_06", "Building_House_07", "Building_House_08", "Building_AutoRepair", "Building_StripClub", "Building_PoliceStation", "Building_PetrolStation", "Building_CoffeeShop"],
    front: 0,
  },
  {
    // tall lots: 14 x 16 m, at most 28 m high (outside the ring only)
    slot: "building",
    pack: "simple-town",
    names: ["apartment_large_mesh", "office_medium_mesh", "office_large_mesh"],
    front: 0,
  },
];

/** A table name that the manifest can back: the entry, the pack it is in and the GLB to fetch it from (relative to the manifest). */
export interface PlannedModel {
  pack: string;
  glb: string;
  entry: AssetEntry;
  /** The row's `front` (0 when it gave none). */
  front: number;
}

/** Per slot, the usable entries in table order; null when nothing is usable (the slot keeps its placeholder). */
export type ModelPlan = Record<ModelSlot, PlannedModel[] | null>;

/** The model's size in metres, from its bounds: width (x), height (y), depth (z). */
export function sizeOf(entry: AssetEntry): readonly [number, number, number] {
  const { min, max } = entry.bounds;
  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
}

function usable(entry: AssetEntry, slot: ModelSlot): boolean {
  if (entry.warnings.includes("scale-suspect")) return false;
  const [w, h, d] = sizeOf(entry);
  if (![w, h, d].every((v) => Number.isFinite(v) && v >= 0)) return false;
  return slot === "building" ? w > 0 && d > 0 : h > 0;
}

/** The usable table entries per slot. A name missing from the manifest, a `scale-suspect` entry or a pack the manifest lacks is skipped. */
export function planModels(manifest: AssetManifest, table: readonly ModelChoice[] = MODEL_TABLE): ModelPlan {
  const plan: ModelPlan = { pole: null, lamp: null, building: null };
  for (const row of table) {
    const pack = manifest.packs.find((p) => p.pack === row.pack);
    if (!pack) continue;
    for (const name of row.names) {
      const entry = pack.assets.find((a) => a.name === name);
      if (!entry || !usable(entry, row.slot)) continue;
      (plan[row.slot] ??= []).push({ pack: pack.pack, glb: pack.glb, entry, front: row.front ?? 0 });
    }
  }
  return plan;
}

/**
 * The uniform scale that puts a model in the scene. A pole or lamp post is `POLE_HEIGHT` tall (the wires attach there).
 * A building is its true size in metres x WORLD_PER_METRE, always: one scale for every building (ticket 041).
 */
export function modelScale(entry: AssetEntry, slot: ModelSlot): number {
  if (slot !== "building") {
    const h = sizeOf(entry)[1];
    return h > 0 ? POLE_HEIGHT / h : 1;
  }
  return WORLD_PER_METRE;
}

/**
 * Where a body of footprint depth `depth` (world units, away from the road) stands on `lot` so its front face is against the lot's
 * front edge instead of centred: the lot's centre moved toward the road by (lot.d - depth) / 2. Every building then keeps the lot's setback.
 */
export function atFront(lot: Lot, depth: number): { x: number; z: number } {
  const s = Math.max(0, (lot.d - depth) / 2);
  return { x: lot.x + Math.sin(lot.yaw) * s, z: lot.z + Math.cos(lot.yaw) * s };
}

const EPS = 1e-9;

/**
 * The first lot type, in LOT_TYPE_NAMES order (small, house, large, tall), that holds the model once its front is turned to
 * the road: its frontage within the lot's frontage, its depth within the lot's depth, and its height under the cap.
 * Null when none does (the Cinema, the malls, office_stepped_mesh). `front` is the row's yaw; an odd quarter turn swaps width and depth.
 */
export function lotTypeOf(entry: AssetEntry, front = 0): LotType | null {
  const [w, h, d] = sizeOf(entry);
  const quarter = Math.abs(Math.sin(front)) > 0.5;
  const frontage = quarter ? d : w;
  const depth = quarter ? w : d;
  for (const t of LOT_TYPE_NAMES) {
    const spec = LOT_TYPES[t];
    if (frontage <= spec.frontage + EPS && depth <= spec.depth + EPS && h <= spec.cap + EPS) return t;
  }
  return null;
}

/** The model names a lot type can use, in table order. A type with none is drawn with placeholder buildings. */
export type BuildingPlan = Readonly<Record<LotType, readonly string[]>>;

/** Group the planned building models by the lot type each one fits. */
export function buildingPlan(models: readonly PlannedModel[] | null): BuildingPlan {
  const out: Record<LotType, string[]> = { small: [], house: [], large: [], tall: [] };
  for (const m of models ?? []) {
    const t = lotTypeOf(m.entry, m.front);
    if (t) out[t].push(m.entry.name);
  }
  return out;
}

// ---- neighbours ----

interface Corners {
  x: number[];
  z: number[];
}

function cornersOf(l: Lot): Corners {
  const ex = Math.cos(l.yaw);
  const ez = -Math.sin(l.yaw);
  const fx = Math.sin(l.yaw);
  const fz = Math.cos(l.yaw);
  const x: number[] = [];
  const z: number[] = [];
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    x.push(l.x + (ex * l.w * a + fx * l.d * b) / 2);
    z.push(l.z + (ez * l.w * a + fz * l.d * b) / 2);
  }
  return { x, z };
}

function pointSeg(px: number, pz: number, x0: number, z0: number, x1: number, z1: number): number {
  const vx = x1 - x0;
  const vz = z1 - z0;
  const len2 = vx * vx + vz * vz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - x0) * vx + (pz - z0) * vz) / len2)) : 0;
  return Math.hypot(px - (x0 + vx * t), pz - (z0 + vz * t));
}

function inside(c: Corners, px: number, pz: number): boolean {
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const v = (c.x[j]! - c.x[i]!) * (pz - c.z[i]!) - (c.z[j]! - c.z[i]!) * (px - c.x[i]!);
    if (v > 0) pos++;
    else if (v < 0) neg++;
  }
  return pos === 0 || neg === 0;
}

/** The distance between two lots' footprints (0 when they touch or overlap), world units. */
export function lotGap(a: Lot, b: Lot): number {
  const ca = cornersOf(a);
  const cb = cornersOf(b);
  if (inside(ca, cb.x[0]!, cb.z[0]!) || inside(cb, ca.x[0]!, ca.z[0]!)) return 0;
  let best = Infinity;
  for (let i = 0; i < 4; i++) {
    const i2 = (i + 1) % 4;
    for (let j = 0; j < 4; j++) {
      const j2 = (j + 1) % 4;
      // Two convex polygons that do not overlap are closest at a corner of one against an edge of the other.
      best = Math.min(
        best,
        pointSeg(ca.x[i]!, ca.z[i]!, cb.x[j]!, cb.z[j]!, cb.x[j2]!, cb.z[j2]!),
        pointSeg(cb.x[j]!, cb.z[j]!, ca.x[i]!, ca.z[i]!, ca.x[i2]!, ca.z[i2]!),
      );
    }
  }
  return best;
}

/** Which of `count` choices a hash picks (0 when there are none). */
export function pickIndex(hash: number, count: number): number {
  return count > 0 ? hash % count : 0;
}

/**
 * For every lot, an index into the choices of its type (`count(type)` of them), started from `stableHash(lot.key)`; -1 when the type has none.
 * Lots are taken in order. If a lot placed earlier within NEIGHBOUR_GAP has that index, the lot takes the next free one in the list,
 * so with three or more choices no two neighbours match, unless a lot has as many earlier neighbours as there are choices (it then keeps its hash's pick).
 */
export function pickDistinct(lots: readonly Lot[], count: (type: LotType) => number): number[] {
  const out: number[] = new Array<number>(lots.length).fill(-1);
  // Neighbours are NEIGHBOUR_GAP apart at most, so their centres are within the two half diagonals plus the gap (7.3 for two `large` lots):
  // a cell of 8 puts every neighbour in the 3 x 3 cells round a lot.
  const CELL = 8;
  const cells = new Map<string, number[]>();
  const keyOf = (cx: number, cz: number): string => `${cx},${cz}`;
  lots.forEach((l, i) => {
    const n = count(l.type);
    if (n <= 0) return;
    const cx = Math.floor(l.x / CELL);
    const cz = Math.floor(l.z / CELL);
    const used = new Set<number>();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const j of cells.get(keyOf(cx + dx, cz + dz)) ?? []) {
          const o = lots[j]!;
          if (o.type === l.type && lotGap(l, o) <= NEIGHBOUR_GAP) used.add(out[j]!);
        }
      }
    }
    const start = pickIndex(stableHash(l.key), n);
    let pick = start;
    for (let k = 0; k < n; k++) {
      const c = (start + k) % n;
      if (!used.has(c)) {
        pick = c;
        break;
      }
    }
    out[i] = pick;
    const key = keyOf(cx, cz);
    const bucket = cells.get(key);
    if (bucket) bucket.push(i);
    else cells.set(key, [i]);
  });
  return out;
}

/** The model name each lot gets, parallel to `lots`: one of its own type's, by `stableHash(lot.key)`, never a neighbour's. Null where the type has no model. */
export function pickBuildings(lots: readonly Lot[], plan: BuildingPlan): (string | null)[] {
  const idx = pickDistinct(lots, (t) => plan[t].length);
  return lots.map((l, i) => (idx[i]! >= 0 ? plan[l.type][idx[i]!]! : null));
}

/**
 * The yaw of a pole model so its cross-arm runs across the wire like the placeholder's. `armYaw` is the placeholder arm's yaw
 * (its long axis is x); a model whose long horizontal side is z (the converted power pole's) gets a quarter turn more.
 */
export function poleYaw(entry: AssetEntry, armYaw: number): number {
  const [w, , d] = sizeOf(entry);
  return d > w ? armYaw + Math.PI / 2 : armYaw;
}

/** True when `value` is a manifest this build can read: an object with the current version and a list of packs. */
export function isManifest(value: unknown): value is AssetManifest {
  if (typeof value !== "object" || value === null) return false;
  const m = value as { version?: unknown; packs?: unknown };
  return m.version === ASSET_MANIFEST_VERSION && Array.isArray(m.packs);
}
