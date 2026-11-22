/**
 * Stage 13: the ruin (ticket 073 section F1: the growth). Growth over the city's ground, walls and (behind a switch) roofs, from each district's soil as far as its `wild` says. An era stage (`CityEraStageDef`,
 * `pipeline/eras.ts`), registered in `ERA_STAGES` in `src/city/stages.ts`; a clean run never runs it (X-7).
 *
 * - It reads the plan before it through `resolveBefore(plan, "ruin")` (the clean city, the tech era's pieces and the hold-out's), and the districts through the history layer. F1 writes `adds` only: no change.
 * - The layer's steps (A4): "growth" (this section) and "remnants" (F2; empty until F2). Each step's part of the layer has a digest of its own (`stepPart`).
 * - It ends with `assertEraReadable` on the whole layer: a pass that cannot keep T-1 and T-2 throws `CityStageError` (X-4, R-2). T-1's check and C1's code are not touched; the placing keeps clear of them (`grow.ts`).
 * - A flat picture only (R-5). Nothing draws the pieces before J2 (F3 draws them).
 */

import {
  CITY_RUIN_PIECE_KINDS,
  CITY_RUIN_STEPS,
  type CityEraPicture,
  type CityEraPlan,
  type CityRuinLayer,
  type CityRuinPieceKind,
  type CityRuinStep,
  type CityRuinStepPart,
} from "../../core";
import { assertEraReadable, resolveBefore, type CityEraStageDef } from "../pipeline/eras";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import { circuitPoints, type CircuitPoints, type ReadableOptions } from "../pipeline/readable";
import type { StageRand } from "../pipeline/seeds";
import { RUIN_ROOF_DEAD_TREES, RUIN_ROOF_GROWTH, RUIN_TREES_UNDER_SPANS, RUIN_VINE_06 } from "./constants";
import { cellsOver, rectAt } from "./geom";
import { growRuin, type GrowResult, type UnderSpanSpot } from "./grow";
import { ruinBounds, ruinCrownBounds, ruinIsTree } from "./kit";
import { buildWorld } from "./world";

export interface RuinOptions {
  /** The circuit to keep clear of. Default: what `circuitPoints` reads of the plan (empty until K2). Fixtures place their own poles here. */
  readonly circuit?: CircuitPoints;
  /** The switches (constants.ts); a test passes its own, the registered stage uses the constants. */
  readonly roofGrowth?: boolean;
  readonly roofDeadTrees?: boolean;
  readonly treesUnderSpans?: boolean;
  readonly vine06?: boolean;
}

/** The layer, and what the pass counted on the way (reported, not asserted). */
export interface RuinBuild {
  readonly layer: CityRuinLayer;
  readonly stats: GrowResult["stats"];
  readonly underSpanSpots: readonly UnderSpanSpot[];
}

export function layerOf(adds: CityRuinLayer["adds"]): CityRuinLayer {
  return { stage: "ruin", adds, changes: [], steps: [{ step: "growth", adds: adds.length, changes: 0 }, { step: "remnants", adds: 0, changes: 0 }] };
}

/** The pass, with its counts. Throws `CityStageError` when T-1 or T-2 cannot hold (X-4). */
export function buildRuin(plan: CityEraPlan, rand: StageRand, options: RuinOptions = {}): RuinBuild {
  const history = plan.layers.history;
  if (history === undefined) throw new CityStageError("ruin: the plan has no history layer (stage 10); the ruin reads each district's `wild`");
  const before = resolveBefore(plan, "ruin");
  const circuit = options.circuit ?? circuitPoints(before);
  const world = buildWorld(before, history.districts);
  const readable: ReadableOptions = options.circuit === undefined ? { bounds: ruinBounds, isTree: ruinIsTree } : { bounds: ruinBounds, isTree: ruinIsTree, circuit: options.circuit };
  const g = growRuin(world, rand, {
    circuit,
    roofGrowth: options.roofGrowth ?? RUIN_ROOF_GROWTH,
    roofDeadTrees: options.roofDeadTrees ?? RUIN_ROOF_DEAD_TREES,
    treesUnderSpans: options.treesUnderSpans ?? RUIN_TREES_UNDER_SPANS,
    vine06: options.vine06 ?? RUIN_VINE_06,
  });
  const layer = layerOf(g.adds);
  assertEraReadable(plan, "ruin", layer, readable);
  return { layer, stats: g.stats, underSpanSpots: g.underSpanSpots };
}

/** One step's part of a ruin layer, cut out by the layer's step counts: the record a step's own digest is taken of (`digestOf`). Throws when the layer has no steps. */
export function stepPart(layer: CityRuinLayer, step: CityRuinStep): CityRuinStepPart {
  if (layer.steps === undefined) throw new Error("ruin: the layer carries no steps");
  let a = 0;
  let c = 0;
  for (const s of layer.steps) {
    if (s.step === step) return { stage: "ruin", step, adds: layer.adds.slice(a, a + s.adds), changes: layer.changes.slice(c, c + s.changes) };
    a += s.adds;
    c += s.changes;
  }
  throw new Error(`ruin: no step "${step}" in the layer`);
}

/** Every step's part, in `CITY_RUIN_STEPS` order. */
export const stepParts = (layer: CityRuinLayer): readonly CityRuinStepPart[] => CITY_RUIN_STEPS.map((s) => stepPart(layer, s));

// ---- the picture (R-5) ----

const NOTHING: LegendEntry = { name: "nothing", rgb: 0x2b2d31 };
const COLOUR: Readonly<Record<CityRuinPieceKind, number>> = {
  patch: 0x4f8f3a,
  clump: 0x8fc060,
  sapling: 0x2f6f4f,
  "park-tree": 0x1f9f6f,
  roof: 0xc0c040,
  vine: 0x60d0a0,
  "tree-vine": 0x30a080,
};

/**
 * The flat picture of the layer: one legend entry per kind (index k + 1 is `CITY_RUIN_PIECE_KINDS[k]`), each lattice cell the kind of a piece standing over it (later kinds over earlier), and one point a piece.
 * A kind is not drawn to scale: a cell a piece overlaps is marked whole.
 */
export function ruinPicture(plan: CityEraPlan, layer: CityRuinLayer): CityEraPicture {
  const streets = plan.plan.layers.streets;
  if (streets === undefined) throw new CityStageError("picture: the plan has no streets layer");
  const legend: LegendEntry[] = [NOTHING, ...CITY_RUIN_PIECE_KINDS.map((k) => ({ name: k, rgb: COLOUR[k] }))];
  const at = new Map<number, number>();
  CITY_RUIN_PIECE_KINDS.forEach((kind, n) => {
    for (const a of layer.adds) {
      if (a.kind !== kind) continue;
      for (const c of cellsOver(rectAt(a.placement.x_m, a.placement.z_m, a.size.x_m, a.size.z_m))) at.set(c.j * streets.w + c.i, n + 1);
    }
  });
  const points = layer.adds.map((a) => ({ x_m: a.placement.x_m, z_m: a.placement.z_m, legend: CITY_RUIN_PIECE_KINDS.indexOf(a.kind) + 1 }));
  return { ...makePicture("streets", streets.w, streets.h, legend, (i, j) => at.get(j * streets.w + i) ?? 0, points), stage: "ruin" };
}

/** The stage, as the era runner takes it. `options` lets a test place its own poles and set the switches; the registered `ruinStage` has none. */
export function makeRuinStage(options: RuinOptions = {}): CityEraStageDef<"ruin"> {
  return {
    name: "ruin",
    run: (plan, rand) => buildRuin(plan, rand, options).layer,
    picture: (plan) => {
      const layer = plan.layers.ruin;
      if (layer === undefined) throw new CityStageError("picture: the plan has no ruin layer");
      return ruinPicture(plan, layer);
    },
  };
}

export const ruinStage: CityEraStageDef<"ruin"> = makeRuinStage();

/**
 * The layer's adds with each tree read by its whole crown (the key's full bounds, turned) instead of its trunk: what `t1RuinTreeCovers` and the reports are fed, so a crown is reported by what it covers (F1b3). Every other add is as it is.
 */
export function crownSized(adds: CityRuinLayer["adds"]): CityRuinLayer["adds"] {
  return adds.map((a) => {
    if (!ruinIsTree(a.placement.key)) return a;
    const b = ruinCrownBounds(a.placement.key)!;
    const quarter = Math.round(a.placement.yaw_deg / 90) % 2 !== 0;
    return { ...a, size: { x_m: quarter ? b.z_m : b.x_m, z_m: quarter ? b.x_m : b.z_m, h_m: b.h_m } };
  });
}
