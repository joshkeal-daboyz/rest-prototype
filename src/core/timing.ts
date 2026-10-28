/**
 * The blown-fuse sequence, seconds from the `fuse:blown` event (ticket 016). Shared by src/render/shock.ts
 * (the picture) and src/audio (the sound) so the two can't drift (ticket 019). Values only.
 */
export const BLOW_TIMING = {
  /** Streaks run fuse -> lamps, from 0. */
  run: 0.4,
  /** Every path line glows, from `run`. */
  glow: 0.3,
  /** Every lamp sparks, from this time. */
  sparkAt: 0.5,
  /** How long the lamp sparks last. */
  spark: 0.3,
  /** The fuse pops (= run + glow). With no path the pop is at 0 instead. */
  popAt: 0.7,
  /** How long the pop lasts. */
  pop: 0.6,
} as const;

export type BlowTiming = typeof BLOW_TIMING;
