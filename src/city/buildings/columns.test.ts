/**
 * Stage 5, section F2 (ticket 070), on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on): columns, kinds and turns (criterion 2), pieces and roofs (3), placements (4), the checks and their failing fixtures (5).
 * HEAVY: each city is built once, through a module-level cache (stages 1 to 3 and 5; stage 5 reads no edge layer).
 *
 * R-2: the stage returns ok on all 20 named runs. Nothing is loosened and no city is pinned as an exception. The hand-worked placements are computed from the kit table's numbers on paper, not by the code under test.
 */
import { describe, expect, it } from "vitest";
import type { CityBuildingsLayer, CityColumn, CityMassLayer, CityPiece, CityPlanRun, CitySide } from "../../core";
import { FULL_CITIES, NAMED, sharedCity } from "../testing/namedcities";
import { CORNER_TURN, floorPlan } from "./columns";
import { columnFailures, columnReport } from "./columncheck";
import { BUILDING_STYLES, OVERLAP_MAX_M, STOREY_ALIGN_TOL_M, WALL_JOINT_TOL_M } from "./constants";
import { KIT, kitEntry } from "./kit";
import { bodyBoxOf, cellBox, centreOf, ownBody, placeFloor, placeRoof, planeOf, SIDE_VEC } from "./place";
import { keyOf, OPPOSITE } from "./rows";

interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}
const DEFAULT: City = { blocksX: 6, blocksZ: 6, seed: 1, way: "on" };
const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;

function cityOf(o: City): CityPlanRun {
  return sharedCity(o, "buildings");
}
interface Layers {
  readonly mass: CityMassLayer;
  readonly buildings: CityBuildingsLayer;
  readonly columns: readonly CityColumn[];
}
function layersOf(o: City): Layers {
  const r = cityOf(o);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  const l = r.plan.layers;
  return { mass: l.mass!, buildings: l.buildings!, columns: l.buildings!.columns! };
}
const YAW: Record<CitySide, number> = { "+z": 0, "+x": 90, "-z": 180, "-x": 270 };
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol;

describe("stage 5 with columns on the named runs (R-2)", { timeout: 120_000 }, () => {
  it("the stage returns ok on all 20 named runs, and every F2 check holds", () => {
    for (const o of NAMED) {
      const r = cityOf(o);
      expect(r.ok, r.ok ? label(o) : `${label(o)}: ${r.failure.stage}: ${r.failure.reason}`).toBe(true);
      const l = layersOf(o);
      expect(columnFailures(l.buildings, { mass: l.mass }).map((f) => `${f.check}: ${f.reason}`), label(o)).toEqual([]);
    }
  });
});

describe("columns, kinds and turns (criterion 2)", { timeout: 120_000 }, () => {
  it("one column per built cell, in order, with its building's id and the mass's kind", () => {
    for (const o of NAMED) {
      const { mass, buildings, columns } = layersOf(o);
      expect(columns.length, label(o)).toBe(mass.built.length);
      const holder = new Map(buildings.buildings.flatMap((b) => b.cells.map((c) => [keyOf(c), b.id] as const)));
      mass.built.forEach((m, n) => {
        const c = columns[n]!;
        expect(keyOf(c), `${label(o)} column ${n}`).toBe(keyOf(m));
        expect(c.building).toBe(holder.get(keyOf(m)));
        expect(c.kind).toBe(m.column);
      });
    }
  });

  it("every ground slot and piece takes the column's yaw; mid fronts its one open side, corner is forced to its two open sides, blind takes its building's front", () => {
    const seen = { mid: 0, corner: 0, blind: 0 };
    const turns = new Set<string>();
    for (const o of NAMED) {
      const { mass, buildings, columns } = layersOf(o);
      const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
      mass.built.forEach((m, n) => {
        const c = columns[n]!;
        const open = m.open.map((s) => s.side);
        seen[c.kind]++;
        expect(c.ground.yaw).toBe(c.yaw);
        for (const p of c.pieces) expect(p.placement.yaw_deg).toBe(c.yaw);
        if (c.kind === "mid") {
          expect(open).toHaveLength(1);
          expect([c.front, c.side, c.yaw]).toEqual([open[0], null, YAW[open[0]!]]);
        } else if (c.kind === "corner") {
          expect(open).toHaveLength(2);
          expect(new Set([c.front, c.side]), `${label(o)} (${c.i}, ${c.j})`).toEqual(new Set(open));
          const forced: Record<string, [CitySide, CitySide, number]> = { "+z,-x": ["+z", "-x", 0], "+x,+z": ["+x", "+z", 90], "+x,-z": ["-z", "+x", 180], "-x,-z": ["-x", "-z", 270] };
          expect([c.front, c.side, c.yaw]).toEqual(forced[[...open].sort().join(",")]);
          turns.add(`${c.front}/${c.side}/${c.yaw}`);
        } else {
          expect(open).toHaveLength(0);
          expect([c.front, c.side, c.yaw]).toEqual([byId.get(c.building)!.front, null, YAW[byId.get(c.building)!.front]]);
        }
      });
    }
    expect(seen.mid).toBeGreaterThan(0);
    expect(seen.corner).toBeGreaterThan(0);
    expect(seen.blind).toBeGreaterThan(0);
    expect(turns.size, "all four corner turns occur").toBe(4);
    expect(Object.keys(CORNER_TURN)).toHaveLength(4);
  });

  it.runIf(FULL_CITIES)("rowId is the building's, except an L's bend cell (the bend row); a non-blind column's front is its row's front, or that and its side for a corner", () => {
    let bends = 0;
    for (const o of NAMED) {
      const { buildings, columns } = layersOf(o);
      const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
      const rows = new Map(buildings.rows.map((r) => [r.id, r] as const));
      const colAt = new Map(columns.map((c) => [keyOf(c), c] as const));
      for (const c of columns) {
        const b = byId.get(c.building)!;
        const isBend = b.bend !== null && keyOf(b.cells[2]!) === keyOf(c);
        if (isBend) bends++;
        expect(c.rowId, `${label(o)} (${c.i}, ${c.j})`).toBe(isBend ? b.bend : b.rowId);
        if (c.kind !== "blind") {
          const front = rows.get(c.rowId)!.front;
          expect(c.front === front || c.side === front, `${label(o)} (${c.i}, ${c.j}) front ${c.front} side ${c.side} row ${front}`).toBe(true);
        }
      }
      // An L: its corner is blind, and the bend cell fronts the bend row.
      for (const b of buildings.buildings.filter((x) => x.bend !== null)) {
        expect(colAt.get(keyOf(b.cells[1]!))!.kind).toBe("blind");
        expect(colAt.get(keyOf(b.cells[1]!))!.front).toBe(b.front);
        const bendRow = rows.get(b.bend!)!;
        const bendCol = colAt.get(keyOf(b.cells[2]!))!;
        expect(bendCol.front === bendRow.front || bendCol.side === bendRow.front).toBe(true);
      }
    }
    expect(bends, "the named runs have Ls").toBe(8);
  });

  it("the ground slot is the column's kind and yaw, y 0, its top the style's base pitch, and names no key", () => {
    for (const o of NAMED) {
      const { buildings, columns } = layersOf(o);
      const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
      for (const c of columns) {
        const style = BUILDING_STYLES.find((s) => s.id === byId.get(c.building)!.style)!;
        expect(c.ground).toEqual({ kind: c.kind, yaw: c.yaw, y_m: 0, top_m: style.pitch_m.base });
        expect(Object.keys(c.ground).sort()).toEqual(["kind", "top_m", "y_m", "yaw"]);
      }
    }
  });
});

describe("pieces and roofs (criterion 3)", { timeout: 120_000 }, () => {
  it("storeys 1 to storeys - 1 are covered once each, bottom up, as the rule says; the roof stands at 3 x storeys, once, last", () => {
    const shapes = new Set<string>();
    for (const o of NAMED) {
      const { buildings, columns } = layersOf(o);
      const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
      for (const c of columns) {
        const b = byId.get(c.building)!;
        const roof = c.pieces[c.pieces.length - 1]!;
        expect(c.pieces.filter((p) => p.role === "roof")).toHaveLength(1);
        expect(roof.role).toBe("roof");
        expect([roof.storey, roof.span, roof.placement.y_m]).toEqual([b.storeys, 0, 3 * b.storeys]);
        const floors = c.pieces.slice(0, -1);
        let next = 1;
        for (const p of floors) {
          expect(p.storey, `${label(o)} (${c.i}, ${c.j})`).toBe(next);
          expect(p.placement.y_m).toBe(3 * p.storey);
          expect(p.span).toBe(p.role === "floor3" ? 3 : 1);
          next += p.span;
        }
        expect(next, "storeys covered once").toBe(b.storeys);
        if (c.kind === "corner") expect(floors.every((p) => p.role === "floor")).toBe(true);
        else {
          // 3 storeys: two floors; 4: one floor3; 5: one floor3 and one floor.
          const want = { 3: ["floor", "floor"], 4: ["floor3"], 5: ["floor3", "floor"] }[b.storeys as 3 | 4 | 5];
          expect(floors.map((p) => p.role)).toEqual(want);
        }
        shapes.add(`${c.kind} ${b.storeys}`);
      }
    }
    expect(shapes.size, "every kind at every storey count occurs").toBe(9);
    expect(floorPlan(false, 3).map((p) => p.role)).toEqual(["floor", "floor"]);
    expect(floorPlan(false, 4).map((p) => p.role)).toEqual(["floor3"]);
    expect(floorPlan(false, 5).map((p) => `${p.role}${p.storey}`)).toEqual(["floor31", "floor4"]);
    expect(floorPlan(true, 5)).toHaveLength(4);
  });

  it("every key is the building's own style's: corner keys on corner columns, mid keys on mid and blind, three-storey keys on runs of three", () => {
    for (const o of NAMED) {
      const { buildings, columns } = layersOf(o);
      const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
      for (const c of columns) {
        const style = BUILDING_STYLES.find((s) => s.id === byId.get(c.building)!.style)!;
        const corner = c.kind === "corner";
        for (const p of c.pieces) {
          const keys = p.role === "roof" ? (corner ? style.roof.corner : style.roof.mid) : p.role === "floor3" ? style.floor.stack3 : corner ? style.floor.corner : style.floor.mid;
          expect(keys, `${label(o)} (${c.i}, ${c.j}) ${p.role}`).toContain(p.placement.key);
          expect(KIT.some((e) => e.key === p.placement.key)).toBe(true);
          expect(kitEntry(p.placement.key).corner).toBe(corner);
        }
      }
    }
  });
});

describe("placements (criterion 4)", { timeout: 120_000 }, () => {
  it("every floor's body is its cell (each plane within 0.02 m); a roof's back plane is on the back edge, a mid roof is centred, a corner roof's outer flank is on its side edge", () => {
    for (const o of NAMED) {
      const { columns } = layersOf(o);
      for (const c of columns) {
        const cell = cellBox(c);
        const centre = centreOf(c);
        for (const p of c.pieces) {
          const body = bodyBoxOf(p.placement);
          if (p.role !== "roof") {
            for (const s of ["+x", "-x", "+z", "-z"] as const) expect(near(planeOf(body, s), planeOf(cell, s), WALL_JOINT_TOL_M), `${label(o)} (${c.i}, ${c.j}) ${s}`).toBe(true);
            continue;
          }
          const back = OPPOSITE[c.front];
          expect(planeOf(body, back)).toBeCloseTo(planeOf(cell, back), 9);
          if (c.kind === "corner") expect(planeOf(body, c.side!)).toBeCloseTo(planeOf(cell, c.side!), 9);
          else {
            const alongX = c.front === "+z" || c.front === "-z";
            expect(alongX ? (body.x0 + body.x1) / 2 : (body.z0 + body.z1) / 2).toBeCloseTo(alongX ? centre.x : centre.z, 9);
          }
        }
      }
    }
  });

  it("no placement carries a scale", () => {
    const { columns } = layersOf(DEFAULT);
    for (const c of columns) for (const p of c.pieces) expect(Object.keys(p.placement).sort()).toEqual(["key", "x_m", "y_m", "yaw_deg", "z_m"]);
  });

  // Hand-worked on paper from the kit table (bounds and BODY_M's insets), cell (0, 0) unless said: its centre is (2.5, 2.5), its edges 0 to 5.
  it("a mid floor: Apartment_01 (5.0 x 5.196, front 0.196) at yaw 0 has its body centre 0.098 m behind its pivot: pivot (2.5, 2.598)", () => {
    const p = placeFloor("city-pack:SM_Bld_Apartment_01", { i: 0, j: 0 }, 0, 3);
    expect([p.x_m, p.y_m, p.z_m, p.yaw_deg]).toEqual([2.5, 3, 2.598, 0]);
    const q = placeFloor("city-pack:SM_Bld_Apartment_01", { i: 2, j: 1 }, 90, 6);
    // yaw 90: own (0, -0.098) goes to x' = z = -0.098, z' = -x = 0; the cell's centre is (12.5, 7.5)
    expect([q.x_m, q.y_m, q.z_m]).toEqual([12.598, 6, 7.5]);
  });

  it("a three-storey piece stands as a floor does, at its lowest storey's height: Apartment_Stack_02 (5.17 x 5.214, front 0.129, back 0.085) at yaw 0 in cell (1, 2): pivot (7.5, 12.5 - (0.085 - 0.129) / 2 = 12.522), y 3", () => {
    const p = placeFloor("city-pack:SM_Bld_Apartment_Stack_02", { i: 1, j: 2 }, 0, 3);
    expect(p.x_m).toBeCloseTo(7.5, 9);
    expect(p.z_m).toBeCloseTo(12.522, 9);
    expect(p.y_m).toBe(3);
  });

  it("a mid roof: Apartment_Roof_02 (5.252 x 5.488, back 0.095) at yaw 0 in cell (1, 2): back plane on z = 10, pivot z = 10 + 2.744 - 0.095 = 12.649, centred on x = 7.5", () => {
    const p = placeRoof("city-pack:SM_Bld_Apartment_Roof_02", { i: 1, j: 2 }, "+z", null, 0, 12);
    expect([p.x_m, p.y_m, p.yaw_deg]).toEqual([7.5, 12, 0]);
    expect(p.z_m).toBeCloseTo(12.649, 9);
  });

  it("a corner roof: Apartment_Roof_Corner_01 (5.904 x 5.918, back 0.125, -x inset 0.715) at yaw 0 (front +z, side -x) in cell (0, 0): outer flank on x = 0, back on z = 0, pivot (2.952 - 0.715, 2.959 - 0.125) = (2.237, 2.834)", () => {
    const p = placeRoof("city-pack:SM_Bld_Apartment_Roof_Corner_01", { i: 0, j: 0 }, "+z", "-x", 0, 9);
    expect(p.x_m).toBeCloseTo(2.237, 9);
    expect(p.z_m).toBeCloseTo(2.834, 9);
  });

  it("a corner floor of Apartment_Corner_03 (5.491 x 5.497; front 0.351, back 0.146, -x 0.351, +x 0.14) at each of the four turns: its body centre is (+0.1055, -0.1025) from its pivot, turned", () => {
    const at = (yaw: 0 | 90 | 180 | 270) => placeFloor("city-pack:SM_Bld_Apartment_Corner_03", { i: 0, j: 0 }, yaw, 3);
    // yaw 0: (2.5 - 0.1055, 2.5 + 0.1025); 90: x' = z, z' = -x so the offset is (-0.1025, -0.1055); 180: (-0.1055, +0.1025); 270: x' = -z, z' = x so (+0.1025, +0.1055)
    const want: [0 | 90 | 180 | 270, number, number][] = [
      [0, 2.3945, 2.6025],
      [90, 2.6025, 2.6055],
      [180, 2.6055, 2.3975],
      [270, 2.3975, 2.3945],
    ];
    for (const [yaw, x, z] of want) {
      const p = at(yaw);
      expect(p.x_m, `yaw ${yaw} x`).toBeCloseTo(x, 9);
      expect(p.z_m, `yaw ${yaw} z`).toBeCloseTo(z, 9);
      const body = bodyBoxOf(p);
      for (const s of ["+x", "-x", "+z", "-z"] as const) expect(planeOf(body, s), `yaw ${yaw} ${s}`).toBeCloseTo(planeOf(cellBox({ i: 0, j: 0 }), s), 9);
    }
    // the open face (own -x) is on the forced side at every turn: yaw 0 on -x, 90 on +z, 180 on +x, 270 on -z
    expect(ownBody(kitEntry("city-pack:SM_Bld_Apartment_Corner_03")).x0).toBeCloseTo(-2.3945, 9);
    expect(SIDE_VEC["-x"]).toEqual({ x: -1, z: 0 });
  });
});

describe("the checks and their failing fixtures (criterion 5)", { timeout: 120_000 }, () => {
  const base = layersOf(DEFAULT);
  const withColumn = (n: number, change: (c: CityColumn) => CityColumn): CityBuildingsLayer => ({ ...base.buildings, columns: base.columns.map((c, k) => (k === n ? change(c) : c)) });
  const withPieces = (n: number, change: (p: CityPiece, k: number) => CityPiece): CityBuildingsLayer => withColumn(n, (c) => ({ ...c, pieces: c.pieces.map(change) }));
  const failed = (layer: CityBuildingsLayer): string[] => [...new Set(columnFailures(layer, { mass: base.mass }).map((f) => f.check))];
  const shift = (p: CityPiece, dx: number, dz: number): CityPiece => ({ ...p, placement: { ...p.placement, x_m: p.placement.x_m + dx, z_m: p.placement.z_m + dz } });

  it("the default city's layer passes every check", () => {
    expect(columnFailures(base.buildings, { mass: base.mass })).toEqual([]);
    const w = columnReport(base.buildings, { mass: base.mass }).worst;
    expect(w.m1).toBeLessThan(WALL_JOINT_TOL_M);
    expect(w.m9a).toBeLessThan(STOREY_ALIGN_TOL_M);
    expect(w.g1Over).toBeLessThanOrEqual(OVERLAP_MAX_M);
  });

  it("M1: a three-column building laid at its bounds' pitch (Apartment_02's 5.17 m, 0.17 m too wide a column) fails", () => {
    const b = base.buildings.buildings.find((x) => x.bend === null && x.cells.length === 3)!;
    const cols = base.columns.map((c) => {
      const n = b.cells.findIndex((x) => keyOf(x) === keyOf(c));
      if (n < 1) return c;
      const alongX = b.front === "+z" || b.front === "-z";
      return { ...c, pieces: c.pieces.map((p) => shift(p, alongX ? 0.17 * n : 0, alongX ? 0 : 0.17 * n)) };
    });
    expect(failed({ ...base.buildings, columns: cols })).toContain("M1");
  });

  it("M6: a corner column turned a quarter off the forced turn (the old guess, +x) fails", () => {
    const n = base.columns.findIndex((c) => c.kind === "corner");
    const turned = (c: CityColumn): CityColumn => {
      const yaw = ((c.yaw + 90) % 360) as CityColumn["yaw"];
      return { ...c, yaw, ground: { ...c.ground, yaw }, pieces: c.pieces.map((p) => ({ ...p, placement: { ...p.placement, yaw_deg: yaw } })) };
    };
    expect(failed(withColumn(n, turned))).toContain("M6");
  });

  it("M9a: a roof one cell off fails", () => {
    const n = base.columns.findIndex((c) => c.kind === "mid");
    expect(failed(withPieces(n, (p) => (p.role === "roof" ? shift(p, 5, 0) : p)))).toContain("M9a");
  });

  it("G1: a floor body set 0.05 m back from its open edge fails", () => {
    const n = base.columns.findIndex((c) => c.kind === "mid");
    const c = base.columns[n]!;
    const back = SIDE_VEC[OPPOSITE[c.front]];
    expect(failed(withPieces(n, (p, k) => (k === 0 ? shift(p, 0.05 * back.x, 0.05 * back.z) : p)))).toContain("G1");
  });

  it("R9: a corner floor on a mid column fails", () => {
    const n = base.columns.findIndex((c) => c.kind === "mid");
    const style = BUILDING_STYLES.find((s) => s.id === base.buildings.buildings.find((b) => b.id === base.columns[n]!.building)!.style)!;
    expect(failed(withPieces(n, (p, k) => (k === 0 ? { ...p, placement: { ...p.placement, key: style.floor.corner[0]! } } : p)))).toContain("R9");
  });
});
