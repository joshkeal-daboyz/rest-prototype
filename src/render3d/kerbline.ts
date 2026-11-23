/**
 * The kerb line's types (ticket 063 F; Josh, 19 Nov 2026: "It's ok to have curbs that stretch out like this in spots but the curb structures have to follow the crub."). Pure: no three, no DOM, no assets.
 *
 * What the drawing puts on the kerb line, as the pipeline's city (`plan3d.ts`) plans it: every kerb face a pack piece brings with it (a pavement or build-out cell's, at the inset `KERB_FACES_M` measured) and every code-drawn strip
 * (the flanks of build-outs, the returns of inlets, and a fallback strip for a cell with no piece). Each face is a segment in plan, with the way to the walk and the height of its lip.
 * The old tile city's kerb line generator (`kerbLine`, `tileKerbPlan`) went in ticket 081 A1 (070 L2d).
 */

import { KERB_GAP_MAX_M, KERB_HEIGHT_TOL_M, KERB_TOL_M } from "./tileslots";

// The tolerances live in tileslots.ts with the pack's kerb numbers (the style guide's drift test reads that file); the kerb line's users take them from here.
export { KERB_GAP_MAX_M, KERB_HEIGHT_TOL_M, KERB_TOL_M };

/** A point in plan, metres. */
export interface Mp {
  x: number;
  z: number;
}

/** One kerb face the drawing puts on the line: a pack piece's own (`pack`) or a code-drawn strip (`code`). */
export interface KerbFace {
  kind: "pack" | "code";
  part: "edge" | "dip" | "flank" | "return";
  /** The face's two ends in plan, metres. */
  a: Mp;
  b: Mp;
  /** The unit vector from the face toward the walk (where a code strip's lip lies). */
  walk: Mp;
  /** The top of the face's lip above the carriageway, metres. */
  top_m: number;
  /** How far inside its line the face stands: the piece's measured inset, 0 for a flank's and a return's strips along their own line. */
  inset_m: number;
  /** The cell the face belongs to (a pack piece's, or a fallback strip's), null for a flank or a return. */
  cell: { i: number; j: number } | null;
}

export interface KerbPlan {
  faces: readonly KerbFace[];
}
