/**
 * Ticket 073 F1, criterion 5 (T-2 by option G, F1-Q2): fixtures with hand-placed poles. A patch that would seal a pole in is left out; one that leaves a way round is placed; two touching districts keep both
 * districts' poles joined; and G's incremental check places exactly what calling `t2Failures` for every candidate would.
 */
import { describe, expect, it } from "vitest";
import type { CityEraPiece, CityResolvedPlan, CityRuinPieceKind } from "../../core";
import { t2Failures, type CircuitPoints } from "../pipeline/readable";
import { emptyCircuit, resolvedOf } from "./fixtures";
import { MOUND_KEY } from "./kit";
import { WalkGuard } from "./walk";

type Piece = CityEraPiece<CityRuinPieceKind>;
const centre = (i: number): number => (i + 0.5) * 5;
const pole = (id: string, i: number, j: number): CircuitPoints["poles"][number] => ({ id, x_m: centre(i), z_m: centre(j) });
const piece = (id: string, x: number, z: number, w: number, d: number, y = 0): Piece => ({
  id,
  kind: "patch",
  district: "d",
  cell: { i: Math.floor(x / 5), j: Math.floor(z / 5) },
  placement: { key: MOUND_KEY, x_m: x, y_m: y, z_m: z, yaw_deg: 0 },
  size: { x_m: w, z_m: d, h_m: 0.4 },
});
const row = (j: number, i0: number, i1: number): [number, number][] => Array.from({ length: i1 - i0 + 1 }, (_, n) => [i0 + n, j] as [number, number]);

describe("option G: a piece that closes a street cell is placed only where T-2 still holds", () => {
  it("a patch that would seal a pole in is left out: a one-cell-wide street with a pole at each end", () => {
    const cells = row(1, 0, 6);
    const circuit = emptyCircuit({ poles: [pole("p1", 0, 1), pole("p2", 6, 1)] });
    const base = resolvedOf(8, 3, cells);
    const g = new WalkGuard(base, { circuit });
    const sealing = piece("a", centre(3), centre(1), 2.4, 2.7); // covers the middle of cell (3, 1)
    expect(g.closesNew(sealing)).toBe(1);
    expect(g.tryAdd(sealing)).toBe(false);
    // the brute-force check says the same
    expect(t2Failures(resolvedOf(8, 3, cells, [sealing]), { circuit })).toHaveLength(1);
    // a piece off the street's middle closes nothing and is placed
    expect(g.tryAdd(piece("b", centre(3) + 1.8, centre(1) - 1.8, 0.6, 0.6))).toBe(true);
  });

  it("one that leaves a way round is placed: the same street with a second row beside it", () => {
    const cells = [...row(1, 0, 6), ...row(2, 0, 6)];
    const circuit = emptyCircuit({ poles: [pole("p1", 0, 1), pole("p2", 6, 1)] });
    const g = new WalkGuard(resolvedOf(8, 4, cells), { circuit });
    const p = piece("a", centre(3), centre(1), 2.4, 2.7);
    expect(g.tryAdd(p)).toBe(true);
    expect(t2Failures(resolvedOf(8, 4, cells, [p]), { circuit })).toHaveLength(0);
    // a second patch across the row beside it then seals the way and is left out
    expect(g.tryAdd(piece("b", centre(3), centre(2), 2.4, 2.7))).toBe(false);
  });

  it("a piece standing above the ground (base 2 m or more) closes nothing", () => {
    const cells = row(1, 0, 6);
    const circuit = emptyCircuit({ poles: [pole("p1", 0, 1), pole("p2", 6, 1)] });
    const g = new WalkGuard(resolvedOf(8, 3, cells), { circuit });
    const high = piece("h", centre(3), centre(1), 2.4, 2.7, 3);
    expect(g.closesNew(high)).toBe(0);
    expect(g.tryAdd(high)).toBe(true);
  });

  it("two touching districts keep both districts' poles joined: a piece is judged against each district's walk", () => {
    // district a's poles at the ends of the upper street, district b's at the ends of the lower street; the two meet through a link at i = 3
    const history = { stage: "history", districts: [{ id: "a", blocks: ["blockA"], tech: 0, held: 0, wild: 0.5 }, { id: "b", blocks: ["blockB"], tech: 0, held: 0, wild: 0.5 }] } as const;
    const cells = [...row(0, 0, 6), ...row(2, 0, 6), [3, 1] as [number, number]];
    const mk = (ruin: Piece[]): CityResolvedPlan => {
      const r = resolvedOf(8, 4, cells, ruin) as unknown as { history: unknown };
      r.history = history;
      return r as unknown as CityResolvedPlan;
    };
    const circuit = emptyCircuit({ poles: [{ ...pole("a1", 0, 0), block: "blockA" }, { ...pole("a2", 6, 0), block: "blockA" }, { ...pole("b1", 0, 2), block: "blockB" }, { ...pole("b2", 6, 2), block: "blockB" }] });
    const g = new WalkGuard(mk([]), { circuit });
    const cutA = piece("x", centre(3), centre(0), 2.4, 2.7); // seals district a's street
    expect(g.tryAdd(cutA)).toBe(false);
    expect(t2Failures(mk([cutA]), { circuit }).map((f) => f.district)).toEqual(["a"]);
    const cutB = piece("y", centre(3), centre(2), 2.4, 2.7);
    expect(g.tryAdd(cutB)).toBe(false);
    expect(t2Failures(mk([cutB]), { circuit }).map((f) => f.district)).toEqual(["b"]);
    // a piece in a cell no walk needs cannot cut one (the link cell: closing it leaves each district its own street)
    const link = piece("z", centre(3), centre(1), 2.4, 2.7);
    expect(g.tryAdd(link)).toBe(true);
    expect(t2Failures(mk([link]), { circuit })).toHaveLength(0);
  });

  it("with no pole there is nothing to cut: every piece passes", () => {
    const g = new WalkGuard(resolvedOf(8, 3, row(1, 0, 6)), { circuit: emptyCircuit() });
    expect(g.tryAdd(piece("a", centre(3), centre(1), 2.4, 2.7))).toBe(true);
  });
});

describe("G's incremental check gives the same placed set as t2Failures for every candidate", () => {
  it("on a small fixture city of 11 x 7 street cells with holes and four poles, over 160 hashed candidates", () => {
    const w = 11;
    const h = 7;
    const cells: [number, number][] = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (j % 3 === 0 || i % 4 === 0 || (i + j) % 5 === 0) cells.push([i, j]);
    const circuit = emptyCircuit({ poles: [pole("p1", 0, 0), pole("p2", 8, 0), pole("p3", 4, 3), pole("p4", 8, 6)] });
    let s = 12345;
    const next = (): number => {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      return s / 4294967296;
    };
    const cands: Piece[] = Array.from({ length: 160 }, (_, n) => piece(`c${n}`, next() * w * 5, next() * h * 5, 0.5 + next() * 3.5, 0.5 + next() * 3.5, next() < 0.15 ? 3 : 0));

    const g = new WalkGuard(resolvedOf(w, h, cells), { circuit });
    const incremental: string[] = [];
    for (const c of cands) if (g.tryAdd(c)) incremental.push(c.id);

    const brute: Piece[] = [];
    for (const c of cands) if (t2Failures(resolvedOf(w, h, cells, [...brute, c]), { circuit }).length === 0) brute.push(c);

    expect(incremental).toEqual(brute.map((c) => c.id));
    // the fixture is not trivial: some candidates were refused and some placed
    expect(incremental.length).toBeGreaterThan(20);
    expect(incremental.length).toBeLessThan(cands.length);
  });
});
