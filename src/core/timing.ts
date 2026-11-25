/**
 * The blown-fuse sequence, seconds from the `fuse:blown` event (ticket 016). Shared by src/render/shock.ts
 * (the picture) and src/audio (the sound) so the two can't drift (ticket 019). Values only.
 *
 * Slowed 25 Nov 2026 (ticket 081 FX4; Josh, after playing FX4: "The electrical current back to the breaker isn't obvious enough"; on cards "Slow it down" and
 * "About 1.5 s (Recommended)"): the bolt reaches the fuse, and the fuse pops, at 1.5 s, not 0.7 s. Only `run`, `glow` and `popAt` changed; the lamp sparks and the pop keep their 016 times.
 */
export const BLOW_TIMING = {
  /** The streak runs from 0 (on the city, FX4's bolt, lamps -> fuse). */
  run: 1.1,
  /** Every path line glows, from `run`. */
  glow: 0.4,
  /** Every lamp sparks, from this time. */
  sparkAt: 0.5,
  /** How long the lamp sparks last. */
  spark: 0.3,
  /** The fuse pops (= run + glow). With no path the pop is at 0 instead. */
  popAt: 1.5,
  /** How long the pop lasts. */
  pop: 0.6,
} as const;

export type BlowTiming = typeof BLOW_TIMING;
