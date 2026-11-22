/**
 * Stage 9: the checks (ticket 070 TR1; the stage's own). `trafficFailures(layer, input)` is run by the stage before it returns, and by the fixtures. It judges a layer from its pieces and the layers before it, never from how the stage placed them.
 * A failure names its check and its cells. Stop rule (R-2): a check that fails on a named run stops the builder; nothing is loosened or tuned.
 * - **keys.** Every piece carries its kind's key (the kit's), so a key allowed for one kind is never on another and a key that is not allowed at all is never on a piece.
 * - **TC1 control.** Every junction's control and approaches are the rules' (SJ, AS, T, C, IN).
 * - **TC2 signals.** A signal junction has, for each inbound approach, one mast on its far-left corner and one arm fixed to the mast's clamp, over the approach's own carriageway, heads toward the traffic, none lower than `SIGNAL_HEAD_MIN_M`, its free end short of
 *   the far kerb; a walk head for each crossing at the mast's corner, one button a mast, one box a junction. No signal piece stands anywhere else.
 * - **TC3 signs.** Each "stop" approach has exactly one stop sign, on the cell the rules name (ST), facing its traffic; no other approach has one.
 *   A parking sign (TR1b) is hosted by the stretch of `CityBayTile`s it marks: each stretch has at most one, at its low end where the walk lies (its pivot, cell and turn as `parkingPlace` says), and a stretch with none is one where CL would refuse the sign.
 * - **TC4 place.** A grounded piece's footprint lies inside the walk cell it stands on (a `pavement` or `pavementCorner` cell, never a kerb cut or the carriageway), and that cell is the one it records.
 * - **TC5 clear.** CL (`clear.ts`): stage 8's props, stage 7's boxes, stage 5's buildings, stage 6's points, the build-out trees.
 */

import type { CityCell, CityEdgeLayer, CityFacadesLayer, CityGroundLayer, CityMassLayer, CityPlanStreet, CityStreetsLayer, CityTrafficLayer, CityTrafficPiece } from "../../core";
import { SIGNAL_HEAD_MIN_M, TOL } from "./constants";
import { SIDE_VEC, SIDE_YAW, cellRect, clearOf, clearReasons, footOf, rotate, sideOf, standCell, within, poleOf, pieceRect, type KeepPoint } from "./clear";
import { HEADING, buildControl, edgeInfoOf, farLeftOf, rectOf, rightOf, type EdgeInfo } from "./control";
import { ARM, ARM_BASE_Y, HEAD_LOW_Y, KEY_OF_KIND } from "./kit";
import { crossingsAt } from "./signals";
import { bayStretches, parkingPiece, parkingPlace, stopPlace } from "./signs";

export interface TrafficFailure {
  readonly check: string;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

export interface TrafficInput {
  readonly streets: Pick<CityStreetsLayer, "streets" | "junctions">;
  readonly mass: Pick<CityMassLayer, "built">;
  readonly edge: Pick<CityEdgeLayer, "cells" | "ground" | "buildoutTrees" | "tiles">;
  readonly facades: Pick<CityFacadesLayer, "dressing" | "walls" | "novelty">;
  readonly ground: Pick<CityGroundLayer, "props">;
  /** What stage 6 will place (poles, lamp posts, nodes). Empty until K. */
  readonly keepPoints?: readonly KeepPoint[];
}

const SIGNAL_KINDS: ReadonlySet<string> = new Set(["signalMast", "signalArm", "walkHead", "pushButton", "signalBox"]);
const WALK_ROLES: ReadonlySet<string> = new Set(["pavement", "pavementCorner"]);
const INFO = new WeakMap<object, EdgeInfo>();
const edgeInfo = (edge: TrafficInput["edge"]): EdgeInfo => {
  let i = INFO.get(edge);
  if (!i) {
    i = edgeInfoOf(edge);
    INFO.set(edge, i);
  }
  return i;
};
const same = (a: CityCell, b: CityCell): boolean => a.i === b.i && a.j === b.j;

/** Every failure of every check, in check order. Empty when the layer is sound. */
export function trafficFailures(layer: CityTrafficLayer, input: TrafficInput): TrafficFailure[] {
  const out: TrafficFailure[] = [];
  const fail = (check: string, reason: string, cells: readonly CityCell[], p?: CityTrafficPiece): void => {
    out.push({ check, reason: p ? `${reason} (${p.kind} ${p.placement.key.replace("city-pack:", "")} at ${p.placement.x_m.toFixed(2)}, ${p.placement.z_m.toFixed(2)})` : reason, cells });
  };
  const info = edgeInfo(input.edge);
  const byJunction = new Map(input.streets.junctions.map((j) => [j.id, j] as const));
  const streetOf = new Map<string, CityPlanStreet>(input.streets.streets.map((s) => [s.id, s] as const));

  // keys
  for (const p of layer.pieces) {
    const key = KEY_OF_KIND[p.kind];
    if (key === undefined || p.placement.key !== key) fail("keys", `the key is not the ${p.kind}'s key`, [p.cell], p);
  }

  // TC1 control
  const want = buildControl(input.streets);
  if (layer.junctions.length !== want.length) fail("TC1 control", `the layer has ${layer.junctions.length} junctions, the streets layer ${want.length}`, []);
  const got = new Map(layer.junctions.map((t) => [t.junction, t] as const));
  for (const w of want) {
    const t = got.get(w.junction);
    const cells = byJunction.get(w.junction)?.cells ?? [];
    if (!t) {
      fail("TC1 control", `junction ${w.junction} has no control`, cells);
      continue;
    }
    if (t.control !== w.control) fail("TC1 control", `junction ${w.junction} is ${t.control}, the rules say ${w.control}`, cells);
    if (t.approaches.length !== w.approaches.length) fail("TC1 control", `junction ${w.junction} has ${t.approaches.length} approaches, not ${w.approaches.length}`, cells);
    w.approaches.forEach((a, k) => {
      const b = t.approaches[k];
      if (!b || b.id !== a.id || b.junction !== a.junction || b.street !== a.street || b.arm !== a.arm) fail("TC1 control", `approach ${a.id} is out of order or wrong`, cells);
      else if (b.inbound !== a.inbound) fail("TC1 control", `approach ${a.id} is ${b.inbound ? "" : "not "}inbound, the rules say ${a.inbound ? "" : "not "}inbound`, cells);
      else if (b.control !== a.control) fail("TC1 control", `approach ${a.id} is "${b.control}", the rules say "${a.control}"`, cells);
    });
  }

  const piecesOf = new Map<string, CityTrafficPiece[]>();
  for (const p of layer.pieces) {
    const list = piecesOf.get(p.host);
    if (list) list.push(p);
    else piecesOf.set(p.host, [p]);
  }

  // TC2 signals, TC3 signs
  for (const t of want) {
    const j = byJunction.get(t.junction)!;
    const mine = piecesOf.get(j.id) ?? [];
    const r = rectOf(j);
    const signalHere = mine.filter((p) => SIGNAL_KINDS.has(p.kind));
    if (t.control !== "signals") {
      for (const p of signalHere) fail("TC2 signals", `a ${p.kind} at ${j.id}, which is not a signal junction`, [p.cell], p);
    } else {
      for (const a of t.approaches) {
        if (a.control !== "signal") continue;
        const street = streetOf.get(a.street)!;
        const masts = mine.filter((p) => p.kind === "signalMast" && p.approach === a.id);
        const arms = mine.filter((p) => p.kind === "signalArm" && p.approach === a.id);
        if (masts.length !== 1) {
          fail("TC2 signals", `approach ${a.id} has ${masts.length} masts, not 1`, [...j.cells]);
          continue;
        }
        const mast = masts[0]!;
        const corner = farLeftOf(r, a.arm);
        if (!same(standCell(mast), corner.cell)) fail("TC2 signals", `approach ${a.id}'s mast is not on its far-left corner (${corner.cell.i}, ${corner.cell.j})`, [standCell(mast)], mast);
        if (arms.length !== 1) {
          fail("TC2 signals", `approach ${a.id} has ${arms.length} arms, not 1`, [corner.cell]);
          continue;
        }
        const arm = arms[0]!;
        if (arm.group !== mast.group) fail("TC2 signals", `approach ${a.id}'s arm is not in its mast's group`, [corner.cell], arm);
        // the arm is fixed by its clamp to the mast's collar
        const q = rotate(arm.placement.yaw_deg, ARM.axis.x, ARM.axis.z);
        const clamp = { x: arm.placement.x_m + q.x, z: arm.placement.z_m + q.z };
        const pole = poleOf(mast);
        if (Math.abs(clamp.x - pole.x) > TOL || Math.abs(clamp.z - pole.z) > TOL || Math.abs(arm.placement.y_m - ARM_BASE_Y) > TOL) fail("TC2 signals", `approach ${a.id}'s arm is not fixed to its mast's clamp`, [corner.cell], arm);
        // the heads' lenses face the approaching traffic: the side the arm leaves by
        const lens = rotate(arm.placement.yaw_deg, -1, 0);
        const toward = SIDE_VEC[a.arm];
        if (lens.x !== toward[0] || lens.z !== toward[1]) fail("TC2 signals", `approach ${a.id}'s arm faces away from its traffic`, [corner.cell], arm);
        // the arm crosses the approach's own carriageway and stops short of the far kerb
        const across = a.arm === "-z" || a.arm === "+z" ? "x" : "z";
        const rt = rightOf(HEADING[a.arm]);
        const reach = across === "x" ? rt[0] : rt[1];
        const run = Math.sign(reach);
        const lo = street.carriage.lo_m;
        const hi = street.carriage.hi_m;
        const rect = pieceRect(arm);
        const a0 = across === "x" ? rect.x0 : rect.z0;
        const a1 = across === "x" ? rect.x1 : rect.z1;
        const overCarriageway = Math.min(a1, hi) - Math.max(a0, lo);
        const farEnd = run > 0 ? a1 : a0;
        if (overCarriageway < ARM.reach / 2) fail("TC2 signals", `approach ${a.id}'s arm does not cross its carriageway (${overCarriageway.toFixed(2)} m over it)`, [corner.cell], arm);
        if (farEnd > hi + TOL || farEnd < lo - TOL) fail("TC2 signals", `approach ${a.id}'s arm ends at ${farEnd.toFixed(2)}, past its carriageway (${lo} to ${hi})`, [corner.cell], arm);
        if (arm.placement.y_m + ARM.headLowY < SIGNAL_HEAD_MIN_M - TOL || HEAD_LOW_Y < SIGNAL_HEAD_MIN_M - TOL) fail("TC2 signals", `approach ${a.id}'s head hangs at ${(arm.placement.y_m + ARM.headLowY).toFixed(2)} m, under ${SIGNAL_HEAD_MIN_M} m`, [corner.cell], arm);
        // the walk heads and the button at the mast
        const group = mine.filter((p) => p.group === mast.group);
        const crossings = crossingsAt(corner, info);
        const heads = group.filter((p) => p.kind === "walkHead");
        if (heads.length !== crossings.length) fail("TC2 signals", `approach ${a.id}'s mast has ${heads.length} walk heads, its corner has ${crossings.length} crossings`, [corner.cell]);
        else {
          crossings.forEach((d, k) => {
            if (heads[k]!.placement.yaw_deg !== SIDE_YAW[sideOf(d[0], d[1])]) fail("TC2 signals", `a walk head does not face along its crossing`, [corner.cell], heads[k]);
          });
        }
        const buttons = group.filter((p) => p.kind === "pushButton");
        if (buttons.length !== 1) fail("TC2 signals", `approach ${a.id}'s mast has ${buttons.length} push buttons, not 1`, [corner.cell]);
      }
      const boxes = mine.filter((p) => p.kind === "signalBox");
      if (boxes.length !== 1) fail("TC2 signals", `junction ${j.id} has ${boxes.length} signal boxes, not 1`, [...j.cells]);
      const inGroup = new Set(mine.filter((p) => p.kind === "signalMast").map((p) => p.group));
      for (const p of mine) if ((p.kind === "signalArm" || p.kind === "walkHead" || p.kind === "pushButton") && !inGroup.has(p.group)) fail("TC2 signals", `a ${p.kind} with no mast in its group`, [p.cell], p);
    }
    // TC3
    const signs = mine.filter((p) => p.kind === "stopSign");
    const known = new Set(t.approaches.map((a) => a.id));
    for (const p of signs) if (p.approach === null || !known.has(p.approach)) fail("TC3 signs", `a stop sign belongs to no approach of ${j.id}`, [p.cell], p);
    for (const a of t.approaches) {
      const here = signs.filter((p) => p.approach === a.id);
      if (a.control !== "stop") {
        for (const p of here) fail("TC3 signs", `a stop sign on approach ${a.id}, whose control is "${a.control}"`, [p.cell], p);
        continue;
      }
      if (here.length !== 1) {
        fail("TC3 signs", `approach ${a.id} has ${here.length} stop signs, not 1`, [...j.cells]);
        continue;
      }
      const p = here[0]!;
      const place = stopPlace(j, a, info);
      if (!same(p.cell, place.cell)) fail("TC3 signs", `approach ${a.id}'s stop sign is on (${p.cell.i}, ${p.cell.j}), not on its kerbside at the near-right corner (${place.cell.i}, ${place.cell.j})`, [p.cell], p);
      if (p.placement.yaw_deg !== SIDE_YAW[a.arm]) fail("TC3 signs", `approach ${a.id}'s stop sign faces away from its traffic`, [p.cell], p);
    }
  }
  // TC3, parking signs: one a stretch, at its low end; a stretch with none must be one CL refuses
  const stretches = bayStretches(input.streets, input.edge);
  const stretchOf = new Map(stretches.map((s) => [s.host, s] as const));
  const ctxP = clearOf(input);
  for (const s of stretches) {
    const here = layer.pieces.filter((p) => p.kind === "parkingSign" && p.host === s.host);
    const place = parkingPlace(s, info);
    if (here.length > 1) fail("TC3 signs", `stretch ${s.host} has ${here.length} parking signs, not 1`, [...s.cells]);
    if (here.length === 0) {
      if (place && clearReasons(ctxP, parkingPiece(s, place)).length === 0) fail("TC3 signs", `stretch ${s.host} has no parking sign and nothing refuses one`, [...s.cells]);
      continue;
    }
    const p = here[0]!;
    if (!place) fail("TC3 signs", `stretch ${s.host} has a parking sign and no single walk cell across from it`, [p.cell], p);
    else if (!same(p.cell, place.cell) || Math.abs(p.placement.x_m - place.x) > TOL || Math.abs(p.placement.z_m - place.z) > TOL || p.placement.yaw_deg !== place.yaw) fail("TC3 signs", `stretch ${s.host}'s parking sign is not at the stretch's low end, on its kerb line, facing the walk`, [p.cell], p);
  }
  for (const p of layer.pieces) if (p.kind === "parkingSign" && !stretchOf.has(p.host)) fail("TC3 signs", `a parking sign hosted by ${p.host}, which is no stretch of bay tiles`, [p.cell], p);
  for (const p of layer.pieces) if (!byJunction.has(p.host) && p.kind !== "parkingSign") fail("TC3 signs", `a ${p.kind} hosted by ${p.host}, which is not a junction`, [p.cell], p);

  // TC4 place
  for (const p of layer.pieces) {
    if (!p.grounded) continue;
    const c = standCell(p);
    if (!same(c, p.cell)) fail("TC4 place", `its cell (${p.cell.i}, ${p.cell.j}) is not the cell it stands in (${c.i}, ${c.j})`, [p.cell], p);
    const role = info.roleAt(c);
    if (role === undefined || !WALK_ROLES.has(role)) fail("TC4 place", `it stands on a ${role ?? "non-street"} cell, not a pavement or a pavement corner`, [c], p);
    else if (!within(footOf(p), cellRect(c))) fail("TC4 place", "its footprint is not inside the cell it stands on", [c], p);
  }

  // TC5 clear
  const ctx = clearOf(input);
  for (const p of layer.pieces) for (const why of clearReasons(ctx, p)) fail("TC5 clear", why, [p.cell], p);
  return out;
}
