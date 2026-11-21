/**
 * Stage 7: facades, H3 adds `roofs` (ticket 070 H3: small roof props, one big prop a building (water tower, roof exit, billboard) and the roof exit that stands wholly on its roof, `roofs.ts`; judged by `roofcheck.ts`), placed last over what H1b, H2 and H2b placed.
 * Stage 7: facades, H2b adds the party-wall kit to `walls` (ticket 070 H2b: painted boards, windows and pipe runs on every storey face above a lower roof, `party.ts`; judged by `partycheck.ts`), after each building's H2 pieces.
 * Stage 7: facades, H2 adds `walls` (ticket 070 H2: fire escapes, door canopies, wall air-conditioners and window planters). The escapes are decided first, from `mass`, `buildings` and the ground pieces (`escape.ts`); H1b's dressing is then built
 * with the escape columns plain (EP); `walls.ts` places the canopies and the upper-wall props; `wallcheck.ts` judges them.
 * Stage 7: facades, H1b adds the shopfront dressing (ticket 070 H1b, `dress.ts`: glass, awnings, fascia and blade signs and ATMs on the street fronts, none on a quiet one) after the ground pieces, which it does not touch.
 * Stage 7: facades, H1 (ticket 070 H1; grammar rules 1, 3, 7 and 9; readings S1, D1 to D5). Every ground slot stage 5 left (`buildings.columns[].ground`) is filled with exactly one ground piece, keyed from the ground kit
 * table and placed on its cell, front-aligned, at its own level (S1). Street fronts carry shops, double shops, shop corners and one residents' door per building; quiet fronts one residents' door (or corner door) and windowed
 * floor pieces, never a shop; a quiet ring-2 building with no door place has no door (Josh, Q21 answer 3). Reads `mass` and `buildings` (and `streets` only for the lattice's size, for the picture). Writes only `facades`.
 */

import type { CalibrationKey, CityBuilding, CityBuildingsLayer, CityCell, CityColumn, CityDressingKind, CityFacadesLayer, CityGroundPiece, CityGroundPieceKind, CityMassLayer, CityPicture, CityPlan, CityRoofPiece, CityWallPiece } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { groundFailures } from "./check";
import { buildDressing, runsOf } from "./dress";
import { dressFailures } from "./dresscheck";
import { decideEscapes, escapeWeight } from "./escape";
import { factsOf, makeCtx, type BuildingFacts, type Ctx, columnFrontage } from "./facts";
import { indexOf } from "./hash";
import { DOUBLE_KEY, FIRST_FLOOR_SILL_M, GROUND_STYLES, groundEntry, type GroundStyle } from "./kit";
import { keyOf, levelOf, placeGround } from "./place";
import { mergeWalls, buildParty } from "./party";
import { partyFailures } from "./partycheck";
import { roofFailures } from "./roofcheck";
import { buildRoofs } from "./roofs";
import { wallFailures } from "./wallcheck";
import { TILE_CITY_R7_MIN } from "./wallkit";
import { buildWalls } from "./walls";

const styleOf = (id: string, b: CityBuilding): GroundStyle => {
  const s = GROUND_STYLES.find((x) => x.id === id);
  if (!s) throw new CityStageError(`H1: building ${b.id} has the style ${id}, which is not in the ground kit table`, b.cells);
  return s;
};

/** The first floor's lowest window sill over a column's ground slot. */
function windowSillOf(col: CityColumn): number {
  const first = col.pieces[0];
  const w = first ? FIRST_FLOOR_SILL_M[first.placement.key] : undefined;
  if (w === undefined) throw new CityStageError(`H1: the first piece over (${col.i}, ${col.j}) is ${first?.placement.key ?? "missing"}, which has no first-floor sill in the table`, [col]);
  return w;
}

/** Fill every ground slot of `buildings.columns`: the pieces, in `columns` order of each piece's first cell. Pure; fails with `CityStageError` where a slot cannot be served (R-2). */
export function buildGround(mass: Pick<CityMassLayer, "cells" | "built">, buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">, rand: StageRand): CityGroundPiece[] {
  const ctx: Ctx = makeCtx(mass, buildings);
  const order = new Map<string, number>(buildings.columns!.map((c, n) => [keyOf(c), n] as const));
  const pieces: CityGroundPiece[] = [];

  for (const b of buildings.buildings) {
    const facts: BuildingFacts = factsOf(ctx, b);
    const style = styleOf(b.style, b);
    const { cols } = facts;

    /** A key of `keys` that has a level on every one of `at`'s columns, by hash: a key whose window is empty is not picked (S1). */
    const pick = (kind: CityGroundPieceKind, keys: readonly CalibrationKey[], at: readonly CityColumn[], ...salt: (string | number)[]): { key: CalibrationKey; y: number } => {
      const ok = keys.filter((k) => at.every((c) => levelOf(groundEntry(k), c.ground.top_m, windowSillOf(c)) !== null));
      if (ok.length === 0) throw new CityStageError(`S1: no ${kind} key has a level on (${at[0]!.i}, ${at[0]!.j}) of building ${b.id}`, at);
      const key = ok[indexOf(rand(...salt), ok.length)]!;
      return { key, y: levelOf(groundEntry(key), at[0]!.ground.top_m, windowSillOf(at[0]!))! };
    };
    const put = (kind: CityGroundPieceKind, at: readonly CityColumn[], keys: readonly CalibrationKey[], ...salt: (string | number)[]): void => {
      const { key, y } = pick(kind, keys, at, ...salt);
      const first = at[0]!;
      const e = groundEntry(key);
      const cells: CityCell[] = at.map((c) => ({ i: c.i, j: c.j }));
      pieces.push({
        kind,
        building: b.id,
        cells,
        frontage: columnFrontage(ctx, first),
        placement: placeGround(key, cells, first.front, first.yaw, y),
        door_m: e.sill === null ? null : y + e.sill,
      });
    };

    // The building's one door (rule 9; D1; Q21 answer 3).
    let doorAt = -1;
    let doorIsCorner = false;
    if (facts.frontage === "street") {
      if (facts.mids.length > 0) {
        if (facts.doorMids.length === 0) throw new CityStageError(`R3: street building ${b.id} has mid columns and no door place`, cols);
        doorAt = facts.doorMids[indexOf(rand("door", b.id), facts.doorMids.length)]!;
      }
    } else if (facts.doorCorners.length > 0) {
      doorAt = facts.doorCorners[0]!;
      doorIsCorner = true;
    } else if (facts.doorMids.length > 0) {
      doorAt = facts.doorMids[indexOf(rand("door", b.id), facts.doorMids.length)]!;
    } else if (!facts.ring2) {
      throw new CityStageError(`M8: quiet building ${b.id} is on an outer row and has no door place`, cols);
    }

    const taken = new Set<number>();
    cols.forEach((col, n) => {
      if (taken.has(n)) return;
      if (col.kind === "blind") return put("floor", [col], style.floor, "floor", b.id, n);
      if (col.kind === "corner") {
        if (facts.quietCorners.includes(n)) {
          if (n === doorAt && doorIsCorner) return put("doorCorner", [col], style.doorCorner, "doorCorner", b.id, n);
          return put("floorCorner", [col], style.floorCorner, "floorCorner", b.id, n);
        }
        return put("shopCorner", [col], style.shopCorner, "shopCorner", b.id, n);
      }
      // a mid column
      if (n === doorAt) return put("door", [col], style.door, "door", b.id, n);
      if (facts.frontage === "quiet") return put("floor", [col], style.floor, "floor", b.id, n);
      const next = cols[n + 1];
      const pair = next !== undefined && next.kind === "mid" && n + 1 !== doorAt && next.yaw === col.yaw && !taken.has(n + 1);
      // the shop is picked by hash among the six `base.mid` keys (`Shop_03` last), as `assembleStack` picks it: a double only where two free columns stand
      const wantDouble = pair && style.shopDouble.includes(DOUBLE_KEY) && indexOf(rand("double", b.id, n), style.shop.length + style.shopDouble.length) === style.shop.length;
      if (wantDouble && style.shopDouble.some((k) => [col, next!].every((c) => levelOf(groundEntry(k), c.ground.top_m, windowSillOf(c)) !== null))) {
        taken.add(n + 1);
        return put("shopDouble", [col, next!], style.shopDouble, "shopDouble", b.id, n);
      }
      return put("shop", [col], style.shop, "shop", b.id, n);
    });
  }
  return pieces.sort((a, b) => order.get(keyOf(a.cells[0]!))! - order.get(keyOf(b.cells[0]!))!);
}

function run(plan: CityPlan, rand: StageRand): CityFacadesLayer {
  const { mass, buildings } = plan.layers;
  if (!mass || !buildings) throw new CityStageError("facades: the plan has no mass or buildings layer");
  const ground = buildGround(mass, buildings, rand);
  const groundOnly: CityFacadesLayer = { stage: "facades", ground };
  const failures = groundFailures(groundOnly, { mass, buildings });
  if (failures.length > 0) throw new CityStageError(`${failures[0]!.check}: ${failures[0]!.reason}`, failures[0]!.cells);
  // H2: the escapes first (they read only mass, buildings and ground), then H1b's dressing with their columns plain (EP), then the canopies and the upper-wall props.
  const { escapes } = decideEscapes(mass, buildings, ground, rand, TILE_CITY_R7_MIN, runsOf(buildings));
  const columns = new Map<string, number>([...escapes.values()].map((e) => [keyOf(e.col), escapeWeight(e.col, e.result.pieces)] as const));
  const dressing = buildDressing(mass, buildings, ground, rand, columns).dressing;
  const h2 = buildWalls(mass, buildings, ground, dressing, escapes, rand).walls;
  // H2b: the party-wall kit, appended after each building's own H2 pieces
  const walls = mergeWalls(buildings, h2, buildParty(mass, buildings, rand).pieces);
  // H3: the roofs, last, over what H1b, H2 and H2b placed (RC: a roof piece takes only the room a column has left)
  const roofs = buildRoofs(mass, buildings, { dressing, walls }, rand).roofs;
  const layer: CityFacadesLayer = { stage: "facades", ground, dressing, walls, roofs };
  const dressFailed = dressFailures(layer, { mass, buildings });
  if (dressFailed.length > 0) throw new CityStageError(`${dressFailed[0]!.check}: ${dressFailed[0]!.reason}`, dressFailed[0]!.cells);
  const wallFailed = wallFailures(layer, { mass, buildings });
  if (wallFailed.length > 0) throw new CityStageError(`${wallFailed[0]!.check}: ${wallFailed[0]!.reason}`, wallFailed[0]!.cells);
  const partyFailed = partyFailures(layer, { mass, buildings });
  if (partyFailed.length > 0) throw new CityStageError(`${partyFailed[0]!.check}: ${partyFailed[0]!.reason}`, partyFailed[0]!.cells);
  const roofFailed = roofFailures(layer, { mass, buildings });
  if (roofFailed.length > 0) throw new CityStageError(`${roofFailed[0]!.check}: ${roofFailed[0]!.reason}`, roofFailed[0]!.cells);
  return layer;
}

// ---- the picture ----

/** Index 0 is "no ground piece here" (not built). Then one entry per ground kind. */
export const FACADES_LEGEND: readonly LegendEntry[] = [
  { name: "no ground piece", rgb: 0x2b2d31 },
  { name: "shop", rgb: 0xe0a030 },
  { name: "double shop", rgb: 0xf0c060 },
  { name: "shop corner", rgb: 0xd06020 },
  { name: "residents' door", rgb: 0x3060c0 },
  { name: "corner door", rgb: 0x60a0f0 },
  { name: "floor", rgb: 0x808890 },
  { name: "corner floor", rgb: 0xa8b0b8 },
  { name: "awning", rgb: 0xd04848 },
  { name: "fascia sign", rgb: 0xf0e060 },
  { name: "blade sign", rgb: 0x60d0c0 },
  { name: "ATM", rgb: 0xffffff },
  { name: "fire escape", rgb: 0xb05030 },
  { name: "door canopy", rgb: 0x7088d0 },
  { name: "wall prop", rgb: 0x90c090 },
  { name: "party-wall kit", rgb: 0xc080c0 },
  { name: "roof prop", rgb: 0x70a8e0 },
  { name: "big roof prop", rgb: 0xe0d070 },
  { name: "roof exit", rgb: 0xe07070 },
];

const KINDS: readonly CityGroundPieceKind[] = ["shop", "shopDouble", "shopCorner", "door", "doorCorner", "floor", "floorCorner"];

/** The legend index of a ground kind. */
export const legendOf = (kind: CityGroundPieceKind): number => 1 + KINDS.indexOf(kind);

/** The legend index of a dressing kind that the picture marks with a point (glass has none). */
/** The legend index of a wall piece the picture marks with a point: an escape's first piece ("fire escape"), a canopy ("door canopy"), an air-conditioner or a planter ("wall prop"), a party-wall kit piece ("party-wall kit"); null for the escape's other pieces. */
export const wallLegendOf = (p: CityWallPiece): number | null => (p.kind === "escape" ? (p.storey === 1 ? 12 : null) : p.kind === "canopy" ? 13 : p.kind === "aircon" || p.kind === "planter" ? 14 : p.kind === "partyBoard" || p.kind === "partyPipe" || p.kind === "partyWindow" ? 15 : null);

/** H3: the legend index of a roof piece the picture marks with a point: a small prop ("roof prop"), a water tower or a billboard's structure ("big roof prop"), an exit ("roof exit"); null for a billboard's face (and H1c adds the novelty sign's). */
export const roofLegendOf = (p: CityRoofPiece): number | null => (p.kind === "small" ? 16 : p.kind === "waterTower" || p.kind === "billboard" ? 17 : p.kind === "exit" ? 18 : null);

export const dressingLegendOf = (kind: CityDressingKind): number | null => (kind === "awning" ? 8 : kind === "fasciaSign" ? 9 : kind === "bladeSign" ? 10 : kind === "atm" ? 11 : null);

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.facades;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new CityStageError("picture: the plan has no facades layer");
  const at = new Map<number, number>();
  for (const p of layer.ground) for (const c of p.cells) at.set(c.j * streets.w + c.i, legendOf(p.kind));
  const points = (layer.dressing ?? []).flatMap((p) => {
    const legend = dressingLegendOf(p.kind);
    return legend === null ? [] : [{ x_m: p.placement.x_m, z_m: p.placement.z_m, legend }];
  });
  const wallPoints = (layer.walls ?? []).flatMap((p) => {
    const legend = wallLegendOf(p);
    return legend === null ? [] : [{ x_m: p.placement.x_m, z_m: p.placement.z_m, legend }];
  });
  const roofPoints = (layer.roofs ?? []).flatMap((p) => {
    const legend = roofLegendOf(p);
    return legend === null ? [] : [{ x_m: p.placement.x_m, z_m: p.placement.z_m, legend }];
  });
  return makePicture("facades", streets.w, streets.h, FACADES_LEGEND, (i, j) => at.get(j * streets.w + i) ?? 0, [...points, ...wallPoints, ...roofPoints]);
}

export const facadesStage: CityStageDef<"facades"> = { name: "facades", run, picture };
