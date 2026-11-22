/**
 * Ticket 070 TR1, criterion 4: the stop signs on the 20 named runs, derived here from the streets and edge layers and the ticket's two distances (0.5 m from the kerb-side edge, 1.0 m from the corner end), independently of `signs.ts`;
 * the fallback onto the corner cell; and a stop sign's pivot and yaw on each of the four sides, worked by hand.
 * HEAVY: each city is built once (stages 1 to 9), through a module-level cache.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { CityCell, CityEdgeLayer, CityJunction, CitySide } from "../../core";
import { buildControl } from "./control";
import { buildTraffic } from "./stage";
import { stopPlace, stopSigns } from "./signs";
import { NAMED, DEFAULT, label, layersOf, warm } from "./testcities";
import { stageRand } from "../pipeline/seeds";

/** Where an approach's near-right corner cell and its arm cell are, from a junction's inclusive cell bounds; its sign's yaw. Traffic keeps right: an arm on "-z" carries traffic heading +z, its right is -x. */
const NEAR_RIGHT: Readonly<Record<CitySide, (r: { i0: number; i1: number; j0: number; j1: number }) => { corner: CityCell; arm: CityCell; yaw: number }>> = {
  "-z": (r) => ({ corner: { i: r.i0 - 1, j: r.j0 - 1 }, arm: { i: r.i0 - 1, j: r.j0 - 2 }, yaw: 180 }),
  "+z": (r) => ({ corner: { i: r.i1 + 1, j: r.j1 + 1 }, arm: { i: r.i1 + 1, j: r.j1 + 2 }, yaw: 0 }),
  "-x": (r) => ({ corner: { i: r.i0 - 1, j: r.j1 + 1 }, arm: { i: r.i0 - 2, j: r.j1 + 1 }, yaw: 270 }),
  "+x": (r) => ({ corner: { i: r.i1 + 1, j: r.j0 - 1 }, arm: { i: r.i1 + 2, j: r.j0 - 1 }, yaw: 90 }),
};
const bounds = (cells: readonly CityCell[]): { i0: number; i1: number; j0: number; j1: number } => ({
  i0: Math.min(...cells.map((c) => c.i)),
  i1: Math.max(...cells.map((c) => c.i)),
  j0: Math.min(...cells.map((c) => c.j)),
  j1: Math.max(...cells.map((c) => c.j)),
});

describe("stop signs on the named runs (criterion 4)", { timeout: 120_000 }, () => {
  beforeAll(() => warm(NAMED), 120_000);
  it("every stop approach has exactly one stop sign, on its kerbside at its near-right corner, facing its traffic; none elsewhere", () => {
    const bad: string[] = [];
    let signs = 0;
    for (const o of NAMED) {
      const { streets, edge, traffic } = layersOf(o);
      const role = new Map<string, string>(edge.cells.map((c) => [`${c.i},${c.j}`, c.role]));
      const stops = traffic.pieces.filter((p) => p.kind === "stopSign");
      signs += stops.length;
      for (const t of traffic.junctions) {
        const j = streets.junctions.find((q) => q.id === t.junction)!;
        const b = bounds(j.cells);
        for (const a of t.approaches) {
          const mine = stops.filter((p) => p.approach === a.id);
          if (a.control !== "stop") {
            if (mine.length > 0) bad.push(`${label(o)}: ${a.id} (${a.control}, inbound ${a.inbound}) has a stop sign`);
            continue;
          }
          if (mine.length !== 1) {
            bad.push(`${label(o)}: ${a.id} has ${mine.length} stop signs`);
            continue;
          }
          const p = mine[0]!;
          const want = NEAR_RIGHT[a.arm](b);
          if (role.get(`${want.arm.i},${want.arm.j}`) !== "pavement") bad.push(`${label(o)}: ${a.id}'s arm cell is ${role.get(`${want.arm.i},${want.arm.j}`)}`);
          if (p.cell.i !== want.arm.i || p.cell.j !== want.arm.j) bad.push(`${label(o)}: ${a.id}'s sign is on (${p.cell.i}, ${p.cell.j}), not (${want.arm.i}, ${want.arm.j})`);
          if (p.placement.yaw_deg !== want.yaw) bad.push(`${label(o)}: ${a.id}'s sign faces ${p.placement.yaw_deg}, not ${want.yaw}`);
          if (!p.grounded || p.placement.y_m !== 0 || p.street !== a.street || p.host !== j.id) bad.push(`${label(o)}: ${a.id}'s sign is not grounded on its street`);
        }
      }
      // no sign at a signal junction
      const signalJ = new Set(traffic.junctions.filter((t) => t.control === "signals").map((t) => t.junction));
      for (const p of stops) if (signalJ.has(p.host)) bad.push(`${label(o)}: a stop sign at a signal junction ${p.host}`);
    }
    expect(bad).toEqual([]);
    expect(signs).toBe(1054);
  });

  it("every sign's post is 0.5 m from its cell's kerb-side edge and 1.0 m from the end that touches the corner", () => {
    const bad: string[] = [];
    for (const o of NAMED) {
      const { streets, traffic } = layersOf(o);
      for (const p of traffic.pieces) {
        if (p.kind !== "stopSign") continue;
        const j = streets.junctions.find((q) => q.id === p.host)!;
        const a = traffic.junctions.flatMap((t) => t.approaches).find((q) => q.id === p.approach)!;
        const x = p.placement.x_m;
        const z = p.placement.z_m;
        const c = p.cell;
        const b = bounds(j.cells);
        // the arm cell's edges, metres
        const x0 = c.i * 5;
        const z0 = c.j * 5;
        // which way is the kerb: toward the junction's carriageway across the street, and the corner end along it
        if (a.arm === "-z" || a.arm === "+z") {
          // the street runs along z; the kerb is the cell's edge toward the carriageway in x (the junction's near edge in x)
          const kerb = c.i < b.i0 ? x0 + 5 : x0;
          const across = Math.abs(x - kerb);
          const corner = a.arm === "-z" ? z0 + 5 : z0;
          if (Math.abs(across - 0.5) > 1e-9) bad.push(`${label(o)}: ${p.approach} sign ${across} from the kerb`);
          if (Math.abs(Math.abs(z - corner) - 1) > 1e-9) bad.push(`${label(o)}: ${p.approach} sign ${Math.abs(z - corner)} from the corner end`);
        } else {
          const kerb = c.j < b.j0 ? z0 + 5 : z0;
          const across = Math.abs(z - kerb);
          const corner = a.arm === "-x" ? x0 + 5 : x0;
          if (Math.abs(across - 0.5) > 1e-9) bad.push(`${label(o)}: ${p.approach} sign ${across} from the kerb`);
          if (Math.abs(Math.abs(x - corner) - 1) > 1e-9) bad.push(`${label(o)}: ${p.approach} sign ${Math.abs(x - corner)} from the corner end`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("the named runs have stop signs on one-way arms and on Ts, and an arm with no inbound traffic has none", () => {
    let outbound = 0;
    let t = 0;
    for (const o of NAMED) {
      const { streets, traffic } = layersOf(o);
      for (const tj of traffic.junctions) {
        const j = streets.junctions.find((q) => q.id === tj.junction)!;
        if (j.kind === "T" && tj.control === "stop") t++;
        for (const a of tj.approaches) if (!a.inbound && traffic.pieces.every((p) => p.approach !== a.id)) outbound++;
      }
    }
    expect(outbound).toBeGreaterThan(0);
    expect(t).toBeGreaterThan(0);
  });
});

describe("the fallback onto the corner cell", { timeout: 120_000 }, () => {
  it("a stop-sign cell relabelled kerbCut: the sign stands on the pavementCorner cell, 0.5 m from its kerb-side edge and 1.0 m from its far end", () => {
    const L = layersOf(DEFAULT);
    const base = buildTraffic(L, stageRand("traffic", 1));
    const sign = base.pieces.find((p) => p.kind === "stopSign")!;
    const cut: CityEdgeLayer = { ...L.edge, cells: L.edge.cells.map((c) => (c.i === sign.cell.i && c.j === sign.cell.j ? { ...c, role: "kerbCut" as const } : c)) };
    const moved = buildTraffic({ streets: L.streets, edge: cut }, stageRand("traffic", 1));
    expect(moved.pieces).toHaveLength(base.pieces.length);
    const again = moved.pieces.find((p) => p.approach === sign.approach && p.kind === "stopSign")!;
    const a = base.junctions.flatMap((t) => t.approaches).find((q) => q.id === sign.approach)!;
    const j = L.streets.junctions.find((q) => q.id === sign.host)!;
    const want = NEAR_RIGHT[a.arm](bounds(j.cells));
    expect(again.cell).toEqual(want.corner);
    expect(again.street).toBeNull();
    expect(again.placement.yaw_deg).toBe(sign.placement.yaw_deg);
    // the kerb-side edge is the same as the arm cell's; the far end is the corner cell's end away from the junction
    const kerbSide = a.arm === "-z" || a.arm === "+z" ? Math.abs(again.placement.x_m - sign.placement.x_m) : Math.abs(again.placement.z_m - sign.placement.z_m);
    expect(kerbSide).toBeCloseTo(0, 9);
    const far = a.arm === "-z" ? (want.corner.j + 1) * 5 - 5 : a.arm === "+z" ? (want.corner.j + 1) * 5 : a.arm === "-x" ? want.corner.i * 5 : (want.corner.i + 1) * 5;
    const along = a.arm === "-z" || a.arm === "+z" ? again.placement.z_m : again.placement.x_m;
    expect(Math.abs(along - far)).toBeCloseTo(1, 9);
  });

  it("a dropped kerb (a dip) in the arm cell takes the fallback too", () => {
    const L = layersOf(DEFAULT);
    const base = buildTraffic(L, stageRand("traffic", 1));
    const sign = base.pieces.find((p) => p.kind === "stopSign")!;
    const dipped: CityEdgeLayer = { ...L.edge, ground: L.edge.ground!.map((g) => (g.cells === 1 && g.i === sign.cell.i && g.j === sign.cell.j ? { ...g, variant: g.variant | 16 } : g)) };
    const moved = buildTraffic({ streets: L.streets, edge: dipped }, stageRand("traffic", 1));
    const again = moved.pieces.find((p) => p.approach === sign.approach && p.kind === "stopSign")!;
    expect(again.cell).not.toEqual(sign.cell);
    expect(again.street).toBeNull();
  });
});

describe("a hand-worked stop sign on each of the four sides", () => {
  // a crossroads of cells 10 to 12 in x and in z: x 50 to 65, z 50 to 65, every cell around it plain pavement
  const j = { id: "j", kind: "crossroads", inner: true, arms: ["-x", "+x", "-z", "+z"], streets: [], cells: [10, 11, 12].flatMap((i) => [10, 11, 12].map((jj) => ({ i, j: jj }))) } as unknown as CityJunction;
  const plain = { roleAt: () => "pavement" as const, dipAt: () => false };

  it("-z: traffic heading +z, right -x; the arm cell (9, 8) at x 45 to 50, z 40 to 45: post at (49.5, 44), facing -z (turned 180)", () => {
    const p = stopPlace(j, { arm: "-z" }, plain);
    expect(p).toEqual({ cell: { i: 9, j: 8 }, fallback: false, x: 49.5, z: 44 });
  });

  it("+z: traffic heading -z, right +x; the arm cell (13, 14) at x 65 to 70, z 70 to 75: post at (65.5, 71), facing +z (turned 0)", () => {
    const p = stopPlace(j, { arm: "+z" }, plain);
    expect(p).toEqual({ cell: { i: 13, j: 14 }, fallback: false, x: 65.5, z: 71 });
  });

  it("-x: traffic heading +x, right +z; the arm cell (8, 13) at x 40 to 45, z 65 to 70: post at (44, 65.5), facing -x (turned 270)", () => {
    const p = stopPlace(j, { arm: "-x" }, plain);
    expect(p).toEqual({ cell: { i: 8, j: 13 }, fallback: false, x: 44, z: 65.5 });
  });

  it("+x: traffic heading -x, right -z; the arm cell (14, 9) at x 70 to 75, z 45 to 50: post at (71, 49.5), facing +x (turned 90)", () => {
    const p = stopPlace(j, { arm: "+x" }, plain);
    expect(p).toEqual({ cell: { i: 14, j: 9 }, fallback: false, x: 71, z: 49.5 });
  });

  it("the pieces carry the yaws 180, 0, 270 and 90, a size of 0.77 by 0.124 turned, and a group of their own", () => {
    const t = buildControl({
      streets: [
        { id: "x:1", axis: "x", section: "twoWay", flow: "both" },
        { id: "z:1", axis: "z", section: "twoWay", flow: "both" },
      ] as never,
      junctions: [{ ...j, inner: false, kind: "T", streets: [{ street: "x:1", passes: false }, { street: "z:1", passes: true }], arms: ["-x", "-z", "+z"] }] as never,
    })[0]!;
    expect(t.control).toBe("stop");
    const pieces = stopSigns({ ...j, arms: ["-x"] } as CityJunction, t, plain);
    expect(pieces).toHaveLength(1);
    const p = pieces[0]!;
    expect(p.placement).toMatchObject({ key: "city-pack:SM_Prop_Sign_Stop_01", x_m: 44, y_m: 0, z_m: 65.5, yaw_deg: 270 });
    expect(p.size).toEqual({ x_m: 0.124, z_m: 0.77, h_m: 2.271 });
    expect(p.group).toBe("j|0");
    expect(p.street).toBe("x:1");
  });
});
