/**
 * Which converted models the 3D view uses, and how big they stand (ticket 039, 041). Pure: no three, no DOM, no fetch.
 * The manifest (src/core/assets.ts) is read as plain data; the GLB files and the manifest live in the gitignored
 * assets/private/ and are fetched at runtime by models3d.ts, never bundled. Model names are not licensed content.
 */

import { ASSET_MANIFEST_VERSION, calibrationKey, parseCalibrationKey, type AssetEntry, type AssetManifest, type CalibrationKey } from "../core";
import { stableHash } from "../render/city";
import { POLE_HEIGHT } from "./layout";
import { LOT_TYPES, LOT_TYPE_NAMES, type Lot, type LotType } from "./town";

/** World units per metre of a converted building: a 1.6-unit pole is about 9 m. Every building is at this scale, always (ticket 041). */
export const WORLD_PER_METRE = 0.18;
/** Two lots whose edges are within this many world units are neighbours: they never get the same model (or placeholder variant). */
export const NEIGHBOUR_GAP = 0.5;
/** On one road side, a family does not come back within this many lots (ticket 042 A). */
export const STREET_REPEAT_GAP = 3;
/** On a map, no family takes more than this share of its lot type's lots, when the type has four or more families (ticket 042 A). */
export const FAMILY_SHARE_MAX = 0.25;
/** Building models that are never placed, as `pack:name` keys (ticket 042 A, re-keyed by 045 A). The video rental store, `store_small_mesh`, is excluded on Josh's word (ticket 047, 18 Nov 2026: "ignore it... it's part of the small package. The polygon buildings are much higher quality"). It keeps its `MODEL_TABLE` row and its front, and the gallery still shows it. */
export const BUILDING_EXCLUDE: readonly CalibrationKey[] = ["simple-town:store_small_mesh"];

/**
 * Per lot type, how many mesh families POLYGON building models must offer (after BUILDING_EXCLUDE) before the type uses them (ticket 048 Q1).
 * The thresholds are the variety rules' own: four families where the family-share cap applies, three where only the street rule can. A type
 * that falls short keeps its SIMPLE Town models (the rows marked `fallback`), and the two styles never mix within one type.
 */
export const POLYGON_MIN_FAMILIES: Readonly<Record<LotType, number>> = { small: 4, house: 4, large: 4, tall: 3 };

/**
 * The lot types that may stand City Pack stacks (ticket 050 Q1, default): large and tall. Small and house keep the Town Pack's whole houses (048). A stack is
 * a family of its own (`city-pack:stack:<style>`) and each style counts as one toward POLYGON_MIN_FAMILIES.
 */
export const STACK_LOT_TYPES: readonly LotType[] = ["large", "tall"];

/** What one stack style can stand on, as `stackName` is the name it has in a `BuildingPlan` (computed by `offeredStacks` in stacks.ts from the pieces that loaded). */
export interface StackOffer {
  style: string;
  types: readonly LotType[];
}

/** A stack style's name in a `BuildingPlan` and in the picks: `stack:<style>`. No model is named like that, so the two never collide. */
export const stackName = (style: string): string => `stack:${style}`;
/** The style a plan name stands for, or null when it names a model. */
export function stackStyleOf(name: string): string | null {
  return name.startsWith("stack:") ? name.slice("stack:".length) : null;
}
/** A stack style's family for the variety rules. */
export const stackFamily = (style: string): string => `city-pack:stack:${style}`;

export type ModelSlot = "pole" | "lamp" | "building";
export const MODEL_SLOTS: readonly ModelSlot[] = ["pole", "lamp", "building"];

/** One row of the table: the models of one pack that can fill a slot, in order of preference. A slot may have several rows. */
export interface ModelChoice {
  slot: ModelSlot;
  pack: string;
  names: readonly string[];
  /** The row is SIMPLE Town's, kept as the fallback of a lot type POLYGON does not fill, and for a checkout with no POLYGON pack (ticket 048). */
  fallback?: true;
}

/** The axis, in a GLB's own frame, that a model's door faces. */
export type ModelFront = "+z" | "-z" | "+x" | "-x";

/** The yaw (radians about y) that turns a model whose door faces `f` to face local +z, the way a lot faces its road: 0, pi, -pi/2, +pi/2. */
export function frontYaw(f: ModelFront): number {
  switch (f) {
    case "+z":
      return 0;
    case "-z":
      return Math.PI;
    case "+x":
      return -Math.PI / 2;
    case "-x":
      return Math.PI / 2;
  }
}

/** The unit vector (x, z), in a model's own frame, along which its door faces. */
export function frontAxis(f: ModelFront): readonly [number, number] {
  return f === "+z" ? [0, 1] : f === "-z" ? [0, -1] : f === "+x" ? [1, 0] : [-1, 0];
}

/** True when the front is a quarter turn from +z: the model's depth then runs along the road and its width away from it. */
export function frontIsQuarter(f: ModelFront): boolean {
  return f === "+x" || f === "-x";
}

export interface BuildingFront {
  /** Which of the model's own axes its door faces. */
  front: ModelFront;
  /**
   * A corner shop: two faces are frontage, so mid-row it shows a side wall either way. It only stands on a corner lot (`Lot.cornerSides`),
   * facing its own road, with its second frontage on the lot side that meets a cross street.
   */
  corner?: true;
  /** For a corner model, which side of the lot (its local x, once the front is turned to the road) the second frontage is on. Default "+x". A yaw cannot mirror, so the model only goes where its open side is a lot side that meets a cross street. */
  open?: "+x" | "-x";
}

/** The fronts table: one line per `pack:name` (ticket 045 A). Names repeat across packs, so a bare name is never a key. */
export type FrontTable = Readonly<Record<CalibrationKey, BuildingFront>>;

const FRONT_Z: BuildingFront = { front: "+z" };
const FRONT_NZ: BuildingFront = { front: "-z" };
const CORNER_PLUS_X: BuildingFront = { front: "+z", corner: true, open: "+x" };
/**
 * Which way every building model's door faces (ticket 042 A). Every `pack:name` in MODEL_TABLE's building rows must be here (a test fails on a
 * missing one), and so must the names of ticket 042 B's PLACE_MODELS. Started as a guess ("+z" for all: no data in the repo records the
 * door side, the manifest's bounds are centred); Josh calibrated it on 17 Nov 2026 with `/?puzzle=...&view=3d&fronts=1`: "all reversed
 * 180 degrees", only the video rental store, store_small_mesh, was right at "+z". So every other name is "-z". memorial_mesh (ticket B's,
 * not placed by A) was not among what he saw and stays at the "+z" guess until B shows it. Each further correction is one line here, keyed `pack:name`.
 *
 * store_corner_mesh turned with the rest, so its `open` flips: `open` is read in the lot frame after the front is turned to the road, and
 * the model's own +x end (the guessed second frontage) now lands on the lot's -x side. It is the same physical end of the model.
 */
export const BUILDING_FRONTS: FrontTable = {
  "simple-town:Building_Shop_01": FRONT_NZ,
  "simple-town:Building_Shop_02": FRONT_NZ,
  "simple-town:Building_Shop_03": FRONT_NZ,
  "simple-town:Building_Shop_04": FRONT_NZ,
  "simple-town:Building_Shop_05": FRONT_NZ,
  "simple-town:Building_BaberShop": FRONT_NZ,
  "simple-town:Building_Gym": FRONT_NZ,
  "simple-town:store_small_mesh": FRONT_Z,
  "simple-town:store_corner_mesh": { front: "-z", corner: true, open: "-x" },
  "simple-town:apartment_small_mesh": FRONT_NZ,
  "simple-town:Building_House_01": FRONT_NZ,
  "simple-town:Building_House_02": FRONT_NZ,
  "simple-town:Building_House_03": FRONT_NZ,
  "simple-town:Building_House_04": FRONT_NZ,
  "simple-town:Building_House_09": FRONT_NZ,
  "simple-town:Building_House_010": FRONT_NZ,
  "simple-town:Building_House_011": FRONT_NZ,
  "simple-town:Building_House_012": FRONT_NZ,
  "simple-town:Building_House_013": FRONT_NZ,
  "simple-town:Building_House_014": FRONT_NZ,
  "simple-town:Building_House_015": FRONT_NZ,
  "simple-town:Building_Garage_01": FRONT_NZ,
  "simple-town:Building_Garage_02": FRONT_NZ,
  "simple-town:Building_Garage_03": FRONT_NZ,
  "simple-town:office_small_mesh": FRONT_NZ,
  "simple-town:house_mesh": FRONT_NZ,
  "simple-town:Building_House_05": FRONT_NZ,
  "simple-town:Building_House_06": FRONT_NZ,
  "simple-town:Building_House_07": FRONT_NZ,
  "simple-town:Building_House_08": FRONT_NZ,
  "simple-town:Building_AutoRepair": FRONT_NZ,
  "simple-town:Building_StripClub": FRONT_NZ,
  "simple-town:Building_PoliceStation": FRONT_NZ,
  "simple-town:Building_PetrolStation": FRONT_NZ,
  "simple-town:Building_CoffeeShop": FRONT_NZ,
  "simple-town:apartment_large_mesh": FRONT_NZ,
  "simple-town:office_medium_mesh": FRONT_NZ,
  "simple-town:office_large_mesh": FRONT_NZ,
  // Ticket 042 B's default for a sacred place: listed now so B only edits its table.
  "simple-town:memorial_mesh": FRONT_Z,
  // POLYGON Town Pack (ticket 048), promoted by hand from Josh's saved file `assets/private/calibration/fronts.json` (savedAt 2026-11-18T03:10:05.703Z):
  // 14 of the pack's 18 buildings, each from a click on its door in the gallery. None was Shift+clicked, so BUILDING_EXCLUDE gains nothing.
  // `SM_Bld_Church_01` and `SM_Bld_Shop_01` are marked but stand in no building row (the Church is held for 042 E's landmark places; Shop_01 is not in 048's list).
  "town-pack:SM_Bld_Church_01": { front: "+z" },
  "town-pack:SM_Bld_House_Preset_01": { front: "-x" },
  "town-pack:SM_Bld_House_Preset_02": { front: "-z" },
  "town-pack:SM_Bld_House_Preset_03": { front: "-x" },
  "town-pack:SM_Bld_House_Preset_04": { front: "-x" },
  "town-pack:SM_Bld_House_Preset_05": { front: "-x" },
  "town-pack:SM_Bld_House_Preset_06": { front: "+x" },
  "town-pack:SM_Bld_House_Preset_07": { front: "-z" },
  "town-pack:SM_Bld_House_Preset_08": { front: "-x" },
  "town-pack:SM_Bld_House_Preset_09": { front: "-x" },
  "town-pack:SM_Bld_House_Preset_10": { front: "-z" },
  "town-pack:SM_Bld_House_Preset_11": { front: "-z" },
  "town-pack:SM_Bld_House_Preset_Garage_01": { front: "-z" },
  "town-pack:SM_Bld_Shop_01": { front: "+z" },
  // POLYGON City Pack stack pieces (ticket 050 C): the 34 keys of `STACK_STYLES` (stacks.ts). PROVISIONAL. Josh's saved file `assets/private/calibration/fronts.json`
  // (savedAt 2026-11-18T03:50:16.193Z) has 25 of them, every one "+z", which is what a first click on the gallery's first copy saves, so it is not evidence that he saw a
  // door. The other nine (Apartment_Corner_01, _03, Apartment_Door_01 and the six roofs, Apartment_Roof_01 to _03 and Apartment_Roof_Corner_01 to _03) were not in the
  // file and take the same "+z" guess. Nobody has confirmed them: the stack gallery (`&gallery=city-pack&stacks=1`) is where Josh does, and each fix is one line here.
  // A corner piece's `open` is the recipe's "+x" guess too (it is read in the lot frame, after the front is turned). A saved file still overrides these in a dev build.
  "city-pack:SM_Bld_Shop_01": { front: "+z" },
  "city-pack:SM_Bld_Shop_02": { front: "+z" },
  "city-pack:SM_Bld_Shop_03": { front: "+z" },
  "city-pack:SM_Bld_Shop_04": { front: "+z" },
  "city-pack:SM_Bld_Shop_05": { front: "+z" },
  "city-pack:SM_Bld_Shop_06": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Door_01": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Door_02": { front: "+z" },
  "city-pack:SM_Bld_Shop_Corner_01": CORNER_PLUS_X,
  "city-pack:SM_Bld_Shop_Corner_02": CORNER_PLUS_X,
  "city-pack:SM_Bld_Apartment_01": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Corner_01": CORNER_PLUS_X,
  "city-pack:SM_Bld_Apartment_Stack_01": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Roof_01": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Roof_Corner_01": CORNER_PLUS_X,
  "city-pack:SM_Bld_Apartment_02": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Corner_02": CORNER_PLUS_X,
  "city-pack:SM_Bld_Apartment_Stack_02": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Roof_02": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Roof_Corner_02": CORNER_PLUS_X,
  "city-pack:SM_Bld_Apartment_03": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Corner_03": CORNER_PLUS_X,
  "city-pack:SM_Bld_Apartment_Stack_03": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Roof_03": { front: "+z" },
  "city-pack:SM_Bld_Apartment_Roof_Corner_03": CORNER_PLUS_X,
  "city-pack:SM_Bld_OfficeOld_Small_Base_01": { front: "+z" },
  "city-pack:SM_Bld_OfficeOld_Small_Floor_01": { front: "+z" },
  "city-pack:SM_Bld_OfficeOld_Small_Roof_01": { front: "+z" },
  "city-pack:SM_Bld_OfficeOld_Large_Base_01": { front: "+z" },
  "city-pack:SM_Bld_OfficeOld_Large_Floor_01": { front: "+z" },
  "city-pack:SM_Bld_OfficeOld_Large_Roof_01": { front: "+z" },
  "city-pack:SM_Bld_OfficeOctagon_Base_01": { front: "+z" },
  "city-pack:SM_Bld_OfficeOctagon_Floor_01": { front: "+z" },
  "city-pack:SM_Bld_OfficeOctagon_Roof_01": { front: "+z" },
};

/**
 * Edit this to change the look. Names are root node names from `assets/private/out/manifest.json`.
 * - pole: the 6.3 m wooden utility pole with a cross-arm, one style only (ticket 041 C; wires, insulators and cans stay drawn in code, so no `_Preset_` or `_Lines_` models).
 * - lamp: a plain 5.8 m lamp post (the lamp's head, light and pool stay drawn in code).
 * - building: POLYGON Town Pack houses first (ticket 048), then SIMPLE Town's houses and shops (a few hundred triangles each, one image; the `fallback` rows), at one scale (WORLD_PER_METRE).
 *   Which lots a model can stand on is worked out from its size (`lotTypeOf`), not from the row it is in; the rows only group
 *   names by size (which way a door faces is in BUILDING_FRONTS). Worked out from the manifest's bounds, against the ticket's listing: house_mesh (13.4 m deep)
 *   is a house lot's, Building_CoffeeShop (15.6 m high, over the small and house caps) is a large lot's, and office_stepped_mesh
 *   (20 m high, 20.3 m wide or 15.2 m across a quarter turn) fits no lot, so it is left out. Not used: Building_Cinema and
 *   Building_Mall_A/B (too big for any lot), town_hall_mesh (texture-guessed) and the Apocalypse buildings (another art style).
 */
export const MODEL_TABLE: readonly ModelChoice[] = [
  { slot: "pole", pack: "apocalypse-power", names: ["SM_Prop_Powerpole_01"] },
  { slot: "lamp", pack: "apocalypse-power", names: ["SM_Prop_LightPole_01"] },
  {
    // POLYGON Town Pack whole buildings (ticket 048), ahead of SIMPLE Town. The lot type of each is worked out from its size and Josh's front (`lotTypeOf`): small 01, 02, 09
    // and Garage_01; house 03 to 07 and 10; large 08 and 11 (08 is 18.9 m across the road at its quarter-turn front). A type switches to these only when they reach
    // POLYGON_MIN_FAMILIES (`buildingPlan`): small and house do, large (2 families) keeps SIMPLE Town. Not here: the Church and the City Hall
    // (042 E's landmarks), the garden shed (prop-sized), Shop_01 and every modular piece. No City Pack name: Josh named none whole (048 Q2).
    slot: "building",
    pack: "town-pack",
    names: [
      "SM_Bld_House_Preset_01",
      "SM_Bld_House_Preset_02",
      "SM_Bld_House_Preset_03",
      "SM_Bld_House_Preset_04",
      "SM_Bld_House_Preset_05",
      "SM_Bld_House_Preset_06",
      "SM_Bld_House_Preset_07",
      "SM_Bld_House_Preset_08",
      "SM_Bld_House_Preset_09",
      "SM_Bld_House_Preset_10",
      "SM_Bld_House_Preset_11",
      "SM_Bld_House_Preset_Garage_01",
    ],
  },
  {
    // small lots: 12 x 13 m, at most 12 m high
    slot: "building",
    pack: "simple-town",
    fallback: true,
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
  },
  {
    // house lots: 16 x 19 m, at most 15 m high
    slot: "building",
    pack: "simple-town",
    fallback: true,
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
  },
  {
    // large lots: 25 x 28 m, at most 16 m high
    slot: "building",
    pack: "simple-town",
    fallback: true,
    names: ["Building_House_05", "Building_House_06", "Building_House_07", "Building_House_08", "Building_AutoRepair", "Building_StripClub", "Building_PoliceStation", "Building_PetrolStation", "Building_CoffeeShop"],
  },
  {
    // tall lots: 14 x 16 m, at most 28 m high (outside the ring only)
    slot: "building",
    pack: "simple-town",
    fallback: true,
    names: ["apartment_large_mesh", "office_medium_mesh", "office_large_mesh"],
  },
];

/** A table name that the manifest can back: the entry, the pack it is in and the GLB to fetch it from (relative to the manifest). */
export interface PlannedModel {
  pack: string;
  glb: string;
  entry: AssetEntry;
  /** Which of the model's own axes its door faces (BUILDING_FRONTS; "+z" when the name has no entry). */
  front: ModelFront;
  /** The side of its lot a corner shop's second frontage is on (it only stands on a corner lot), or false. */
  corner: false | "+x" | "-x";
  /** The model's mesh family in its pack (`meshFamily`): models that are one mesh under several names share it. */
  family: string;
  /** From a `fallback` row (SIMPLE Town): used for a lot type only while POLYGON does not fill it (`buildingPlan`). */
  fallback?: true;
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
export function planModels(manifest: AssetManifest, table: readonly ModelChoice[] = MODEL_TABLE, fronts: FrontTable = BUILDING_FRONTS): ModelPlan {
  const plan: ModelPlan = { pole: null, lamp: null, building: null };
  for (const row of table) {
    const pack = manifest.packs.find((p) => p.pack === row.pack);
    if (!pack) continue;
    for (const name of row.names) {
      const entry = pack.assets.find((a) => a.name === name);
      if (!entry || !usable(entry, row.slot)) continue;
      const key = calibrationKey(pack.pack, name);
      const bf = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key] : undefined;
      (plan[row.slot] ??= []).push({
        pack: pack.pack,
        glb: pack.glb,
        entry,
        front: bf?.front ?? "+z",
        corner: bf?.corner ? (bf.open ?? "+x") : false,
        family: meshFamily(pack.assets, entry),
        ...(row.fallback ? { fallback: true as const } : {}),
      });
    }
  }
  return plan;
}

/**
 * The pieces a stack recipe names (ticket 050 B), as planned models, in the order of `keys`. A key whose pack the manifest lacks, whose entry is
 * missing or `scale-suspect`, or that is not a `pack:name` is skipped; null when none is usable. Pure; the town's plan is unchanged by it.
 */
export function planStackPieces(manifest: AssetManifest, keys: readonly CalibrationKey[], fronts: FrontTable = BUILDING_FRONTS): PlannedModel[] | null {
  const out: PlannedModel[] = [];
  for (const key of keys) {
    const parsed = parseCalibrationKey(key);
    if (!parsed) continue;
    const pack = manifest.packs.find((p) => p.pack === parsed.pack);
    const entry = pack?.assets.find((a) => a.name === parsed.name);
    if (!pack || !entry || !usable(entry, "building")) continue;
    const bf = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key] : undefined;
    out.push({
      pack: pack.pack,
      glb: pack.glb,
      entry,
      front: bf?.front ?? "+z",
      corner: bf?.corner ? (bf.open ?? "+x") : false,
      family: meshFamily(pack.assets, entry),
    });
  }
  return out.length > 0 ? out : null;
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

/** Two bounds agree to a centimetre. */
const CM = 0.01;

/**
 * The mesh family of `entry` among its pack's `entries` (ticket 042 A): models whose bounds agree to 1 cm and whose triangle counts are
 * equal are one mesh under several names (recoloured or resigned copies, e.g. Building_Shop_03/04/05). Returns the family's name: the
 * smallest name (plain string order) of those that match `entry`, so every member gets the same one. A model with no twin is its own family.
 */
export function meshFamily(entries: readonly AssetEntry[], entry: AssetEntry): string {
  let best = entry.name;
  for (const o of entries) {
    if (o.triangles !== entry.triangles) continue;
    let same = true;
    for (let i = 0; i < 3 && same; i++) {
      same = Math.abs(o.bounds.min[i]! - entry.bounds.min[i]!) <= CM + EPS && Math.abs(o.bounds.max[i]! - entry.bounds.max[i]!) <= CM + EPS;
    }
    if (same && o.name < best) best = o.name;
  }
  return best;
}

/**
 * The first lot type, in LOT_TYPE_NAMES order (small, house, large, tall), that holds the model once its front is turned to
 * the road: its frontage within the lot's frontage, its depth within the lot's depth, and its height under the cap.
 * Null when none does (the Cinema, the malls, office_stepped_mesh). A quarter-turn `front` ("+x", "-x") swaps width and depth.
 */
export function lotTypeOf(entry: AssetEntry, front: ModelFront = "+z"): LotType | null {
  const [w, h, d] = sizeOf(entry);
  const quarter = frontIsQuarter(front);
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

/**
 * Group the planned building models by the lot type each one fits, leaving out the names in `exclude` (ticket 048). Per type, the models of the
 * non-`fallback` rows (POLYGON) are used when, after exclusion, they make at least POLYGON_MIN_FAMILIES mesh families; otherwise the type takes its
 * `fallback` models (SIMPLE Town). The two never mix within a type. A type with no fallback model in the set keeps its POLYGON ones however few:
 * with nothing to fall back to, a few real buildings beat a placeholder. With no POLYGON model loaded (CI, a fresh checkout, a failed GLB) every
 * type has SIMPLE Town's names, exactly as before 048.
 *
 * Ticket 050 C puts City Pack stacks first for the types in STACK_LOT_TYPES: when `stacks` (what `offeredStacks` found standable, one entry per style) offers at least
 * POLYGON_MIN_FAMILIES styles on a type, that type's plan is those styles' `stackName`s and nothing else; otherwise the Town Pack / SIMPLE Town rule above applies. The three
 * never mix within a type. With no `stacks` (a fresh checkout, CI, no City Pack, a failed `city-pack.glb`) the plan is exactly what it was.
 */
export function buildingPlan(models: readonly PlannedModel[] | null, exclude: readonly CalibrationKey[] = BUILDING_EXCLUDE, stacks: readonly StackOffer[] = []): BuildingPlan {
  const polygon: Record<LotType, PlannedModel[]> = { small: [], house: [], large: [], tall: [] };
  const simple: Record<LotType, PlannedModel[]> = { small: [], house: [], large: [], tall: [] };
  for (const m of models ?? []) {
    if (exclude.includes(calibrationKey(m.pack, m.entry.name))) continue;
    const t = lotTypeOf(m.entry, m.front);
    if (t) (m.fallback ? simple : polygon)[t].push(m);
  }
  const out: Record<LotType, string[]> = { small: [], house: [], large: [], tall: [] };
  for (const t of LOT_TYPE_NAMES) {
    if (STACK_LOT_TYPES.includes(t)) {
      const offered = [...new Set(stacks.filter((s) => s.types.includes(t)).map((s) => s.style))];
      if (offered.length >= POLYGON_MIN_FAMILIES[t]) {
        out[t] = offered.map(stackName);
        continue;
      }
    }
    const families = new Set(polygon[t].map((m) => `${m.pack}:${m.family}`)).size;
    const use = polygon[t].length > 0 && (families >= POLYGON_MIN_FAMILIES[t] || simple[t].length === 0) ? polygon[t] : simple[t];
    out[t] = use.map((m) => m.entry.name);
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

/** What the picker needs to know about a model besides its name. */
export interface BuildingTraits {
  /** Models of one family are one mesh under several names; the picker spreads families, not names. */
  family: string;
  /** The side of its lot a corner shop's second frontage is on; false for an ordinary model. */
  corner: false | "+x" | "-x";
}

/**
 * The traits of each planned model, by name, and (ticket 050 C) of each stack style in `stacks`. A stack is never a "corner model" to the picker: it is built to
 * its lot (a corner column on each of the lot's corner sides, none on a mid-row lot), so it may stand anywhere and its corner rule holds by construction.
 */
export function traitsOf(models: readonly PlannedModel[] | null, stacks: readonly StackOffer[] = []): Map<string, BuildingTraits> {
  const out = new Map((models ?? []).map((m) => [m.entry.name, { family: m.family, corner: m.corner } as BuildingTraits] as const));
  for (const s of stacks) out.set(stackName(s.style), { family: stackFamily(s.style), corner: false });
  return out;
}

interface Family {
  id: string;
  names: string[];
}

/**
 * The model name each lot gets, parallel to `lots` (ticket 042 A). Null where the lot's type has no model, or only corner models and the lot is not a corner.
 * - A lot picks a family of its own type first, by `stableHash(lot.key)`, every family weighted equally (a model with three names is not three times as
 *   likely), then a variant inside it by a second hash. `traits` names each model's family; without it every name is its own family.
 * - Neighbours (within NEIGHBOUR_GAP) never share a family, and along one road side a family does not come back within STREET_REPEAT_GAP lots
 *   (fewer when the type has fewer families than that plus one). With four or more families in a type, no family takes more than FAMILY_SHARE_MAX of
 *   the type's lots. A pick that breaks a rule takes the next family in the list; if every family breaks one, the cap goes, then the street rule, then the neighbour rule.
 * - A corner model (`traits.corner`) is an add-on: it only goes on a lot whose `cornerSides` has the side its second frontage is on (a side meeting a cross road),
 *   and then takes the lot by the same least-used rule as any family. With no such lot on a map it does not appear. A lot whose type has only corner models and is not
 *   such a lot gets none (it keeps its placeholder).
 */
export function pickBuildings(lots: readonly Lot[], plan: BuildingPlan, traits?: ReadonlyMap<string, BuildingTraits>): (string | null)[] {
  const trait = (n: string): BuildingTraits => traits?.get(n) ?? { family: n, corner: false };
  const fams = {} as Record<LotType, Family[]>;
  const totals: Record<LotType, number> = { small: 0, house: 0, large: 0, tall: 0 };
  for (const t of LOT_TYPE_NAMES) {
    const list: Family[] = [];
    for (const n of plan[t]) {
      const id = trait(n).family;
      const f = list.find((x) => x.id === id);
      if (f) f.names.push(n);
      else list.push({ id, names: [n] });
    }
    fams[t] = list;
  }
  for (const l of lots) if (fams[l.type].length > 0) totals[l.type]++;

  // Neighbours: a cell of 8 puts every neighbour (centres within the two half diagonals plus the gap, 7.3 for two `large` lots) in the 3 x 3 cells round a lot.
  const CELL = 8;
  const cells = new Map<string, number[]>();
  const cellKey = (cx: number, cz: number): string => `${cx},${cz}`;
  lots.forEach((l, i) => {
    const k = cellKey(Math.floor(l.x / CELL), Math.floor(l.z / CELL));
    const b = cells.get(k);
    if (b) b.push(i);
    else cells.set(k, [i]);
  });
  const nearOf = (i: number): number[] => {
    const l = lots[i]!;
    const cx = Math.floor(l.x / CELL);
    const cz = Math.floor(l.z / CELL);
    const out: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const j of cells.get(cellKey(cx + dx, cz + dz)) ?? []) if (j !== i && lotGap(l, lots[j]!) <= NEIGHBOUR_GAP) out.push(j);
      }
    }
    return out;
  };

  // The lots of each road side in order, and where each lot stands in its list.
  const rows = new Map<string, number[]>();
  const rowAt: number[] = [];
  lots.forEach((l, i) => {
    const k = `${l.street}:${l.side}`;
    const r = rows.get(k);
    rowAt.push(r ? r.length : 0);
    if (r) r.push(i);
    else rows.set(k, [i]);
  });

  const picked: (string | null)[] = new Array<string | null>(lots.length).fill(null);
  const familyOf: (string | null)[] = new Array<string | null>(lots.length).fill(null);
  const used = new Map<string, number>();
  lots.forEach((l, i) => {
    const all = fams[l.type];
    if (all.length === 0) return;
    const near = nearOf(i);
    // An ordinary model goes anywhere. A corner model only where its open side is a side of the lot that meets a cross road (Lot.cornerSides),
    // which town.ts only records when that road lies toward that side, so its second frontage faces the cross street.
    const fits = (n: string): boolean => {
      const c = trait(n).corner;
      return c === false || l.cornerSides.some((s) => s.side === c);
    };
    const eligible = all.filter((f) => f.names.some(fits));
    if (eligible.length === 0) return;
    const gap = Math.min(STREET_REPEAT_GAP, all.length - 1);
    const row = rows.get(`${l.street}:${l.side}`)!;
    const recent = new Set<string | null>();
    for (let k = Math.max(0, rowAt[i]! - gap); k < rowAt[i]!; k++) recent.add(familyOf[row[k]!]!);
    const taken = new Set<string | null>(near.map((j) => familyOf[j]!));
    // A family's cap: its share of the type's lots, but never so low that the type's ordinary families cannot hold every lot between them.
    const ordinary = all.filter((f) => f.names.some((n) => trait(n).corner === false)).length;
    const capN = Math.max(Math.floor(FAMILY_SHARE_MAX * totals[l.type]), Math.ceil(totals[l.type] / Math.max(1, ordinary)));
    const capped = all.length >= 4;
    const rules: ((f: Family) => boolean)[] = [
      (f) => !taken.has(f.id) && !recent.has(f.id) && (!capped || (used.get(`${l.type}:${f.id}`) ?? 0) < capN),
      (f) => !taken.has(f.id) && (!capped || (used.get(`${l.type}:${f.id}`) ?? 0) < capN),
      (f) => !taken.has(f.id),
    ];
    // The families the rules allow (the first rule that allows any); no family is favoured for following one that is often barred.
    let allowed = eligible;
    for (const ok of rules) {
      const hit = eligible.filter(ok);
      if (hit.length > 0) {
        allowed = hit;
        break;
      }
    }
    // Of those, the ones used least so far on this map (so the families come out even), and the hash picks among them.
    const usedOf = (f: Family): number => used.get(`${l.type}:${f.id}`) ?? 0;
    const least = Math.min(...allowed.map(usedOf));
    allowed = allowed.filter((f) => usedOf(f) === least);
    const fam = allowed[pickIndex(stableHash(l.key), allowed.length)]!;
    const variants = fam.names.filter(fits);
    picked[i] = variants[pickIndex(stableHash(`${l.key}|v`), variants.length)]!;
    familyOf[i] = fam.id;
    used.set(`${l.type}:${fam.id}`, (used.get(`${l.type}:${fam.id}`) ?? 0) + 1);
  });
  return picked;
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
