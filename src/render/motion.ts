/** Pure animation helpers: pulse positions along a line, lamp flicker, spark hashing. */

/** Pixels per second pulses travel. */
export const PULSE_SPEED = 90;
/** Pixels between consecutive pulses on a line. */
export const PULSE_SPACING = 34;

/**
 * Distance along the line (from the end the current enters) of the first pulse.
 * Further pulses sit at phase + k * spacing. Always in [0, spacing).
 */
export function pulsePhase(timeSeconds: number, speed: number = PULSE_SPEED, spacing: number = PULSE_SPACING): number {
  const d = (timeSeconds * speed) % spacing;
  return d < 0 ? d + spacing : d;
}

/** How many pulses fit on a line of `length` px (those at phase + k*spacing < length). */
export function pulseCount(length: number, phase: number, spacing: number = PULSE_SPACING): number {
  if (length <= phase) return 0;
  return Math.ceil((length - phase) / spacing);
}

export { clamp01, flicker, hash01 } from "../render3d/motion";
