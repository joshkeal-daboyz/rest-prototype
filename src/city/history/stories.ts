/**
 * The story rule (ticket 073 B; B pre-check section 3; B-Q2): each district's `tech`, `held` and `wild`, all in 0 to 1 at 2 decimals, each hash keyed `history:<seed>:<what>:<district or block id>`.
 * - `tech`: 1 - step / (the city's most steps + 1), moved by up to 0.1 by hash. A district's step is the fewest streets crossed from the centre district's blocks to one of its own. The centre
 *   is the district holding the hashed-first inner block (every side has a block across it), or, with no inner block, the hashed-first block.
 * - `held`: a hash u; 0 where u < 0.25, else (u - 0.25) / 0.75.
 * - `wild`: 1 - `held`, moved by up to 0.15 by hash.
 */

import type { CityPlanBlock } from "../../core";
import { HELD_NONE_BELOW, STORY_DECIMALS, TECH_JITTER, WILD_JITTER } from "./constants";
import { hashedOrder, historyUnit, neighboursOf } from "./districts";

const SCALE = 10 ** STORY_DECIMALS;
/** A story value: rounded to 2 decimals, clamped to 0 to 1. */
export const storyValue = (v: number): number => Math.min(1, Math.max(0, Math.round(v * SCALE) / SCALE));

/** An inner block has a block across every one of its four sides (no side on the edge of the city). */
export const isInner = (b: CityPlanBlock): boolean => Object.values(b.sides).every((s) => s.across.length > 0);

/** The block that holds the centre: the hashed-first inner block, else the hashed-first block. null for a city with no block. */
export function centreBlock(blocks: readonly CityPlanBlock[], seed: number): CityPlanBlock | null {
  const order = hashedOrder(blocks, seed);
  return order.find(isInner) ?? order[0] ?? null;
}

/** The streets crossed from the `from` blocks to each block (a breadth-first walk over blocks across a street). A block the walk cannot reach is absent. */
export function stepsFrom(blocks: readonly CityPlanBlock[], from: readonly string[]): Map<string, number> {
  const near = new Map(blocks.map((b) => [b.id, [...neighboursOf(b).keys()]] as const));
  const steps = new Map<string, number>(from.map((id) => [id, 0] as const));
  let frontier = [...from];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of near.get(id) ?? []) {
        if (near.has(n) && !steps.has(n)) {
          steps.set(n, steps.get(id)! + 1);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return steps;
}

export interface Story {
  readonly step: number;
  readonly tech: number;
  readonly held: number;
  readonly wild: number;
}

/** The story of each district (by its id), given the districts as block id lists and their ids. */
export function storiesOf(blocks: readonly CityPlanBlock[], districts: readonly { readonly id: string; readonly blocks: readonly string[] }[], seed: number): Map<string, Story> {
  const out = new Map<string, Story>();
  const centre = centreBlock(blocks, seed);
  const centreDistrict = centre ? districts.find((d) => d.blocks.includes(centre.id)) : undefined;
  const steps = stepsFrom(blocks, centreDistrict ? centreDistrict.blocks : []);
  const stepOf = new Map<string, number>();
  for (const d of districts) {
    const reached = d.blocks.map((b) => steps.get(b)).filter((s): s is number => s !== undefined);
    if (reached.length > 0) stepOf.set(d.id, Math.min(...reached));
  }
  const most = Math.max(0, ...stepOf.values());
  for (const d of districts) {
    const step = stepOf.get(d.id) ?? most;
    const tech = storyValue(1 - step / (most + 1) + (historyUnit(seed, "tech", d.id) * 2 - 1) * TECH_JITTER);
    const u = historyUnit(seed, "held", d.id);
    const held = storyValue(u < HELD_NONE_BELOW ? 0 : (u - HELD_NONE_BELOW) / (1 - HELD_NONE_BELOW));
    const wild = storyValue(1 - held + (historyUnit(seed, "wild", d.id) * 2 - 1) * WILD_JITTER);
    out.set(d.id, { step, tech, held, wild });
  }
  return out;
}
