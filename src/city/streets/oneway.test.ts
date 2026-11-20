/**
 * Ticket 070 A4b: one-way streets on the split plan, criteria 1 to 11, on the named cities (A4d: 6 x 6 seeds 1 to 10, the default seed 1 first). Each city is laid once per share, through a module cache.
 * `ONE_WAY_SHARE`, `ONE_WAY_BARE_SHARE` and `ONE_WAY_ARROW_EVERY` are PROVISIONAL (Josh judges them on the flat picture): every test reads them by name and none pins their values, and no test counts how
 * many streets are one-way or bare (Josh: "it is the street designers discretion").
 */
import { describe, expect, it } from "vitest";
import type { CityJunction, CityPlanStreet, CitySide, CityStreet, CityStreetBand, CityStreetCell, CityStreetSection, CityStreetTraffic, CityStreetsLayer } from "../../core";
import { pictureProblems } from "../pipeline/picture";
import { runCity } from "../stages";
import { oneWayNeighbours, ownBand, s7Failures, s8Failures, s9Failures, s10Failures, s10Violations, SECTION_BANDS, carriageOfSection, streetWidthFailures } from "./check";
import { ONE_WAY_ARROW_EVERY, ONE_WAY_CARRIAGE_M, SECTION_CELLS, TILE_M } from "./constants";
import { laySplit, type SplitLayout } from "./split";
import { STREETS_LEGEND, streetsStage, streetsStageWith } from "./stage";

const NAMED: { blocksX: number; blocksZ: number; seed: number }[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 6, blocksZ: 6, seed });

type Named = (typeof NAMED)[number];
const cache = new Map<string, SplitLayout>();
const laid = (o: Named, share?: number): SplitLayout => {
  const key = `${o.blocksX}x${o.blocksZ}:${o.seed}:${share ?? "default"}`;
  let r = cache.get(key);
  if (!r) {
    r = laySplit(o.seed, o.blocksX, o.blocksZ, undefined, undefined, share);
    cache.set(key, r);
  }
  return r;
};
const eachCity = (f: (layer: CityStreetsLayer, o: Named, r: SplitLayout) => void): void => {
  for (const o of NAMED) f(laid(o).layer, o, laid(o));
};
const tag = (o: Named): string => `${o.blocksX}x${o.blocksZ} seed ${o.seed}`;
const oneWay = (layer: CityStreetsLayer): CityPlanStreet[] => layer.streets.filter((s) => s.section !== "twoWay");

describe("the sections (criterion 1)", () => {
  it("every street is one of the three sections, its bands match it cell for cell, flow is both exactly on two-way streets, profile stays street", () => {
    eachCity((layer, o) => {
      for (const s of layer.streets) {
        const where = `${tag(o)} ${s.id}`;
        expect(Object.keys(SECTION_CELLS), where).toContain(s.section);
        expect(s.bands, where).toHaveLength(SECTION_CELLS[s.section]);
        expect(SECTION_BANDS[s.section].some((b) => b.every((x, k) => x === s.bands[k])), `${where} ${s.bands.join(",")}`).toBe(true);
        expect(s.flow === "both", where).toBe(s.section === "twoWay");
        expect(s.profile, where).toBe("street");
        expect(s.carriage.hi_m - s.carriage.lo_m, where).toBe(carriageOfSection(s.section));
      }
      expect(streetWidthFailures(layer), tag(o)).toEqual([]);
    });
  });
  it("the carriageway is 15 m two-way and ONE_WAY_CARRIAGE_M one-way (10 m with parking, 5 m bare)", () => {
    expect(carriageOfSection("twoWay")).toBe(15);
    expect(carriageOfSection("oneWay")).toBe(ONE_WAY_CARRIAGE_M.parking);
    expect(carriageOfSection("oneWayBare")).toBe(ONE_WAY_CARRIAGE_M.bare);
  });
  it("a one-way street has exactly one lane cell, and a bare one no parking cell", () => {
    eachCity((layer) => {
      for (const s of oneWay(layer)) {
        expect(s.bands.filter((b) => b === "lane")).toHaveLength(1);
        expect(s.bands.filter((b) => b === "parking")).toHaveLength(s.section === "oneWay" ? 1 : 0);
      }
    });
  });
  const street = (section: CityStreetSection, flow: CityStreetTraffic["flow"], bands: CityStreetBand[], lo_m: number, hi_m: number): CityStreet & CityStreetTraffic => ({
    id: "x:7",
    axis: "x",
    line: 7,
    profile: "street",
    bands,
    across0: 0,
    carriage: { lo_m, hi_m },
    centre_m: (lo_m + hi_m) / 2,
    section,
    flow,
  });
  it("fixtures: a good one-way street passes; two lane cells, parking on both sides, and no pavement on one side each fail, naming the street", () => {
    expect(streetWidthFailures({ streets: [street("oneWay", "+", ["pavement", "parking", "lane", "pavement"], 5, 15)] })).toEqual([]);
    expect(streetWidthFailures({ streets: [street("oneWayBare", "-", ["pavement", "lane", "pavement"], 5, 10)] })).toEqual([]);
    const bad: [string, CityStreet & CityStreetTraffic][] = [
      ["two lane cells", street("oneWay", "+", ["pavement", "lane", "lane", "pavement"], 5, 15)],
      ["parking on both sides", street("oneWay", "+", ["pavement", "parking", "lane", "parking", "pavement"], 5, 20)],
      ["no pavement on one side", street("oneWay", "+", ["pavement", "parking", "lane", "lane"], 5, 20)],
      ["a one-way street whose flow is both", street("oneWay", "both", ["pavement", "parking", "lane", "pavement"], 5, 15)],
      ["a two-way street that is one-way in flow", street("twoWay", "+", ["pavement", "parking", "lane", "lane", "pavement"], 5, 20)],
    ];
    for (const [what, s] of bad) {
      const f = streetWidthFailures({ streets: [s] });
      expect(f.length, what).toBeGreaterThan(0);
      expect(f[0], what).toContain("x:7");
    }
  });
});

describe("which streets are one-way: the stage's choice (criterion 2)", () => {
  it("every one-way street is an inner street; the four edge streets are two-way", () => {
    eachCity((layer, o) => {
      for (const s of oneWay(layer)) expect(s.outer, `${tag(o)} ${s.id}`).toBeNull();
      for (const s of layer.streets.filter((x) => x.outer !== null)) expect([s.section, s.flow, s.bands.length], `${tag(o)} ${s.id}`).toEqual(["twoWay", "both", 5]);
    });
  });
  it("whatever it chooses, S1 to S10, V1, V2 and the street width hold (the layer is laid, which holds them, and they are checked again below)", () => {
    eachCity((layer, o) => {
      expect(streetWidthFailures(layer), tag(o)).toEqual([]);
      expect(s7Failures(layer), tag(o)).toEqual([]);
      expect(s8Failures(layer.streets), tag(o)).toEqual([]);
      expect(s9Failures(layer), tag(o)).toEqual([]);
      expect(s10Failures(layer), tag(o)).toEqual([]);
    });
  });
});

describe("one-way off gives A4's plan (criterion 3), on the 6 x 6 named cities (A4d)", () => {
  // A4d: the old A4 cell digests of the 13 old cities are gone with that list (their cities are outside cities now, never pinned); the structure of A4's plan is what is asserted.
  it("covers the 10 named cities, the default 6 x 6 seed 1 first", () => {
    expect(NAMED).toHaveLength(10);
    expect(NAMED[0]).toEqual({ blocksX: 6, blocksZ: 6, seed: 1 });
  });
  for (const o of NAMED) {
    it(`6 x 6 seed ${o.seed}: with oneWayShare 0 every street is two-way with five bands, and there are no arrows`, () => {
      const l = laid(o, 0).layer;
      for (const s of l.streets) expect([s.section, s.flow, s.bands.length], s.id).toEqual(["twoWay", "both", 5]);
      expect(l.arrows).toEqual([]);
    });
  }
  it("the stage takes the option too (streetsStageWith), and the default stage is the default share", () => {
    const r = runCity({ blocksX: 6, blocksZ: 6, seed: 6 }, "streets", [streetsStageWith(0)]);
    expect(r.ok).toBe(true);
    expect(oneWay(r.plan.layers.streets!)).toEqual([]);
    expect(streetsStage.name).toBe("streets");
  });
});

/** A fixture junction. */
const junction = (id: string, i: number, j: number, streets: [string, boolean][], arms: CitySide[]): Pick<CityJunction, "id" | "cells" | "streets" | "arms"> => ({
  id,
  cells: [{ i, j }],
  streets: streets.map(([street, passes]) => ({ street, passes })),
  arms,
});

describe("S7: every junction reaches every other (criterion 4)", () => {
  it("holds on the named cities, and every junction has an arm in and an arm out", () => {
    eachCity((layer, o) => expect(s7Failures(layer), tag(o)).toEqual([]));
  });
  const streets = (x: "both" | "+" | "-", z: "both" | "+" | "-") => [
    { id: "x:0", axis: "x" as const, flow: x },
    { id: "z:0", axis: "z" as const, flow: z },
  ];
  const junctions = [
    junction("junction:1:1", 1, 1, [["x:0", false], ["z:0", false]], ["+x", "+z"]),
    junction("junction:21:1", 21, 1, [["x:0", false], ["z:1", true]], ["-x", "-z", "+z"]),
    junction("junction:1:21", 1, 21, [["x:1", true], ["z:0", false]], ["+x", "-x", "-z"]),
  ];
  it("fixture: a corner whose two edge streets both point into it fails, naming the junction", () => {
    const f = s7Failures({ streets: streets("-", "-"), junctions });
    expect(f.some((x) => x.startsWith("junction:1:1:"))).toBe(true);
    expect(f.length).toBeGreaterThan(0);
  });
  it("fixture: the same corner with its edge streets two-way passes", () => {
    expect(s7Failures({ streets: streets("both", "both"), junctions })).toEqual([]);
  });
  it("fixture: a corner whose two edge streets both point out of it fails too (nothing reaches it)", () => {
    const f = s7Failures({ streets: streets("+", "+"), junctions });
    expect(f.some((x) => x.startsWith("junction:1:1:"))).toBe(true);
  });
});

describe("S8: the four edge streets are two-way (criterion 5)", () => {
  it("holds on the named cities, and they stay 5 cells so the outline does not move", () => {
    eachCity((layer, o) => {
      expect(s8Failures(layer.streets), tag(o)).toEqual([]);
      expect(layer.streets.filter((s) => s.outer !== null)).toHaveLength(4);
    });
  });
  it("fixture: a one-way edge street fails, naming it", () => {
    const f = s8Failures([{ id: "x:0", outer: "-z", section: "oneWay", flow: "+" }]);
    expect(f).toHaveLength(1);
    expect(f[0]).toContain("x:0");
    expect(s8Failures([{ id: "x:0", outer: "-z", section: "twoWay", flow: "both" }, { id: "x:1", outer: null, section: "oneWay", flow: "+" }])).toEqual([]);
  });
});

describe("S9: Josh's Q3 (criterion 6)", () => {
  it("holds on the named cities, and it is not vacuous: some city has one-way streets next to each other", () => {
    let pairs = 0;
    eachCity((layer, o) => {
      expect(s9Failures(layer), tag(o)).toEqual([]);
      pairs += oneWayNeighbours(layer.streets, layer.junctions).length;
    });
    expect(pairs).toBeGreaterThan(0);
  });
  it("reads the same as a walk down every lattice column and row of the cells: the one-way streets it finds next to each other are those, and each pair runs opposite ways", () => {
    eachCity((layer, o) => {
      const byId = new Map(layer.streets.map((s) => [s.id, s] as const));
      const at = new Map(layer.cells.map((c) => [c.j * layer.w + c.i, c] as const));
      const own = (c: CityStreetCell | undefined, axis: "x" | "z"): string | null => (c && c.street !== null && (c.role === "lane" || c.role === "parkingPlain" || c.role === "pavement") && byId.get(c.street)!.axis === axis ? c.street : null);
      const found = new Set<string>();
      for (const axis of ["x", "z"] as const) {
        const lines = axis === "x" ? layer.w : layer.h;
        for (let p = 0; p < lines; p++) {
          const seq: string[] = [];
          for (let q = 0; q < (axis === "x" ? layer.h : layer.w); q++) {
            const c = axis === "x" ? at.get(q * layer.w + p) : at.get(p * layer.w + q);
            const id = own(c, axis);
            // a street cell that is not this axis's own (a junction, or the crossing street's cells) means the line runs along the other street there: it is between them, a barrier
            const here = id ?? (c ? "#" : null);
            if (here !== null && seq[seq.length - 1] !== here) seq.push(here);
          }
          for (let k = 0; k + 1 < seq.length; k++) if (seq[k] !== "#" && seq[k + 1] !== "#" && byId.get(seq[k]!)!.section !== "twoWay" && byId.get(seq[k + 1]!)!.section !== "twoWay") found.add(`${seq[k]}|${seq[k + 1]}`);
        }
      }
      const mine = new Set(oneWayNeighbours(layer.streets, layer.junctions).map(([a, b]) => `${a.id}|${b.id}`));
      expect(mine, tag(o)).toEqual(found);
      for (const k of found) {
        const [a, b] = k.split("|").map((id) => byId.get(id)!);
        expect(a!.flow, `${tag(o)} ${k}`).not.toBe(b!.flow);
      }
    });
  });
  const mk = (id: string, across0: number, section: CityStreetSection, flow: "both" | "+" | "-"): CityPlanStreet =>
    ({ id, axis: "x", across0, span: { lo: 1, hi: 50 }, section, flow, outer: null, bands: SECTION_BANDS[section][0]! }) as unknown as CityPlanStreet;
  it("fixture: two parallel one-way streets with the same flow and no street between them fail, naming both", () => {
    const f = s9Failures({ streets: [mk("x:1", 10, "oneWay", "+"), mk("x:2", 20, "oneWay", "+")], junctions: [] });
    expect(f).toHaveLength(1);
    expect(f[0]).toContain("x:1");
    expect(f[0]).toContain("x:2");
  });
  it("fixture: the opposite way, or a two-way street between them, passes", () => {
    expect(s9Failures({ streets: [mk("x:1", 10, "oneWay", "+"), mk("x:2", 20, "oneWay", "-")], junctions: [] })).toEqual([]);
    expect(s9Failures({ streets: [mk("x:1", 10, "oneWay", "+"), mk("x:3", 15, "twoWay", "both"), mk("x:2", 20, "oneWay", "+")], junctions: [] })).toEqual([]);
  });
});

describe("S10: a bare one-way street leaves every block a parking band of its own (criterion 7)", () => {
  it("holds on the named cities, read from the layer's blocks and streets", () => {
    eachCity((layer, o) => {
      expect(s10Failures(layer), tag(o)).toEqual([]);
      expect(s10Violations(layer), tag(o)).toEqual([]);
    });
  });
  it("reads the same as the cells: beside every bare one-way street each block has a parking cell of its own on another side", () => {
    eachCity((layer, o) => {
      const at = new Map(layer.cells.map((c) => [c.j * layer.w + c.i, c] as const));
      const byId = new Map(layer.streets.map((s) => [s.id, s] as const));
      for (const b of layer.blocks) {
        const sides = (["-x", "+x", "-z", "+z"] as const).map((side) => ({ side, street: b.sides[side].street }));
        // a parking cell of the side's street in the band next to the block's pavement
        const hasParking = (side: CitySide, street: string): boolean => {
          for (let q = side === "-z" || side === "+z" ? b.i0 : b.j0; q < (side === "-z" || side === "+z" ? b.i1 : b.j1); q++) {
            const c = side === "+z" ? at.get((b.j1 + 1) * layer.w + q) : side === "-z" ? at.get((b.j0 - 2) * layer.w + q) : side === "+x" ? at.get(q * layer.w + b.i1 + 1) : at.get(q * layer.w + b.i0 - 2);
            if (c?.role === "parkingPlain" && c.street === street) return true;
          }
          return false;
        };
        for (const own of sides) {
          if (byId.get(own.street)!.section !== "oneWayBare") continue;
          expect(sides.some((o) => o.side !== own.side && hasParking(o.side, o.street)), `${tag(o)} ${b.id} beside ${own.street}`).toBe(true);
        }
      }
    });
  });
  const bands = {
    bare: ["pavement", "lane", "pavement"] as CityStreetBand[],
    parkingFar: ["pavement", "lane", "lane", "parking", "pavement"] as CityStreetBand[],
    parkingNear: ["pavement", "parking", "lane", "lane", "pavement"] as CityStreetBand[],
  };
  const fixture = (right: CityStreetBand[]) => ({
    streets: [
      { id: "x:0", section: "oneWayBare" as const, bands: bands.bare },
      { id: "x:1", section: "twoWay" as const, bands: bands.parkingFar },
      { id: "z:0", section: "twoWay" as const, bands: bands.parkingFar },
      { id: "z:1", section: "twoWay" as const, bands: right },
    ],
    blocks: [{ id: "block:0:0", sides: { "-z": { street: "x:0" }, "+z": { street: "x:1" }, "-x": { street: "z:0" }, "+x": { street: "z:1" } } }],
  });
  it("fixture: a block whose only own band would be on a bare one-way street fails, naming the block and the street", () => {
    // its "+z" side takes bands[1], "-x" takes bands[1], "+x" takes bands[n - 2]: the far-parking streets and a near-parking street on its "+x" side give it no band of its own
    const f = s10Failures(fixture(bands.parkingNear));
    expect(f).toHaveLength(1);
    expect(f[0]).toContain("block:0:0");
    expect(f[0]).toContain("x:0");
  });
  it("fixture: the same block with one parking band of its own on another side passes", () => {
    expect(s10Failures(fixture(bands.parkingFar))).toEqual([]);
    expect(ownBand({ bands: bands.parkingFar }, "+x")).toBe(true);
    expect(ownBand({ bands: bands.parkingFar }, "+z")).toBe(false);
  });
});

describe("the lattice, for any section (criterion 8)", () => {
  it("centre_m on a one-way street is the middle of its lane cell; on a two-way street it is the centre line between the lanes", () => {
    eachCity((layer, o) => {
      for (const s of layer.streets) {
        const lanes = layer.cells.filter((c) => c.role === "lane" && c.street === s.id);
        const across = (c: CityStreetCell): number => (s.axis === "x" ? c.j : c.i);
        const set = [...new Set(lanes.map(across))].sort((a, b) => a - b);
        expect(set, `${tag(o)} ${s.id}`).toHaveLength(s.section === "twoWay" ? 2 : 1);
        const mid = s.section === "twoWay" ? (set[0]! + set[1]! + 1) / 2 : set[0]! + 0.5;
        expect(s.centre_m, `${tag(o)} ${s.id}`).toBe(mid * TILE_M);
      }
    });
  });
  it("a street's width is its own wherever it is used: no street overlaps another and every lattice cell is a street cell or in one block", () => {
    eachCity((layer, o) => {
      const seen = new Set<number>();
      for (const c of layer.cells) {
        const k = c.j * layer.w + c.i;
        expect(seen.has(k), `${tag(o)} (${c.i}, ${c.j})`).toBe(false);
        seen.add(k);
      }
      for (const b of layer.blocks) for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) expect(seen.has(j * layer.w + i)).toBe(false);
    });
  });
  it("a street lined up across another street is one street: a crossroads' two streets each have one section and one flow", () => {
    eachCity((layer) => {
      for (const j of layer.junctions.filter((x) => x.kind === "crossroads")) for (const m of j.streets) expect(layer.streets.filter((s) => s.id === m.street)).toHaveLength(1);
    });
  });
});

describe("junctions for any width (criterion 9)", () => {
  it("each junction is the two carriageways' rectangle of cells with role junction: 3, 2 or 1 cells each way, and none is bigger", () => {
    const sizes = new Set<string>();
    eachCity((layer, o) => {
      const role = new Map(layer.cells.map((c) => [`${c.i},${c.j}`, c.role] as const));
      const byId = new Map(layer.streets.map((s) => [s.id, s] as const));
      for (const j of layer.junctions) {
        const [x, z] = [j.streets.map((m) => byId.get(m.street)!).find((s) => s.axis === "x")!, j.streets.map((m) => byId.get(m.street)!).find((s) => s.axis === "z")!];
        const w = z.bands.length - 2;
        const h = x.bands.length - 2;
        expect([w, h].every((n) => n >= 1 && n <= 3), j.id).toBe(true);
        expect(j.cells, `${tag(o)} ${j.id}`).toHaveLength(w * h);
        for (const c of j.cells) expect(role.get(`${c.i},${c.j}`), `${tag(o)} ${j.id}`).toBe("junction");
        sizes.add(`${w}x${h}`);
      }
      expect([...role.values()].filter((r) => r === "junction")).toHaveLength(layer.junctions.reduce((n, j) => n + j.cells.length, 0));
    });
    expect(sizes.has("3x3")).toBe(true);
  });
  it("no plain parking cell lies in a junction or a crossing, and every junction has an arm traffic enters by and one it leaves by", () => {
    eachCity((layer, o) => {
      for (const c of layer.cells) if (c.role === "junction" || c.role === "crossing") expect(c.role).not.toBe("parkingPlain");
      expect(s7Failures({ streets: layer.streets, junctions: layer.junctions }).filter((f) => f.includes("no arm")), tag(o)).toEqual([]);
    });
  });
});

describe("the arrows (criterion 10)", () => {
  it("every arrow is on a lane cell of its own one-way street, points with the flow, and none is on a two-way street, a junction or a crossing", () => {
    eachCity((layer, o) => {
      const byId = new Map(layer.streets.map((s) => [s.id, s] as const));
      const at = new Map(layer.cells.map((c) => [c.j * layer.w + c.i, c] as const));
      for (const a of layer.arrows) {
        const s = byId.get(a.street)!;
        const where = `${tag(o)} ${a.street} (${a.i}, ${a.j})`;
        expect(s.flow, where).not.toBe("both");
        expect(at.get(a.j * layer.w + a.i), where).toMatchObject({ role: "lane", street: a.street });
        expect(a.toward, where).toBe(s.axis === "x" ? (s.flow === "+" ? "+x" : "-x") : s.flow === "+" ? "+z" : "-z");
      }
      const sorted = [...layer.arrows].sort((p, q) => p.j - q.j || p.i - q.i);
      expect(layer.arrows, tag(o)).toEqual(sorted);
      expect(new Set(layer.arrows.map((a) => `${a.i},${a.j}`)).size).toBe(layer.arrows.length);
    });
  });
  it("on each unbroken run of lane cells of a one-way street, the first cell in the way of traffic has an arrow, then one every ONE_WAY_ARROW_EVERY cells, and no other", () => {
    let runs = 0;
    eachCity((layer, o) => {
      const have = new Set(layer.arrows.map((a) => `${a.street}|${a.i},${a.j}`));
      const at = new Map(layer.cells.map((c) => [c.j * layer.w + c.i, c] as const));
      const want = new Set<string>();
      for (const s of oneWay(layer)) {
        const lane = layer.cells.filter((c) => c.role === "lane" && c.street === s.id);
        const pos = (c: { i: number; j: number }): number => (s.axis === "x" ? c.i : c.j);
        const cells = [...lane].sort((p, q) => (s.flow === "+" ? pos(p) - pos(q) : pos(q) - pos(p)));
        let run = 0;
        let prev = Number.NaN;
        for (const c of cells) {
          run = Math.abs(pos(c) - prev) === 1 ? run + 1 : 0; // a run is broken by a junction or a crossing: the next lane cell is not the next cell
          if (run === 0) runs++;
          prev = pos(c);
          if (run % ONE_WAY_ARROW_EVERY === 0) want.add(`${s.id}|${c.i},${c.j}`);
          expect(at.get(c.j * layer.w + c.i)!.role).toBe("lane");
        }
      }
      expect(have, tag(o)).toEqual(want);
    });
    expect(runs).toBeGreaterThan(0);
  });
});

describe("the picture (criterion 11)", () => {
  it("has nine legend entries: A4's seven, then one-way lane and one-way arrow", () => {
    expect(STREETS_LEGEND.map((e) => e.name)).toEqual(["lane", "parking band", "junction", "crossing", "pavement", "pavement corner", "block", "one-way lane", "one-way arrow"]);
  });
  for (const [x, z, s] of [[6, 6, 1], [6, 6, 9]] as const) {
    it(`${x} x ${z} seed ${s}: a one-way lane cell reads one-way lane, every other cell as before, and one point per arrow`, () => {
      const run = runCity({ blocksX: x, blocksZ: z, seed: s }, "streets");
      expect(run.ok).toBe(true);
      const layer = run.plan.layers.streets!;
      const pic = streetsStage.picture(run.plan);
      expect(pictureProblems(pic, layer.w, layer.h)).toEqual([]);
      const index = { lane: 0, parkingPlain: 1, junction: 2, crossing: 3, pavement: 4, pavementCorner: 5 } as const;
      const flows = new Map(layer.streets.map((st) => [st.id, st.section] as const));
      let seen = 0;
      for (const c of layer.cells) {
        const isOneWayLane = c.role === "lane" && flows.get(c.street!) !== "twoWay";
        if (isOneWayLane) seen++;
        expect(pic.cells[c.j * layer.w + c.i], `(${c.i}, ${c.j})`).toBe(isOneWayLane ? 7 : index[c.role]);
      }
      expect(seen).toBeGreaterThan(0);
      expect(pic.points).toEqual(layer.arrows.map((a) => ({ x_m: (a.i + 0.5) * TILE_M, z_m: (a.j + 0.5) * TILE_M, legend: 8 })));
    });
  }
});
