/**
 * Stage 13, section F1: T-2 by option G, incrementally (F1-Q2). A piece that closes a street cell (C1's reading, B-Q5: it stands on the ground with its base under `GROUND_BASE_M`, and its footprint covers the
 * cell's centre) is placed only if T-2 still holds with it standing. `WalkGuard` keeps the closed cells and, for each district with a pole, the cells its first pole reaches; a piece is tried against only the
 * districts whose reached cells it closes a cell of (a cell it closes that no pole's walk reaches cannot cut a walk). It gives the same answer as `t2Failures` on the plan with the piece added, for every piece
 * (the test holds it to that). Pure; reads the plan as `t2Failures` does, and keeps that reading (this is not a looser check: `assertEraReadable` still runs on the whole layer).
 */

import type { CityEraPiece, CityPlacement, CityResolvedPlan } from "../../core";
import { CELL_M, GROUND_BASE_M, type CircuitPole, type CircuitPoints, circuitPoints, type ReadableOptions } from "../pipeline/readable";

/** What the guard needs of a piece: where it stands and its plan extent after the turn. */
export interface Standing {
  readonly placement: Pick<CityPlacement, "x_m" | "y_m" | "z_m">;
  readonly size: { readonly x_m: number; readonly z_m: number; readonly h_m: number };
}

interface Group {
  readonly district: string;
  readonly root: CircuitPole;
  readonly poles: readonly CircuitPole[];
  readonly poleCells: ReadonlySet<number>;
  readonly start: number;
  /** The cells the root reaches on foot, with everything standing so far. */
  seen: Set<number>;
}

export class WalkGuard {
  private readonly w: number;
  private readonly h: number;
  private readonly streetCells: ReadonlySet<number>;
  private readonly closed = new Set<number>();
  private readonly groups: Group[] = [];
  /** True when a pole is already cut off before any piece is added: no piece that closes a cell can then be placed (`t2Failures` would fail for it). */
  private readonly broken: boolean;

  constructor(base: CityResolvedPlan, options: ReadableOptions = {}, standing: readonly Standing[] = []) {
    const streets = base.plan.layers.streets;
    const circuit: CircuitPoints = options.circuit ?? circuitPoints(base);
    this.w = streets?.w ?? 0;
    this.h = streets?.h ?? 0;
    this.streetCells = new Set((streets?.cells ?? []).map((c) => c.j * this.w + c.i));
    if (circuit.poles.length === 0 || streets === undefined) {
      this.broken = false;
      return;
    }
    for (const p of standing) this.closeCells(p).forEach((c) => this.closed.add(c));

    const blockDistrict = new Map<string, string>();
    for (const d of base.history?.districts ?? []) for (const b of d.blocks) blockDistrict.set(b, d.id);
    const districtOf = (p: CircuitPole): string => {
      if (base.history === null) return "city";
      let block = p.block;
      if (block === undefined) {
        const pi = Math.floor(p.x_m / CELL_M);
        const pj = Math.floor(p.z_m / CELL_M);
        let best = Infinity;
        for (const b of streets.blocks) {
          const d = Math.max(Math.max(b.i0 - pi, 0, pi - (b.i1 - 1)), Math.max(b.j0 - pj, 0, pj - (b.j1 - 1)));
          if (d < best) {
            best = d;
            block = b.id;
          }
        }
      }
      return (block !== undefined ? blockDistrict.get(block) : undefined) ?? "city";
    };
    const byDistrict = new Map<string, CircuitPole[]>();
    for (const p of circuit.poles) {
      const d = districtOf(p);
      const g = byDistrict.get(d);
      if (g === undefined) byDistrict.set(d, [p]);
      else g.push(p);
    }
    const cellOf = (p: { readonly x_m: number; readonly z_m: number }): number => Math.floor(p.z_m / CELL_M) * this.w + Math.floor(p.x_m / CELL_M);
    let broken = false;
    for (const [district, poles] of [...byDistrict].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      poles.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      const group: Group = { district, root: poles[0]!, poles, poleCells: new Set(poles.map(cellOf)), start: cellOf(poles[0]!), seen: new Set() };
      group.seen = this.reach(group, this.closed);
      if (poles.slice(1).some((p) => !group.seen.has(cellOf(p)))) broken = true;
      this.groups.push(group);
    }
    this.broken = broken;
    this.cellOf = cellOf;
  }

  private cellOf: (p: { readonly x_m: number; readonly z_m: number }) => number = () => -1;

  /** The street cells (as `j * w + i`) a piece closes: its footprint contains the centre of a street cell and its base is under `GROUND_BASE_M`. */
  closeCells(p: Standing): number[] {
    if (p.placement.y_m >= GROUND_BASE_M) return [];
    const hx = p.size.x_m / 2;
    const hz = p.size.z_m / 2;
    const i0 = Math.max(0, Math.floor((p.placement.x_m - hx) / CELL_M));
    const i1 = Math.min(this.w - 1, Math.floor((p.placement.x_m + hx) / CELL_M));
    const j0 = Math.max(0, Math.floor((p.placement.z_m - hz) / CELL_M));
    const j1 = Math.min(this.h - 1, Math.floor((p.placement.z_m + hz) / CELL_M));
    const out: number[] = [];
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const cx = (i + 0.5) * CELL_M;
        const cz = (j + 0.5) * CELL_M;
        if (Math.abs(cx - p.placement.x_m) <= hx && Math.abs(cz - p.placement.z_m) <= hz) out.push(j * this.w + i);
      }
    }
    return out;
  }

  /** Which cells a group's first pole reaches on foot, over the street cells not in `closed` (a pole's own closed or off-street cell is an end, not a way through). */
  private reach(g: Group, closed: ReadonlySet<number>): Set<number> {
    const seen = new Set<number>([g.start]);
    const queue = [g.start];
    const walk = (n: number): boolean => this.streetCells.has(n) && !closed.has(n);
    for (let q = 0; q < queue.length; q++) {
      const at = queue[q]!;
      if (at !== g.start && !walk(at)) continue;
      const i = at % this.w;
      const j = (at - i) / this.w;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= this.w || nj >= this.h) continue;
        const n = nj * this.w + ni;
        if (seen.has(n) || !(walk(n) || g.poleCells.has(n))) continue;
        seen.add(n);
        queue.push(n);
      }
    }
    return seen;
  }

  private cut(g: Group, seen: ReadonlySet<number>): boolean {
    return g.poles.slice(1).some((p) => !seen.has(this.cellOf(p)));
  }

  /** How many street cells this piece would newly close. */
  closesNew(p: Standing): number {
    return this.closeCells(p).filter((c) => this.streetCells.has(c) && !this.closed.has(c)).length;
  }

  /**
   * Option G: true when the piece may stand (and it now does), false when it would cut a district's poles off (it is not added). A piece that closes no new street cell always passes. With no pole there is
   * nothing to cut, and every piece passes.
   */
  tryAdd(p: Standing): boolean {
    const cells = this.closeCells(p).filter((c) => !this.closed.has(c));
    if (this.groups.length === 0) {
      cells.forEach((c) => this.closed.add(c));
      return true;
    }
    const street = cells.filter((c) => this.streetCells.has(c));
    if (street.length === 0) {
      cells.forEach((c) => this.closed.add(c));
      return true;
    }
    // t2Failures on the plan with this piece would fail for a pole already cut off, whichever piece it is
    if (this.broken) return false;
    const next = new Set(this.closed);
    cells.forEach((c) => next.add(c));
    const reached: [Group, Set<number>][] = [];
    for (const g of this.groups) {
      if (!street.some((c) => g.seen.has(c))) continue;
      const seen = this.reach(g, next);
      if (this.cut(g, seen)) return false;
      reached.push([g, seen]);
    }
    for (const [g, seen] of reached) g.seen = seen;
    cells.forEach((c) => this.closed.add(c));
    return true;
  }
}

/** A hold-out, tech or ruin era add as a `Standing`. */
export const standingOf = (a: Pick<CityEraPiece, "placement" | "size">): Standing => a;
