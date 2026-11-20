/** Stage 1: the street network, the street cells' base roles and the block rectangles (ticket 070 A1). */

import type { CityPicture, CityPlan, CityStreetRole, CityStreetsLayer } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { blockCorner, evaluateStreets, streetWidthFailures } from "./check";
import { clampBlocks } from "./layout";
import { laySplit } from "./split";

/** Seven entries, no "nothing": every lattice cell is a street cell or a block. */
export const STREETS_LEGEND: readonly LegendEntry[] = [
  { name: "lane", rgb: 0x3a3d42 },
  { name: "parking band", rgb: 0x5b6068 },
  { name: "junction", rgb: 0x2b2d31 },
  { name: "crossing", rgb: 0xd9d9d0 },
  { name: "pavement", rgb: 0xa7a39a },
  { name: "pavement corner", rgb: 0xc4bfb2 },
  { name: "block", rgb: 0x6f8a5a },
];

const LEGEND_OF_ROLE: Readonly<Record<CityStreetRole, number>> = { lane: 0, parkingPlain: 1, junction: 2, crossing: 3, pavement: 4, pavementCorner: 5 };
const LEGEND_BLOCK = 6;

function run(plan: CityPlan, rand: StageRand): CityStreetsLayer {
  void rand; // stage 1's hash is `hashOf` in layout.ts, which is `stageRand("streets", seed)`: the same function the runner passes.
  const blocksX = clampBlocks(plan.options.blocksX);
  const blocksZ = clampBlocks(plan.options.blocksZ);
  const seed = Math.trunc(plan.options.seed);
  // The split plan (ticket 070 A4). Throws CityStageError naming the rule when no draw holds S1, S3, S4, S5, V1 and V2 (R-2).
  const layer = laySplit(seed, blocksX, blocksZ).layer;

  const width = streetWidthFailures(layer);
  if (width.length > 0) throw new CityStageError(`street width (grammar 10): ${width[0]}`);
  for (const v of evaluateStreets(layer)) {
    if (v.pass) continue;
    throw new CityStageError(`${v.id}: block sizes fail the variety rule (value ${v.value})`, layer.blocks.slice(0, 1).map(blockCorner));
  }
  return layer;
}

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.streets;
  if (!layer) throw new CityStageError("picture: the plan has no streets layer");
  const at = new Map<number, number>();
  for (const c of layer.cells) at.set(c.j * layer.w + c.i, LEGEND_OF_ROLE[c.role]);
  // A band cell on the parking band reads as "parking band"; a cell not listed is inside a block.
  return makePicture("streets", layer.w, layer.h, STREETS_LEGEND, (i, j) => at.get(j * layer.w + i) ?? LEGEND_BLOCK);
}

export const streetsStage: CityStageDef<"streets"> = { name: "streets", run, picture };
