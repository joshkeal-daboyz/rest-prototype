/** Pure battery helpers: the charge-bar fraction and the "went flat" transition. No canvas. */

/** Charge at or below this counts as empty. */
export const FLAT_EPSILON = 1e-3;
/** Seconds the pop lasts after a battery goes flat. */
export const FLAT_POP_SECONDS = 0.6;

/** Fill of the charge bar, 0..1. A zero or negative capacity draws empty. */
export function chargeFraction(charge: number, capacity: number): number {
  if (!(capacity > 0) || !(charge > 0)) return 0;
  return charge >= capacity ? 1 : charge / capacity;
}

/**
 * True on the frame a battery stops being released with nothing left:
 * the released -> not-released transition at charge 0. Stopping early
 * (charge remains) is not a pop.
 */
export function wentFlat(prevReleased: boolean, released: boolean, charge: number): boolean {
  return prevReleased && !released && charge <= FLAT_EPSILON;
}

/** 0..1 progress of the flat pop at `age` seconds since it began, or -1 when it is not running. */
export function popProgress(age: number, duration: number = FLAT_POP_SECONDS): number {
  return age >= 0 && age < duration ? age / duration : -1;
}
