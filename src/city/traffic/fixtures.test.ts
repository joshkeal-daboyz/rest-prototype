/**
 * Ticket 070 TR1, criterion 5, and TR1d criterion 3 (the masts, buttons and box on the corner's walk): the failing fixtures. Each is the default city's layer (6 x 6 seed 1, one-way on) with one thing changed; it fails its own check and only it, unless it says otherwise. The positive control is the default layer, which
 * passes. Where a fixture needs a place that passes every other check, the test looks for it among the city's own places (a junction, an approach, a sign, a kerb cut) and stops at the first that does.
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityJunctionTraffic, CityTrafficPiece } from "../../core";
import { poleOf } from "./clear";
import { CELL_M, MAST_INSET_M } from "./constants";
import { MAST, PUSH_BUTTON_KEY, boundsOf } from "./kit";
import { bayStretches } from "./signs";
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
const parking = base.pieces.filter((p) => p.kind === "parkingSign");
const stretches = bayStretches(L.streets, L.edge);
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
    /** The pole of a corner: MAST_INSET_M in from its two kerb edges. */
    const poleAt = (r: { i0: number; i1: number; j0: number; j1: number }, sx: number, sz: number): { x: number; z: number } => ({ x: sx > 0 ? (r.i1 + 1) * 5 + MAST_INSET_M : r.i0 * 5 - MAST_INSET_M, z: sz > 0 ? (r.j1 + 1) * 5 + MAST_INSET_M : r.j0 * 5 - MAST_INSET_M });
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
    // each arm runs along x or z; slide it 20 m further out along its own run (TR1d: the mast stands 2.6 m further back, so 10 m no longer leaves the 15 m carriageway; the mast stays: its clamp no longer holds the arm)
    const run = (a: CityTrafficPiece): readonly [number, number] => {
      const y = a.placement.yaw_deg;
      return y === 0 ? [0, 1] : y === 90 ? [1, 0] : y === 180 ? [0, -1] : [-1, 0];
    };
    const hit = first(arms, (a) => replace(a, shifted(a, run(a)[0] * 20, run(a)[1] * 20)), ["TC2 signals"]);
    expect(hit).toBeDefined();
    const f = failuresOf(replace(hit!.c, shifted(hit!.c, run(hit!.c)[0] * 20, run(hit!.c)[1] * 20)));
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

  it("TC4: a mast whose foot is moved over the kerb edge (its whole group moves with it)", () => {
    const FAR_LEFT: Record<string, readonly [number, number]> = { "-z": [1, 1], "+z": [-1, -1], "-x": [1, -1], "+x": [-1, 1] };
    const cand = masts.map((m) => ({ m, a: base.junctions.flatMap((t) => t.approaches).find((q) => q.id === m.approach)! }));
    // the pole is MAST_INSET_M in from the cell's two kerb edges; all but 0.1 m toward the x kerb leaves 0.1 m, under the foot's half width
    const hit = first(
      cand,
      ({ m, a }) => {
        const dx = -FAR_LEFT[a.arm]![0] * (MAST_INSET_M - 0.1);
        return base.pieces.map((p) => (p.group === m.group && p.host === m.host ? shifted(p, dx, 0) : p));
      },
      ["TC4 place"],
    );
    expect(hit).toBeDefined();
  });

  // ---- TR1d (criterion 3): the corner's walk, and a button for each crossing ----
  const FAR_LEFT_SIGN: Record<string, readonly [number, number]> = { "-z": [1, 1], "+z": [-1, -1], "-x": [1, -1], "+x": [-1, 1] };
  const approachOf = (m: CityTrafficPiece) => base.junctions.flatMap((t) => t.approaches).find((q) => q.id === m.approach)!;
  const groupOf = (m: CityTrafficPiece): CityTrafficPiece[] => base.pieces.filter((p) => p.group === m.group && p.host === m.host);
  const buttonsOf = (m: CityTrafficPiece): CityTrafficPiece[] => groupOf(m).filter((p) => p.kind === "pushButton");
  const crossroadsMasts = masts.filter((m) => buttonsOf(m).length === 2);

  it("TC4 place: a mast moved back to TR1's place, 0.75 m in (its arm, heads and buttons with it), is not on the corner's walk", () => {
    const hit = first(
      masts,
      (m) => {
        const [sx, sz] = FAR_LEFT_SIGN[approachOf(m).arm]!;
        const back = MAST_INSET_M - 0.75;
        return base.pieces.map((p) => (p.group === m.group && p.host === m.host ? shifted(p, -sx * back, -sz * back) : p));
      },
      ["TC4 place"],
    );
    expect(hit).toBeDefined();
    const m = hit!.c;
    const [sx, sz] = FAR_LEFT_SIGN[approachOf(m).arm]!;
    const f = failuresOf(base.pieces.map((p) => (p.group === m.group && p.host === m.host ? shifted(p, -sx * (MAST_INSET_M - 0.75), -sz * (MAST_INSET_M - 0.75)) : p)));
    expect(f.some((x) => /not on the corner's walk/.test(x.reason))).toBe(true);
  });

  it("TC4 place: a signal box moved 1.5 m in toward the kerb is not on the corner's walk", () => {
    const boxes = base.pieces.filter((p) => p.kind === "signalBox");
    const hit = first(
      boxes,
      (b) => {
        const m = masts.find((q) => q.host === b.host && q.cell.i === b.cell.i && q.cell.j === b.cell.j)!;
        const dx = Math.sign(poleOf(m).x - b.placement.x_m) * 1.5;
        return replace(b, shifted(b, dx, 0));
      },
      ["TC4 place"],
    );
    expect(hit).toBeDefined();
    const b = hit!.c;
    const m = masts.find((q) => q.host === b.host && q.cell.i === b.cell.i && q.cell.j === b.cell.j)!;
    const f = failuresOf(replace(b, shifted(b, Math.sign(poleOf(m).x - b.placement.x_m) * 1.5, 0)));
    expect(f.some((x) => /not on the corner's walk/.test(x.reason))).toBe(true);
    expect(CELL_M).toBe(5);
  });

  it("TC2: one button removed from a crossroads mast fails \"has 1 push button for 2 crossings\"", () => {
    expect(crossroadsMasts.length).toBeGreaterThan(20);
    const m = crossroadsMasts[0]!;
    const f = failuresOf(without(buttonsOf(m)[0]!));
    expect(sorted(f.map((x) => x.check))).toEqual(["TC2 signals"]);
    expect(f.some((x) => /has 1 push button for 2 crossings/.test(x.reason))).toBe(true);
  });

  it("TC2: a button turned away from its crossing fails", () => {
    const m = crossroadsMasts[0]!;
    const b = buttonsOf(m)[0]!;
    const f = failuresOf(replace(b, turnedAround(b)));
    expect(sorted(f.map((x) => x.check))).toEqual(["TC2 signals"]);
    expect(f.some((x) => /does not face its crossing/.test(x.reason))).toBe(true);
  });

  it("TC2: a button moved to the face away from every crossing fails", () => {
    const m = crossroadsMasts[0]!;
    const b = buttonsOf(m)[0]!;
    const pole = poleOf(m);
    const off = MAST.radius + boundsOf(PUSH_BUTTON_KEY).d / 2;
    // the button sits on the face toward its crossing, d from the pole; put it on the opposite face, turned to face outward
    const dx = Math.sign(b.placement.x_m - pole.x) * off;
    const dz = Math.sign(b.placement.z_m - pole.z) * off;
    const away: CityTrafficPiece = { ...turnedAround(b), placement: { ...turnedAround(b).placement, x_m: pole.x - dx, z_m: pole.z - dz } };
    const f = failuresOf(replace(b, away));
    expect(sorted(f.map((x) => x.check))).toEqual(["TC2 signals"]);
    expect(f.some((x) => /does not face its crossing/.test(x.reason))).toBe(true);
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

  // ---- TR1b: parking signs (TC3, TC5) ----
  it("TR1b positive control: the default city has parking signs, one a stretch at most, and some stretches without one", () => {
    expect(parking.length).toBeGreaterThan(20);
    expect(parking.length).toBeLessThan(stretches.length);
    expect(new Set(parking.map((p) => p.host)).size).toBe(parking.length);
  });

  it("TC3: a second parking sign on one stretch", () => {
    expect(checksOf([...base.pieces, parking[0]!])).toEqual(["TC3 signs"]);
  });

  it("TC3: a parking sign at its stretch's high end (the sign moved along the stretch, its cell updated)", () => {
    const hit = first(
      parking,
      (p) => {
        const st = stretches.find((q) => q.host === p.host)!;
        const alongX = st.along === "x";
        const lo = (alongX ? st.cells[0]!.i : st.cells[0]!.j) * 5;
        const hi = lo + st.cells.length * 5;
        const d = hi - 1 - (alongX ? p.placement.x_m : p.placement.z_m);
        const x = alongX ? p.placement.x_m + d : p.placement.x_m;
        const z = alongX ? p.placement.z_m : p.placement.z_m + d;
        return replace(p, { ...p, cell: cellOf(x, z), placement: { ...p.placement, x_m: x, z_m: z } });
      },
      ["TC3 signs"],
    );
    expect(hit).toBeDefined();
  });

  it("TC3: a stretch with no parking sign where nothing refuses one", () => {
    expect(checksOf(without(parking[0]!))).toEqual(["TC3 signs"]);
  });

  it("TC3: a parking sign turned away from the walk", () => {
    expect(checksOf(replace(parking[0]!, turnedAround(parking[0]!)))).toEqual(["TC3 signs"]);
  });

  it("TC5: a parking sign moved onto a stage 8 meter (it fails TC3 for leaving its place, and TC5 for the meter)", () => {
    const meters = L.ground.props.filter((p) => p.kind === "meter");
    expect(meters.length).toBeGreaterThan(0);
    const hit = first(
      meters.flatMap((m) => parking.map((p) => ({ m, p }))).filter(({ m, p }) => Math.hypot(m.placement.x_m - p.placement.x_m, m.placement.z_m - p.placement.z_m) < 12),
      ({ m, p }) => replace(p, { ...p, cell: cellOf(m.placement.x_m, m.placement.z_m), placement: { ...p.placement, x_m: m.placement.x_m, z_m: m.placement.z_m } }),
      ["TC3 signs", "TC5 clear"],
    );
    expect(hit).toBeDefined();
  });

  it("TC5: a stage 8 meter put at a parking sign", () => {
    const p = parking[0]!;
    const meter = L.ground.props.find((q) => q.kind === "meter")!;
    const onSign = { ...meter, placement: { ...meter.placement, x_m: p.placement.x_m, z_m: p.placement.z_m }, size: { ...meter.size } };
    const inp: TrafficInput = { ...input, ground: { props: [...L.ground.props, onSign] } };
    expect(checksOf(base.pieces, inp)).toEqual(["TC5 clear"]);
  });

  // ---- keys ----
  it("keys: a stop sign given SM_Prop_LightPole_Base_01, which is allowed for signalMast only", () => {
    const s = signs[0]!;
    expect(checksOf(replace(s, { ...s, placement: { ...s.placement, key: "city-pack:SM_Prop_LightPole_Base_01" } }))).toEqual(["keys"]);
  });

  it("keys: a parking sign given the stop sign's key", () => {
    const p = parking[0]!;
    expect(checksOf(replace(p, { ...p, placement: { ...p.placement, key: "city-pack:SM_Prop_Sign_Stop_01" } }))).toEqual(["keys"]);
  });

  it("keys: an arm given SM_Prop_LightPole_Lights_01, which is not allowed at all", () => {
    const a = arms[0]!;
    expect(checksOf(replace(a, { ...a, placement: { ...a.placement, key: "city-pack:SM_Prop_LightPole_Lights_01" } }))).toEqual(["keys"]);
  });
});
