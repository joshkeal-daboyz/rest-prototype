/**
 * Ticket 056 A: the parking checks P1 to P6 (`parkmetrics.ts`). Each passes on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4; P1, P2, P3, P4 and P6 fail on a city
 * laid by 055's rule (every parking cell of every band paired, three lots, built here from a laid city's own cells); P5 fails on a city with one build-out turned to plain asphalt.
 * No three, no WebGL, no assets: every city is pure data, and nothing reads a file but this one's neighbour's source for the purity check.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BAYS_PER_100M_MAX, BAYS_PER_PARKING_TILE, BAY_JUNCTION_CLEAR, LOT_STALLS, TILE_M, tileCity, type ParkingBay, type TileCell, type TileCity, type TileRole } from "./tilecity";
import { PARK_CHECK, evaluateParking, parkingMetrics, type ParkCheckId } from "./parkmetrics";

const CITIES: { label: string; city: TileCity }[] = [
  { label: "default", city: tileCity() },
  ...Array.from({ length: 10 }, (_, k) => ({ label: `3x3 seed ${k + 1}`, city: tileCity({ blocksX: 3, blocksZ: 3, seed: k + 1 }) })),
  ...[1, 2, 3].map((seed) => ({ label: `6x4 seed ${seed}`, city: tileCity({ blocksX: 6, blocksZ: 4, seed }) })),
];

const verdict = (city: TileCity, id: ParkCheckId): { id: ParkCheckId; value: number; pass: boolean } => evaluateParking(parkingMetrics(city)).find((v) => v.id === id)!;

/**
 * A test-only copy of 055's rule on a laid city's own cells: every parking-band cell of every band between two crossings is paired into `ParkingLines_01` tiles, except the cell next to each
 * crossing and the cells in front of a kerb cut, whether the band faces a block or the yard outside an edge street; no build-outs and no trees; three lots (the first 18 stalls). The bays are the
 * tiles' three each, and each serves the block its side faces, or "outer".
 */
function todaysRule(city: TileCity): TileCity {
  const streets = new Map(city.streets.map((s) => [s.id, s] as const));
  const roleAt = new Map<string, TileRole>();
  const key = (i: number, j: number): string => `${i}:${j}`;
  /** Every unit cell of a parking band: its street, its place along the street and its row or column, and its yaw. */
  const band: { street: string; a: number; across: number; yaw: TileCell["yaw"] }[] = [];
  const kept: TileCell[] = [];
  for (const c of city.cells) {
    const x = c.street !== null && streets.get(c.street)?.axis === "x";
    for (let k = 0; k < c.cells; k++) {
      const i = c.i + (x ? k : 0);
      const j = c.j + (x ? 0 : k);
      roleAt.set(key(i, j), c.role);
      if (c.role === "parking" || c.role === "parkingPlain" || c.role === "buildout") band.push({ street: c.street!, a: x ? i : j, across: x ? j : i, yaw: c.yaw });
    }
    if (c.role !== "parking" && c.role !== "parkingPlain" && c.role !== "buildout") kept.push(c);
  }
  const blockAt = (i: number, j: number): string => city.blocks.find((b) => i >= b.i0 && i < b.i1 && j >= b.j0 && j < b.j1)?.id ?? "outer";
  const bays: ParkingBay[] = [];
  const groups = new Map<string, typeof band>();
  for (const q of band) groups.set(`${q.street}|${q.across}`, [...(groups.get(`${q.street}|${q.across}`) ?? []), q]);
  for (const list of groups.values()) {
    list.sort((p, q) => p.a - q.a);
    const s = streets.get(list[0]!.street)!;
    const x = s.axis === "x";
    const across = list[0]!.across;
    const yaw = list[0]!.yaw;
    const out = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
    const cell = (a: number, tile: boolean): TileCell => ({
      i: x ? a : across,
      j: x ? across : a,
      cells: tile ? 2 : 1,
      role: tile ? "parking" : "parkingPlain",
      variant: 0,
      x_m: x ? (a + (tile ? 1 : 0.5)) * TILE_M : (across + 0.5) * TILE_M,
      z_m: x ? (across + 0.5) * TILE_M : (a + (tile ? 1 : 0.5)) * TILE_M,
      yaw,
      street: s.id,
    });
    for (let n = 0; n < list.length; ) {
      let e = n;
      while (e + 1 < list.length && list[e + 1]!.a === list[e]!.a + 1) e++;
      const a0 = list[n]!.a;
      const a1 = list[e]!.a + 1;
      const block = x ? blockAt(a0, across + 2 * out) : blockAt(across + 2 * out, a0);
      const free = (q: number): boolean => q >= a0 + BAY_JUNCTION_CLEAR && q < a1 - BAY_JUNCTION_CLEAR && roleAt.get(x ? key(q, across + out) : key(across + out, q)) !== "kerbCut";
      for (let q = a0; q < a1; ) {
        if (free(q) && free(q + 1)) {
          kept.push(cell(q, true));
          for (let b = 0; b < BAYS_PER_PARKING_TILE; b++) {
            const along = (q + (b + 0.5) * (2 / BAYS_PER_PARKING_TILE)) * TILE_M;
            bays.push({ x_m: x ? along : (across + 0.5) * TILE_M, z_m: x ? (across + 0.5) * TILE_M : along, yaw, w_m: (2 * TILE_M) / BAYS_PER_PARKING_TILE, d_m: TILE_M, street: s.id, block, serves: block });
          }
          q += 2;
        } else {
          kept.push(cell(q, false));
          q++;
        }
      }
      n = e + 1;
    }
  }
  return { ...city, cells: kept, bays, lotStalls: city.lotStalls.slice(0, 3 * LOT_STALLS), buildoutTrees: [] };
}

describe("the parking checks (criterion 6)", () => {
  it("pins PARK_CHECK: 0 violations for P1 to P5 and BAYS_PER_100M_MAX bays per 100 m for P6", () => {
    expect(PARK_CHECK).toEqual({ P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 6 });
    expect(PARK_CHECK.P6).toBe(BAYS_PER_100M_MAX);
  });

  it("returns one verdict per check, in order", () => {
    expect(evaluateParking(parkingMetrics(CITIES[0]!.city)).map((v) => v.id)).toEqual(["P1", "P2", "P3", "P4", "P5", "P6"]);
  });

  it("passes every check on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4", () => {
    const fails: string[] = [];
    for (const { label, city } of CITIES) for (const v of evaluateParking(parkingMetrics(city))) if (!v.pass) fails.push(`${label} ${v.id} ${v.value}`);
    expect(fails).toEqual([]);
  });

  it("is not vacuous: bays, lots, build-outs and trees are measured", () => {
    for (const { label, city } of CITIES) {
      const m = parkingMetrics(city);
      expect(m.kerbBays, label).toBeGreaterThan(5);
      expect(m.lotStalls, label).toBeGreaterThanOrEqual(LOT_STALLS);
      expect(m.runs.length, label).toBeGreaterThan(3);
      expect(m.sideShares.length, label).toBeGreaterThan(3);
      expect(m.kerbMetres, label).toBeGreaterThan(100);
      expect(city.buildoutTrees.length, label).toBeGreaterThan(0);
    }
  });
});

describe("the checks fail where they should", () => {
  const base = CITIES[0]!.city;
  const old = todaysRule(base);

  it("holds today's pairing as the failing fixture: its numbers are today's (hundreds of bays, three lots)", () => {
    const m = parkingMetrics(old);
    expect(m.kerbBays).toBeGreaterThan(300);
    expect(m.lotStalls).toBe(3 * LOT_STALLS);
    expect(m.outerBays).toBeGreaterThan(30);
    expect(m.bays100m).toBeGreaterThan(15);
  });

  it.each(["P1", "P2", "P3", "P4", "P6"] as const)("fails %s on a city laid by 055's rule", (id) => {
    const v = verdict(old, id);
    expect(v.pass, `${id} ${v.value}`).toBe(false);
  });

  it("fails P5 on a city with one build-out turned to plain asphalt away from any kerb cut, and nothing else of the base fails", () => {
    const target = base.cells.find((c) => c.role === "buildout")!;
    const turned: TileCity = { ...base, cells: base.cells.map((c) => (c === target ? { ...c, role: "parkingPlain" as const } : c)) };
    expect(verdict(turned, "P5").pass).toBe(false);
    for (const id of ["P1", "P2", "P3", "P4", "P6"] as const) expect(verdict(turned, id).pass, id).toBe(true);
  });

  it("fails P5 on a missing tree, an extra tree and a tree on a cell next to a crossing", () => {
    const [first, ...rest] = base.buildoutTrees;
    expect(verdict({ ...base, buildoutTrees: rest }, "P5").pass).toBe(false);
    expect(verdict({ ...base, buildoutTrees: [...base.buildoutTrees, { ...first!, x_m: first!.x_m + TILE_M }] }, "P5").pass).toBe(false);
  });

  it("fails each check on its own broken number", () => {
    const m = parkingMetrics(base);
    const fails = (patch: Partial<typeof m>, id: ParkCheckId): boolean => !evaluateParking({ ...m, ...patch }).find((v) => v.id === id)!.pass;
    expect(fails({ kerbBays: m.bayDemand * 2 }, "P1")).toBe(true);
    expect(fails({ blocksWithoutBays: 1 }, "P1")).toBe(true);
    expect(fails({ lotStalls: Math.floor(m.stallDemand * 0.5) }, "P2")).toBe(true);
    expect(fails({ blocksOverLots: 1 }, "P2")).toBe(true);
    expect(fails({ shortBlocks: m.blocks }, "P2")).toBe(true);
    expect(fails({ outerBays: 1 }, "P3")).toBe(true);
    expect(fails({ sideShares: [{ street: "x:1", block: "block:0:0", share: 0.5, cap: 0.4 }] }, "P3")).toBe(true);
    expect(fails({ runs: [3] }, "P4")).toBe(true);
    expect(fails({ gaps: [5] }, "P4")).toBe(true);
    expect(fails({ bayNextToCrossing: 1 }, "P4")).toBe(true);
    expect(fails({ badBandCells: 1 }, "P5")).toBe(true);
    expect(fails({ badTrees: 1 }, "P5")).toBe(true);
    expect(fails({ bays100m: BAYS_PER_100M_MAX + 0.1 }, "P6")).toBe(true);
  });
});

describe("pure (criterion 8)", () => {
  it("imports nothing from three, the DOM, src/grid or src/night", () => {
    const src = readFileSync(join("src", "render3d", "parkmetrics.ts"), "utf8");
    const specs = [...src.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/gms)].map((m) => m[1]!);
    expect(specs.length).toBeGreaterThan(0);
    for (const s of specs) {
      expect(s).not.toMatch(/three/);
      expect(s).not.toMatch(/(^|\/)grid(\/|$)/);
      expect(s).not.toMatch(/(^|\/)night(\/|$)/);
      expect(["./tilecity", "./town"]).toContain(s);
    }
    expect(src).not.toMatch(/\b(document|HTMLElement|HTMLCanvasElement|navigator|requestAnimationFrame|localStorage)\b/);
    expect(src).not.toMatch(/\bimport\s*\(/);
  });
});
