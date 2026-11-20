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
 * Layers 1 to 3 are typed here in full. Layers 4 to 8 are typed by the architect before their sections of ticket 070 start; until then each is a stub
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
  /** The centre line, same coordinate. */
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

export interface CityStreetsLayer {
  readonly stage: "streets";
  /** The lattice, in cells. */
  readonly w: number;
  readonly h: number;
  readonly streets: readonly CityStreet[];
  /** Every street cell once. A cell not listed is inside a block. */
  readonly cells: readonly CityStreetCell[];
  readonly blocks: readonly CityBlock[];
  /** The block sizes in cells, and the draw that gave them (null: the fallback lists). */
  readonly sizes: { readonly widths: readonly number[]; readonly depths: readonly number[]; readonly draw: number | null };
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
  /** Where the first pass laid its first tile: on its own band, on the band across a street, or nowhere (no band could take one). */
  readonly first: "own" | "across" | null;
  /** Tiles of its quota no band could take (the old path's `shortTiles`): 0 when served in full. P1 reads it from here. */
  readonly shortTiles: number;
}

/**
 * One street piece as the assembler draws it: the same fields as the old tile city's `TileCell` (src/render3d/tilecity.ts), so `tilecity3d.ts` draws it unchanged.
 * Written by section D2 (variants, yaws, the kerb returns); D1 leaves `CityEdgeLayer.ground` absent.
 */
export interface CityGroundCell extends CityCell {
  /** 2 for a `ParkingLines_01` tile (its first cell is `i`, `j`), else 1. */
  readonly cells: 1 | 2;
  readonly role: CityEdgeRole;
  /** Which model of the role's set; 0 for a role with one model. */
  readonly variant: number;
  /** The piece's centre, metres. */
  readonly x_m: number;
  readonly z_m: number;
  readonly yaw: CityYaw;
  readonly street: string | null;
}

/** Stage 4: the street edge. D1 writes the parking band and the kerb cuts; D2 adds the kerb line (typed by the architect before D2) and `ground`. */
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
  /** The drawn street pieces: absent until section D2 fills it. */
  readonly ground?: readonly CityGroundCell[];
}
/** Stage 5: buildings. Typed before section F1. */
export interface CityBuildingsLayer {
  readonly stage: "buildings";
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
