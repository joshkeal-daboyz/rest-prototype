/**
 * Stage 1's checks, run on the layer: street width (grammar rule 10) and V1, V2 (block variety). V1 and V2 are ported from `blockVariety` and `evaluateVariety` in
 * `src/render3d/frontage.ts` with their thresholds unchanged (V3 and V4 are stage 2's). Pure.
 */

import type { CityCell, CityStreetsLayer } from "../../core";
import { BLOCK_CV_MIN, BLOCK_NONSQUARE_MIN, CARRIAGE_M } from "./constants";

export type StreetsCheckId = "width" | "V1" | "V2";

/** What each check allows: how many of its parts may fail. */
export const STREETS_CHECK: Readonly<Record<StreetsCheckId, number>> = { width: 0, V1: 0, V2: 0 };

export interface StreetsVerdict {
  readonly id: StreetsCheckId;
  readonly value: number;
  readonly pass: boolean;
}

/** Street width: the streets whose carriageway is not `CARRIAGE_M` across, or that are an avenue. */
export function streetWidthFailures(layer: Pick<CityStreetsLayer, "streets">): string[] {
  const out: string[] = [];
  for (const s of layer.streets) {
    if (s.profile !== "street") out.push(`${s.id} is an ${s.profile}`);
    const width = s.carriage.hi_m - s.carriage.lo_m;
    if (Math.abs(width - CARRIAGE_M) > 1e-9) out.push(`${s.id} carriageway is ${width} m, not ${CARRIAGE_M} m`);
  }
  return out;
}

export interface StreetsVariety {
  readonly blocks: number;
  /** The block sizes along x (one per column of blocks, in cells) and along z (one per row of blocks). */
  readonly widths: readonly number[];
  readonly depths: readonly number[];
  readonly cvX: number;
  readonly cvZ: number;
  /** Distinct footprints, and how many V1 asks for: ceil(blocks / 2). */
  readonly footprints: number;
  readonly footprintsNeeded: number;
  readonly square: number;
  readonly nonSquareShare: number;
}

const cvOf = (a: readonly number[]): number => {
  if (a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return m > 0 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m : 0;
};

/** The numbers behind V1 and V2, read from the blocks' cells alone (never from the code that drew the sizes). */
export function streetsVariety(layer: Pick<CityStreetsLayer, "blocks">): StreetsVariety {
  const widthAt = new Map<number, number>();
  const depthAt = new Map<number, number>();
  const shapes = new Set<string>();
  let square = 0;
  for (const b of layer.blocks) {
    const w = b.i1 - b.i0;
    const d = b.j1 - b.j0;
    widthAt.set(b.bi, w);
    depthAt.set(b.bj, d);
    shapes.add(`${Math.min(w, d)}x${Math.max(w, d)}`);
    if (w === d) square++;
  }
  const widths = [...widthAt].sort((p, q) => p[0] - q[0]).map(([, v]) => v);
  const depths = [...depthAt].sort((p, q) => p[0] - q[0]).map(([, v]) => v);
  const n = layer.blocks.length;
  return {
    blocks: n,
    widths,
    depths,
    cvX: cvOf(widths),
    cvZ: cvOf(depths),
    footprints: shapes.size,
    footprintsNeeded: Math.ceil(n / 2),
    square,
    nonSquareShare: n > 0 ? (n - square) / n : 0,
  };
}

/** V1 and V2 against `STREETS_CHECK`. A layer with no blocks fails both (value 1). */
export function evaluateStreetsVariety(m: StreetsVariety): StreetsVerdict[] {
  const cvLow = (axis: readonly number[], cv: number): number => (axis.length >= 2 && cv < BLOCK_CV_MIN - 1e-9 ? 1 : 0);
  const v1 = cvLow(m.widths, m.cvX) + cvLow(m.depths, m.cvZ) + (m.footprints < m.footprintsNeeded ? 1 : 0) + (m.blocks === 0 ? 1 : 0);
  const allowed = Math.floor(m.blocks * (1 - BLOCK_NONSQUARE_MIN) + 1e-9);
  const v2 = Math.max(0, m.square - allowed) + (m.blocks === 0 ? 1 : 0);
  return [
    { id: "V1", value: v1, pass: v1 <= STREETS_CHECK.V1 },
    { id: "V2", value: v2, pass: v2 <= STREETS_CHECK.V2 },
  ];
}

/** All of stage 1's checks on a layer: street width, V1, V2. */
export function evaluateStreets(layer: Pick<CityStreetsLayer, "streets" | "blocks">): StreetsVerdict[] {
  const width = streetWidthFailures(layer).length;
  return [{ id: "width", value: width, pass: width <= STREETS_CHECK.width }, ...evaluateStreetsVariety(streetsVariety(layer))];
}

/** The cells of a block, for a failure's `cells` (its first cell). */
export const blockCorner = (b: { i0: number; j0: number }): CityCell => ({ i: b.i0, j: b.j0 });
