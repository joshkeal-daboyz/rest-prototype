/**
 * Stage 11: the tech kit (ticket 073 D1; X-5 dark and textured, X-8 typed and pinned, X-11 as the pack shows it). Sci-Fi City pieces, each with its bounds (width, height, depth; metres; the converted manifest),
 * its slot, its front and its two flags. A piece's pivot is its bounds' centre in x and z with its base at y (the converter centres every pivot). `src/render3d/techpin.test.ts` pins every number, the fronts
 * (read from the GLB's face directions) and the flags against `sci-fi-city-pack.glb` and its manifest.
 *
 * - **Front.** Every kit piece's back plane is its own -z (its largest z-plane faces -z) and its front +z, so a piece turned by `SIDE_YAW[side]` has its back on a wall that faces `side` (or its front to a street).
 * - **Not in the kit** (the pre-check's "Not usable" and the kit check): `Sign_Ad_*` and `Sign_Neon_*` (untextured), `Sign_Billboard_Border_*` and `_Tall_*` (empty frames), `Sign_Billboard_Large_*`, `Prop_VendingMachine_Soda_01`,
 *   `Bld_Advanced_Doorway_01`.
 * - **`Prop_Pipes_01`** (the tall slot, "vertical only") leaves the kit: it is 2.5 m long on its own x, and a vertical run needs a roll about its own z, which a `CityPlacement` (a turn about y only) cannot give.
 *   It is typed here and pinned, with `placed: false`, so the stage never places it.
 * - **`Prop_Overhang_01/02`** (the canopy, "a whole free storey face") are typed and pinned; the density rule (DT) gives them no chance, so the stage places none (reported).
 */

import type { CalibrationKey, CityTechPieceKind } from "../../core";

export type TechSlot = "bolt-on" | "camera" | "tall" | "overhang" | "sign" | "shopfront" | "wall-line" | "kerb-line";

export interface TechBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}

export interface TechKey extends TechBounds {
  readonly key: CalibrationKey;
  readonly slot: TechSlot;
  /** The side of the piece that faces out from the wall or toward the street, in the piece's own axes. */
  readonly front: "+z";
  /** On the converter's textured list (X-5). */
  readonly textured: true;
  /** No material of the key is emissive or lit (X-5). */
  readonly emissive: false;
  /** False for a key the stage never places (see the file's head). */
  readonly placed: boolean;
}

const k = (name: string): CalibrationKey => `sci-fi-city-pack:${name}`;
const t = (name: string, slot: TechSlot, w: number, h: number, d: number, placed = true): TechKey => ({ key: k(name), slot, w, h, d, front: "+z", textured: true, emissive: false, placed });

/** The kit, in slot order. */
export const TECH_KIT: readonly TechKey[] = [
  t("SM_Prop_WallAttach_Electronics_02", "bolt-on", 0.817, 0.739, 0.505),
  t("SM_Prop_WallAttach_Electronics_03", "bolt-on", 0.592, 0.703, 0.344),
  t("SM_Prop_WallAttach_Electronics_04", "bolt-on", 0.818, 0.921, 0.34),
  t("SM_Prop_WallAttach_Electronics_06", "bolt-on", 0.419, 1.167, 0.26),
  t("SM_Prop_AirConditioningUnit_01", "bolt-on", 0.939, 0.697, 0.642),
  t("SM_Prop_AirConditioningUnit_02", "bolt-on", 0.927, 0.616, 0.642),
  t("SM_Prop_Pipes_03", "bolt-on", 0.545, 0.633, 0.436),
  t("SM_Prop_Security_Camera_01", "camera", 0.362, 1.161, 1.144),
  t("SM_Prop_Security_Camera_02", "camera", 0.363, 1.068, 1.08),
  t("SM_Prop_WallAttach_Electronics_01", "tall", 1.028, 1.879, 0.45),
  t("SM_Prop_WallAttach_Electronics_05", "tall", 1.361, 2.752, 0.422),
  t("SM_Prop_WallAttach_Vent_01", "tall", 0.777, 2.215, 0.529),
  t("SM_Prop_WallAttach_Vent_02", "tall", 0.884, 2.999, 0.529),
  t("SM_Prop_WallAttach_Vent_03", "tall", 0.777, 2.998, 0.529),
  t("SM_Prop_WallAttach_Vent_04", "tall", 0.822, 2.8, 0.304),
  t("SM_Prop_Pipes_01", "tall", 2.5, 0.239, 0.497, false),
  t("SM_Prop_Overhang_01", "overhang", 3.503, 1.332, 1.442, false),
  t("SM_Prop_Overhang_02", "overhang", 4.815, 0.888, 0.525, false),
  t("SM_Sign_01", "sign", 1.604, 0.458, 0.048),
  t("SM_Sign_02", "sign", 1.604, 0.286, 0.048),
  t("SM_Sign_03", "sign", 1.604, 0.358, 0.048),
  t("SM_Sign_04", "sign", 1.604, 0.434, 0.048),
  t("SM_Sign_05", "sign", 1.604, 0.377, 0.048),
  t("SM_Sign_06", "sign", 1.604, 0.27, 0.048),
  t("SM_Sign_07", "sign", 1.604, 0.418, 0.048),
  t("SM_Sign_08", "sign", 1.604, 0.297, 0.048),
  t("SM_Sign_09", "sign", 1.604, 0.242, 0.048),
  t("SM_Sign_011", "sign", 1.604, 0.458, 0.048),
  t("SM_Bld_Advanced_01", "shopfront", 5, 3, 0.709),
  t("SM_Bld_Advanced_02", "shopfront", 10, 3, 0.709),
  t("SM_Prop_VendingMachine_01", "wall-line", 0.757, 1.619, 0.64),
  t("SM_Prop_Atm_01", "wall-line", 0.897, 2.266, 1.185),
  t("SM_Prop_Advertisement_Pillar_01", "kerb-line", 1.501, 2.569, 1.501),
  t("SM_Prop_ChargingStation_01", "kerb-line", 0.47, 2.266, 1.212),
];

export const TECH_BOUNDS: Readonly<Record<CalibrationKey, TechBounds>> = Object.fromEntries(TECH_KIT.map((e) => [e.key, { w: e.w, h: e.h, d: e.d }] as const));

/** The keys a stage may place in a slot, in table order (a key with `placed: false` never). */
export const keysOf = (slot: TechSlot): readonly CalibrationKey[] => TECH_KIT.filter((e) => e.slot === slot && e.placed).map((e) => e.key);

export const BOLT_ONS: readonly CalibrationKey[] = keysOf("bolt-on");
export const CAMERAS: readonly CalibrationKey[] = keysOf("camera");
export const TALLS: readonly CalibrationKey[] = keysOf("tall");
export const SIGNS: readonly CalibrationKey[] = keysOf("sign");
export const WALL_LINE: readonly CalibrationKey[] = keysOf("wall-line");
export const KERB_LINE: readonly CalibrationKey[] = keysOf("kerb-line");
export const SHOP_SINGLE: CalibrationKey = k("SM_Bld_Advanced_01");
export const SHOP_DOUBLE: CalibrationKey = k("SM_Bld_Advanced_02");

/** The bounds of a kit key; throws on a key that is not in the table. */
export function boundsOf(key: CalibrationKey): TechBounds {
  const e = TECH_BOUNDS[key];
  if (!e) throw new Error(`${key} is not in the tech kit`);
  return e;
}

/** The era add kind of each slot. */
export const KIND_OF_SLOT: Readonly<Record<TechSlot, CityTechPieceKind>> = {
  "bolt-on": "bolt-on",
  camera: "camera",
  tall: "tall",
  overhang: "overhang",
  sign: "sign",
  shopfront: "shopfront",
  "wall-line": "pavement",
  "kerb-line": "pavement",
};

/** What C1's readability checks need of a kit key: its bounds unturned (x the width, z the depth), or undefined for a key that is not ours. */
export const techBoundsOf = (key: CalibrationKey): { readonly x_m: number; readonly z_m: number; readonly h_m: number } | undefined => {
  const e = TECH_BOUNDS[key];
  return e ? { x_m: e.w, z_m: e.d, h_m: e.h } : undefined;
};

/** No Sci-Fi City key is a tree (C1's default reads a `Tree` word in the name). */
export const techIsTree = (_key: CalibrationKey): boolean => false;
