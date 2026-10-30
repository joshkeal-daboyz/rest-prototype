/** Pure animation helpers: pulse positions along a line, lamp flicker, spark hashing. */

import { BEAT } from "../core";

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

/** How many pulse spacings the chevrons surge forward on each beat (ticket 032). */
export const PULSE_BEAT_STEPS = 1;

/** Ease-out on [0, 1]: ease(0) = 0, ease(1) = 1, monotonic, front-loaded. */
export function easeOutCubic(x: number): number {
  const u = 1 - (x < 0 ? 0 : x > 1 ? 1 : x);
  return 1 - u * u * u;
}

/**
 * Pulse offset driven by the shared beat clock: on each beat every chevron surges forward
 * PULSE_BEAT_STEPS spacings and settles. Pure in t; always in [0, spacing); 0 on each beat.
 */
export function beatPulsePhase(timeSeconds: number, spacing: number = PULSE_SPACING): number {
  const d = (easeOutCubic(BEAT.phase(timeSeconds)) * PULSE_BEAT_STEPS * spacing) % spacing;
  return d < 0 ? d + spacing : d;
}

/** How many pulses fit on a line of `length` px (those at phase + k*spacing < length). */
export function pulseCount(length: number, phase: number, spacing: number = PULSE_SPACING): number {
  if (length <= phase) return 0;
  return Math.ceil((length - phase) / spacing);
}

/** Cheap deterministic hash to [0, 1). */
export function hash01(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Brownout flicker, 0.15..1, jumpy and uneven per lamp (`seed`). */
export function flicker(timeSeconds: number, seed: number): number {
  const step = Math.floor(timeSeconds * 11 + seed * 3.7);
  const r = hash01(step * 1.31 + seed * 17.1);
  return r < 0.35 ? 0.15 + r * 0.6 : 0.55 + r * 0.45;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
