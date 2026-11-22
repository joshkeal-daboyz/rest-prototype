/**
 * Ticket 070 TR1, criterion 5: the failing fixtures. Each is the default city's layer (6 x 6 seed 1, one-way on) with one thing changed; it fails its own check and only it, unless it says otherwise. The positive control is the default layer, which
 * passes. Where a fixture needs a place that passes every other check, the test looks for it among the city's own places (a junction, an approach, a sign, a kerb cut) and stops at the first that does.
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityJunctionTraffic, CityTrafficPiece } from "../../core";
import { poleOf } from "./clear";
import { trafficFailures, type TrafficInput } from "./trafficcheck";
import { DEFAULT, inputOf, layersOf } from "./testcities";

const L = layersOf(DEFAULT);
const base = L.traffic;
const input = inputOf(L);
const sorted = (xs: readonly string[]): string[] => [...new Set(xs)].sort();

const failuresOf = (pieces: readonly CityTrafficPiece[], inp: TrafficInput = input, junctions: readonly CityJunctionTraffic[] = base.junctions) => trafficFailures({ stage: "traffic", junctions, pieces }, inp);
const checksOf = (pieces: readonly CityTrafficPiece[], inp: TrafficInput = input, junctions: readonly CityJunctionTraffic[] = base.junctions): string[] => sorted(failuresOf(pieces, inp, junctions).map((f) => f.check));
const replace = (old: CityTrafficPiece, next: CityTrafficPiece): CityTrafficPiece[] => base.pieces.map((p) => (p === old ? next : p));
const without = (old: CityTrafficPiece): CityTrafficPiece[] => base.pieces.filter((p) => p !== old);
const shifted = (p: CityTrafficPiece, dx: number, dz: number, dy = 0): CityTrafficPiece => ({
  ...p,
  placement: { ...p.placement, x_m: p.placement.x_m + dx, y_m: p.placement.y_m + dy, z_m: p.placement.z_m + dz },
});
const turnedAround = (p: CityTrafficPiece): CityTrafficPiece => ({ ...p, placement: { ...p.placement, yaw_deg: (p.placement.yaw_deg + 180) % 360 } });
const cellOf = (x: number, z: number): { i: number; j: number } => ({ i: Math.floor(x / 5), j: Math.floor(z / 5) });

const signs = base.pieces.filter((p) => p.kind === "stopSign");
const masts = base.pieces.filter((p) => p.kind === "signalMast");
const arms = base.pieces.filter((p) => p.kind === "signalArm");
const signalJunctions = base.junctions.filter((t) => t.control === "signals");

/** The first candidate whose pieces give exactly the wanted checks. */
function first<T>(candidates: readonly T[], build: (c: T) => readonly CityTrafficPiece[], want: readonly string[], inp: TrafficInput = input): { c: T; checks: string[] } | undefined {
  for (const c of candidates) {
    const checks = checksOf(build(c), inp);
    if (checks.join() === sorted(want).join()) return { c, checks };
  }
  return undefined;
}

describe("the failing fixtures (criterion 5)", { timeout: 120_000 }, () => {
  it("positive control: the default layer passes every check", () => {
    expect(failuresOf(base.pieces)).toEqual([]);
    expect(masts.length).toBeGreaterThan(20);
    expect(signs.length).toBeGreaterThan(40);
  });

  // ---- TC1 ----
  it("TC1: a signal crossroads relabelled allStop fails TC1 only", () => {
    const t = signalJunctions[0]!;
    const junctions = base.junctions.map((q) => (q === t ? { ...q, control: "allStop" as const, approaches: q.approaches.map((a) => ({ ...a, control: "stop" as const })) } : q));
    expect(checksOf(base.pieces, input, junctions)).toEqual(["TC1 control"]);
  });

  it("TC1: a T's through arm relabelled stop fails TC1 only", () => {
    const t = base.junctions.find((q) => q.control === "stop" && L.streets.junctions.find((j) => j.id === q.junction)!.kind === "T")!;
    const through = t.approaches.find((a) => a.control === "none" && a.inbound)!;
    const junctions = base.junctions.map((q) => (q === t ? { ...q, approaches: q.approaches.map((a) => (a === through ? { ...a, control: "stop" as const } : a)) } : q));
    expect(checksOf(base.pieces, input, junctions)).toEqual(["TC1 control"]);
  });

  // ---- TC2 ----
  it("TC2: an arm removed", () => {
    expect(checksOf(without(arms[0]!))).toEqual(["TC2 signals"]);
  });

  it("TC2: an arm turned away from its approach", () => {
    const hit = first(arms, (a) => replace(a, turnedAround(a)), ["TC2 signals"]);
    expect(hit).toBeDefined();
  });

  it("TC2: a mast and its arm moved to the approach's far-right corner", () => {
    const cand = masts.flatMap((m) => {
      const arm = arms.find((a) => a.group === m.group)!;
      const a = base.junctions.flatMap((t) => t.approaches).find((q) => q.id === m.approach)!;
      const j = L.streets.junctions.find((q) => q.id === m.host)!;
      return [{ m, arm, a, j }];
    });
    // far-left corner sign by arm side; far-right is the other sign on the axis the arm runs along
    const FAR_LEFT: Record<string, readonly [number, number]> = { "-z": [1, 1], "+z": [-1, -1], "-x": [1, -1], "+x": [-1, 1] };
    const FAR_RIGHT: Record<string, readonly [number, number]> = { "-z": [-1, 1], "+z": [1, -1], "-x": [1, 1], "+x": [-1, -1] };
    const bounds = (j: { cells: readonly { i: number; j: number }[] }): { i0: number; i1: number; j0: number; j1: number } => ({ i0: Math.min(...j.cells.map((c) => c.i)), i1: Math.max(...j.cells.map((c) => c.i)), j0: Math.min(...j.cells.map((c) => c.j)), j1: Math.max(...j.cells.map((c) => c.j)) });
    /** The pole of a corner: 0.75 m in from its two kerb edges. */
    const poleAt = (r: { i0: number; i1: number; j0: number; j1: number }, sx: number, sz: number): { x: number; z: number } => ({ x: sx > 0 ? (r.i1 + 1) * 5 + 0.75 : r.i0 * 5 - 0.75, z: sz > 0 ? (r.j1 + 1) * 5 + 0.75 : r.j0 * 5 - 0.75 });
    const hit = first(
      cand,
      ({ m, arm, a, j }) => {
        const r = bounds(j);
        const from = poleAt(r, FAR_LEFT[a.arm]![0], FAR_LEFT[a.arm]![1]);
        const to = poleAt(r, FAR_RIGHT[a.arm]![0], FAR_RIGHT[a.arm]![1]);
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const m2 = { ...shifted(m, dx, dz), cell: cellOf(to.x, to.z) };
        return base.pieces.map((p) => (p === m ? m2 : p === arm ? shifted(arm, dx, dz) : p));
      },
      ["TC2 signals"],
    );
    expect(hit).toBeDefined();
  });

  it("TC2: an arm moved so its free end lies over a pavement", () => {
    // each arm runs along x or z; slide it 10 m further out along its own run (the mast stays: its clamp no longer holds the arm)
    const run = (a: CityTrafficPiece): readonly [number, number] => {
      const y = a.placement.yaw_deg;
      return y === 0 ? [0, 1] : y === 90 ? [1, 0] : y === 180 ? [0, -1] : [-1, 0];
    };
    const hit = first(arms, (a) => replace(a, shifted(a, run(a)[0] * 10, run(a)[1] * 10)), ["TC2 signals"]);
    expect(hit).toBeDefined();
    const f = failuresOf(replace(hit!.c, shifted(hit!.c, run(hit!.c)[0] * 10, run(hit!.c)[1] * 10)));
    expect(f.some((x) => /past its carriageway/.test(x.reason))).toBe(true);
  });

  it("TC2: a walk head removed", () => {
    const head = base.pieces.find((p) => p.kind === "walkHead")!;
    expect(checksOf(without(head))).toEqual(["TC2 signals"]);
  });

  // ---- TC3 ----
  it("TC3: a stop sign moved to the left kerb", () => {
    const hit = first(
      signs,
      (s) => {
        const st = L.streets.streets.find((q) => q.id === s.street)!;
        const alongZ = s.placement.yaw_deg === 0 || s.placement.yaw_deg === 180;
        const x = alongZ ? 2 * st.centre_m - s.placement.x_m : s.placement.x_m;
        const z = alongZ ? s.placement.z_m : 2 * st.centre_m - s.placement.z_m;
        return replace(s, { ...s, cell: cellOf(x, z), placement: { ...s.placement, x_m: x, z_m: z } });
      },
      ["TC3 signs"],
    );
    expect(hit).toBeDefined();
  });

  it("TC3: a second stop sign on one approach", () => {
    expect(checksOf([...base.pieces, signs[0]!])).toEqual(["TC3 signs"]);
  });

  it("TC3: a stop sign on an arm with no inbound traffic", () => {
    const t = base.junctions.find((q) => q.approaches.some((a) => !a.inbound))!;
    const a = t.approaches.find((q) => !q.inbound)!;
    const stray = { ...signs[0]!, host: t.junction, approach: a.id };
    expect(checksOf([...base.pieces, stray])).toEqual(["TC3 signs"]);
  });

  it("TC3: a stop sign turned away from its traffic", () => {
    expect(checksOf(replace(signs[0]!, turnedAround(signs[0]!)))).toEqual(["TC3 signs"]);
  });

  // ---- TC4 ----
  it("TC4: a sign moved onto the carriageway", () => {
    const hit = first(
      signs,
      (s) => {
        const st = L.streets.streets.find((q) => q.id === s.street)!;
        const alongZ = s.placement.yaw_deg === 0 || s.placement.yaw_deg === 180;
        const across = alongZ ? s.placement.x_m : s.placement.z_m;
        const dir = Math.sign(st.centre_m - across);
        return replace(s, alongZ ? shifted(s, dir * 1.5, 0) : shifted(s, 0, dir * 1.5));
      },
      ["TC4 place"],
    );
    expect(hit).toBeDefined();
  });

  it("TC4: a sign moved onto a kerbCut cell", () => {
    const s = signs[0]!;
    const hit = first(
      L.edge.kerbCuts,
      (k) => replace(s, { ...s, placement: { ...s.placement, x_m: (k.cell.i + 0.5) * 5, z_m: (k.cell.j + 0.5) * 5 } }),
      ["TC4 place"],
    );
    expect(hit).toBeDefined();
    const k = hit!.c;
    const f = failuresOf(replace(s, { ...s, placement: { ...s.placement, x_m: (k.cell.i + 0.5) * 5, z_m: (k.cell.j + 0.5) * 5 } }));
    expect(f.some((x) => /kerbCut/.test(x.reason))).toBe(true);
  });

  it("TC4: a mast whose foot is moved over the kerb edge (its arm moves with it)", () => {
    const FAR_LEFT: Record<string, readonly [number, number]> = { "-z": [1, 1], "+z": [-1, -1], "-x": [1, -1], "+x": [-1, 1] };
    const cand = masts.map((m) => ({ m, arm: arms.find((a) => a.group === m.group)!, a: base.junctions.flatMap((t) => t.approaches).find((q) => q.id === m.approach)! }));
    // the pole is 0.75 m in from the cell's two kerb edges; 0.6 m toward the x kerb leaves 0.15 m, under the foot's half width
    const hit = first(
      cand,
      ({ m, arm, a }) => {
        const dx = -FAR_LEFT[a.arm]![0] * 0.6;
        return base.pieces.map((p) => (p === m || p === arm ? shifted(p, dx, 0) : p));
      },
      ["TC4 place"],
    );
    expect(hit).toBeDefined();
  });

  // ---- TC5 ----
  it("TC5: a sign on a stage 8 bench", () => {
    const s = signs[0]!;
    const bench = L.ground.props.find((p) => p.kind === "bench")!;
    const onSign = { ...bench, placement: { ...bench.placement, x_m: s.placement.x_m, z_m: s.placement.z_m }, size: { ...bench.size } };
    const inp: TrafficInput = { ...input, ground: { props: [...L.ground.props, onSign] } };
    expect(checksOf(base.pieces, inp)).toEqual(["TC5 clear"]);
  });

  it("TC5: a sign under an awning", () => {
    const s = signs[0]!;
    const awning = { kind: "awning" as const, building: "b", cell: s.cell, face: "+z" as const, wrap: false, placement: { key: "city-pack:SM_Bld_Shop_Cover_02" as CalibrationKey, x_m: s.placement.x_m, y_m: 1.5, z_m: s.placement.z_m, yaw_deg: 0 } };
    const inp: TrafficInput = { ...input, facades: { ...L.facades, dressing: [...(L.facades.dressing ?? []), awning] } };
    const f = failuresOf(base.pieces, inp);
    expect(sorted(f.map((x) => x.check))).toEqual(["TC5 clear"]);
    expect(f.some((x) => /stage 7/.test(x.reason))).toBe(true);
  });

  it("TC5: a keep point added at a mast", () => {
    const m = masts[0]!;
    const c = poleOf(m);
    const inp: TrafficInput = { ...input, keepPoints: [{ x_m: c.x, z_m: c.z }] };
    const f = failuresOf(base.pieces, inp);
    expect(sorted(f.map((x) => x.check))).toEqual(["TC5 clear"]);
    expect(f.some((x) => /stage 6 point/.test(x.reason))).toBe(true);
  });

  it("TC5: a build-out tree beside a sign", () => {
    const s = signs[0]!;
    const inp: TrafficInput = { ...input, edge: { ...L.edge, buildoutTrees: [...L.edge.buildoutTrees, { cell: s.cell, x_m: s.placement.x_m, z_m: s.placement.z_m, street: s.street ?? "x" }] } };
    expect(checksOf(base.pieces, inp)).toEqual(["TC5 clear"]);
  });

  // ---- keys ----
  it("keys: a stop sign given SM_Prop_LightPole_Base_01, which is allowed for signalMast only", () => {
    const s = signs[0]!;
    expect(checksOf(replace(s, { ...s, placement: { ...s.placement, key: "city-pack:SM_Prop_LightPole_Base_01" } }))).toEqual(["keys"]);
  });

  it("keys: an arm given SM_Prop_LightPole_Lights_01, which is not allowed at all", () => {
    const a = arms[0]!;
    expect(checksOf(replace(a, { ...a, placement: { ...a.placement, key: "city-pack:SM_Prop_LightPole_Lights_01" } }))).toEqual(["keys"]);
  });
});
