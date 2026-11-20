/**
 * The city plan (ticket 070): the one type the staged tile-city pipeline (`src/city/`) passes from stage to stage.
 * Types only (plus the stage order, which is data). No logic: the runner, sub-seeds, digests and pictures live in `src/city/pipeline/`.
 *
 * The rules the plan carries out are `docs/city-grammar.md`'s. The lattice is the grammar's: cell (i, j) covers x in [i, i+1) * 5 m and z in [j, j+1) * 5 m,
 * the city starts at (0, 0), and every street, block, built column and opening is a whole number of cells.
 *
 * How the plan is used (ticket 070's rules, in short):
 * - Each stage reads the layers of the stages before it and writes only its own layer. The runner freezes every layer once its stage returns.
 * - A stage that cannot do its job fails with a `CityStageFailure` naming itself and the seed. Nothing earlier is patched.
 * - Each layer has a digest, so a test can prove that a change to stage N leaves stages 1 to N-1 as they were.
 * - Each plan stage has a flat top-down picture (`CityPicture`) of its own layer.
 *
 * Layers 1 to 4 are typed here in full, and layer 5 as far as F1. Layers 6 to 8 are typed by the architect before their sections of ticket 070 start; until then each is a stub
 * with only its `stage` field, so the envelope type-checks.
 */

import type { CalibrationKey } from "./calibration";

// ---- the stages ----

/** The nine stages, in the order they run. "assemble" is the drawing (src/render3d/) and writes no layer. */
export const CITY_STAGES = ["streets", "land", "mass", "edge", "buildings", "circuit", "facades", "ground", "assemble"] as const;
export type CityStage = (typeof CITY_STAGES)[number];
/** The stages that write a layer: pure TypeScript, no three, no DOM. */
export type CityPlanStage = Exclude<CityStage, "assemble">;

export interface CityPlanOptions {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
}

// ---- shared shapes ----

export interface CityCell {
  readonly i: number;
  readonly j: number;
}

/** A side of a cell (or of a part), by the outward normal: "+x" is the side at larger x. */
export type CitySide = "+x" | "-x" | "+z" | "-z";

/** A model placed by a plan stage: its key, its position in metres and its turn about y in degrees. Never scaled (style guide chapter 2, Decided). */
export interface CityPlacement {
  readonly key: CalibrationKey;
  readonly x_m: number;
  readonly y_m: number;
  readonly z_m: number;
  readonly yaw_deg: number;
}

// ---- stage 1: streets ----

export type CityStreetBand = "pavement" | "parking" | "lane";

/** One street: the same fields as the tile city's `TileStreet` (src/render3d/tilecity.ts), which becomes an alias of this type. */
export interface CityStreet {
  /** "x:<line>" or "z:<line>". */
  readonly id: string;
  /** The axis it runs along. */
  readonly axis: "x" | "z";
  readonly line: number;
  /** "avenue" is never laid on the tile city (Josh, 19 Nov 2026: "Yes, no avenues"); it stays in the type while the old tile city's code shares it. */
  readonly profile: "street" | "avenue";
  /** The cross-section, kerb to kerb, from the street's left looking along +x or +z. */
  readonly bands: readonly CityStreetBand[];
  /** The first cell (row for an "x" street, column for a "z" street) of its cross-section. */
  readonly across0: number;
  /** The carriageway, kerb to kerb, across the street, metres. */
  readonly carriage: { readonly lo_m: number; readonly hi_m: number };
  /** The centre line, same coordinate. On a one-way street (ticket 070 A4b) it is the middle of its one lane cell, not a lane edge (on one lane that edge is a kerb). */
  readonly centre_m: number;
}

/** What a street cell is before the street edge (stage 4) turns parking cells into bays, build-outs and plain cells, and pavement into kerb cuts. */
export type CityStreetRole = "lane" | "parkingPlain" | "junction" | "crossing" | "pavement" | "pavementCorner";

export interface CityStreetCell extends CityCell {
  readonly role: CityStreetRole;
  /** The cell's own street (a band cell), or the carriageway street a crossing lies in; null for a junction or a pavement corner. */
  readonly street: string | null;
  /** The band index in `street`'s `bands`, or -1 where `street` is null or the cell is a crossing. */
  readonly band: number;
}

export type CityBlockType = "small" | "medium" | "long" | "large";

/** A block: columns i0 to i1 and rows j0 to j1, high ends exclusive. Its id is "block:<bi>:<bj>". */
export interface CityBlock {
  readonly id: string;
  readonly bi: number;
  readonly bj: number;
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
  readonly type: CityBlockType;
}

// ---- stage 1, the split plan (ticket 070 A4; Josh, 20 Nov 2026: "C, split plan") ----
//
// Written before A4 started, as standalone types, so `goal/city-style` kept type-checking. A4's criterion 0 (the lead-architect, on A4's branch, 20 Nov 2026)
// wired them into `CityStreetsLayer` (the old lattice layer is deleted; `sizes` became `outline`).
//
// On the split plan nothing is a grid coordinate:
// - a block's `bi` and `bj` are ranks: `bi` is the number of distinct block `i0` values below its `i0`, `bj` likewise for `j0`. Its id stays "block:<bi>:<bj>".
//   The pair is unique (two blocks with the same `i0` and `j0` are the same block), and on a lattice it equals today's grid coordinates. Two blocks whose `bi`
//   differ by one need not share a street: neighbours come only from `CityPlanBlock.sides`.
// - a street's `line` is its ordinal among the streets of its axis, ordered by `across0` and then `span.lo`, and its id stays "<axis>:<line>". It is not a lattice
//   line: no stage finds a block or the city's edge from it (`CityPlanStreet.outer` says which streets are on the edge).
// The old lattice functions (`layStreets` and the rest, which `city=tiles` imports; R-9) keep today's meanings and are not typed by these.

/** A stretch along a street or a block side, in cells along the street's axis (i for an "x" street, j for a "z" street), high end exclusive. */
export interface CitySpan {
  readonly lo: number;
  readonly hi: number;
}

/** A junction's kind (S1): "corner" (two streets, both end there; the city's four corners), "T" (one street ends on another that runs through), "crossroads" (two run through). */
export type CityJunctionKind = "corner" | "T" | "crossroads";

/** One end of a street: the junction it ends in (S1: every street ends on a street; no dead end). */
export interface CityStreetEnd {
  readonly junction: string;
}

/** A street on the split plan: today's fields, plus where it runs, how it ends, and (from A4b) its section and direction (`CityStreetTraffic`, below). */
export interface CityPlanStreet extends CityStreet, CityStreetTraffic {
  /** The cells along its axis it runs over, its end junctions' squares included (so a T's ending street reaches the far kerb of the through street's carriageway). */
  readonly span: CitySpan;
  /** Its two ends, the low end (`span.lo`) first. */
  readonly ends: readonly [CityStreetEnd, CityStreetEnd];
  /** For one of the four edge streets, the side of it that faces out of the city (its outer pavement and parking band face no block); null for every other street. */
  readonly outer: CitySide | null;
}

/**
 * Where streets meet: the rectangle where the two carriageways cross (S2). On A4's plan every carriageway is 3 cells, so it is 3 by 3 (grammar rule 10).
 * From A4b (one-way streets) it is the x street's carriageway width by the z street's: 3, 2 or 1 cells each way. Its id is "junction:<i>:<j>", its low corner cell.
 */
export interface CityJunction {
  readonly id: string;
  readonly kind: CityJunctionKind;
  /** Its carriageway cells (role `junction`): nine on two two-way streets; 1 to 6 where a one-way street meets (A4b). */
  readonly cells: readonly CityCell[];
  /** The streets that meet there: `passes` true for a street that runs through it, false for one that ends in it. A T has one of each; a crossroads two passing; a corner two ending. */
  readonly streets: readonly { readonly street: string; readonly passes: boolean }[];
  /** The sides of the square a carriageway leaves by: two for a corner, three for a T, four for a crossroads. */
  readonly arms: readonly CitySide[];
  /** True when none of its streets is an edge street. S5's share is counted over these. */
  readonly inner: boolean;
}

/** A block across a block side's street, and the stretch of the side it faces (the two blocks' spans along the street, intersected). */
export interface CityBlockAcross {
  readonly block: string;
  readonly span: CitySpan;
}

/** A stretch of a block side that has a junction in front of it (for S6): the far side of a T, opposite the street that ends there. */
export interface CityJunctionFacing {
  readonly junction: string;
  /** The street that ends in the junction, opposite this side. */
  readonly street: string;
  /** The ending street's cross-section along this side: the cells opposite it, its full width (5 cells two-way; 4 or 3 one-way, from A4b). Clearances either side (`BAY_JUNCTION_CLEAR`) are the reading stage's, not stage 1's. */
  readonly span: CitySpan;
}

/** One of a block's four sides on the split plan (S4: every side has a street). */
export interface CityBlockSide {
  readonly side: CitySide;
  /** The street along it. */
  readonly street: string;
  /** The block's own extent along the street: i0 to i1 for a "-z" or "+z" side, j0 to j1 for "-x" or "+x". */
  readonly span: CitySpan;
  /** The blocks across the street, in order along it (two or more where one long side faces several). Empty when the street is an edge street and this side faces out. */
  readonly across: readonly CityBlockAcross[];
  /** The stretches of this side that face a junction (S6), in order along it; empty when none does. */
  readonly junctions: readonly CityJunctionFacing[];
}

/** A block on the split plan: today's rectangle, type and id (`bi`, `bj` are ranks; see above), plus its four sides. */
export interface CityPlanBlock extends CityBlock {
  readonly sides: { readonly [S in CitySide]: CityBlockSide };
}

/** The city's ground: the land inside the four edge streets, in cells (high ends exclusive), from today's `blockSizes` draw for the asked size, and the draw that gave it (null: the fallback lists). */
export interface CityOutline {
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
  readonly draw: number | null;
}

/** The street layer (stage 1) on the split plan (ticket 070 A4), with one-way streets (A4b). Today's `cells` are unchanged in shape. */
export interface CityStreetsLayer {
  readonly stage: "streets";
  /** The city's extent, in cells. */
  readonly w: number;
  readonly h: number;
  readonly streets: readonly CityPlanStreet[];
  /** Every street cell once. A cell not listed is inside a block. */
  readonly cells: readonly CityStreetCell[];
  readonly blocks: readonly CityPlanBlock[];
  readonly junctions: readonly CityJunction[];
  /** The city's ground inside the four edge streets, and the draw that gave it (null: the fallback lists). */
  readonly outline: CityOutline;
  /** Every one-way arrow cell (A4b), row-major. Empty when the city has no one-way street. */
  readonly arrows: readonly CityStreetArrow[];
}

// ---- stage 1, one-way streets (ticket 070 A4b; docs/design/070-streets-one-way.md) ----
//
// Josh, 20 Nov 2026, in chat: "I'm sorry, it should be a maximum of 2 tiles wide. 1 for parking (discretionary), 1 for the road"; asked whether the pavement
// stays on each side, "correct". Folded in by A4b's criterion 0 (the lead-architect, on A4b's branch): `CityPlanStreet` extends `CityStreetTraffic`, and
// `CityStreetsLayer` has `arrows`.

/** A street's cross-section (grammar rule 10 for "twoWay"; Josh's one-way ruling for the other two). Its `bands` match it, kerb to kerb across.
 * - "twoWay": pavement, parking, lane, lane, pavement (5 cells, 25 m; carriageway 15 m). Every edge street (S8) and every street before A4b.
 * - "oneWay": pavement, parking, lane, pavement, the parking on either side (4 cells, 20 m; carriageway 10 m).
 * - "oneWayBare": pavement, lane, pavement (3 cells, 15 m; carriageway 5 m). Only where S10 lets it.
 */
export type CityStreetSection = "twoWay" | "oneWay" | "oneWayBare";

/** Which way traffic runs along the street's axis: "both" (two-way), "+" (towards higher i for an "x" street, higher j for a "z" street), "-" (lower). */
export type CityStreetFlow = "both" | "+" | "-";

/** A street's section and direction. `flow` is "both" exactly when `section` is "twoWay". */
export interface CityStreetTraffic {
  readonly section: CityStreetSection;
  readonly flow: CityStreetFlow;
}

/** A lane cell of a one-way street that carries a painted arrow (the City Pack's `SM_Env_Road_Arrow_01`/`_02`, drawn by E), pointing with the traffic.
 * Stage 1 places them (the assembler decides nothing): the first lane cell after each junction exit, then one every `ONE_WAY_ARROW_EVERY` cells (PROVISIONAL). */
export interface CityStreetArrow extends CityCell {
  readonly street: string;
  /** The way the arrow points, which is the street's flow: "+x"/"-x" on an "x" street, "+z"/"-z" on a "z" street. */
  readonly toward: CitySide;
}

// ---- stage 2: land ----

/** Version one has one biome. The field exists so more can come later; no stage may branch on it until a ticket adds a second value. */
export type CityBiome = "town";

/** What a block is given (grammar rules 4 and 12, style guide 19.6). */
export type CityTreatment = "court" | "alley" | "parkWhole" | "parkHalf";

/** A part's shape by its short side (grammar rule 4): "court" is 6 cells or more, "strip" exactly 2 (Josh, 19 Nov 2026: "Yes, allow strips"). 3 to 5 is never laid. */
export type CityPartShape = "court" | "strip";

/** What lies beyond a part's side. */
export type CityPartEdge = "street" | "lane" | "park";

export interface CityLandBlock {
  readonly block: string;
  readonly biome: CityBiome;
  readonly treatment: CityTreatment;
}

/** A rectangle of a block that is laid on its own: a whole block, or a piece an alley or a half park leaves. Its id is the block's, or "<block>/a", "/b", "/built". */
export interface CityPart {
  readonly id: string;
  readonly block: string;
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
  readonly shape: CityPartShape;
  readonly edges: { readonly [S in CitySide]: CityPartEdge };
}

/** A service lane, one cell wide, across a block from street to street: along z in cell column `at`, or along x in cell row `at`. */
export interface CityLane {
  readonly block: string;
  readonly axis: "x" | "z";
  readonly at: number;
}

export interface CityPark {
  readonly block: string;
  readonly kind: "whole" | "half";
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
  /** The side of the block a half park takes; null for a whole park. */
  readonly side: CitySide | null;
}

export interface CityLandLayer {
  readonly stage: "land";
  readonly blocks: readonly CityLandBlock[];
  readonly parts: readonly CityPart[];
  readonly lanes: readonly CityLane[];
  readonly parks: readonly CityPark[];
}

// ---- stage 3: mass ----

/** The openings of grammar rule 6: the only gaps in the built mass. */
export type CityOpeningKind = "lane" | "drive" | "frontLot" | "plaza" | "park" | "walk";

/** What a block cell is used for. "built" is one building column; every other value is open. */
export type CityMassUse =
  | "built"
  // openings (rule 6)
  | "lane"
  | "laneMouth"
  | "drive"
  | "frontLot"
  | "plaza"
  | "walk"
  // a court block's interior (rule 5), and a park's cells
  | "apron"
  | "stalls"
  | "aisle"
  | "green"
  | "greenPath"
  | "parkEdge";

export interface CityMassCell extends CityCell {
  readonly block: string;
  /** The part it is in; null for a lane cell or a park cell. */
  readonly part: string | null;
  readonly use: CityMassUse;
  /** The opening it belongs to, or null (built cells, and interior cells that belong to none). */
  readonly opening: string | null;
}

/** What an open side of a built cell faces. */
export type CityFaceKind = "street" | "parkEdge" | "plaza" | "lane" | "drive" | "walk" | "frontLot" | "court";

/** Grammar rule 9: street, park edge and plaza are "street" frontage; the rest are "quiet". */
export type CityFrontage = "street" | "quiet";

export interface CityOpenSide {
  readonly side: CitySide;
  readonly faces: CityFaceKind;
  readonly frontage: CityFrontage;
}

/** Grammar rule 3: 0 open sides is blind, 1 is mid, 2 adjacent is corner. Opposite sides, 3 or 4 is a failure of the mass stage, never a value here. */
export type CityColumnKind = "blind" | "mid" | "corner";

export interface CityBuiltCell extends CityCell {
  readonly block: string;
  readonly part: string;
  /** "outer" faces the part's edge (street, lane or park); "inner" faces a court block's interior (ring 2). Both rows of a strip are "outer". */
  readonly row: "outer" | "inner";
  readonly open: readonly CityOpenSide[];
  readonly column: CityColumnKind;
  /** The built cell it stands back to back with (grammar rule 4), or null where its back is a recorded opening. */
  readonly partner: CityCell | null;
}

/** Where an opening a vehicle enters meets a street: the street and the mouth cells on the building line. The kerb turns in there (rule 10). */
export interface CityMouth {
  readonly street: string;
  readonly cells: readonly CityCell[];
}

export interface CityOpening {
  readonly id: string;
  readonly kind: CityOpeningKind;
  readonly block: string;
  readonly cells: readonly CityCell[];
  /**
   * The opening's street mouths, one per street end it opens on. A lane is one opening with two (one at each end); a drive or frontage lot off a street has one.
   * Empty when no vehicle enters it from a street, so the kerb runs straight past: a plaza, park or walk-through, and a lane drive (entered from the lane, whose mouths carry the kerb cuts).
   */
  readonly mouth: readonly CityMouth[];
}

/** A residents' court (style guide 19.4) or a frontage lot: its stalls are lot supply for P2. */
export interface CityCourt {
  readonly block: string;
  /** The block its stalls count toward (056: a neighbour across a street, when the host has no room). */
  readonly serves: string;
  /** The opening a car enters by: a drive, a lane, or the frontage lot itself. */
  readonly opening: string;
  readonly stallCells: readonly CityCell[];
  readonly aisleCells: readonly CityCell[];
  readonly stalls: number;
}

/**
 * A block's nominal units (style guide 18.2), counted from its built cells on 5 m columns and the nominal floor count. They are the parking demand of record:
 * stage 4 sizes kerb bays from `shops`, stage 3 sizes lots from `homes`, and no later stage changes them.
 */
export interface CityBlockUnits {
  readonly block: string;
  readonly columns: number;
  readonly shops: number;
  readonly homes: number;
  readonly lotsWanted: number;
  readonly lots: number;
  readonly stallsShort: number;
}

export interface CityMassLayer {
  readonly stage: "mass";
  /** Every cell of every block exactly once. */
  readonly cells: readonly CityMassCell[];
  /** The built cells, with their open sides, column kind and partner. */
  readonly built: readonly CityBuiltCell[];
  readonly openings: readonly CityOpening[];
  readonly courts: readonly CityCourt[];
  readonly units: readonly CityBlockUnits[];
}

// ---- stage 4: edge (typed before section D1; D2 adds the kerb line and fills `ground`) ----

/**
 * What a street cell is once the street edge is dressed (style guide 18.3 to 18.5). Stage 1's roles, with two refined:
 * - a parking-band cell (`parkingPlain` in stage 1) is `parking` (half of a `ParkingLines_01` tile), `buildout`, or stays `parkingPlain` (in front of a kerb cut, or on an edge street's outer side);
 * - a `pavement` cell in front of a vehicle opening's mouth is a `kerbCut`.
 * Every value is also a value of the old tile city's `TileRole` (src/render3d/tilecity.ts), so a cell of this role can be drawn by `tilecity3d.ts` unchanged.
 */
export type CityEdgeRole = "lane" | "parking" | "parkingPlain" | "buildout" | "junction" | "crossing" | "pavement" | "pavementCorner" | "kerbCut";

/** A turn about y, degrees, on the lattice. */
export type CityYaw = 0 | 90 | 180 | 270;

/** One street cell, dressed. The edge layer lists every cell of `streets.cells` exactly once, in the same order, with the same `street` and `band`. */
export interface CityEdgeCell extends CityCell {
  readonly role: CityEdgeRole;
  /** As `CityStreetCell.street`. */
  readonly street: string | null;
  /** As `CityStreetCell.band`. */
  readonly band: number;
  /** A parking-band cell: the block its band faces ("block:<bi>:<bj>"), or "outer" on the outside of an edge street. null for every other cell. */
  readonly faces: string | null;
}

/** A kerb cut (rule 10, 18.4): the pavement cell in front of one mouth cell of a vehicle opening, and the parking-band cell in front of it, which stays plain. */
export interface CityKerbCut {
  /** The pavement cell (role `kerbCut`). */
  readonly cell: CityCell;
  readonly street: string;
  /** The `CityOpening.id` whose mouth it is in front of. */
  readonly opening: string;
  /** The parking-band cell in front of the cut (role `parkingPlain`), or null where the street has no parking band on that side (a traffic lane is behind the cut). */
  readonly plain: CityCell | null;
}

/** One `ParkingLines_01` tile: two band cells along the street, `BAYS_PER_PARKING_TILE` bays (18.3). */
export interface CityBayTile {
  /** The two cells, the lower i (an "x" street) or the lower j (a "z" street) first. Both have role `parking`. */
  readonly cells: readonly [CityCell, CityCell];
  readonly street: string;
  /** The block the band faces (never "outer": 056 lays no bay on an edge street's outer side). */
  readonly block: string;
  /** The block whose quota it counts toward: `block`, or the block across the street (18.6). */
  readonly serves: string;
}

/** One kerbside bay, the same fields as the old tile city's `ParkingBay`: what P1, P3 and P6 count, and what a later cars or meters stage reads. */
export interface CityKerbBay {
  readonly x_m: number;
  readonly z_m: number;
  readonly yaw: number;
  /** Along the street, and across it, metres. */
  readonly w_m: number;
  readonly d_m: number;
  readonly street: string;
  /** As `CityBayTile.block` and `.serves`. */
  readonly block: string;
  readonly serves: string;
}

/** A street tree on a build-out cell (18.5), at the cell's centre, metres. */
export interface CityBuildoutTree {
  readonly cell: CityCell;
  readonly x_m: number;
  readonly z_m: number;
  readonly street: string;
}

/** A block's kerbside parking, as the allocator left it (ticket 070 D1, criterion 2). */
export interface CityEdgeBlock {
  readonly block: string;
  /** Its quota in tiles: max(`BAY_TILES_PER_BLOCK_MIN`, round(shops x `PARK_PER_SHOP` / `BAYS_PER_PARKING_TILE`)), shops from `mass.units`. */
  readonly wanted: number;
  /** Where the first pass laid its first tile: on its own band, on the band across a street, or nowhere (no band could take one). From D1b (PB, Josh, 20 Nov 2026: "yes, yes"), "own" also covers a whole park's one tile on its own kerb, laid only when nothing across could serve it. */
  readonly first: "own" | "across" | null;
  /** Tiles of its quota no band could take (the old path's `shortTiles`): 0 when served in full. P1 reads it from here. */
  readonly shortTiles: number;
}

/**
 * The bits of `CityGroundCell.variant` (ticket 070 D2). Data, like `CITY_STAGES`: the one contract between stage 4, which writes the bits, and the assembler, which picks a piece by them.
 * Every bit but `pavementDip` has the value of the old tile city's constant of the same meaning (`LANE_RIGHT`, `LANE_PATCH`, `PAVEMENT_GRATE`, `PAVEMENT_RETURN_NEAR`, `PAVEMENT_RETURN_FAR`,
 * `PAVEMENT_FLUSH` in src/render3d/tilecity.ts), so `tilecity3d.ts` draws those cells unchanged; D2 pins each equal by a test while both exist.
 * - A lane cell: `laneRight` (0 for the street's first lane in `bands`, 1 for its second; always 0 on a one-way street's one lane), `lanePatch` (a patch decal on it).
 * - A pavement cell: `pavementGrate` (`Sidewalk_Grate_01`), or any of the kerb bits, never both. `pavementReturnNear` / `pavementReturnFar`: the cell just before / after a kerb cut along its street (increasing i or j),
 *   whose side edge carries the inlet's return. `pavementFlush`: a build-out stands in front of it (no kerb, no gutter). `pavementDip` (new on the pipeline, D2; S2's far side of a T): a crossing lands in front
 *   of it, so its kerb is dropped (`Sidewalk_Dip_01`) and the kerb line runs straight on past it. The old path never writes `pavementDip`; the assembler (section E) draws it.
 * - Every other role: 0.
 */
export const CITY_GROUND_VARIANT = {
  laneRight: 1,
  lanePatch: 2,
  pavementGrate: 1,
  pavementReturnNear: 2,
  pavementReturnFar: 4,
  pavementFlush: 8,
  pavementDip: 16,
} as const;

/**
 * One street piece as the assembler draws it: the same fields as the old tile city's `TileCell` (src/render3d/tilecity.ts), so `tilecity3d.ts` draws it unchanged.
 * Written by section D2 (variants, yaws, the kerb returns, the dips); D1 leaves `CityEdgeLayer.ground` absent.
 * `ground` covers every cell of `CityEdgeLayer.cells` exactly once: a `ParkingLines_01` tile is one record with `cells` 2 (its first cell, the lower i on an "x" street or the lower j on a "z" street, is `i`, `j`);
 * every other cell is its own record, row-major, with the edge cell's `role` and `street`.
 */
export interface CityGroundCell extends CityCell {
  /** 2 for a `ParkingLines_01` tile (its first cell is `i`, `j`), else 1. */
  readonly cells: 1 | 2;
  readonly role: CityEdgeRole;
  /** Which model of the role's set, as `CITY_GROUND_VARIANT`'s bits; 0 for a role with one model. */
  readonly variant: number;
  /** The piece's centre, metres: the cell's centre, or the shared cell edge along the street for a 2-cell tile. */
  readonly x_m: number;
  readonly z_m: number;
  readonly yaw: CityYaw;
  /** As `CityEdgeCell.street`. */
  readonly street: string | null;
}

// ---- stage 4, the kerb line (ticket 070 D2; grammar rule 10; moved from src/render3d/kerbline.ts, 063 F) ----
//
// The same shapes as the old path's `KerbPath` and its parts (src/render3d/kerbline.ts), so the assembler can put the old path's kerb faces (`tileKerbPlan`) on it, plus what the split plan needs:
// the `crossingDip` stretch (the far side of a T), the block side a path runs along (`faces`, `blockSide`), and each return's opening and building-line end. Points are metres in plan, on the cell edges.

/** A point in plan, metres (the old path's `Mp`). */
export interface CityKerbPoint {
  readonly x: number;
  readonly z: number;
}

/**
 * What a stretch of a kerb path is:
 * - `edge`: a pavement or build-out cell's carriageway edge;
 * - `crossingDip` (new on the pipeline, S2): the carriageway edge of a pavement cell with a crossing in front of it on the far side of a T (`CITY_GROUND_VARIANT.pavementDip`). It is on the path's chain:
 *   the line runs straight on past it, dropped, with no return;
 * - `dip`: a vehicle opening's mouth edge on the street, between its two returns; off the chain, as the old path has it;
 * - `flank`: the side of a stretch of build-outs;
 * - `return`: the side of a vehicle opening, from the street kerb to the building line;
 * - `opening`: across the opening at the building line (no kerb).
 */
export type CityKerbSegKind = "edge" | "crossingDip" | "dip" | "flank" | "return" | "opening";

export interface CityKerbSeg {
  readonly kind: CityKerbSegKind;
  readonly a: CityKerbPoint;
  readonly b: CityKerbPoint;
  /** The unit vector, in plan, from the kerb line toward the walk: across the street for an edge, a crossing dip or a dip; along it for a flank or a return; 0 0 for an opening. */
  readonly walk: CityKerbPoint;
  /** The cell that carries the stretch: an edge's or a crossing dip's pavement or build-out cell, a dip's kerb-cut cell, a return's pavement cell on that side (null where there is none); null for a flank and an opening. */
  readonly cell: CityCell | null;
  /** An edge along a build-out: the pavement cell under it (flush). null otherwise. */
  readonly under: CityCell | null;
  /** A return: which side of its opening it is on, in the direction the path runs; null for every other stretch. */
  readonly which: "near" | "far" | null;
}

export interface CityKerbReturn {
  /** `<path id>|<i>,<j>`, the mouth's first kerb-cut cell along the path, as the old path names an inlet. */
  readonly inlet: string;
  /** The `CityOpening.id` whose mouth it turns in at (from `CityKerbCut.opening`). */
  readonly opening: string;
  /** Where the return meets the street edge, on the cell edges. */
  readonly at: CityKerbPoint;
  readonly side: "near" | "far";
  /** Its other end, on the building line: within 0.05 m of the corner column's wall plane (the grammar's second addition; the cell edge until F2's `BODY_M` table exists). */
  readonly end: CityKerbPoint;
}

/** One kerb line: the kerb of one pavement band along one street, from the corner at one end to the corner at the other (grammar rule 10 as D2 re-words it: "from block corner to block corner"). */
export interface CityKerbPath {
  /** `<street>|<side>|<first cell along the street>`, as the old path. */
  readonly id: string;
  readonly street: string;
  /** The old path's `Kerb.side` of the pavement the path is on. */
  readonly side: 1 | -1;
  /** The block whose side the path runs along ("block:<bi>:<bj>"), or "outer" on the outer pavement of an edge street (as `CityEdgeCell.faces`). */
  readonly faces: string;
  /** That block's side (`CityBlockSide.side`); null when `faces` is "outer". */
  readonly blockSide: CitySide | null;
  /** The unit vector across the street, from the carriageway toward the walk. */
  readonly across: CityKerbPoint;
  /** The path in order, each mouth's dips after its opening. */
  readonly segs: readonly CityKerbSeg[];
  /** The chain of the path's vertices, in order: every segment but the dips (a crossing dip is on it). */
  readonly points: readonly CityKerbPoint[];
  /** Each vehicle mouth's edge on the street, between its two returns. */
  readonly dips: readonly { readonly inlet: string; readonly a: CityKerbPoint; readonly b: CityKerbPoint }[];
  /** The index ranges into `points` (start, end) of the segments that cross an opening. */
  readonly openings: readonly (readonly [number, number])[];
  readonly returns: readonly CityKerbReturn[];
}

/** Stage 4: the street edge. D1 writes the parking band and the kerb cuts; D2 adds `ground` and `kerb`. */
export interface CityEdgeLayer {
  readonly stage: "edge";
  /** Every street cell once, dressed (`streets.cells`' order). */
  readonly cells: readonly CityEdgeCell[];
  readonly kerbCuts: readonly CityKerbCut[];
  readonly tiles: readonly CityBayTile[];
  /** `BAYS_PER_PARKING_TILE` per tile. */
  readonly bays: readonly CityKerbBay[];
  readonly buildoutTrees: readonly CityBuildoutTree[];
  /** Every block of `streets.blocks` once, whole-block parks included (their quota is from `mass.units` like any other block's). */
  readonly blocks: readonly CityEdgeBlock[];
  /** The drawn street pieces (D2): every cell of `cells` once, a bay tile as one 2-cell record. Optional only so D1's layer and fixtures type-check; from D2 the stage always writes it. */
  readonly ground?: readonly CityGroundCell[];
  /** The kerb lines (D2): one path per pavement band of each street side, from block corner to block corner, in the streets' order, then along the street. Optional as `ground`; from D2 always written. */
  readonly kerb?: readonly CityKerbPath[];
}
// ---- stage 5: buildings (ticket 070 F1; grammar rules 1, 4 and 12; F2 adds each storey's piece, turn and placement, and the roofs) ----
//
// Typed by the lead-architect before F1 (20 Nov 2026, on Josh's "Start F1"). A row and a building are defined on the mass layer's built cells:
// - **A row** is the line of built cells of one part along one of its sides. In a court part: for each side `s`, the outer row is the cells at distance 0 from `s`
//   (front `s`), and the inner row is the cells at distance 1 from `s` and at least 1 from the two sides beside it (front: the side opposite `s`, toward the interior).
//   In a strip: its two long sides' rows, each fronting its own edge; a strip's short ends are not rows. A ring-1 corner cell lies in two outer rows, a ring-2 blind
//   corner in two inner rows, and a strip's end cell in its one long row.
// - **A building** is 2 to 4 consecutive cells of one row (`TERRACE_BAYS`, grammar rule 1). Every cell is in exactly one building. A cell that lies in two rows is in
//   the building of one of them.
// - **Lead and follow.** Every building of a court part's outer rows leads. Every building of its inner rows follows: its partner building is the building of the mass
//   partners (`CityBuiltCell.partner`) of its cells that are not blind. In a strip one row leads and the other follows (F1 criterion 4 says which).

/** A row of built cells (see above): one part, one ring, one front. Its id is "<part>|<row>|<front>", unique in the city. */
export interface CityBuildingRow {
  readonly id: string;
  readonly block: string;
  readonly part: string;
  /** As `CityBuiltCell.row`: "outer" for ring 1 and both rows of a strip, "inner" for ring 2. */
  readonly row: "outer" | "inner";
  /** The side every non-blind cell of the row shows: the part side for an outer row, the side toward the interior for an inner row. */
  readonly front: CitySide;
  /** Its buildings' ids, in order along the row (increasing i on a "-z"/"+z" front, increasing j on a "-x"/"+x" front). Openings may break the row: two buildings with an opening between them are in the same row but are not row neighbours. */
  readonly buildings: readonly string[];
}

/** How a following building stands to its partner (grammar rule 4, Decided, Josh, 19 Nov 2026: "They can be either."). */
export type CityBuildingBack = "through" | "another";

/** One building (grammar rule 1): 2 to 4 columns of one row that share one style, one colourway and one floor count. */
export interface CityBuilding {
  /** "<row id>|<i>,<j>", its first cell along the row. */
  readonly id: string;
  readonly block: string;
  readonly part: string;
  /** Its `CityBuildingRow.id`. */
  readonly rowId: string;
  /** As its row's. */
  readonly row: "outer" | "inner";
  readonly front: CitySide;
  /** Its cells in order along the row, 2 to 4, consecutive. */
  readonly cells: readonly CityCell[];
  /** A style id of the buildings stage's typed-in style table (one of `STACK_STYLES`' "bay" styles, src/render3d/stacks.ts: "apartment-01", "apartment-02", "apartment-03"). */
  readonly style: string;
  /** A colourway id of the typed-in pool (`COLOURWAY_POOL`, src/render3d/colourway.ts: "base", "01_C", ...). The assembler falls back to "base" for an id whose atlas did not load; the plan never knows what loaded. */
  readonly colourway: string;
  /** Storeys, the ground storey included: `CITY_STOREYS` 3 to 5 (R2). The old path's `floors` is this less one. */
  readonly storeys: number;
  /** A following building's partner building id; null for a leading building. */
  readonly partner: string | null;
  /** A following building's kind: "through" (its partner's style and colourway) or "another" (its own style, a colourway not its partner's); null for a leading building. */
  readonly back: CityBuildingBack | null;
}

/** Stage 5: buildings. F1 writes `rows` and `buildings`; F2 adds each storey's kind, turn, piece and placement, and the roof pieces (typed by the architect before F2). */
export interface CityBuildingsLayer {
  readonly stage: "buildings";
  /** Every row once, in `mass.built` order of its first cell. */
  readonly rows: readonly CityBuildingRow[];
  /** Every building once, row by row in `rows` order, along each row. Every `mass.built` cell is in exactly one. */
  readonly buildings: readonly CityBuilding[];
}
/** Stage 6: the circuit. Typed when ticket 059 is re-cut onto the pipeline; until then the layer is empty. */
export interface CityCircuitLayer {
  readonly stage: "circuit";
}
/** Stage 7: facades. Typed before section H1. */
export interface CityFacadesLayer {
  readonly stage: "facades";
}
/** Stage 8: ground dressing. Typed before section I. */
export interface CityGroundLayer {
  readonly stage: "ground";
}

export interface CityLayers {
  readonly streets: CityStreetsLayer;
  readonly land: CityLandLayer;
  readonly mass: CityMassLayer;
  readonly edge: CityEdgeLayer;
  readonly buildings: CityBuildingsLayer;
  readonly circuit: CityCircuitLayer;
  readonly facades: CityFacadesLayer;
  readonly ground: CityGroundLayer;
}

// ---- the plan, a run, a failure, a picture ----

/** A layer's digest: a stable hash of its canonical form, as 8 hex digits. */
export type CityDigest = string;

export interface CityPlan {
  readonly options: CityPlanOptions;
  /** The layers written so far, in stage order. A stage sees only the layers before it. */
  readonly layers: Partial<CityLayers>;
  readonly digests: Partial<Readonly<Record<CityPlanStage, CityDigest>>>;
}

/** Why a stage could not do its job. Nothing is patched and no check is loosened: the run stops here. */
export interface CityStageFailure {
  readonly stage: CityPlanStage;
  readonly seed: number;
  readonly blocksX: number;
  readonly blocksZ: number;
  /** The rule or check that could not be met, e.g. "M3: cell (14, 9) has opposite open sides". */
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

/** The result of running the pipeline up to a stage: the plan so far, and the failure if a stage failed (the plan then holds the layers before it). */
export type CityPlanRun = { readonly ok: true; readonly plan: CityPlan } | { readonly ok: false; readonly plan: CityPlan; readonly failure: CityStageFailure };

/**
 * A stage's flat top-down picture of its own layer: one legend entry per cell of the lattice (row-major, index j * w + i), and points for things
 * smaller than a cell (poles, props). Drawn by `src/render3d/planview.ts` at `?city=plan&stage=<name>`; pure data here.
 */
export interface CityPicture {
  readonly stage: CityPlanStage;
  readonly w: number;
  readonly h: number;
  readonly cells: readonly number[];
  readonly points: readonly { readonly x_m: number; readonly z_m: number; readonly legend: number }[];
  /** `rgb` as 0xRRGGBB. Index 0 is "nothing of this layer here". */
  readonly legend: readonly { readonly name: string; readonly rgb: number }[];
}
