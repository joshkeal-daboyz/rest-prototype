/**
 * Stage 8: the plazas and the frontage lots (ticket 070 I; PZ, FL; `furnitureLayout`'s open-lot branch, src/render3d/furniture.ts). Each opening is a 2 by 2 cell rectangle with a frame whose front is one of its street sides:
 * - **A plaza** gets one or two trees at the back corners, a picnic table with an umbrella or a hot-dog stand, benches at the front corners facing in, a planter along the back and pots at the sides, at lift 0, without the old paving
 *   panels (stage 3's plaza is paved as the apron). Its front is a street side by `rand("plaza", "front", <opening id>)`.
 * - **A frontage lot** gets its two `ParkingLines_01` tiles, the barriers along its back edge, its meters and the pole billboard (under the lowest eave of the buildings beside it). Its front faces its mouth's street.
 * A group (the old `accept` unit) goes in whole or not at all: each piece inside the opening, clear of the pieces already there, and (Q28, answer 5; AV, EL) with no piece over which a stage 7 box's base is lower than the piece's top.
 * KO is not read for these pieces.
 */

import type { CalibrationKey, CityBuildingsLayer, CityEdgeLayer, CityGroundProp, CityMassLayer, CityOpening, CitySide } from "../../core";
import { CityStageError } from "../pipeline/error";
import { BILLBOARD_BOARD_LIFT_M, CELL_M, EPS, FURN_GAP_M, P_PARKING_BILLBOARD, SLAB_MAX_M } from "./constants";
import { cellKey, overlaps, SIDE_VEC, SIDE_YAW, type Rect } from "./geom";
import { avoidVerdict, type Keepouts } from "./keepout";
import { BARRIERS, BENCHES, BILLBOARD_BOARD, BILLBOARD_POLE, HOTDOG_STAND, LOT_METERS, PARKING_LINES, PICNIC_TABLE, PLANTERS, POT_PLANTS, TREES, UMBRELLA, boundsOf } from "./kit";
import type { Rand } from "./greens";
import { makeProp, propRect } from "./props";
import { inc, type GroundStats } from "./stats";

interface Part {
  readonly key: CalibrationKey;
  readonly p: number;
  readonly q: number;
  readonly extraYaw?: number;
  readonly lift?: number;
}

/** The frame of an opening: its centre, half sizes and the axes `a` along the front and `b` toward it (exact unit vectors), the turn of its front. */
interface Frame {
  readonly cx: number;
  readonly cz: number;
  readonly W: number;
  readonly D: number;
  readonly ax: number;
  readonly az: number;
  readonly bx: number;
  readonly bz: number;
  readonly yaw: 0 | 90 | 180 | 270;
}

const AXES: Readonly<Record<CitySide, readonly [number, number, number, number]>> = {
  // [ax, az, bx, bz] for a front on that side: `a` is the frame's "right" (cos yaw, -sin yaw), `b` its front (sin yaw, cos yaw)
  "+z": [1, 0, 0, 1],
  "+x": [0, -1, 1, 0],
  "-z": [-1, 0, 0, -1],
  "-x": [0, 1, -1, 0],
};

export interface LotLayers {
  readonly mass: Pick<CityMassLayer, "openings">;
  readonly edge: Pick<CityEdgeLayer, "cells">;
  readonly buildings: Pick<CityBuildingsLayer, "buildings">;
}

/** The plazas' and frontage lots' pieces, `mass.openings` order. */
export function layoutLots(layers: LotLayers, keep: Keepouts, rand: Rand, unit: (...key: readonly (string | number)[]) => number, stats: GroundStats): CityGroundProp[] {
  const edgeAt = new Map(layers.edge.cells.map((c) => [cellKey(c.i, c.j), c] as const));
  const out: CityGroundProp[] = [];
  const storeysAt = new Map<string, number>();
  for (const b of layers.buildings.buildings) for (const c of b.cells) storeysAt.set(cellKey(c.i, c.j), b.storeys);

  for (const op of layers.mass.openings) {
    if (op.kind !== "plaza" && op.kind !== "frontLot") continue;
    const is = op.cells.map((c) => c.i);
    const js = op.cells.map((c) => c.j);
    const i0 = Math.min(...is);
    const i1 = Math.max(...is) + 1;
    const j0 = Math.min(...js);
    const j1 = Math.max(...js) + 1;
    const outside = (s: CitySide): readonly [number, number] => (s === "+x" ? [i1, j0] : s === "-x" ? [i0 - 1, j0] : s === "+z" ? [i0, j1] : [i0, j0 - 1]);
    const streetSides = (["+x", "-x", "+z", "-z"] as const).filter((s) => edgeAt.has(cellKey(...outside(s))));
    let front: CitySide | undefined;
    if (op.kind === "plaza") front = streetSides[rand("plaza", "front", op.id) % Math.max(1, streetSides.length)];
    else {
      const street = op.mouth[0]?.street;
      front = streetSides.find((s) => edgeAt.get(cellKey(...outside(s)))?.street === street) ?? streetSides[0];
    }
    if (front === undefined) throw new CityStageError(`${op.kind === "plaza" ? "PZ" : "FL"}: the opening ${op.id} has no side on a street cell`, op.cells);
    const [ax, az, bx, bz] = AXES[front];
    const frame: Frame = { cx: ((i0 + i1) / 2) * CELL_M, cz: ((j0 + j1) / 2) * CELL_M, W: ((i1 - i0) * CELL_M) / 2, D: ((j1 - j0) * CELL_M) / 2, ax, az, bx, bz, yaw: SIDE_YAW[front] };
    if (op.kind === "plaza") dressPlaza(op, frame, keep, unit, stats, out);
    else dressLot(op, frame, keep, unit, stats, out, eaveOf(op, storeysAt));
  }
  return out;
}

/** The lowest eave (3 x storeys) of the buildings with a cell beside the opening. */
function eaveOf(op: CityOpening, storeysAt: ReadonlyMap<string, number>): number {
  let eave = Infinity;
  for (const c of op.cells) {
    for (const v of Object.values(SIDE_VEC)) {
      const s = storeysAt.get(cellKey(c.i + v[0], c.j + v[1]));
      if (s !== undefined) eave = Math.min(eave, 3 * s);
    }
  }
  return eave;
}

interface Placed {
  readonly rect: Rect;
  readonly lo: number;
  readonly hi: number;
  readonly low: boolean;
}

/** The group rule of `furnitureLayout`'s `accept`, with AV added (Q28, answer 5). */
function makeAccept(op: CityOpening, f: Frame, keep: Keepouts, lost: Record<string, number>, out: CityGroundProp[]): (parts: readonly Part[], tag: string) => boolean {
  const mine: Placed[] = [];
  return (parts, tag) => {
    const made: { prop: CityGroundProp; lo: number; hi: number; low: boolean }[] = [];
    for (const part of parts) {
      const e = boundsOf(part.key);
      if (Math.abs(part.p) + e.w / 2 > f.W + EPS || Math.abs(part.q) + e.d / 2 > f.D + EPS) {
        inc(lost, `${tag}:outside`);
        return false;
      }
      const lift = part.lift ?? 0;
      const prop = makeProp({
        key: part.key,
        on: op.kind === "plaza" ? "plaza" : "frontLot",
        block: op.block,
        host: op.id,
        line: null,
        x: f.cx + f.ax * part.p + f.bx * part.q,
        z: f.cz + f.az * part.p + f.bz * part.q,
        yaw: f.yaw + (part.extraYaw ?? 0),
        lift,
      });
      made.push({ prop, lo: lift, hi: lift + e.h, low: e.h < SLAB_MAX_M });
    }
    for (const m of made) {
      const av = avoidVerdict(keep, propRect(m.prop), m.prop.size.h_m, m.prop.placement.y_m);
      if (av !== null) {
        inc(lost, `${tag}:${av}`);
        return false;
      }
    }
    for (const m of made) {
      if (m.low) continue;
      for (const o of mine) {
        if (o.low) continue;
        if (overlaps(propRect(m.prop), o.rect, FURN_GAP_M * 0.5) && m.lo < o.hi - EPS && o.lo < m.hi - EPS) {
          inc(lost, `${tag}:clash`);
          return false;
        }
      }
    }
    for (const m of made) {
      mine.push({ rect: propRect(m.prop), lo: m.lo, hi: m.hi, low: m.low });
      out.push(m.prop);
    }
    inc(lost, `${tag}:placed`);
    return true;
  };
}

function dressPlaza(op: CityOpening, f: Frame, keep: Keepouts, unit: (...k: (string | number)[]) => number, stats: GroundStats, out: CityGroundProp[]): void {
  stats.plazas++;
  const accept = makeAccept(op, f, keep, stats.plazaLost, out);
  const seed = op.id;
  const u = (...parts: (string | number)[]): number => unit(seed, ...parts);
  const pick = (xs: readonly CalibrationKey[], ...parts: (string | number)[]): CalibrationKey => xs[Math.min(xs.length - 1, Math.floor(u(...parts) * xs.length))]!;
  const sign = (...parts: (string | number)[]): 1 | -1 => (u(...parts) < 0.5 ? -1 : 1);
  // Trees at the back corners: both, or one by hash.
  const both = u("trees") < 0.5;
  const one = sign("tree1");
  for (const sx of [-1, 1]) if (both || sx === one) accept([{ key: pick(TREES, "treekey", sx), p: sx * 3.6, q: -3.5 }], "tree");
  // A picnic table with an umbrella, or a hot-dog stand.
  if (u("centre") < 0.5) {
    const s = sign("tableside");
    accept(
      [
        { key: PICNIC_TABLE, p: -0.6 * s, q: -0.2 },
        { key: UMBRELLA, p: 1.9 * s, q: -0.2 },
      ],
      "picnic",
    );
  } else accept([{ key: HOTDOG_STAND, p: 0, q: -0.6 }], "hotdog");
  // Benches at the front corners, facing in.
  for (const sx of [-1, 1]) if (u("bench", sx) < 0.75) accept([{ key: BENCHES[0]!, p: sx * 3.2, q: 3.7, extraYaw: 180 }], "bench");
  // A planter along the back, and pots at the sides.
  accept([{ key: pick(PLANTERS, "planter"), p: 0, q: -4.5 }], "planter");
  for (const sx of [-1, 1]) if (u("pot", sx) < 0.6) accept([{ key: pick(POT_PLANTS, "potkey", sx), p: sx * 4.4, q: 0.5 }], "pot");
}

function dressLot(op: CityOpening, f: Frame, keep: Keepouts, unit: (...k: (string | number)[]) => number, stats: GroundStats, out: CityGroundProp[], eave: number): void {
  stats.lots++;
  stats.lotEaveMin = Math.min(stats.lotEaveMin, eave);
  const accept = makeAccept(op, f, keep, stats.lotLost, out);
  const seed = op.id;
  const u = (...parts: (string | number)[]): number => unit(seed, ...parts);
  const pick = (xs: readonly CalibrationKey[], ...parts: (string | number)[]): CalibrationKey => xs[Math.min(xs.length - 1, Math.floor(u(...parts) * xs.length))]!;
  const sign = (...parts: (string | number)[]): 1 | -1 => (u(...parts) < 0.5 ? -1 : 1);
  // Markings: two 10 x 5 m tiles stacked across the 10 x 10 m lot.
  const tile = boundsOf(PARKING_LINES);
  for (const q of [-tile.d / 2, tile.d / 2]) accept([{ key: PARKING_LINES, p: 0, q }], "lines");
  // Barriers along the back edge, two or three.
  const skip = u("barrierskip") < 0.5 ? Math.floor(u("barrierwhich") * 3) : -1;
  [-3.6, 0, 3.6].forEach((x, i) => {
    if (i !== skip) accept([{ key: pick(BARRIERS, "barrier", i), p: x, q: -f.D + 0.5 }], "barrier");
  });
  // A meter near the front, and sometimes a second on the other side.
  const ms = sign("meter");
  accept([{ key: pick(LOT_METERS, "meterkey"), p: ms * 4.3, q: f.D - 1.1 }], "lotMeter");
  if (u("meter2") < 0.4) accept([{ key: pick(LOT_METERS, "meterkey2"), p: -ms * 4.3, q: f.D - 1.1 }], "lotMeter");
  // A pole billboard, under the lowest eave of the buildings beside the lot.
  const pole = boundsOf(BILLBOARD_POLE);
  const board = boundsOf(BILLBOARD_BOARD);
  if (u("billboard") < P_PARKING_BILLBOARD) {
    const top = Math.max(pole.h, BILLBOARD_BOARD_LIFT_M + board.h);
    if (top <= eave + EPS) {
      const x = sign("billboardside") * (f.W - 0.5 - board.w / 2);
      accept(
        [
          { key: BILLBOARD_POLE, p: x, q: -f.D * 0.45 },
          { key: BILLBOARD_BOARD, p: x, q: -f.D * 0.45, lift: BILLBOARD_BOARD_LIFT_M },
        ],
        "billboard",
      );
    } else inc(stats.lotLost, "billboard:eave");
  }
}
