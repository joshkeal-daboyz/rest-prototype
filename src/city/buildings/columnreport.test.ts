/**
 * Stage 5, section F2, criterion 6's report (HEAVY: its own file, a 120 s timeout). For each of the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) it prints the columns by kind, the pieces by role, the pieces in
 * all (G's draw-call estimate), the Ls' columns, and the worst M1, G1 and M9a numbers; for each roof key its body's overhang past the cell on each side and its bounds' (the cornice's) overhang; and, for Josh's three open
 * questions, the counts (U1: a blind column's windowed front above a lower roof; U2: roof sides whose cornice stands more than 0.6 m past the cell; U3: a roof's base course stepping between a corner column and the next
 * on the row's face). Nothing about the three is a check. For the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) it prints whether stage 5 is ok, and its failure if not: reported, never asserted.
 *
 * The named runs must be ok (R-2). Stages 1 to 3 and 5 are run (stage 5 reads no edge layer).
 */
import { describe, expect, it } from "vitest";
import type { CityBuildingsLayer, CityMassLayer, CityPlanRun, CitySide } from "../../core";
import { landStage } from "../land/stage";
import { massStage } from "../mass/stage";
import type { CityStageDef } from "../pipeline/types";
import { runCity } from "../stages";
import { sharedCity } from "../testing/namedcities";
import { streetsStage, streetsStageWith } from "../streets/stage";
import { columnReport } from "./columncheck";
import { OVERLAP_MAX_M } from "./constants";
import { KIT } from "./kit";
import { boundsBoxOf, bodyBoxOf, cellBox, planeOf } from "./place";
import { keyOf, OPPOSITE } from "./rows";
import { buildingsStage } from "./stage";

interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}
const NAMED: City[] = [];
for (const way of ["on", "off"] as const) for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 6, blocksZ: 6, seed, way });
const OUTSIDE: City[] = [];
for (const [blocksX, blocksZ] of [
  [3, 3],
  [6, 4],
] as const)
  for (const way of ["off", "on"] as const) for (let seed = 1; seed <= 20; seed++) OUTSIDE.push({ blocksX, blocksZ, seed, way });
const label = (o: City): string => `${o.blocksX}x${o.blocksZ} s${o.seed} ${o.way}`;
const SIDES: readonly CitySide[] = ["+x", "-x", "+z", "-z"];

const stagesOf = (way: "on" | "off"): CityStageDef[] => [(way === "on" ? streetsStage : streetsStageWith(0)) as unknown as CityStageDef, landStage as unknown as CityStageDef, massStage as unknown as CityStageDef, buildingsStage as unknown as CityStageDef];
const runOf = (o: City): CityPlanRun => (o.blocksX === 6 && o.blocksZ === 6 ? sharedCity(o, "buildings") : runCity({ blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed }, "buildings", stagesOf(o.way)));

const mm = (n: number): string => n.toFixed(4);

interface Row {
  text: string;
  ok: boolean;
  worst: { m1: number; g1Recess: number; g1Over: number; m9a: number };
  u1: [number, number, number];
  u2: number;
  u3: [number, number];
  pieces: number;
  roofReach: Map<string, { front: number; back: number; flank: number; cornice: number }>;
}

function measure(o: City): Row {
  const r = runOf(o);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  const mass: CityMassLayer = r.plan.layers.mass!;
  const layer: CityBuildingsLayer = r.plan.layers.buildings!;
  const cols = layer.columns!;
  const rep = columnReport(layer, { mass });
  const byKind = { mid: 0, corner: 0, blind: 0 };
  const byRole = { floor: 0, floor3: 0, roof: 0 };
  for (const c of cols) {
    byKind[c.kind]++;
    for (const p of c.pieces) byRole[p.role]++;
  }
  const pieces = byRole.floor + byRole.floor3 + byRole.roof;
  const buildingOf = new Map(layer.buildings.map((b) => [b.id, b] as const));
  const colOf = new Map(cols.map((c) => [keyOf(c), c] as const));
  const storeysAt = (i: number, j: number): number | null => {
    const c = colOf.get(`${i},${j}`);
    return c ? buildingOf.get(c.building)!.storeys : null;
  };
  const ls = layer.buildings.filter((b) => b.bend !== null);
  const lCols = ls.reduce((n, b) => n + b.cells.length, 0);
  // U1: a blind column whose front is across a lower built neighbour.
  const u1: [number, number, number] = [0, 0, 0];
  const vec: Record<CitySide, [number, number]> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };
  for (const c of cols) {
    if (c.kind !== "blind") continue;
    u1[0]++;
    const s = buildingOf.get(c.building)!.storeys;
    const n = storeysAt(c.i + vec[c.front][0], c.j + vec[c.front][1]);
    if (n !== null && n < s) u1[n === s - 1 ? 1 : 2]++;
  }
  // U2: roof sides whose bounds stand more than 0.6 m past the cell; and per key the body's and bounds' reach.
  let u2 = 0;
  const roofReach = new Map<string, { front: number; back: number; flank: number; cornice: number }>();
  for (const c of cols) {
    const roof = c.pieces[c.pieces.length - 1]!;
    const edges = cellBox(c);
    const bounds = boundsBoxOf(roof.placement);
    const body = bodyBoxOf(roof.placement);
    for (const s of SIDES) {
      const out = (planeOf(bounds, s) - planeOf(edges, s)) * (s === "+x" || s === "+z" ? 1 : -1);
      if (out > OVERLAP_MAX_M) u2++;
    }
    const past = (b: typeof body, s: CitySide): number => (planeOf(b, s) - planeOf(edges, s)) * (s === "+x" || s === "+z" ? 1 : -1);
    const cur = roofReach.get(roof.placement.key) ?? { front: -9, back: -9, flank: -9, cornice: -9 };
    cur.front = Math.max(cur.front, past(body, c.front));
    cur.back = Math.max(cur.back, past(body, OPPOSITE[c.front]));
    cur.flank = Math.max(cur.flank, ...(c.side === null ? [past(body, c.front === "+z" || c.front === "-z" ? "-x" : "-z"), past(body, c.front === "+z" || c.front === "-z" ? "+x" : "+z")] : [past(body, OPPOSITE[c.side])]));
    cur.cornice = Math.max(cur.cornice, past(bounds, c.front));
    roofReach.set(roof.placement.key, cur);
  }
  // U3: consecutive columns of one building, one of them a corner, whose roof bodies' planes on the building's front differ.
  const u3: [number, number] = [0, 0];
  for (const b of layer.buildings) {
    for (let n = 1; n < b.cells.length; n++) {
      const a = colOf.get(keyOf(b.cells[n - 1]!))!;
      const c = colOf.get(keyOf(b.cells[n]!))!;
      if (a.kind !== "corner" && c.kind !== "corner") continue;
      const pa = planeOf(bodyBoxOf(a.pieces[a.pieces.length - 1]!.placement), b.front);
      const pc = planeOf(bodyBoxOf(c.pieces[c.pieces.length - 1]!.placement), b.front);
      if (Math.abs(pa - pc) > 0.005) u3[a.kind === "corner" && c.kind === "corner" ? 1 : 0]++;
    }
  }
  return {
    text: `columns ${cols.length} (mid ${byKind.mid}, corner ${byKind.corner}, blind ${byKind.blind}) pieces ${pieces} (floor ${byRole.floor}, floor3 ${byRole.floor3}, roof ${byRole.roof}) Ls ${ls.length}/${lCols} cols  M1 ${mm(rep.worst.m1)} G1 recess ${mm(rep.worst.g1Recess)} over ${mm(rep.worst.g1Over)} M9a ${mm(rep.worst.m9a)} fails ${rep.failures.length}`,
    ok: rep.failures.length === 0,
    worst: rep.worst,
    u1,
    u2,
    u3,
    pieces,
    roofReach,
  };
}

describe("criterion 6's report: stage 5 columns on the named runs and the outside cities", { timeout: 120_000 }, () => {
  it("prints the table; the 20 named runs are ok", () => {
    const lines: string[] = [];
    const worst = { m1: 0, g1Recess: -Infinity, g1Over: -Infinity, m9a: 0 };
    const u1: [number, number, number] = [0, 0, 0];
    let u2 = 0;
    const u3: [number, number] = [0, 0];
    const reach = new Map<string, { front: number; back: number; flank: number; cornice: number }>();
    for (const o of NAMED) {
      const row = measure(o);
      lines.push(`${label(o).padEnd(14)} ${row.text}`);
      expect(row.ok, label(o)).toBe(true);
      worst.m1 = Math.max(worst.m1, row.worst.m1);
      worst.g1Recess = Math.max(worst.g1Recess, row.worst.g1Recess);
      worst.g1Over = Math.max(worst.g1Over, row.worst.g1Over);
      worst.m9a = Math.max(worst.m9a, row.worst.m9a);
      for (let n = 0; n < 3; n++) u1[n]! += row.u1[n]!;
      u2 += row.u2;
      u3[0] += row.u3[0];
      u3[1] += row.u3[1];
      for (const [k, v] of row.roofReach) {
        const cur = reach.get(k) ?? { front: -9, back: -9, flank: -9, cornice: -9 };
        reach.set(k, { front: Math.max(cur.front, v.front), back: Math.max(cur.back, v.back), flank: Math.max(cur.flank, v.flank), cornice: Math.max(cur.cornice, v.cornice) });
      }
    }
    const keys = KIT.filter((e) => e.role === "roof").map((e) => `${e.key.slice(18)}: body past the cell front ${mm(reach.get(e.key)?.front ?? NaN)} back ${mm(reach.get(e.key)?.back ?? NaN)} flank ${mm(reach.get(e.key)?.flank ?? NaN)}, cornice front ${mm(reach.get(e.key)?.cornice ?? NaN)}`);
    console.log(
      `F2 REPORT, named\n${lines.join("\n")}\nWORST over 20 runs: M1 ${mm(worst.m1)} G1 recess ${mm(worst.g1Recess)} over ${mm(worst.g1Over)} M9a ${mm(worst.m9a)}\nOPEN QUESTIONS (reported, not checks): U1 blind fronts above a lower roof ${u1[1]! + u1[2]!} (by one ${u1[1]}, by two ${u1[2]}) of ${u1[0]} blind; U2 roof sides with the cornice past 0.6 m ${u2}; U3 roof-base steps corner-to-mid ${u3[0]}, corner-to-corner ${u3[1]}\nROOF REACH\n${keys.join("\n")}`,
    );
  });

  it("prints the outside cities' counts, reported and not asserted", () => {
    const lines: string[] = [];
    const tally: Record<string, { ok: number; fail: number; noMass: number }> = {};
    for (const o of OUTSIDE) {
      const key = `${o.blocksX}x${o.blocksZ} ${o.way}`;
      const t = (tally[key] ??= { ok: 0, fail: 0, noMass: 0 });
      const r = runOf(o);
      if (r.ok) t.ok++;
      else if (r.failure.stage === "buildings") {
        t.fail++;
        lines.push(`${label(o)}: buildings failed: ${r.failure.reason.slice(0, 140)}`);
      } else t.noMass++;
    }
    console.log(`F2 REPORT, outside\n${Object.entries(tally).map(([k, v]) => `${k}: stage 5 ok ${v.ok}, failed ${v.fail}, never reached ${v.noMass}`).join("\n")}\n${lines.join("\n")}`);
  });
});
