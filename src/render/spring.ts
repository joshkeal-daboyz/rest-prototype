/**
 * Pure timing for a spring switch's return: the lever starts where it was, snaps to rest
 * and rings a little past it (a twang) in ~0.25 s. No canvas, no allocation.
 */

export const TWANG_SECONDS = 0.25;

/**
 * Lever offset at `age` seconds after the spring-back began, as a multiple of the
 * (previous position - rest position) vector: 1 = still at the old position,
 * 0 = at rest, negative = overshoot past rest. Exactly 0 once the twang is over
 * (and before it starts, so a lever that never sprang draws at rest).
 */
export function twangOffset(age: number): number {
  if (!(age >= 0) || age >= TWANG_SECONDS) return 0;
  const u = age / TWANG_SECONDS;
  const d = 1 - u;
  return d * d * Math.cos(u * 2.5 * Math.PI);
}

/** True while the twang is playing. */
export function twanging(age: number): boolean {
  return age >= 0 && age < TWANG_SECONDS;
}

/**
 * A spring switch has sprung back when its position changed between frames to a
 * different value while no current reaches it (a player throw needs power, so a
 * move without power can only be a spring return).
 */
export function sprangBack(isSpring: boolean, prevSel: number, sel: number, powered: boolean): boolean {
  return isSpring && prevSel !== sel && !powered;
}
