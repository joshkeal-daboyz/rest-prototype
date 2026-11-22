/**
 * Ticket 070 TR1, criterion 3: the signals on the 20 named runs, derived here from the streets and edge layers and the kit's typed numbers, independently of `signals.ts`; and one hand-worked mast and arm.
 * HEAVY: each city is built once (stages 1 to 9), through a module-level cache.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { CityCell, CitySide, CityTrafficPiece } from "../../core";
import { poleOf } from "./clear";
import { MAST_INSET_M, SIGNAL_HEAD_MIN_M } from "./constants";
import { ARM, ARM_BASE_Y, HEAD_LOW_Y, MAST } from "./kit";
import { NAMED, label, layersOf, DEFAULT, warm } from "./testcities";

/** The far-left corner of an approach by the side its arm leaves by: the sign of the corner's offset from the junction in x and z (traffic keeps right; an arm on "-z" carries traffic heading +z, its left is +x). */
const FAR_LEFT: Readonly<Record<CitySide, readonly [1 | -1, 1 | -1]>> = { "-z": [1, 1], "+z": [-1, -1], "-x": [1, -1], "+x": [-1, 1] };
/** Where an arm leaves its mast, a unit vector in plan (the driver's right), and the way its lenses face (toward the arm's own side). */
const ARM_RUN: Readonly<Record<CitySide, readonly [number, number]>> = { "-z": [-1, 0], "+z": [1, 0], "-x": [0, 1], "+x": [0, -1] };
const SIDE_VEC: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };
const YAW: Readonly<Record<CitySide, number>> = { "+z": 0, "+x": 90, "-z": 180, "-x": 270 };
const SIGNAL_KINDS = ["signalMast", "signalArm", "walkHead", "pushButton", "signalBox"];

const rectOfJunction = (cells: readonly CityCell[]): { i0: number; i1: number; j0: number; j1: number } => ({
  i0: Math.min(...cells.map((c) => c.i)),
  i1: Math.max(...cells.map((c) => c.i)),
  j0: Math.min(...cells.map((c) => c.j)),
  j1: Math.max(...cells.map((c) => c.j)),
});
/** A world turn of a local vector by a quarter yaw (three.js: x' = x cos + z sin, z' = -x sin + z cos). */
const turn = (yaw: number, x: number, z: number): [number, number] => {
  const q = ((yaw / 90) % 4 + 4) % 4;
  const v = q === 0 ? [x, z] : q === 1 ? [z, -x] : q === 2 ? [-x, -z] : [-z, x];
  return [v[0]! + 0, v[1]! + 0];
};

describe("signals on the named runs (criterion 3)", { timeout: 120_000 }, () => {
  beforeAll(() => warm(NAMED), 120_000);
  it("every signal junction has one mast group per pavementCorner, each on its approach's far-left corner, the arm crossing its approach over the carriageway with its heads facing it", () => {
    const bad: string[] = [];
    let groups = 0;
    for (const o of NAMED) {
      const { streets, edge, traffic } = layersOf(o);
      const role = new Map<string, string>(edge.cells.map((c) => [`${c.i},${c.j}`, c.role]));
      for (const t of traffic.junctions) {
        if (t.control !== "signals") continue;
        const j = streets.junctions.find((q) => q.id === t.junction)!;
        const r = rectOfJunction(j.cells);
        const mine = traffic.pieces.filter((p) => p.host === j.id);
        const masts = mine.filter((p) => p.kind === "signalMast");
        const corners = new Set<string>();
        if (masts.length !== 4) bad.push(`${label(o)}: ${j.id} has ${masts.length} masts`);
        for (const a of t.approaches) {
          const mast = masts.find((p) => p.approach === a.id);
          const arm = mine.find((p) => p.kind === "signalArm" && p.approach === a.id);
          if (!mast || !arm) {
            bad.push(`${label(o)}: ${a.id} lacks a mast or an arm`);
            continue;
          }
          groups++;
          const [sx, sz] = FAR_LEFT[a.arm];
          const cell = { i: sx > 0 ? r.i1 + 1 : r.i0 - 1, j: sz > 0 ? r.j1 + 1 : r.j0 - 1 };
          corners.add(`${cell.i},${cell.j}`);
          if (role.get(`${cell.i},${cell.j}`) !== "pavementCorner") bad.push(`${label(o)}: ${a.id}'s far-left corner is not a pavementCorner`);
          if (mast.cell.i !== cell.i || mast.cell.j !== cell.j) bad.push(`${label(o)}: ${a.id}'s mast is on (${mast.cell.i}, ${mast.cell.j}), not its far-left corner`);
          if (arm.group !== mast.group) bad.push(`${label(o)}: ${a.id}'s arm is in another group`);
          // the pole stands MAST_INSET_M in from both kerb edges of its corner cell
          const pole = poleOf(mast);
          const kx = sx > 0 ? (r.i1 + 1) * 5 : r.i0 * 5;
          const kz = sz > 0 ? (r.j1 + 1) * 5 : r.j0 * 5;
          if (Math.abs(pole.x - (kx + sx * MAST_INSET_M)) > 1e-6 || Math.abs(pole.z - (kz + sz * MAST_INSET_M)) > 1e-6) bad.push(`${label(o)}: ${a.id}'s pole is not ${MAST_INSET_M} m in from the kerb corner`);
          // heads toward the traffic
          const lens = turn(arm.placement.yaw_deg, -1, 0);
          if (lens[0] !== SIDE_VEC[a.arm][0] || lens[1] !== SIDE_VEC[a.arm][1]) bad.push(`${label(o)}: ${a.id}'s heads face ${lens.join(",")}`);
          // the arm runs to the driver's right across the carriageway
          const run = turn(arm.placement.yaw_deg, 0, 1);
          if (run[0] !== ARM_RUN[a.arm][0] || run[1] !== ARM_RUN[a.arm][1]) bad.push(`${label(o)}: ${a.id}'s arm runs ${run.join(",")}`);
          const st = streets.streets.find((s) => s.id === a.street)!;
          const alongX = ARM_RUN[a.arm][0] !== 0;
          const clamp = alongX ? pole.x : pole.z;
          const end = clamp + (alongX ? ARM_RUN[a.arm][0] : ARM_RUN[a.arm][1]) * ARM.reach;
          if (end < st.carriage.lo_m - 1e-6 || end > st.carriage.hi_m + 1e-6) bad.push(`${label(o)}: ${a.id}'s arm ends at ${end.toFixed(2)}, past the far kerb (${st.carriage.lo_m} to ${st.carriage.hi_m})`);
          // no head is lower than SIGNAL_HEAD_MIN_M
          if (arm.placement.y_m + ARM.headLowY < SIGNAL_HEAD_MIN_M) bad.push(`${label(o)}: ${a.id}'s head is at ${arm.placement.y_m + ARM.headLowY}`);
        }
        if (corners.size !== 4) bad.push(`${label(o)}: ${j.id}'s masts stand on ${corners.size} corners`);
      }
    }
    expect(bad).toEqual([]);
    expect(groups).toBe(884);
  });

  it("each crossing has a walk head at both ends facing along it, each mast has one button, each junction one box", () => {
    const bad: string[] = [];
    let heads = 0;
    let boxes = 0;
    for (const o of NAMED) {
      const { edge, traffic } = layersOf(o);
      const role = new Map<string, string>(edge.cells.map((c) => [`${c.i},${c.j}`, c.role]));
      for (const t of traffic.junctions) {
        if (t.control !== "signals") continue;
        const mine = traffic.pieces.filter((p) => p.host === t.junction);
        const walk = mine.filter((p) => p.kind === "walkHead");
        heads += walk.length;
        // a head is at a corner cell, facing along a crossing that starts there: the cell it faces is a crossing cell
        const ends = new Set<string>();
        for (const w of walk) {
          const d = turn(w.placement.yaw_deg, 0, 1);
          const next = `${w.cell.i + d[0]},${w.cell.j + d[1]}`;
          if (role.get(next) !== "crossing") bad.push(`${label(o)}: a walk head at (${w.cell.i}, ${w.cell.j}) faces ${d.join(",")}, not a crossing`);
          ends.add(`${w.cell.i},${w.cell.j}>${d.join(",")}`);
        }
        // the crossing is 3 cells long: its far landing is 4 cells on, and a head there faces back
        for (const w of walk) {
          const d = turn(w.placement.yaw_deg, 0, 1);
          const back = `${w.cell.i + 4 * d[0]},${w.cell.j + 4 * d[1]}>${-d[0] || 0},${-d[1] || 0}`;
          if (!ends.has(back)) bad.push(`${label(o)}: the crossing from (${w.cell.i}, ${w.cell.j}) has no walk head at its far end (${back})`);
        }
        if (walk.length !== 8) bad.push(`${label(o)}: ${t.junction} has ${walk.length} walk heads`);
        const groups = new Set(mine.filter((p) => p.kind === "signalMast").map((p) => p.group));
        for (const g of groups) {
          const b = mine.filter((p) => p.group === g && p.kind === "pushButton").length;
          if (b !== 1) bad.push(`${label(o)}: group ${g} has ${b} buttons`);
        }
        const box = mine.filter((p) => p.kind === "signalBox");
        boxes += box.length;
        if (box.length !== 1) bad.push(`${label(o)}: ${t.junction} has ${box.length} boxes`);
        else if (groups.has(box[0]!.group)) bad.push(`${label(o)}: ${t.junction}'s box shares a mast's group`);
      }
    }
    expect(bad).toEqual([]);
    expect(heads).toBe(884 * 2);
    expect(boxes).toBe(221);
  });

  it("no head is below SIGNAL_HEAD_MIN_M and no arm's free end reaches past the far kerb", () => {
    expect(HEAD_LOW_Y).toBeCloseTo(4.8192, 3);
    expect(HEAD_LOW_Y).toBeGreaterThanOrEqual(SIGNAL_HEAD_MIN_M);
    expect(ARM_BASE_Y).toBeCloseTo(MAST.armY - ARM.clampY, 9);
    for (const o of NAMED) {
      const { streets, traffic } = layersOf(o);
      for (const p of traffic.pieces) {
        if (p.kind !== "signalArm") continue;
        expect(p.placement.y_m + ARM.headLowY, label(o)).toBeGreaterThanOrEqual(SIGNAL_HEAD_MIN_M);
        const a = traffic.junctions.flatMap((t) => t.approaches).find((q) => q.id === p.approach)!;
        const st = streets.streets.find((s) => s.id === a.street)!;
        const run = turn(p.placement.yaw_deg, 0, 1);
        const pole = turn(p.placement.yaw_deg, ARM.axis.x, ARM.axis.z);
        const free = run[0] !== 0 ? p.placement.x_m - pole[0] + run[0] * ARM.reach : p.placement.z_m - pole[1] + run[1] * ARM.reach;
        expect(free, `${label(o)} ${p.approach}`).toBeGreaterThanOrEqual(st.carriage.lo_m - 1e-6);
        expect(free, `${label(o)} ${p.approach}`).toBeLessThanOrEqual(st.carriage.hi_m + 1e-6);
      }
    }
  });

  it("no signal piece stands at a junction that is not a signal junction, and every signal junction's controlled arms are all four", () => {
    for (const o of NAMED) {
      const { traffic } = layersOf(o);
      const signals = new Set(traffic.junctions.filter((t) => t.control === "signals").map((t) => t.junction));
      for (const p of traffic.pieces) if (SIGNAL_KINDS.includes(p.kind)) expect(signals.has(p.host), `${label(o)} ${p.kind} at ${p.host}`).toBe(true);
      for (const t of traffic.junctions) if (t.control === "signals") expect(t.approaches.filter((a) => a.control === "signal")).toHaveLength(4);
    }
  });
});

describe("a hand-worked mast and arm", () => {
  it("6 x 6 seed 1, junction:50:14 (x 250 to 265, z 70 to 85), approach -z: the pole at its far-left corner (265.75, 85.75), the mast turned 90, the arm turned 270 and fixed to the upper collar", () => {
    const { traffic } = layersOf(DEFAULT);
    const find = (kind: string): CityTrafficPiece => traffic.pieces.find((p) => p.host === "junction:50:14" && p.approach === "junction:50:14|-z" && p.kind === kind)!;
    // the far-left corner of an arm on "-z" (traffic heading +z, its left +x) is the cell at higher x and higher z: the kerb corner is (265, 85), the pole 0.75 in from each kerb edge
    const pole = { x: 265 + MAST_INSET_M, z: 85 + MAST_INSET_M };
    expect(pole).toEqual({ x: 265.75, z: 85.75 });
    // the arm runs to the driver's right, -x (turned 270: its own +z goes to -x), so the mast's clamp face (its own -z) is turned onto -x too: the mast is turned 90 and its lamp hook leans +x over the walk
    const mast = find("signalMast");
    expect(mast.placement.yaw_deg).toBe(90);
    expect(mast.placement.y_m).toBe(0);
    // the pole is 1.0665 m from the pivot along the piece's own -z, which at 90 is -x: the pivot is the pole's x + 1.0665
    expect(mast.placement.x_m).toBeCloseTo(265.75 + 1.0665, 9);
    expect(mast.placement.z_m).toBeCloseTo(85.75, 9);
    expect(mast.cell).toEqual({ i: 53, j: 17 });
    expect(mast.grounded).toBe(true);
    // the arm's clamp axis is (0.095, -3.033) from its pivot; turned 270 (x' = -z, z' = x) that is (3.033, 0.095), so the pivot is the pole less that; its base is the collar's centre less the clamp's
    const arm = find("signalArm");
    expect(arm.placement.yaw_deg).toBe(270);
    expect(arm.placement.x_m).toBeCloseTo(265.75 - 3.033, 9);
    expect(arm.placement.z_m).toBeCloseTo(85.75 - 0.095, 9);
    expect(arm.placement.y_m).toBeCloseTo(5.3835 - 0.5793, 9);
    expect(arm.grounded).toBe(false);
    expect(arm.group).toBe(mast.group);
    expect(poleOf(mast)).toEqual({ x: pole.x, z: pole.z });
    // the heads' lenses (own -x, turned 270 -> z' = x = -1) face -z, toward traffic coming from the -z side
    expect(turn(arm.placement.yaw_deg, -1, 0)).toEqual([0, -1]);
    expect(YAW["-z"]).toBe(180);
  });
});
