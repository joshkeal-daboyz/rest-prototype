/**
 * The city's eras (ticket 073, section A): the history layer, the three passes' layers, piece references, changes, and the resolver's contract.
 * Types only, plus the era and stage lists (data, as `CITY_STAGES` is). No logic: the resolver and the era runner are the planner's, in `src/city/pipeline/` (C1).
 *
 * Typed in a file of its own, apart from `cityplan.ts`, under the goal (21 Nov 2026 night; Josh may reverse): the clean plan's types, `CITY_STAGES` and `CityLayers` do not change, so
 * no clean digest, check or test moves (X-1, X-7), and nothing here conflicts with K's typing of `CityCircuitLayer` in `cityplan.ts`.
 * - **The era stages** are their own list, `CITY_ERA_STAGES`, not part of `CITY_STAGES`. They run after "traffic" and before the drawing ("assemble"), and only in an era run (X-7).
 * - **The era layers** are held in `CityEraPlan`, beside the clean `CityPlan`, not in `CityLayers`. A clean run never builds one.
 * - **The circuit is not referenced yet.** Poles, spans, drops and street lights (K's ids), the era-added circuit pieces (the hold-out's makeshift poles and spans, the tech roof net) and the
 *   plant place `{ plant: <id> }` are section A2's, typed once K's `CityCircuitLayer` has merged. Until then a `{ id }` reference names an era add only.
 */

import type { CalibrationKey } from "./calibration";
import type {
  CityBuildoutTree,
  CityCell,
  CityDigest,
  CityDressingPiece,
  CityGroundCell,
  CityGroundPiece,
  CityGroundProp,
  CityNoveltySign,
  CityPicture,
  CityPiece,
  CityPlacement,
  CityPlan,
  CityPlanStage,
  CityRoofPiece,
  CityStageFailure,
  CityTrafficPiece,
  CityWallPiece,
} from "./cityplan";

// ---- the eras and their stages ----

/** The four eras, in order. "clean" is the plan through "traffic", exactly as `runCity` gives it today. */
export const CITY_ERAS = ["clean", "tech", "holdout", "ruin"] as const;
export type CityEra = (typeof CITY_ERAS)[number];

/** Stages 10 to 13, in the order they run: after "traffic", before "assemble", and only in an era run. Not in `CITY_STAGES` (see the file's head). */
export const CITY_ERA_STAGES = ["history", "tech", "holdout", "ruin"] as const;
export type CityEraStage = (typeof CITY_ERA_STAGES)[number];

/** The stages that pass: the three that write adds and changes. */
export type CityPassStage = Exclude<CityEraStage, "history">;

/** Any stage that writes a layer, clean or era. */
export type CityLayerStage = CityPlanStage | CityEraStage;

/** The last stage each era runs. An era above "clean" runs every clean stage, then "history", then the passes up to and including its own. */
export const CITY_ERA_LAST: Readonly<Record<CityEra, CityLayerStage>> = { clean: "traffic", tech: "tech", holdout: "holdout", ruin: "ruin" };

// ---- stage 10: history ----

/**
 * One district: 1 to 4 blocks that touch across a street (`CityPlanBlock.sides[*].across`; K1's CK14), and its story.
 * Every block of `streets.blocks` is in exactly one district. The story's rule is the one Josh answers on the B pre-check (or the one taken under the goal); each value is in 0 to 1.
 */
export interface CityDistrict {
  /** "district:<block id>", the id of its first block in `streets.blocks` order. */
  readonly id: string;
  /** Its block ids, in `streets.blocks` order. */
  readonly blocks: readonly string[];
  /** How far the technology era reached it. */
  readonly tech: number;
  /** How long it held out. */
  readonly held: number;
  /** How far nature has taken it. */
  readonly wild: number;
}

/** Stage 10: the districts and their stories. Districts in the order of their first block in `streets.blocks`. */
export interface CityHistoryLayer {
  readonly stage: "history";
  readonly districts: readonly CityDistrict[];
}

// ---- piece references ----
//
// The cheapest reference (the ticket's "Check (a)"): by id where a piece has one, else by list and index, with the key as a guard. Earlier layers are frozen and the same on every run of a seed,
// and the changes are made in the same run, so an index is stable for as long as the change exists; the guard catches a reference that has slid onto another piece. No clean type gains a field.

/** The flat lists of earlier layers a pass may change, by "<layer>.<field>". Data, so C1's fixtures can walk every list. */
export const CITY_PIECE_LISTS = [
  "edge.ground",
  "edge.buildoutTrees",
  "buildings.pieces",
  "facades.ground",
  "facades.dressing",
  "facades.walls",
  "facades.roofs",
  "facades.novelty",
  "ground.props",
  "traffic.pieces",
] as const;
export type CityPieceList = (typeof CITY_PIECE_LISTS)[number];

/** The lists whose records carry no key (a cell record): a reference to one guards with `key: null`, and a "swap" on one fails. */
export const CITY_KEYLESS_PIECE_LISTS = ["edge.ground", "edge.buildoutTrees"] as const satisfies readonly CityPieceList[];

/** What one entry of each list is. "buildings.pieces" is a column's `pieces` (the column by its index in `buildings.columns`). */
export interface CityPieceListItem {
  readonly "edge.ground": CityGroundCell;
  readonly "edge.buildoutTrees": CityBuildoutTree;
  readonly "buildings.pieces": CityPiece;
  readonly "facades.ground": CityGroundPiece;
  readonly "facades.dressing": CityDressingPiece;
  readonly "facades.walls": CityWallPiece;
  readonly "facades.roofs": CityRoofPiece;
  readonly "facades.novelty": CityNoveltySign;
  readonly "ground.props": CityGroundProp;
  readonly "traffic.pieces": CityTrafficPiece;
}

/**
 * A reference to one piece of an earlier layer or an earlier era's adds.
 * - `{ id }`: a piece with its own id. In A, an era add (`CityEraPiece.id`) only; A2 adds K's circuit ids.
 * - `{ list, index, key }`: the piece at `index` of that list as its stage wrote it (before any change), guarded by its `placement.key`, or null on a keyless list.
 * - `{ list: "buildings.pieces", column, index, key }`: piece `index` of column `column` (its index in `buildings.columns`), guarded by its key.
 */
export type CityPieceRef =
  | { readonly id: string }
  | { readonly list: Exclude<CityPieceList, "buildings.pieces">; readonly index: number; readonly key: CalibrationKey | null }
  | { readonly list: "buildings.pieces"; readonly column: number; readonly index: number; readonly key: CalibrationKey };

// ---- states and changes ----

/** What a change may say has happened to a piece. Which states a pass may use, and on what, is each pass's cut. A2 places "toppled" and "cut" on the circuit. */
export type CityPieceState = "dark" | "boarded" | "broken" | "toppled" | "cut";
export const CITY_PIECE_STATES: readonly CityPieceState[] = ["dark", "boarded", "broken", "toppled", "cut"];

/** One change to an earlier piece (X-2: the only way an era alters what came before). */
export type CityChange =
  | { readonly ref: CityPieceRef; readonly op: "remove" }
  /** Same placement, another key. */
  | { readonly ref: CityPieceRef; readonly op: "swap"; readonly key: CalibrationKey }
  | { readonly ref: CityPieceRef; readonly op: "state"; readonly state: CityPieceState };

// ---- stages 11 to 13: the passes ----

/** One piece a pass adds. Its kinds are its pass's own; each pass's cut narrows `K` (until then `string`). */
export interface CityEraPiece<K extends string = string> {
  /** "<stage>:<kind>:<...>", unique in the whole plan, built from plan data, never list order. */
  readonly id: string;
  readonly kind: K;
  /** Its `CityDistrict.id`. */
  readonly district: string;
  /** The cell its pivot stands in. */
  readonly cell: CityCell;
  readonly placement: CityPlacement;
  /** Its extent in plan after the turn (world x and z) and its height, metres: the key's bounds, as `CityGroundProp.size`. */
  readonly size: { readonly x_m: number; readonly z_m: number; readonly h_m: number };
}

/** A pass's layer: what it adds, and what it changes, in the order it lists them. It never edits an earlier layer (X-2). */
export interface CityEraLayer<S extends CityPassStage, P extends CityEraPiece = CityEraPiece> {
  readonly stage: S;
  readonly adds: readonly P[];
  readonly changes: readonly CityChange[];
}

/** The tech pass's kinds: D1 and D2's cuts name them. */
export type CityTechPieceKind = string;
/** The hold-out's kinds: E1 and E2's cuts name them. */
export type CityHoldoutPieceKind = string;
/** The ruin's kinds: F1 and F2's cuts name them. */
export type CityRuinPieceKind = string;

export type CityTechLayer = CityEraLayer<"tech", CityEraPiece<CityTechPieceKind>>;
export type CityHoldoutLayer = CityEraLayer<"holdout", CityEraPiece<CityHoldoutPieceKind>>;
export type CityRuinLayer = CityEraLayer<"ruin", CityEraPiece<CityRuinPieceKind>>;

/** The era layers, beside the clean `CityLayers` (see the file's head). */
export interface CityEraLayers {
  readonly history: CityHistoryLayer;
  readonly tech: CityTechLayer;
  readonly holdout: CityHoldoutLayer;
  readonly ruin: CityRuinLayer;
}

/** An era run's plan: the clean plan, untouched, and the era layers written so far, each frozen with its digest as a clean layer is (R-1, R-4). */
export interface CityEraPlan {
  readonly plan: CityPlan;
  readonly layers: Partial<CityEraLayers>;
  readonly digests: Partial<Readonly<Record<CityEraStage, CityDigest>>>;
}

/** Why an era stage could not do its job: `CityStageFailure`'s fields, naming an era stage. */
export interface CityEraStageFailure extends Omit<CityStageFailure, "stage"> {
  readonly stage: CityEraStage;
}

/** An era run: the plan so far, and the failure if a stage failed. A clean stage's failure is the clean run's; an era stage's is this type's. */
export type CityEraRun =
  | { readonly ok: true; readonly plan: CityEraPlan }
  | { readonly ok: false; readonly plan: CityEraPlan; readonly failure: CityStageFailure | CityEraStageFailure };

/** An era stage's flat picture (R-5): `CityPicture`'s fields, naming an era stage. */
export interface CityEraPicture extends Omit<CityPicture, "stage"> {
  readonly stage: CityEraStage;
}

// ---- the resolver's contract (built in C1, `src/city/pipeline/`) ----
//
// `resolvePlan(plan, era)`:
// - Is pure. It never mutates a layer. It returns the plan as it stands at `era`: every clean layer, "history" and each pass's adds up to the era, and every change applied in stage order
//   ("tech", "holdout", "ruin"), then list order.
// - At "clean" returns `plan.plan` itself as `CityResolvedPlan.plan` (deep-equal, same digests), `history` null, no adds and no states.
// - A removed piece is gone from its list. A swapped piece keeps its placement with the new key. A stated piece is listed in `states`; a later era's state replaces an earlier one's.
// - No cascade: a change touches only the piece it names. (A2 adds the circuit's case: a pass that topples a pole lists the state of each span on it; C1's check fails a toppled pole with an uncut span.)
// - A later era may change an earlier era's adds, by id.
// - Fails, throwing C1's error carrying a `CityResolveFailure` that names the stage whose change it is, when: a reference finds nothing ("missing"); a key guard does not match the piece's key
//   as it stands when the change applies ("key"); one layer changes a piece twice ("twice"); a change targets a piece an earlier era removed ("removed"); a swap targets a keyless list's record ("keyless").
// - References are read against the lists as their stages wrote them; `states` names pieces in the resolved lists (below), so a drawing walks a resolved list and finds each piece's state.

/** Why a change could not be applied (see the contract). */
export type CityResolveFailureKind = "missing" | "key" | "twice" | "removed" | "keyless";

export interface CityResolveFailure {
  readonly stage: CityPassStage;
  /** The change's index in that stage's `changes`. */
  readonly change: number;
  readonly kind: CityResolveFailureKind;
  readonly ref: CityPieceRef;
  readonly reason: string;
}

/** A piece's state at an era. `target` is the piece's place in the resolved plan: its id, or its list and index after removals (its `key` the one it carries after swaps). */
export interface CityResolvedState {
  readonly target: CityPieceRef;
  readonly state: CityPieceState;
  /** The pass whose change set it. */
  readonly stage: CityPassStage;
}

/** The plan at an era. */
export interface CityResolvedPlan {
  readonly era: CityEra;
  /** The clean layers with every remove and swap applied. At "clean", the plan itself. */
  readonly plan: CityPlan;
  /** null at "clean". */
  readonly history: CityHistoryLayer | null;
  /** Each pass's adds up to the era, with later eras' removes and swaps applied; a pass past the era is absent. */
  readonly adds: {
    readonly tech?: CityTechLayer["adds"];
    readonly holdout?: CityHoldoutLayer["adds"];
    readonly ruin?: CityRuinLayer["adds"];
  };
  /** One entry per stated piece, in the order its list is resolved. */
  readonly states: readonly CityResolvedState[];
}

/** The resolver's signature. Pure; throws on a `CityResolveFailure` (C1's error class carries it). */
export type CityResolve = (plan: CityEraPlan, era: CityEra) => CityResolvedPlan;
