/**
 * The shared kit's units, types and ground heights (ticket 081 A2a). Moved here unchanged from the ladder town's files (`town.ts`, `terrace.ts`, `scene.ts`,
 * `layout.ts`, `streetcam.ts`) so the kept files read them from one place and the ladder can be deleted. No three, no DOM, no other render3d value: pure data and types.
 */

import type { StackAlign } from "./stacks";

// ---- from town.ts ----
/** World units per metre of a building: a 1.6-unit pole is about 9 m. (models.ts holds the same number; a test keeps them equal.) */
export const WORLD_PER_METRE = 0.18;
export const ROAD_W = 1.1;
export const KERB_H = 0.03;
export const PAVE_W = 0.45;
/** A lot's front edge stands this far outside its pavement's outer edge. */
export const SETBACK = 0.15;
/** A lot keeps this far (horizontally) from every wire. */
export const WIRE_CLEAR = 0.25;
export const STOREY_M = 3.2;
/** A terrace lot is one bay deep, metres, like 050's stacks. */
export const TERRACE_DEPTH_M = 6;
/** An open lot for parked cars: one per run of at least `PARKING_MIN_RUN_BAYS` bays, where `stableHash(run id) % PARKING_ONE_IN === 0`. Metres. */
export const PARKING_W_M = 10;
export const PARKING_D_M = 10;
/** A corner plaza (metres square) takes one row's corner in one outer block in `PLAZA_ONE_IN`, by `stableHash(block id)`. */
export const PLAZA_W_M = 10.4;
export type LotType = "small" | "house" | "large" | "tall";
export interface LotSpec {
  /** Metres along the road. */
  frontage: number;
  /** Metres away from the road. */
  depth: number;
  /** Height cap, metres. */
  cap: number;
}
export const LOT_TYPES: Readonly<Record<LotType, LotSpec>> = {
  small: { frontage: 12, depth: 13, cap: 12 },
  house: { frontage: 16, depth: 19, cap: 15 },
  large: { frontage: 25, depth: 28, cap: 16 },
  tall: { frontage: 14, depth: 16, cap: 28 },
};
export const LOT_TYPE_NAMES: readonly LotType[] = ["small", "house", "large", "tall"];
export interface Pt {
  x: number;
  z: number;
}
export interface Lot {
  /** Centre. */
  x: number;
  z: number;
  /** Frontage (along the road) and depth (away from it), world units. */
  w: number;
  d: number;
  /** Turn about y that points the lot's local +z (its front) at the road. */
  yaw: number;
  type: LotType;
  /** Height cap, world units. */
  hMax: number;
  /** Unique and stable: road id, side, slot. */
  key: string;
  /** The road it faces. */
  street: string;
  side: 1 | -1;
  /**
   * A corner lot (ticket 042 A, Josh's rule of 17 Nov 2026): a side edge of the lot meets another road, so `cornerSides` is not empty. A row end that
   * meets no other road is not a corner. Always `cornerSides.length > 0`. A corner shop (a model with two frontages) only stands on one of these.
   */
  corner: boolean;
  /**
   * Each side of the lot (its own frame: "+x" is `(cos yaw, -sin yaw)` in the world) whose edge lies within `CORNER_GAP` of another road's (not its own
   * road's) pavement, with that cross road's id. The road's centreline must also lie toward that side (within `CORNER_ANGLE_MAX` of its outward axis).
   * A side with two cross roads has two entries.
   */
  cornerSides: readonly CornerSide[];
  /** Set on a terrace lot (ticket 051 B): the run it stands in, its place in it, and how many bays wide it is. Its `type` is "large" and its `hMax` one of `TERRACE_CAPS_M`. */
  terrace?: { run: string; index: number; bays: number };
}
/** One side of a lot that meets a cross road. */
export interface CornerSide {
  side: "+x" | "-x";
  /** The id of the cross road. */
  road: string;
}
/**
 * A run of abutting terrace lots along one row of an outer block (ticket 051 B). `(ax, az)` is where the run starts on the row's front line (the lots'
 * front edge) and `(ux, uz)` the unit direction along it; `len` is how far the run may go before its far end (the next row's corner block, a plaza,
 * a parking lot, or the last lot that cleared). The nominal lots fill `len` to within one bay: the far gap is left for the packer (051 C).
 */
export interface TerraceRun {
  id: string;
  /** The outer block it stands in. */
  block: string;
  /** The road it faces, and which side of that road's line. */
  road: string;
  side: 1 | -1;
  /** Indices into `lots`, in order along the run. */
  lots: readonly number[];
  ax: number;
  az: number;
  ux: number;
  uz: number;
  len: number;
  /** The corner side of its first lot at the run's start (a corner block turns there), or null (a plaza, a clearance gap or no cross road at the start). */
  startCorner: CornerSide | null;
  /** What stops the run at its far end: the next row's corner block, a plaza, a parking lot, or "end" (the next slot cleared no height cap). */
  endAbuts: "corner" | "plaza" | "parking" | "end";
  /**
   * The run's pavement frame, metres from its front line toward the road (ticket 055 B): where the pavement's wall edge is and where its kerb is. Absent on every ladder
   * run, which means today's `SETBACK / WORLD_PER_METRE` and `(PAVE_W + SETBACK) / WORLD_PER_METRE` (`WALL_EDGE_M` and `KERB_M` in furniture.ts). The tile city's runs
   * stand on a 5 m pavement with no setback: `{ wall_m: 0, kerb_m: 5 }`.
   */
  frame?: { readonly wall_m: number; readonly kerb_m: number };
}
/** Open ground in a terrace row, where no building stands (052 C dresses it). It is never in `Town.lots`. */
export interface OpenLot {
  kind: "parking" | "plaza";
  /** The run it ends (parking) or the run that starts after it (plaza). */
  run: string;
  x: number;
  z: number;
  w: number;
  d: number;
  yaw: number;
}

// ---- from terrace.ts ----
/** The most a run's far end may be left short of its far wall, metres, to count as closed. */
export const TERRACE_SEAM_M = 0.1;
/** The alley a far gap aims for when the pieces cannot close it to the seam, metres: wide enough to read as a way between blocks, never a slit. */
export const ALLEY_MIN_M = 1.0;
export const ALLEY_MAX_M = 1.5;
/**
 * The alignment a run's stacks take when the caller does not say (ticket 057 A): "wall" for a run with a pavement `frame` (the tile city's; its front line is the pavement's back
 * edge, and its buildings stand on the pavement or just over it), "back" for the ladder's runs, which have none, so every ladder stack is as it was.
 */
export const alignOf = (run: Pick<TerraceRun, "frame">): StackAlign => (run.frame ? "wall" : "back");

// ---- from scene.ts ----
export const GROUND = 0x0e131d;
/** Yard ground: the open ground inside a city block, a little lighter than the town's dark edge. */
export const YARD = 0x141c29;
/** Asphalt. */
export const STREET = 0x1a2331;
/** Pavement: mid-grey, lighter than the asphalt so a street reads as a road between two pavements. */
export const PAVEMENT = 0x3d4658;
/** The kerb lip: pale. */
export const KERB = 0x9aa4b6;
/** Heights (world units) of the ground layers, bottom to top. The wires' shadows (SHADOW_Y 0.025) and the pole feet (0.022) sit above all of them. */
export const YARD_H = 0.004;
export const PAVEMENT_Y = 0.008;

// ---- from layout.ts ----
export const POLE_HEIGHT = 1.6;
/**
 * A line's pick target (along its centre conductor) reaches this far (world units). At least PHASE_OFFSET + WIRE_RADIUS + 0.03,
 * so a click on any of the three conductors picks the line.
 */
export const WIRE_PICK_RADIUS = 0.3;
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ---- from streetcam.ts ----
/** How far back from the row's front line the eye would stand at most, metres. A town road with its two pavements is about 12 m wide, so the eye ends on the far pavement. */
export const STREET_CAM_BACK_M = 26;
export const STREET_CAM_EYE_M = 9;
/** The look point stands this high on the front line, metres. */
export const STREET_CAM_LOOK_M = 6;
/** The lens opens from this (vertical, degrees) up to `STREET_CAM_FOV_MAX_DEG` until three whole lots fit the frame. */
export const STREET_CAM_FOV_DEG = 50;
