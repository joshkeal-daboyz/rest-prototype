/**
 * Stage 1 on the split plan (ticket 070 A4): criteria 2 to 10 and 12, on the named cities (A4d: 6 x 6 seeds 1 to 10, the default seed 1 first). Each city is laid once, through a module cache.
 * No test asserts a block count (R-7, Josh Q10). `JUNCTION_GAP_MIN_CELLS` is PROVISIONAL and is read by name. `T_SHARE_MIN` is Decided (Josh, 20 Nov 2026: 30%) and is pinned below.
 * Ticket 070 A4b made these checks width-aware (a one-way street is 4 or 3 cells, a junction is the two carriageways' rectangle); its own criteria are in `oneway.test.ts`.
 */
import { describe, expect, it } from "vitest";
import type { CityCell, CityJunction, CitySide, CityStreetBand, CityStreetsLayer } from "../../core";
import { CityStageError } from "../pipeline/error";
import { BLOCK_LONG_ENOUGH_CELLS, blockSizeFailures, coverageProblems, evaluateStreets, innerTShare, s1Failures, s3Failures, s5Failures, streetWidthFailures, streetsVariety, tOf } from "./check";
import { BLOCK_DRAWS_MAX, SPLIT_DRAWS_MAX, CITY_BLOCKS_MAX, BLOCK_MEAN_MIN_CELLS, BLOCK_TILES, JUNCTION_GAP_MIN_CELLS, SECTION_CELLS, STREET_CELLS, T_SHARE_MIN } from "./constants";
import { blockSizes, cvOf, layStreets } from "./layout";
import { laySplit, type SplitLayout } from "./split";

const NAMED: { blocksX: number; blocksZ: number; seed: number }[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 6, blocksZ: 6, seed });

const cache = new Map<string, SplitLayout>();
const laid = (o: { blocksX: number; blocksZ: number; seed: number }): SplitLayout => {
  const key = `${o.blocksX}x${o.blocksZ}:${o.seed}`;
  let r = cache.get(key);
  if (!r) {
    r = laySplit(o.seed, o.blocksX, o.blocksZ);
    cache.set(key, r);
  }
  return r;
};
const eachCity = (f: (layer: CityStreetsLayer, o: (typeof NAMED)[number], r: SplitLayout) => void): void => {
  for (const o of NAMED) f(laid(o).layer, o, laid(o));
};
const tag = (o: (typeof NAMED)[number]): string => `${o.blocksX}x${o.blocksZ} seed ${o.seed}`;
const TWO_WAY: readonly CityStreetBand[] = ["pavement", "parking", "lane", "lane", "pavement"];
const THREE: readonly CityStreetBand[] = ["pavement", "lane", "pavement"];

describe("the outline (criterion 2)", () => {
  it("is today's ground: w, h, the four edge streets' across0, bands and profile, and the draw", () => {
    eachCity((layer, o) => {
      const lat = layStreets(o.seed, o.blocksX, o.blocksZ);
      expect(layer.w, tag(o)).toBe(lat.w);
      expect(layer.h, tag(o)).toBe(lat.h);
      const edge = (axis: "x" | "z", outer: CitySide) => layer.streets.find((s) => s.axis === axis && s.outer === outer)!;
      const pairs: [CitySide, "x" | "z", number][] = [["-z", "x", 0], ["+z", "x", o.blocksZ], ["-x", "z", 0], ["+x", "z", o.blocksX]];
      for (const [outer, axis, line] of pairs) {
        const want = lat.streets.find((s) => s.axis === axis && s.line === line)!;
        const got = edge(axis, outer);
        expect({ a: got.across0, b: got.bands, p: got.profile }, `${tag(o)} ${outer}`).toEqual({ a: want.across0, b: want.bands, p: want.profile });
      }
      expect(layer.outline, tag(o)).toEqual({ i0: STREET_CELLS, i1: lat.w - STREET_CELLS, j0: STREET_CELLS, j1: lat.h - STREET_CELLS, draw: blockSizes(o.seed, o.blocksX, o.blocksZ).draw });
    });
  });
});

describe("the split (criterion 3)", () => {
  it("every other street is a cut: profile street, its section's width (5, 4 or 3 cells), a parking side by hash, and never an edge street", () => {
    eachCity((layer, o) => {
      for (const s of layer.streets) {
        expect(s.profile, `${tag(o)} ${s.id}`).toBe("street");
        expect(s.bands, s.id).toHaveLength(SECTION_CELLS[s.section]);
        expect(s.bands.filter((b) => b === "parking"), s.id).toHaveLength(s.section === "oneWayBare" ? 0 : 1);
        expect(s.carriage.hi_m - s.carriage.lo_m, s.id).toBe((s.bands.length - 2) * 5);
      }
      expect(layer.streets.filter((s) => s.outer === null).length, tag(o)).toBeGreaterThan(0);
    });
  });
  it("collinear streets never overlap: where two cuts meet across a street they are one street, a crossroads", () => {
    eachCity((layer, o) => {
      for (const a of layer.streets) {
        for (const b of layer.streets) {
          if (a.id >= b.id || a.axis !== b.axis || a.across0 !== b.across0) continue;
          expect(a.span.hi <= b.span.lo || b.span.hi <= a.span.lo, `${tag(o)} ${a.id} ${b.id}`).toBe(true);
        }
      }
      for (const j of layer.junctions.filter((x) => x.kind === "crossroads")) expect(j.streets.every((m) => m.passes)).toBe(true);
    });
  });
  it("is the same for the same seed, and finishes on every named city (no draw left over)", () => {
    eachCity((layer, o, r) => {
      expect(laySplit(o.seed, o.blocksX, o.blocksZ).layer, tag(o)).toEqual(layer);
      expect(r.draw).toBeLessThanOrEqual(SPLIT_DRAWS_MAX);
    });
  });
  it("fails with the rule named when every draw misses (R-2): there is no fallback list", () => {
    let err: unknown;
    try {
      laySplit(1, 3, 3, () => [{ rule: "S3", reason: "S3: a near miss" }]);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(CityStageError);
    expect((err as CityStageError).reason).toMatch(/^S3: no split of the 3 x 3 ground held every rule in 129 draws/);
  });
});

describe("S1: every street ends on a street (criterion 4)", () => {
  it("holds on the named cities: ends name junctions that list the street as ending, and each kind has its streets and arms", () => {
    eachCity((layer, o) => {
      expect(s1Failures(layer), tag(o)).toEqual([]);
      const byId = new Map(layer.junctions.map((j) => [j.id, j] as const));
      for (const s of layer.streets) {
        expect(s.ends, s.id).toHaveLength(2);
        for (const e of s.ends) {
          const j = byId.get(e.junction)!;
          expect(j, `${s.id} ${e.junction}`).toBeDefined();
          expect(j.streets.find((m) => m.street === s.id)?.passes, `${s.id} at ${j.id}`).toBe(false);
          // the end is a real junction in the cells: its cells (the two carriageways' rectangle) are junction cells
          for (const c of j.cells) expect(layer.cells.find((x) => x.i === c.i && x.j === c.j)?.role, `${j.id}`).toBe("junction");
        }
      }
      for (const j of layer.junctions) {
        const passing = j.streets.filter((m) => m.passes).length;
        const want = { corner: [0, 2], T: [1, 3], crossroads: [2, 4] }[j.kind]!;
        expect([passing, j.arms.length], j.id).toEqual(want);
        expect(j.streets.length, j.id).toBe(2);
      }
    });
  });
  it("fails a street whose end touches no street, naming the street", () => {
    const streets = [{ id: "z:9", axis: "z" as const, across0: 20, bands: THREE, ends: [{ junction: "junction:21:1" }, { junction: "junction:21:30" }] as const }];
    const failures = s1Failures({ streets, junctions: [] });
    expect(failures).toHaveLength(2);
    expect(failures[0]).toContain("z:9");
    expect(failures[0]).toContain("S1");
  });
  it("fails a junction whose street list does not agree with its kind", () => {
    const j = { id: "junction:1:1", kind: "T" as const, streets: [{ street: "x:0", passes: true }, { street: "z:0", passes: true }], arms: ["-x", "+x", "-z", "+z"] as CitySide[] };
    const failures = s1Failures({ streets: [], junctions: [j] });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("junction:1:1");
  });
});

describe("S2: a T is a crossroads with one arm missing (criterion 5; width-aware from A4b)", () => {
  it("every T: the carriageways' rectangle of junction cells, one row of crossings across the ending street, one across the through street each side of it, 2 pavement corners on the ending street's side, the ending street's full width of pavement opposite it, and no parking cell among them", () => {
    let ts = 0;
    eachCity((layer, o) => {
      const role = new Map<string, string>(layer.cells.map((c) => [`${c.i},${c.j}`, c.role] as const));
      const at = (i: number, j: number): string | undefined => role.get(`${i},${j}`);
      for (const j of layer.junctions.filter((x) => x.kind === "T")) {
        ts++;
        const t = tOf(j)!;
        const where = `${tag(o)} ${j.id}`;
        const [cmin, cmax] = [Math.min(...j.cells.map((c) => c.i)), Math.max(...j.cells.map((c) => c.i))];
        const [rmin, rmax] = [Math.min(...j.cells.map((c) => c.j)), Math.max(...j.cells.map((c) => c.j))];
        expect(j.cells, where).toHaveLength((cmax - cmin + 1) * (rmax - rmin + 1));
        for (let r = rmin; r <= rmax; r++) for (let c = cmin; c <= cmax; c++) expect(at(c, r), where).toBe("junction");
        const got: string[] = [];
        const want: string[] = [];
        const along = t.arm === "-z" || t.arm === "+z"; // the ending street runs along z: its carriageway is the rectangle's columns
        const [lo, hi] = along ? [cmin, cmax] : [rmin, rmax]; // across the ending street (its carriageway)
        const [tlo, thi] = along ? [rmin, rmax] : [cmin, cmax]; // along it (the through street's carriageway)
        const near = t.arm === "-z" || t.arm === "-x" ? tlo - 1 : thi + 1;
        const far = t.arm === "-z" || t.arm === "-x" ? thi + 1 : tlo - 1;
        const cell = (u: number, p: number): string | undefined => (along ? at(p, u) : at(u, p)); // u along the ending street's axis, p across it
        for (let p = lo; p <= hi; p++) (got.push(cell(near, p)!), want.push("crossing")); // across the ending street, on the near row
        (got.push(cell(near, lo - 1)!, cell(near, hi + 1)!), want.push("pavementCorner", "pavementCorner"));
        for (let u = tlo; u <= thi; u++) (got.push(cell(u, lo - 1)!, cell(u, hi + 1)!), want.push("crossing", "crossing")); // across the through street, each side of it
        for (let p = lo - 1; p <= hi + 1; p++) (got.push(cell(far, p)!), want.push("pavement")); // the far side: the through street's pavement straight past, the ending street's full width
        expect(got, where).toEqual(want);
        expect(hi - lo + 3, where).toBe(layer.streets.find((x) => x.id === t.ending)!.bands.length);
      }
      // a plain parking cell lies on its street's parking band, and on no other band
      const byId = new Map(layer.streets.map((s) => [s.id, s] as const));
      for (const c of layer.cells) if (c.role === "parkingPlain") expect(byId.get(c.street!)!.bands[c.band], `parking cell (${c.i}, ${c.j})`).toBe("parking");
    });
    expect(ts).toBeGreaterThan(0);
  });
  it("street cells keep today's fields: junction and corner cells have no street, a crossing has no band, a band cell has one", () => {
    eachCity((layer) => {
      for (const c of layer.cells) {
        if (c.role === "junction" || c.role === "pavementCorner") expect(c.street).toBeNull();
        else expect(c.street).not.toBeNull();
        if (c.role === "crossing") expect(c.band).toBe(-1);
        if (c.role === "lane" || c.role === "parkingPlain" || c.role === "pavement") expect(c.band).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describe("S3: junction spacing (criterion 6)", () => {
  it("holds on the named cities", () => {
    eachCity((layer, o) => expect(s3Failures(layer), tag(o)).toEqual([]));
  });
  const fixture = (gap: number, second: readonly CityStreetBand[] = TWO_WAY) => {
    const streets = [
      { id: "x:1", axis: "x" as const, across0: 10, bands: TWO_WAY, ends: [{ junction: "a" }, { junction: "b" }] as const },
      { id: "x:2", axis: "x" as const, across0: 10 + gap, bands: second, ends: [{ junction: "c" }, { junction: "d" }] as const },
      { id: "z:1", axis: "z" as const, across0: 30, bands: TWO_WAY, ends: [{ junction: "e" }, { junction: "f" }] as const },
    ];
    const t = (id: string, ending: string, arm: CitySide) => ({
      id,
      kind: "T" as const,
      streets: [{ street: ending, passes: false }, { street: "z:1", passes: true }],
      arms: ["-z", "+z", arm] as CitySide[],
    });
    return { streets, junctions: [t("junction:31:11", "x:1", "-x"), t(`junction:31:${11 + gap}`, "x:2", "+x")] };
  };
  it("fixture: two ends one cell under JUNCTION_GAP_MIN_CELLS apart fail, naming both streets", () => {
    const failures = s3Failures(fixture(JUNCTION_GAP_MIN_CELLS - 1));
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("x:1");
    expect(failures[0]).toContain("x:2");
  });
  it("fixture: two ends JUNCTION_GAP_MIN_CELLS apart pass", () => {
    expect(s3Failures(fixture(JUNCTION_GAP_MIN_CELLS))).toEqual([]);
  });
  it("fixture: the gap is between centre lines, so a 3-cell street JUNCTION_GAP_MIN_CELLS across0 away from a 5-cell one is a cell too near, and one more cell away passes", () => {
    expect(s3Failures(fixture(JUNCTION_GAP_MIN_CELLS, THREE))).toHaveLength(1);
    expect(s3Failures(fixture(JUNCTION_GAP_MIN_CELLS + 1, THREE))).toEqual([]);
  });
});

describe("S4: blocks (criterion 7)", () => {
  it("every block is a rectangle with a street on all four sides, each side 6 to 16 cells; blockSizesWork's two tests hold over blocks", () => {
    eachCity((layer, o) => {
      expect(blockSizeFailures(layer.blocks), tag(o)).toEqual([]);
      for (const b of layer.blocks) {
        for (const len of [b.i1 - b.i0, b.j1 - b.j0]) {
          expect(len, `${tag(o)} ${b.id}`).toBeGreaterThanOrEqual(BLOCK_TILES.min);
          expect(len, `${tag(o)} ${b.id}`).toBeLessThanOrEqual(BLOCK_TILES.max);
        }
        expect(Math.max(b.i1 - b.i0, b.j1 - b.j0), b.id).toBeGreaterThanOrEqual(BLOCK_LONG_ENOUGH_CELLS);
        for (const s of ["-x", "+x", "-z", "+z"] as const) expect(b.sides[s].street, `${b.id} ${s}`).toMatch(/^[xz]:\d+$/);
      }
      const mean = (f: (b: (typeof layer.blocks)[number]) => number): number => layer.blocks.reduce((n, b) => n + f(b), 0) / layer.blocks.length;
      expect(mean((b) => b.i1 - b.i0)).toBeGreaterThanOrEqual(BLOCK_MEAN_MIN_CELLS);
      expect(mean((b) => b.j1 - b.j0)).toBeGreaterThanOrEqual(BLOCK_MEAN_MIN_CELLS);
    });
  });
  it("every lattice cell is a street cell or in exactly one block", () => {
    eachCity((layer, o) => expect(coverageProblems(layer), tag(o)).toEqual([]));
  });
  it("bi and bj are ranks of i0 and j0; ids are block:<bi>:<bj> and unique", () => {
    eachCity((layer, o) => {
      const i0s = [...new Set(layer.blocks.map((b) => b.i0))].sort((a, b) => a - b);
      const j0s = [...new Set(layer.blocks.map((b) => b.j0))].sort((a, b) => a - b);
      for (const b of layer.blocks) {
        expect(b.bi, `${tag(o)} ${b.id}`).toBe(i0s.indexOf(b.i0));
        expect(b.bj, `${tag(o)} ${b.id}`).toBe(j0s.indexOf(b.j0));
        expect(b.id).toBe(`block:${b.bi}:${b.bj}`);
      }
      expect(new Set(layer.blocks.map((b) => b.id)).size).toBe(layer.blocks.length);
    });
  });
  it("fixture: a side of 5, a side of 17, and blocks with no side of 7 fail, naming the block", () => {
    const f = blockSizeFailures([
      { id: "a", i0: 0, i1: 5, j0: 0, j1: 10 },
      { id: "b", i0: 0, i1: 17, j0: 0, j1: 10 },
      { id: "c", i0: 0, i1: 6, j0: 0, j1: 6 },
    ]);
    expect(f.filter((x) => x.startsWith("a:") || x.startsWith("b:") || x.startsWith("c:"))).toHaveLength(3);
  });
});

describe("S5: Ts are common (criterion 8)", () => {
  it("at least T_SHARE_MIN of the inner junctions are Ts on the named cities", () => {
    eachCity((layer, o) => {
      expect(layer.junctions.some((j) => j.inner), tag(o)).toBe(true);
      expect(innerTShare(layer.junctions), tag(o)).toBeGreaterThanOrEqual(T_SHARE_MIN);
      expect(s5Failures(layer.junctions), tag(o)).toEqual([]);
      for (const j of layer.junctions) expect(j.inner, j.id).toBe(j.streets.every((m) => layer.streets.find((s) => s.id === m.street)!.outer === null));
    });
  });
  it("T_SHARE_MIN is Josh's 0.30 (Decided, 20 Nov 2026)", () => {
    expect(T_SHARE_MIN).toBe(0.3);
  });
  it("fixture: today's lattice (the default city's junctions) fails S5", () => {
    const lat = layStreets(1, 6, 6);
    const edge = (line: number, last: number): boolean => line === 0 || line === last;
    const xs = lat.streets.filter((s) => s.axis === "x");
    const zs = lat.streets.filter((s) => s.axis === "z");
    const junctions: Pick<CityJunction, "kind" | "inner">[] = [];
    for (const x of xs) for (const z of zs) junctions.push({ kind: "crossroads", inner: !edge(x.line, xs.length - 1) && !edge(z.line, zs.length - 1) });
    expect(junctions.some((j) => j.inner)).toBe(true);
    expect(innerTShare(junctions)).toBe(0);
    expect(s5Failures(junctions)).toHaveLength(1);
  });
});

describe("what later stages read (criterion 9)", () => {
  const opposite: Record<CitySide, CitySide> = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" };
  it("every block has its four sides, each naming the street along it", () => {
    eachCity((layer, o) => {
      const streets = new Map(layer.streets.map((s) => [s.id, s] as const));
      for (const b of layer.blocks) {
        expect(Object.keys(b.sides).sort(), b.id).toEqual(["+x", "+z", "-x", "-z"]);
        // the street whose pavement touches the block edge: it begins at the edge on the "+" sides and ends there on the "-" sides
        const touch: Record<CitySide, [string, number, "first" | "last"]> = { "-z": ["x", b.j0, "last"], "+z": ["x", b.j1, "first"], "-x": ["z", b.i0, "last"], "+x": ["z", b.i1, "first"] };
        for (const s of ["-x", "+x", "-z", "+z"] as const) {
          const st = streets.get(b.sides[s].street)!;
          const [axis, edge, from] = touch[s];
          expect([st.axis, from === "first" ? st.across0 : st.across0 + st.bands.length], `${tag(o)} ${b.id} ${s}`).toEqual([axis, edge]);
          const along = s === "-z" || s === "+z" ? [b.i0, b.i1] : [b.j0, b.j1];
          expect([b.sides[s].span.lo, b.sides[s].span.hi]).toEqual(along);
          expect(st.span.lo <= along[0]! && along[1]! <= st.span.hi, `${b.id} ${s} inside ${st.id}`).toBe(true);
        }
      }
    });
  });
  it("on every side not facing out, across and junctions are disjoint and cover the side's span exactly; a side facing out has both empty", () => {
    eachCity((layer, o) => {
      const streets = new Map(layer.streets.map((s) => [s.id, s] as const));
      let outs = 0;
      for (const b of layer.blocks) {
        for (const s of ["-x", "+x", "-z", "+z"] as const) {
          const side = b.sides[s];
          const where = `${tag(o)} ${b.id} ${s}`;
          if (streets.get(side.street)!.outer === s) {
            outs++;
            expect([side.across, side.junctions], where).toEqual([[], []]);
            continue;
          }
          const marks = new Array<number>(side.span.hi - side.span.lo).fill(0);
          const spans = [...side.across.map((a) => a.span), ...side.junctions.map((j) => j.span)];
          for (const sp of spans) for (let k = sp.lo; k < sp.hi; k++) marks[k - side.span.lo]!++;
          expect(marks.every((m) => m === 1), `${where} ${JSON.stringify(spans)}`).toBe(true);
          expect(side.across.length, where).toBeGreaterThan(0);
        }
      }
      expect(outs, tag(o)).toBeGreaterThan(0);
    });
  });
  it("across is symmetric: when A lists B across its side with span s, B lists A across its opposite side with the same s", () => {
    eachCity((layer, o) => {
      const byId = new Map(layer.blocks.map((b) => [b.id, b] as const));
      for (const a of layer.blocks) {
        for (const s of ["-x", "+x", "-z", "+z"] as const) {
          for (const x of a.sides[s].across) {
            const back = byId.get(x.block)!.sides[opposite[s]];
            expect(back.street, `${tag(o)} ${a.id} ${s}`).toBe(a.sides[s].street);
            expect(back.across.find((y) => y.block === a.id)?.span, `${tag(o)} ${a.id} ${s} -> ${x.block}`).toEqual(x.span);
          }
        }
      }
    });
  });
  it("a side's junctions entry names a T whose ending street is opposite it, over that street's full width (5, 4 or 3 cells)", () => {
    eachCity((layer, o) => {
      const streets = new Map(layer.streets.map((s) => [s.id, s] as const));
      const juncs = new Map(layer.junctions.map((j) => [j.id, j] as const));
      let seen = 0;
      for (const b of layer.blocks) {
        for (const s of ["-x", "+x", "-z", "+z"] as const) {
          for (const f of b.sides[s].junctions) {
            seen++;
            const j = juncs.get(f.junction)!;
            const t = tOf(j)!;
            expect(j.kind).toBe("T");
            expect(t.through, `${tag(o)} ${b.id} ${s}`).toBe(b.sides[s].street);
            expect(t.ending).toBe(f.street);
            expect(t.arm).toBe(s);
            expect(f.span).toEqual({ lo: streets.get(f.street)!.across0, hi: streets.get(f.street)!.across0 + streets.get(f.street)!.bands.length });
          }
        }
      }
      expect(seen, tag(o)).toBeGreaterThan(0);
    });
  });
  it("each street's span runs from its low end's junction square to its high end's, and outer is set on exactly the four edge streets", () => {
    eachCity((layer, o) => {
      for (const s of layer.streets) {
        const sq = (id: string): number[] => id.split(":").slice(1).map(Number);
        const [lo, hi] = [sq(s.ends[0].junction), sq(s.ends[1].junction)];
        const k = s.axis === "x" ? 0 : 1;
        // the high end's junction is as wide along the axis as the street it ends on has carriageway
        const hiJunction = layer.junctions.find((x) => x.id === s.ends[1].junction)!;
        const hiWidth = new Set(hiJunction.cells.map((c) => (s.axis === "x" ? c.i : c.j))).size;
        expect([s.span.lo, s.span.hi], `${tag(o)} ${s.id}`).toEqual([lo[k]!, hi[k]! + hiWidth]);
        expect(lo[1 - k], s.id).toBe(s.across0 + 1);
      }
      expect(layer.streets.filter((s) => s.outer !== null).map((s) => s.outer).sort(), tag(o)).toEqual(["+x", "+z", "-x", "-z"]);
      expect(layer.streets.map((s) => s.id).length, tag(o)).toBe(new Set(layer.streets.map((s) => s.id)).size);
      // the junction list is every junction once, row-major by its low corner cell
      const cells: CityCell[] = layer.junctions.map((j) => j.cells[0]!);
      for (let k = 1; k < cells.length; k++) expect(cells[k]!.j > cells[k - 1]!.j || (cells[k]!.j === cells[k - 1]!.j && cells[k]!.i > cells[k - 1]!.i)).toBe(true);
    });
  });
});

describe("V1 reworded, V2 unchanged, street width (criterion 10)", () => {
  it("hold on every street and block of the named cities", () => {
    eachCity((layer, o) => {
      expect(streetWidthFailures(layer), tag(o)).toEqual([]);
      for (const v of evaluateStreets(layer)) expect(v.pass, `${tag(o)} ${v.id}`).toBe(true);
    });
  });
  it("on a lattice the new reading (over all blocks) and the old (one size per column and row) give the same number", () => {
    const lat = layStreets(1, 6, 6);
    const v = streetsVariety(lat);
    expect(v.cvX).toBeCloseTo(cvOf(lat.sizes.widths), 12);
    expect(v.cvZ).toBeCloseTo(cvOf(lat.sizes.depths), 12);
    expect(v.blocks).toBe(lat.sizes.widths.length * lat.sizes.depths.length);
  });
});

describe("the split's own limit and the default 6 x 6 city (A4d criterion 1, R-7)", () => {
  it("SPLIT_DRAWS_MAX is 128 (Josh, 20 Nov 2026, Q18: \"yes, yes\") and BLOCK_DRAWS_MAX, the outline's, stays 64", () => {
    expect(SPLIT_DRAWS_MAX).toBe(128);
    expect(BLOCK_DRAWS_MAX).toBe(64);
  });
  it("the named cities are 10, the default 6 x 6 seed 1 first, at the largest size", () => {
    expect(NAMED).toHaveLength(10);
    expect(NAMED[0]).toEqual({ blocksX: 6, blocksZ: 6, seed: 1 });
    expect(NAMED.every((o) => o.blocksX === CITY_BLOCKS_MAX && o.blocksZ === CITY_BLOCKS_MAX)).toBe(true);
    expect(coverageProblems(laid(NAMED[0]!).layer)).toEqual([]);
  });
});
