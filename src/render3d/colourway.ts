/**
 * Ticket 054 B: which City Pack colourway each block is drawn in. Pure: no three import. A colourway is an alternate atlas (the same 1024 x 1024 layout, only cell colours differ), so a
 * block repainted in one keeps its shape and changes its walls. `assignColourways` gives each block one id from the ones that loaded, the same on every visit, and never the same as the
 * block before it in its run; `models3d.ts` does the drawing (`paintStack`).
 */

import { stableHash } from "../city/pipeline/hash";

/** The id of the atlas the GLB embeds: today's look. It needs no file and no clone. */
const BASE = "base";

/** The colourway the stop sign is drawn in (070 TR2, Q42): on the base atlas its face is one grey, on `01_A` it is white STOP on red. Never a block's or a building's. */
export const STOP_SIGN_COLOURWAY = "01_A";

/**
 * The colourways the town may use, in order: red, orange-red, green, bright green, cream-tan, bright tan, teal, bright teal. `base` is today's red; the B tones are left out (darker, in a
 * night scene that is already dark) and so is `01_A`, which is too close to the base for a block (not the same: its sign faces differ, 070 TR, Q42, so the stop sign alone fetches it, `STOP_SIGN_COLOURWAY`). Only these ids are ever fetched for blocks.
 */
export const COLOURWAY_POOL: readonly string[] = [BASE, "01_C", "02_A", "02_C", "03_A", "03_C", "04_A", "04_C"];

/** The ids a colourway file may have: a series 01 to 04 and a tone A, B or C (`02_A`). Nothing else is ever put in a URL. */
export function isColourwayId(id: string): boolean {
  return /^0[1-4]_[ABC]$/.test(id);
}

/**
 * A start index in [0, count), a pure function of the key: `stableHash` (FNV-1a, whose low bits are weak on short strings) through a murmur-style finaliser, as `dressing.ts` does.
 * With no choice (`count` under 1) it is 0.
 */
export function colourwayStart(key: string, count: number): number {
  if (count < 1) return 0;
  let h = stableHash(`colourway|${key}`);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) % count;
}

/** One block to colour: its lot's key, and the terrace run it stands in (absent for a stack on a lone lot). */
export interface ColourwayBlock {
  key: string;
  run?: string;
}

/**
 * The colourway id of each block, in the order given (blocks of a run follow one another). A block starts at the index its key hashes to, modulo the number of `available` ids; if that is
 * the id of the block before it and that block is in the same run, it steps on to the next (modulo). So two neighbours in a run never share an id while two or more are available. A lone
 * lot's stack (no run) takes its hash's id. With one id available (the base alone) every block gets it. Pure and deterministic.
 */
export function assignColourways(blocks: readonly ColourwayBlock[], available: readonly string[]): string[] {
  const n = available.length;
  if (n === 0) return blocks.map(() => BASE);
  const out: string[] = [];
  blocks.forEach((b, i) => {
    let at = colourwayStart(b.key, n);
    const prev = i > 0 ? blocks[i - 1]! : null;
    if (n >= 2 && prev && b.run !== undefined && prev.run === b.run && out[i - 1] === available[at]) at = (at + 1) % n;
    out.push(available[at]!);
  });
  return out;
}

/** True when `name` (a texture or image name) is the base atlas `base`, or one of its numbered colourways (`PolygonCity_Texture_01_A`): the maps a colourway may stand in for. */
export function isBaseAtlasName(name: string, base: string): boolean {
  // An image's extension and a Blender duplicate suffix (".001") are not part of the stem.
  const stem = name.replace(/\.(png|jpe?g)$/i, "").replace(/\.\d{3}$/, "");
  if (stem === base) return true;
  return stem.startsWith(`${base}_`) && isColourwayId(stem.slice(base.length + 1));
}

/** What the gallery's `&colourway=` value comes to: the id to draw, or null for the base, and the one line to say when it was refused. */
export interface ColourwayChoice {
  id: string | null;
  message: string | null;
}

/**
 * Parse the gallery's `colourway=` value against the ids the manifest lists. Absent or `base`: the base, no line. A value that is not a colourway id (`../x`) or is not in `listed`: the base
 * and one line saying so. Pure.
 */
export function chooseColourway(raw: string | null, listed: readonly string[]): ColourwayChoice {
  if (raw === null || raw === "" || raw === BASE) return { id: null, message: null };
  if (!isColourwayId(raw)) return { id: null, message: `3D gallery: colourway "${raw.slice(0, 24)}" is not a colourway id (like 02_A); showing the base.` };
  if (!listed.includes(raw)) return { id: null, message: `3D gallery: colourway ${raw} is not in the manifest; showing the base.` };
  return { id: raw, message: null };
}
