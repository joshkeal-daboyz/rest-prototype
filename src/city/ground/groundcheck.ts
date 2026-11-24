/**
 * Stage 8: the checks (ticket 070 I; the checklist's R10 and the stage's own). `groundFailures(layer, input)` is run by the stage before it returns, and by the fixtures. It judges a layer from its props, its runs and the layers before it,
 * never from how the stage placed them. A failure names its check and the cells. Stop rule (R-2): a check that fails on a named run stops the builder; nothing is loosened or tuned.
 *
 * Checks: R10 pitch, R10 pavement, R10 corners, R10 keep-outs (pavement props and lane bins only, Q28 answer 5), R10 caps, R10 place, R10 clash, stage 7 (AV and EL; every prop), doors (DK), meters (MT), greens (GB), keys.
 */

import type {
  CityCell,
  CityEdgeLayer,
  CityFacadesLayer,
  CityGroundLayer,
  CityGroundProp,
  CityMassLayer,
} from "../../core";
import { BENCH_FROM_PATH_M, BOLLARD_PER_RUN, BUS_STOP_MIN_RUN_M, BUS_STOP_PER_RUN, CELL_M, FURN_CORNER_M, FURN_GAP_M, FURN_KEEP_M, FURN_KERB_M, FURN_PITCH_M, FURN_WALL_M, HYDRANT_PER_RUN, MAILBOX_PER_RUN, NEWSPAPER_PER_RUN, TREE_PITCH_M } from "./constants";
import { Grid, cellKey, overlaps, type Rect } from "./geom";
import { avoidVerdict, buildKeepouts, inDoorStrip, keepoutHit, type KeepPoint, type Keepouts } from "./keepout";
import { KEYS_OF_KIND } from "./kit";
import { meterHasBay } from "./pavement";
import { propRect } from "./props";
import { frameOf, geoOf, type RunGeo } from "./runs";

export interface GroundFailure {
  readonly check: string;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

export interface GroundInput {
  readonly mass: Pick<CityMassLayer, "cells" | "built" | "openings">;
  readonly edge: Pick<CityEdgeLayer, "cells" | "ground" | "bays">;
  readonly facades: Pick<CityFacadesLayer, "ground" | "dressing" | "walls" | "novelty">;
  /** Stage 6's `circuit.keep` (I2): every pole and street light. */
  readonly keepPoints?: readonly KeepPoint[];
}

const TOL = 1e-6;
/** The keep-outs of an input, built once per input object (the layers are frozen, so the fixtures reuse them). */
const KEEP = new WeakMap<object, Keepouts>();
/** The unit vector a turn faces (its own +z after the turn). */
const FACING: Readonly<Record<number, readonly [number, number]>> = { 0: [0, 1], 90: [1, 0], 180: [0, -1], 270: [-1, 0] };

/** Every failure of every check, in check order. Empty when the layer is sound. */
export function groundFailures(layer: CityGroundLayer, input: GroundInput): GroundFailure[] {
  const out: GroundFailure[] = [];
  const fail = (check: string, reason: string, p: CityGroundProp | null, cells?: readonly CityCell[]): void => {
    out.push({ check, reason: p ? `${reason} (${p.kind} ${p.placement.key.replace("city-pack:", "")} at ${p.placement.x_m.toFixed(2)}, ${p.placement.z_m.toFixed(2)})` : reason, cells: cells ?? (p ? [p.cell] : []) });
  };
  let keep = KEEP.get(input);
  if (!keep) {
    keep = buildKeepouts({ mass: input.mass, edge: input.edge, facades: input.facades }, input.keepPoints ?? []);
    KEEP.set(input, keep);
  }
  const runs = new Map<string, RunGeo>(layer.runs.map((r) => [r.id, geoOf(r)] as const));
  const massAt = new Map(input.mass.cells.map((c) => [cellKey(c.i, c.j), c] as const));
  const builtAt = new Set(input.mass.built.map((c) => cellKey(c.i, c.j)));
  const openings = new Map(input.mass.openings.map((o) => [o.id, o] as const));
  const rects = layer.props.map(propRect);
  const useOf = (c: CityCell): string => massAt.get(cellKey(c.i, c.j))?.use ?? "none";

  // keys
  layer.props.forEach((p) => {
    if (!KEYS_OF_KIND[p.kind].includes(p.placement.key)) fail("keys", `the key is not one of the kit's ${p.kind} keys`, p);
  });

  // R10 place
  layer.props.forEach((p, n) => {
    const pivot = { i: Math.floor(p.placement.x_m / CELL_M), j: Math.floor(p.placement.z_m / CELL_M) };
    if (pivot.i !== p.cell.i || pivot.j !== p.cell.j) fail("R10 place", `its cell (${p.cell.i}, ${p.cell.j}) is not its pivot's (${pivot.i}, ${pivot.j})`, p);
    const r = rects[n]!;
    if (p.on === "green") {
      if (useOf(pivot) !== "green") fail("R10 place", `a green prop stands on a ${useOf(pivot)} cell`, p);
    } else if (p.on === "lane") {
      if (useOf(pivot) !== "lane") fail("R10 place", `a lane bin stands on a ${useOf(pivot)} cell, not a lane cell`, p);
      const [, axis, atText] = p.host.split("|") as [string, "x" | "z", string];
      const at = Number(atText);
      const alongZ = axis === "z";
      const across = alongZ ? p.placement.x_m : p.placement.z_m;
      const half = alongZ ? p.size.x_m / 2 : p.size.z_m / 2;
      const plus = alongZ ? p.placement.yaw_deg === 270 : p.placement.yaw_deg === 180;
      const minus = alongZ ? p.placement.yaw_deg === 90 : p.placement.yaw_deg === 0;
      if (!plus && !minus) fail("R10 place", "a lane bin does not face across its lane", p);
      else {
        const wallGap = plus ? (at + 1) * CELL_M - (across + half) : across - half - at * CELL_M;
        if (Math.abs(wallGap - FURN_WALL_M) > TOL) fail("R10 place", `a lane bin's back is ${wallGap.toFixed(3)} m from the wall, not ${FURN_WALL_M} m`, p);
        const beside = alongZ ? { i: at + (plus ? 1 : -1), j: pivot.j } : { i: pivot.i, j: at + (plus ? 1 : -1) };
        if (!builtAt.has(cellKey(beside.i, beside.j))) fail("R10 place", "a lane bin has no built cell beside it", p);
      }
    } else if (p.on === "plaza" || p.on === "frontLot") {
      const op = openings.get(p.host);
      if (!op) fail("R10 place", `its opening ${p.host} does not exist`, p);
      else {
        const i0 = Math.min(...op.cells.map((c) => c.i)) * CELL_M;
        const i1 = (Math.max(...op.cells.map((c) => c.i)) + 1) * CELL_M;
        const j0 = Math.min(...op.cells.map((c) => c.j)) * CELL_M;
        const j1 = (Math.max(...op.cells.map((c) => c.j)) + 1) * CELL_M;
        if (r.x0 < i0 - TOL || r.x1 > i1 + TOL || r.z0 < j0 - TOL || r.z1 > j1 + TOL) fail("R10 place", `a piece is outside its opening ${p.host}`, p);
      }
    } else {
      const run = runs.get(p.host);
      if (!run) fail("R10 place", `its run ${p.host} does not exist`, p);
      else if (!run.pavement.some((c) => c.i === pivot.i && c.j === pivot.j)) fail("R10 place", "a pavement prop's cell is not one of its run's pavement cells", p);
    }
  });

  // pavement props: R10 pavement, R10 corners, R10 pitch, R10 caps, meters
  const byRun = new Map<string, number[]>();
  layer.props.forEach((p, n) => {
    if (p.on !== "pavement") return;
    const list = byRun.get(p.host);
    if (list) list.push(n);
    else byRun.set(p.host, [n]);
  });
  for (const [id, list] of byRun) {
    const run = runs.get(id);
    if (!run) continue;
    const frames = list.map((n) => {
      const r = rects[n]!;
      const a = frameOf(run, r.x0, r.z0);
      const b = frameOf(run, r.x1, r.z1);
      return { n, s0: Math.min(a.s, b.s), s1: Math.max(a.s, b.s), t0: Math.min(a.t, b.t), t1: Math.max(a.t, b.t) };
    });
    for (const f of frames) {
      const p = layer.props[f.n]!;
      if (f.s0 < -TOL || f.s1 > run.len + TOL || f.t0 < -TOL || f.t1 > CELL_M - FURN_KERB_M + TOL) fail("R10 pavement", `a pavement prop's footprint is outside its run's walk (s ${f.s0.toFixed(2)} to ${f.s1.toFixed(2)} of ${run.len}, t ${f.t0.toFixed(2)} to ${f.t1.toFixed(2)})`, p);
      if (p.line === "wall" ? Math.abs(f.t0 - FURN_WALL_M) > TOL : p.line === "kerb" ? Math.abs(f.t1 - (CELL_M - FURN_KERB_M)) > TOL : true) fail("R10 pavement", `a pavement prop is off its ${p.line ?? "missing"} line`, p);
      if (f.s0 < FURN_CORNER_M - TOL || f.s1 > run.len - FURN_CORNER_M + TOL) fail("R10 corners", `a pavement prop is within ${FURN_CORNER_M} m of its run's end (s ${f.s0.toFixed(2)} to ${f.s1.toFixed(2)} of ${run.len})`, p);
    }
    for (let x = 0; x < frames.length; x++) {
      for (let y = x + 1; y < frames.length; y++) {
        const a = frames[x]!;
        const b = frames[y]!;
        const pa = layer.props[a.n]!;
        const pb = layer.props[b.n]!;
        const sa = (a.s0 + a.s1) / 2;
        const sb = (b.s0 + b.s1) / 2;
        if (pa.line === pb.line && Math.abs(sa - sb) < FURN_PITCH_M - TOL) fail("R10 pitch", `two ${pa.line}-line props are ${Math.abs(sa - sb).toFixed(2)} m apart, under ${FURN_PITCH_M} m (with a ${pb.kind})`, pa);
        if (pa.kind === "tree" && pb.kind === "tree" && Math.abs(sa - sb) < TREE_PITCH_M - TOL) fail("R10 pitch", `two trees of one run are ${Math.abs(sa - sb).toFixed(2)} m apart, under ${TREE_PITCH_M} m`, pa);
        if (overlaps(rects[a.n]!, rects[b.n]!, FURN_GAP_M)) fail("R10 pitch", `two footprints of one run are closer than ${FURN_GAP_M} m (a ${pa.kind} and a ${pb.kind})`, pa);
      }
    }
    const count = (kind: string): number => list.filter((n) => layer.props[n]!.kind === kind).length;
    const caps: [string, number][] = [
      ["hydrant", HYDRANT_PER_RUN],
      ["mailbox", MAILBOX_PER_RUN],
      ["newspaper", NEWSPAPER_PER_RUN],
      ["busStop", BUS_STOP_PER_RUN],
      ["bollard", BOLLARD_PER_RUN],
    ];
    for (const [kind, cap] of caps) if (count(kind) > cap) fail("R10 caps", `run ${id} has ${count(kind)} ${kind} props, over its cap of ${cap}`, null, run.cells);
    if (count("busStop") > 0 && run.len < BUS_STOP_MIN_RUN_M) fail("R10 caps", `run ${id} is ${run.len} m long and has a bus stop (it needs ${BUS_STOP_MIN_RUN_M} m)`, null, run.cells);
    // MT
    const bays = input.edge.bays;
    for (const n of list) {
      const p = layer.props[n]!;
      if (p.kind === "meter" && !meterHasBay(run, p, bays)) fail("meters", `a kerb-line meter is level with no bay of ${run.street} on ${run.block}`, p);
    }
  }

  // R10 keep-outs: pavement props and lane bins only
  layer.props.forEach((p, n) => {
    if (p.on !== "pavement" && p.on !== "lane") return;
    const why = keepoutHit(keep, rects[n]!);
    if (why !== null) fail("R10 keep-outs", `within ${FURN_KEEP_M} m of a ${why}`, p);
  });

  // stage 7 (AV, EL): every prop; doors (DK): wall-line pavement props and lane bins
  layer.props.forEach((p, n) => {
    const av = avoidVerdict(keep, rects[n]!, p.size.h_m, p.placement.y_m);
    if (av !== null) fail("stage 7", `a prop of ${p.size.h_m} m stands under a stage 7 piece (${av === "EL" ? "EL: a fire escape's drop ladder" : "AV"})`, p);
    if (((p.on === "pavement" && p.line === "wall") || (p.kind === "bin" && p.on === "lane")) && inDoorStrip(keep, rects[n]!)) fail("doors", "a wall-line prop or a bin is in front of a residents' door", p);
  });

  // R10 clash: two props that are not flat overlap
  const grid = new Grid<Rect & { n: number }>();
  layer.props.forEach((p, n) => {
    if (!p.flat) grid.add({ ...rects[n]!, n });
  });
  layer.props.forEach((p, n) => {
    if (p.flat) return;
    for (const o of grid.near(rects[n]!)) {
      if (o.n <= n) continue;
      const q = layer.props[o.n]!;
      if (p.host === q.host && [p.kind, q.kind].sort().join() === "billboardBoard,billboardPole") continue;
      const margin = p.host === q.host && (p.on === "plaza" || p.on === "frontLot") ? FURN_GAP_M * 0.5 : 0;
      const lo = p.placement.y_m;
      const lo2 = q.placement.y_m;
      if (overlaps(rects[n]!, o, margin) && lo < lo2 + q.size.h_m - 1e-9 && lo2 < lo + p.size.h_m - 1e-9) fail("R10 clash", `a ${p.kind} and a ${q.kind} overlap`, p);
    }
  });

  // greens (GB)
  const benchCells = new Map<string, number>();
  layer.props.forEach((p) => {
    if (p.on !== "green" || p.kind !== "bench") return;
    const k = cellKey(p.cell.i, p.cell.j);
    benchCells.set(k, (benchCells.get(k) ?? 0) + 1);
  });
  layer.props.forEach((p) => {
    if (p.on !== "green") return;
    if (p.kind === "bench") {
      const f = FACING[p.placement.yaw_deg]!;
      const target = { i: p.cell.i + f[0], j: p.cell.j + f[1] };
      if (useOf(target) !== "greenPath") fail("greens", "a bench does not face a path cell", p);
      else {
        const edge = f[0] === 1 ? (p.cell.i + 1) * CELL_M - p.placement.x_m : f[0] === -1 ? p.placement.x_m - p.cell.i * CELL_M : f[1] === 1 ? (p.cell.j + 1) * CELL_M - p.placement.z_m : p.placement.z_m - p.cell.j * CELL_M;
        if (Math.abs(edge - BENCH_FROM_PATH_M) > TOL) fail("greens", `a bench stands ${edge.toFixed(3)} m from its path's edge, not ${BENCH_FROM_PATH_M} m`, p);
      }
      if ((benchCells.get(cellKey(p.cell.i, p.cell.j)) ?? 0) > 1) fail("greens", "two benches stand in one cell", p);
    } else if (p.kind === "tree") {
      if (Math.abs(p.placement.x_m - (p.cell.i + 0.5) * CELL_M) > TOL || Math.abs(p.placement.z_m - (p.cell.j + 0.5) * CELL_M) > TOL) fail("greens", "a tree is not at its cell's middle", p);
      if (benchCells.has(cellKey(p.cell.i, p.cell.j))) fail("greens", "a tree stands on a bench cell", p);
    }
  });
  return out;
}
