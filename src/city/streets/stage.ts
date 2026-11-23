/** Stage 1: the street network, the street cells' base roles and the block rectangles (ticket 070 A1). */

import type { CityPicture, CityPlan, CityStreetRole, CityStreetsLayer } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { blockCorner, evaluateStreets, streetWidthFailures } from "./check";
import { ONE_WAY_SHARE, TILE_M } from "./constants";
import { clampBlocks } from "./layout";
import { laySplit } from "./split";

/** Nine entries, no "nothing": every lattice cell is a street cell or a block. From ticket 070 A4b: "one-way lane" (the lane cells of a one-way street) and "one-way arrow" (points, one per arrow). */
export const STREETS_LEGEND: readonly LegendEntry[] = [
  { name: "lane", rgb: 0x3a3d42 },
  { name: "parking band", rgb: 0x5b6068 },
  { name: "junction", rgb: 0x2b2d31 },
  { name: "crossing", rgb: 0xd9d9d0 },
  { name: "pavement", rgb: 0xa7a39a },
  { name: "pavement corner", rgb: 0xc4bfb2 },
  { name: "block", rgb: 0x6f8a5a },
  { name: "one-way lane", rgb: 0x4a5a78 },
  { name: "one-way arrow", rgb: 0xf2e6a0 },
];

const LEGEND_OF_ROLE: Readonly<Record<CityStreetRole, number>> = { lane: 0, parkingPlain: 1, junction: 2, crossing: 3, pavement: 4, pavementCorner: 5 };
const LEGEND_BLOCK = 6;
const LEGEND_ONE_WAY_LANE = 7;
const LEGEND_ONE_WAY_ARROW = 8;

function runWith(oneWayShare: number) {
  return (plan: CityPlan, rand: StageRand): CityStreetsLayer => {
    const blocksX = clampBlocks(plan.options.blocksX);
    const blocksZ = clampBlocks(plan.options.blocksZ);
    const seed = Math.trunc(plan.options.seed);
    // The split plan (ticket 070 A4) with one-way streets (A4b). Throws CityStageError naming the rule when no draw holds S1, S3, S4, S5, S7 to S9, V1 and V2 (R-2).
    const layer = laySplit(seed, blocksX, blocksZ, undefined, rand, oneWayShare).layer;

    const width = streetWidthFailures(layer);
    if (width.length > 0) throw new CityStageError(`street width (grammar 10): ${width[0]}`);
    for (const v of evaluateStreets(layer)) {
      if (v.pass) continue;
      throw new CityStageError(`${v.id}: block sizes fail the variety rule (value ${v.value})`, layer.blocks.slice(0, 1).map(blockCorner));
    }
    return layer;
  };
}

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.streets;
  if (!layer) throw new CityStageError("picture: the plan has no streets layer");
  const oneWay = new Set(layer.streets.filter((s) => s.section !== "twoWay").map((s) => s.id));
  const at = new Map<number, number>();
  for (const c of layer.cells) at.set(c.j * layer.w + c.i, c.role === "lane" && c.street !== null && oneWay.has(c.street) ? LEGEND_ONE_WAY_LANE : LEGEND_OF_ROLE[c.role]);
  // A band cell on the parking band reads as "parking band"; a cell not listed is inside a block. A one-way street's lane reads as "one-way lane", with an arrow point on each arrow cell.
  const points = layer.arrows.map((a) => ({ x_m: (a.i + 0.5) * TILE_M, z_m: (a.j + 0.5) * TILE_M, legend: LEGEND_ONE_WAY_ARROW }));
  return makePicture("streets", layer.w, layer.h, STREETS_LEGEND, (i, j) => at.get(j * layer.w + i) ?? LEGEND_BLOCK, points);
}

/** Stage 1 with a share of the candidate streets made one-way other than `ONE_WAY_SHARE` (0 gives A4's plan: every street two-way). For the pre-check and tests, through `runCity`'s `stages`. */
export const streetsStageWith = (oneWayShare: number): CityStageDef<"streets"> => ({ name: "streets", run: runWith(oneWayShare), picture });

export const streetsStage: CityStageDef<"streets"> = streetsStageWith(ONE_WAY_SHARE);
