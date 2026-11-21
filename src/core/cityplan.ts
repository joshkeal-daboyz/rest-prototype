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
 * Layers 1 to 5, 7 and 8 are typed here (layer 8 with section I's re-cut, 21 Nov 2026). Layer 9 (traffic control, TR1) is typed standalone and joins the stage list at TR1's criterion 0. Layer 6 is typed by the architect before its section of ticket 070 starts; until then it is a stub
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

/**
 * A model placed by a plan stage: its key, its position in metres and its turn about y in degrees. Never scaled (style guide chapter 2, Decided).
 * The position is the model's pivot: its bounds' centre in x and z and its base at y (the converter centres every pivot so, src/core/assets.ts). The turn is three.js's, as
 * stacks.ts' `yaw` and `TileYaw`: at 90 a piece's own +z front faces +x (x' = x cos + z sin, z' = -x sin + z cos).
 */
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
//   the building of one of them, with one exception, the L (lever L1, Josh, 20 Nov 2026: "1-4 i approve your recommendations"):
// - **The L (L1).** A **tight corner** is a ring-2 blind corner where, in each of its two inner rows, the stretch that holds it (from the corner to the first opening or
//   the row's end) is exactly 2 cells: the corner and one cell beside it. (It happens where a drive and a frontage lot meet at one block corner.) Its building is the
//   whole of both stretches, 3 cells in an L: `cells` lists the cell of `rowId`'s row, then the corner, then the cell of `bend`'s row. `rowId` is the inner row whose
//   front is "-z" or "+z"; `bend` is the other, and the building's id is also listed in that row's `buildings`. It follows; its `partner` is the building that holds the
//   ring-1 corner cell. A bent building anywhere else, or a tight corner not built as an L, fails the stage.
// - **Lead and follow.** Every building of a court part's outer rows leads. Every building of its inner rows follows: its partner building is the building of the mass
//   partners (`CityBuiltCell.partner`) of its cells that are not blind (an L backs onto the two leaders round the ring-1 corner, which M4c ties to one height). In a
//   strip one row leads and the other follows (F1 criterion 4 says which).

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

/** One building (grammar rule 1): 2 to 4 columns of one row, or the 3-cell L at a tight corner (L1), that share one style, one colourway and one floor count. */
export interface CityBuilding {
  /** "<row id>|<i>,<j>", its first cell along the row. */
  readonly id: string;
  readonly block: string;
  readonly part: string;
  /** Its `CityBuildingRow.id`. */
  readonly rowId: string;
  /** As its row's (an L: `rowId`'s row; its `bend` cell fronts the `bend` row's front). */
  readonly row: "outer" | "inner";
  readonly front: CitySide;
  /** Its cells in order along the row, 2 to 4, consecutive. An L: its `rowId` cell, the corner, its `bend` cell (see above). */
  readonly cells: readonly CityCell[];
  /** An L's second row id (the inner row whose front is "-x" or "+x"); null for every straight building. */
  readonly bend: string | null;
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

// ---- stage 5, F2: columns, storeys, pieces, roofs (ticket 070 F2; grammar rules 1, 3, 7 and 11) ----
//
// Typed by the lead-architect before F2 (20 Nov 2026, on Josh's "Go ahead and start f2"). One `CityColumn` per built cell: its kind (the mass's `CityBuiltCell.column`),
// its turn, the ground storey's slot (kind and turn only: the ground piece's key, and so its placement, is stage 7's, H1), each piece above the ground, and its roof.
// - **The turn.** Every storey of a column and its roof take the column's one `yaw` (rule 7: "from the ground to the roof"). A mid column's pieces front its one open side.
//   A corner column's turn is forced (rule 7; measured, 063 E1: a corner piece's second windowed face is its own -x, on the left of its front seen from in front): open sides
//   {+z, -x} are yaw 0 (front +z), {+x, +z} 90 (front +x), {-z, +x} 180 (front -z), {-x, -z} 270 (front -x). A blind column fronts its building's `front` (for the L's
//   corner, the `rowId` row's). Every column is turned by its own open sides, not its building's: the L's `bend` cell fronts the `bend` row.
// - **The pieces.** Storey 0 is the ground (`ground`). Storeys 1 to `storeys - 1` are floor pieces of the building's style: the corner floor on a corner column, the mid
//   floor elsewhere; on a mid or blind column each run of three, from storey 1 up, is one three-storey piece (`floor3`, `Apartment_Stack_*`), as `assembleStack` lays them.
//   Storey k stands at y = 3 k (the style's `pitch_m`: base 3, floor 3); the roof at y = 3 * `storeys`. Then one roof piece of the building's own style (rule 11): the
//   corner roof on a corner column, the mid roof on a mid or blind one.
// - **The placement** (rule 1). A floor piece's body (its `BODY_M` box, from the stage's typed-in kit table) is the cell: its four wall planes on the cell's four edges.
//   A roof's body (its cornice's lowest tier, 0.02 to 0.11 m wider or deeper than 5 m) is seated as 063 E2's `seatOnBody` seats it: its back plane on the cell's back edge,
//   a mid or blind roof centred across, a corner roof's outer flank (the column's `side`) on that edge; what stands past is trim. Nothing is scaled.

/** What a piece above the ground is: one storey's floor, three storeys' floors in one piece (a mid or blind column only), or the roof. */
export type CityPieceRole = "floor" | "floor3" | "roof";

/** One piece of a column, placed (`placement.yaw_deg` is its column's `yaw`). */
export interface CityPiece {
  readonly role: CityPieceRole;
  /** The storey it stands on: 1 to `storeys - 1` for a floor, its lowest for a `floor3`, and `storeys` (its building's) for the roof. */
  readonly storey: number;
  /** The storeys it covers: 1 for a floor, 3 for a `floor3`, 0 for the roof. */
  readonly span: 0 | 1 | 3;
  readonly placement: CityPlacement;
}

/** The ground storey of a column: its kind and turn, the column's (rule 7). Stage 7 (H1) picks its key and places it; stage 5 never does. */
export interface CityGroundSlot {
  readonly kind: CityColumnKind;
  readonly yaw: CityYaw;
  /** Its base, metres: 0. */
  readonly y_m: number;
  /** The top of the storey it fills, metres (the style's `pitch_m.base`, 3): where the first floor piece stands. */
  readonly top_m: number;
}

/** One building column (grammar rule 1): a built cell, its kind, its turn and its pieces from the ground to the roof. */
export interface CityColumn extends CityCell {
  /** Its `CityBuilding.id`. */
  readonly building: string;
  /** The row whose front its pieces show: its building's `rowId`, or for an L's `bend` cell the `bend` row. A blind cell: its building's `rowId`. */
  readonly rowId: string;
  /** As the mass's `CityBuiltCell.column` (R9: a corner is any column with two adjacent open sides). */
  readonly kind: CityColumnKind;
  /** The side its pieces' own +z front faces (see above): a mid column's open side, a corner's forced front, a blind column's building front. */
  readonly front: CitySide;
  /** A corner column's second open side (its pieces' own -x face, and its roof's outer flank); null on a mid or blind column. */
  readonly side: CitySide | null;
  readonly yaw: CityYaw;
  readonly ground: CityGroundSlot;
  /** Its pieces above the ground, bottom up: the floors, then the roof (exactly one, last). */
  readonly pieces: readonly CityPiece[];
}

/** Stage 5: buildings. F1 writes `rows` and `buildings`; F2 adds `columns` (each storey's kind, turn, piece and placement, and the roof pieces). */
export interface CityBuildingsLayer {
  readonly stage: "buildings";
  /** Every row once, in `mass.built` order of its first cell. */
  readonly rows: readonly CityBuildingRow[];
  /** Every building once, row by row in `rows` order, along each row. Every `mass.built` cell is in exactly one. */
  readonly buildings: readonly CityBuilding[];
  /** F2: one column per `mass.built` cell, in `mass.built` order. Optional, as `CityEdgeLayer.ground` was, so F1's layers type-check; from F2 always written. */
  readonly columns?: readonly CityColumn[];
}
/** Stage 6: the circuit. Typed when ticket 059 is re-cut onto the pipeline; until then the layer is empty. */
export interface CityCircuitLayer {
  readonly stage: "circuit";
}

// ---- stage 7, H1: the ground storeys (ticket 070 H1; grammar rules 1, 3, 7 and 9) ----
//
// Typed by the lead-architect before H1 (20 Nov 2026, H1's re-cut against 2d003a5). Stage 5 gave every column a ground slot (`CityColumn.ground`: kind, yaw, base 0, top 3) and no key; stage 7 fills
// every slot with exactly one ground piece, keyed and placed. Nothing here changes a column's kind, turn or storeys, and nothing above the ground storey moves.
// - **Frontage** (rule 9). A mid column's frontage is its one open side's; a corner column's is "street" when either of its two open sides is (rule 7), else "quiet"; a blind column has none (null).
// - **Kinds** (rules 3, 7 and 9). On a street frontage: "shop" (one cell), "shopDouble" (`Shop_03`, two consecutive mid columns of one building along its row), "shopCorner" on a corner, and "door" (the
//   residents' door, at most one per building, never on a corner). On a quiet frontage: no shop; one door per building, "doorCorner" (`Apartment_Door_Corner_01`, `_02`) on a quiet corner or "door" on a
//   mid column; the building's other quiet mid columns take "floor" (its style's mid floor piece) and its other quiet corners "floorCorner" (its style's corner floor piece; H1's reading D1). A blind column
//   takes "floor" (rule 3: "any floor pieces"). No door or door corner on a column with an open side onto a "stalls" cell (Josh's ruling 2, 19 Nov 2026). A quiet building with no door place (no quiet
//   corner and no mid column free of "stalls") has no door at all; it is held to ring 2 (Josh, 20 Nov 2026, H1 pre-check answer 3: "Yez, all three").
// - **The turn.** Every ground piece takes its column's `yaw` (rule 7: corner pieces from the ground to the roof, the forced turn); a "shopDouble" takes the one yaw its two columns share.
// - **The placement** (rule 1; H1's readings S1 and D5). Across, a ground piece's body (from the stage's typed-in ground kit table, the same insets as `BODY_M`) is its cell, or its two cells for a
//   "shopDouble": front-aligned, its front and side planes on the cell edges. Six deep shop keys run back past the back edge, up to 0.6 m into the built partner cell behind (H1 pre-check answer 2).
//   Up, the slot's frame is stage 5's and fixed (base 0, the first floor at `top_m`), and the walk is at y 0; so each piece is set at its own level, the one that puts its door sill nearest the walk while
//   its top neither stops more than 0.01 m short of `top_m` (answer 1) nor rises into the first floor's window sill (062's numbers). Nothing is scaled.

/** What fills a ground slot (see above). */
export type CityGroundPieceKind = "shop" | "shopDouble" | "shopCorner" | "door" | "doorCorner" | "floor" | "floorCorner";

/** One ground-storey piece, placed. */
export interface CityGroundPiece {
  readonly kind: CityGroundPieceKind;
  /** Its `CityBuilding.id`. */
  readonly building: string;
  /** The column it fills, or for a "shopDouble" its two columns, in the building's row order. */
  readonly cells: readonly CityCell[];
  /** Its column's frontage (see above); null on a blind column. A "shopDouble"'s two columns share one. */
  readonly frontage: CityFrontage | null;
  /** `placement.yaw_deg` is its column's `yaw`; `placement.y_m` is its level (S1): 0, or a few centimetres below or above. */
  readonly placement: CityPlacement;
  /** Its door sill's height over the walk, metres (`placement.y_m` plus the key's measured sill); null for a key with no door (`Shop_06`, a floor piece). */
  readonly door_m: number | null;
}

// ---- stage 7, H1b: the shopfront dressing (ticket 070 H1b; grammar rule 9 and M8; the checklist's R4, R5 and R6) ----
//
// Typed by the lead-architect before H1b (21 Nov 2026, H1b's re-cut against 455db33). The tile city's `dressBlock` (src/render3d/dressing.ts) glass, awning, sign and ATM rules, moved onto H1's ground pieces:
// - **A block** (`dressBlock`'s `stack` and `lot`) is one `CityBuilding`: "one awning key for the block", "at most one blade sign" and "at most one ATM per block" are per building. Its bays are its street ground
//   pieces (`shop`, `shopDouble`, `shopCorner`; a street `door` for the ATM), in the building's row order.
// - **A run** (`dressBlock`'s `RunContext`, a terrace run of `city=tiles`) is a chain of row neighbours: consecutive buildings of one `CityBuildingRow` with no opening between them (F1's "row neighbours"), in the
//   row's order. `ATM_PER_RUN` is per run.
// - **Where a piece stands.** Every piece is worked out in its host column's own frame (its front +z, a corner's second face -x, the ground piece's base at 0 and the first floor at `top_m`), as `dressBlock` works
//   in its lot frame, then turned by the column's `yaw` and raised by the ground piece's `y_m` (H1's S1), as 062 B's `liftDressing` raised a lifted ground piece's dressing.
// - **Faces** (M8; H1b's reading X1, for the pre-check). A single-face piece (a flat awning, a fascia sign, a blade sign, an ATM) stands on its column's front, which must be a street open side. A wrap (a corner
//   shop's own glass, the L-shaped awning `Shop_Cover_05`) stands on both open sides of a shop corner that has at least one street open side.

/** What a piece of shopfront dressing is (`dressBlock`'s slots "glass", "awning", "sign" and the ATM's "wall", split the way H1b's checks count them). */
export type CityDressingKind = "glass" | "awning" | "fasciaSign" | "bladeSign" | "atm";

/** One piece of shopfront dressing, placed. */
export interface CityDressingPiece {
  readonly kind: CityDressingKind;
  /** Its `CityBuilding.id`. */
  readonly building: string;
  /** The column it counts against (`dressBlock`'s `column`): its host ground piece's first cell (a "shopDouble"'s first, in row order); an ATM's, its door's. */
  readonly cell: CityCell;
  /** The open side it stands on: always its column's `front` (a wrap stands on the column's `side` as well). */
  readonly face: CitySide;
  /** True for a piece that wraps a corner (a shop corner's glass, the L-shaped awning): placed on its host ground piece's footprint, not on its face. */
  readonly wrap: boolean;
  /** `placement.yaw_deg` is its column's `yaw` (every H1b key's own front is +z); `placement.y_m` already carries the ground piece's `y_m`. */
  readonly placement: CityPlacement;
}

// ---- stage 7, H2 and H2b: the walls (ticket 070 H2: fire escapes and wall props; H2b: the party-wall kit; grammar rules 8 and 9, M7; the checklist's R7; tickets 058 and 061) ----
//
// Typed by the lead-architect before H2 (21 Nov 2026, H2's re-cut against b49a282). Everything a building's walls carry beside its shopfront dressing: the tile city's fire escapes, door canopies, wall
// air-conditioners and window planters (`dressBlock`, src/render3d/dressing.ts; `escapes.ts`), and the party-wall kit that no path has built yet (grammar rule 8, Josh, 19 Nov 2026: "Yes, dress it").
// - **Where a piece stands.** As H1b's dressing: worked out in its host column's own frame (its front +z, the walk at y 0, storey k's floor at 3 k, F2's fixed frame), then turned by the column's `yaw` (a party-wall
//   piece: by the yaw that brings its own +z onto `face`). A canopy rides its door's ground piece (raised by its `y_m`, H1b's L1); an escape and an upper-wall prop ride the floors, which do not move.
// - **Faces.** An escape, a canopy and an upper-wall prop stand on their column's `front`, which is an open side (never a blind column's front, never a party wall). A party-wall piece stands on a side of its column
//   that is not open, above the roof of the lower building across it (H2b; a blind column's windowed front is not a party wall: Josh, 20 Nov 2026, Q20 U1).
// - **An escape** is one piece per storey over the ground (`ESCAPE_FIRST` on storey 1, `ESCAPE_MID` between, `ESCAPE_TOP` on the top storey), each scaled in y so its flight meets the deck above (`scaleY`); the first
//   piece carries the drop ladder's boxes down to the walk. Where the pack's pieces do not fit, the escape is one code-drawn piece (key `code:escape`) whose `boxes` are the whole escape (`codeEscape`).

/** What a wall piece is. H2: "escape", "canopy" (a door canopy), "aircon" and "planter" (the upper-wall props). H2b: the party-wall kit, "partyBoard" (a painted board), "partyPipe" (a pipe run), "partyWindow". */
export type CityWallPieceKind = "escape" | "canopy" | "aircon" | "planter" | "partyBoard" | "partyPipe" | "partyWindow";

/** One box drawn with a wall piece (`escapes.ts`' `EscapePart`), metres, in the piece's own frame at scale 1: its centre, its size, and a turn about the piece's own z (a stringer), radians (0 for every other box). */
export interface CityWallBox {
  readonly kind: "deck" | "rail" | "post" | "stringer" | "tread" | "ladderRail" | "rung";
  readonly x_m: number;
  readonly y_m: number;
  readonly z_m: number;
  readonly w_m: number;
  readonly h_m: number;
  readonly d_m: number;
  readonly rz_rad: number;
}

/** One wall piece, placed. */
export interface CityWallPiece {
  readonly kind: CityWallPieceKind;
  /** Its `CityBuilding.id`. */
  readonly building: string;
  /** The column it stands on (a party-wall piece: the taller column, whose wall it dresses). */
  readonly cell: CityCell;
  /** The side of `cell` it stands on: the column's `front` for H2's kinds; a party wall (a side that is not open) for H2b's. */
  readonly face: CitySide;
  /** The storey it serves: an escape piece the storey whose window it stands under (1 up); a canopy 0; an upper-wall prop the storey it hangs on (2 up); a party-wall piece the lowest storey face it covers. */
  readonly storey: number;
  /** The storey faces it covers: 1, or 2 for a pipe run over a two-storey step (H2b). */
  readonly span: 1 | 2;
  readonly placement: CityPlacement;
  /** Its y-scale about its base: an escape piece's (`planEscape`, within `ESCAPE_SCALE_Y`); 1 for every other piece. */
  readonly scaleY: number;
  /** The boxes drawn with it: the first escape piece's drop ladder, or a code-drawn escape's every part; empty for every other piece. */
  readonly boxes: readonly CityWallBox[];
}

// ---- stage 7, H3: the roofs (ticket 070 H3; grammar rule 11 and M9b; the checklist's R8; ticket 068, Josh, 19 Nov 2026: "roof top exists shouldn't open to the street. They should be on the roof.") ----
//
// Typed by the lead-architect before H3 (21 Nov 2026, H3's re-cut against 4ddae06). The tile city's rooftop items (`dressBlock`'s big roof prop and small roof props, src/render3d/dressing.ts) and 068's roof exit,
// moved onto stage 5's roof pieces. A field of its own, not more kinds in `walls`, so H1b's, H2's and H2b's checks keep reading exactly the lists they read (H2b's PW7 stop is not repeated).
// - **Where a piece stands.** Worked out in its host column's own frame (its front +z, F2's fixed frame: the roof piece's base at 3 x `storeys`), then turned by the column's `yaw` (plus a half-turn where the
//   piece is turned round: a roof exit always, a turnable small prop by hash). Its base stands on the roof's deck, `ROOF_DECK_M` 0.5 over the roof piece's base on every roof key (H3's RT; Josh, 21 Nov 2026,
//   Q24 answer 1), its footprint `ROOF_EDGE_M` inside the cell's edges (rule 11: the body's edge, not the cornice's; the body is the cell, M1), a billboard's `BILLBOARD_EDGE_M` 0.28 (H3's BB, Q24 answer 2).
// - **No novelty sign in H3** (Josh, 21 Nov 2026, Q24: "They can be placed on the face of a build in addition to the roof. They represent the store in the storefront."). H3 writes no "novelty" piece; the kind
//   is kept for section H1c, which places a roof novelty sign over its own shop, on one of that shop's mid columns, as its building's big prop (Q26; the face signs are `CityFacadesLayer.novelty`, below).
// - **Which roofs.** A big piece ("waterTower", "exit", "billboard" with its "billboardFace", "novelty") only on a mid roof (a mid or blind column), at most one big prop a building; "small" pieces on any
//   roof (mid or corner), never on the column that holds the building's big prop.
// - **The roof exit** (M9b). Wholly on its roof; its door (its own +z, H3's reading RD) faces away from every open side of its column, with `ROOF_ACCESS_CLEAR_M` (1.2 m) of clear deck in front of it; on a
//   blind column of its building where it has one, else on a mid column (068's order on cells, H3's reading RX).

/** What a rooftop piece is: a small roof prop (`ROOF_SMALL`), or one of the big ones: the water tower, the roof exit (`SM_Bld_Roof_Access_01`), a billboard's structure and its face (two pieces, one big prop), a novelty sign (H1c's; H3 writes none). */
export type CityRoofPieceKind = "small" | "waterTower" | "exit" | "billboard" | "billboardFace" | "novelty";

/** One rooftop piece, placed. */
export interface CityRoofPiece {
  readonly kind: CityRoofPieceKind;
  /** Its `CityBuilding.id`. */
  readonly building: string;
  /** The column whose roof it stands on. */
  readonly cell: CityCell;
  /** The side of `cell` the piece's own +z faces after its turn: for an exit, its door's side; for a billboard's face, the side it shows. */
  readonly facing: CitySide;
  /** `placement.y_m` is its base, on the roof's deck. */
  readonly placement: CityPlacement;
}

// ---- stage 7, H1c: shop kinds and novelty signs (ticket 070 H1c; Josh, 21 Nov 2026, Q24 and Q26) ----
//
// Typed by the lead-architect before H1c (21 Nov 2026, H1c's re-cut on Josh's "Yes, all four", Q26). Two lists of their own, not fields on `CityGroundPiece` and not more kinds in `dressing`, so H1's, H1b's,
// H2's and H2b's checks and digests read exactly what they read (H2b's PW7 stop is not repeated), and G2 reads `ground` unchanged.
// - **A shop's kind** (Q26 answers 1 and 3). Every shop ground piece ("shop", "shopDouble", "shopCorner") gets one kind, once, in the shopfront pass. Where H1b put a trade sign on it (the fascia or blade sign on
//   its first cell: Bar and Pub give "bar", Cafe "cafe", Chinese_Noodles "noodles", Pizza and DeliPizza "pizza", Barber "barber", Hotel "hotel"), the kind is read from that sign; H1b's signs do not change.
//   Every other shop (no sign, or the plain Entrance sign) gets a kind by the stage's hash, avoiding a kind already used in its building where it can.
// - **Which key stands for which kind** (Q26 answer 2): the facades kit's table (pizza `Pizza_01`; burger `Burger_01`; hot dog `Hotdog_01`; taco `Taco_01`; noodles `Noodles_01`; cafe `Coffee_01`; donut
//   `Donut_01`; ice cream `Icecream_01`, `Milkshake_01`; diner `Milkshake_01`, `Soda_01`; sweets `Popcorn_01`, `Lollypop_01`; bar `Beer_01`, the pint; liquor store `Bottle_01`, the beer bottle; corner store
//   `Bottle_01`, `Soda_01`; music shop `Guitar_01`). Barber and hotel have no key, so such a shop never carries a novelty sign; `BowlingBall_01` and `BowlingPin_01` are never used.
// - **A face sign** (Q26 answer 4, rule F): flat against storey 1's wall (its back on the column's front cell edge), centred over its shop (a "shopDouble" over both columns), its broad side to the street,
//   its base on top of the shopfront's tallest piece on that face (and never under storey 1's base), its top under the roof; on a street front only, never on an escape's column; placed after the roofs, only
//   where its column has room under `DRESS_PER_BAY_MAX`. No bracket. A sign is optional (Josh, 21 Nov 2026: "an added detail"): no share is required anywhere.

/** What a shop sells (Q26). The 14 kinds with a novelty key, then barber and hotel, which H1b's blade signs name and no novelty key shows. */
export type CityShopKind =
  | "pizza"
  | "burger"
  | "hotDog"
  | "taco"
  | "noodles"
  | "cafe"
  | "donut"
  | "iceCream"
  | "diner"
  | "sweets"
  | "bar"
  | "liquorStore"
  | "cornerStore"
  | "musicShop"
  | "barber"
  | "hotel";

/** One shop: a shop ground piece and its kind. */
export interface CityShop {
  /** Its `CityBuilding.id`. */
  readonly building: string;
  /** Its ground piece's `cells` (a "shopDouble": two, in the building's row order). */
  readonly cells: readonly CityCell[];
  readonly kind: CityShopKind;
  /** Where the kind came from: H1b's trade sign on the shop ("sign", with that sign's key in `sign`), or the stage's hash ("hash", `sign` null; the shop has no sign, or the plain Entrance sign). */
  readonly source: "sign" | "hash";
  readonly sign: CalibrationKey | null;
}

/** One novelty sign on a building's face (rule F, above). A roof novelty sign is a `CityRoofPiece` of kind "novelty". */
export interface CityNoveltySign {
  /** Its `CityBuilding.id`. */
  readonly building: string;
  /** The shop it stands for: that shop's first cell (the `CityShop` whose `cells[0]` this is). It counts against this column's `DRESS_PER_BAY_MAX`, as H1b's dressing does. */
  readonly cell: CityCell;
  /** The open side it stands on: always its column's `front`, a street open side. */
  readonly face: CitySide;
  /** Its shop's kind, as `facades.shops` gives it; `placement.key` is one of that kind's keys. */
  readonly kind: CityShopKind;
  /** `placement.yaw_deg` is its column's `yaw`, or a quarter-turn more where the key's broad side is its own x (rule F's "broad side to the street"); `placement.y_m` is its base. */
  readonly placement: CityPlacement;
}

/** Stage 7: facades. H1 writes `ground`; H1b writes `dressing`; H2 and H2b write `walls`; H3 writes `roofs`; H1c writes `shops` and `novelty` (and its roof signs into `roofs`). */
export interface CityFacadesLayer {
  readonly stage: "facades";
  /** H1: one piece per ground slot, every `buildings.columns` entry's slot filled exactly once (a "shopDouble" fills two), in `buildings.columns` order of each piece's first cell. */
  readonly ground: readonly CityGroundPiece[];
  /**
   * H1b: the shopfront dressing, building by building in `buildings.buildings` order, then along the row by column, and in a column in `dressBlock`'s order (glass, awning, blade sign, fascia sign, ATM).
   * Optional only so H1's layers and fixtures (and G2's, which reads `ground` only) type-check; from H1b the stage always writes it.
   */
  readonly dressing?: readonly CityDressingPiece[];
  /**
   * H2 and H2b: the wall pieces, building by building in `buildings.buildings` order; in a building, its escape's pieces bottom up, then its canopies along the row, then its upper-wall props storey by storey and
   * along the row in each (`dressBlock`'s level-then-column loop), then (H2b) its party-wall pieces by column along the row, then by side in the order "+x", "-x", "+z", "-z", then bottom up.
   * Optional only so H1's and H1b's layers and fixtures (and G2's, which reads `ground` only) type-check; from H2 the stage always writes it.
   */
  readonly walls?: readonly CityWallPiece[];
  /**
   * H3: the rooftop pieces, building by building in `buildings.buildings` order; in a building, its big prop first (a billboard: its structure, then its face), then its small props by column along the row,
   * and in a column its first then its second (the left half, then the right, in the column's own frame). Optional only so H1's to H2b's layers and fixtures (and G2's, which reads `ground` only) type-check;
   * from H3 the stage always writes it. From H1c a building's big prop may be a "novelty" sign over one of its shops.
   */
  readonly roofs?: readonly CityRoofPiece[];
  /** H1c: one entry per shop ground piece, in `ground`'s order. Optional only so H1's to H3b's layers and fixtures (and G2's) type-check; from H1c the stage always writes it. */
  readonly shops?: readonly CityShop[];
  /** H1c: the face novelty signs, building by building in `buildings.buildings` order, then along the row by column. Optional as `shops` is; from H1c the stage always writes it (often empty). */
  readonly novelty?: readonly CityNoveltySign[];
}
// ---- stage 8: ground dressing (ticket 070 I; style guide 16.5's furniture, 19.4's greens, 19.6's lanes; grammar rules 5, 9 and 10; the checklist's R10) ----
//
// Typed by the lead-architect before I (21 Nov 2026, I's re-cut against 5b2998c, on Josh's "I think the ground dressing first"). The tile city's ground dressing moved onto the pipeline's cells:
// `furnitureLayout`'s pavement lines and open-lot dressing (src/render3d/furniture.ts), `bayMeters`, `fillGreen`'s trees and benches, and the alley bins (src/render3d/tilecity.ts). A layer of its own: no
// earlier layer changes, and nothing G2 or stage 7 reads changes.
// - **Where a prop stands.** Plan metres on the lattice (cell (i, j) covers x in [i, i+1) * 5 m, z in [j, j+1) * 5 m). `placement` is the key's pivot (its bounds' centre in x and z, its base at y);
//   `placement.y_m` is its base over the top of the surface it stands on (`on`): 0 for every prop but a pole billboard's board (`BILLBOARD_BOARD_LIFT_M`). The assembler (J) sets each surface's drawn level.
// - **Turns.** Every turn is a quarter (`placement.yaw_deg` one of 0, 90, 180, 270), and every key's own front is +z (the tile city's guess; no furniture key is in `BUILDING_FRONTS`), so `size` is the key's
//   bounds with w and d swapped at 90 and 270.
// - **A pavement run** (`CityPavementRun`; the tile city's terrace run, the only pavement `furnitureLayout` furnishes, 16.5): a chain of row neighbours (H1b's run: consecutive buildings of one
//   `CityBuildingRow`, no opening between) on an outer row whose front is a "street" open side onto a street cell, with the pavement cell in front of each of its cells. An edge street's outer side, and
//   the pavement in front of a park, a plaza, a lane mouth, a drive or a frontage lot, is in no run and carries no pavement prop.
// - **No lamp.** Stage 8 places no lamp, pole or light of any kind (16.6: `SM_Prop_LightPole_*` is never used, "a lamp reads as a puzzle lamp"). Street lights and the game's lamps are stage 6's (section K,
//   ticket 059); stage 8 keeps `FURN_KEEP_M` clear of whatever stage 6 places, once `CityCircuitLayer` is typed.

/** What a ground prop is (the tile city's furniture groups, its green props and its lane bins). "lotLines" is a frontage lot's flat `ParkingLines_01` tile. */
export type CityGroundPropKind =
  | "tree"
  | "bench"
  | "bin"
  | "planter"
  | "potPlant"
  | "mailbox"
  | "newspaper"
  | "meter"
  | "hydrant"
  | "busStop"
  | "bollard"
  | "lotLines"
  | "barrier"
  | "lotMeter"
  | "billboardPole"
  | "billboardBoard"
  | "picnicTable"
  | "umbrella"
  | "hotdogStand";

/** What a prop stands on: a pavement run's walk, a green cell (a court part's or a park's), a lane cell, a plaza, a frontage lot. */
export type CityGroundPlace = "pavement" | "green" | "lane" | "plaza" | "frontLot";

/** One pavement run (see above), in the frame `furnitureLayout` uses on the tile city: along the street from `lo_m`, across from the wall edge (`wall_m`) to the kerb edge (`kerb_m`). */
export interface CityPavementRun {
  /** "<street>|<first building id>". */
  readonly id: string;
  readonly street: string;
  readonly block: string;
  /** The block side it fronts: its row's `front`. */
  readonly side: CitySide;
  /** Its `CityBuilding.id`s, in row order. */
  readonly buildings: readonly string[];
  /** Its built cells, in increasing i (a "-z" or "+z" side) or j (a "-x" or "+x" side). */
  readonly cells: readonly CityCell[];
  /** The pavement cell in front of each of `cells`, in the same order. */
  readonly pavement: readonly CityCell[];
  /** Its two ends along the street's axis, metres: the low edge of its first cell and the high edge of its last. */
  readonly lo_m: number;
  readonly hi_m: number;
  /** Across the street's axis, metres: the pavement's wall edge (the built cells' front cell edge) and its kerb edge (`CELL_M` from it, toward the carriageway). */
  readonly wall_m: number;
  readonly kerb_m: number;
}

/** One ground prop, placed. */
export interface CityGroundProp {
  readonly kind: CityGroundPropKind;
  readonly on: CityGroundPlace;
  /** The street block it stands in or in front of. */
  readonly block: string;
  /** What it belongs to: a pavement prop its `CityPavementRun.id`; a lane bin "<block>|<axis>|<at>" (its `CityLane`); a plaza or frontage-lot piece the `CityOpening.id`; a green prop its mass cell's `part`, or its `opening` on a park cell. */
  readonly host: string;
  /** A pavement prop's line ("wall" or "kerb", 16.5); a lane bin "wall" (grammar rule 9: against the wall); null elsewhere. */
  readonly line: "wall" | "kerb" | null;
  /** The cell its pivot stands in. */
  readonly cell: CityCell;
  readonly placement: CityPlacement;
  /** Its extent in plan after the turn (world x and z) and its height, metres: the key's bounds. */
  readonly size: { readonly x_m: number; readonly z_m: number; readonly h_m: number };
  /** True for a flat piece ("lotLines", height under `SLAB_MAX_M`): other props may stand on it. */
  readonly flat: boolean;
}

/** Stage 8: ground dressing. */
export interface CityGroundLayer {
  readonly stage: "ground";
  /** The pavement runs, in `buildings.rows` order, then along each row. */
  readonly runs: readonly CityPavementRun[];
  /**
   * Every prop: the pavement runs' (in `runs` order; in a run its bollards, then its wall line, then its kerb line, each along the run, as `furnitureLayout`, with the meters `bayMeters` drops taken out),
   * then the lane bins (`land.lanes` order, along each lane), then the plazas' and frontage lots' pieces (`mass.openings` order), then the greens' trees and benches (row-major by cell).
   */
  readonly props: readonly CityGroundProp[];
}

// ---- stage 9: traffic control (ticket 070 TR1 and TR1b; Josh, 21 Nov 2026: "we are missing traffic lights and traffic signage. I want you to create a new stage.") ----
//
// Written standalone by the lead-architect before TR1 (21 Nov 2026), so `goal/city-style` keeps type-checking with no stage of this name built. TR1's criterion 0 (the architect,
// on TR1's branch) adds "traffic" to `CITY_STAGES` between "ground" and "assemble", and `traffic: CityTrafficLayer` to `CityLayers`. Until then nothing reads these types.
// - **What stage 9 does.** It reads every layer before it and writes only its own: how each junction is controlled, and the pieces that say so: signal masts with their arms and
//   heads at signal junctions, stop and give-way signs, one-way signs (TR1); parking signs and street-name signs (TR1b). It decides no street, junction, flow, kerb, crossing,
//   arrow or road marking: those are stages 1 and 4's, and E draws them.
// - **Not a puzzle part** (070 Q34, as recommended; the stage is cut on it). No signal is powered, lit or picked; the drawing swaps every emissive material for a dark one (TR2).
// - **Last of the plan stages,** so that it keeps clear of everything placed before it (stage 7's boxes, stage 8's props, stage 6's poles once typed) and no merged layer moves.
// - The rules for which junction gets what, where a piece stands and which way it faces are TR1's (its readings, PROPOSED until the TR pre-check and Josh's answers).

/** How a junction is controlled:
 * - "signals": a signal junction (TR1's SJ);
 * - "allStop": every inbound approach stops (an unsignalled crossroads, TR1's AS);
 * - "stop": a T, where the street that ends stops and the through street does not;
 * - "none": a corner of the city (two edge streets, both ending), or a junction with no inbound approach that must stop. */
export type CityJunctionControl = "signals" | "allStop" | "stop" | "none";

/** What faces an approach's inbound traffic: a signal head, a stop or give-way sign, or nothing ("none": a through arm of a T, or an arm no traffic drives in by). */
export type CityApproachControl = "signal" | "stop" | "giveWay" | "none";

/** One arm of a junction as traffic meets it. Its id is "<junction>|<arm>". */
export interface CityApproach {
  readonly id: string;
  readonly junction: string;
  /** The street the arm is part of. */
  readonly street: string;
  /** The side of the junction square the arm leaves by: one of `CityJunction.arms`. */
  readonly arm: CitySide;
  /** True when traffic on this arm drives into the junction: every two-way arm, and a one-way arm whose `flow` points toward the junction. */
  readonly inbound: boolean;
  readonly control: CityApproachControl;
}

/** One junction's control. */
export interface CityJunctionTraffic {
  readonly junction: string;
  readonly control: CityJunctionControl;
  /** Its arms, in `CityJunction.arms` order. */
  readonly approaches: readonly CityApproach[];
}

/** What a traffic piece is. A signal assembly: "signalMast" (stands on the walk), "signalArm", "signalHead" (faces an approach), "walkHead" (faces along a crossing),
 * "pushButton", and one "signalBox" a junction. Signs, each a pack piece with its own post: "stopSign", "giveWaySign", "oneWaySign" (TR1), "parkingSign" (TR1b).
 * "streetName" (TR1b): a name plate fixed to a mast or a sign post, typed only if TR1b's re-cut finds a plate that stands (Q35). */
export type CityTrafficPieceKind =
  | "signalMast"
  | "signalArm"
  | "signalHead"
  | "walkHead"
  | "pushButton"
  | "signalBox"
  | "stopSign"
  | "giveWaySign"
  | "oneWaySign"
  | "parkingSign"
  | "streetName";

/** One traffic piece, placed. */
export interface CityTrafficPiece {
  readonly kind: CityTrafficPieceKind;
  /** What it belongs to: a junction id for every signal piece and every stop, give-way, one-way and street-name sign; for a parking sign, "<street>|<block>|<i>,<j>", the first cell of
   * the stretch of `CityBayTile`s it marks. */
  readonly host: string;
  /** The `CityApproach.id` whose traffic it faces (a signal head, a stop or give-way sign), or the approach its arm reaches over (a signal arm); null for every other piece. */
  readonly approach: string | null;
  /** The pieces of one assembly share it, "<host>|<n>": a mast with its arm, heads, walk heads and button; a sign post with a street-name plate. A piece on its own has its own group. */
  readonly group: string;
  /** True for the piece of its group that stands on the walk (a mast, a box, a sign with its post); false for a piece fixed to another piece of its group. */
  readonly grounded: boolean;
  /** The street it stands beside, or null for a piece on a pavement corner cell. */
  readonly street: string | null;
  /** The cell its pivot stands over (a grounded piece: a `pavement` or `pavementCorner` edge cell). */
  readonly cell: CityCell;
  readonly placement: CityPlacement;
  /** Its extent in plan after the turn (world x and z) and its height, metres: the key's bounds, as `CityGroundProp.size`. */
  readonly size: { readonly x_m: number; readonly z_m: number; readonly h_m: number };
}

/** Stage 9: traffic control. */
export interface CityTrafficLayer {
  readonly stage: "traffic";
  /** Every junction of `streets.junctions` once, in that order. */
  readonly junctions: readonly CityJunctionTraffic[];
  /** Every piece: junction by junction in `junctions` order (its signal assemblies, each grounded piece first, then its signs), then TR1b's parking signs in `streets.streets` order, along each street. */
  readonly pieces: readonly CityTrafficPiece[];
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
