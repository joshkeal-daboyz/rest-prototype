/**
 * Stage 13, section F1: the ruin's kit table (ticket 073 F1; X-5, X-8, X-11). The keys the growth may use, with their bounds (width, height, depth; metres; the converted GLBs', measured 22 Nov 2026), and the
 * City Pack awning and canopy bounds a vine hangs from. Every piece's pivot is its bounds' centre in x and z and its base at y; nothing is ever scaled. Pinned against the GLBs, the converter's textured lists and the
 * facades kit by `src/render3d/ruinpin.test.ts` (this folder cannot import a stage folder or `src/render3d/`).
 *
 * Apocalypse `Env_Overgrowth_*` first (it is what the store images show); the Nature pieces fill only what it does not. Left out, on purpose: `Plant_Bush_Leaves_03` (missing texture), `Plant_Grass_01` (zero bounds),
 * `Plant_PalmBush_01` (the palm is on the never-used list), `Env_Overgrowth_03` and `_10` (5.77 and 5.81 m deep: they fit no 5 m cell or roof deck), `Env_Overgrowth_Wall_*`, `Env_Sidewalk_Overgrown_*` (a later cut), the
 * damaged road pieces, logs, stumps, rubble and wrecks (F2's). Nothing here is emissive.
 */

import type { CalibrationKey, CityRuinPieceKind } from "../../core";
import type { BoundsOf, KitBounds } from "../pipeline/readable";

const apoc = (n: string): CalibrationKey => `apocalypse-ruin:SM_${n}`;
const nat = (n: string): CalibrationKey => `nature-pack:SM_${n}`;
const palm = (n: string): CalibrationKey => `palm-city-pack:SM_${n}`;
const city = (n: string): CalibrationKey => `city-pack:SM_${n}`;

export interface KitEntry {
  /** The kinds it may be added as. `Plant_Bush_01` is a clump and a roof piece. */
  readonly kinds: readonly CityRuinPieceKind[];
  readonly w: number;
  readonly h: number;
  readonly d: number;
  /** X-5: nothing is emissive. A typed `false`, so a lit piece cannot be added without editing the type. */
  readonly emissive: false;
}
const e = (kinds: readonly CityRuinPieceKind[], w: number, h: number, d: number): KitEntry => ({ kinds, w, h, d, emissive: false });

/** The pass's kit: every key it may add, with its kinds and bounds. */
export const KIT: Readonly<Record<CalibrationKey, KitEntry>> = {
  // patches: Apocalypse overgrowth that fits a 5 m cell, and (as roof pieces) a 4.4 m deck
  [apoc("Env_Overgrowth_01")]: e(["patch", "roof"], 2.631, 1.289, 3.769),
  [apoc("Env_Overgrowth_02")]: e(["patch", "roof"], 2.409, 1.477, 2.694),
  [apoc("Env_Overgrowth_04")]: e(["patch", "roof"], 2.402, 1.721, 4.315),
  [apoc("Env_Overgrowth_05")]: e(["patch", "roof"], 1.832, 1.024, 2.037),
  [apoc("Env_Overgrowth_06")]: e(["patch", "roof"], 0.838, 0.419, 1.233),
  [apoc("Env_Overgrowth_07")]: e(["patch", "roof"], 0.651, 0.419, 0.672),
  [apoc("Env_Overgrowth_08")]: e(["patch", "roof"], 2.122, 1.059, 1.79),
  [apoc("Env_Overgrowth_09")]: e(["patch", "roof"], 1.789, 1.081, 4.16),
  // the mound: the patch where no overgrowth fits (a departure, X-11; never on a crossing)
  [nat("Terrain_Ground_Mound_Small_02")]: e(["patch"], 5.094, 0.418, 4.979),
  // clumps: Apocalypse edge overgrowth first, then ferns and bushes
  [apoc("Env_Overgrowth_Edge_01")]: e(["clump"], 0.802, 1.466, 3.571),
  [apoc("Env_Overgrowth_Edge_02")]: e(["clump"], 0.825, 0.898, 2.203),
  [apoc("Env_Overgrowth_Edge_03")]: e(["clump"], 0.713, 0.534, 2.203),
  [apoc("Env_Overgrowth_Edge_04")]: e(["clump"], 0.879, 3.739, 0.935),
  [nat("Plant_Fern_01")]: e(["clump"], 1.294, 0.342, 1.398),
  [nat("Plant_Fern_02")]: e(["clump"], 1.15, 0.634, 1.053),
  [nat("Plant_Bush_01")]: e(["clump", "roof"], 1.615, 2.041, 1.415),
  [nat("Plant_Bush_02")]: e(["clump"], 2.092, 2.003, 1.789),
  // saplings
  [nat("Tree_Birch_01")]: e(["sapling"], 2.454, 4.547, 2.289),
  [nat("Tree_Birch_02")]: e(["sapling"], 2.498, 5.399, 2.789),
  [nat("Tree_Birch_03")]: e(["sapling"], 2.14, 5.399, 2.106),
  [nat("Tree_Birch_04")]: e(["sapling"], 2.522, 4.891, 2.461),
  [nat("Tree_Round_01")]: e(["sapling"], 2.922, 3.759, 2.242),
  [nat("Tree_Round_02")]: e(["sapling"], 3.86, 4.731, 2.456),
  [nat("Tree_Round_03")]: e(["sapling"], 1.777, 3.601, 1.683),
  [nat("Tree_Round_04")]: e(["sapling"], 2.329, 3.834, 1.814),
  [nat("Tree_Round_05")]: e(["sapling"], 3.804, 4.853, 2.646),
  // park trees: the giant's crown is 13.12 m across in plan (w 12.604, d 13.12), radius 6.56 m
  [nat("Tree_Generic_Giant_01")]: e(["park-tree"], 12.604, 11.192, 13.12),
  [nat("Tree_Large_01")]: e(["park-tree"], 9.298, 8.833, 5.422),
  // roof dead trees (only with `RUIN_ROOF_GROWTH`)
  [nat("Tree_Dead_01")]: e(["roof"], 1.246, 3.503, 1.423),
  [nat("Tree_Dead_02")]: e(["roof"], 1.189, 2.663, 1.07),
  // vines (Palm City): 01, 04 and 05 are flat sheets; 02, 03, 07 and 08 are deep drapes; 06 wraps a post
  [palm("Env_Vines_01")]: e(["vine"], 3.944, 4.217, 0.789),
  [palm("Env_Vines_02")]: e(["vine"], 4.454, 2.928, 2.833),
  [palm("Env_Vines_03")]: e(["vine"], 4.758, 5.303, 3.992),
  [palm("Env_Vines_04")]: e(["vine"], 3.744, 3.753, 0.703),
  [palm("Env_Vines_05")]: e(["vine"], 3.715, 3.483, 0.676),
  [palm("Env_Vines_06")]: e(["vine"], 0.638, 2.985, 0.624),
  [palm("Env_Vines_07")]: e(["vine"], 3.162, 2.888, 2.872),
  [palm("Env_Vines_08")]: e(["vine"], 2.083, 2.874, 2.062),
  // tree-vines (Nature): from a tree's branches only
  [nat("Tree_Vines_01")]: e(["tree-vine"], 1.56, 1.658, 0.057),
  [nat("Tree_Vines_02")]: e(["tree-vine"], 0.131, 3.047, 0.106),
  [nat("Tree_Vines_03")]: e(["tree-vine"], 0.188, 5.088, 0.342),
  [nat("Tree_Vines_04")]: e(["tree-vine"], 0.332, 4.666, 0.99),
};

const keysOf = (kind: CityRuinPieceKind): readonly CalibrationKey[] => (Object.keys(KIT) as CalibrationKey[]).filter((k) => KIT[k]!.kinds.includes(kind));
const named = (...names: readonly CalibrationKey[]): readonly CalibrationKey[] => names;

/** The overgrowth pieces, in table order: the patch's first choice. */
export const OVERGROWTH_KEYS: readonly CalibrationKey[] = keysOf("patch").filter((k) => k.startsWith("apocalypse-ruin:"));
export const MOUND_KEY: CalibrationKey = nat("Terrain_Ground_Mound_Small_02");
export const EDGE_KEYS: readonly CalibrationKey[] = (Object.keys(KIT) as CalibrationKey[]).filter((k) => /Env_Overgrowth_Edge_/.test(k));
export const FERN_BUSH_KEYS: readonly CalibrationKey[] = named(nat("Plant_Fern_01"), nat("Plant_Fern_02"), nat("Plant_Bush_01"), nat("Plant_Bush_02"));
export const SAPLING_KEYS: readonly CalibrationKey[] = keysOf("sapling");
export const GIANT_KEY: CalibrationKey = nat("Tree_Generic_Giant_01");
export const LARGE_KEY: CalibrationKey = nat("Tree_Large_01");
export const ROOF_BUSH_KEY: CalibrationKey = nat("Plant_Bush_01");
export const ROOF_DEAD_KEYS: readonly CalibrationKey[] = named(nat("Tree_Dead_01"), nat("Tree_Dead_02"));
export const VINE_KEYS: readonly CalibrationKey[] = keysOf("vine");
export const VINE_SHEETS: readonly CalibrationKey[] = named(palm("Env_Vines_01"), palm("Env_Vines_04"), palm("Env_Vines_05"));
export const VINE_DRAPES: readonly CalibrationKey[] = named(palm("Env_Vines_02"), palm("Env_Vines_03"), palm("Env_Vines_07"), palm("Env_Vines_08"));
export const VINE_POST_KEY: CalibrationKey = palm("Env_Vines_06");
export const VINE_DROP_KEY: CalibrationKey = palm("Env_Vines_08");
export const TREE_VINE_KEYS: readonly CalibrationKey[] = keysOf("tree-vine");

/** Every key of the kit. */
export const KIT_KEYS: ReadonlySet<CalibrationKey> = new Set(Object.keys(KIT) as CalibrationKey[]);

/**
 * The keys that are trees for T-1 (a canopy): only the ones F1 plants. C1's default (a `Tree` word in the key) would make `Tree_Vines_*` and `Tree_Dead_*` canopies, which they are not
 * (a dead tree is a snag; a vine is a strand).
 */
export const TREE_KEYS: ReadonlySet<CalibrationKey> = new Set([...SAPLING_KEYS, GIANT_KEY, LARGE_KEY]);
export const ruinIsTree = (k: CalibrationKey): boolean => TREE_KEYS.has(k);

/** The kit's bounds in the readable checks' shape (width x, depth z, height), unturned; undefined for a key that is not the pass's. */
export const ruinBounds: BoundsOf = (k: CalibrationKey): KitBounds | undefined => {
  const t = KIT[k];
  return t === undefined ? undefined : { x_m: t.w, z_m: t.d, h_m: t.h };
};

// ---- the City Pack awnings and door canopies a vine hangs over (the facades kit's bounds, copied; pinned equal by `ruinpin.test.ts`) ----
export interface HostBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}
const hb = (w: number, h: number, d: number): HostBounds => ({ w, h, d });

/** The shop awnings (`Shop_Cover_01` to `_04`; `_05` is the corner wrap, never a host) and the two door canopies. */
export const HOST_BOUNDS: Readonly<Record<CalibrationKey, HostBounds>> = {
  [city("Bld_Shop_Cover_01")]: hb(4.574, 0.297, 2.815),
  [city("Bld_Shop_Cover_02")]: hb(4.706, 1.202, 3.235),
  [city("Bld_Shop_Cover_03")]: hb(5.0, 1.758, 3.501),
  [city("Bld_Shop_Cover_04")]: hb(5.104, 0.663, 0.732),
  [city("Bld_Cover_01")]: hb(4.832, 1.075, 1.0),
  [city("Bld_Cover_02")]: hb(1.366, 0.974, 0.701),
};

// ---- the City Pack roof keys the roof growth keeps clear of (H3's table and H1c's novelty table, copied; pinned equal by `ruinpin.test.ts`) ----
export const CLEAN_ROOF_BOUNDS: Readonly<Record<CalibrationKey, HostBounds>> = {
  [city("Prop_Roof_Aircon_01")]: hb(0.948, 0.592, 0.467),
  [city("Prop_Roof_Aircon_02")]: hb(1.586, 1.073, 0.798),
  [city("Prop_Roof_Aircon_03")]: hb(1.546, 1.05, 1.0),
  [city("Prop_SatDish_01")]: hb(1.21, 1.344, 0.682),
  [city("Prop_Vents_Exhaust_01")]: hb(0.868, 1.63, 2.727),
  [city("Prop_Vents_Straight_01")]: hb(0.868, 0.803, 2.5),
  [city("Prop_Water_Tower_01")]: hb(2.42, 5.509, 2.419),
  [city("Bld_Roof_Access_01")]: hb(2.758, 2.744, 2.851),
  [city("Prop_Billboard_Roof_01")]: hb(4.428, 3.063, 1.611),
  ...Object.fromEntries(["01", "02", "03", "04", "05", "06", "07"].map((n) => [city(`Prop_Billboard_Sign_${n}`), hb(4.193, 2.028, 0.118)] as const)),
  [city("Prop_LargeSign_Beer_01")]: hb(2.005, 3.333, 2.019),
  [city("Prop_LargeSign_Bottle_01")]: hb(1.8, 5.818, 1.8),
  [city("Prop_LargeSign_BowlingBall_01")]: hb(3.019, 3.174, 3.174),
  [city("Prop_LargeSign_BowlingPin_01")]: hb(1.631, 5.156, 1.631),
  [city("Prop_LargeSign_Burger_01")]: hb(3.715, 2.178, 3.717),
  [city("Prop_LargeSign_Coffee_01")]: hb(2.194, 1.346, 1.625),
  [city("Prop_LargeSign_Donut_01")]: hb(3.818, 1.355, 3.818),
  [city("Prop_LargeSign_Guitar_01")]: hb(2.098, 6.378, 0.377),
  [city("Prop_LargeSign_Hotdog_01")]: hb(1.411, 1.143, 3.926),
  [city("Prop_LargeSign_Icecream_01")]: hb(1.93, 5.04, 1.93),
  [city("Prop_LargeSign_Lollypop_01")]: hb(3.365, 6.36, 0.512),
  [city("Prop_LargeSign_Milkshake_01")]: hb(2.238, 4.699, 1.721),
  [city("Prop_LargeSign_Noodles_01")]: hb(2.948, 3.601, 2.515),
  [city("Prop_LargeSign_Pizza_01")]: hb(3.368, 0.562, 2.957),
  [city("Prop_LargeSign_Popcorn_01")]: hb(1.737, 2.797, 1.737),
  [city("Prop_LargeSign_Soda_01")]: hb(1.915, 5.595, 1.915),
  [city("Prop_LargeSign_Taco_01")]: hb(1.215, 2.223, 3.701),
};

// ---- the stage 7 pieces the growth keeps clear of (the tech pass's `s7Boxes` reading; copies of the facades kits' bounds, pinned equal by `ruinpin.test.ts`) ----
/** H1b's dressing but glass (the awning covers, the ATM, the trade signs) and H2's wall keys (canopies, escapes, air-conditioner, window planters). The novelty signs are in `CLEAN_ROOF_BOUNDS`. */
export const FACADE_BOUNDS: Readonly<Record<CalibrationKey, HostBounds>> = {
  [city("Bld_Shop_Cover_01")]: hb(4.574, 0.297, 2.815),
  [city("Bld_Shop_Cover_02")]: hb(4.706, 1.202, 3.235),
  [city("Bld_Shop_Cover_03")]: hb(5.0, 1.758, 3.501),
  [city("Bld_Shop_Cover_04")]: hb(5.104, 0.663, 0.732),
  [city("Bld_Shop_Cover_05")]: hb(5.394, 0.682, 5.394),
  [city("Prop_ATM_01")]: hb(1.128, 1.537, 0.519),
  [city("Prop_Sign_Bar_01")]: hb(1.327, 0.673, 0.138),
  [city("Prop_Sign_Cafe_01")]: hb(1.347, 0.553, 0.11),
  [city("Prop_Sign_Chinese_Noodles_01")]: hb(0.853, 0.507, 0.179),
  [city("Prop_Sign_Pizza_01")]: hb(2.211, 0.704, 0.144),
  [city("Prop_Sign_Pub_01")]: hb(1.13, 0.547, 0.112),
  [city("Prop_Sign_Entrance_01")]: hb(1.0, 0.436, 0.063),
  [city("Prop_Sign_Barber_01")]: hb(0.316, 0.948, 0.474),
  [city("Prop_Sign_DeliPizza_01")]: hb(0.301, 1.551, 0.14),
  [city("Prop_Sign_Hotel_01")]: hb(1.267, 3.801, 0.3),
  [city("Bld_Cover_01")]: hb(4.832, 1.075, 1.0),
  [city("Bld_Cover_02")]: hb(1.366, 0.974, 0.701),
  [city("Bld_FireEscape_01")]: hb(3.251, 1.492, 1.644),
  [city("Bld_FireEscape_02")]: hb(3.251, 3.609, 1.644),
  [city("Bld_FireEscape_03")]: hb(4.252, 3.802, 1.76),
  [city("Prop_Aircon_01")]: hb(0.823, 0.995, 0.651),
  [city("Prop_PlanterWindow_01")]: hb(0.988, 0.743, 0.37),
  [city("Prop_PlanterWindow_02")]: hb(0.87, 0.743, 0.332),
};
/** The key a code-drawn escape's piece carries, and its footprint. */
export const CODE_ESCAPE_KEY: CalibrationKey = "code:escape";
export const CODE_ESCAPE_W_M = 3.25;
export const CODE_ESCAPE_D_M = 1.64;
