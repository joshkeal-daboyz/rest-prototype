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
/** CK9: a drop meets the wall at this height, metres (Josh, 21 Nov 2026, question 5: the clashes are left in). */
export const DROP_WALL_Y_M = 5.5;
/** CK9 (proposed): no drop is longer than this in plan. */
export const DROP_MAX_M = 7.5;
/** CK9 as changed (081 K2e; Josh, 24 Nov 2026, "Every building wired"): a drop across a street from the facing pole line is no longer than this in plan (the note's longest is 23.03 m). */
export const DROP_CROSS_MAX_M = 23.5;
/** CK10 (059's number): no street light stands within this of any pole. */
export const LIGHT_POLE_MIN_M = 3;
/** CK11 (proposed): an along span offers a lamp post at its midpoint only when it is at least this long. */
export const POST_MIN_SPAN_M = 7.5;
/** The tolerance every length is compared with. */
export const TOL = 0.01;

// ---- K2d1: CK7 and CK17 (`docs/design/081-B1-roof-spans.md`, B1b's numbers) ----

/** CK7 (Josh, 21 Nov 2026, K1 card 7: "The walk's 4.2 m (Recommended)"): a span's lowest point, `FURN_MAX_H_M` 3.2 m + 1 m (`src/city/ground/constants.ts`). */
export const WALK_FLOOR_M = 4.2;
/** Every span hangs at this fraction of its length (059's figure; `SAG_RATIO` in `src/render3d/powerkit.test.ts` line 60, and `powerkit.ts`'s `sag` comment). */
export const SAG_RATIO = 0.04;
/** CK17a: the deck is the roof piece's base plus this (`ROOF_DECK_M` in `src/city/facades/roofkit.ts` line 51; stage 7 comes after stage 6, so it is copied, not imported). */
export const ROOF_DECK_M = 0.5;
/** CK17a: a roof structure's point stands this far in from each street wall of its roof. */
export const ROOF_MAST_INSET_M = 0.6;
/** CK17a: a roof end is judged at the deck plus this (the pick has no cross-arm; a higher arm only raises a span). */
export const ROOF_MAST_ATTACH_MIN_M = 2.0;
/** CK17a: the half-width of a roof structure's keep square. */
export const ROOF_MAST_KEEP_M = 1.2;
/** CK17b: no roof span is longer than this, in plan. */
export const ROOF_SPAN_MAX_M = 40;
/** CK17d: over a junction's zone a roof span keeps this height (stage 9's signal mast 6.48 m + 1 m). */
export const ROOF_JUNCTION_FLOOR_M = 7.5;
/** CK17d: where a roof span passes over a pole span, or near a pole, light or post place in plan, it keeps this clear. */
export const ROOF_CLEAR_M = 1.0;
