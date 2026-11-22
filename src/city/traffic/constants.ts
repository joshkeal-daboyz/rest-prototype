/**
 * Stage 9, traffic control: every number the stage uses (ticket 070 TR1; R-6). The four of Josh's (Q43) carry his answer; the two copied from stage 8 are pinned equal to ground's by `src/render3d/trafficpin.test.ts`.
 */

/** One lattice cell, metres (grammar: 5 m). */
export const CELL_M = 5;

// ---- Josh's, Q43 (21 Nov 2026, in chat: "I will take all of the recommendations") ----
/** A stop sign's post stands this far in from its cell's kerb-side edge (Q43: stage 8's own kerb line, `FURN_KERB_M`). */
export const SIGN_KERB_M = 0.5;
/** A stop sign's post stands this far from the cell's end that touches the corner (Q43). */
export const SIGN_CORNER_M = 1.0;
/** A signal mast's axis stands this far in from each of its corner cell's two kerb edges (Q43; the cell's kerb corner is the corner point nearest the junction's carriageway). */
export const MAST_INSET_M = 0.75;
/** No signal head's lowest point is lower than this above the carriageway (Q43: the US 15 ft clearance under a head). */
export const SIGNAL_HEAD_MIN_M = 4.6;

// ---- ground's, copied (R-6; pinned equal) ----
/** Clear space between two footprints, metres. Stage 8's `FURN_GAP_M`. */
export const FURN_GAP_M = 0.3;
/** The keep-out round a point stage 6 places. Stage 8's `FURN_KEEP_M`. */
export const FURN_KEEP_M = 1.5;
/** A build-out tree's clear distance from a grounded piece's footprint (the builder's reading of CL's "clear of the build-out trees": the same keep-out as a stage 6 point). */
export const TREE_CLEAR_M = FURN_KEEP_M;

/** A tolerance on exact comparisons, metres. */
export const EPS = 1e-9;
/** A tolerance on overlap and containment tests: footprints that only touch do not overlap. */
export const TOL = 1e-6;
