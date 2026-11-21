/**
 * Stage 8: the pavements (ticket 070 I; the run loop of `furnitureLayout`, src/render3d/furniture.ts, and `bayMeters`, tilecity.ts). Two lines along each run: a wall line (an item's back `FURN_WALL_M` in from the wall edge) and a kerb line
 * (its front `FURN_KERB_M` in from the kerb edge), every item facing the street, bollards just past each end's corner keep-out, then the walk along a line: a first place, a fill chance, a hashed gap, the weighted group order and the
 * key pick. Every keep-out the tile city tests is tested (corners, pitch, tree pitch, caps, the footprint gap), plus KO, AV, EL and DK. After a run's layout, MT takes out a kerb-line meter with no bay of its block side beside it.
 */

import type { CalibrationKey, CityGroundProp, CityKerbBay } from "../../core";
import {
  BOLLARD_PER_RUN,
  BUS_STOP_MIN_RUN_M,
  BUS_STOP_PER_RUN,
  CELL_M,
  EPS,
  FURN_CORNER_M,
  FURN_GAP_M,
  FURN_GAP_SPAN_M,
  FURN_KERB_M,
  FURN_PITCH_M,
  FURN_WALL_M,
  HYDRANT_PER_RUN,
  MAILBOX_PER_RUN,
  NEWSPAPER_PER_RUN,
  P_BOLLARD,
  P_FURN,
  TREE_PITCH_M,
} from "./constants";
import { overlaps, type Rect } from "./geom";
import { avoidVerdict, inDoorStrip, keepoutHit, type Keepouts } from "./keepout";
import { BENCHES, BINS, BOLLARDS, BUS_STOPS, HYDRANTS, MAILBOXES, METERS, NEWSPAPERS, PLANTERS, POT_PLANTS, TREES, boundsOf } from "./kit";
import { makeProp } from "./props";
import { worldOf, type RunGeo } from "./runs";
import { inc, type GroundStats } from "./stats";

interface Group {
  readonly id: string;
  readonly keys: readonly CalibrationKey[];
  readonly weight: number;
  readonly cap?: number;
  readonly minRun?: number;
}

/** `furnitureLayout`'s WALL_GROUPS and KERB_GROUPS. */
export const WALL_GROUPS: readonly Group[] = [
  { id: "bin", keys: BINS, weight: 3 },
  { id: "planter", keys: PLANTERS, weight: 2 },
  { id: "pot", keys: POT_PLANTS, weight: 2 },
  { id: "bench", keys: BENCHES, weight: 2 },
  { id: "mailbox", keys: MAILBOXES, weight: 1, cap: MAILBOX_PER_RUN },
  { id: "news", keys: NEWSPAPERS, weight: 1, cap: NEWSPAPER_PER_RUN },
];
export const KERB_GROUPS: readonly Group[] = [
  { id: "meter", keys: METERS, weight: 3 },
  { id: "tree", keys: TREES, weight: 2 },
  { id: "hydrant", keys: HYDRANTS, weight: 1, cap: HYDRANT_PER_RUN },
  { id: "busstop", keys: BUS_STOPS, weight: 1, cap: BUS_STOP_PER_RUN, minRun: BUS_STOP_MIN_RUN_M },
];

/** `furnitureLayout`'s `weightedOrder`: the groups from the one the unit picks by weight, then round. */
export function weightedOrder<T extends { weight: number }>(xs: readonly T[], unit: number): T[] {
  const total = xs.reduce((s, x) => s + x.weight, 0);
  let acc = 0;
  let start = 0;
  for (let i = 0; i < xs.length; i++) {
    acc += xs[i]!.weight;
    if (unit * total < acc) {
      start = i;
      break;
    }
  }
  return [...xs.slice(start), ...xs.slice(0, start)];
}

export type Unit = (...key: readonly (string | number)[]) => number;

/** The pavement props of one run, in the order `furnitureLayout` places them (bollards, the wall line, the kerb line), meters not yet taken out. */
export function layoutRun(run: RunGeo, keep: Keepouts, unit: Unit, stats: GroundStats): CityGroundProp[] {
  const out: CityGroundProp[] = [];
  const len = run.len;
  const placed: { s: number; line: string; rect: Rect; tree: boolean }[] = [];
  const counts = new Map<string, number>();

  /** The reason a place is refused (the first that applies, in the tile city's order, then KO, AV, EL, DK), or null when the prop was placed. */
  const tryPlace = (g: { id: string; cap?: number }, key: CalibrationKey, line: "wall" | "kerb", s: number): string | null => {
    const e = boundsOf(key);
    if ((counts.get(g.id) ?? 0) >= (g.cap ?? Infinity)) return "caps";
    if (s - e.w / 2 < FURN_CORNER_M - EPS || s + e.w / 2 > len - FURN_CORNER_M + EPS) return "corners";
    const t = line === "wall" ? FURN_WALL_M + e.d / 2 : CELL_M - FURN_KERB_M - e.d / 2;
    if (t - e.d / 2 < -EPS || t + e.d / 2 > CELL_M - FURN_KERB_M + EPS) return "pavement";
    for (const o of placed) {
      if (o.line === line && Math.abs(o.s - s) < FURN_PITCH_M - EPS) return "pitch";
      if (g.id === "tree" && o.tree && Math.abs(o.s - s) < TREE_PITCH_M - EPS) return "treePitch";
    }
    const w = worldOf(run, s, t, e.w, e.d);
    if (keepoutHit(keep, w.rect) !== null) return "KO";
    const av = avoidVerdict(keep, w.rect, e.h, 0);
    if (av !== null) return av;
    if (line === "wall" && inDoorStrip(keep, w.rect)) return "DK";
    for (const o of placed) if (overlaps(w.rect, o.rect, FURN_GAP_M)) return "clash";
    out.push(makeProp({ key, on: "pavement", block: run.block, host: run.id, line, x: w.x, z: w.z, yaw: run.yaw }));
    placed.push({ s, line, rect: w.rect, tree: g.id === "tree" });
    counts.set(g.id, (counts.get(g.id) ?? 0) + 1);
    return null;
  };

  // Bollards, just beyond each corner's keep-out.
  let bollards = 0;
  for (const [n, s] of [FURN_CORNER_M + 0.4, len - FURN_CORNER_M - 0.4].entries()) {
    if (bollards >= BOLLARD_PER_RUN || unit(run.id, "bollard", n) >= P_BOLLARD) continue;
    const why = tryPlace({ id: "bollard", cap: BOLLARD_PER_RUN }, BOLLARDS[0]!, "kerb", s);
    if (why === null) bollards++;
    else inc(stats.pavTries, `bollard:${why}`);
  }

  for (const line of ["wall", "kerb"] as const) {
    const groups = line === "wall" ? WALL_GROUPS : KERB_GROUPS;
    let s = FURN_CORNER_M + 0.5 + unit(run.id, line, "first") * FURN_PITCH_M;
    for (let n = 0; s <= len - FURN_CORNER_M; n++) {
      if (unit(run.id, line, n, "fill") < P_FURN) {
        let first: string | null = null;
        let ok = false;
        for (const g of weightedOrder(
          groups.filter((x) => (x.minRun ?? 0) <= len),
          unit(run.id, line, n, "item"),
        )) {
          const key = g.keys[Math.min(g.keys.length - 1, Math.floor(unit(run.id, line, n, "key") * g.keys.length))]!;
          const why = tryPlace(g, key, line, s);
          if (why === null) {
            ok = true;
            break;
          }
          inc(stats.pavTries, `${line}:${why}`);
          first = first ?? why;
        }
        inc(stats.pavPlaces, ok ? `${line}:placed` : `${line}:refused:${first}`);
      }
      s += FURN_PITCH_M + unit(run.id, line, n, "gap") * FURN_GAP_SPAN_M;
    }
  }
  return out;
}

/** The meter's place along its run's street, metres (x on an "x" run, z on a "z" run). */
const alongOf = (run: RunGeo, p: CityGroundProp): number => (run.along === "x" ? p.placement.x_m : p.placement.z_m);

/** MT: is a kerb-line meter beside a bay of its run's own block side (a bay with the run's street and block, level with it along the street)? */
export function meterHasBay(run: RunGeo, p: CityGroundProp, bays: readonly CityKerbBay[]): boolean {
  const a = alongOf(run, p);
  return bays.some((b) => b.street === run.street && b.block === run.block && Math.abs(a - (run.along === "x" ? b.x_m : b.z_m)) <= b.w_m / 2 + 1e-6);
}

/** Every run's pavement props in `runs` order, with the meters MT takes out removed (their places are not refilled). */
export function layoutPavements(runs: readonly RunGeo[], keep: Keepouts, unit: Unit, bays: readonly CityKerbBay[], stats: GroundStats): CityGroundProp[] {
  const bayList = new Map<string, CityKerbBay[]>();
  for (const b of bays) {
    const k = `${b.street}|${b.block}`;
    const l = bayList.get(k);
    if (l) l.push(b);
    else bayList.set(k, [b]);
  }
  const out: CityGroundProp[] = [];
  for (const run of runs) {
    const own = bayList.get(`${run.street}|${run.block}`) ?? [];
    for (const p of layoutRun(run, keep, unit, stats)) {
      if (p.kind === "meter" && !meterHasBay(run, p, own)) {
        stats.meterMT++;
        continue;
      }
      out.push(p);
    }
  }
  return out;
}

