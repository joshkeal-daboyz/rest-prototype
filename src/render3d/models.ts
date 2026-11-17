/**
 * Which converted models the 3D view uses, and how big they stand (ticket 039). Pure: no three, no DOM, no fetch.
 * The manifest (src/core/assets.ts) is read as plain data; the GLB files and the manifest live in the gitignored
 * assets/private/ and are fetched at runtime by models3d.ts, never bundled. Model names are not licensed content.
 */

import { ASSET_MANIFEST_VERSION, type AssetEntry, type AssetManifest } from "../core";
import { POLE_HEIGHT } from "./layout";

/** World units per metre of a converted building: a 1.6-unit pole is about 9 m. */
export const WORLD_PER_METRE = 0.18;

export type ModelSlot = "pole" | "lamp" | "building";
export const MODEL_SLOTS: readonly ModelSlot[] = ["pole", "lamp", "building"];

/** One row of the table: the models of one pack that can fill a slot, in order of preference. A slot may have several rows. */
export interface ModelChoice {
  slot: ModelSlot;
  pack: string;
  names: readonly string[];
}

/**
 * Edit this to change the look. Names are root node names from `assets/private/out/manifest.json`.
 * - pole: the 6.3 m wooden utility pole with a cross-arm, and the plain one (wires stay drawn in code, so no `_Preset_` or `_Lines_` models).
 * - lamp: a plain 5.8 m lamp post (the lamp's head, light and pool stay drawn in code).
 * - building: SIMPLE Town's houses and shops (a few hundred triangles each, one image) for the footprint and the city blocks; one is picked per block.
 */
export const MODEL_TABLE: readonly ModelChoice[] = [
  { slot: "pole", pack: "apocalypse-power", names: ["SM_Prop_Powerpole_01", "SM_Prop_Powerpole_Single_01"] },
  { slot: "lamp", pack: "apocalypse-power", names: ["SM_Prop_LightPole_01"] },
  {
    slot: "building",
    pack: "simple-town",
    names: ["Building_Shop_01", "Building_Shop_03", "Building_House_01", "Building_House_09", "Building_House_012","Building_BaberShop", "Building_CoffeeShop", "Building_Gym", "Building_House_05"],
  },
];

/** A table name that the manifest can back: the entry, the pack it is in and the GLB to fetch it from (relative to the manifest). */
export interface PlannedModel {
  pack: string;
  glb: string;
  entry: AssetEntry;
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
      (plan[row.slot] ??= []).push({ pack: pack.pack, glb: pack.glb, entry });
    }
  }
  return plan;
}

/** A lot a building has to fit inside, in world units (a Block has more fields than this). */
export interface Lot {
  w: number;
  d: number;
}

/** The scale of a building in a lot, and whether a quarter turn gives it the larger one. Never grown past true size (metres x WORLD_PER_METRE). */
function fitBuilding(entry: AssetEntry, lot: Lot): { scale: number; turn: boolean } {
  const [mw, , md] = sizeOf(entry);
  const w = mw * WORLD_PER_METRE;
  const d = md * WORLD_PER_METRE;
  const straight = Math.min(1, lot.w / w, lot.d / d);
  const turned = Math.min(1, lot.w / d, lot.d / w);
  return turned > straight + 1e-9 ? { scale: turned, turn: true } : { scale: straight, turn: false };
}

/**
 * The uniform scale that puts a model in the scene. A pole or lamp post is `POLE_HEIGHT` tall (the wires attach there).
 * A building is its true size in metres x WORLD_PER_METRE, shrunk (aspect kept, quarter turn allowed) to fit the lot, never grown.
 */
export function modelScale(entry: AssetEntry, slot: ModelSlot, lot?: Lot): number {
  if (slot !== "building") {
    const h = sizeOf(entry)[1];
    return h > 0 ? POLE_HEIGHT / h : 1;
  }
  return lot ? WORLD_PER_METRE * fitBuilding(entry, lot).scale : WORLD_PER_METRE;
}

/** The yaw a building takes in its lot: a quarter turn when that lets it stay bigger. */
export function buildingYaw(entry: AssetEntry, lot: Lot): number {
  return fitBuilding(entry, lot).turn ? Math.PI / 2 : 0;
}

/**
 * The yaw of a pole model so its cross-arm runs across the wire like the placeholder's. `armYaw` is the placeholder arm's yaw
 * (its long axis is x); a model whose long horizontal side is z (the converted power pole's) gets a quarter turn more.
 */
export function poleYaw(entry: AssetEntry, armYaw: number): number {
  const [w, , d] = sizeOf(entry);
  return d > w ? armYaw + Math.PI / 2 : armYaw;
}

/** Which of `count` choices a hash picks (0 when there are none). */
export function pickIndex(hash: number, count: number): number {
  return count > 0 ? hash % count : 0;
}

/** True when `value` is a manifest this build can read: an object with the current version and a list of packs. */
export function isManifest(value: unknown): value is AssetManifest {
  if (typeof value !== "object" || value === null) return false;
  const m = value as { version?: unknown; packs?: unknown };
  return m.version === ASSET_MANIFEST_VERSION && Array.isArray(m.packs);
}
