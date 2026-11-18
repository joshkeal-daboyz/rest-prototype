/**
 * Placeholder buildings for the 3D town (ticket 041 B), as pure data: what stands on a lot when there is no model for it
 * (no assets/private/, or a lot type with no usable model). A body with storeys, a roof and one of four dark tints, so a
 * town built from boxes still reads as buildings. No three, no DOM. Nothing here is lit: only places warm.
 */

import { stableHash } from "../render/city";
import { WORLD_PER_METRE, pickDistinct } from "./models";
import { STOREY_M, type Lot, type LotType } from "./town";

/** The body's footprint, as a fraction of the lot, in each direction (chosen by hash). A terrace lot's body fills its lot (fraction 1). */
export const FOOTPRINT_FACTORS = [0.8, 0.9] as const;
/** Storeys by lot type, lowest and highest. */
export const STOREYS: Readonly<Record<LotType, readonly [number, number]>> = {
  small: [1, 3],
  house: [2, 4],
  large: [1, 2],
  tall: [5, 8],
};
/** A flat roof's parapet cap, and a pitched roof's rise, in metres. */
export const CAP_M = 0.3;
export const PITCH_M = 1.8;
/** The four wall tints: dark, so the town stays dark, and apart enough to tell neighbours by. */
export const TINTS: readonly number[] = [0x4a566e, 0x5a5472, 0x4a6478, 0x686678];
/** The roof's colour, as a fraction of the wall's. */
export const ROOF_SHADE = 0.6;

export type RoofKind = "flat" | "pitched";

export interface PlaceholderSpec {
  /** The variant number: tint and storeys packed (see `variantCount`). Neighbours never share one. */
  variant: number;
  storeys: number;
  /** The body's footprint: across the frontage and away from the road, world units. It lies inside the lot, centred on it. */
  w: number;
  d: number;
  /** The body's height: storeys x STOREY_M x WORLD_PER_METRE. */
  bodyH: number;
  roof: RoofKind;
  /** The roof's height above the body: a parapet cap, or a pitched ridge's rise. Body plus roof never passes the lot's cap. */
  roofH: number;
  /** An index into TINTS. */
  tint: number;
}

/** How many variants a lot type has: 4 tints x its storeys. The footprint factors come from the lot's own hash and are not part of the variant. */
export function variantCount(type: LotType): number {
  const [lo, hi] = STOREYS[type];
  return 4 * (hi - lo + 1);
}

/** The placeholder for `lot`. `variant` defaults to the lot key's hash; any number is taken modulo the type's variant count. */
export function placeholderBuilding(lot: Lot, variant: number = stableHash(lot.key)): PlaceholderSpec {
  const n = variantCount(lot.type);
  const v = ((variant % n) + n) % n;
  const tint = v % 4;
  const h = stableHash(lot.key + "#fp");
  // A terrace lot (051 B) is walled to its neighbours: its body fills the whole lot, so the boxes of a run abut.
  const fw = lot.terrace ? 1 : FOOTPRINT_FACTORS[h & 1]!;
  const fd = lot.terrace ? 1 : FOOTPRINT_FACTORS[(h >> 1) & 1]!;
  const [lo] = STOREYS[lot.type];
  const storeys = lo + Math.floor(v / 4);
  const bodyH = storeys * STOREY_M * WORLD_PER_METRE;
  const roof: RoofKind = lot.type === "house" ? "pitched" : "flat";
  const wanted = (roof === "pitched" ? PITCH_M : CAP_M) * WORLD_PER_METRE;
  // The roof never lifts the building over its cap (the occlusion rule in town.ts is worked out for the cap).
  const roofH = Math.max(0, Math.min(wanted, lot.hMax - bodyH));
  return { variant: v, storeys, w: lot.w * fw, d: lot.d * fd, bodyH, roof, roofH, tint };
}

/** One placeholder per lot, parallel to `lots`, no two neighbours (NEIGHBOUR_GAP) alike. */
export function pickPlaceholders(lots: readonly Lot[]): PlaceholderSpec[] {
  const idx = pickDistinct(lots, variantCount);
  return lots.map((l, i) => placeholderBuilding(l, idx[i]!));
}
