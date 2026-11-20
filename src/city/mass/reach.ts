/**
 * S6 for stage 3 (ticket 070 C3): no drive or frontage lot opens onto a junction. Read from `CityPlanBlock.sides` alone: a side's `junctions` are the stretches of it that face a junction (stage 1's S6 record),
 * widened here by `BAY_JUNCTION_CLEAR` cells either side. Mass reads no block rank and no street line.
 */

import type { CityBlockSide, CityCell, CitySide } from "../../core";
import { BAY_JUNCTION_CLEAR } from "./constants";

/** The part of a block this stage reads for S6 and for the neighbours across a street. */
export type SidedBlock = { readonly sides: { readonly [S in CitySide]: Pick<CityBlockSide, "across" | "junctions"> } };

/** The coordinate of a cell along a side: i for a "-z" or "+z" side, j for a "-x" or "+x" side. */
export const alongOf = (side: CitySide, c: CityCell): number => (side === "-z" || side === "+z" ? c.i : c.j);

/** Whether cell `c` along a side lies in one of the side's junction-facing stretches, widened by `BAY_JUNCTION_CLEAR` either side. */
export const facesJunction = (side: SidedBlock["sides"][CitySide], c: number): boolean => side.junctions.some((f) => c >= f.span.lo - BAY_JUNCTION_CLEAR && c < f.span.hi + BAY_JUNCTION_CLEAR);

/** Whether a mouth cell on `side` of block `b` lies in a widened junction-facing stretch. */
export const mouthFacesJunction = (b: SidedBlock, side: CitySide, c: CityCell): boolean => facesJunction(b.sides[side], alongOf(side, c));
