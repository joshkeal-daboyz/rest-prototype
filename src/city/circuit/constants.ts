/**
 * Stage 6, the circuit: every number the stage uses (ticket 081 K2a; the rules are 070 K1's CK1 to CK8, `docs/design/070-K1-circuit.md`).
 */

/** One lattice cell, metres (grammar: 5 m). */
export const CELL_M = 5;

/** CK2 (Josh, 21 Nov 2026, "Keep 2.5 m (Recommended)"): the end slots stand this far in from each end of a block side's span. */
export const POLE_END_CLEAR_M = 2.5;
/** CK2 (proposed): between fixed points, slots are laid at an even pitch no longer than this. */
export const POLE_PITCH_M = 12.5;
/** CK2: a slot stands this far from the carriageway's edge, onto the pavement (the old rule's number). */
export const POLE_FROM_KERB_M = 0.75;
/** CK2 (proposed): a slot on a forbidden cell moves along the pavement in steps of this. */
export const POLE_NUDGE_M = 0.5;
/** CK2 (proposed): no along span is longer than this. */
export const SPAN_ALONG_MAX_M = 20;
/** CK5: every corner span, (2.5 + 4.25) x sqrt 2. */
export const CORNER_SPAN_M = 9.55;
/** The tolerance every length is compared with. */
export const TOL = 0.01;
