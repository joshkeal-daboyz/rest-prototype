/**
 * Stage 6, the circuit, and the city puzzle (ticket 081; the rules are ticket 070 K1's, `docs/design/070-K1-circuit.md`, CK1 to CK15).
 * Types only, plus the component list (data, as `CITY_STAGES` is). No logic: the stage, its checks and the conversion are the grid-simulator's (`src/city/circuit/`, 081 K2),
 * the city puzzle's validator is the lead-architect's (`src/core/load.ts`, 081 C1), the picks table is the renderer's (081 D3).
 *
 * Typed from CK15's sketch (21 Nov 2026), names kept where the sketch gave them; `CitySpan` is taken in `cityplan.ts` (a stretch along a street), hence `CityWireSpan`.
 * **Not typed yet:** the roof structures a diagonal street span hangs from (Josh, 23 Nov 2026; 081 B1). Josh's answers on 23 Nov fix their shape (a roof structure may hold a
 * node; a diagonal runs roof to roof or roof to pole; a roof span may cross over an intersection), but their ids, place and heights are B1's. They join `CityPoleKind`,
 * `CityWireSpanKind` and `CityNodePlace` after B1's pre-check, before K2d.
 *
 * Ids (stable, for 071's hash and for puzzle files):
 * - a pole: `pole:<street id>:<lo|hi>:<along_m, 2 decimals>`;
 * - a span: `span:<pole id a>~<pole id b>`, the two ids in sorted order;
 * - a drop: `drop:<building id>`;
 * - a street light: `light:<street id>:<lo|hi>:<along_m, 2 decimals>`.
 */

import type { CityCell, CitySide } from "./cityplan";
import type { Fault, GridNode, Line, Puzzle } from "./schema";

// ---- the layer (stage 6) ----

/** CK2 and CK6: an end slot, an even-pitch slot, a landing where a crossing lands, or a crossing pole on the non-pole pavement. */
export type CityPoleKind = "end" | "slot" | "landing" | "crossing";

/** One pole (CK1 to CK3, CK6). Metres on the plan's lattice. */
export interface CityPole {
  readonly id: string;
  readonly kind: CityPoleKind;
  readonly street: string;
  readonly pavement: "lo" | "hi";
  /**
   * Its position along its street's axis, in metres on the plan's lattice (x for an `x` street, z for a `z` street), not from the end of its block side. One street's
   * pavement runs past several blocks, so only the street-axis position keeps `pole:<street>:<lo|hi>:<along_m>` unique (081 K2a).
   */
  readonly along_m: number;
  readonly x_m: number;
  readonly z_m: number;
  readonly block: string;
  readonly side: CitySide;
  /** How far CK2's nudge moved it off its even-pitch slot; 0 when it stands on the slot. */
  readonly nudged_m: number;
}

/** CK4 along one pole line, CK5 round one block corner, CK6 square across one street between junctions. */
export type CityWireSpanKind = "along" | "corner" | "cross";

/** One span between two poles. `a` < `b` (pole ids, sorted). `street` is the street it runs along or crosses; null for a corner span. */
export interface CityWireSpan {
  readonly id: string;
  readonly kind: CityWireSpanKind;
  readonly a: string;
  readonly b: string;
  readonly len_m: number;
  readonly street: string | null;
}

/** CK9: one service drop from a pole to a building's wall point, on the pole side only. */
export interface CityDrop {
  readonly id: string;
  readonly pole: string;
  readonly building: string;
  /** The front column the drop meets. */
  readonly cell: CityCell;
  readonly x_m: number;
  readonly z_m: number;
  /** `DROP_WALL_Y_M` 5.5 m (CK9). */
  readonly y_m: number;
}

/** CK10: a street light on the non-pole pavement. Scenery: never a node, never a target, carries no line. */
export interface CityStreetLight {
  readonly id: string;
  readonly street: string;
  readonly pavement: "lo" | "hi";
  /** Along its street's axis, in metres on the plan's lattice, as `CityPole.along_m` (so `light:<street>:<lo|hi>:<along_m>` is unique). */
  readonly along_m: number;
  readonly x_m: number;
  readonly z_m: number;
  readonly block: string;
  readonly side: CitySide;
}

/** CK11: a lamp-post place, the midpoint of an along span of 7.5 m or more, 0.75 m from the kerb. A place, not a model: it stands only when a puzzle puts a lamp there. */
export interface CityLampPostPlace {
  /** The span it stands under (`CityNodePlace` `{ post: <span id> }`). */
  readonly span: string;
  readonly x_m: number;
  readonly z_m: number;
}

/** A point stage 8 and stage 9 keep clear of (I2, TR1's CL): every pole and street light. Points, not spans: the spans' heights are the kit's (071). */
export interface CityCircuitKeep {
  readonly x_m: number;
  readonly z_m: number;
}

// ---- the city puzzle (CK15) ----

/** The named city a puzzle is laid on: one of the pipeline's runs. */
export interface CityPuzzleCity {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly oneWay: boolean;
}

/** CK12: where a node stands. A pole id, a building id (its drop's wall point), or a lamp post at the midpoint of a span. */
export type CityNodePlace = { readonly pole: string } | { readonly building: string } | { readonly post: string };

/**
 * CK13 as Josh changed it (23 Nov 2026, 081 question 5: "lines cannot bend, they are runs that go from one structure to another"; card: "Just carriers (Recommended)").
 * A line is a chain of straight spans, each from one structure to the next, of any kinds (along, corner, crossing, and roof spans once 081 B1 types them), in order from `from`
 * to `to`. The poles between them, corner poles included, only carry the wire: they hold no node of the job, so a city puzzle keeps exactly its schematic's nodes.
 * It may end at a building on that building's drop (`drop`, a building id), or at a lamp post on its underground lead (`lead`, the post's span id), never both.
 * `spans` is empty only for a line that is nothing but a drop or a lead.
 */
export interface CityLineRun {
  readonly spans: readonly string[];
  readonly drop?: string;
  readonly lead?: string;
}

type WithoutPos<N> = N extends unknown ? Omit<N, "pos"> : never;

/** A node of a city puzzle: a `GridNode` that names a place instead of a free `pos`. */
export type CityPuzzleNode = WithoutPos<GridNode> & { readonly place: CityNodePlace };

export interface CityPuzzleLine extends Line {
  readonly run: CityLineRun;
}

/** A fault of a city puzzle. A `damaged-cable` fault may name which span of its line's run is cut; absent means the first. */
export interface CityPuzzleFault extends Fault {
  readonly span?: string;
}

/**
 * A city puzzle file (`puzzles/city/<id>.city.json`, 081 P2). Today's `Puzzle` with places for positions. Map scope only: the street layer's fields are not part of it.
 * `from` names the schematic puzzle it was laid from (e.g. "09-shrine-circuit"), absent for a puzzle designed on the city.
 */
export interface CityPuzzle extends Omit<Puzzle, "nodes" | "lines" | "faults" | "decor" | "scope" | "start" | "night" | "satchel" | "favor" | "lampReach" | "salvage" | "stores"> {
  readonly scope: "map";
  readonly from?: string;
  readonly city: CityPuzzleCity;
  /** CK14: 1 to 4 block ids that touch across a street. */
  readonly district: readonly string[];
  readonly nodes: readonly CityPuzzleNode[];
  readonly lines: readonly CityPuzzleLine[];
  readonly faults: readonly CityPuzzleFault[];
}

/** CK15's conversion: the plain `Puzzle` that `src/grid/` runs unchanged, and what only the 3D view and the overlay need (never passed to `src/grid/`). */
export interface CityPuzzleConverted {
  readonly puzzle: Puzzle;
  /** Each node's place, by node id. */
  readonly places: Readonly<Record<string, CityNodePlace>>;
  /** Each line's run, by line id. */
  readonly runs: Readonly<Record<string, CityLineRun>>;
  /** Each `damaged-cable` fault's cut span, by fault id. */
  readonly cuts: Readonly<Record<string, string>>;
  /** The origin `pos` is measured from (CK15 step 2), in metres. */
  readonly origin_m: { readonly x_m: number; readonly z_m: number };
}

// ---- the components Josh picks a model for (081 D) ----

/**
 * The puzzle's components, each of which gets one model Josh picks (081 D; Josh, 23 Nov 2026: "I want to work through a process where I am selecting individual assets to
 * represent puzzle components"). The ground poles are not here: 071's picks (`POWER_MIX`) already stand. `damagedLine` is a prop placed at the cut span (081 question 8: "Yes, a
 * picked prop"); the wire itself stays code-drawn. `roofMast` is the roof structure (081 B1).
 */
export const CIRCUIT_COMPONENTS = ["feed", "breaker", "switch", "relay", "spring", "fusebox", "junction", "battery", "lampBuilding", "lampPost", "damagedLine", "roofMast"] as const;
export type CircuitComponent = (typeof CIRCUIT_COMPONENTS)[number];

/** One of Josh's picks, as `docs/design/081-component-picks.md` records it. `key` is the gallery's `pack:name` (074 C's Copy); null while unpicked. */
export interface CircuitComponentPick {
  readonly component: CircuitComponent;
  readonly key: string | null;
  /** Josh's words, as he said them in chat or on a card. */
  readonly words: string;
  /** YYYY-MM-DD. */
  readonly date: string;
}
