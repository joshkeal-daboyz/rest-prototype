/**
 * Stage 7, section H3 (ticket 070), on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on): the choice (criterion 2), the roof exit (3), the placements (4), the checks (5) and R-1 to R-7's greps (7).
 * HEAVY: each city is built once (stages 1 to 7), through `testcities.ts`' module-level cache. R-2: the stage returns ok on all 20 named runs; nothing is loosened and no city is pinned as an exception.
 * The expectations are derived here from the mass layer, the buildings layer and the kit's numbers, in plan coordinates and by hand, independently of the stage's own helpers.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CityBuildingsLayer, CityCell, CityColumn, CityFacadesLayer, CityMassLayer, CityRoofPiece, CitySide } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { runsOf } from "./dress";
import { unitOf } from "./hash";
import { roofReport } from "./roofcheck";
import { BILLBOARD_FACES, BILLBOARD_SIGN_Y_M, ROOF_ACCESS, ROOF_SMALL, ROOF_WATER_TOWER, roofBounds } from "./roofkit";
import { buildRoofs, roofInsets } from "./roofs";
import { cityOf, label, layersOf, NAMED, type City } from "./testcities";

const key = (c: CityCell): string => `${c.i},${c.j}`;
const SIDE: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };
const OPP: Readonly<Record<CitySide, CitySide>> = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" };
const TOL = 1e-6;

/** A point of a column's own frame in the plan, by hand (three.js's turn: at 90 a piece's own +z faces +x). */
const turn = (yaw: number, x: number, z: number): { x: number; z: number } => {
  const q = ((Math.round(yaw / 90) % 4) + 4) % 4;
  const r = [
    { x, z },
    { x: z, z: -x },
    { x: -x, z: -z },
    { x: -z, z: x },
  ][q]!;
  return { x: r.x + 0, z: r.z + 0 };
};
const centre = (c: CityCell): { x: number; z: number } => ({ x: (c.i + 0.5) * 5, z: (c.j + 0.5) * 5 });
/** Where the frame point (fx, fz) of a column is in the plan. */
const at = (col: CityColumn, fx: number, fz: number): { x: number; z: number } => {
  const t = turn(col.yaw, fx, fz);
  return { x: centre(col).x + t.x, z: centre(col).z + t.z };
};
/** The piece's footprint in its column's frame, from its placement and the kit's bounds, by hand. */
const frame = (col: CityColumn, p: CityRoofPiece): { cx: number; cz: number; w: number; d: number } => {
  const c = centre(col);
  const back = turn(-col.yaw, p.placement.x_m - c.x, p.placement.z_m - c.z);
  const e = roofBounds(p.placement.key);
  return { cx: back.x, cz: back.z, w: e.w, d: e.d };
};

interface View {
  readonly o: City;
  readonly mass: CityMassLayer;
  readonly buildings: CityBuildingsLayer;
  readonly layer: CityFacadesLayer;
  readonly colAt: Map<string, CityColumn>;
  readonly roofs: readonly CityRoofPiece[];
}
const views = new Map<string, View>();
function viewOf(o: City): View {
  const k = label(o);
  if (!views.has(k)) {
    const { mass, buildings, facades } = layersOf(o);
    views.set(k, { o, mass, buildings, layer: facades, colAt: new Map(buildings.columns!.map((c) => [key(c), c] as const)), roofs: facades.roofs! });
  }
  return views.get(k)!;
}

describe("stage 7 on the named runs with the roofs (R-2)", { timeout: 120_000 }, () => {
  it("the stage returns ok on all 20 named runs, and every roof check holds (R8, M9b, the deck, the roofs, the cap)", () => {
    const bad: string[] = [];
    for (const o of NAMED) {
      const r = cityOf(o);
      if (!r.ok) {
        bad.push(`${label(o)}: ${r.failure.stage}: ${r.failure.reason}`);
        continue;
      }
      const v = viewOf(o);
      const rep = roofReport(v.layer, { mass: v.mass, buildings: v.buildings });
      if (rep.failures.length > 0) bad.push(`${label(o)}: ${rep.failures[0]!.check}: ${rep.failures[0]!.reason}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("the choice (criterion 2)", { timeout: 120_000 }, () => {
  it("at most one big prop a building, only on a mid roof (a mid or blind column); a billboard is its structure and its face on one column; at most one billboard a run; no novelty piece anywhere (NV)", () => {
    const wrong: string[] = [];
    for (const o of NAMED) {
      const v = viewOf(o);
      const runOf = runsOf(v.buildings);
      const perBuilding = new Map<string, CityRoofPiece[]>();
      for (const p of v.roofs) (perBuilding.get(p.building) ?? perBuilding.set(p.building, []).get(p.building)!).push(p);
      const perRun = new Map<string, number>();
      for (const p of v.roofs) if ((p.kind as string) === "novelty") wrong.push(`${label(o)} novelty on ${key(p.cell)}`);
      for (const [id, ps] of perBuilding) {
        const bigs = ps.filter((p) => p.kind === "waterTower" || p.kind === "exit" || p.kind === "billboard");
        if (bigs.length > 1) wrong.push(`${label(o)} ${id}: ${bigs.length} big props`);
        for (const p of bigs) if (v.colAt.get(key(p.cell))!.kind === "corner") wrong.push(`${label(o)} ${id}: a big prop on a corner`);
        const faces = ps.filter((p) => p.kind === "billboardFace");
        const structures = ps.filter((p) => p.kind === "billboard");
        if (faces.length !== structures.length || structures.some((s, n) => key(faces[n]!.cell) !== key(s.cell))) wrong.push(`${label(o)} ${id}: a billboard without its face on its column`);
        if (structures.length > 0) perRun.set(runOf.get(id)!, (perRun.get(runOf.get(id)!) ?? 0) + structures.length);
      }
      for (const [run, n] of perRun) if (n > 1) wrong.push(`${label(o)} run ${run}: ${n} billboards`);
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });

  it("a billboard stands only on a mid column whose front is an open side with street frontage (RB), its structure and face inside the cell less 0.28 m (BB); every named run has at least one", () => {
    for (const o of NAMED) {
      const v = viewOf(o);
      const built = new Map(v.mass.built.map((b) => [key(b), b] as const));
      const structures = v.roofs.filter((p) => p.kind === "billboard");
      expect(structures.length, label(o)).toBeGreaterThanOrEqual(1);
      for (const s of structures) {
        const col = v.colAt.get(key(s.cell))!;
        expect(col.kind, label(o)).toBe("mid");
        expect(built.get(key(col))!.open.find((q) => q.side === col.front)!.frontage, label(o)).toBe("street");
        const f = frame(col, s);
        expect(f.cx - f.w / 2, label(o)).toBeGreaterThanOrEqual(-2.5 + 0.28 - TOL);
        expect(f.cx + f.w / 2, label(o)).toBeLessThanOrEqual(2.5 - 0.28 + TOL);
        expect(f.cz + f.d / 2, label(o)).toBeLessThanOrEqual(2.5 - 0.28 + TOL);
      }
      for (const q of v.roofs.filter((p) => p.kind === "billboardFace")) {
        const col = v.colAt.get(key(q.cell))!;
        const f = frame(col, q);
        expect(f.cx - f.w / 2, label(o)).toBeGreaterThanOrEqual(-2.5 + 0.28 - TOL);
        expect(f.cz + f.d / 2, label(o)).toBeLessThanOrEqual(2.5 - 0.28 + TOL);
      }
    }
  });

  it("small props stand only on columns without the big prop, at most two a column, each of ROOF_SMALL's keys; the dish is never half-turned", () => {
    let dishes = 0;
    let flipped = 0;
    let two = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      const big = new Set(v.roofs.filter((p) => p.kind !== "small" && p.kind !== "billboardFace").map((p) => key(p.cell)));
      const per = new Map<string, number>();
      for (const p of v.roofs.filter((q) => q.kind === "small")) {
        const col = v.colAt.get(key(p.cell))!;
        per.set(key(p.cell), (per.get(key(p.cell)) ?? 0) + 1);
        expect(big.has(key(p.cell)), `${label(o)} ${key(p.cell)}`).toBe(false);
        expect(ROOF_SMALL, p.placement.key).toContain(p.placement.key);
        const rel = (((p.placement.yaw_deg - col.yaw) % 360) + 360) % 360;
        if (p.placement.key.includes("SatDish")) {
          dishes++;
          expect(rel, `${label(o)} dish`).toBe(0);
        } else if (rel === 180) flipped++;
        else expect(rel).toBe(0);
      }
      for (const n of per.values()) {
        expect(n).toBeLessThanOrEqual(2);
        if (n === 2) two++;
      }
    }
    expect(dishes).toBeGreaterThan(1000);
    expect(flipped).toBeGreaterThan(1000);
    expect(two).toBeGreaterThan(1000);
  });

  it("every choice is the stage's rand (R-3): the same city twice gives the same layer, and another seed another", () => {
    const o = NAMED[0]!;
    const v = viewOf(o);
    const again = buildRoofs(v.mass, v.buildings, v.layer, stageRand("facades", o.seed)).roofs;
    expect(again).toEqual(v.roofs);
    const other = viewOf(NAMED[1]!);
    expect(other.roofs).not.toEqual(v.roofs);
  });
});

describe("the roof exit (criterion 3)", { timeout: 120_000 }, () => {
  it("every exit stands wholly on the deck (the cell less 0.3 m on every side), its door the side opposite its column's front and not an open side, with a non-positive component along every open side's outward normal", () => {
    let seen = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      const built = new Map(v.mass.built.map((b) => [key(b), b] as const));
      for (const p of v.roofs.filter((q) => q.kind === "exit")) {
        seen++;
        const col = v.colAt.get(key(p.cell))!;
        expect(col.kind, label(o)).not.toBe("corner");
        const f = frame(col, p);
        expect(f.cx - f.w / 2, label(o)).toBeGreaterThanOrEqual(-2.2 - TOL);
        expect(f.cx + f.w / 2, label(o)).toBeLessThanOrEqual(2.2 + TOL);
        expect(f.cz - f.d / 2, label(o)).toBeGreaterThanOrEqual(-2.2 - TOL);
        expect(f.cz + f.d / 2, label(o)).toBeLessThanOrEqual(2.2 + TOL);
        // the housing's own +z is its door; its turn is the column's plus a half-turn
        expect((((p.placement.yaw_deg - col.yaw) % 360) + 360) % 360, label(o)).toBe(180);
        const door = turn(p.placement.yaw_deg, 0, 1);
        expect(p.facing, label(o)).toBe(OPP[col.front]);
        expect([door.x, door.z], label(o)).toEqual([...SIDE[p.facing]]);
        for (const open of built.get(key(col))!.open) {
          expect(open.side, label(o)).not.toBe(p.facing);
          expect(door.x * SIDE[open.side][0] + door.z * SIDE[open.side][1], label(o)).toBeLessThanOrEqual(0);
        }
      }
    }
    expect(seen).toBeGreaterThan(2000);
  });

  it("every exit's clear deck (as wide as the housing, 1.2 m deep from the door face) is inside the deck and carries no other roof piece", () => {
    for (const o of NAMED) {
      const v = viewOf(o);
      for (const p of v.roofs.filter((q) => q.kind === "exit")) {
        const col = v.colAt.get(key(p.cell))!;
        const f = frame(col, p);
        // the door faces the column's back: the clear deck lies from the housing's back-ward face, 1.2 m toward the back
        const clear = { x0: f.cx - 2.758 / 2, x1: f.cx + 2.758 / 2, z0: f.cz - f.d / 2 - 1.2, z1: f.cz - f.d / 2 };
        expect(clear.z0, label(o)).toBeGreaterThanOrEqual(-2.2 - TOL);
        expect(clear.x0, label(o)).toBeGreaterThanOrEqual(-2.2 - TOL);
        expect(clear.x1, label(o)).toBeLessThanOrEqual(2.2 + TOL);
        for (const q of v.roofs) {
          if (q === p || key(q.cell) !== key(p.cell)) continue;
          const g = frame(col, q);
          const overlapX = Math.min(g.cx + g.w / 2, clear.x1) - Math.max(g.cx - g.w / 2, clear.x0);
          const overlapZ = Math.min(g.cz + g.d / 2, clear.z1) - Math.max(g.cz - g.d / 2, clear.z0);
          expect(overlapX > TOL && overlapZ > TOL, `${label(o)} ${q.kind} on the clear deck`).toBe(false);
        }
      }
    }
  });

  it("an exit is on a blind column where its building has one (RX), else on a mid column, never on a corner column; both tiers are exercised on the named runs", () => {
    let blind = 0;
    let mid = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      const hasBlind = new Map(v.buildings.buildings.map((b) => [b.id, b.cells.some((c) => v.colAt.get(key(c))!.kind === "blind")] as const));
      for (const p of v.roofs.filter((q) => q.kind === "exit")) {
        const kind = v.colAt.get(key(p.cell))!.kind;
        if (kind === "blind") blind++;
        else {
          mid++;
          expect(kind, label(o)).toBe("mid");
          expect(hasBlind.get(p.building), `${label(o)} an exit on a mid column of a building with a blind column`).toBe(false);
        }
      }
    }
    expect(blind).toBeGreaterThan(100);
    expect(mid).toBeGreaterThan(1000);
  });
});

/** The first `n` pieces of the named runs that satisfy `want`, with their column, building and run's view. */
function find(want: (p: CityRoofPiece, col: CityColumn, v: View) => boolean, n: number, distinct: (col: CityColumn) => string): { p: CityRoofPiece; col: CityColumn; v: View }[] {
  const out: { p: CityRoofPiece; col: CityColumn; v: View }[] = [];
  const seen = new Set<string>();
  for (const o of NAMED) {
    const v = viewOf(o);
    const ins = roofInsets(v.layer.walls!);
    for (const p of v.roofs) {
      const col = v.colAt.get(key(p.cell))!;
      // only cells with no party-wall piece over them, so the deck is the plain 4.40 m square
      if (ins.has(key(col))) continue;
      if (!want(p, col, v) || seen.has(distinct(col))) continue;
      seen.add(distinct(col));
      out.push({ p, col, v });
      if (out.length >= n) return out;
    }
  }
  return out;
}

describe("placements (criterion 4): worked by hand from the bounds, in the column's own frame, then turned by its yaw", () => {
  it("a water tower on a 4-storey style-1 mid column: base 12.500, its front edge on the deck's front edge (z = 2.2 - 2.419 / 2), centred across, at two turns", () => {
    const hits = find((p, col, v) => p.kind === "waterTower" && col.kind === "mid" && v.buildings.buildings.find((b) => b.id === p.building)!.storeys === 4 && v.buildings.buildings.find((b) => b.id === p.building)!.style === "apartment-01", 2, (c) => String(c.yaw));
    expect(hits).toHaveLength(2);
    for (const { p, col } of hits) {
      expect(p.placement.key).toBe(ROOF_WATER_TOWER);
      expect(p.placement.y_m).toBeCloseTo(12.5, 9);
      const want = at(col, 0, 2.2 - 2.419 / 2);
      expect(p.placement.x_m).toBeCloseTo(want.x, 6);
      expect(p.placement.z_m).toBeCloseTo(want.z, 6);
      expect(p.placement.yaw_deg).toBe(col.yaw);
      expect(p.facing).toBe(col.front);
    }
    expect(new Set(hits.map((h) => h.col.yaw)).size).toBe(2);
  });

  it("a roof exit on a blind column and on a mid column, each at two turns: pivot (0, 2.2 - 2.851 / 2) in the frame, a half-turn from the column's yaw, door on the side opposite its front, footprint inside, clear deck from z -1.851 to -0.651", () => {
    for (const tier of ["blind", "mid"] as const) {
      const hits = find((p, col) => p.kind === "exit" && col.kind === tier, 2, (c) => String(c.yaw));
      expect(hits, tier).toHaveLength(2);
      expect(new Set(hits.map((h) => h.col.yaw)).size, tier).toBe(2);
      for (const { p, col, v } of hits) {
        expect(p.placement.key).toBe(ROOF_ACCESS);
        const want = at(col, 0, 2.2 - 2.851 / 2);
        expect(p.placement.x_m, tier).toBeCloseTo(want.x, 6);
        expect(p.placement.z_m, tier).toBeCloseTo(want.z, 6);
        expect(p.placement.yaw_deg, tier).toBe((col.yaw + 180) % 360);
        expect(p.placement.y_m, tier).toBeCloseTo(3 * v.buildings.buildings.find((b) => b.id === p.building)!.storeys + 0.5, 9);
        expect(p.facing, tier).toBe(OPP[col.front]);
        const f = frame(col, p);
        expect([f.cx, f.cz - f.d / 2, f.cz + f.d / 2]).toEqual([expect.closeTo(0, 6), expect.closeTo(2.2 - 2.851, 6), expect.closeTo(2.2, 6)]);
        expect(f.cz - f.d / 2 - 1.2).toBeCloseTo(-1.851, 6);
      }
    }
  });

  it("a water tower on a style-2 roof stands at 3 x storeys + 0.5, not + 0.744 (RT)", () => {
    const hits = find((p, col, v) => p.kind === "waterTower" && v.buildings.buildings.find((b) => b.id === p.building)!.style === "apartment-02", 3, (c) => key(c));
    expect(hits).toHaveLength(3);
    for (const { p, col, v } of hits) {
      const b = v.buildings.buildings.find((x) => x.id === p.building)!;
      expect(col.pieces[col.pieces.length - 1]!.placement.key).toMatch(/Roof_0?2|Roof_Corner_02|Roof_02/);
      expect(p.placement.y_m).toBeCloseTo(3 * b.storeys + 0.5, 9);
      expect(p.placement.y_m).not.toBeCloseTo(3 * b.storeys + 0.744, 3);
    }
  });

  it("a billboard on a street mid column at two turns: the structure 0.286 m in from the cell's side edges (4.428 m in a 4.44 m deck), its front 0.118 m back from the deck's front, the face 0.9 m up and in front of it", () => {
    const hits = find((p, col) => p.kind === "billboard", 2, (c) => String(c.yaw));
    expect(hits).toHaveLength(2);
    expect(new Set(hits.map((h) => h.col.yaw)).size).toBe(2);
    for (const { p, col, v } of hits) {
      const face = v.roofs.find((q) => q.kind === "billboardFace" && key(q.cell) === key(p.cell))!;
      expect(BILLBOARD_FACES).toContain(face.placement.key);
      const s = at(col, 0, 2.22 - 0.118 - 1.611 / 2);
      expect(p.placement.x_m).toBeCloseTo(s.x, 6);
      expect(p.placement.z_m).toBeCloseTo(s.z, 6);
      const f = at(col, 0, 2.22 - 0.118 / 2);
      expect(face.placement.x_m).toBeCloseTo(f.x, 6);
      expect(face.placement.z_m).toBeCloseTo(f.z, 6);
      expect(face.placement.y_m - p.placement.y_m).toBeCloseTo(BILLBOARD_SIGN_Y_M, 9);
      expect(face.placement.yaw_deg).toBe(col.yaw);
      const fr = frame(col, p);
      expect(2.5 - (fr.cx + fr.w / 2)).toBeCloseTo(0.286, 2);
      expect(fr.w).toBeCloseTo(4.428, 9);
    }
  });

  it("two small props in one column's halves, the first in the left half and the second in the right (in the frame), each at its hashed spot; a turnable key half-turned by hash, a dish not", () => {
    const o = NAMED[0]!;
    const rand = stageRand("facades", o.seed);
    let pairs = 0;
    let flipped = 0;
    const v = viewOf(o);
    const ins = roofInsets(v.layer.walls!);
    const smalls = new Map<string, CityRoofPiece[]>();
    for (const p of v.roofs) if (p.kind === "small") (smalls.get(key(p.cell)) ?? smalls.set(key(p.cell), []).get(key(p.cell))!).push(p);
    for (const b of v.buildings.buildings) {
      b.cells.forEach((c, n) => {
        const ps = smalls.get(key(c)) ?? [];
        if (ps.length !== 2 || ins.has(key(c))) return;
        pairs++;
        const col = v.colAt.get(key(c))!;
        ps.forEach((p, m) => {
          const e = roofBounds(p.placement.key);
          const f = frame(col, p);
          const left = m === 0 ? -2.2 : 0;
          const right = m === 0 ? 0 : 2.2;
          // the hashed spot: fx and fz are the stage's `roof` x and z units for this building, column and half
          const fx = left + e.w / 2 + unitOf(rand("roof", "x", b.id, n, m)) * (right - left - e.w);
          const fz = -2.2 + e.d / 2 + unitOf(rand("roof", "z", b.id, n, m)) * (4.4 - e.d);
          expect(f.cx, `${b.id} ${n} ${m}`).toBeCloseTo(fx, 6);
          expect(f.cz, `${b.id} ${n} ${m}`).toBeCloseTo(fz, 6);
          expect(f.cx - e.w / 2).toBeGreaterThanOrEqual(left - TOL);
          expect(f.cx + e.w / 2).toBeLessThanOrEqual(right + TOL);
          const rel = (((p.placement.yaw_deg - col.yaw) % 360) + 360) % 360;
          if (p.placement.key.includes("SatDish")) expect(rel).toBe(0);
          else {
            const flip = unitOf(rand("roof", "flip", b.id, n, m, p.placement.key)) < 0.5;
            expect(rel).toBe(flip ? 180 : 0);
            if (flip) flipped++;
          }
        });
      });
    }
    expect(pairs).toBeGreaterThan(50);
    expect(flipped).toBeGreaterThan(10);
  });

  it("a column next to a taller building's party window keeps its props 0.370 m in on that side, not 0.3 (RK)", () => {
    let checked = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      for (const w of v.layer.walls!.filter((p) => p.kind === "partyWindow")) {
        const d = SIDE[w.face];
        const lower = { i: w.cell.i + d[0], j: w.cell.j + d[1] };
        const col = v.colAt.get(key(lower));
        if (!col) continue;
        // the cell's side facing the taller column is its side opposite the window's face
        const s = SIDE[OPP[w.face]];
        for (const p of v.roofs.filter((q) => key(q.cell) === key(lower))) {
          const c = centre(lower);
          const e = roofBounds(p.placement.key);
          // the piece's plan extent toward that side, by hand (the quarter turns between the frame and the plan swap width and depth)
          const q = (((p.placement.yaw_deg / 90) % 4) + 4) % 4;
          const pw = q % 2 === 0 ? e.w : e.d;
          const pd = q % 2 === 0 ? e.d : e.w;
          const reach = s[0] !== 0 ? (p.placement.x_m - c.x) * s[0] + pw / 2 : (p.placement.z_m - c.z) * s[1] + pd / 2;
          expect(2.5 - reach, `${label(o)} ${key(lower)}`).toBeGreaterThanOrEqual(0.37 - TOL);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe("the checks hold on the named runs, and the cap (criteria 5 and RC)", { timeout: 120_000 }, () => {
  it("R8 holds on every run (0.9 and 0.5), no column passes DRESS_PER_BAY_MAX with the roof pieces counted, and the metrics agree with the layer", () => {
    for (const o of NAMED) {
      const v = viewOf(o);
      const rep = roofReport(v.layer, { mass: v.mass, buildings: v.buildings });
      expect(rep.failures, label(o)).toEqual([]);
      const m = rep.metrics;
      expect(m.dressed / m.buildings, label(o)).toBeGreaterThanOrEqual(0.9);
      expect(m.bigRuns / m.runs, label(o)).toBeGreaterThanOrEqual(0.5);
      expect(m.maxPerColumn, label(o)).toBeLessThanOrEqual(6);
      expect(m.pieces, label(o)).toBe(v.roofs.length);
      expect(m.buildings, label(o)).toBe(v.buildings.buildings.length);
    }
  });
});

describe("R-6 and R-1 for the new files (criterion 7)", () => {
  const FILES = ["roofkit.ts", "roofs.ts", "roofcheck.ts"];
  const codeOf = (f: string): string =>
    readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
      .join("\n");

  it("every file imports only src/core and src/city, and none reads a clock, the DOM, Math.random or a file", () => {
    for (const f of FILES) {
      for (const m of codeOf(f).matchAll(/from\s+"([^"]+)"/g)) {
        const path = m[1]!;
        expect(path.startsWith("./") || path === "../../core" || path.startsWith("../pipeline/"), `${f} imports ${path}`).toBe(true);
      }
      expect(codeOf(f), f).not.toMatch(/Math\.random|Date\.now|performance\.now|\bdocument\b|\bwindow\b|\bfetch\b|readFileSync/);
    }
  });

  it("the stage reads only mass, buildings, and the streets' w and h (for the picture); no file reads a block's rank, a street's line or the edge layer", () => {
    for (const f of FILES) {
      const code = codeOf(f);
      expect(code, f).not.toMatch(/\.(bi|bj|line)\b/);
      expect(code, f).not.toMatch(/layers\.(edge|land|circuit|ground)|\.kerb\b|\.bays\b/);
      for (const m of code.matchAll(/layers\.streets|streets\.(\w+)/g)) if (m[1] !== undefined) expect(["w", "h"], `${f}: ${m[0]}`).toContain(m[1]);
    }
  });
});
