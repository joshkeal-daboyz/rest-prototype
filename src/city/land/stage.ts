/** Stage 2: each block's biome, treatment and parts, the lanes and the parks (ticket 070 B; grammar rules 4 and 12, style guide 19.6). */

import type { CityCell, CityLandLayer, CityPicture, CityPlan } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { evaluateLand, landVariety, laneCells, laneMouthsAtJunctions, unservedWholeParks } from "./check";
import { planLand } from "./plan";

/** Index 0 is a street cell: nothing of this layer. */
export const LAND_LEGEND: readonly LegendEntry[] = [
  { name: "street", rgb: 0x3a3d42 },
  { name: "court part", rgb: 0xb08a6a },
  { name: "strip part", rgb: 0xd0a24a },
  { name: "lane", rgb: 0x8a8f96 },
  { name: "whole park", rgb: 0x4f9a4a },
  { name: "half park", rgb: 0x86c27a },
];
const L_COURT = 1;
const L_STRIP = 2;
const L_LANE = 3;
const L_WHOLE = 4;
const L_HALF = 5;

function run(plan: CityPlan, rand: StageRand): CityLandLayer {
  const streets = plan.layers.streets;
  if (!streets) throw new CityStageError("land: the plan has no streets layer");
  const p = planLand(streets.blocks, rand, streets.streets);
  const layer: CityLandLayer = { stage: "land", blocks: p.blocks, parts: p.parts, lanes: p.lanes, parks: p.parks };
  const m = landVariety(layer, streets.blocks);
  const cell = (id: string): CityCell[] => streets.blocks.filter((b) => b.id === id).map((b): CityCell => ({ i: b.i0, j: b.j0 }));
  const faced = laneMouthsAtJunctions(layer, streets.blocks);
  if (faced.length > 0) throw new CityStageError(`S6: a lane mouth faces a junction: ${faced[0]}`, cell(faced[0]!.split(" ")[0]!));
  const unserved = unservedWholeParks(layer, streets.blocks, streets.streets);
  if (unserved.length > 0) throw new CityStageError(`served park: block ${unserved[0]} is a whole park with no parking band across any of its streets`, cell(unserved[0]!));
  for (const v of evaluateLand(m)) {
    if (v.pass) continue;
    if (v.id === "M4a") {
      if (m.badParts.length === 0) {
        const c = layer.parts.find((x) => x.id === m.cramped[0])!;
        throw new CityStageError(`M4a: part ${c.id} is beside a lane and has a long side of ${Math.max(c.i1 - c.i0, c.j1 - c.j0)} cells (8 or more, so a drive fits)`, [{ i: c.i0, j: c.j0 }]);
      }
      const bad = layer.parts.find((x) => x.id === m.badParts[0])!;
      throw new CityStageError(`M4a: part ${bad.id} has a short side of ${Math.min(bad.i1 - bad.i0, bad.j1 - bad.j0)} cells (2, or 6 or more)`, [{ i: bad.i0, j: bad.j0 }]);
    }
    const what = v.id === "V3" ? `${m.alleys} alleys, ${m.alleysNeeded} needed` : `${m.parks} parks, ${m.parksNeeded} needed`;
    throw new CityStageError(`${v.id}: ${what} on ${m.blocks} blocks`, streets.blocks.slice(0, 1).map((b): CityCell => ({ i: b.i0, j: b.j0 })));
  }
  return layer;
}

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.land;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new CityStageError("picture: the plan has no land layer");
  const at = new Map<number, number>();
  const put = (i: number, j: number, v: number): void => void at.set(j * streets.w + i, v);
  for (const part of layer.parts) for (let j = part.j0; j < part.j1; j++) for (let i = part.i0; i < part.i1; i++) put(i, j, part.shape === "strip" ? L_STRIP : L_COURT);
  for (const c of laneCells(layer, streets.blocks)) put(c.i, c.j, L_LANE);
  for (const park of layer.parks) for (let j = park.j0; j < park.j1; j++) for (let i = park.i0; i < park.i1; i++) put(i, j, park.kind === "whole" ? L_WHOLE : L_HALF);
  return makePicture("land", streets.w, streets.h, LAND_LEGEND, (i, j) => at.get(j * streets.w + i) ?? 0);
}

export const landStage: CityStageDef<"land"> = { name: "land", run, picture };
