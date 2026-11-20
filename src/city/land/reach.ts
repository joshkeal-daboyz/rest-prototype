/**
 * What stage 1's split plan tells Land about a block, read from `CityPlanBlock.sides` and `CityPlanStreet.bands` alone (ticket 070 B3: Land reads no block rank and no street line).
 * S6 for lanes: a lane's mouth never lies in a junction-facing stretch of a side, widened by `BAY_JUNCTION_CLEAR`. The served park: a whole park only on a block with a parking band across one of its streets.
 */

import type { CityBlockSide, CityPlanStreet, CitySide } from "../../core";
import { BAY_JUNCTION_CLEAR } from "./constants";

export const SIDES: readonly CitySide[] = ["-x", "+x", "-z", "+z"];

/** The part of a block Land reads: its sides (the street along each, the blocks across it, the junction-facing stretches). */
export type SidedBlock = { readonly sides: { readonly [S in CitySide]: Pick<CityBlockSide, "street" | "across" | "junctions"> } };

/** The streets' bands, by street id. */
export type StreetBands = ReadonlyMap<string, Pick<CityPlanStreet, "bands">>;

export const bandsOf = (streets: readonly Pick<CityPlanStreet, "id" | "bands">[]): StreetBands => new Map(streets.map((s) => [s.id, s] as const));

/** Whether the street along a block's `side` has a parking band on the far side of the carriageway from the block (the row next to the across block's pavement); the same reading as stage 1's A4c criterion 1. */
export function farParking(street: Pick<CityPlanStreet, "bands">, side: CitySide): boolean {
  const n = street.bands.length;
  return street.bands[side === "+z" || side === "-x" ? n - 2 : 1] === "parking";
}

/** Served: at least one side has a block across it and a parking band on the far side of its street. */
export function isServed(b: SidedBlock, streets: StreetBands): boolean {
  return SIDES.some((s) => {
    const street = streets.get(b.sides[s].street);
    return b.sides[s].across.length > 0 && street !== undefined && farParking(street, s);
  });
}

/** Whether cell `c` along a side (i for a z side, j for an x side) lies in one of the side's junction-facing stretches, widened by `BAY_JUNCTION_CLEAR` either side. */
export const facesJunction = (side: SidedBlock["sides"][CitySide], c: number): boolean => side.junctions.some((f) => c >= f.span.lo - BAY_JUNCTION_CLEAR && c < f.span.hi + BAY_JUNCTION_CLEAR);
