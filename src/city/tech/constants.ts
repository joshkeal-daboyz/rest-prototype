/**
 * Stage 11's named numbers (ticket 073 D1; the D1 pre-check's rule DT and its answers D1-Q1 to D1-Q6, taken on Josh's delegation, 21 Nov 2026; Josh may reverse).
 * Nothing here names a block, a lattice size or a count (X-6, R-7). The tech pass keeps stage 8's own numbers for the pavement (rule 10); they are copied here because this folder imports no stage folder (R-1).
 */

/** One lattice cell, metres. */
export const CELL_M = 5;
/** A storey's height, metres (the buildings style's pitch). Storey k stands at y = 3 k. */
export const STOREY_M = 3;
/** A storey face is cut into this many equal parts. */
export const THIRDS = 3;
/** One third of a face, metres. */
export const THIRD_M = CELL_M / THIRDS;

// ---- DT: the density rule (D1-Q1) ----
/** Each storey face's free third takes a small bolt-on with this chance times the district's `tech`. */
export const P_BOLT_ON = 0.3;
/** Each free bare side wall takes a tall piece with this chance times `tech`. */
export const P_TALL = 0.3;
/** Each storey 1 street face's free third takes a sign (tried before a bolt-on) with this chance times `tech`, from `SIGN_FROM_TECH`. */
export const P_SIGN = 0.3;
/** Each pavement place takes a piece with this chance times `tech`, from `SIGN_FROM_TECH`. */
export const P_PAVEMENT = 0.5;
/** Each eligible shop takes a shopfront with this chance times `tech`, from `SHOPFRONT_FROM_TECH`. */
export const P_SHOPFRONT = 0.5;
/** The two band edges: signs and pavement pieces from a third, shopfronts from two thirds. */
export const SIGN_FROM_TECH = 1 / 3;
export const SHOPFRONT_FROM_TECH = 2 / 3;
/** On storey 1, this share of the small bolt-ons is a camera (one in four). */
export const CAMERA_SHARE = 0.25;

/**
 * D1-Q2: the shopfront rule is behind this one constant. With it false the top band adds no shopfront and lists no change, so it adds nothing over the middle band. It exists so the shopfronts can be switched off
 * if the drawn street-level picture (D1g criterion 6) shows the panel's partly faced end as a loose panel. A test sets it through `TechOptions.shopfronts`, never by editing this file.
 */
export const TECH_SHOPFRONTS = true;

// ---- the walls ----
/** A third is free when nothing of stage 7 enters a box over it this far out from the wall, over the whole storey. */
export const WALL_ZONE_M = 1.5;
/** The base of a small bolt-on over its storey's floor. */
export const BOLT_ON_BASE_M = 0.8;
/** The base of a camera over its storey's floor: about 4 m up on storey 1 (the images, 073-pack-intended-use). */
export const CAMERA_BASE_M = 1.2;
/** The base of a sign over its storey's floor (above the ground storey's shopfront). */
export const SIGN_BASE_M = 0.35;
/** A tall piece stands on its storey's floor, or (the first storey over a lower neighbour's roof) on that roof's deck. */
export const TALL_BASE_M = 0;
/** The deck's height over a roof piece's base (stage 7's `ROOF_DECK_M`). */
export const ROOF_DECK_M = 0.5;

// ---- the shopfront (D1-Q2) ----
/** The added panel's depth, and how far it stands out from the old shop's front wall (the key's own depth). */
export const SHOP_OUT_M = 0.709;
/** The dressing below this height on a shop's face goes with the panel's cover. The panel's top is 3.0 m. */
export const SHOP_COVER_M = 3;

// ---- the pavement (X-3: the tech pass keeps rule 10; D1-Q4 and D1-Q6) ----
/** `furniture.ts` FURN_KERB_M: a kerb-line item's front stands this far in from the kerb edge. */
export const FURN_KERB_M = 0.5;
/** `furniture.ts` FURN_WALL_M: a wall-line item's back stands this far out from the wall edge. */
export const FURN_WALL_M = 0.4;
/** Items on one line are at least this far apart, centre to centre (stage 8's and the pass's own). */
export const FURN_PITCH_M = 7;
/** The keep-out round a kerb cut, a corner cell, a dip, a pole, a street light and a lamp-post place (D1-Q6). */
export const FURN_KEEP_M = 1.5;
/** Nothing stands within this of a run's ends. */
export const FURN_CORNER_M = 4;
/** An item taller than this keeps clear of wire spans. */
export const FURN_MAX_H_M = 3.2;
/** Clear space between two items' footprints, metres. */
export const FURN_GAP_M = 0.3;
/** D1-Q4: at least this much clear walk beside a pavement piece, counting stage 8's pieces, the pass's other pavement pieces and its shopfront panels. */
export const CLEAR_WALK_M = 2;
/** A piece taller than `FURN_MAX_H_M` stays this far (plan distance, footprint to span) from a pole line's span. */
export const SPAN_CLEAR_M = 0.5;
/** The pavement slots along a line are this far apart (the pitch), and a slot tries places up to this far either side of its centre, in `SLOT_STEP_M` steps. */
export const SLOT_PITCH_M = FURN_PITCH_M;
export const SLOT_REACH_M = 3;
export const SLOT_STEP_M = 0.5;

/** A tolerance on exact comparisons, metres. */
export const EPS = 1e-9;
/** A tolerance on overlap tests: two footprints that only touch do not overlap. */
export const TOL = 1e-6;
