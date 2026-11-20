/** Stage 3: every block cell built or a named open use, the openings recorded, each built cell's open sides, column kind and partner (ticket 070 C1; grammar rules 3 to 6). Courts and units are C2's. */

import type { CityMassLayer, CityMassUse, CityPicture, CityPlan } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { massFailures } from "./check";
import { keyOf } from "./geometry";
import { planMass } from "./plan";

/** Index 0 is a street cell: nothing of this layer. Built cells read by column kind, the rest by use. */
export const MASS_LEGEND: readonly LegendEntry[] = [
  { name: "street", rgb: 0x3a3d42 },
  { name: "built: blind", rgb: 0x7a5a4a },
  { name: "built: mid", rgb: 0xb08a6a },
  { name: "built: corner", rgb: 0xd4a24a },
  { name: "lane", rgb: 0x8a8f96 },
  { name: "lane mouth", rgb: 0xa7adb5 },
  { name: "plaza", rgb: 0xe0d6c0 },
  { name: "walk-through", rgb: 0xc9b99a },
  { name: "drive", rgb: 0x6a6f78 },
  { name: "frontage lot", rgb: 0x59606b },
  { name: "apron", rgb: 0x9a9a92 },
  { name: "stalls", rgb: 0x4a525c },
  { name: "aisle", rgb: 0x5f6670 },
  { name: "green", rgb: 0x4f9a4a },
  { name: "path", rgb: 0xa89868 },
  { name: "park edge", rgb: 0xb9c79a },
];

const LEGEND_OF_USE: Readonly<Record<Exclude<CityMassUse, "built">, number>> = {
  lane: 4,
  laneMouth: 5,
  plaza: 6,
  walk: 7,
  drive: 8,
  frontLot: 9,
  apron: 10,
  stalls: 11,
  aisle: 12,
  green: 13,
  greenPath: 14,
  parkEdge: 15,
};
const LEGEND_OF_COLUMN = { blind: 1, mid: 2, corner: 3 } as const;

function run(plan: CityPlan, rand: StageRand): CityMassLayer {
  const streets = plan.layers.streets;
  const land = plan.layers.land;
  if (!streets || !land) throw new CityStageError("mass: the plan has no streets or land layer");
  const p = planMass(streets, land, rand);
  const layer: CityMassLayer = { stage: "mass", cells: p.cells, built: p.built, openings: p.openings, courts: [], units: [] };
  const failures = massFailures(layer, streets.blocks, land);
  if (failures.length > 0) {
    const f = failures[0]!;
    throw new CityStageError(f.reason, f.cells);
  }
  return layer;
}

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.mass;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new CityStageError("picture: the plan has no mass layer");
  const column = new Map(layer.built.map((b) => [keyOf(b.i, b.j), b.column] as const));
  const at = new Map<string, number>();
  for (const c of layer.cells) at.set(keyOf(c.i, c.j), c.use === "built" ? LEGEND_OF_COLUMN[column.get(keyOf(c.i, c.j)) ?? "blind"] : LEGEND_OF_USE[c.use]);
  return makePicture("mass", streets.w, streets.h, MASS_LEGEND, (i, j) => at.get(keyOf(i, j)) ?? 0);
}

export const massStage: CityStageDef<"mass"> = { name: "mass", run, picture };
