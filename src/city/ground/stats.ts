/**
 * Stage 8: what the placement counted while it ran (ticket 070 I criterion 10: reported, not asserted). Never part of the layer, so no digest reads it.
 */

export type Counter = Record<string, number>;

export const inc = (c: Counter, key: string, n = 1): void => {
  c[key] = (c[key] ?? 0) + n;
};

export interface GroundStats {
  /** Every refused try on the pavements, by "<line>:<reason>" (a place tries several groups) and "bollard:<reason>". Reasons: caps, corners, pavement, pitch, treePitch, KO, AV, EL, DK, clash. */
  pavTries: Counter;
  /** Each candidate place on a line: "<line>:placed" or "<line>:refused:<the first group's reason>". */
  pavPlaces: Counter;
  /** Meters MT took out. */
  meterMT: number;
  /** The lane bins' places tried, placed, and refused by reason (notBuilt:<use>, mouth, notLane:<use>, KO, DK, AV, EL). */
  lane: { tries: number; placed: number; refused: Counter };
  /** Plaza and lot groups left out, by "<group>:<reason>" (AV, EL, clash, outside, eave). */
  plazaLost: Counter;
  lotLost: Counter;
  plazaGroups: Counter;
  lotGroups: Counter;
  plazas: number;
  lots: number;
  /** The lowest eave (3 x storeys) beside a lot, metres. */
  lotEaveMin: number;
  /** Greens: paths, paths with a bench, paths with no free cell beside the middle, green cells, hashed cells, and trees and benches by "court" or "park". */
  greens: { paths: number; pathsBenched: number; pathsNoFreeCell: number; greenCells: number; hashedCells: number; byPlace: Counter };
}

export function newStats(): GroundStats {
  return {
    pavTries: {},
    pavPlaces: {},
    meterMT: 0,
    lane: { tries: 0, placed: 0, refused: {} },
    plazaLost: {},
    lotLost: {},
    plazaGroups: {},
    lotGroups: {},
    plazas: 0,
    lots: 0,
    lotEaveMin: Infinity,
    greens: { paths: 0, pathsBenched: 0, pathsNoFreeCell: 0, greenCells: 0, hashedCells: 0, byPlace: {} },
  };
}
