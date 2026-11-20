/**
 * Stage 4, section D2: the ground pieces, the kerb line, the two additions of rule 10 and G4, on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on), and on typed-in fixtures. HEAVY: each city is built once, through a
 * module-level cache. R-2: every rule holds on all 20 named runs; nothing is loosened and no city is pinned.
 */
import { describe, expect, it } from "vitest";
import { CITY_GROUND_VARIANT as V } from "../../core";
import type {
  CityBlockSide,
  CityEdgeCell,
  CityEdgeLayer,
  CityEdgeRole,
  CityGroundCell,
  CityKerbCut,
  CityKerbPath,
  CityLandLayer,
  CityMassLayer,
  CityPlanBlock,
  CityPlanRun,
  CityPlanStreet,
  CitySide,
  CityStreetBand,
  CityStreetsLayer,
} from "../../core";
import { landStage } from "../land/stage";
import { massStage } from "../mass/stage";
import { stageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { runCity } from "../stages";
import { streetsStageWith } from "../streets/stage";
import { g4Failures } from "./check";
import { RETURN_WALL_TOL_M, TILE_M } from "./constants";
import { dropCells, layGround, yawToward } from "./ground";
import { kerbFailures } from "./kerbcheck";
import { kerbLine } from "./kerbline";
import { edgeStage } from "./stage";

interface City {
  readonly seed: number;
  readonly way: "on" | "off";
}
const NAMED: City[] = [];
for (const way of ["on", "off"] as const) for (let seed = 1; seed <= 10; seed++) NAMED.push({ seed, way });
const label = (o: City): string => `6 x 6 seed ${o.seed} one-way ${o.way}`;
const offStages = (): CityStageDef[] => [streetsStageWith(0) as unknown as CityStageDef, landStage as unknown as CityStageDef, massStage as unknown as CityStageDef, edgeStage as unknown as CityStageDef];
const cache = new Map<string, CityPlanRun>();
function cityOf(o: City): CityPlanRun {
  const k = `${o.seed}:${o.way}`;
  if (!cache.has(k)) {
    const opt = { blocksX: 6, blocksZ: 6, seed: o.seed };
    cache.set(k, o.way === "on" ? runCity(opt, "edge") : runCity(opt, "edge", offStages()));
  }
  return cache.get(k)!;
}
interface Layers {
  readonly streets: CityStreetsLayer;
  readonly land: CityLandLayer;
  readonly mass: CityMassLayer;
  readonly edge: CityEdgeLayer;
  readonly ground: readonly CityGroundCell[];
  readonly kerb: readonly CityKerbPath[];
}
function layersOf(o: City): Layers {
  const r = cityOf(o);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  const l = r.plan.layers;
  return { streets: l.streets!, land: l.land!, mass: l.mass!, edge: l.edge!, ground: l.edge!.ground!, kerb: l.edge!.kerb! };
}
const key = (i: number, j: number): string => `${i},${j}`;
const SIDES = ["-z", "+x", "+z", "-x"] as const;
const YAWS = [0, 90, 180, 270];

/** The numbers the report asks for, summed over the named runs. */
const TOTALS = { sides: 0, sidesOnePath: 0, ts: 0, dips: 0, bareSides: 0, bareFlanks: 0, bareMouths: 0, returns: 0, returnsOnWall: 0, maxReturnOff: 0, junctions: 0, junctionRects: 0, g4: 0, buildOutBesideDip: 0 };

describe("stage 4, the ground and the kerb line (D2), on the named runs", { timeout: 120_000 }, () => {
  for (const o of NAMED) {
    describe(label(o), () => {
      it("the stage returns ok, always writes ground and kerb, and its own checks (ground, kerb line, the two additions, G4) find nothing", () => {
        const r = cityOf(o);
        if (!r.ok) throw new Error(`stage ${r.failure.stage}: ${r.failure.reason}`);
        const { streets, land, mass, edge } = layersOf(o);
        expect(edge.ground).toBeDefined();
        expect(edge.kerb).toBeDefined();
        expect(kerbFailures(edge, streets, mass)).toEqual([]);
        expect(g4Failures(edge, mass, land)).toEqual([]);
        TOTALS.g4 += 1;
      });

      it("ground: every edge cell is in exactly one record, a bay tile as one 2-cell record on its first cell, with the edge cell's role and street, centred, with a legal yaw and only its role's bits (criterion 1)", () => {
        const { streets, edge, ground } = layersOf(o);
        const edgeAt = new Map(edge.cells.map((c) => [key(c.i, c.j), c] as const));
        const tileFirst = new Set(edge.tiles.map((t) => key(t.cells[0].i, t.cells[0].j)));
        const seen = new Set<string>();
        let records = 0;
        for (const g of ground) {
          const e = edgeAt.get(key(g.i, g.j))!;
          expect(e, `(${g.i}, ${g.j})`).toBeDefined();
          expect([g.role, g.street]).toEqual([e.role, e.street]);
          const cells: [number, number][] = [[g.i, g.j]];
          const s = streets.streets.find((x) => x.id === g.street);
          if (g.cells === 2) {
            expect(g.role).toBe("parking");
            expect(tileFirst.has(key(g.i, g.j)), `tile at (${g.i}, ${g.j})`).toBe(true);
            cells.push(s!.axis === "x" ? [g.i + 1, g.j] : [g.i, g.j + 1]);
          } else expect(tileFirst.has(key(g.i, g.j))).toBe(false);
          for (const [i, j] of cells) {
            expect(seen.has(key(i, j)), `(${i}, ${j}) twice`).toBe(false);
            seen.add(key(i, j));
          }
          records++;
          // the centre: the cell's, or the shared edge along the street for a tile
          expect(g.x_m).toBeCloseTo((g.i + 0.5) * TILE_M + (g.cells === 2 && s!.axis === "x" ? TILE_M / 2 : 0), 9);
          expect(g.z_m).toBeCloseTo((g.j + 0.5) * TILE_M + (g.cells === 2 && s!.axis === "z" ? TILE_M / 2 : 0), 9);
          expect(YAWS).toContain(g.yaw);
          if (g.role === "lane") expect(g.variant & ~(V.laneRight | V.lanePatch), `lane (${g.i}, ${g.j})`).toBe(0);
          else if (g.role === "pavement") {
            expect(g.variant & ~(V.pavementGrate | V.pavementReturnNear | V.pavementReturnFar | V.pavementFlush | V.pavementDip)).toBe(0);
            // a grate never carries a kerb bit, and a dropped kerb is a kerb bit
            if ((g.variant & V.pavementGrate) !== 0) expect(g.variant).toBe(V.pavementGrate);
          } else expect(g.variant, `${g.role} (${g.i}, ${g.j})`).toBe(0);
          // a one-way street's one lane is laneRight 0
          if (g.role === "lane" && s!.section !== "twoWay") expect(g.variant & V.laneRight).toBe(0);
          if (g.role === "crossing") expect(g.yaw).toBe(yawToward(s!.axis, 1));
          if (g.role === "junction") expect([g.yaw, g.variant]).toEqual([0, 0]);
        }
        expect(seen.size).toBe(edge.cells.length);
        expect(records).toBe(edge.cells.length - edge.tiles.length);
        expect(edge.cells.every((c) => seen.has(key(c.i, c.j)))).toBe(true);
      });

      it("ground: a patch decal on one lane cell in 12 and a grate on one plain pavement cell in 6, from the stage's own rand (R-3)", () => {
        const { ground } = layersOf(o);
        const rand = stageRand("edge", o.seed);
        for (const g of ground) {
          if (g.role === "lane") expect((g.variant & V.lanePatch) !== 0, `patch (${g.i}, ${g.j})`).toBe(rand("patch", g.i, g.j) % 12 === 0);
          if (g.role === "pavement" && (g.variant & ~V.pavementGrate) === 0) expect(g.variant === V.pavementGrate, `grate (${g.i}, ${g.j})`).toBe(rand("pave", g.i, g.j) % 6 === 0);
        }
      });

      it("ground: the junction cells are the junctions' rectangles, carriageway by carriageway, full, with yaw 0 and variant 0, and each crossing is yawed along its own street (criterion 1)", () => {
        const { streets, edge, ground } = layersOf(o);
        const groundAt = new Map(ground.map((g) => [key(g.i, g.j), g] as const));
        const carriage = (s: CityPlanStreet): number => s.bands.filter((b) => b === "lane" || b === "parking").length;
        const byId = new Map(streets.streets.map((s) => [s.id, s] as const));
        let inJunction = 0;
        for (const j of streets.junctions) {
          const xs = byId.get(j.streets.map((q) => q.street).find((id) => byId.get(id)!.axis === "x")!)!;
          const zs = byId.get(j.streets.map((q) => q.street).find((id) => byId.get(id)!.axis === "z")!)!;
          const i0 = Math.min(...j.cells.map((c) => c.i));
          const i1 = Math.max(...j.cells.map((c) => c.i));
          const j0 = Math.min(...j.cells.map((c) => c.j));
          const j1 = Math.max(...j.cells.map((c) => c.j));
          expect([i1 - i0 + 1, j1 - j0 + 1], j.id).toEqual([carriage(zs), carriage(xs)]);
          expect(j.cells, j.id).toHaveLength(carriage(zs) * carriage(xs));
          for (const c of j.cells) {
            const g = groundAt.get(key(c.i, c.j))!;
            expect([g.role, g.yaw, g.variant, g.street], `${j.id} (${c.i}, ${c.j})`).toEqual(["junction", 0, 0, null]);
          }
          inJunction += j.cells.length;
          TOTALS.junctions++;
          TOTALS.junctionRects++;
        }
        expect(ground.filter((g) => g.role === "junction")).toHaveLength(inJunction);
        expect(edge.cells.filter((c) => c.role === "junction")).toHaveLength(inJunction);
      });

      it("kerb line: each block side has exactly one path, from block corner to block corner on the kerb line, and each edge street's outer pavement one, joined end to end (criterion 2)", () => {
        const { streets, kerb } = layersOf(o);
        const byId = new Map(streets.streets.map((s) => [s.id, s] as const));
        const kerbAt = (s: CityPlanStreet, p: CityKerbPath): number => ((s.axis === "x" ? p.across.z : p.across.x) > 0 ? s.carriage.hi_m : s.carriage.lo_m);
        let sides = 0;
        for (const b of streets.blocks) {
          for (const side of Object.values(b.sides) as CityBlockSide[]) {
            sides++;
            const mine = kerb.filter((p) => p.faces === b.id && p.blockSide === side.side);
            expect(mine, `${b.id} ${side.side}`).toHaveLength(1);
            const p = mine[0]!;
            const s = byId.get(side.street)!;
            expect(p.street).toBe(side.street);
            const along = (q: { x: number; z: number }): number => (s.axis === "x" ? q.x : q.z);
            const across = (q: { x: number; z: number }): number => (s.axis === "x" ? q.z : q.x);
            const first = p.points[0]!;
            const last = p.points[p.points.length - 1]!;
            expect(along(first)).toBeCloseTo(side.span.lo * TILE_M, 9);
            expect(along(last)).toBeCloseTo(side.span.hi * TILE_M, 9);
            expect(across(first)).toBeCloseTo(kerbAt(s, p), 9);
            expect(across(last)).toBeCloseTo(kerbAt(s, p), 9);
            // consecutive chain segments join end to end, and the points are the chain's vertices
            const chain = p.segs.filter((q) => q.kind !== "dip");
            expect(p.points).toHaveLength(chain.length + 1);
            for (let n = 1; n < chain.length; n++) expect(chain[n]!.a).toEqual(chain[n - 1]!.b);
            TOTALS.sidesOnePath++;
          }
        }
        TOTALS.sides += sides;
        expect(kerb.filter((p) => p.faces !== "outer")).toHaveLength(sides);
        const outer = streets.streets.filter((s) => s.outer !== null);
        expect(outer).toHaveLength(4);
        for (const s of outer) {
          const mine = kerb.filter((p) => p.faces === "outer" && p.street === s.id);
          expect(mine, `${s.id}'s outer pavement`).toHaveLength(1);
          expect(mine[0]!.blockSide).toBeNull();
        }
        expect(kerb).toHaveLength(sides + 4);
      });

      it("kerb line: every inlet goes round as Josh drew it: a return before and after each opening on the chain, one near and one far return, a dip from the near return's `at` to the far one's, as many dips as openings, each return 5 m or 10 m long (063 F, criterion 2)", () => {
        const { kerb } = layersOf(o);
        const same = (p: { x: number; z: number }, q: { x: number; z: number }): number => Math.hypot(p.x - q.x, p.z - q.z);
        for (const p of kerb) {
          const chain = p.segs.filter((q) => q.kind !== "dip");
          const kinds = chain.map((q) => q.kind);
          for (const id of new Set(p.returns.map((r) => r.inlet))) {
            const near = p.returns.filter((r) => r.inlet === id && r.side === "near");
            const far = p.returns.filter((r) => r.inlet === id && r.side === "far");
            expect([near.length, far.length], `${p.id} ${id}`).toEqual([1, 1]);
            const dip = p.dips.find((d) => d.inlet === id);
            expect(dip, `${p.id} ${id}: a dip`).toBeDefined();
            expect(same(dip!.a, near[0]!.at), `${p.id} ${id}: dip a`).toBeLessThan(1e-9);
            expect(same(dip!.b, far[0]!.at), `${p.id} ${id}: dip b`).toBeLessThan(1e-9);
          }
          for (const [i0, i1] of p.openings) {
            expect(kinds[i0 - 1], `${p.id}: before an opening`).toBe("return");
            expect(kinds[i1], `${p.id}: after an opening`).toBe("return");
          }
          expect(p.openings.length, p.id).toBe(p.dips.length);
          for (const q of chain.filter((x) => x.kind === "return")) {
            const len = same(q.a, q.b);
            expect(Math.abs(len - TILE_M) < 1e-9 || Math.abs(len - 2 * TILE_M) < 1e-9, `${p.id}: a return ${len} m long`).toBe(true);
          }
        }
      });

      it("kerb line: a path walks only its street's own span and own cells: no cell of a path lies beyond the span (criterion 2)", () => {
        const { streets, ground, kerb } = layersOf(o);
        const groundAt = new Map(ground.map((g) => [key(g.i, g.j), g] as const));
        const byId = new Map(streets.streets.map((s) => [s.id, s] as const));
        let ending = 0;
        for (const s of streets.streets) if (s.span.hi - s.span.lo < (s.axis === "x" ? streets.w : streets.h)) ending++;
        expect(ending).toBeGreaterThan(0);
        for (const p of kerb) {
          const s = byId.get(p.street)!;
          for (const q of p.segs) {
            for (const c of [q.cell, q.under]) {
              if (c === null) continue;
              const along = s.axis === "x" ? c.i : c.j;
              expect(along >= s.span.lo && along < s.span.hi, `${p.id} (${c.i}, ${c.j})`).toBe(true);
              expect(groundAt.get(key(c.i, c.j))!.street, `${p.id} (${c.i}, ${c.j})`).toBe(p.street);
            }
          }
        }
      });

      it("far side of a T: the dropped kerbs are exactly the two pavement cells at the ends of each T's ending street, a crossing in front of each, a junction in front of the cells between, one crossingDip segment each, and no corner or return between (criterion 3)", () => {
        const { streets, ground, kerb } = layersOf(o);
        const ts = streets.junctions.filter((j) => j.kind === "T");
        const dropped = ground.filter((g) => (g.variant & V.pavementDip) !== 0);
        expect(dropped).toHaveLength(2 * ts.length);
        expect(new Set(dropCells(streets).map((c) => key(c.i, c.j)))).toEqual(new Set(dropped.map((g) => key(g.i, g.j))));
        const groundAt = new Map(ground.map((g) => [key(g.i, g.j), g] as const));
        const dipSegs = kerb.flatMap((p) => p.segs.filter((q) => q.kind === "crossingDip").map((q) => ({ p, q })));
        expect(dipSegs).toHaveLength(dropped.length);
        for (const g of dropped) {
          expect(g.role).toBe("pavement");
          expect(g.variant & V.pavementGrate).toBe(0);
          expect(dipSegs.filter(({ q }) => q.cell!.i === g.i && q.cell!.j === g.j)).toHaveLength(1);
        }
        const byId = new Map(streets.streets.map((s) => [s.id, s] as const));
        for (const t of ts) {
          const e = byId.get(t.streets.find((x) => !x.passes)!.street)!;
          const lo = e.across0;
          const hi = e.across0 + e.bands.length - 1;
          // the two dropped cells of this T, on its through street's pavement, e.bands.length - 1 cells apart
          const through = t.streets.find((x) => x.passes)!.street;
          const alongOf = (g: CityGroundCell): number => (e.axis === "z" ? g.i : g.j);
          const mine = dropped.filter((g) => g.street === through && (alongOf(g) === lo || alongOf(g) === hi));
          expect(mine, t.id).toHaveLength(2);
          const dist = Math.abs(e.axis === "z" ? mine[0]!.i - mine[1]!.i : mine[0]!.j - mine[1]!.j);
          expect(dist, t.id).toBe(e.bands.length - 1);
          TOTALS.ts++;
          TOTALS.dips += 2;
        }
        // no other cell is dropped; no dropped cell is a kerb cut; every dip's path has no return or corner between its two dips
        expect(ground.filter((g) => g.role !== "pavement" && (g.variant & V.pavementDip) !== 0)).toHaveLength(0);
        for (const { p } of dipSegs) {
          const s = byId.get(p.street)!;
          const dipsOnPath = dipSegs.filter((d) => d.p === p).map((d) => (s.axis === "x" ? d.q.cell!.i : d.q.cell!.j));
          const lo = Math.min(...dipsOnPath);
          const hi = Math.max(...dipsOnPath);
          for (const q of p.segs) {
            if (q.kind === "return" || q.kind === "opening" || q.kind === "dip") {
              const along = s.axis === "x" ? q.a.x : q.a.z;
              expect(along > lo * TILE_M && along < (hi + 1) * TILE_M, `${p.id}: a ${q.kind} between the dropped kerbs`).toBe(false);
            }
          }
        }
        // (a build-out may start in the cell beside a dropped kerb, as at a block corner: counted, not forbidden)
        for (const g of dropped) {
          const s = byId.get(g.street!)!;
          for (const d of [-1, 1]) {
            const n = groundAt.get(s.axis === "x" ? key(g.i + d, g.j) : key(g.i, g.j + d));
            if (n !== undefined && n.role === "pavement" && (n.variant & V.pavementFlush) !== 0) TOTALS.buildOutBesideDip++;
          }
        }
      });

      it("a bare one-way street's kerb is straight, edge or crossingDip at the carriageway edge, no flank, no build-out; a mouth on it still turns in with its two returns and a cut with `plain` null; a one-way street's side without the band has no build-out (criterion 4)", () => {
        const { streets, edge, kerb } = layersOf(o);
        const byId = new Map(streets.streets.map((s) => [s.id, s] as const));
        const cutOf = new Map(edge.kerbCuts.map((k) => [key(k.cell.i, k.cell.j), k] as const));
        for (const p of kerb) {
          const s = byId.get(p.street)!;
          if (s.section === "oneWayBare") {
            TOTALS.bareSides++;
            for (const q of p.segs) {
              expect(q.kind, `${p.id}`).not.toBe("flank");
              if (q.kind === "edge" || q.kind === "crossingDip") expect(q.under).toBeNull();
            }
            const edges = p.segs.filter((q) => q.kind === "edge" || q.kind === "crossingDip");
            const v = (q: { x: number; z: number }): number => (s.axis === "x" ? q.z : q.x);
            for (const q of edges) expect([v(q.a), v(q.b)]).toEqual([v(edges[0]!.a), v(edges[0]!.a)]);
            TOTALS.bareFlanks += p.segs.filter((q) => q.kind === "flank").length;
            const mouths = p.returns.filter((r) => r.side === "near").length;
            TOTALS.bareMouths += mouths;
            expect(p.returns.filter((r) => r.side === "far")).toHaveLength(mouths);
          }
        }
        for (const k of edge.kerbCuts) if (byId.get(k.street)!.section === "oneWayBare") expect(cutOf.get(key(k.cell.i, k.cell.j))!.plain).toBeNull();
        // on a oneWay street the side without the parking band has no build-out
        const bandCell = new Map(streets.cells.map((c) => [key(c.i, c.j), c] as const));
        for (const c of edge.cells) {
          if (c.role !== "buildout") continue;
          const s = byId.get(c.street!)!;
          expect(s.bands[c.band], `${c.street} (${c.i}, ${c.j})`).toBe("parking");
          expect(s.section).not.toBe("oneWayBare");
          expect(bandCell.get(key(c.i, c.j))!.role).toBe("parkingPlain");
        }
      });

      it("the two additions: no return at a plaza, park edge or walk-through; a drive, lane or frontage lot's mouth has two returns; each return ends on the corner column's wall plane (criterion 5)", () => {
        const { streets, mass, edge, kerb } = layersOf(o);
        const byId = new Map(mass.openings.map((x) => [x.id, x] as const));
        const builtAt = new Set(mass.built.map((b) => key(b.i, b.j)));
        const streetOf = new Map(streets.streets.map((s) => [s.id, s] as const));
        for (const k of edge.kerbCuts) expect(["lane", "drive", "frontLot"], k.opening).toContain(byId.get(k.opening)!.kind);
        const returns = new Map<string, { near: number; far: number }>();
        for (const p of kerb) {
          const s = streetOf.get(p.street)!;
          for (const r of p.returns) {
            const c = returns.get(r.opening) ?? { near: 0, far: 0 };
            c[r.side]++;
            returns.set(r.opening, c);
            // the built cell beside the opening on that side, and its wall plane: the cell edge facing the opening (the cell edge until F2's BODY_M table exists)
            const along = s.axis === "x" ? r.at.x : r.at.z;
            const v = s.axis === "x" ? r.at.z : r.at.x;
            const dir = s.axis === "x" ? p.across.z : p.across.x;
            const cellAlong = Math.round(along / TILE_M) - (r.side === "near" ? 1 : 0);
            const cellAcross = Math.floor((v + dir * TILE_M * 1.5) / TILE_M);
            expect(builtAt.has(s.axis === "x" ? key(cellAlong, cellAcross) : key(cellAcross, cellAlong)), `${r.inlet} ${r.side}`).toBe(true);
            const wallAlong = (cellAlong + (r.side === "near" ? 1 : 0)) * TILE_M;
            const buildingLine = dir > 0 ? (cellAcross * TILE_M) : (cellAcross + 1) * TILE_M;
            const endAlong = s.axis === "x" ? r.end.x : r.end.z;
            const endAcross = s.axis === "x" ? r.end.z : r.end.x;
            const off = Math.hypot(endAlong - wallAlong, endAcross - buildingLine);
            expect(off, `${r.inlet} ${r.side}`).toBeLessThanOrEqual(RETURN_WALL_TOL_M);
            TOTALS.returns++;
            if (off <= RETURN_WALL_TOL_M) TOTALS.returnsOnWall++;
            TOTALS.maxReturnOff = Math.max(TOTALS.maxReturnOff, off);
          }
        }
        for (const op of mass.openings) {
          const c = returns.get(op.id) ?? { near: 0, far: 0 };
          // a plaza, park, walk-through, or a lane drive (entered from the lane) has no mouth and no return; every mouth has two
          expect([c.near, c.far], op.id).toEqual([op.mouth.length, op.mouth.length]);
          if (op.kind === "plaza" || op.kind === "park" || op.kind === "walk") expect(op.mouth).toEqual([]);
        }
      });

      it("G4: every court touches its opening, every mouth cell of every vehicle opening has its cut, each lane end has its cut (criterion 6)", () => {
        const { mass, edge, land } = layersOf(o);
        expect(g4Failures(edge, mass, land)).toEqual([]);
        // counted another way: a lane opening has two mouths and a cut at each
        const cutIds = new Set(edge.kerbCuts.map((k) => k.opening));
        for (const op of mass.openings.filter((x) => x.kind === "lane")) {
          expect(op.mouth).toHaveLength(2);
          expect(cutIds.has(op.id)).toBe(true);
        }
        for (const c of mass.courts) {
          const op = mass.openings.find((x) => x.id === c.opening)!;
          const mine = new Set([...c.stallCells, ...c.aisleCells].map((q) => key(q.i, q.j)));
          expect(op.cells.some((q) => mine.has(key(q.i, q.j)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => mine.has(key(q.i + di!, q.j + dj!)))), `${c.block} ${c.opening}`).toBe(true);
        }
      });

      it("the picture gains a dropped kerb per dropped cell and a point per return's end (criterion 7)", () => {
        const { ground, kerb } = layersOf(o);
        const r = cityOf(o);
        const pic = edgeStage.picture(r.plan);
        const dropIndex = pic.legend.findIndex((e) => e.name === "dropped kerb");
        const returnIndex = pic.legend.findIndex((e) => e.name === "kerb return");
        expect(dropIndex).toBeGreaterThan(0);
        expect(returnIndex).toBeGreaterThan(0);
        expect(pic.cells.filter((c) => c === dropIndex)).toHaveLength(ground.filter((g) => (g.variant & V.pavementDip) !== 0).length);
        expect(pic.points.filter((p) => p.legend === returnIndex)).toHaveLength(kerb.reduce((n, p) => n + p.returns.length, 0));
      });
    });
  }

  it("the report's numbers over the 20 named runs", () => {
    // (the per-run tests above fill TOTALS)
    console.log(`D2 TOTALS ${JSON.stringify(TOTALS)}`);
    expect(TOTALS.sides).toBeGreaterThan(2000);
    expect(TOTALS.sidesOnePath).toBe(TOTALS.sides);
    expect(TOTALS.dips).toBe(2 * TOTALS.ts);
    expect(TOTALS.ts).toBeGreaterThan(300);
    expect(TOTALS.bareSides).toBeGreaterThan(0);
    expect(TOTALS.bareFlanks).toBe(0);
    expect(TOTALS.returnsOnWall).toBe(TOTALS.returns);
    expect(TOTALS.junctionRects).toBe(TOTALS.junctions);
  });

  it("the named runs have all three sections, every record's street cells counted (criterion 1: two-way 5 cells, one-way with parking 4, bare one-way 3)", () => {
    const widths = new Set<string>();
    for (const o of NAMED) {
      const { streets, edge } = layersOf(o);
      const cellsOf = new Map<string, number>();
      for (const c of edge.cells) if (c.street !== null && c.band >= 0) cellsOf.set(`${c.street}|${c.band}`, (cellsOf.get(`${c.street}|${c.band}`) ?? 0) + 1);
      for (const s of streets.streets) {
        widths.add(`${s.section}:${s.bands.length}`);
        for (let k = 0; k < s.bands.length; k++) expect(cellsOf.get(`${s.id}|${k}`) ?? 0, `${s.id} band ${k}`).toBeGreaterThan(0);
      }
    }
    expect([...widths].sort()).toEqual(["oneWay:4", "oneWayBare:3", "twoWay:5"]);
  });

  it("a T's far side, on the named runs: one far side for each T, in a block side's `junctions` or on an edge street's outer pavement, with the facing span the ending street's cross-section", () => {
    let inner = 0;
    let outer = 0;
    for (const o of NAMED) {
      const { streets } = layersOf(o);
      const byId = new Map(streets.streets.map((s) => [s.id, s] as const));
      const facings = new Map<string, number>();
      for (const b of streets.blocks) {
        for (const side of Object.values(b.sides) as CityBlockSide[]) {
          for (const f of side.junctions) {
            facings.set(f.junction, (facings.get(f.junction) ?? 0) + 1);
            const e = byId.get(f.street)!;
            expect(f.span, `${f.junction}`).toEqual({ lo: e.across0, hi: e.across0 + e.bands.length });
          }
        }
      }
      for (const j of streets.junctions.filter((x) => x.kind === "T")) {
        const through = byId.get(j.streets.find((x) => x.passes)!.street)!;
        const n = facings.get(j.id) ?? 0;
        if (through.outer !== null) {
          expect(n, j.id).toBe(0);
          outer++;
        } else {
          expect(n, j.id).toBe(1);
          inner++;
        }
      }
    }
    expect(inner).toBeGreaterThan(0);
    expect(outer).toBeGreaterThan(0);
  });
});

// ---- typed-in fixtures ----

/** A street of a fixture: its cross-section from `across0`, kerb to kerb. */
function street(id: string, axis: "x" | "z", across0: number, bands: CityStreetBand[], span: { lo: number; hi: number }, section: CityPlanStreet["section"], outer: CitySide | null = null): CityPlanStreet {
  const n = bands.length;
  const cells = bands.map((b, k) => ({ b, a: axis === "x" ? across0 + k : across0 + n - 1 - k })).filter((q) => q.b === "lane" || q.b === "parking");
  const lo = Math.min(...cells.map((q) => q.a)) * TILE_M;
  const hi = (Math.max(...cells.map((q) => q.a)) + 1) * TILE_M;
  const lane = cells.filter((q) => q.b === "lane").map((q) => q.a);
  const centre = section === "twoWay" ? (lo + hi) / 2 : (lane[0]! + 0.5) * TILE_M;
  return {
    id,
    axis,
    line: 0,
    profile: "street",
    bands,
    across0,
    carriage: { lo_m: lo, hi_m: hi },
    centre_m: centre,
    section,
    flow: section === "twoWay" ? "both" : "+",
    span,
    ends: [{ junction: "none" }, { junction: "none" }],
    outer,
  };
}

const NO_SIDE = (name: CitySide): CityBlockSide => ({ side: name, street: "none", span: { lo: 0, hi: 0 }, across: [], junctions: [] });
function block(id: string, i0: number, i1: number, j0: number, j1: number, sides: Partial<Record<CitySide, CityBlockSide>>): CityPlanBlock {
  const all = { "-z": NO_SIDE("-z"), "+x": NO_SIDE("+x"), "+z": NO_SIDE("+z"), "-x": NO_SIDE("-x"), ...sides };
  return { id, bi: 0, bj: 0, i0, i1, j0, j1, type: "medium", sides: all };
}

/** A street layer of only what the kerb line and the ground read: streets, junctions, blocks, the lattice size. */
const layerOf = (w: number, h: number, streets: CityPlanStreet[], junctions: CityStreetsLayer["junctions"], blocks: CityPlanBlock[]): CityStreetsLayer =>
  ({ stage: "streets", w, h, streets, cells: [], blocks, junctions, outline: { i0: 0, i1: w, j0: 0, j1: h, draw: null }, arrows: [] }) as CityStreetsLayer;

const edgeCell = (i: number, j: number, role: CityEdgeRole, street: string | null, band = -1): CityEdgeCell => ({ i, j, role, street, band, faces: null });

/**
 * A 14-cell block side on the through street X (two-way, rows 6 to 10, pavement on rows 6 and 10), facing a T: the street E ends in X from the north, its cross-section at columns 4 to 8 (5, 4 or 3 cells by `ending`).
 * Rows 7 to 9 are X's carriageway; row 6 holds the crossing across E, row 10 the far pavement, one block below it (columns 0 to 13), and one block each side of E above X.
 */
function tFixture(ending: "twoWay" | "oneWay" | "oneWayBare"): { streets: CityStreetsLayer; cells: CityEdgeCell[]; e: CityPlanStreet; x: CityPlanStreet } {
  const bandsE: CityStreetBand[] = ending === "twoWay" ? ["pavement", "parking", "lane", "lane", "pavement"] : ending === "oneWay" ? ["pavement", "parking", "lane", "pavement"] : ["pavement", "lane", "pavement"];
  const across0 = 4;
  const e = street("E", "z", across0, bandsE, { lo: 0, hi: 10 }, ending);
  const x = street("X", "x", 6, ["pavement", "parking", "lane", "lane", "pavement"], { lo: 0, hi: 14 }, "twoWay");
  const n = bandsE.length;
  const eBand = (col: number): CityStreetBand | null => (col >= across0 && col < across0 + n ? bandsE[n - 1 - (col - across0)]! : null);
  const xBand = (row: number): CityStreetBand => x.bands[row - 6]!;
  const cells: CityEdgeCell[] = [];
  const carriage = (b: CityStreetBand | null): boolean => b === "lane" || b === "parking";
  for (let j = 6; j <= 10; j++) {
    for (let i = 0; i < 14; i++) {
      const eb = j <= 9 ? eBand(i) : null;
      const xb = xBand(j);
      if (eb === null) cells.push(edgeCell(i, j, xb === "parking" ? "parkingPlain" : xb, "X", j - 6));
      else if (carriage(eb) && carriage(xb)) cells.push(edgeCell(i, j, "junction", null));
      else if (carriage(eb)) cells.push(edgeCell(i, j, "crossing", "E"));
      else if (carriage(xb)) cells.push(edgeCell(i, j, "crossing", "X"));
      else cells.push(edgeCell(i, j, "pavementCorner", null));
    }
  }
  const junction = { id: "J", kind: "T", cells: cells.filter((c) => c.role === "junction").map((c) => ({ i: c.i, j: c.j })), streets: [{ street: "X", passes: true }, { street: "E", passes: false }], arms: ["-x", "+x", "-z"], inner: true } as CityStreetsLayer["junctions"][number];
  const below = block("B", 0, 14, 11, 20, { "-z": { side: "-z", street: "X", span: { lo: 0, hi: 14 }, across: [], junctions: [{ junction: "J", street: "E", span: { lo: across0, hi: across0 + n } }] } });
  const left = block("L", 0, across0, 0, 6, { "+z": { side: "+z", street: "X", span: { lo: 0, hi: across0 }, across: [], junctions: [] } });
  const right = block("R", across0 + n, 14, 0, 6, { "+z": { side: "+z", street: "X", span: { lo: across0 + n, hi: 14 }, across: [], junctions: [] } });
  return { streets: layerOf(14, 20, [x, e], [junction], [below, left, right]), cells, e, x };
}

describe("kerb line fixtures: the far side of a T, straight past, dropped at the two crossings (criterion 3)", () => {
  const run = (ending: "twoWay" | "oneWay" | "oneWayBare"): { path: CityKerbPath; ground: CityGroundCell[] } => {
    const f = tFixture(ending);
    const ground = layGround(f.streets, f.cells, [], stageRand("edge", 1));
    const kerb = kerbLine(f.streets, ground, []);
    const path = kerb.find((p) => p.faces === "B" && p.blockSide === "-z")!;
    expect(kerb.filter((p) => p.faces === "B")).toHaveLength(1);
    return { path, ground };
  };

  for (const [ending, apart] of [["twoWay", 4], ["oneWay", 3], ["oneWayBare", 2]] as const) {
    it(`a 14-cell block side facing a ${ending} T has one path, exactly two crossingDip segments ${apart} cells apart along it, and no return between them`, () => {
      const { path, ground } = run(ending);
      const dips = path.segs.filter((q) => q.kind === "crossingDip");
      expect(dips).toHaveLength(2);
      expect(Math.abs(dips[1]!.a.x - dips[0]!.a.x) / TILE_M).toBe(apart);
      expect(path.segs.filter((q) => q.kind === "return" || q.kind === "opening" || q.kind === "flank")).toHaveLength(0);
      expect(path.returns).toHaveLength(0);
      // the path is straight on the kerb line, corner to corner, 14 cells
      expect(path.points[0]).toEqual({ x: 0, z: 50 });
      expect(path.points[path.points.length - 1]).toEqual({ x: 70, z: 50 });
      expect(path.segs.every((q) => q.a.z === 50 && q.b.z === 50)).toBe(true);
      // the two dropped pavement cells, and no other
      const dropped = ground.filter((g) => (g.variant & V.pavementDip) !== 0);
      expect(dropped.map((g) => [g.i, g.j])).toEqual([[4, 10], [4 + apart, 10]]);
      expect(dropped.every((g) => (g.variant & V.pavementGrate) === 0)).toBe(true);
    });
  }

  it("the crossings are turned along their own carriageway street, whatever its width, and the junction is the carriageways' rectangle (a bare one-way ending: 1 x 3)", () => {
    const f = tFixture("oneWayBare");
    const ground = layGround(f.streets, f.cells, [], stageRand("edge", 1));
    const junction = ground.filter((g) => g.role === "junction");
    expect(junction.map((g) => [g.i, g.j])).toEqual([[5, 7], [5, 8], [5, 9]]);
    expect(junction.every((g) => g.yaw === 0 && g.variant === 0)).toBe(true);
    // one crossing row across the ending street (1 cell, in X's pavement row) and two columns of 3 across the through street (E's pavement columns)
    const acrossE = ground.filter((g) => g.role === "crossing" && g.street === "E");
    const acrossX = ground.filter((g) => g.role === "crossing" && g.street === "X");
    expect(acrossE.map((g) => [g.i, g.j])).toEqual([[5, 6]]);
    expect(acrossX.map((g) => [g.i, g.j])).toEqual([[4, 7], [6, 7], [4, 8], [6, 8], [4, 9], [6, 9]]);
    for (const g of acrossE) expect(g.yaw).toBe(yawToward("z", 1));
    for (const g of acrossX) expect(g.yaw).toBe(yawToward("x", 1));
  });

  it("a street that ends in a T, its lattice line running on past the junction, has no path cell beyond its span", () => {
    const f = tFixture("twoWay");
    // E's span is rows 0 to 10; X's row 10 pavement under E's columns would be E's lattice line running on, but E's own cells stop at its span: no path of E walks past it
    const ground = layGround(f.streets, f.cells, [], stageRand("edge", 1));
    const kerb = kerbLine(f.streets, ground, []);
    for (const p of kerb) {
      const s = f.streets.streets.find((q) => q.id === p.street)!;
      for (const q of p.segs) {
        for (const c of [q.cell, q.under]) if (c !== null) expect((s.axis === "x" ? c.i : c.j) >= s.span.lo && (s.axis === "x" ? c.i : c.j) < s.span.hi).toBe(true);
      }
    }
    expect(kerb.every((p) => p.street === "X")).toBe(true);
  });
});

describe("kerb line fixtures: a vehicle opening on a bare one-way street (criterion 4) and the failing fixtures (criteria 2, 5, 6)", () => {
  /** A bare one-way street Y along x (rows 0 to 2, outer on its north side), one block below it (columns 0 to 13), a court drive at columns 6 and 7. */
  function bareFixture(): { streets: CityStreetsLayer; cells: CityEdgeCell[]; cuts: CityKerbCut[] } {
    const y = street("Y", "x", 0, ["pavement", "lane", "pavement"], { lo: 0, hi: 14 }, "oneWayBare", "-z");
    const cells: CityEdgeCell[] = [];
    for (let i = 0; i < 14; i++) {
      cells.push(edgeCell(i, 0, "pavement", "Y", 0));
      cells.push(edgeCell(i, 1, "lane", "Y", 1));
      cells.push(edgeCell(i, 2, i === 6 || i === 7 ? "kerbCut" : "pavement", "Y", 2));
    }
    cells.sort((p, q) => p.j - q.j || p.i - q.i);
    const below = block("B", 0, 14, 3, 12, { "-z": { side: "-z", street: "Y", span: { lo: 0, hi: 14 }, across: [], junctions: [] } });
    const cuts: CityKerbCut[] = [6, 7].map((i) => ({ cell: { i, j: 2 }, street: "Y", opening: "B/drive", plain: null }));
    return { streets: layerOf(14, 12, [y], [], [below]), cells, cuts };
  }

  it("a block side on a bare one-way street with one court drive gives edge, return, opening, return, edge and no flank", () => {
    const f = bareFixture();
    const ground = layGround(f.streets, f.cells, [], stageRand("edge", 1));
    const kerb = kerbLine(f.streets, ground, f.cuts);
    const path = kerb.find((p) => p.faces === "B")!;
    const kinds: string[] = [];
    for (const q of path.segs.filter((s) => s.kind !== "dip")) if (kinds[kinds.length - 1] !== q.kind) kinds.push(q.kind);
    expect(kinds).toEqual(["edge", "return", "opening", "return", "edge"]);
    expect(path.segs.some((q) => q.kind === "flank")).toBe(false);
    expect(path.returns.map((r) => [r.side, r.opening])).toEqual([["near", "B/drive"], ["far", "B/drive"]]);
    // the returns run from the street kerb (z 10) to the building line (z 15: the pavement's back edge), the opening across it from x 30 to x 40
    expect(path.returns[0]!.end).toEqual({ x: 30, z: 15 });
    expect(path.returns[1]!.end).toEqual({ x: 40, z: 15 });
    expect(path.dips).toHaveLength(1);
    // the outer pavement of the street, north, has one path
    expect(kerb.filter((p) => p.faces === "outer")).toHaveLength(1);
  });

  /** The default city's layers, for fixtures cut from a real city. */
  const DEFAULT: City = { seed: 1, way: "on" };

  it("the layer's own kerb line passes (a clean layer)", () => {
    const { streets, edge, mass, land } = layersOf(DEFAULT);
    expect(kerbFailures(edge, streets, mass)).toEqual([]);
    expect(g4Failures(edge, mass, land)).toEqual([]);
  });

  const withKerb = (edge: CityEdgeLayer, f: (p: CityKerbPath) => CityKerbPath): CityEdgeLayer => ({ ...edge, kerb: edge.kerb!.map(f) });

  it("an inlet with one return removed fails: the chain breaks, naming the kerb line", () => {
    const { streets, edge, mass } = layersOf(DEFAULT);
    const victim = edge.kerb!.find((p) => p.returns.length > 0)!;
    const at = victim.segs.findIndex((q) => q.kind === "return");
    const bad = withKerb(edge, (p) => (p === victim ? { ...p, segs: p.segs.filter((_, n) => n !== at) } : p));
    const failures = kerbFailures(bad, streets, mass);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.some((f) => f.id === "kerb line" && f.reason.includes("chain"))).toBe(true);
  });

  it("a build-out stretch with its flank removed fails: the chain breaks, naming the kerb line", () => {
    const { streets, edge, mass } = layersOf(DEFAULT);
    const victim = edge.kerb!.find((p) => p.segs.some((q) => q.kind === "flank"))!;
    const at = victim.segs.findIndex((q) => q.kind === "flank");
    const bad = withKerb(edge, (p) => (p === victim ? { ...p, segs: p.segs.filter((_, n) => n !== at) } : p));
    const failures = kerbFailures(bad, streets, mass);
    expect(failures.some((f) => f.id === "kerb line")).toBe(true);
  });

  it("a return that stops short of the building line fails: 0.1 m short fails naming the wall-plane addition, 0.04 m short passes", () => {
    const { streets, edge, mass } = layersOf(DEFAULT);
    const victim = edge.kerb!.find((p) => p.returns.length > 0)!;
    const r0 = victim.returns[0]!;
    const s = streets.streets.find((q) => q.id === victim.street)!;
    // shorter: the end pulled back toward the street kerb
    const shorter = (m: number): CityEdgeLayer =>
      withKerb(edge, (p) =>
        p === victim
          ? { ...p, returns: p.returns.map((r) => (r === r0 ? { ...r, end: s.axis === "x" ? { x: r.end.x, z: r.end.z - p.across.z * m } : { x: r.end.x - p.across.x * m, z: r.end.z } } : r)) }
          : p,
      );
    const bad = kerbFailures(shorter(0.1), streets, mass);
    expect(bad.some((f) => f.id === "return ends on the wall plane")).toBe(true);
    expect(kerbFailures(shorter(0.04), streets, mass)).toEqual([]);
    expect(kerbFailures(shorter(0), streets, mass)).toEqual([]);
  });

  it("a plaza typed in with a kerb cut in front of it fails, naming the addition (no return at a plaza, park edge or walk-through)", () => {
    const { streets, edge, mass } = layersOf(DEFAULT);
    const drive = mass.openings.find((o) => o.kind === "drive" && o.mouth.length > 0)!;
    const plaza: CityMassLayer = { ...mass, openings: mass.openings.map((o) => (o === drive ? { ...o, kind: "plaza" as const, mouth: [] } : o)) };
    const failures = kerbFailures(edge, streets, plaza);
    expect(failures.some((f) => f.id === "no return at a plaza, park edge or walk-through")).toBe(true);
  });

  it("G4 fails on a lane with one end's cut removed, and on a court whose opening is moved off it", () => {
    const { edge, mass, land } = layersOf(DEFAULT);
    const lane = mass.openings.find((o) => o.kind === "lane")!;
    const end = lane.mouth[0]!;
    const noCut: CityEdgeLayer = { ...edge, kerbCuts: edge.kerbCuts.filter((k) => !(k.opening === lane.id && end.cells.some((c) => Math.abs(c.i - k.cell.i) + Math.abs(c.j - k.cell.j) === 1))) };
    expect(noCut.kerbCuts.length).toBeLessThan(edge.kerbCuts.length);
    const f1 = g4Failures(noCut, mass, land);
    expect(f1.length).toBeGreaterThan(0);
    expect(f1.every((f) => f.reason.startsWith("G4:"))).toBe(true);
    // a court that names an opening of another block does not touch it
    const court = mass.courts[0]!;
    const elsewhere = mass.openings.find((o) => o.block !== court.block && o.kind === "drive")!;
    const moved: CityMassLayer = { ...mass, courts: mass.courts.map((c) => (c === court ? { ...c, opening: elsewhere.id } : c)) };
    const f2 = g4Failures(edge, moved, land);
    expect(f2.some((f) => f.reason.includes("does not touch its opening"))).toBe(true);
  });

  it("the ground check names its rule: a grate with a kerb bit, a lane variant on a bare street, and a missing record each fail", () => {
    const { streets, edge, mass } = layersOf(DEFAULT);
    const pav = edge.ground!.find((g) => g.role === "pavement")!;
    const bad1: CityEdgeLayer = { ...edge, ground: edge.ground!.map((g) => (g === pav ? { ...g, variant: V.pavementGrate | V.pavementDip } : g)) };
    expect(kerbFailures(bad1, streets, mass).some((f) => f.id === "D2 ground")).toBe(true);
    const bad2: CityEdgeLayer = { ...edge, ground: edge.ground!.filter((g) => g !== pav) };
    expect(kerbFailures(bad2, streets, mass).some((f) => f.id === "D2 ground")).toBe(true);
    const { kerb: _gone, ...noKerb } = edge;
    expect(_gone).toBeDefined();
    expect(kerbFailures(noKerb, streets, mass).some((f) => f.id === "kerb line")).toBe(true);
  });

  it("a dropped cell that is not a T's far side, and a far side with no dropped cell, fail naming the dropped kerb", () => {
    const { streets, edge, mass } = layersOf(DEFAULT);
    const dropped = edge.ground!.find((g) => (g.variant & V.pavementDip) !== 0)!;
    const undone: CityEdgeLayer = { ...edge, ground: edge.ground!.map((g) => (g === dropped ? { ...g, variant: 0 } : g)) };
    expect(kerbFailures(undone, streets, mass).some((f) => f.id === "dropped kerb")).toBe(true);
    const plain = edge.ground!.find((g) => g.role === "pavement" && g.variant === 0)!;
    const extra: CityEdgeLayer = { ...edge, ground: edge.ground!.map((g) => (g === plain ? { ...g, variant: V.pavementDip } : g)) };
    expect(kerbFailures(extra, streets, mass).some((f) => f.id === "dropped kerb")).toBe(true);
  });
});

