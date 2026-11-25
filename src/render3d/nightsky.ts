/**
 * The night sky and the moon (ticket 081, section SK). Pure: no three, no DOM. `NIGHT_SKY` is the one block Josh tunes by eye (W2 took 6 rounds, FX4 9), so it is not drift-checked:
 * every round is one edit here. `skydome.ts` draws it, `lightrig.ts` lights the scene from its moon. Angles are degrees; azimuth 0 is north (-z, ahead of the play camera), 90 east (+x).
 */

import { LIGHT_MODES, sunPosition } from "./lighting";

export const NIGHT_SKY = {
  /** The dome's gradient: `horizon` at the horizon's glow, `zenith` overhead (the glow fades over about `band_deg`), `below` under the horizon (today's background). */
  sky: { zenith: 0x03050b, horizon: 0x101828, band_deg: 12, below: 0x0b0f17 },
  /** Stars: how many, the seed of their places (the same on every build), the lowest elevation, the point size in px, the brightness range and the colour. */
  stars: { count: 1200, seed: 1, minElevation_deg: 8, size_px: 1.5, brightness: [0.35, 1] as readonly [number, number], colour: 0xdfe6ff },
  /** The moon: where it stands, the angular sizes of the disc and the halo (diameters), the halo's strength, and the light it throws (the night's existing moon light). */
  moon: { azimuth_deg: 0, elevation_deg: 18, disc_deg: 4, disc: 0xe8ecf2, halo_deg: 14, halo: 0.25, light: 0x8fa6d0, intensity: 0.7 },
  /** How fast the splash and the title turn the stars and the moon about the vertical (degrees a second). Play never turns the sky. */
  drift_deg_s: 1.5,
} as const;

export type Vec3 = readonly [number, number, number];

/** Turn a vector about +y by `deg` (counter-clockwise seen from above, three's rotation.y). */
export function turnAboutY(v: Vec3, deg: number): [number, number, number] {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

/** The unit direction of the moon, turned `turn_deg` about the vertical (the same turn `setSkyTurn` gives the disc and the light). */
export function moonDirection(turn_deg = 0, moon: { azimuth_deg: number; elevation_deg: number } = NIGHT_SKY.moon): [number, number, number] {
  return turnAboutY(sunPosition(moon.elevation_deg, moon.azimuth_deg, 1), turn_deg);
}

/** A small seeded generator (mulberry32): the same stream for the same seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The stars' unit directions (3 floats each), uniform over the sky above `minElevation_deg`, and one brightness each in `brightness`. The same on every call for the same numbers.
 */
export function starField(stars: { count: number; seed: number; minElevation_deg: number; brightness: readonly [number, number] } = NIGHT_SKY.stars): { dirs: Float32Array; brightness: Float32Array } {
  const next = rng(stars.seed);
  const dirs = new Float32Array(stars.count * 3);
  const brightness = new Float32Array(stars.count);
  const minY = Math.sin((stars.minElevation_deg * Math.PI) / 180);
  for (let i = 0; i < stars.count; i++) {
    const y = minY + next() * (1 - minY); // uniform in height is uniform on the sphere
    const phi = next() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    dirs[i * 3] = r * Math.cos(phi);
    dirs[i * 3 + 1] = y;
    dirs[i * 3 + 2] = r * Math.sin(phi);
    brightness[i] = stars.brightness[0] + next() * (stars.brightness[1] - stars.brightness[0]);
  }
  return { dirs, brightness };
}

const luminance = (hex: number): number => (0.2126 * ((hex >> 16) & 255) + 0.7152 * ((hex >> 8) & 255) + 0.0722 * (hex & 255)) / 255;

/**
 * The light an unlit face gets at night: the ambient's colour luminance times its intensity, plus the moon's colour luminance times its intensity times how squarely the face
 * (a unit `normal`) looks at the moon. The fill cap: for the camera-facing wall and the roof it is no more than today's moon gave (see nightsky.test.ts).
 */
export function nightFill(normal: Vec3, moon: { azimuth_deg: number; elevation_deg: number; light: number; intensity: number } = NIGHT_SKY.moon): number {
  const amb = LIGHT_MODES.night.ambient!;
  const d = moonDirection(0, moon);
  const facing = Math.max(0, normal[0] * d[0] + normal[1] * d[1] + normal[2] * d[2]);
  return luminance(amb.color) * amb.intensity + luminance(moon.light) * moon.intensity * facing;
}
