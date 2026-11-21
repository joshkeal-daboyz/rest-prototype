/**
 * Ticket 070 I, criterion 3: the pavements on the 20 named runs (every check, the groups, the caps, MT), and hand-worked places.
 */
import { describe, expect, it } from "vitest";
import type { CityKerbBay, CityGroundProp } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { BUS_STOP_MIN_RUN_M } from "./constants";
import { groundFailures } from "./groundcheck";
import { buildKeepouts } from "./keepout";
import { layoutPavements, layoutRun, meterHasBay, type Unit } from "./pavement";
import { propRect } from "./props";
import type { RunGeo } from "./runs";
import { frameOf } from "./runs";
import { buildGround } from "./stage";
import { newStats } from "./stats";
import { NAMED, label, layersOf } from "./testcities";
import { overlaps } from "./geom";

const pavementProps = (props: readonly CityGroundProp[]): CityGroundProp[] => props.filter((p) => p.on === "pavement");

describe("the pavements on the 20 named runs (criterion 3)", { timeout: 120_000 }, () => {
  const seen = { wall: new Set<string>(), kerb: new Set<string>(), busStopRuns: 0, mtRuns: 0, meters: 0 };
  for (const o of NAMED) {
    it(`${label(o)}: every check passes, the caps hold per run, every meter is beside a bay of its block side`, () => {
      const l = layersOf(o);
      expect(groundFailures(l.ground, { mass: l.mass, edge: l.edge, facades: l.facades })).toEqual([]);
      const pav = pavementProps(l.ground.props);
      expect(pav.length).toBeGreaterThan(300);
      const byRun = new Map<string, CityGroundProp[]>();
      for (const p of pav) {
        const list = byRun.get(p.host);
        if (list) list.push(p);
        else byRun.set(p.host, [p]);
        (p.line === "wall" ? seen.wall : seen.kerb).add(p.kind);
      }
      const runs = new Map(l.ground.runs.map((r) => [r.id, r] as const));
      for (const [id, list] of byRun) {
        const count = (k: string): number => list.filter((p) => p.kind === k).length;
        expect(count("hydrant")).toBeLessThanOrEqual(1);
        expect(count("mailbox")).toBeLessThanOrEqual(1);
        expect(count("newspaper")).toBeLessThanOrEqual(2);
        expect(count("busStop")).toBeLessThanOrEqual(1);
        expect(count("bollard")).toBeLessThanOrEqual(2);
        const run = runs.get(id)!;
        if (count("busStop") > 0) {
          expect(run.hi_m - run.lo_m).toBeGreaterThanOrEqual(BUS_STOP_MIN_RUN_M);
          seen.busStopRuns++;
        }
      }
      // MT: every meter stands beside a bay of its run's block side (the check also says so); the stage took some out
      const stats = buildGround(l, stageRand("ground", o.seed)).stats;
      if (stats.meterMT > 0) seen.mtRuns++;
      seen.meters += pav.filter((p) => p.kind === "meter").length;
      for (const p of pav.filter((q) => q.kind === "meter")) {
        const run = runs.get(p.host)!;
        const along = run.side === "+z" || run.side === "-z" ? p.placement.x_m : p.placement.z_m;
        expect(l.edge.bays.some((b) => b.street === run.street && b.block === run.block && Math.abs(along - (run.side === "+z" || run.side === "-z" ? b.x_m : b.z_m)) <= b.w_m / 2 + 1e-6)).toBe(true);
      }
    });
  }

  it("the named runs between them have every wall group, every kerb group, bollards and at least one bus stop; meters stand, and MT took some out", () => {
    expect([...seen.wall].sort()).toEqual(["bench", "bin", "mailbox", "newspaper", "planter", "potPlant"]);
    expect([...seen.kerb].sort()).toEqual(["bollard", "busStop", "hydrant", "meter", "tree"]);
    expect(seen.busStopRuns).toBeGreaterThan(0);
    expect(seen.meters).toBeGreaterThan(0);
    expect(seen.mtRuns).toBe(NAMED.length);
  });
});

// ---- hand-worked: a run along x, its front +z, from 10 m to 50 m, its wall at z = 10 m and its kerb at z = 15 m ----

const RUN: RunGeo = {
  id: "r",
  street: "x:1",
  block: "block:0:0",
  side: "+z",
  buildings: [],
  cells: [],
  pavement: [],
  lo_m: 10,
  hi_m: 50,
  wall_m: 10,
  kerb_m: 15,
  along: "x",
  sgn: 1,
  len: 40,
  yaw: 0,
};

const emptyKeep = (dressing: unknown[] = []) => buildKeepouts({ mass: { built: [] }, edge: { cells: [], ground: [] }, facades: { ground: [], dressing, walls: [], novelty: [] } } as never);

/** A hash that leaves the first candidate of each line empty and picks a group by value: `wall` and `kerb` are the `item` values (a group is picked where unit * total weight falls in its span). */
const stub =
  (wall: number, kerb: number): Unit =>
  (...k) => {
    const [, a, b] = k;
    if (a === "bollard" || b === "first") return 0;
    const last = k[k.length - 1];
    if (last === "fill") return b === 0 ? 0.99 : 0;
    if (last === "item") return a === "wall" ? wall : kerb;
    if (last === "key") return 0;
    return 0.5; // every gap is 3 m, so the candidates are at s = 4.5, 14.5, 24.5, 34.5
  };

const find = (props: readonly CityGroundProp[], kind: string, line: string, x: number): CityGroundProp | undefined => props.find((p) => p.kind === kind && p.line === line && Math.abs(p.placement.x_m - x) < 1e-9);

describe("hand-worked pavement places (criterion 3)", () => {
  it("a wall-line bench stands t = 0.4 + 0.624 / 2 from the wall, and a kerb-line hydrant t = 5 - 0.5 - 0.54 / 2, both facing the street", () => {
    // wall item 0.7: weights 3, 2, 2, 2, 1, 1 (total 11) put 0.7 x 11 = 7.7 in the bench's span [7, 9); kerb item 0.8: weights 3, 2, 1, 1 (total 7) put 5.6 in the hydrant's span [5, 6)
    const props = layoutRun(RUN, emptyKeep(), stub(0.7, 0.8), newStats());
    const bench = find(props, "bench", "wall", 24.5);
    expect(bench).toBeDefined();
    expect(bench!.placement.z_m).toBeCloseTo(10 + 0.4 + 0.624 / 2, 12);
    expect(bench!.placement.yaw_deg).toBe(0);
    expect(bench!.placement.y_m).toBe(0);
    expect(bench!.size).toEqual({ x_m: 2.079, z_m: 0.624, h_m: 1.048 });
    const hydrant = find(props, "hydrant", "kerb", 24.5);
    expect(hydrant).toBeDefined();
    expect(hydrant!.placement.z_m).toBeCloseTo(10 + (5 - 0.5 - 0.54 / 2), 12);
    expect(hydrant!.placement.yaw_deg).toBe(0);
    // the first place of each line, 4.5 m, is the skipped one: the next is 4.5 + 7 + 0.5 x 6 = 14.5 m along, 24.5 m on the lattice
    expect(frameOf(RUN, bench!.placement.x_m, bench!.placement.z_m).s).toBeCloseTo(14.5, 12);
  });

  it("the bollards stand FURN_CORNER_M + 0.4 from each end of the run, on the kerb line", () => {
    const props = layoutRun(RUN, emptyKeep(), stub(0.7, 0.8), newStats());
    const bollards = props.filter((p) => p.kind === "bollard");
    expect(bollards).toHaveLength(2);
    expect(bollards.map((p) => p.placement.x_m)).toEqual([10 + 4.4, 10 + 40 - 4.4]);
    for (const b of bollards) {
      expect(b.line).toBe("kerb");
      expect(b.placement.z_m).toBeCloseTo(10 + (5 - 0.5 - 0.209 / 2), 12);
    }
  });

  it("a face to the -z or the +x turns the run's frame: its yaw and its walk's direction follow the front", () => {
    const west: RunGeo = { ...RUN, side: "-x", along: "z", sgn: -1, wall_m: 20, kerb_m: 15, yaw: 270 };
    const props = layoutRun(west, emptyKeep(), stub(0.7, 0.8), newStats());
    const bench = props.find((p) => p.kind === "bench" && p.line === "wall")!;
    // the wall at x = 20, the walk toward lower x: the bench's back is 0.4 m out, so its centre is at x = 20 - (0.4 + 0.624 / 2), facing -x
    expect(bench.placement.x_m).toBeCloseTo(20 - (0.4 + 0.624 / 2), 12);
    expect(bench.placement.yaw_deg).toBe(270);
    expect(bench.size).toEqual({ x_m: 0.624, z_m: 2.079, h_m: 1.048 });
  });

  it("a kerb-line tree is refused under a fixture awning (AV: 4.2 m over its 2.85 m base) and a bench is placed under it (1.05 m under)", () => {
    // Shop_Cover_05, 5.394 m square, at z = 12.5 m (the wall at 10 m to 15.2 m), its base 2.85 m up, over s = 14.5 m (x = 24.5 m); kerb item 0.6 picks the tree (span [3, 5) of 7)
    const awning = { kind: "awning", building: "b", cell: { i: 0, j: 0 }, face: "+z", wrap: false, placement: { key: "city-pack:SM_Bld_Shop_Cover_05", x_m: 24.5, y_m: 2.85, z_m: 12.5, yaw_deg: 0 } };
    const stats = newStats();
    const props = layoutRun(RUN, emptyKeep([awning]), stub(0.7, 0.6), stats);
    expect(stats.pavTries["kerb:AV"]).toBeGreaterThanOrEqual(1);
    expect(props.some((p) => p.kind === "tree" && Math.abs(p.placement.x_m - 24.5) < 1e-9)).toBe(false);
    const bench = find(props, "bench", "wall", 24.5)!;
    expect(bench).toBeDefined();
    const box = { x0: 21.803, x1: 27.197, z0: 9.803, z1: 15.197 };
    expect(overlaps(propRect(bench), box)).toBe(true);
    expect(bench.size.h_m).toBeLessThan(2.85);
    // without the awning the same hash places the tree
    const free = layoutRun(RUN, emptyKeep(), stub(0.7, 0.6), newStats());
    expect(free.some((p) => p.kind === "tree" && Math.abs(p.placement.x_m - 24.5) < 1e-9)).toBe(true);
  });

  it("MT: a kerb-line meter stays only beside a bay of its run's own block side, level with it along the street", () => {
    const bay = (x: number, block = "block:0:0", street = "x:1"): CityKerbBay => ({ x_m: x, z_m: 0, yaw: 0, w_m: 5, d_m: 2.5, street, block, serves: block });
    const run = (bays: CityKerbBay[]): { props: CityGroundProp[]; mt: number } => {
      const stats = newStats();
      const props = layoutPavements([RUN], emptyKeep(), stub(0.7, 0.2), bays, stats);
      return { props, mt: stats.meterMT };
    };
    // kerb item 0.2 picks the meter (span [0, 3) of 7) at x = 24.5, 34.5
    const with_ = run([bay(24.5), bay(34.5)]);
    expect(with_.props.filter((p) => p.kind === "meter").map((p) => p.placement.x_m)).toEqual([24.5, 34.5]);
    expect(with_.mt).toBe(0);
    // a bay 2.5 m or less from the meter's place (a bay is 5 m long) keeps it; 2.6 m away does not
    expect(run([bay(24.5 + 2.5)]).props.some((p) => p.kind === "meter" && p.placement.x_m === 24.5)).toBe(true);
    expect(run([bay(24.5 + 2.6)]).props.some((p) => p.kind === "meter" && p.placement.x_m === 24.5)).toBe(false);
    // a bay of another block side or another street does not count, and the place is not refilled
    const other = run([bay(24.5, "block:0:1"), bay(34.5, "block:0:0", "x:2")]);
    expect(other.props.some((p) => p.kind === "meter")).toBe(false);
    expect(other.mt).toBeGreaterThanOrEqual(2);
    expect(meterHasBay(RUN, with_.props.find((p) => p.kind === "meter")!, [bay(24.5)])).toBe(true);
  });
});
