/**
 * Stage 12: the hold-out (ticket 073 section E2). Each held district's camps, water towers, farms, market stalls, containers, clutter, roof items and barricades, from the Sci-Fi Frontier pack. An era stage
 * (`CityEraStageDef`, `pipeline/eras.ts`), registered in `ERA_STAGES` in `src/city/stages.ts`; a clean run never runs it (X-7).
 *
 * - It reads the plan before it through `resolveBefore(plan, "holdout")` (the clean city, and the tech era's pieces once D1 merges), and the districts through the history layer. It adds pieces and lists `remove`s
 *   against earlier lists (X-2); it never edits a layer.
 * - The layer's steps (A3): "power" (E1's plant and lines; empty until E1), "settle" (camps to roof items), "barricade" (last of all, option C). Each step's part of the layer has a digest of its own (`stepPart`).
 * - It ends with `assertEraReadable` on the settle step and again on the whole layer: a pass that cannot keep T-1 and T-2 throws `CityStageError` (X-4, R-2).
 * - A flat picture only (R-5). Nothing draws the pieces before J2 (E3 draws them).
 */

import {
  CITY_HOLDOUT_PIECE_KINDS,
  CITY_HOLDOUT_STEPS,
  type CityChange,
  type CityEraPicture,
  type CityEraPlan,
  type CityHoldoutLayer,
  type CityHoldoutPieceKind,
  type CityHoldoutStep,
  type CityHoldoutStepCount,
  type CityHoldoutStepPart,
} from "../../core";
import { assertEraReadable, resolveBefore, type CityEraStageDef } from "../pipeline/eras";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import { circuitPoints, type CircuitPoints, type ReadableOptions } from "../pipeline/readable";
import type { StageRand } from "../pipeline/seeds";
import { placeBarricades, type BarricadeStats } from "./barricade";
import { cellsOver, rectAt } from "./geom";
import { holdoutBounds } from "./kit";
import { settle, type SettleStats } from "./settle";
import { buildWorld } from "./world";

export interface HoldoutOptions {
  /** The circuit to keep clear of. Default: what `circuitPoints` reads of the plan (empty until K2). Fixtures place their own poles here. */
  readonly circuit?: CircuitPoints;
}

/** The layer, and what the pass counted on the way (reported, not asserted). */
export interface HoldoutBuild {
  readonly layer: CityHoldoutLayer;
  readonly settle: SettleStats;
  readonly barricade: BarricadeStats;
}

function layerOf(adds: CityHoldoutLayer["adds"], changes: readonly CityChange[], settled: { adds: number; changes: number }): CityHoldoutLayer {
  const steps: CityHoldoutStepCount[] = [
    { step: "power", adds: 0, changes: 0 },
    { step: "settle", adds: settled.adds, changes: settled.changes },
    { step: "barricade", adds: adds.length - settled.adds, changes: changes.length - settled.changes },
  ];
  return { stage: "holdout", adds, changes, steps };
}

/** The pass, with its counts. Throws `CityStageError` when T-1 or T-2 cannot hold (X-4). */
export function buildHoldout(plan: CityEraPlan, rand: StageRand, options: HoldoutOptions = {}): HoldoutBuild {
  const history = plan.layers.history;
  if (history === undefined) throw new CityStageError("holdout: the plan has no history layer (stage 10); the hold-out reads each district's `held`");
  const before = resolveBefore(plan, "holdout");
  const circuit = options.circuit ?? circuitPoints(before);
  const world = buildWorld(before, plan.plan, history.districts, circuit);
  const readable: ReadableOptions = options.circuit === undefined ? { bounds: holdoutBounds } : { bounds: holdoutBounds, circuit: options.circuit };

  // settle: camps, water towers, farms, stalls, containers, clutter, roof items
  const s = settle(world, rand);
  const settleLayer = layerOf(s.adds, s.changes, { adds: s.adds.length, changes: s.changes.length });
  const afterSettle = assertEraReadable(plan, "holdout", settleLayer, readable);

  // barricade: last of all, each placed only where T-1 and T-2 still hold
  const b = placeBarricades(world, rand, afterSettle, readable);
  const adds = [...s.adds, ...b.adds];
  const changes = [...s.changes, ...b.changes];
  const layer = layerOf(adds, changes, { adds: s.adds.length, changes: s.changes.length });
  assertEraReadable(plan, "holdout", layer, readable);
  return { layer, settle: s.stats, barricade: b.stats };
}

/** One step's part of a hold-out layer, cut out by the layer's step counts: the record a step's own digest is taken of (`digestOf`). Throws when the layer has no steps. */
export function stepPart(layer: CityHoldoutLayer, step: CityHoldoutStep): CityHoldoutStepPart {
  if (layer.steps === undefined) throw new Error("holdout: the layer carries no steps");
  let a = 0;
  let c = 0;
  for (const s of layer.steps) {
    if (s.step === step) return { stage: "holdout", step, adds: layer.adds.slice(a, a + s.adds), changes: layer.changes.slice(c, c + s.changes) };
    a += s.adds;
    c += s.changes;
  }
  throw new Error(`holdout: no step "${step}" in the layer`);
}

/** Every step's part, in `CITY_HOLDOUT_STEPS` order. */
export const stepParts = (layer: CityHoldoutLayer): readonly CityHoldoutStepPart[] => CITY_HOLDOUT_STEPS.map((s) => stepPart(layer, s));

// ---- the picture (R-5) ----

const NOTHING: LegendEntry = { name: "nothing", rgb: 0x2b2d31 };
const COLOUR: Readonly<Record<CityHoldoutPieceKind, number>> = {
  camp: 0xd0a040,
  "water-tower": 0x4a78d0,
  farm: 0x60b060,
  irrigator: 0x40d0a0,
  stall: 0xd05080,
  container: 0xa070d0,
  clutter: 0xb0b0b0,
  roof: 0xe0e060,
  barricade: 0xd06030,
};

/**
 * The flat picture of the layer: one legend entry per kind (index k + 1 is `CITY_HOLDOUT_PIECE_KINDS[k]`), each lattice cell the kind of a piece standing over it (later kinds over earlier), and one point a piece.
 * A kind is not drawn to scale: a cell a piece overlaps is marked whole.
 */
export function holdoutPicture(plan: CityEraPlan, layer: CityHoldoutLayer): CityEraPicture {
  const streets = plan.plan.layers.streets;
  if (streets === undefined) throw new CityStageError("picture: the plan has no streets layer");
  const legend: LegendEntry[] = [NOTHING, ...CITY_HOLDOUT_PIECE_KINDS.map((k) => ({ name: k, rgb: COLOUR[k] }))];
  const at = new Map<number, number>();
  for (const kind of CITY_HOLDOUT_PIECE_KINDS) {
    const index = CITY_HOLDOUT_PIECE_KINDS.indexOf(kind) + 1;
    for (const a of layer.adds) {
      if (a.kind !== kind) continue;
      for (const c of cellsOver(rectAt(a.placement.x_m, a.placement.z_m, a.size.x_m, a.size.z_m))) at.set(c.j * streets.w + c.i, index);
    }
  }
  const points = layer.adds.map((a) => ({ x_m: a.placement.x_m, z_m: a.placement.z_m, legend: CITY_HOLDOUT_PIECE_KINDS.indexOf(a.kind) + 1 }));
  return { ...makePicture("streets", streets.w, streets.h, legend, (i, j) => at.get(j * streets.w + i) ?? 0, points), stage: "holdout" };
}

/** The stage, as the era runner takes it. `options` lets a test place its own poles; the registered `holdoutStage` has none. */
export function makeHoldoutStage(options: HoldoutOptions = {}): CityEraStageDef<"holdout"> {
  return {
    name: "holdout",
    run: (plan, rand) => buildHoldout(plan, rand, options).layer,
    picture: (plan) => {
      const layer = plan.layers.holdout;
      if (layer === undefined) throw new CityStageError("picture: the plan has no holdout layer");
      return holdoutPicture(plan, layer);
    },
  };
}

export const holdoutStage: CityEraStageDef<"holdout"> = makeHoldoutStage();
