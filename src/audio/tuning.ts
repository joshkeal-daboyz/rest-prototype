/** Pure: the one reference pitch (Josh: "432hz") and the helpers every pitched sound is derived from. */

/** The reference pitch for every note in the game. */
export const A4_HZ = 432;

/** 12-TET above/below A4 at A4_HZ: semitonesHz(0) = 432, semitonesHz(-12) = 216. */
export function semitonesHz(n: number): number {
  return A4_HZ * Math.pow(2, n / 12);
}

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Scientific pitch name, sharps only: "A4" gives 432, "C#5" gives 544.29, "A1" gives 54. Throws on a bad name. */
export function noteHz(name: string): number {
  const m = /^([A-G])(#?)(-?\d+)$/.exec(name);
  if (!m) throw new Error(`bad note name: ${name}`);
  const pc = (PITCH_CLASS[m[1] as string] ?? 0) + (m[2] === "#" ? 1 : 0);
  const octave = Number(m[3]);
  return semitonesHz((octave - 4) * 12 + (pc - 9));
}

/** True if hz is within tolCents of a 12-TET note at A4_HZ. */
export function onGrid(hz: number, tolCents = 1): boolean {
  if (!(hz > 0) || !Number.isFinite(hz)) return false;
  const semis = 12 * Math.log2(hz / A4_HZ);
  return Math.abs(semis - Math.round(semis)) * 100 <= tolCents;
}
