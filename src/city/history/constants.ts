/**
 * Stage 10's named numbers (ticket 073 B; the district rule and the story rule are the B pre-check's rule A and section 3, answered on Josh's delegation, B-Q1 and B-Q2, 21 Nov 2026 night; Josh may reverse).
 * Nothing here names a block, a lattice size or a count (R-7, X-6).
 */

/** The district size draw: a block's hashed fraction u picks 1 block below the first edge, 2 below the second, 3 below the third, else 4 (20%, 30%, 25%, 25%). */
export const SIZE_EDGES: readonly [number, number, number] = [0.2, 0.5, 0.75];
export const DISTRICT_MAX_BLOCKS = 4;

/** `tech` is 1 - step / (most steps + 1), moved by up to this much either way by hash. */
export const TECH_JITTER = 0.1;
/** Below this hashed fraction a district was left at once: `held` 0, no plant, its feed a pole just outside it (Q11, Josh). */
export const HELD_NONE_BELOW = 0.25;
/** `wild` is 1 - `held`, moved by up to this much either way by hash. */
export const WILD_JITTER = 0.15;
/** Every story value is rounded to this many decimals (here 2) and clamped to 0 to 1. */
export const STORY_DECIMALS = 2;
