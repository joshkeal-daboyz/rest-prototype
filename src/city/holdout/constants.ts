/**
 * Stage 12, section E2: the hold-out's named numbers (ticket 073 E2; the density HD, answered E2-Q1 on the Fable session's delegation, 22 Nov 2026; Josh may reverse). One file, so a number that moves is one edit.
 * Every chance is a share of the district's `held` (X-6): the same district with a higher `held` never gets a lower chance.
 */

/** A lattice cell is 5 m (the streets' lattice). */
export const CELL_M = 5;

// ---- the density bands (by `held`) ----
/** From this `held` the market stalls, the court water towers and the barricades begin. */
export const BAND_MID = 1 / 3;
/** From this `held` the parks become farms. */
export const BAND_HIGH = 2 / 3;

// ---- the chances: a share of `held` ----
/** Clutter in a pavement cell fronting a held block: chance `P_CLUTTER x held`. */
export const P_CLUTTER = 0.3;
/** A container in a court stall or a kerb bay: chance `P_CONTAINER x held`. */
export const P_CONTAINER = 0.5;
/** A roof item in a free roof spot: chance `P_ROOF x held`. */
export const P_ROOF = 0.085;
/** A barricade on a street mouth (not the district's hashed-first): chance `P_BARRICADE x held`. */
export const P_BARRICADE = 0.5;

// ---- how many tries a place gets (fixed numbers, never scaled by `held`) ----
/** A court or park is filled with at most this many camp attempts, each with `TRIES` hashed positions. */
export const CAMP_ATTEMPTS = 16;
export const TRIES = 24;
/** Positions tried for a court's water tower. */
export const TOWER_TRIES = 48;
/** Farm pieces tried in a park. */
export const FARM_ATTEMPTS = 6;
/** Positions tried for a market stall in a plaza or front lot; the one that removes the fewest props wins. */
export const STALL_TRIES = 24;
/** Positions tried for a clutter piece in a pavement cell. */
export const CLUTTER_TRIES = 8;
/** Positions tried for a roof item on a deck. */
export const ROOF_TRIES = 12;
/** Roof items on one column at most (B10). */
export const ROOF_PER_COLUMN_MAX = 1;

// ---- the gaps, metres ----
/** A camp stands this far off any building. */
export const CAMP_BUILDING_GAP_M = 1;
/** Camps (and a water tower) stand this far apart. */
export const CAMP_GAP_M = 1.5;
/** Every ground piece stands this far clear of a clean piece (a tree, a bench, a prop, a traffic piece). */
export const CLEAN_GAP_M = 0.3;
/** A piece stands this far from a pole, a street light or a lamp-post place (T-1 reads 0.15; this keeps clear of it, and "beside a pole" stays allowed: B7). */
export const CIRCUIT_CLEAR_M = 0.2;
/** A clutter piece stands this far inside its pavement cell's edge. */
export const CELL_INSET_M = 0.2;
/** A clutter piece keeps its pavement cell's middle clear (T-2 closes a cell whose middle a ground piece covers). */
export const CENTRE_CLEAR_M = 0.05;
/** A roof item stands this far clear of H3's roof pieces and of the other items on its deck. */
export const ROOF_GAP_M = 0.1;
/** Rule 11 / H3's RE: a roof item stands this far inside the cell's edge. */
export const ROOF_EDGE_M = 0.3;
/** RT (H3): a roof item's base stands this far over the roof piece's base. */
export const ROOF_DECK_M = 0.5;
/** Farm fields stand this far apart. */
export const FARM_GAP_M = 1;

// ---- bays ----
/** A parking tile is 2 cells and holds 3 bays. */
export const BAYS_PER_TILE = 3;
