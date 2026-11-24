/**
 * The pole pick and the heights it gives (ticket 081 K2d1; PK1, CK7). Stage 6 writes each pole's model key to `CityCircuitLayer.poleModels` by `poleAt`'s rule (`src/render3d/powerkit.ts`),
 * so the renderer draws the model stage 6 judged. Pure.
 */

import { GROUND_POLE_ATTACH_UP_M, GROUND_POLE_MIX, type GroundPoleKey } from "../../core";
import { stableHash } from "../pipeline/hash";

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * `poleAt(GROUND_POLE_MIX, id)`'s rule: `stableHash(id)` modulo the mix; an id of the form `<run>#<n>` starts from the run's hash and steps through the mix by a step coprime with its
 * length. Pole ids are the first form; the second is kept so the pick is the renderer's for every spot id (PK2's criterion 2).
 */
export function poleModelFor(spotId: string): GroundPoleKey {
  const n = GROUND_POLE_MIX.length;
  const m = /^(.*)#(\d+)$/.exec(spotId);
  if (!m) return GROUND_POLE_MIX[stableHash(spotId) % n]!;
  const h = stableHash(m[1]!);
  const steps: number[] = [];
  for (let s = 1; s < n; s++) if (gcd(n, s) === 1) steps.push(s);
  const step = steps[(h >>> 8) % steps.length]!;
  return GROUND_POLE_MIX[(h + Number(m[2]) * step) % n]!;
}

/** The lowest of a pole model's three attachments, metres above its base (CK7's reading: B1q found the choice changes nothing). Null for a key outside the mix. */
export function poleEndHeight(key: string | undefined): number | null {
  const up = key === undefined ? undefined : GROUND_POLE_ATTACH_UP_M[key as GroundPoleKey];
  return up === undefined ? null : Math.min(...up);
}
