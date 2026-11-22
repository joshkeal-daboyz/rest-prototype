/**
 * Stage 10: history (ticket 073 B; Josh's card 1, "Yes, districts (Recommended)"). Cuts the city into districts of 1 to 4 touching blocks, each with its story (`tech`, `held`, `wild`). Reads only `streets`
 * (the blocks and what lies across their sides) and the seed. Writes only the history layer, which is not in `CITY_STAGES` or `CityLayers` (X-1, X-7): it is an era stage, run only by the era runner (C1).
 *
 * `historyStage` is a `CityEraStageDef` (`pipeline/eras.ts`) and is registered in `ERA_STAGES` in `src/city/stages.ts`. `runHistory(plan)` is the same stage on the clean plan alone (it reads only `streets`).
 */

import type { CityDistrict, CityEraPicture, CityHistoryLayer, CityPlan, CityPlanBlock } from "../../core";
import type { CityEraStageDef } from "../pipeline/eras";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import { DISTRICT_MAX_BLOCKS } from "./constants";
import { groupBlocks, neighboursOf } from "./districts";
import { storiesOf } from "./stories";

/** The districts of a city's blocks and their stories. Pure; fails with `CityStageError` when there is no block (R-2). */
export function buildHistory(blocks: readonly CityPlanBlock[], seed: number): CityHistoryLayer {
  if (blocks.length === 0) throw new CityStageError("history: the streets layer has no block to cut into districts");
  const districts = groupBlocks(blocks, seed).map((g) => ({ id: `district:${g[0]!}`, blocks: g }));
  const stories = storiesOf(blocks, districts, seed);
  const layer: CityDistrict[] = districts.map((d) => {
    const s = stories.get(d.id)!;
    return { id: d.id, blocks: d.blocks, tech: s.tech, held: s.held, wild: s.wild };
  });
  return { stage: "history", districts: layer };
}

/** The checks on a layer against the streets it was cut from (R-2): every block in exactly one district; 1 to 4 blocks that touch across a street; ids as the type says; values in 0 to 1. Empty when sound. */
export function historyFailures(layer: CityHistoryLayer, blocks: readonly CityPlanBlock[]): string[] {
  const out: string[] = [];
  const owner = new Map<string, string>();
  const byId = new Map(blocks.map((b) => [b.id, b] as const));
  for (const d of layer.districts) {
    if (d.blocks.length < 1 || d.blocks.length > DISTRICT_MAX_BLOCKS) out.push(`${d.id} has ${d.blocks.length} blocks`);
    if (d.id !== `district:${d.blocks[0]}`) out.push(`${d.id} is not its first block's id`);
    for (const b of d.blocks) {
      if (owner.has(b)) out.push(`${b} is in ${owner.get(b)} and ${d.id}`);
      owner.set(b, d.id);
      if (!byId.has(b)) out.push(`${d.id} lists ${b}, which is not a block`);
    }
    const inD = new Set(d.blocks);
    const seen = new Set<string>(d.blocks.slice(0, 1));
    let frontier = [...seen];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const id of frontier) {
        const b = byId.get(id);
        if (!b) continue;
        for (const n of neighboursOf(b).keys()) {
          if (inD.has(n) && !seen.has(n)) {
            seen.add(n);
            next.push(n);
          }
        }
      }
      frontier = next;
    }
    if (seen.size !== inD.size) out.push(`${d.id}'s blocks do not touch across a street`);
    for (const [name, v] of [["tech", d.tech], ["held", d.held], ["wild", d.wild]] as const) {
      if (!(v >= 0 && v <= 1)) out.push(`${d.id} ${name} ${v} is outside 0 to 1`);
    }
  }
  for (const b of blocks) if (!owner.has(b.id)) out.push(`${b.id} is in no district`);
  return out;
}

function deepFreeze<T>(o: T): T {
  if (typeof o === "object" && o !== null && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

/** The layer comes back deep-frozen (R-1), as the clean runner freezes a clean layer; the era runner freezing it again is harmless. */
export function runHistory(plan: CityPlan): CityHistoryLayer {
  const streets = plan.layers.streets;
  if (!streets) throw new CityStageError("history: the plan has no streets layer");
  const layer = buildHistory(streets.blocks, plan.options.seed);
  const failures = historyFailures(layer, streets.blocks);
  if (failures.length > 0) throw new CityStageError(`history: ${failures[0]}`);
  return deepFreeze(layer);
}

// ---- the picture (R-5) ----

/** Legend index 0: street cells and anything outside a block. */
const NOTHING: LegendEntry = { name: "nothing", rgb: 0x2b2d31 };
const PALETTE: readonly number[] = [0xe0a040, 0x4a78d0, 0x60b060, 0xd05080, 0x40b0d0, 0xa070d0, 0xd0d060, 0xd07040];

/** The band (palette index) of each district: the lowest colour no earlier touching district has; the last colour when all are used. */
function bandsOf(layer: CityHistoryLayer, blocks: readonly CityPlanBlock[]): number[] {
  const byBlock = new Map<string, number>();
  layer.districts.forEach((d, k) => d.blocks.forEach((b) => byBlock.set(b, k)));
  const near = layer.districts.map(() => new Set<number>());
  for (const b of blocks) {
    for (const n of neighboursOf(b).keys()) {
      const a = byBlock.get(b.id);
      const c = byBlock.get(n);
      if (a !== undefined && c !== undefined && a !== c) {
        near[a]!.add(c);
        near[c]!.add(a);
      }
    }
  }
  const band: number[] = [];
  layer.districts.forEach((_, k) => {
    const used = new Set([...near[k]!].filter((o) => o < k).map((o) => band[o]!));
    let c = 0;
    while (used.has(c) && c < PALETTE.length - 1) c++;
    band.push(c);
  });
  return band;
}

/**
 * The flat picture of the layer: street cells are "nothing"; each block's cells carry its district's legend entry. One legend entry per district (its name is the district's id and story), coloured
 * by a band of the palette so touching districts differ. Legend index k + 1 is the k-th district.
 */
export function historyPicture(plan: CityPlan, layer: CityHistoryLayer): CityEraPicture {
  const streets = plan.layers.streets;
  if (!streets) throw new CityStageError("picture: the plan has no streets layer");
  const band = bandsOf(layer, streets.blocks);
  const legend: LegendEntry[] = [NOTHING, ...layer.districts.map((d, k) => ({ name: `${d.id} tech ${d.tech} held ${d.held} wild ${d.wild}`, rgb: PALETTE[band[k]!]! }))];
  const index = new Map<string, number>();
  layer.districts.forEach((d, k) => d.blocks.forEach((b) => index.set(b, k + 1)));
  const at = new Map<string, number>();
  for (const b of streets.blocks) {
    const k = index.get(b.id) ?? 0;
    for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) at.set(`${i},${j}`, k);
  }
  return { ...makePicture("streets", streets.w, streets.h, legend, (i, j) => at.get(`${i},${j}`) ?? 0), stage: "history" };
}

/** The era stage, as the era runner (C1) takes it: `run` reads only the clean plan's streets and the seed, ignoring `rand` (its hashes are keyed `history:<seed>:...`); `picture` draws the plan's history layer. */
export const historyStage: CityEraStageDef<"history"> = {
  name: "history",
  run: (plan) => runHistory(plan.plan),
  picture: (plan) => {
    const layer = plan.layers.history;
    if (!layer) throw new CityStageError("picture: the plan has no history layer");
    return historyPicture(plan.plan, layer);
  },
};
