/**
 * Stage 7: facades, H1 (ticket 070 H1; grammar rules 1, 3, 7 and 9; readings S1, D1 to D5). Every ground slot stage 5 left (`buildings.columns[].ground`) is filled with exactly one ground piece, keyed from the ground kit
 * table and placed on its cell, front-aligned, at its own level (S1). Street fronts carry shops, double shops, shop corners and one residents' door per building; quiet fronts one residents' door (or corner door) and windowed
 * floor pieces, never a shop; a quiet ring-2 building with no door place has no door (Josh, Q21 answer 3). Reads `mass` and `buildings` (and `streets` only for the lattice's size, for the picture). Writes only `facades`.
 */

import type { CalibrationKey, CityBuilding, CityBuildingsLayer, CityCell, CityColumn, CityFacadesLayer, CityGroundPiece, CityGroundPieceKind, CityMassLayer, CityPicture, CityPlan } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { groundFailures } from "./check";
import { factsOf, makeCtx, type BuildingFacts, type Ctx, columnFrontage } from "./facts";
import { indexOf } from "./hash";
import { DOUBLE_KEY, FIRST_FLOOR_SILL_M, GROUND_STYLES, groundEntry, type GroundStyle } from "./kit";
import { keyOf, levelOf, placeGround } from "./place";

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
  const layer: CityFacadesLayer = { stage: "facades", ground: buildGround(mass, buildings, rand) };
  const failures = groundFailures(layer, { mass, buildings });
  if (failures.length > 0) throw new CityStageError(`${failures[0]!.check}: ${failures[0]!.reason}`, failures[0]!.cells);
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
];

const KINDS: readonly CityGroundPieceKind[] = ["shop", "shopDouble", "shopCorner", "door", "doorCorner", "floor", "floorCorner"];

/** The legend index of a ground kind. */
export const legendOf = (kind: CityGroundPieceKind): number => 1 + KINDS.indexOf(kind);

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.facades;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new CityStageError("picture: the plan has no facades layer");
  const at = new Map<number, number>();
  for (const p of layer.ground) for (const c of p.cells) at.set(c.j * streets.w + c.i, legendOf(p.kind));
  return makePicture("facades", streets.w, streets.h, FACADES_LEGEND, (i, j) => at.get(j * streets.w + i) ?? 0);
}

export const facadesStage: CityStageDef<"facades"> = { name: "facades", run, picture };
