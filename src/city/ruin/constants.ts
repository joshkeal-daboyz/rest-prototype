/**
 * Stage 13, section F1: the ruin's growth, its named numbers and its switches (ticket 073 F1; the growth GD, answered F1-Q3 on the Fable session's delegation, 22 Nov 2026; Josh may reverse).
 * One file, so a number that moves is one edit. Every chance is a share of the district's `wild` (X-6): the same district with a higher `wild` never gets a lower chance.
 */

/** A lattice cell is 5 m (the streets' lattice). */
export const CELL_M = 5;

// ---- the switches (each exported, each tested both ways) ----

/**
 * HELD FOR JOSH (F1-Q5; B10). Growth on roofs (`Env_Overgrowth_*`, bushes, dead trees) is many more roof items, and B10 is Josh's for the tech and hold-out passes only. Off as built: the layer has no
 * `roof` add. On (his word, then this one line and a re-pin), the slot places as the ticket says.
 */
export const RUIN_ROOF_GROWTH = false;
/** Only with `RUIN_ROOF_GROWTH` on: `Tree_Dead_01/02` on roofs. False drops the dead trees and keeps the bushes (the main session's call from the street picture, F3). */
export const RUIN_ROOF_DEAD_TREES = true;
/**
 * HELD FOR JOSH (F1-Q1, way-out (b)). The spots whose crown meets a span and is otherwise clear are computed every run (`underSpanSpots`) and not placed. True places them; against today's T-1 the stage
 * then throws, so true is only for after T-1's own change (C1's, for Josh).
 */
export const RUIN_TREES_UNDER_SPANS = false;
/** `Env_Vines_06` on traffic posts (posts only). False drops it: if F3's picture shows it as a flat sheet, the ruin-pass's one line and a re-pin. */
export const RUIN_VINE_06 = true;

// ---- the spread ----
/** Growth spreads `round(wild x REACH_FACTOR)` cells (half up) from each soil cell. A district under 1/6 rounds to 0 and grows nothing. */
export const REACH_FACTOR = 3;

// ---- the chances: a share of `wild` ----
/** A clump on a grown pavement cell. */
export const P_CLUMP = 0.6;
/** A sapling on an eligible grown cell. */
export const P_SAPLING = 0.3;
/** A roof piece on a roof spot (only with `RUIN_ROOF_GROWTH`). */
export const P_ROOF = 0.3;
/** A vine on a free slot, and a tree-vine on a standing tree (the architect's starting values: the pre-check measured the slots, not a chance; reported). */
export const P_VINE = 0.3;
export const P_TREE_VINE = 0.3;

// ---- the bands ----
/** From this `wild` each park gets its `Tree_Generic_Giant_01` and `Tree_Large_01`. */
export const BAND_PARK_TREES = 1 / 3;

// ---- tries: fixed numbers, never scaled by `wild` ----
export const PATCH_TRIES = 8;
export const CLUMP_TRIES = 6;
export const PARK_TREE_TRIES = 24;
export const VINE_TRIES = 6;
export const ROOF_TRIES = 10;
/** Roof pieces on one column at most. */
export const ROOF_PER_COLUMN_MAX = 2;

// ---- the gaps, metres ----
/** Every add stands this far clear of every standing piece (a patch may lie up to one, never under one). */
export const CLEAR_M = 0.3;
/** A piece keeps this far clear of a pole, a street light, a lamp-post place or a drop's first stretch (T-1 reads 0.15; this keeps clear of it, so a piece that passes here passes the check). */
export const CIRCUIT_MARGIN_M = 0.2;
/** A tree's crown (T-1's disc) keeps this far past T-1's reading from a point or a span. */
export const CROWN_MARGIN_M = 0.05;
/** A post vine keeps this far clear of any circuit point (never on a pole, a light or a lamp post). */
export const POST_VINE_MARGIN_M = 0.5;
/** H3's RE and RT (the roof deck): the cell less this on every side; the deck is this high over the roof piece's base. */
export const ROOF_EDGE_M = 0.3;
export const ROOF_DECK_M = 0.5;
/** A roof piece stands this far clear of H3's pieces and of its own. */
export const ROOF_GAP_M = 0.1;
/** A ground cover piece under this height is flat enough for a crossing. */
export const FLAT_COVER_MAX_H_M = 0.15;
/** A hanging tree-vine's top is this share of its tree's height. */
export const TREE_VINE_TOP = 0.85;
