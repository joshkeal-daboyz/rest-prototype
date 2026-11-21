/**
 * Ticket 070 I, criterion 7: the failing fixtures. Each is the default city's layer (6 x 6 seed 1, one-way on) with one thing changed; it fails its check and only it, unless it says otherwise. The positive control is the default
 * layer, which passes. Where a fixture needs a place that passes every other check, the test looks for it among the city's own places (a prop, a run, a door, an awning, an escape) and stops at the first that does.
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityGroundProp } from "../../core";
import { FURN_WALL_M } from "./constants";
import { rectDist, rotate } from "./geom";
import { groundFailures, type GroundInput } from "./groundcheck";
import { BENCHES, BINS, HYDRANTS, METERS, TREES, boundsOf } from "./kit";
import { makeProp, propRect } from "./props";
import { frameOf, geoOf, worldOf, type RunGeo } from "./runs";
import { DEFAULT, layersOf } from "./testcities";
import { buildKeepouts } from "./keepout";

const L = layersOf(DEFAULT);
const input: GroundInput = { mass: L.mass, edge: L.edge, facades: L.facades };
const base = L.ground;
const geo = new Map<string, RunGeo>(base.runs.map((r) => [r.id, geoOf(r)] as const));
const sorted = (xs: readonly string[]): string[] => [...new Set(xs)].sort();

const failuresOf = (props: readonly CityGroundProp[], inp: GroundInput = input) => groundFailures({ stage: "ground", runs: base.runs, props }, inp);
const checksOf = (props: readonly CityGroundProp[], inp: GroundInput = input): string[] => sorted(failuresOf(props, inp).map((f) => f.check));
const replaceAt = (n: number, p: CityGroundProp): CityGroundProp[] => base.props.map((q, i) => (i === n ? p : q));
const withExtra = (p: CityGroundProp): CityGroundProp[] => [...base.props, p];
const same = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/** The first candidate whose props give exactly one of the wanted check lists (in order of preference), or undefined. */
function search<T>(candidates: Iterable<T>, build: (c: T) => readonly CityGroundProp[], wants: readonly (readonly string[])[], inp: GroundInput = input): { c: T; checks: string[] } | undefined {
  for (const c of candidates) {
    const got = checksOf(build(c), inp);
    if (wants.some((w) => same(got, sorted(w)))) return { c, checks: got };
  }
  return undefined;
}

/** The first candidate whose failures satisfy a predicate. */
function searchWhere<T>(candidates: Iterable<T>, build: (c: T) => readonly CityGroundProp[], pred: (checks: string[], reasons: string[]) => boolean): { c: T; checks: string[] } | undefined {
  for (const c of candidates) {
    const f = failuresOf(build(c));
    const checks = sorted(f.map((x) => x.check));
    if (pred(checks, f.map((x) => x.reason))) return { c, checks };
  }
  return undefined;
}

const pavementProps = base.props.map((p, n) => ({ p, n })).filter((x) => x.p.on === "pavement");
const frameOfProp = (p: CityGroundProp): { run: RunGeo; s: number; t: number } => {
  const run = geo.get(p.host)!;
  return { run, ...frameOf(run, p.placement.x_m, p.placement.z_m) };
};
const dirs = [
  { dx: 0, dz: 1, yaw: 0 },
  { dx: 1, dz: 0, yaw: 90 },
  { dx: 0, dz: -1, yaw: 180 },
  { dx: -1, dz: 0, yaw: 270 },
] as const;

/** A prop of `key` on a run's line at `s`. */
function onLine(run: RunGeo, key: CalibrationKey, line: "wall" | "kerb", s: number): CityGroundProp {
  const e = boundsOf(key);
  const t = line === "wall" ? FURN_WALL_M + e.d / 2 : 5 - 0.5 - e.d / 2;
  const w = worldOf(run, s, t, e.w, e.d);
  return makeProp({ key, on: "pavement", block: run.block, host: run.id, line, x: w.x, z: w.z, yaw: run.yaw });
}

describe("the failing fixtures (criterion 7)", { timeout: 120_000 }, () => {
  it("positive control: the default layer passes every check", () => {
    expect(failuresOf(base.props)).toEqual([]);
    expect(base.props.length).toBeGreaterThan(500);
  });

  it("a bench moved into a court's aisle cell fails R10 place (and only it where it faces a path)", () => {
    const n = base.props.findIndex((p) => p.kind === "bench" && p.on === "green");
    const bench = base.props[n]!;
    const aisle = L.mass.cells.filter((c) => c.use === "aisle");
    expect(aisle.length).toBeGreaterThan(0);
    const cands = aisle.flatMap((c) => dirs.map((d) => ({ c, d })));
    const hit = search(
      cands,
      ({ c, d }) => replaceAt(n, makeProp({ key: BENCHES[0]!, on: "green", block: c.block, host: c.part ?? c.opening ?? c.block, line: null, x: (c.i + 0.5) * 5 + d.dx * 1.5, z: (c.j + 0.5) * 5 + d.dz * 1.5, yaw: d.yaw })),
      [["R10 place"], ["R10 place", "greens"]],
    );
    expect(hit, "no aisle cell gives a bench that fails R10 place alone").toBeDefined();
    expect(hit!.checks).toContain("R10 place");
    expect(bench.on).toBe("green");
  });

  it("a tree moved onto a greenPath cell fails R10 place (greens too where it is off its cell's middle)", () => {
    const n = base.props.findIndex((p) => p.kind === "tree" && p.on === "green");
    const tree = base.props[n]!;
    const path = L.mass.cells.filter((c) => c.use === "greenPath");
    const hit = search(
      path,
      (c) => replaceAt(n, makeProp({ key: tree.placement.key, on: "green", block: c.block, host: tree.host, line: null, x: (c.i + 0.5) * 5, z: (c.j + 0.5) * 5, yaw: 0 })),
      [["R10 place"], ["R10 place", "greens"]],
    );
    expect(hit).toBeDefined();
    expect(hit!.checks).toContain("R10 place");
  });

  it("a second prop on a wall line 3 m from another fails R10 pitch", () => {
    const cands = pavementProps.filter((x) => x.p.line === "wall").flatMap((x) => [3, -3].map((off) => ({ x, off })));
    const hit = search(
      cands,
      ({ x, off }) => {
        const f = frameOfProp(x.p);
        return withExtra(onLine(f.run, "city-pack:SM_Prop_Newspaper_02", "wall", f.s + off));
      },
      [["R10 pitch"]],
    );
    expect(hit, "no wall-line place 3 m from another fails R10 pitch alone").toBeDefined();
  });

  it("a kerb tree 8 m from another fails R10 pitch (trees)", () => {
    const cands = pavementProps.filter((x) => x.p.kind === "tree").flatMap((x) => [8, -8].map((off) => ({ x, off })));
    const hit = searchWhere(
      cands,
      ({ x, off }) => {
        const f = frameOfProp(x.p);
        return withExtra(onLine(f.run, x.p.placement.key, "kerb", f.s + off));
      },
      (checks, reasons) => same(checks, ["R10 pitch"]) && reasons.some((r) => r.includes("trees")),
    );
    expect(hit, "no kerb tree 8 m from another fails the trees' pitch alone").toBeDefined();
  });

  it("a pavement prop moved 1 m past its run's end fails R10 corners and R10 pavement", () => {
    const hit = searchWhere(
      pavementProps,
      (x) => {
        const f = frameOfProp(x.p);
        const w = worldOf(f.run, f.run.len + 1 - (f.run.along === "x" ? x.p.size.x_m : x.p.size.z_m) / 2, f.t, 1, 1);
        return replaceAt(x.n, makeProp({ key: x.p.placement.key, on: "pavement", block: x.p.block, host: x.p.host, line: x.p.line, x: w.x, z: w.z, yaw: x.p.placement.yaw_deg }));
      },
      (checks) => checks.includes("R10 corners") && checks.includes("R10 pavement"),
    );
    expect(hit).toBeDefined();
  });

  it("a kerb prop moved onto the kerb edge fails R10 pavement", () => {
    const cands = pavementProps.filter((x) => x.p.line === "kerb");
    const hit = search(
      cands,
      (x) => {
        const f = frameOfProp(x.p);
        const w = worldOf(f.run, f.s, f.t + 0.5, 1, 1);
        return replaceAt(x.n, makeProp({ key: x.p.placement.key, on: "pavement", block: x.p.block, host: x.p.host, line: "kerb", x: w.x, z: w.z, yaw: x.p.placement.yaw_deg }));
      },
      [["R10 pavement"]],
    );
    expect(hit).toBeDefined();
  });

  it("a pavement prop moved to 1 m from a kerbCut cell fails R10 keep-outs", () => {
    const ko = buildKeepouts({ mass: L.mass, edge: L.edge, facades: L.facades }).ko.items.filter((k) => k.why === "kerbCut");
    expect(ko.length).toBeGreaterThan(0);
    const cands = pavementProps.flatMap((x) => ko.filter((k) => rectDist(propRect(x.p), k) < 8).map((k) => ({ x, k })));
    const hit = searchWhere(
      cands,
      ({ x, k }) => {
        const f = frameOfProp(x.p);
        const half = (f.run.along === "x" ? x.p.size.x_m : x.p.size.z_m) / 2;
        // along the run: the footprint's near edge 1 m from the cell's far edge
        const lo = f.run.along === "x" ? k.x0 : k.z0;
        const hi = f.run.along === "x" ? k.x1 : k.z1;
        const c = f.run.along === "x" ? x.p.placement.x_m : x.p.placement.z_m;
        const at = c < lo ? lo - 1 - half : hi + 1 + half;
        const w = f.run.along === "x" ? { x: at, z: x.p.placement.z_m } : { x: x.p.placement.x_m, z: at };
        return replaceAt(x.n, makeProp({ key: x.p.placement.key, on: "pavement", block: x.p.block, host: x.p.host, line: x.p.line, x: w.x, z: w.z, yaw: x.p.placement.yaw_deg }));
      },
      (checks) => checks.includes("R10 keep-outs"),
    );
    expect(hit, "no pavement prop moved 1 m from a kerb cut fails R10 keep-outs").toBeDefined();
  });

  it("a keep point added at a prop fails R10 keep-outs (NL: stage 6's poles will go in this list)", () => {
    const p = pavementProps[10]!.p;
    expect(checksOf(base.props, { ...input, keepPoints: [] })).toEqual([]);
    expect(checksOf(base.props, { ...input, keepPoints: [{ x_m: p.placement.x_m, z_m: p.placement.z_m }] })).toEqual(["R10 keep-outs"]);
  });

  it("a second hydrant on a run fails R10 caps", () => {
    const hydrants = pavementProps.filter((x) => x.p.kind === "hydrant");
    expect(hydrants.length).toBeGreaterThan(0);
    const cands = hydrants.flatMap((x) => Array.from({ length: 70 }, (_, k) => ({ run: geo.get(x.p.host)!, s: 4.5 + k * 0.5 })));
    const hit = search(cands, ({ run, s }) => withExtra(onLine(run, HYDRANTS[0]!, "kerb", s)), [["R10 caps"]]);
    expect(hit).toBeDefined();
  });

  it("two benches on one spot fail R10 clash (and R10 pitch)", () => {
    const x = pavementProps.find((q) => q.p.kind === "bench")!;
    expect(checksOf(withExtra(x.p))).toEqual(["R10 clash", "R10 pitch"]);
  });

  it("a kerb tree moved under an awning fails stage 7", () => {
    const awnings = (L.facades.dressing ?? []).filter((d) => d.kind === "awning");
    expect(awnings.length).toBeGreaterThan(0);
    const cands = awnings.flatMap((a) => {
      const run = base.runs.find((r) => r.cells.some((c) => c.i === a.cell.i && c.j === a.cell.j));
      return run ? [-2, -1, 0, 1, 2].map((ds) => ({ run: geo.get(run.id)!, s: frameOf(geo.get(run.id)!, a.placement.x_m, a.placement.z_m).s + ds })) : [];
    });
    const hit = search(cands, ({ run, s }) => withExtra(onLine(run, TREES[0]!, "kerb", s)), [["stage 7"]]);
    expect(hit, "no kerb tree under an awning fails stage 7 alone").toBeDefined();
  });

  it("a bin moved under an escape's drop ladder fails stage 7 (EL)", () => {
    const escapes = (L.facades.walls ?? []).filter((w) => w.kind === "escape" && w.boxes.length > 0);
    expect(escapes.length).toBeGreaterThan(0);
    const cands = escapes.flatMap((e) => {
      const run = base.runs.find((r) => r.cells.some((c) => c.i === e.cell.i && c.j === e.cell.j));
      return run ? e.boxes.map((b) => ({ run: geo.get(run.id)!, at: rotate(e.placement.yaw_deg, b.x_m, b.z_m), e })) : [];
    });
    const hit = searchWhere(
      cands,
      ({ run, at, e }) => withExtra(onLine(run, BINS[0]!, "wall", frameOf(run, e.placement.x_m + at.x, e.placement.z_m + at.z).s)),
      (checks, reasons) => same(checks, ["stage 7"]) && reasons.some((r) => r.includes("EL")),
    );
    expect(hit, "no bin under a drop ladder fails stage 7 (EL) alone").toBeDefined();
  });

  it("a bench moved in front of a residents' door fails doors", () => {
    const doors = L.facades.ground.filter((g) => g.kind === "door" || g.kind === "doorCorner");
    const cands = doors.flatMap((g) => {
      const run = base.runs.find((r) => r.cells.some((c) => c.i === g.cells[0]!.i && c.j === g.cells[0]!.j));
      return run ? [{ run: geo.get(run.id)!, s: frameOf(geo.get(run.id)!, (g.cells[0]!.i + 0.5) * 5, (g.cells[0]!.j + 0.5) * 5).s }] : [];
    });
    expect(cands.length).toBeGreaterThan(0);
    const hit = search(cands, ({ run, s }) => withExtra(onLine(run, BENCHES[0]!, "wall", s)), [["doors"]]);
    expect(hit, "no bench in front of a door fails doors alone").toBeDefined();
  });

  it("a lane bin moved in front of a lane door fails doors", () => {
    const built = new Map(L.mass.built.map((c) => [`${c.i},${c.j}`, c] as const));
    const vec = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] } as const;
    const cands = L.facades.ground
      .filter((g) => g.kind === "door" || g.kind === "doorCorner")
      .flatMap((g) => {
        const c = g.cells[0]!;
        const bc = built.get(`${c.i},${c.j}`)!;
        return bc.open
          .filter((o) => o.faces === "lane")
          .flatMap((o) => {
            const lc = { i: c.i + vec[o.side][0], j: c.j + vec[o.side][1] };
            const lane = L.land.lanes.find((q) => q.block === bc.block && (q.axis === "z" ? q.at === lc.i : q.at === lc.j));
            return lane ? [{ c, side: o.side, lane, block: bc.block }] : [];
          });
      });
    expect(cands.length).toBeGreaterThan(0);
    const e = boundsOf(BINS[0]!);
    const hit = search(
      cands,
      ({ c, side, lane, block }) => {
        const gap = FURN_WALL_M + e.d / 2;
        const x = side === "-x" ? c.i * 5 - gap : side === "+x" ? (c.i + 1) * 5 + gap : (c.i + 0.5) * 5;
        const z = side === "-z" ? c.j * 5 - gap : side === "+z" ? (c.j + 1) * 5 + gap : (c.j + 0.5) * 5;
        const yaw = side === "-x" ? 270 : side === "+x" ? 90 : side === "-z" ? 180 : 0;
        return withExtra(makeProp({ key: BINS[0]!, on: "lane", block, host: `${lane.block}|${lane.axis}|${lane.at}`, line: "wall", x, z, yaw }));
      },
      [["doors"]],
    );
    expect(hit, "no lane bin in front of a lane door fails doors alone").toBeDefined();
  });

  it("a meter moved to a stretch with no bay fails meters", () => {
    const meters = pavementProps.filter((x) => x.p.kind === "meter");
    expect(meters.length).toBeGreaterThan(0);
    const cands = meters.flatMap((x) => [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 8, -8, 10, -10].map((ds) => ({ x, ds })));
    const hit = search(
      cands,
      ({ x, ds }) => {
        const f = frameOfProp(x.p);
        const m = onLine(f.run, METERS[0]!, "kerb", f.s + ds);
        return replaceAt(x.n, m);
      },
      [["meters"]],
    );
    expect(hit, "no moved meter fails meters alone").toBeDefined();
  });

  it("a bench turned away from its path fails greens", () => {
    const n = base.props.findIndex((p) => p.kind === "bench" && p.on === "green");
    const b = base.props[n]!;
    const turned = makeProp({ key: b.placement.key, on: "green", block: b.block, host: b.host, line: null, x: b.placement.x_m, z: b.placement.z_m, yaw: b.placement.yaw_deg + 180 });
    expect(checksOf(replaceAt(n, turned))).toEqual(["greens"]);
  });

  it("a bin given a bench's key fails keys", () => {
    const x = pavementProps.find((q) => q.p.kind === "bin")!;
    const bad: CityGroundProp = { ...x.p, placement: { ...x.p.placement, key: BENCHES[0]! } };
    expect(checksOf(replaceAt(x.n, bad))).toEqual(["keys"]);
  });
});
