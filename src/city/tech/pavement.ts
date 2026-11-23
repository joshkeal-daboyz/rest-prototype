/**
 * Stage 11: pavement tech (ticket 073 D1; the D1 pre-check's section 2 and D1-Q4, D1-Q6; X-3: the tech pass keeps rule 10). Two lines along each pavement run, as stage 8 has them: a wall line (a piece's back
 * `FURN_WALL_M` in from the wall edge: the vending machine, the ATM) and a kerb line (its front `FURN_KERB_M` in from the kerb edge: the ad pillar, the charger), every piece facing the street.
 *
 * - **Slots.** Along a line, from the corner keep-out, a slot every `SLOT_PITCH_M` (the 7 m pitch), the first at a hashed offset. A slot takes a piece when its hash is under `P_PAVEMENT` x its district's `tech`
 *   (only from `SIGN_FROM_TECH`). The slot tries the line's keys from a hashed one, each at the slot's centre then up to `SLOT_REACH_M` either side; the first that holds is placed.
 * - **What a place keeps** (`placeRefusal`), the first that applies: the run's ends (4 m) and the 7 m pitch against stage 8's props and the pass's own on the same line; `FURN_KEEP_M` from every pole, street light and
 *   lamp-post place, and `FURN_MAX_H_M` under a span (`circuitRefusal`); KO; AV and EL (stage 7's boxes); DK on the wall line; `FURN_GAP_M` from every stage 8 and 9 footprint, from
 *   the shopfront panels and from the pass's own; and **at least `CLEAR_WALK_M` of clear walk** counting stage 8's pieces, the pass's other pavement pieces and its shopfront panels.
 */

import type { CalibrationKey, CityCell, CityEraPiece, CityTechPieceKind } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { avoidVerdict, inDoorStrip, koHit, type S7Box } from "./boxes";
import { circuitRefusal } from "./circuit";
import { CELL_M, CLEAR_WALK_M, EPS, FURN_CORNER_M, FURN_GAP_M, FURN_KERB_M, FURN_PITCH_M, FURN_WALL_M, P_PAVEMENT, SIGN_FROM_TECH, SLOT_PITCH_M, SLOT_REACH_M, SLOT_STEP_M } from "./constants";
import { districtOf, type TechCtx } from "./context";
import { cellOfPoint, normYaw, overlaps, turned, type Grid, type Rect } from "./geom";
import { indexOf, unitOf } from "./hash";
import { KERB_LINE, WALL_LINE, boundsOf } from "./kit";
import { bandOf, worldOf, type RunGeo } from "./runs";

export type Line = "wall" | "kerb";

/** One piece of the pass on a pavement (its own, or a shopfront panel), in its run's frame. */
export interface PavePiece {
  readonly rect: Rect;
  /** Its centre along the run, metres from `lo_m`. */
  readonly s: number;
  /** "panel" for a shopfront panel, which stands on the wall edge and takes no line's pitch. */
  readonly at: Line | "panel";
}

/** What the pass has put on each run's pavement so far. */
export class PaveState {
  private readonly byRun = new Map<string, PavePiece[]>();
  of(run: RunGeo): readonly PavePiece[] {
    return this.byRun.get(run.id) ?? [];
  }
  add(run: RunGeo, p: PavePiece): void {
    const l = this.byRun.get(run.id);
    if (l) l.push(p);
    else this.byRun.set(run.id, [p]);
  }
}

export interface PaveSpec {
  readonly key: CalibrationKey;
  readonly w: number;
  readonly h: number;
  readonly d: number;
}
export const specOf = (key: CalibrationKey): PaveSpec => ({ key, ...boundsOf(key) });

/** The clear walk across a run's pavement beside a footprint: the widest gap, metres, between the pieces whose span along the street meets the footprint's (counting the footprint itself). */
export function clearWalk(ctx: TechCtx, state: PaveState, run: RunGeo, rect: Rect): number {
  const me = bandOf(run, rect);
  const strip = worldOf(run, run.len / 2, CELL_M / 2, run.len, CELL_M).rect;
  const spans: [number, number][] = [[Math.max(0, me.t0), Math.min(CELL_M, me.t1)]];
  const take = (r: Rect): void => {
    const b = bandOf(run, r);
    if (b.s0 < me.s1 - EPS && b.s1 > me.s0 + EPS && b.t0 < CELL_M - EPS && b.t1 > EPS) spans.push([Math.max(0, b.t0), Math.min(CELL_M, b.t1)]);
  };
  for (const f of ctx.feet.near(strip)) if (!f.flat && overlaps(f, strip)) take(f);
  for (const p of state.of(run)) take(p.rect);
  spans.sort((a, b) => a[0] - b[0]);
  let widest = 0;
  let at = 0;
  for (const [a, b] of spans) {
    widest = Math.max(widest, a - at);
    at = Math.max(at, b);
  }
  return Math.max(widest, CELL_M - at);
}

/**
 * Why a piece may not stand at (`s`, line) of a run, the first reason that applies, or null when it may. `boxes` is stage 7's boxes. `h` is the piece's height.
 */
export function placeRefusal(ctx: TechCtx, boxes: Grid<S7Box>, state: PaveState, run: RunGeo, line: Line, s: number, spec: PaveSpec): string | null {
  const t = line === "wall" ? FURN_WALL_M + spec.d / 2 : CELL_M - FURN_KERB_M - spec.d / 2;
  if (s - spec.w / 2 < FURN_CORNER_M - EPS || s + spec.w / 2 > run.len - FURN_CORNER_M + EPS) return "corners";
  if (t - spec.d / 2 < -EPS || t + spec.d / 2 > CELL_M - FURN_KERB_M + EPS) return "pavement";
  const w = worldOf(run, s, t, spec.w, spec.d);
  const rect = w.rect;
  for (const p of ctx.propsOfRun.get(run.id) ?? []) {
    const ps = run.along === "x" ? p.placement.x_m - run.lo_m : p.placement.z_m - run.lo_m;
    const pt = run.sgn * ((run.along === "x" ? p.placement.z_m : p.placement.x_m) - run.wall_m);
    const pline: Line = pt < CELL_M / 2 ? "wall" : "kerb";
    if (pline === line && Math.abs(ps - s) < FURN_PITCH_M - EPS) return "pitch";
  }
  for (const o of state.of(run)) if (o.at === line && Math.abs(o.s - s) < FURN_PITCH_M - EPS) return "pitch";
  const c = circuitRefusal(ctx.circuit, rect, spec.h);
  if (c !== null) return c;
  if (koHit(ctx.ko, rect) !== null) return "KO";
  const av = avoidVerdict(boxes, rect, spec.h);
  if (av !== null) return av;
  if (line === "wall" && inDoorStrip(ctx.doors, rect)) return "DK";
  for (const f of ctx.feet.near(rect, FURN_GAP_M)) if (!f.flat && overlaps(rect, f, FURN_GAP_M)) return "clash";
  for (const o of state.of(run)) if (overlaps(rect, o.rect, FURN_GAP_M)) return "clash";
  if (clearWalk(ctx, state, run, rect) < CLEAR_WALK_M - EPS) return "walk";
  return null;
}

export interface PavementStats {
  /** Slots whose hash was under the chance. */
  taken: number;
  /** Slots, taken or not, where a piece fits (before the slot's own roll). */
  free: number;
  slots: number;
  placed: number;
  refused: Record<string, number>;
}

/** The offsets a slot tries, nearest the centre first: 0, +step, -step, +2 step, ... up to the reach. */
const OFFSETS: readonly number[] = (() => {
  const out = [0];
  for (let o = SLOT_STEP_M; o <= SLOT_REACH_M + EPS; o += SLOT_STEP_M) out.push(o, -o);
  return out;
})();

export type TechPiece = CityEraPiece<CityTechPieceKind>;

/**
 * The pavement pieces of every run, in `ground.runs` order, wall line then kerb line, slot by slot. `unit` is the stage's hash; `state` already holds the shopfront panels. The district's `tech` decides the chance (X-6).
 */
export function layoutPavements(ctx: TechCtx, boxes: Grid<S7Box>, state: PaveState, rand: StageRand, stats: PavementStats): TechPiece[] {
  const out: TechPiece[] = [];
  for (const run of ctx.runs) {
    const district = districtOf(ctx, run.block);
    if (district.tech < SIGN_FROM_TECH) continue;
    for (const line of ["wall", "kerb"] as const) {
      const keys = line === "wall" ? WALL_LINE : KERB_LINE;
      if (keys.length === 0) {
        // Ticket 075 r0: the kerb line has no picked key (the poster column and the charger read lit); the wall line must have one.
        if (line === "wall") throw new CityStageError("tech: the wall line has no kit key");
        continue;
      }
      const first = FURN_CORNER_M + 0.5 + unitOf(rand(run.id, line, "first")) * SLOT_PITCH_M;
      for (let n = 0; first + n * SLOT_PITCH_M <= run.len - FURN_CORNER_M; n++) {
        stats.slots++;
        const centre = first + n * SLOT_PITCH_M;
        const start = indexOf(rand(run.id, line, n, "key"), keys.length);
        let found: { spec: PaveSpec; s: number } | null = null;
        const why: string[] = [];
        search: for (let q = 0; q < keys.length; q++) {
          const spec = specOf(keys[(start + q) % keys.length]!);
          for (const o of OFFSETS) {
            const r = placeRefusal(ctx, boxes, state, run, line, centre + o, spec);
            if (r === null) {
              found = { spec, s: centre + o };
              break search;
            }
            why.push(r);
          }
        }
        if (found === null) {
          const r = why[0] ?? "none";
          stats.refused[r] = (stats.refused[r] ?? 0) + 1;
          continue;
        }
        stats.free++;
        if (!(unitOf(rand(run.id, line, n, "take")) < P_PAVEMENT * district.tech)) continue;
        stats.taken++;
        const t = line === "wall" ? FURN_WALL_M + found.spec.d / 2 : CELL_M - FURN_KERB_M - found.spec.d / 2;
        const w = worldOf(run, found.s, t, found.spec.w, found.spec.d);
        const yaw = normYaw(run.yaw);
        const size = turned(found.spec.w, found.spec.d, yaw);
        const cell: CityCell = cellOfPoint(w.x, w.z);
        out.push({
          id: `tech:pavement:${run.id}|${line}|${n}`,
          kind: "pavement",
          district: district.id,
          cell,
          placement: { key: found.spec.key, x_m: w.x, y_m: 0, z_m: w.z, yaw_deg: yaw },
          size: { x_m: size.x, z_m: size.z, h_m: found.spec.h },
        });
        state.add(run, { rect: w.rect, s: found.s, at: line });
        stats.placed++;
      }
    }
  }
  return out;
}

export const newPavementStats = (): PavementStats => ({ taken: 0, free: 0, slots: 0, placed: 0, refused: {} });
