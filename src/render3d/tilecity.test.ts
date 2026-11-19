/**
 * Ticket 055 A (and B, from the bottom of this file): the tile-street city, as pure data (`tilecity.ts`). Section B puts terraces, open lots and kerb cuts into every city, so the
 * A tests that read the street cells skip the cells inside the blocks (`lotSurface`, `plaza`), count a `kerbCut` as the pavement it is cut from, and let a kerb stop at a cut. No three, no WebGL, no assets: every number is computed from the city's own streets and bands
 * in the test, independently of the code that placed the cells. Cities are built once per (size, seed) and shared between the tests. A loop over cells records its
 * failures in a list and asserts the list once (a per-cell `expect` over a hundred cities is the slow part, not the city).
 */

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  APRON_CELLS,
  APRON_STRIP,
  AVENUE_ONE_IN,
  BENCH_FROM_PATH_M,
  CITY_FRONT_LOT_BLOCKS_MAX,
  COURT_AISLE,
  COURT_CELLS,
  COURT_STALLS,
  DRIVE_CELLS,
  GREEN_SPAN_MAX_CELLS,
  GREEN_TREE_ONE_IN,
  BAYS_PER_PARKING_TILE,
  BLOCK_CV_MIN,
  BLOCK_DRAWS_MAX,
  BLOCK_LARGE_MIN_M,
  BLOCK_LONG_MIN_M,
  BLOCK_LONG_SHORT_MAX_M,
  BLOCK_MEAN_MIN_CELLS,
  BLOCK_NONSQUARE_MIN,
  BLOCK_SMALL_MAX_M,
  BLOCK_STEP_MIN_CELLS,
  BLOCK_TILES,
  BAY_JUNCTION_CLEAR,
  BAYS_PER_100M_MAX,
  BAY_RUN_TILES_MAX,
  BAY_TILES_PER_BLOCK_MIN,
  BUILDOUT_TREE_EVERY,
  END_OVERLAP_MAX_M,
  PASSAGE_W_M,
  CITY_BLOCKS_MAX,
  GRATE_ONE_IN,
  PAVEMENT_FLUSH,
  PAVEMENT_GRATE,
  PAVEMENT_RETURN_FAR,
  PAVEMENT_RETURN_NEAR,
  HOME_COLUMN_FLOORS,
  KERB_BAY_SHARE_MAX,
  KERB_GAP_MIN_M,
  LOTS_PER_BLOCK_MAX,
  LOT_STALLS,
  PARK_PER_HOME,
  PARK_PER_SHOP,
  PARK_SUPPLY_BAND,
  UNIT_FLOORS_NOMINAL,
  PATCH_ONE_IN,
  POLE_SLOT_END_CLEAR_M,
  POLE_SLOT_FROM_KERB_M,
  POLE_SLOT_PITCH_M,
  SIDEWALK_TOP_M,
  TILE_M,
  TILE_CITY_R1_MIN,
  TILE_CITY_R6_MIN,
  TILE_CITY_R7_MIN,
  TILE_PLAZA_W_M,
  TILE_ROW_INSET_M,
  bayMeters,
  blockType,
  streetBandAt,
  tileCity,
  tileKeepouts,
  withPassages,
  type TileBand,
  type TileCell,
  type TileCity,
  type TileRole,
  type TileStreet,
} from "./tilecity";
import * as tileModule from "./tilecity";
import { loadPuzzle, type AssetEntry, type CalibrationKey, type Puzzle } from "../core";
import { CITY_ATM_BLOCKS_MIN, CITY_CHECK, cityMetrics, evaluateCity, runBlocks, type CityMetrics } from "./citymetrics";
import { KERB_FROM_FRONT_M, dressStack, dressTown, type DressBlockInput } from "./dressing";
import { FURN_KEEP_M, FURN_KERB_M, KERB_M, METERS, WALL_EDGE_M, furnitureLayout } from "./furniture";
import { BUILDING_FRONTS } from "./models";
import { evaluateParking, parkingMetrics } from "./parkmetrics";
import { STACK_STYLES } from "./stacks";
import { TERRACE_SEAM_M, packTown, type PackResult, type PackedBlock } from "./terrace";
import { blockVariety, evaluateVariety, frontageMetrics, tilePassages } from "./frontage";
import { PAVE_W, ROAD_W, SETBACK, WORLD_PER_METRE, terraceBlockRows, terraceRunKey, townLayout, type TerraceBox, type TerraceRun, type TerraceSide } from "./town";

const U = WORLD_PER_METRE;
const SIZES: readonly [number, number][] = [
  [1, 1],
  [3, 3],
  [6, 4],
  [6, 6],
];
const SEEDS = Array.from({ length: 20 }, (_, k) => k + 1);

/** What the tests derive once per city, from the streets' bands alone. */
interface View {
  c: TileCity;
  W: number;
  H: number;
  byId: Map<string, TileStreet>;
  /** The "z" street through each column and the "x" street through each row, or null. */
  zAt: (TileStreet | null)[];
  xAt: (TileStreet | null)[];
  /** One role per unit cell (a two-cell piece fills both), null where there is none. */
  role: (TileRole | null)[];
}
/** The roles of cells that lie inside a block (section B): the street cells are all the others. */
const OPEN_ROLES: readonly TileRole[] = ["lotSurface", "plaza"];
const memo = new Map<string, View>();
const view = (bx: number, bz: number, seed: number): View => {
  const key = `${bx}x${bz}:${seed}`;
  let v = memo.get(key);
  if (!v) {
    const c = tileCity({ blocksX: bx, blocksZ: bz, seed });
    const W = Math.round(c.town.window.maxX / U / TILE_M);
    const H = Math.round(c.town.window.maxY / U / TILE_M);
    const byId = new Map(c.streets.map((s) => [s.id, s]));
    const zAt: (TileStreet | null)[] = [];
    const xAt: (TileStreet | null)[] = [];
    for (let i = 0; i < W; i++) zAt.push(c.streets.find((s) => s.axis === "z" && streetBandAt(s, i) !== null) ?? null);
    for (let j = 0; j < H; j++) xAt.push(c.streets.find((s) => s.axis === "x" && streetBandAt(s, j) !== null) ?? null);
    const role = new Array<TileRole | null>(W * H).fill(null);
    for (const cell of c.cells) {
      if (OPEN_ROLES.includes(cell.role)) continue;
      role[cell.j * W + cell.i] = cell.role;
      if (cell.cells === 2) role[(cell.j + (byId.get(cell.street!)!.axis === "x" ? 0 : 1)) * W + cell.i + (byId.get(cell.street!)!.axis === "x" ? 1 : 0)] = cell.role;
    }
    v = { c, W, H, byId, zAt, xAt, role };
    memo.set(key, v);
  }
  return v;
};
const forAll = (fn: (v: View, label: string, ok: (cond: boolean, msg: string) => void) => void): void => {
  const fails: string[] = [];
  for (const [bx, bz] of SIZES) {
    for (const seed of SEEDS) {
      const label = `${bx}x${bz} seed ${seed}`;
      fn(view(bx, bz, seed), label, (cond, msg) => {
        if (!cond && fails.length < 12) fails.push(`${label}: ${msg}`);
      });
    }
  }
  expect(fails).toEqual([]);
};

const YAWS = [0, 90, 180, 270];
const isCarriageBand = (b: TileBand | null): boolean => b === "lane" || b === "parking";
const CARRIAGE_ROLES: readonly (TileRole | null)[] = ["lane", "parking", "parkingPlain"];
const unitCells = (v: View, cell: TileCell): [number, number][] => {
  if (cell.cells === 1) return [[cell.i, cell.j]];
  return v.byId.get(cell.street!)!.axis === "x"
    ? [[cell.i, cell.j], [cell.i + 1, cell.j]]
    : [[cell.i, cell.j], [cell.i, cell.j + 1]];
};

// The first case builds the 80 memoised cities (4 sizes x 20 seeds, up to 6 x 6): about 3 s on an idle machine, so it has its own time limit and not Vitest's 5 s (a limit, not a threshold).
const CITIES_BUILD_TIMEOUT_MS = 60000;

describe("on the grid (criterion 1)", () => {
  it("puts every cell on the grid, every yaw on a right angle, every footprint at one or two cells", () => {
    forAll((v, _l, ok) => {
      for (const cell of v.c.cells) {
        ok(cell.cells === 1 || cell.cells === 2, "footprint");
        ok(YAWS.includes(cell.yaw), "yaw");
        if (cell.cells === 1) {
          ok(cell.x_m / TILE_M - 0.5 === cell.i && cell.z_m / TILE_M - 0.5 === cell.j, `centre of (${cell.i},${cell.j})`);
        } else {
          ok(cell.role === "parking", "only parking is two cells");
          const x = v.byId.get(cell.street!)!.axis === "x";
          ok(x ? cell.x_m / TILE_M === cell.i + 1 && cell.z_m / TILE_M - 0.5 === cell.j : cell.x_m / TILE_M - 0.5 === cell.i && cell.z_m / TILE_M === cell.j + 1, `pair at (${cell.i},${cell.j})`);
        }
      }
    });
  }, CITIES_BUILD_TIMEOUT_MS);

  it("turns a lane, parking and pavement front toward the right side of its street", () => {
    // yaw 0 points at +z, 90 at +x, 180 at -z, 270 at -x.
    const front = (yaw: number): { x: number; z: number } => ({ x: Math.round(Math.sin((yaw * Math.PI) / 180)), z: Math.round(Math.cos((yaw * Math.PI) / 180)) });
    forAll((v, _l, ok) => {
      for (const cell of v.c.cells) {
        if (!cell.street) continue;
        const s = v.byId.get(cell.street)!;
        const f = front(cell.yaw);
        const across = (s.axis === "x" ? f.z : f.x) + 0;
        const along = (s.axis === "x" ? f.x : f.z) + 0;
        const here = s.axis === "x" ? cell.z_m : cell.x_m;
        if (cell.role === "lane" || cell.role === "parking" || cell.role === "parkingPlain") {
          ok(along === 0 && across === Math.sign(s.centre_m - here), `${cell.role} (${cell.i},${cell.j}) yaw ${cell.yaw}`);
        } else if (cell.role === "pavement") {
          ok(along === 0 && across === (here < s.carriage.lo_m ? 1 : -1), `pavement (${cell.i},${cell.j}) yaw ${cell.yaw}`);
        }
      }
    });
  });

  it("points each corner at its junction", () => {
    // yaw 0: kerb edges on +x and +z; 90: +x and -z; 180: -x and -z; 270: -x and +z.
    const want: Record<number, [number, number]> = { 0: [1, 1], 90: [1, -1], 180: [-1, -1], 270: [-1, 1] };
    forAll((v, _l, ok) => {
      for (const cell of v.c.cells) {
        if (cell.role !== "pavementCorner") continue;
        const z = v.zAt[cell.i]!;
        const x = v.xAt[cell.j]!;
        const sx = z.carriage.lo_m > cell.x_m ? 1 : -1;
        const sz = x.carriage.lo_m > cell.z_m ? 1 : -1;
        ok(want[cell.yaw]![0] === sx && want[cell.yaw]![1] === sz, `corner (${cell.i},${cell.j}) yaw ${cell.yaw}`);
      }
    });
  });
});

describe("no gaps, no overlaps (criterion 2)", () => {
  it("partitions the union of the streets' rights of way exactly", () => {
    forAll((v, _l, ok) => {
      const { W, H } = v;
      const count = new Uint8Array(W * H);
      let area = 0;
      for (const cell of v.c.cells) {
        if (OPEN_ROLES.includes(cell.role)) continue;
        area += cell.cells * TILE_M * TILE_M;
        for (const [i, j] of unitCells(v, cell)) count[j * W + i] = (count[j * W + i] ?? 0) + 1;
      }
      let unionCells = 0;
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const inside = v.zAt[i] !== null || v.xAt[j] !== null;
          if (inside) unionCells++;
          ok(count[j * W + i] === (inside ? 1 : 0), `(${i},${j}) covered ${count[j * W + i]}`);
        }
      }
      ok(Math.abs(area - unionCells * TILE_M * TILE_M) < 1e-6, "summed area");
    });
  });

  it("covers a 1 x 1 city's blocks with no street cell, and the open lots only with lot surface and plaza cells", () => {
    const v = view(1, 1, 1);
    const b = v.c.blocks[0]!;
    for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) expect(v.role[j * v.W + i]).toBeNull();
    const inside = v.c.cells.filter((c) => c.i >= b.i0 && c.i < b.i1 && c.j >= b.j0 && c.j < b.j1);
    expect(inside.every((c) => OPEN_ROLES.includes(c.role))).toBe(true);
    expect(inside.length).toBe(4 * v.c.town.openLots.length);
  });
});

describe("junctions (criterion 3)", () => {
  it("gives every cell the role its bands say", () => {
    forAll((v, _l, ok) => {
      for (const cell of v.c.cells) {
        if (OPEN_ROLES.includes(cell.role)) continue;
        const z = v.zAt[cell.i]!;
        const x = v.xAt[cell.j]!;
        const vb = z ? streetBandAt(z, cell.i) : null;
        const hb = x ? streetBandAt(x, cell.j) : null;
        let want: TileRole[];
        if (vb && hb) want = isCarriageBand(vb) && isCarriageBand(hb) ? ["junction"] : isCarriageBand(vb) || isCarriageBand(hb) ? ["crossing"] : ["pavementCorner"];
        else {
          const b = (vb ?? hb)!;
          want = b === "parking" ? ["parking", "parkingPlain", "buildout"] : b === "pavement" ? ["pavement", "kerbCut"] : [b];
        }
        ok(want.includes(cell.role), `(${cell.i},${cell.j}) is ${cell.role}, bands say ${want.join("/")}`);
        // A crossing belongs to the street whose carriageway it lies in.
        if (cell.role === "crossing") ok(cell.street === (isCarriageBand(vb) ? z!.id : x!.id), `crossing street at (${cell.i},${cell.j})`);
        if (cell.role === "junction" || cell.role === "pavementCorner") ok(cell.street === null, "two streets, no owner");
      }
    });
  });

  it("fills every junction box with junction cells and every approach with a full crossing row", () => {
    forAll((v, _l, ok) => {
      const { W } = v;
      const at = (i: number, j: number): TileRole | null => v.role[j * W + i] ?? null;
      const zs = v.c.streets.filter((s) => s.axis === "z");
      const xs = v.c.streets.filter((s) => s.axis === "x");
      for (const z of zs) {
        for (const x of xs) {
          const i0 = z.carriage.lo_m / TILE_M;
          const i1 = z.carriage.hi_m / TILE_M;
          const j0 = x.carriage.lo_m / TILE_M;
          const j1 = x.carriage.hi_m / TILE_M;
          for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) ok(at(i, j) === "junction", `box ${z.id} ${x.id}`);
          const lastCol = z.across0 + z.bands.length - 1;
          const lastRow = x.across0 + x.bands.length - 1;
          for (let j = j0; j < j1; j++) ok(at(z.across0, j) === "crossing" && at(lastCol, j) === "crossing", `crossing column of ${z.id} at ${x.id}`);
          for (let i = i0; i < i1; i++) ok(at(i, x.across0) === "crossing" && at(i, lastRow) === "crossing", `crossing row of ${x.id} at ${z.id}`);
          for (const i of [z.across0, lastCol]) for (const j of [x.across0, lastRow]) ok(at(i, j) === "pavementCorner", `corner of ${z.id} ${x.id}`);
        }
      }
    });
  });

  it("makes each block corner a pavementCorner and keeps every lane out of a second street's band", () => {
    forAll((v, _l, ok) => {
      const { W } = v;
      for (const b of v.c.blocks) {
        for (const [i, j] of [
          [b.i0 - 1, b.j0 - 1],
          [b.i1, b.j0 - 1],
          [b.i0 - 1, b.j1],
          [b.i1, b.j1],
        ] as const) {
          ok(v.role[j * W + i] === "pavementCorner", `${b.id} corner (${i},${j})`);
        }
      }
      for (const cell of v.c.cells) if (cell.role === "lane") ok(!(v.zAt[cell.i] && v.xAt[cell.j]), `lane (${cell.i},${cell.j}) in two bands`);
    });
  });
});

/** How many kerb cuts (each two cells) a block side holds: the kerbCut cells in the row or column of pavement along it, over two. */
const cutsOnSide = (v: View, b: TileCity["blocks"][number], side: "top" | "bottom" | "left" | "right"): number => {
  const cut = (i: number, j: number): boolean => v.role[j * v.W + i] === "kerbCut";
  // A kerb cut is a stretch of kerb-cut cells in a row: two for a lot's 10 m opening, one for an alley's 5 m mouth (057 G).
  let n = 0;
  let on = false;
  if (side === "top" || side === "bottom") {
    const j = side === "top" ? b.j0 - 1 : b.j1;
    for (let i = b.i0; i < b.i1; i++) {
      const here = cut(i, j);
      if (here && !on) n++;
      on = here;
    }
  } else {
    const i = side === "left" ? b.i0 - 1 : b.i1;
    for (let j = b.j0; j < b.j1; j++) {
      const here = cut(i, j);
      if (here && !on) n++;
      on = here;
    }
  }
  return n;
};

describe("kerbs (criterion 4)", () => {
  /** The unit edges a kerb segment covers: "h:i:L" for an edge along x on grid line L, "v:L:j" for one along z. */
  const edgesOf = (k: { ax: number; az: number; bx: number; bz: number }): string[] => {
    const out: string[] = [];
    const g = (n: number): number => Math.round(n / (TILE_M * U));
    if (Math.abs(k.az - k.bz) < 1e-9) for (let i = g(k.ax); i < g(k.bx); i++) out.push(`h:${i}:${g(k.az)}`);
    else for (let j = g(k.az); j < g(k.bz); j++) out.push(`v:${g(k.ax)}:${j}`);
    return out;
  };

  it("lies on every pavement and carriageway cell edge and on no other", () => {
    forAll((v, _l, ok) => {
      const { W, H, role: r } = v;
      const want = new Set<string>();
      // 056: a build-out is pavement-family, so a kerb also runs along its edges (a kerb cut, a corner and a crossing still carry none).
      const pave = (a: TileRole | null): boolean => a === "pavement" || a === "buildout";
      const edge = (a: TileRole | null, b: TileRole | null): boolean => (pave(a) && CARRIAGE_ROLES.includes(b)) || (pave(b) && CARRIAGE_ROLES.includes(a));
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const here = r[j * W + i] ?? null;
          if (i > 0 && edge(r[j * W + i - 1] ?? null, here)) want.add(`v:${i}:${j}`);
          if (j > 0 && edge(r[(j - 1) * W + i] ?? null, here)) want.add(`h:${i}:${j}`);
        }
      }
      const got: string[] = [];
      for (const k of v.c.town.kerbs) got.push(...edgesOf(k));
      const gotSet = new Set(got);
      ok(gotSet.size === got.length, "an edge twice");
      ok(gotSet.size === want.size && [...want].every((e) => gotSet.has(e)), `kerb edges ${gotSet.size} vs ${want.size}`);
      for (const key of got) {
        const [t, a, b] = key.split(":");
        const A = Number(a);
        const B = Number(b);
        const sides = t === "h" ? [r[(B - 1) * W + A], r[B * W + A]] : [r[B * W + A - 1], r[B * W + A]];
        for (const role of sides) ok(role !== "junction" && role !== "crossing", `kerb ${key} on ${role}`);
      }
    });
  });

  it("is one merged segment per stretch of pavement on a block side, between its corners or its kerb cuts", () => {
    forAll((v, _l, ok) => {
      const kerbs = v.c.town.kerbs;
      const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
      for (const b of v.c.blocks) {
        const i0 = b.i0 * TILE_M * U;
        const i1 = b.i1 * TILE_M * U;
        const j0 = b.j0 * TILE_M * U;
        const j1 = b.j1 * TILE_M * U;
        // The kerbs on the pavement line of a side (the carriageway's outer edge): the segments that run along it.
        const line = (road: string, side: number, horizontal: boolean, at: number, f: (k: (typeof kerbs)[number]) => boolean): number =>
          kerbs.filter((k) => k.road === road && k.side === side && (horizontal ? near(k.az, at) && near(k.bz, at) : near(k.ax, at) && near(k.bx, at)) && f(k)).length;
        // Independently: the stretches of the side's pavement cells that have a carriageway cell across them (a kerb cut, a build-out in front of the pavement or a corner breaks a stretch).
        const stretches = (cells: number[], pavementAt: (a: number) => TileRole | null, acrossAt: (a: number) => TileRole | null): number => {
          let n = 0;
          let on = false;
          for (const a of cells) {
            const here = pavementAt(a) === "pavement" && CARRIAGE_ROLES.includes(acrossAt(a));
            if (here && !on) n++;
            on = here;
          }
          return n;
        };
        const iRange = Array.from({ length: b.i1 - b.i0 }, (_, k) => b.i0 + k);
        const jRange = Array.from({ length: b.j1 - b.j0 }, (_, k) => b.j0 + k);
        const R = (i: number, j: number): TileRole | null => v.role[j * v.W + i] ?? null;
        const top = line(`x:${b.bj}`, 1, true, (b.j0 - 1) * TILE_M * U, (k) => k.ax > i0 - 1e-6 && k.bx < i1 + 1e-6);
        const bottom = line(`x:${b.bj + 1}`, -1, true, (b.j1 + 1) * TILE_M * U, (k) => k.ax > i0 - 1e-6 && k.bx < i1 + 1e-6);
        const left = line(`z:${b.bi}`, -1, false, (b.i0 - 1) * TILE_M * U, (k) => k.az > j0 - 1e-6 && k.bz < j1 + 1e-6);
        const right = line(`z:${b.bi + 1}`, 1, false, (b.i1 + 1) * TILE_M * U, (k) => k.az > j0 - 1e-6 && k.bz < j1 + 1e-6);
        ok(top === stretches(iRange, (i) => R(i, b.j0 - 1), (i) => R(i, b.j0 - 2)), `${b.id} top ${top}`);
        ok(bottom === stretches(iRange, (i) => R(i, b.j1), (i) => R(i, b.j1 + 1)), `${b.id} bottom ${bottom}`);
        ok(left === stretches(jRange, (j) => R(b.i0 - 1, j), (j) => R(b.i0 - 2, j)), `${b.id} left ${left}`);
        ok(right === stretches(jRange, (j) => R(b.i1, j), (j) => R(b.i1 + 1, j)), `${b.id} right ${right}`);
        // With no build-out on a side the pavement line is one segment from corner to corner and each kerb cut splits it once more.
        const sideCells = (cells: number[], row: (a: number) => TileRole | null): boolean => cells.every((a) => row(a) !== "buildout");
        if (sideCells(iRange, (i) => R(i, b.j0 - 2))) ok(top === 1 + cutsOnSide(v, b, "top"), `${b.id} top (no build-out) ${top}`);
        if (sideCells(iRange, (i) => R(i, b.j1 + 1))) ok(bottom === 1 + cutsOnSide(v, b, "bottom"), `${b.id} bottom (no build-out) ${bottom}`);
        if (sideCells(jRange, (j) => R(b.i0 - 2, j))) ok(left === 1 + cutsOnSide(v, b, "left"), `${b.id} left (no build-out) ${left}`);
        if (sideCells(jRange, (j) => R(b.i1 + 1, j))) ok(right === 1 + cutsOnSide(v, b, "right"), `${b.id} right (no build-out) ${right}`);
      }
      // Every segment is a whole number of cells long.
      for (const k of kerbs) {
        const cellsLong = Math.hypot(k.bx - k.ax, k.bz - k.az) / (TILE_M * U);
        ok(Math.abs(cellsLong - Math.round(cellsLong)) < 1e-9 && cellsLong > 0.5, "whole cells");
      }
    });
  });
});

describe("profiles and bays (criterion 5)", () => {
  it("gives every street its profile's cross-section, and an avenue on every axis with three lines", () => {
    const left = ["pavement", "parking", "lane", "lane", "pavement"];
    const right = ["pavement", "lane", "lane", "parking", "pavement"];
    const avenue = ["pavement", "parking", "lane", "lane", "parking", "pavement"];
    forAll((v, _l, ok) => {
      const c = v.c;
      for (const s of c.streets) {
        const b = [...s.bands];
        ok(s.profile === "avenue" ? JSON.stringify(b) === JSON.stringify(avenue) : JSON.stringify(b) === JSON.stringify(left) || JSON.stringify(b) === JSON.stringify(right), `${s.id} bands`);
        const lines = (s.axis === "x" ? c.blocksZ : c.blocksX) + 1;
        if (s.line === 0 || s.line === lines - 1) ok(s.profile === "street", `${s.id} edge street`);
      }
      for (const axis of ["x", "z"] as const) {
        const own = c.streets.filter((s) => s.axis === axis);
        ok(own.every((s, k) => s.line === k), "lines in order");
        if (own.length >= 3) ok(own.some((s) => s.profile === "avenue"), `avenue on axis ${axis}`);
      }
    });
  });

  it("keeps bays out of the cells next to a junction box and counts them per tile", () => {
    forAll((v, _l, ok) => {
      const { W, role: r } = v;
      const tiles = v.c.cells.filter((cell) => cell.cells === 2);
      ok(v.c.bays.length === tiles.length * BAYS_PER_PARKING_TILE, "bays per tile");
      for (const t of tiles) {
        const s = v.byId.get(t.street!)!;
        const x = s.axis === "x";
        for (const [i, j] of unitCells(v, t)) {
          ok((x ? v.xAt[j] : v.zAt[i])?.id === s.id && streetBandAt(s, x ? j : i) === "parking", `tile (${t.i},${t.j}) is two parking cells of ${s.id}`);
          ok(!(x ? v.zAt[i] : v.xAt[j]), `tile (${t.i},${t.j}) is in one street only`);
        }
        // The BAY_JUNCTION_CLEAR cells before and after the tile along the street are not part of a junction box (crossing, junction or corner).
        for (let d = 1; d <= BAY_JUNCTION_CLEAR; d++) {
          for (const [i, j] of x ? ([[t.i - d, t.j], [t.i + 1 + d, t.j]] as const) : ([[t.i, t.j - d], [t.i, t.j + 1 + d]] as const)) {
            const q = r[j * W + i];
            ok(q !== "crossing" && q !== "junction" && q !== "pavementCorner", `tile (${t.i},${t.j}) near a box at (${i},${j})`);
          }
        }
      }
      for (const b of v.c.bays) {
        ok(r[Math.floor(b.z_m / TILE_M) * W + Math.floor(b.x_m / TILE_M)] === "parking", `bay at (${b.x_m},${b.z_m})`);
        ok(b.w_m * BAYS_PER_PARKING_TILE === 2 * TILE_M && /^(outer|block:\d+:\d+)$/.test(b.block), "bay size and block");
      }
    });
  });

  it("leaves BAY_JUNCTION_CLEAR cells without a bay at both ends of every parking band (a corner build-out, or plain on an edge street's outer side), and keeps every other plain cell in front of a kerb cut", () => {
    forAll((v, _l, ok) => {
      const { W, role: r } = v;
      for (const s of v.c.streets) {
        const n = s.bands.length;
        const intervals = v.c.blocks.filter((b) => (s.axis === "x" ? b.bj === 0 : b.bi === 0));
        for (let k = 0; k < n; k++) {
          if (s.bands[k] !== "parking") continue;
          const across = s.axis === "x" ? s.across0 + k : s.across0 + n - 1 - k;
          const out = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
          const outer = (s.line === 0 && out < 0) || (s.line === (s.axis === "x" ? v.c.blocksZ : v.c.blocksX) && out > 0);
          for (const b of intervals) {
            const [a0, a1] = s.axis === "x" ? [b.i0, b.i1] : [b.j0, b.j1];
            const roleAt = (a: number): TileRole | null => (s.axis === "x" ? r[across * W + a] : r[a * W + across]) ?? null;
            for (let d = 0; d < BAY_JUNCTION_CLEAR; d++) {
              for (const q of [roleAt(a0 + d), roleAt(a1 - 1 - d)]) ok(q === (outer ? "parkingPlain" : "buildout"), `${s.id} run end is ${q}`);
            }
            // A plain cell in a band that faces a block lies in front of a kerb cut (the pavement cell across from it).
            const pavementRow = out > 0 ? across + 1 : across - 1;
            for (let a = a0; a < a1; a++) {
              if (roleAt(a) !== "parkingPlain" || outer) continue;
              ok((s.axis === "x" ? r[pavementRow * W + a] : r[a * W + pavementRow]) === "kerbCut", `${s.id} plain cell ${a} is not in front of a kerb cut`);
            }
          }
        }
      }
    });
  });
});

describe("pole slots (criterion 6)", () => {
  it("stands slots POLE_SLOT_PITCH_M apart and POLE_SLOT_FROM_KERB_M from the kerb face, never on a corner, a crossing or a kerb cut", () => {
    forAll((v, _l, ok) => {
      const { W, role: r } = v;
      ok(v.c.poleSlots.length > 0, "some slots");
      const groups = new Map<string, number[]>();
      for (const p of v.c.poleSlots) {
        const s = v.byId.get(p.street)!;
        const across = s.axis === "x" ? p.z_m : p.x_m;
        const along = s.axis === "x" ? p.x_m : p.z_m;
        const dLo = s.carriage.lo_m - across;
        const dHi = across - s.carriage.hi_m;
        ok(Math.abs(Math.abs(dLo > 0 ? dLo : dHi) - POLE_SLOT_FROM_KERB_M) < 1e-9 && (dLo > 0 || dHi > 0), "kerb distance");
        const coordSign = dHi > 0 ? 1 : -1;
        ok(p.side === (s.axis === "x" ? coordSign : -coordSign), "side");
        const role = s.axis === "x" ? r[Math.floor(across / TILE_M) * W + Math.floor(along / TILE_M)] : r[Math.floor(along / TILE_M) * W + Math.floor(across / TILE_M)];
        ok(role === "pavement", `slot at (${p.x_m},${p.z_m}) on ${role}`);
        const key = `${p.street}|${p.side}`;
        groups.set(key, [...(groups.get(key) ?? []), along]);
      }
      for (const [key, list] of groups) {
        const s = v.byId.get(key.split("|")[0]!)!;
        const ivs = v.c.blocks.filter((b) => (s.axis === "x" ? b.bj === 0 : b.bi === 0)).map((b) => (s.axis === "x" ? [b.i0 * TILE_M, b.i1 * TILE_M] : [b.j0 * TILE_M, b.j1 * TILE_M]));
        for (const [a0, a1] of ivs as [number, number][]) {
          const inside = list.filter((q) => q > a0 && q < a1).sort((p, q) => p - q);
          const first = (inside[0]! - a0 - POLE_SLOT_END_CLEAR_M) / POLE_SLOT_PITCH_M;
          ok(inside.length > 0 && Math.abs(first - Math.round(first)) < 1e-9, `${key} first slot`);
          // A slot that would stand on a kerb cut is left out, so neighbours are a whole number of pitches apart.
          for (let k = 1; k < inside.length; k++) {
            const gap = (inside[k]! - inside[k - 1]!) / POLE_SLOT_PITCH_M;
            ok(Math.abs(gap - Math.round(gap)) < 1e-9 && gap > 0.5, `${key} pitch`);
          }
          ok(a1 - inside[inside.length - 1]! >= POLE_SLOT_END_CLEAR_M - 1e-9, `${key} last slot`);
        }
      }
    });
  });

  it("gives every pavement side of every block at least one slot", () => {
    forAll((v, _l, ok) => {
      const p = v.c.poleSlots;
      for (const b of v.c.blocks) {
        const inX = (x: number): boolean => x > b.i0 * TILE_M && x < b.i1 * TILE_M;
        const inZ = (z: number): boolean => z > b.j0 * TILE_M && z < b.j1 * TILE_M;
        ok(p.some((q) => q.street === `x:${b.bj}` && q.side === 1 && inX(q.x_m)), `${b.id} top`);
        ok(p.some((q) => q.street === `x:${b.bj + 1}` && q.side === -1 && inX(q.x_m)), `${b.id} bottom`);
        ok(p.some((q) => q.street === `z:${b.bi}` && q.side === -1 && inZ(q.z_m)), `${b.id} left`);
        ok(p.some((q) => q.street === `z:${b.bi + 1}` && q.side === 1 && inZ(q.z_m)), `${b.id} right`);
      }
    });
  });
});

describe("the Town (criterion 7)", () => {
  const deepFrozen = (o: unknown): boolean => {
    if (typeof o !== "object" || o === null) return true;
    return Object.isFrozen(o) && Object.values(o).every(deepFrozen);
  };

  it("has roads, kerbs, pavements, pads and blocks in map units, terrace lots (section B) and no place", () => {
    forAll((v, _l, ok) => {
      const { c, W, H } = v;
      const t = c.town;
      ok(t.roads.length === c.blocksX + 1 + c.blocksZ + 1, "roads");
      ok(t.pads.length === (c.blocksX + 1) * (c.blocksZ + 1), "pads");
      ok(t.blocks.length === c.blocksX * c.blocksZ, "blocks");
      ok(t.pavements.length > 0 && t.lots.length > 0 && t.places.length === 0 && t.terraces.length > 0, "parts");
      for (const w of [t.ring, t.window]) ok(w.minX === 0 && w.minY === 0 && Math.abs(w.maxX - W * TILE_M * U) < 1e-9 && Math.abs(w.maxY - H * TILE_M * U) < 1e-9, "bounds");
      for (const road of t.roads) {
        const s = v.byId.get(road.id)!;
        ok(Math.abs(road.w - (s.carriage.hi_m - s.carriage.lo_m) * U) < 1e-9 && road.side === 0 && road.line === null, `road ${road.id}`);
      }
      // Pads are the junction boxes: each as big as its junction cells.
      for (const pad of t.pads) {
        const xs = pad.pts.map((p) => p.x);
        const zs = pad.pts.map((p) => p.z);
        const cells = v.c.cells.filter((cell) => cell.role === "junction" && pad.id === `pad:${v.xAt[cell.j]!.id}:${v.zAt[cell.i]!.id}`).length;
        ok(Math.abs((Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs)) - cells * (TILE_M * U) ** 2) < 1e-6, `${pad.id} area`);
      }
    });
  });

  it("puts each block's edge on its pavements' back edges", () => {
    forAll((v, _l, ok) => {
      const bbox = (pts: readonly { x: number; z: number }[]): { x0: number; x1: number; z0: number; z1: number } => ({
        x0: Math.min(...pts.map((p) => p.x)),
        x1: Math.max(...pts.map((p) => p.x)),
        z0: Math.min(...pts.map((p) => p.z)),
        z1: Math.max(...pts.map((p) => p.z)),
      });
      const boxes = v.c.town.pavements.map((p) => bbox(p.pts));
      const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
      for (const b of v.c.town.blocks) {
        ok(boxes.some((p) => near(p.z1, b.minZ) && p.x0 <= b.minX + 1e-6 && p.x1 >= b.maxX - 1e-6), `${b.id} top`);
        ok(boxes.some((p) => near(p.z0, b.maxZ) && p.x0 <= b.minX + 1e-6 && p.x1 >= b.maxX - 1e-6), `${b.id} bottom`);
        ok(boxes.some((p) => near(p.x1, b.minX) && p.z0 <= b.minZ + 1e-6 && p.z1 >= b.maxZ - 1e-6), `${b.id} left`);
        ok(boxes.some((p) => near(p.x0, b.maxX) && p.z0 <= b.minZ + 1e-6 && p.z1 >= b.maxZ - 1e-6), `${b.id} right`);
      }
      // The pavements cover every pavement and corner cell once.
      const area = boxes.reduce((s, q) => s + (q.x1 - q.x0) * (q.z1 - q.z0), 0);
      const cellsArea = v.c.cells.filter((cell) => cell.role === "pavement" || cell.role === "pavementCorner" || cell.role === "kerbCut").length * (TILE_M * U) ** 2;
      ok(Math.abs(area - cellsArea) < 1e-6, "pavement area");
    });
  });

  it("is deterministic per size and seed, differs between seeds, and is frozen", () => {
    const a = tileCity({ blocksX: 4, blocksZ: 3, seed: 7 });
    const b = tileCity({ blocksX: 4, blocksZ: 3, seed: 7 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(tileCity({ blocksX: 4, blocksZ: 3, seed: 8 }))).not.toBe(JSON.stringify(a));
    expect(deepFrozen(a.town)).toBe(true);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.cells)).toBe(true);
    expect(() => {
      (a.town.roads as unknown as { id: string }[])[0]!.id = "x";
    }).toThrow();
  });

  it("defaults to 3 x 3 blocks and seed 1, clamps the size and truncates the seed", () => {
    expect(JSON.stringify(tileCity())).toBe(JSON.stringify(tileCity({ blocksX: 3, blocksZ: 3, seed: 1 })));
    const big = tileCity({ blocksX: 99, blocksZ: 0 });
    expect([big.blocksX, big.blocksZ]).toEqual([CITY_BLOCKS_MAX, 1]);
    expect(tileCity({ blocksX: 2.9, blocksZ: Number.NaN, seed: 4.7 })).toMatchObject({ blocksX: 2, blocksZ: 3, seed: 4 });
  });
});

describe("block sizes, variety and levels", () => {
  it("makes every block BLOCK_TILES cells a side (6 to 16, 057 F), and avenues, patches and grates land near their ratios", () => {
    let avenues = 0;
    let streets = 0;
    let patches = 0;
    let lanes = 0;
    let grates = 0;
    let pave = 0;
    forAll((v, _l, ok) => {
      for (const b of v.c.blocks) {
        const w = b.i1 - b.i0;
        const d = b.j1 - b.j0;
        ok(w >= BLOCK_TILES.min && w <= BLOCK_TILES.max && d >= BLOCK_TILES.min && d <= BLOCK_TILES.max, `${b.id} is ${w} by ${d}`);
      }
      for (const s of v.c.streets) {
        streets++;
        if (s.profile === "avenue") avenues++;
      }
      let left = 0;
      let nLanes = 0;
      for (const cell of v.c.cells) {
        if (cell.role === "lane") {
          lanes++;
          nLanes++;
          if (cell.variant & 2) patches++;
          if ((cell.variant & 1) === 0) left++;
          ok(cell.variant >= 0 && cell.variant <= 3, "lane variant");
        }
        if (cell.role === "pavement") {
          pave++;
          if (cell.variant === PAVEMENT_GRATE) grates++;
          // 063 F: the plain straight (0), the grate (alone), or a plain cell with the kerb bits of a return and a flush cell (never with a grate).
          ok(cell.variant === PAVEMENT_GRATE || (cell.variant & PAVEMENT_GRATE) === 0, "pavement variant: the grate alone, or a plain straight with kerb bits");
          ok(cell.variant >= 0 && cell.variant < 16, "pavement variant: no bit beyond the kerb's");
        }
      }
      ok(left * 2 === nLanes, "one lane of each side in every pair");
    });
    expect(avenues / streets).toBeGreaterThan(0.1);
    expect(avenues / streets).toBeLessThan(1 / AVENUE_ONE_IN + 0.25);
    expect(patches / lanes).toBeGreaterThan(0.5 / PATCH_ONE_IN);
    expect(patches / lanes).toBeLessThan(2 / PATCH_ONE_IN);
    expect(grates / pave).toBeGreaterThan(0.5 / GRATE_ONE_IN);
    expect(grates / pave).toBeLessThan(2 / GRATE_ONE_IN);
  });

  it("records the tile and sidewalk size the later sections rely on", () => {
    expect(SIDEWALK_TOP_M).toBeCloseTo(0.3, 9);
    expect(TILE_M).toBe(5);
  });
});

describe("block variety: 90 degrees, not a grid of squares (ticket 057 F, criterion 16)", () => {
  it("pins the numbers of 19.5: blocks of 6 to 16 cells (30 to 80 m), neighbours 2 cells apart, and the rules the layout holds itself to", () => {
    expect(BLOCK_TILES).toEqual({ min: 6, max: 16 });
    expect(BLOCK_STEP_MIN_CELLS).toBe(2);
    expect(BLOCK_CV_MIN).toBe(0.15);
    expect(BLOCK_NONSQUARE_MIN).toBe(0.7);
    expect([BLOCK_SMALL_MAX_M, BLOCK_LONG_MIN_M, BLOCK_LONG_SHORT_MAX_M, BLOCK_LARGE_MIN_M]).toEqual([40, 60, 45, 55]);
    // A block needs one side that can hold a 10 m tile of bays inside a street side's share cap (056's P3), so 7 cells; and the draws are capped.
    expect(Math.ceil((2 * TILE_M) / KERB_BAY_SHARE_MAX.street / TILE_M)).toBe(7);
    expect(BLOCK_MEAN_MIN_CELLS).toBe(10);
    expect(BLOCK_DRAWS_MAX).toBe(64);
  });

  it("keeps every block's sides inside BLOCK_TILES and neighbouring blocks on each axis at least BLOCK_STEP_MIN_CELLS apart, on every size and seed", () => {
    forAll((v, _l, ok) => {
      const cols = v.c.blocks.filter((b) => b.bj === 0).sort((p, q) => p.bi - q.bi);
      const rows = v.c.blocks.filter((b) => b.bi === 0).sort((p, q) => p.bj - q.bj);
      for (const axis of [cols.map((b) => b.i1 - b.i0), rows.map((b) => b.j1 - b.j0)]) {
        axis.forEach((n, k) => {
          ok(n >= BLOCK_TILES.min && n <= BLOCK_TILES.max, `size ${n} outside BLOCK_TILES`);
          if (k > 0) ok(Math.abs(n - axis[k - 1]!) >= BLOCK_STEP_MIN_CELLS, `neighbours ${axis[k - 1]} and ${n}`);
        });
        // Up to 11 sizes exist, so no two blocks on one axis share a size.
        ok(new Set(axis).size === axis.length, `a size repeats in ${axis.join(",")}`);
      }
      // Every block of a column shares its width and every block of a row its depth: lines stay straight.
      for (const b of v.c.blocks) {
        ok(b.i1 - b.i0 === cols[b.bi]!.i1 - cols[b.bi]!.i0, `${b.id} width`);
        ok(b.j1 - b.j0 === rows[b.bj]!.j1 - rows[b.bj]!.j0, `${b.id} depth`);
      }
    });
  });

  it("keeps every street one profile along its whole length: each of its bands is a full row (or column) of the city, junctions and crossings included", () => {
    forAll((v, _l, ok) => {
      for (const s of v.c.streets) {
        const len = s.axis === "x" ? v.W : v.H;
        for (let k = 0; k < s.bands.length; k++) {
          for (let a = 0; a < len; a++) {
            const i = s.axis === "x" ? a : s.across0 + s.bands.length - 1 - k;
            const j = s.axis === "x" ? s.across0 + k : a;
            ok(v.role[j * v.W + i] !== null, `${s.id} band ${k} has no cell at ${a}`);
          }
        }
        ok(s.bands.length === (s.profile === "avenue" ? 6 : 5), `${s.id} is a ${s.profile} of ${s.bands.length} bands`);
      }
    });
  });

  it("types every block by its sides: small (both at most 40 m), long (one at least 60 m, the other at most 45 m), large (both at least 55 m), else medium", () => {
    const cases: [number, number, string][] = [
      [6, 6, "small"],
      [8, 8, "small"],
      [8, 6, "small"],
      [9, 6, "medium"],
      [9, 8, "medium"],
      [10, 8, "medium"],
      [12, 10, "medium"],
      [11, 9, "medium"],
      [12, 9, "long"],
      [9, 12, "long"],
      [13, 6, "long"],
      [16, 8, "long"],
      [16, 9, "long"],
      [16, 10, "medium"],
      [11, 11, "large"],
      [12, 11, "large"],
      [12, 12, "large"],
      [16, 16, "large"],
    ];
    for (const [w, d, want] of cases) expect(blockType(w, d), `${w} x ${d}`).toBe(want);
    // Turning a block round does not change its type.
    for (const [w, d] of cases) expect(blockType(d, w)).toBe(blockType(w, d));
    // Every block carries the type its own sides give, and every type turns up in the cities of the ticket.
    const seen = new Set<string>();
    forAll((v, _l, ok) => {
      for (const b of v.c.blocks) {
        ok(b.type === blockType(b.i1 - b.i0, b.j1 - b.j0), `${b.id} is typed ${b.type}`);
        seen.add(b.type);
      }
    });
    expect([...seen].sort()).toEqual(["large", "long", "medium", "small"]);
  });

  it("is not a grid of squares: V1 and V2 hold on every size and seed that has more than one block, the layout's own mean (BLOCK_MEAN_MIN_CELLS) and its bay-side rule too", () => {
    forAll((v, _l, ok) => {
      const m = blockVariety(v.c);
      if (v.c.blocks.length > 1) {
        const verdicts = evaluateVariety(m);
        ok(verdicts.every((x) => x.pass), `${JSON.stringify(verdicts)}`);
      } else {
        // One block has no neighbour to differ from, but is not a square.
        ok(m.square === 0, "a 1 x 1 city's block is square");
      }
      const mean = (a: readonly number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
      ok(mean(m.widths) >= BLOCK_MEAN_MIN_CELLS && mean(m.depths) >= BLOCK_MEAN_MIN_CELLS, `means ${mean(m.widths)} and ${mean(m.depths)}`);
      for (const b of v.c.blocks) ok(Math.max(b.i1 - b.i0, b.j1 - b.j0) * TILE_M >= 35, `${b.id} has no side of 35 m`);
    });
  });

  it("gives different seeds different blocks, and stays one city per size and seed", () => {
    const shapes = new Set(SEEDS_B.map((s) => cityAt(s).blocks.map((b) => `${b.i1 - b.i0}x${b.j1 - b.j0}`).join(",")));
    expect(shapes.size).toBeGreaterThanOrEqual(8);
    expect(JSON.stringify(cityAt(3).blocks)).toBe(JSON.stringify(cityAt(3).blocks));
  });
});

describe("pure (criterion 8)", () => {
  it("imports nothing from three, the DOM, src/grid or src/night", () => {
    const src = readFileSync(join("src", "render3d", "tilecity.ts"), "utf8");
    const specs = [...src.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/gms)].map((m) => m[1]!);
    expect(specs.length).toBeGreaterThan(0);
    for (const s of specs) {
      expect(s).not.toMatch(/three/);
      expect(s).not.toMatch(/(^|\/)grid(\/|$)/);
      expect(s).not.toMatch(/(^|\/)night(\/|$)/);
      expect(["./town", "./furniture", "../render/city"]).toContain(s);
    }
    expect(src).not.toMatch(/\b(document|HTMLElement|HTMLCanvasElement|navigator|requestAnimationFrame|localStorage)\b/);
    expect(src).not.toMatch(/\bimport\s*\(/);
  });
});

// =====================================================================================================================================================================
// Ticket 055 B: lots on tile streets. Sizes below are typed in from the converted City Pack manifest (18 Nov 2026): [name, width, height, depth] in metres, centred bounds.
// =====================================================================================================================================================================

const PIECE_SIZES: [string, number, number, number][] = [
  ["SM_Bld_Apartment_01", 5.0, 3.0, 5.196],
  ["SM_Bld_Apartment_02", 5.17, 3.0, 5.214],
  ["SM_Bld_Apartment_03", 5.281, 3.0, 5.497],
  ["SM_Bld_Apartment_Corner_01", 5.196, 3.0, 5.196],
  ["SM_Bld_Apartment_Corner_02", 5.214, 3.0, 5.214],
  ["SM_Bld_Apartment_Corner_03", 5.491, 3.0, 5.497],
  ["SM_Bld_Apartment_Door_01", 5.096, 3.0, 5.577],
  ["SM_Bld_Apartment_Door_02", 5.114, 3.0, 5.115],
  ["SM_Bld_Apartment_Roof_01", 5.31, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_02", 5.252, 0.744, 5.488],
  ["SM_Bld_Apartment_Roof_03", 5.31, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_01", 5.904, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_Corner_02", 5.611, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_03", 5.462, 0.744, 5.488],
  ["SM_Bld_Apartment_Stack_01", 5.0, 9.0, 5.196],
  ["SM_Bld_Apartment_Stack_02", 5.17, 9.0, 5.214],
  ["SM_Bld_Apartment_Stack_03", 5.281, 9.0, 5.497],
  ["SM_Bld_Shop_01", 5.0, 3.054, 5.536],
  ["SM_Bld_Shop_02", 5.0, 3.3, 5.425],
  ["SM_Bld_Shop_03", 10.087, 3.084, 5.493],
  ["SM_Bld_Shop_04", 5.106, 3.17, 5.886],
  ["SM_Bld_Shop_05", 5.108, 3.0, 5.224],
  ["SM_Bld_Shop_06", 5.175, 3.0, 5.877],
  ["SM_Bld_Shop_Corner_01", 5.377, 3.0, 5.471],
  ["SM_Bld_Shop_Corner_02", 5.332, 3.0, 5.332],
  ["SM_Bld_OfficeOld_Small_Base_01", 10.936, 6.0, 10.936],
  ["SM_Bld_OfficeOld_Small_Floor_01", 10.0, 3.193, 10.0],
  ["SM_Bld_OfficeOld_Small_Roof_01", 11.12, 4.215, 11.2],
  ["SM_Bld_OfficeOld_Large_Base_01", 15.936, 6.0, 15.936],
  ["SM_Bld_OfficeOld_Large_Floor_01", 15.0, 3.193, 15.0],
  ["SM_Bld_OfficeOld_Large_Roof_01", 16.087, 4.227, 16.123],
  ["SM_Bld_OfficeOctagon_Base_01", 20.781, 3.896, 20.781],
  ["SM_Bld_OfficeOctagon_Floor_01", 20.465, 3.0, 20.465],
  ["SM_Bld_OfficeOctagon_Roof_01", 20.465, 5.382, 20.465],
  // dressing
  ["SM_Bld_Cover_01", 4.832, 1.075, 1.0],
  ["SM_Bld_Cover_02", 1.366, 0.974, 0.701],
  ["SM_Bld_FireEscape_01", 3.251, 1.492, 1.644],
  ["SM_Bld_FireEscape_02", 3.251, 3.609, 1.644],
  ["SM_Bld_FireEscape_03", 4.252, 3.802, 1.76],
  ["SM_Bld_Roof_Access_01", 2.758, 2.744, 2.851],
  ["SM_Bld_Shop_01_Glass", 4.891, 1.863, 0.323],
  ["SM_Bld_Shop_02_Glass", 4.311, 2.513, 0],
  ["SM_Bld_Shop_03_Glass", 8.738, 2.211, 0.293],
  ["SM_Bld_Shop_04_Glass", 4.765, 2.442, 0.705],
  ["SM_Bld_Shop_05_Glass", 4.817, 2.017, 0.054],
  ["SM_Bld_Shop_Corner_01_Glass", 4.809, 1.698, 4.787],
  ["SM_Bld_Shop_Corner_02_Glass", 4.729, 2.189, 4.729],
  ["SM_Bld_Shop_Cover_01", 4.574, 0.297, 2.815],
  ["SM_Bld_Shop_Cover_02", 4.706, 1.202, 3.235],
  ["SM_Bld_Shop_Cover_03", 5.0, 1.758, 3.501],
  ["SM_Bld_Shop_Cover_04", 5.104, 0.663, 0.732],
  ["SM_Bld_Shop_Cover_05", 5.394, 0.682, 5.394],
  ["SM_Prop_ATM_01", 1.128, 1.537, 0.519],
  ["SM_Prop_Aircon_01", 0.823, 0.995, 0.651],
  ["SM_Prop_Billboard_Roof_01", 4.428, 3.063, 1.611],
  ...(["01", "02", "03", "04", "05", "06", "07"].map((n) => [`SM_Prop_Billboard_Sign_${n}`, 4.193, 2.028, 0.118]) as [string, number, number, number][]),
  ["SM_Prop_LargeSign_Beer_01", 2.005, 3.333, 2.019],
  ["SM_Prop_LargeSign_Bottle_01", 1.8, 5.818, 1.8],
  ["SM_Prop_LargeSign_BowlingBall_01", 3.019, 3.174, 3.174],
  ["SM_Prop_LargeSign_BowlingPin_01", 1.631, 5.156, 1.631],
  ["SM_Prop_LargeSign_Burger_01", 3.715, 2.178, 3.717],
  ["SM_Prop_LargeSign_Coffee_01", 2.194, 1.346, 1.625],
  ["SM_Prop_LargeSign_Donut_01", 3.818, 1.355, 3.818],
  ["SM_Prop_LargeSign_Guitar_01", 2.098, 6.378, 0.377],
  ["SM_Prop_LargeSign_Hotdog_01", 1.411, 1.143, 3.926],
  ["SM_Prop_LargeSign_Icecream_01", 1.93, 5.04, 1.93],
  ["SM_Prop_LargeSign_Lollypop_01", 3.365, 6.36, 0.512],
  ["SM_Prop_LargeSign_Milkshake_01", 2.238, 4.699, 1.721],
  ["SM_Prop_LargeSign_Noodles_01", 2.948, 3.601, 2.515],
  ["SM_Prop_LargeSign_Pizza_01", 3.368, 0.562, 2.957],
  ["SM_Prop_LargeSign_Popcorn_01", 1.737, 2.797, 1.737],
  ["SM_Prop_LargeSign_Soda_01", 1.915, 5.595, 1.915],
  ["SM_Prop_LargeSign_Taco_01", 1.215, 2.223, 3.701],
  ["SM_Prop_PlanterWindow_01", 0.988, 0.743, 0.37],
  ["SM_Prop_PlanterWindow_02", 0.87, 0.743, 0.332],
  ["SM_Prop_Roof_Aircon_01", 0.948, 0.592, 0.467],
  ["SM_Prop_Roof_Aircon_02", 1.586, 1.073, 0.798],
  ["SM_Prop_Roof_Aircon_03", 1.546, 1.05, 1.0],
  ["SM_Prop_SatDish_01", 1.21, 1.344, 0.682],
  ["SM_Prop_Sign_Bar_01", 1.327, 0.673, 0.138],
  ["SM_Prop_Sign_Barber_01", 0.316, 0.948, 0.474],
  ["SM_Prop_Sign_Cafe_01", 1.347, 0.553, 0.11],
  ["SM_Prop_Sign_Chinese_Noodles_01", 0.853, 0.507, 0.179],
  ["SM_Prop_Sign_DeliPizza_01", 0.301, 1.551, 0.14],
  ["SM_Prop_Sign_Entrance_01", 1.0, 0.436, 0.063],
  ["SM_Prop_Sign_Hotel_01", 1.267, 3.801, 0.3],
  ["SM_Prop_Sign_Pizza_01", 2.211, 0.704, 0.144],
  ["SM_Prop_Sign_Pub_01", 1.13, 0.547, 0.112],
  ["SM_Prop_Vents_Exhaust_01", 0.868, 1.63, 2.727],
  ["SM_Prop_Vents_Straight_01", 0.868, 0.803, 2.5],
  ["SM_Prop_Water_Tower_01", 2.42, 5.509, 2.419],
];

/** The furniture's own sizes (`ParkingLines` is a flat tile: height 0). */
const FURN_SIZES: [string, number, number, number][] = [
  ["SM_Prop_Trashbin_01", 0.647, 1.178, 0.647],
  ["SM_Prop_Trashbin_02", 0.721, 1.595, 0.582],
  ["SM_Prop_Planter_01", 2.301, 0.81, 0.701],
  ["SM_Prop_Planter_02", 1.511, 0.782, 0.463],
  ["SM_Prop_PotPlant_01", 0.565, 0.797, 0.578],
  ["SM_Prop_PotPlant_02", 0.694, 1.555, 0.639],
  ["SM_Prop_ParkBench_01", 2.079, 1.048, 0.624],
  ["SM_Prop_Mailbox_01", 0.666, 1.216, 0.586],
  ["SM_Prop_Newspaper_02", 0.613, 1.172, 0.478],
  ["SM_Prop_ParkingMeter_01", 0.225, 1.455, 0.128],
  ["SM_Prop_Hydrant_01", 0.551, 1.053, 0.54],
  ["SM_Env_Tree_01", 1.866, 4.208, 2.511],
  ["SM_Env_Tree_02", 2.236, 4.676, 1.54],
  ["SM_Env_Tree_03", 2.217, 3.845, 1.894],
  ["SM_Prop_SidewalkPoles_02", 0.209, 1.124, 0.209],
  ["SM_Prop_BusStop_01", 4.511, 3.073, 1.571],
  ["SM_Env_Road_ParkingLines_01", 10, 0, 5],
  ["SM_Prop_Barrier_01", 1.435, 0.983, 0.664],
  ["SM_Prop_ParkingMeter_02", 0.772, 1.869, 0.526],
  ["SM_Prop_Billboard_Pole_01", 0.606, 6.897, 0.606],
  ["SM_Prop_Billboard_01", 4.428, 2.345, 0.82],
  ["SM_Env_Sidewalk_Panel_02", 5, 0.094, 5],
  ["SM_Prop_PicnicTable_01", 2.483, 1.008, 1.687],
  ["SM_Prop_Umbrella_01", 1.597, 1.349, 1.597],
  ["SM_Prop_HotdogStand_01", 2.961, 3.662, 2.393],
];

const entryOf = ([name, w, h, d]: [string, number, number, number], i: number): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles: 100 + i,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const ENTRIES: ReadonlyMap<CalibrationKey, AssetEntry> = new Map([...PIECE_SIZES, ...FURN_SIZES].map((s, i) => [`city-pack:${s[0]}` as CalibrationKey, entryOf(s, i)] as const));

const SEEDS_B = Array.from({ length: 10 }, (_, k) => k + 1);
const near = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) <= tol;
const cityAt = (seed: number, bx = 3, bz = 3): TileCity => tileCity({ blocksX: bx, blocksZ: bz, seed });
/** A role lookup per cell for a city, built once. */
const gridOf = (c: TileCity): ((x_m: number, z_m: number) => TileRole | null) => {
  const W = Math.round(c.town.window.maxX / U / TILE_M);
  const H = Math.round(c.town.window.maxY / U / TILE_M);
  const g = new Array<TileRole | null>(W * H).fill(null);
  for (const cell of c.cells) {
    g[cell.j * W + cell.i] = cell.role;
    if (cell.cells === 2) g[(cell.j + (cell.street!.startsWith("x:") ? 0 : 1)) * W + cell.i + (cell.street!.startsWith("x:") ? 1 : 0)] = cell.role;
  }
  // A park's pavement edge is pavement a row can face (057 G).
  for (const cell of c.interior) if (cell.role === "parkEdge") g[cell.j * W + cell.i] = "pavement";
  return (x, z) => {
    const i = Math.floor(x / TILE_M + 1e-9);
    const j = Math.floor(z / TILE_M + 1e-9);
    return i < 0 || j < 0 || i >= W || j >= H ? null : (g[j * W + i] ?? null);
  };
};

describe("terraceBlockRows (criterion 9: the extraction)", () => {
  /** A block 50 m by 60 m with its corner at the origin, a tile city's way: fronts on the block's edge, no setback. */
  const sides = (): [TerraceSide, TerraceSide, TerraceSide, TerraceSide] => {
    const x1 = 50 * U;
    const z1 = 60 * U;
    return [
      { road: "x:0", side: 1, ax: 0, az: 0, ux: 1, uz: 0, mx: 0, mz: 1, span: x1 },
      { road: "z:1", side: 1, ax: x1, az: 0, ux: 0, uz: 1, mx: -1, mz: 0, span: z1 },
      { road: "x:1", side: -1, ax: x1, az: z1, ux: -1, uz: 0, mx: 0, mz: -1, span: x1 },
      { road: "z:0", side: -1, ax: 0, az: z1, ux: 0, uz: -1, mx: 1, mz: 0, span: z1 },
    ];
  };

  it("lays four rows of abutting terrace lots on the block's edge with a frontOff of 0, and numbers the lots from lotBase", () => {
    const claimed: TerraceBox[] = [];
    const frame = { wall_m: 0, kerb_m: TILE_M };
    const r = terraceBlockRows({ id: "block:t:0" }, sides(), { frontOff: 0, claim: (b) => claimed.push(b), lotBase: 100, frame });
    expect(r.lots.length).toBeGreaterThan(10);
    expect(r.runs.length).toBeGreaterThanOrEqual(4);
    expect(claimed.length).toBe(r.lots.length + r.openLots.length);
    // The top row's first run starts on the top edge, its lots stand 6 m deep inside it, and every run carries the frame.
    const top = r.runs.find((run) => run.road === "x:0")!;
    expect(top.az).toBeCloseTo(0, 9);
    expect(top.frame).toEqual(frame);
    expect(top.lots[0]).toBe(100);
    for (const run of r.runs) {
      expect(run.frame).toBe(frame);
      run.lots.forEach((li, k) => expect(r.lots[li - 100]!.terrace).toMatchObject({ run: run.id, index: k }));
    }
    const first = r.lots[0]!;
    expect(first.z - first.d / 2).toBeCloseTo(0, 9);
    expect(first.d / U).toBeCloseTo(6, 9);
  });

  it("starts an open lot on a multiple of snap_m and lays a plaza of plazaW_m", () => {
    // Find a block id whose hash gives a plaza and a run id whose hash gives a parking lot: ask for both by name.
    let plazaSeen = false;
    let parkSeen = false;
    for (let k = 0; k < 40 && !(plazaSeen && parkSeen); k++) {
      const id = `block:s:${k}`;
      const keys = new Set<string>();
      for (const sd of sides()) for (let n = 0; n < 3; n++) keys.add(terraceRunKey(id, sd.road, sd.side, n));
      const r = terraceBlockRows({ id }, sides(), { frontOff: 0, snap_m: TILE_M, plazaW_m: 10, parkRuns: keys });
      for (const o of r.openLots) {
        const left = (o.x - o.w / 2) / U;
        const top = (o.z - o.d / 2) / U;
        // Axis-aligned, 10 m square or the parking lot's size, on the 5 m grid of the block's corner.
        expect(near(o.w / U, 10) && near(o.d / U, 10), `${o.kind} size`).toBe(true);
        expect(near(left / TILE_M, Math.round(left / TILE_M), 1e-6) && near(top / TILE_M, Math.round(top / TILE_M), 1e-6), `${o.kind} on the grid at ${left},${top}`).toBe(true);
        if (o.kind === "plaza") plazaSeen = true;
        else parkSeen = true;
      }
    }
    expect(plazaSeen && parkSeen).toBe(true);
  });

  it("starts a row startInset_m in from its corner, asking whether it ends at or starts after a plaza", () => {
    const asked: number[] = [];
    // A block id whose top row has no plaza at its start.
    const id = Array.from({ length: 60 }, (_, k) => `block:t:${k}`).find((q) => terraceBlockRows({ id: q }, sides(), { frontOff: 0 }).runs.find((run) => run.road === "x:0")!.ax === 0)!;
    expect(id).toBeDefined();
    const r = terraceBlockRows({ id }, sides(), { frontOff: 0, startInset_m: (row) => (asked.push(row), 2) });
    expect(asked.slice(0, 4)).toEqual([0, 1, 2, 3]);
    const top = r.runs.find((run) => run.road === "x:0")!;
    expect(top.ax / U).toBeCloseTo(2, 9);
    // The row's last run ends at the same wall, so it is the inset shorter (the first may end at a lot, which moves with it).
    const plain = terraceBlockRows({ id }, sides(), { frontOff: 0 });
    const lastOf = (x: typeof plain): TerraceRun => x.runs.filter((run) => run.road === "x:0").pop()!;
    expect(lastOf(plain).len / U - lastOf(r).len / U).toBeCloseTo(2, 9);
  });

  it("changes nothing without options: the defaults are the ladder's (the digests in townpin.test.ts pin the whole town)", () => {
    const a = terraceBlockRows({ id: "block:t:1" }, sides());
    const b = terraceBlockRows({ id: "block:t:1" }, sides(), { frontOff: ROAD_W / 2 + PAVE_W + SETBACK });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    for (const run of a.runs) expect("frame" in run).toBe(false);
  });
});

describe("flush corners (criterion 4: ticket 057 B, 19.2)", () => {
  it("has no row inset: TILE_ROW_INSET_M is 0, and 055 B's tileRowInset_m and TILE_INSET_MAX_M are gone", () => {
    expect(TILE_ROW_INSET_M).toBe(0);
    expect("tileRowInset_m" in tileModule).toBe(false);
    expect("TILE_INSET_MAX_M" in tileModule).toBe(false);
  });

  it("starts every run with a startCorner exactly at its side's corner (within 1e-6 m), and each first lot keeps its cornerSides", () => {
    for (const seed of [1, 2, 3]) {
      const c = tileCity({ blocksX: 3, blocksZ: 3, seed });
      let atCorner = 0;
      let atAlley = 0;
      let rows = 0;
      for (const part of c.parts) rows += part.alleySide === null ? 4 : 3;
      for (const run of c.town.terraces) {
        // Every block is laid in parts (057 G): the corners are the part's, which are the block's for a block with no alley or park.
        const b = c.parts.find((q) => q.id === run.block)!;
        const x0 = b.i0 * TILE_M * U;
        const x1 = b.i1 * TILE_M * U;
        const z0 = b.j0 * TILE_M * U;
        const z1 = b.j1 * TILE_M * U;
        const corners = [{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 }];
        const dists = corners.map((p) => Math.hypot(run.ax - p.x, run.az - p.z) / WORLD_PER_METRE);
        const d = Math.min(...dists);
        if (!run.startCorner) {
          // A run that does not start at a corner (it follows a lot or a plaza) is off every corner; a row that starts at the edge of an alley is at its corner and has no cross street there.
          if (b.alleySide !== null && dists[(b.alleySide + 1) % 4]! < 1e-6) {
            atAlley++;
            continue;
          }
          expect(d, `${seed} ${run.id}`).toBeGreaterThan(1e-6);
          continue;
        }
        atCorner++;
        expect(d, `${seed} ${run.id}`).toBeLessThan(1e-6);
        const first = c.town.lots[run.lots[0]!]!;
        expect(first.corner, `${seed} ${run.id}`).toBe(true);
        expect(first.cornerSides.length, `${seed} ${run.id}`).toBe(1);
      }
      // Four rows to a part (three beside an alley: the row on the alley's side is a rear, not laid), each starting at its corner but the ones that start after a plaza (the plaza takes the corner).
      const plazas = c.town.openLots.filter((o) => o.kind === "plaza").length;
      expect(atCorner + atAlley + plazas, `seed ${seed}`).toBe(rows);
      expect(atAlley, `seed ${seed}`).toBeLessThanOrEqual(c.parts.filter((q) => q.alleySide !== null).length);
    }
  });
});

describe("terraces on tile streets (criterion 10)", () => {
  const cities = [undefined, ...SEEDS_B].map((s) => (s === undefined ? tileCity() : cityAt(s)));

  it("puts every run's front line, and every lot's front edge, on its pavement's back edge, and every block side carries a run", () => {
    const fails: string[] = [];
    for (const c of cities) {
      const t = c.town;
      const boxes = t.pavements.map((p) => ({ x0: Math.min(...p.pts.map((q) => q.x)), x1: Math.max(...p.pts.map((q) => q.x)), z0: Math.min(...p.pts.map((q) => q.z)), z1: Math.max(...p.pts.map((q) => q.z)) }));
      // Every block is laid in parts (057 G): a part has a row on each side but the alley's (a rear), and a row facing a park stands on the park's pavement edge, which is not a street's pavement.
      for (const pt of c.parts) {
        const b = { id: pt.id, minX: pt.i0 * TILE_M * U, maxX: pt.i1 * TILE_M * U, minZ: pt.j0 * TILE_M * U, maxZ: pt.j1 * TILE_M * U };
        const runs = t.terraces.filter((r) => r.block === b.id);
        const want = pt.alleySide === null ? 4 : 3;
        if (runs.length < want) fails.push(`${c.seed} ${b.id} has ${runs.length} runs`);
        const sidesSeen = new Set(runs.map((r) => `${r.road}|${r.side}`));
        if (sidesSeen.size !== want) fails.push(`${c.seed} ${b.id} sides ${sidesSeen.size}`);
        for (const r of runs) {
          const horizontal = Math.abs(r.uz) < 1e-9;
          const from = horizontal ? r.ax : r.az;
          const to = from + (horizontal ? r.ux : r.uz) * r.len;
          const lo = Math.min(from, to);
          const hi = Math.max(from, to);
          // The pavement whose back edge the front line lies on: a box with that edge at the line, covering the run's extent.
          const ok =
            r.road.startsWith("park:") ||
            boxes.some((p) =>
              horizontal
                ? (near(p.z1, r.az) || near(p.z0, r.az)) && p.x0 <= lo + 1e-6 && p.x1 >= hi - 1e-6 && (near(p.z1, b.minZ) || near(p.z0, b.maxZ))
                : (near(p.x1, r.ax) || near(p.x0, r.ax)) && p.z0 <= lo + 1e-6 && p.z1 >= hi - 1e-6 && (near(p.x1, b.minX) || near(p.x0, b.maxX)),
            );
          if (!ok) fails.push(`${c.seed} ${r.id} front line is not on a pavement's back edge`);
          for (const li of r.lots) {
            const l = t.lots[li]!;
            const fx = Math.sin(l.yaw);
            const fz = Math.cos(l.yaw);
            const frontX = l.x + (fx * l.d) / 2;
            const frontZ = l.z + (fz * l.d) / 2;
            const edge = horizontal ? frontZ : frontX;
            if (!near(edge, horizontal ? r.az : r.ax)) fails.push(`${c.seed} ${l.key} front edge ${edge}`);
          }
        }
      }
    }
    expect(fails.slice(0, 8)).toEqual([]);
  });

  /** Pack every city once; the tests below read the numbers. */
  const packs = new Map<number, Map<string, PackResult>>();
  const packOf = (c: TileCity): Map<string, PackResult> => {
    let m = packs.get(c.seed);
    if (!m) {
      m = packTown({ terraces: c.town.terraces, lots: c.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
      packs.set(c.seed, m);
    }
    return m;
  };
  /** Whether `run` is the first run after a parking lot in its row. */
  const afterLot = (c: TileCity, run: TerraceRun): boolean => {
    const k = c.town.terraces.indexOf(run);
    const prev = k > 0 ? c.town.terraces[k - 1]! : null;
    return prev !== null && prev.endAbuts === "parking" && prev.block === run.block && prev.road === run.road && prev.side === run.side;
  };
  /**
   * How every run's far end closed, over the default city and seeds 1 to 10 (ticket 057 B, 19.2): a seam (0.1 m or less), an overshoot into the next row's corner block (at most END_OVERLAP_MAX_M), a
   * gated passage (PASSAGE_W_M: 1.0 m to one column) or neither (`slit`: 0.1 to 1.0 m; `wide`: over a column). With `only`, the runs it accepts.
   */
  const farEnds = (only: (c: TileCity, run: TerraceRun) => boolean = () => true): { runs: number; seam: number; overshoot: number; passage: number; slit: number; wide: number; overshootMax: number } => {
    const out = { runs: 0, seam: 0, overshoot: 0, passage: 0, slit: 0, wide: 0, overshootMax: 0 };
    for (const c of cities) {
      for (const run of c.town.terraces) {
        const res = packOf(c).get(run.id);
        expect(res, `${c.seed} ${run.id} is packed`).toBeDefined();
        expect(res!.blocks.length, `${c.seed} ${run.id} has blocks`).toBeGreaterThan(0);
        if (!only(c, run)) continue;
        out.runs++;
        const g = res!.farGap_m;
        const over = res!.farOvershoot_m ?? 0;
        if (over > 1e-9) {
          out.overshoot++;
          out.overshootMax = Math.max(out.overshootMax, over);
        } else if (g <= TERRACE_SEAM_M + 1e-9) out.seam++;
        else if (g >= PASSAGE_W_M.min - 1e-9 && g <= PASSAGE_W_M.max + 1e-9) out.passage++;
        else if (g < PASSAGE_W_M.min) out.slit++;
        else out.wide++;
      }
    }
    return out;
  };

  it("holds the far-end numbers of 19.2: an overshoot of at most 1.0 m, a passage of 1.0 m to one column (5.3 m)", () => {
    expect(END_OVERLAP_MAX_M).toBe(1.0);
    expect(PASSAGE_W_M).toEqual({ min: 1.0, max: 5.3 });
    expect(TERRACE_SEAM_M).toBe(0.1);
  });

  it("closes every run's far end as a seam, an overshoot of at most END_OVERLAP_MAX_M into the next corner block, or a gated passage of PASSAGE_W_M, and never in a slit (criterion 5)", { timeout: 120000 }, () => {
    const e = farEnds();
    expect(e.runs).toBeGreaterThan(300);
    expect(e.slit, JSON.stringify(e)).toBe(0);
    expect(e.wide, JSON.stringify(e)).toBe(0);
    expect(e.seam + e.overshoot + e.passage, JSON.stringify(e)).toBe(e.runs);
    expect(e.overshootMax, JSON.stringify(e)).toBeLessThanOrEqual(END_OVERLAP_MAX_M + 1e-9);
    // Not vacuous: the three ways all occur (the columns' own widths decide how often).
    expect(e.overshoot, JSON.stringify(e)).toBeGreaterThan(0);
    expect(e.passage, JSON.stringify(e)).toBeGreaterThan(0);
  });

  it("closes the run after a parking lot like any other run: no 0.85 test that leaves it out, no 0.75 and 0.70 floors (056 A's temporary ones are retired)", { timeout: 120000 }, () => {
    const after = farEnds((c, run) => afterLot(c, run));
    expect(after.runs).toBeGreaterThan(10);
    expect(after.slit, JSON.stringify(after)).toBe(0);
    expect(after.wide, JSON.stringify(after)).toBe(0);
    expect(after.seam + after.overshoot + after.passage, JSON.stringify(after)).toBe(after.runs);
    // And the runs that end at a corner, all of them: every one is closed.
    const corner = farEnds((_c, run) => run.endAbuts === "corner");
    expect(corner.runs).toBeGreaterThan(250);
    expect(corner.seam + corner.overshoot + corner.passage, JSON.stringify(corner)).toBe(corner.runs);
  });

  it("overshoots only where a corner block stands beyond: a run that ends at a lot, a plaza or a clearance never overshoots", { timeout: 120000 }, () => {
    let overshoots = 0;
    for (const c of cities) {
      for (const run of c.town.terraces) {
        const over = packOf(c).get(run.id)!.farOvershoot_m ?? 0;
        if (over > 1e-9) {
          overshoots++;
          expect(run.endAbuts, `${c.seed} ${run.id}`).toBe("corner");
        }
      }
    }
    expect(overshoots).toBeGreaterThan(0);
  });

  it("records every gated passage once, on the pavement's back edge of its run, 1.0 m to one column wide, facing the street (TileCity.passages)", { timeout: 120000 }, () => {
    expect(cities[0]!.passages).toEqual([]);
    for (const c of cities) {
      const list = tilePassages(c, packOf(c));
      const withThem = withPassages(c, list);
      expect(withThem.passages).toEqual(list);
      expect(Object.isFrozen(withThem)).toBe(true);
      expect(withThem.town).toBe(c.town);
      const e = frontageMetrics(c, packOf(c)).farEnds;
      expect(list.length, `seed ${c.seed}`).toBe(e.passage);
      const ids = new Set<string>();
      for (const p of list) {
        expect(ids.has(p.run), `${c.seed} ${p.run} has two passages`).toBe(false);
        ids.add(p.run);
        expect(p.w_m, `${c.seed} ${p.run}`).toBeGreaterThanOrEqual(PASSAGE_W_M.min - 1e-9);
        expect(p.w_m, `${c.seed} ${p.run}`).toBeLessThanOrEqual(PASSAGE_W_M.max + 1e-9);
        const run = c.town.terraces.find((r) => r.id === p.run)!;
        // The mouth's middle is on the run's front line (the pavement's back edge) and between the run's ends.
        const along = ((p.x_m * U - run.ax) * run.ux + (p.z_m * U - run.az) * run.uz) / U;
        const across = ((p.x_m * U - run.ax) * -run.uz + (p.z_m * U - run.az) * run.ux) / U;
        expect(Math.abs(across), `${c.seed} ${p.run} off the edge`).toBeLessThan(1e-6);
        expect(along, `${c.seed} ${p.run}`).toBeGreaterThan(0);
        expect(along, `${c.seed} ${p.run}`).toBeLessThanOrEqual(run.len / U + PASSAGE_W_M.max);
        expect([0, 90, 180, 270]).toContain(p.yaw);
      }
    }
  });

  const planOf = (c: TileCity): { m: CityMetrics } => {
    const t = c.town;
    const packed = packOf(c);
    const sites = dressSitesOf(runBlocks(t.terraces, packed));
    const dressing = dressTown(sites, ENTRIES, BUILDING_FRONTS).map((x) => [...x]);
    return { m: cityMetrics(t, packed, dressing, []) };
  };

  it("passes R1 to R5 and R8 to R13 (evaluateCity) on the packed and dressed plan of every city, with the tile frame read by the dressing (R1, R6 and R7 on the tile city's own floors, below)", { timeout: 120000 }, () => {
    expect(TILE_CITY_R1_MIN).toBe(0.88);
    expect(CITY_CHECK.R1).toBe(0.9);
    for (const c of cities) {
      const { m } = planOf(c);
      // R1 on the tile city's floor (Josh, 19 Nov 2026: 0.88; the ladder's stays 0.9), with the rest of R1's conditions as they are.
      expect(m.frontageCovered, `seed ${c.seed} R1`).toBeGreaterThanOrEqual(TILE_CITY_R1_MIN);
      expect(m.maxNeighbourGap_m, `seed ${c.seed} R1`).toBeLessThanOrEqual(1e-6);
      expect(m.maxParkingPerRun <= 1 && m.maxPlazaPerRun <= 1, `seed ${c.seed} R1`).toBe(true);
      const failing = evaluateCity(m).filter((v) => !v.pass && v.id !== "R1" && v.id !== "R6" && v.id !== "R7");
      expect(failing, `seed ${c.seed} ${JSON.stringify(evaluateCity(m))}`).toEqual([]);
      // Not vacuous: a city of blocks that corner, dressed, with no slit.
      expect(m.blocks, `seed ${c.seed}`).toBeGreaterThan(80);
      expect(m.cornerBlocks, `seed ${c.seed}`).toBeGreaterThan(20);
      expect(m.cornerBlocksOffCorner, `seed ${c.seed}`).toBe(0);
      expect(m.farGaps.slit, `seed ${c.seed}`).toBe(0);
      expect(m.dressPieces, `seed ${c.seed}`).toBeGreaterThan(m.blocks * 3);
      // R7 is checked against the tile city's own floor below.
    }
  });

  // The tile city's R6 floor (Josh, 18 Nov 2026, "Lower it to 0.45 (Recommended)"): the share of shop bays with a sign is 0.49 to 0.55 on the tile city by the dressing's own sign chance, whatever the
  // layout, against the ladder's CITY_CHECK.R6 of 0.5, which stays as it is. The ATM share is the ladder's own floor.
  it("meets the tile city's R6 floor (TILE_CITY_R6_MIN, 0.45) and the ladder's ATM floor on the default city and seeds 1 to 10", { timeout: 120000 }, () => {
    expect(TILE_CITY_R6_MIN).toBe(0.45);
    expect(CITY_CHECK.R6).toBe(0.5);
    for (const c of cities) {
      const { m } = planOf(c);
      expect(m.shopBays, `seed ${c.seed}`).toBeGreaterThan(100);
      expect(m.signedShopBays / m.shopBays, `seed ${c.seed} R6 ${m.signedShopBays}/${m.shopBays}`).toBeGreaterThanOrEqual(TILE_CITY_R6_MIN);
      expect(m.atmBlocks / m.blocks, `seed ${c.seed} ATM ${m.atmBlocks}/${m.blocks}`).toBeGreaterThanOrEqual(CITY_ATM_BLOCKS_MIN);
    }
  });

  // The tile city's R7 floor (Josh, 18 Nov 2026, "Just choose the recommended option for now"): the share of qualifying blocks (3 or more bays, 2 or more floors) with a fire escape is
  // 0.43 to 0.50 on the tile city against the ladder's 0.53 to 0.58 and CITY_CHECK.R7 of 0.5, which stays as it is. It is the dressing's own chance (P_ESCAPE, never two neighbours)
  // over about 50 blocks and the pattern of the tile city's lot keys, not the geometry (with unrelated keys the same plans give 0.56). Dressing and keys are left alone.
  it("meets the tile city's R7 floor (TILE_CITY_R7_MIN, 0.4) on the default city and seeds 1 to 10", { timeout: 120000 }, () => {
    expect(TILE_CITY_R7_MIN).toBe(0.4);
    expect(CITY_CHECK.R7).toBe(0.5);
    for (const c of cities) {
      const { m } = planOf(c);
      const r7 = m.escapeQualifying === 0 ? 1 : m.escapeBlocks / m.escapeQualifying;
      expect(m.escapeQualifying, `seed ${c.seed}`).toBeGreaterThan(30);
      expect(r7, `seed ${c.seed} R7 ${m.escapeBlocks}/${m.escapeQualifying}`).toBeGreaterThanOrEqual(TILE_CITY_R7_MIN);
    }
  });
});

/** The blocks of a plan as `dressTown` sites, as `dressSites` makes them (models3d.ts, which imports three), plus the run's frame. */
function dressSitesOf(list: readonly { run: TerraceRun; block: PackedBlock }[]): DressBlockInput[] {
  const count = new Map<string, number>();
  const lowest = new Map<string, number>();
  const index: number[] = [];
  list.forEach((r, k) => {
    const id = r.block.lot.terrace?.run ?? "";
    const i = count.get(id) ?? 0;
    index.push(i);
    count.set(id, i + 1);
    const low = lowest.get(id);
    if (low === undefined || r.block.stack.height_m < list[low]!.block.stack.height_m) lowest.set(id, k);
  });
  return list.map((r, k) => {
    const id = r.block.lot.terrace?.run ?? "";
    return { stack: r.block.stack, lot: { key: r.block.lot.key, hMax: r.block.lot.hMax }, run: { id, index: index[k]!, lowest: lowest.get(id) === k, ...(r.run.frame ? { frame: r.run.frame } : {}) }, kerbM: KERB_FROM_FRONT_M };
  });
}

describe("parking (criterion 11)", () => {
  const cities = [undefined, ...SEEDS_B].map((s) => (s === undefined ? tileCity() : cityAt(s)));

  it("puts every open lot on the tile grid, 10 m square, inside its block", () => {
    const fails: string[] = [];
    for (const c of cities) {
      for (const o of c.town.openLots) {
        const x0 = (o.x - o.w / 2) / U;
        const z0 = (o.z - o.d / 2) / U;
        const x1 = (o.x + o.w / 2) / U;
        const z1 = (o.z + o.d / 2) / U;
        for (const v of [x0, z0, x1, z1]) if (!near(v / TILE_M, Math.round(v / TILE_M), 1e-6)) fails.push(`${c.seed} ${o.kind} ${o.run} corner at ${v}`);
        if (!near(x1 - x0, TILE_PLAZA_W_M) || !near(z1 - z0, TILE_PLAZA_W_M)) fails.push(`${c.seed} ${o.kind} size ${x1 - x0} x ${z1 - z0}`);
        const b = c.town.blocks.find((q) => q.minX / U <= x0 + 1e-6 && q.maxX / U >= x1 - 1e-6 && q.minZ / U <= z0 + 1e-6 && q.maxZ / U >= z1 - 1e-6);
        if (!b) fails.push(`${c.seed} ${o.kind} ${o.run} is in no block`);
      }
      expect(c.town.openLots.some((o) => o.kind === "plaza")).toBe(true);
    }
    expect(fails.slice(0, 8)).toEqual([]);
  });

  it("cuts the kerb across every parking lot's whole street edge, leaves the parking cells in front of it without a bay, and keeps every bay off cuts, crossings and junctions", () => {
    const fails: string[] = [];
    let lots = 0;
    for (const c of [...cities, cityAt(1, 6, 6)]) {
      const role = gridOf(c);
      for (const o of c.town.openLots) {
        const cx = o.x / U;
        const cz = o.z / U;
        const cells = c.cells.filter((q) => q.role === (o.kind === "parking" ? "lotSurface" : "plaza") && Math.abs(q.x_m - cx) <= TILE_M && Math.abs(q.z_m - cz) <= TILE_M);
        if (cells.length !== 4) fails.push(`${c.seed} ${o.kind} ${o.run} has ${cells.length} surface cells`);
        if (o.kind !== "parking") continue;
        lots++;
        const fx = Math.round(Math.sin(o.yaw));
        const fz = Math.round(Math.cos(o.yaw));
        for (const along of [-TILE_M / 2, TILE_M / 2]) {
          const edgeX = fz !== 0 ? cx + along : cx + fx * (o.d / U / 2 + TILE_M / 2);
          const edgeZ = fz !== 0 ? cz + fz * (o.d / U / 2 + TILE_M / 2) : cz + along;
          if (role(edgeX, edgeZ) !== "kerbCut") fails.push(`${c.seed} ${o.run} street edge at ${edgeX},${edgeZ} is ${role(edgeX, edgeZ)}`);
          const frontX = edgeX + fx * TILE_M;
          const frontZ = edgeZ + fz * TILE_M;
          const front = role(frontX, frontZ);
          if (front === "parking") fails.push(`${c.seed} ${o.run} has a ParkingLines tile in front of its cut`);
          if (c.bays.some((b) => Math.floor(b.x_m / TILE_M) === Math.floor(frontX / TILE_M) && Math.floor(b.z_m / TILE_M) === Math.floor(frontZ / TILE_M))) fails.push(`${c.seed} ${o.run} has a bay in front of its cut`);
        }
      }
      for (const b of c.bays) {
        const half = b.street.startsWith("x:") ? [b.w_m / 2, b.d_m / 2] : [b.d_m / 2, b.w_m / 2];
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const r = role(b.x_m + sx * (half[0]! - 1e-6), b.z_m + sz * (half[1]! - 1e-6));
          if (r !== "parking") fails.push(`${c.seed} bay at ${b.x_m},${b.z_m} lies on ${r}`);
        }
      }
    }
    expect(lots).toBeGreaterThan(60);
    expect(fails.slice(0, 8)).toEqual([]);
  });

  it("leaves no cell uncovered or doubled once the lots' cells are counted: the open lots are the only cells inside a block", () => {
    for (const c of [...cities, cityAt(2, 6, 6)]) {
      const seen = new Set<string>();
      for (const cell of c.cells) {
        const key = `${cell.i}:${cell.j}`;
        expect(seen.has(key), `${c.seed} cell ${key} twice`).toBe(false);
        seen.add(key);
        if (cell.cells === 2) seen.add(cell.street!.startsWith("x:") ? `${cell.i + 1}:${cell.j}` : `${cell.i}:${cell.j + 1}`);
      }
      const inBlocks = c.cells.filter((q) => q.role === "lotSurface" || q.role === "plaza").length;
      expect(inBlocks).toBe(4 * c.town.openLots.length);
    }
  });
});

describe("the pavement frame (criterion 12)", () => {
  /** The dressing and furniture of three real maps, with and without the run's frame set to today's numbers: the same output. */
  const MAPS = ["09-shrine-circuit", "64-the-whole-chain", "01-first-light"] as const;
  const mapOf = (file: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));

  it("gives furnitureLayout exactly today's output on the three protocol maps when the frame is absent or says today's numbers", () => {
    for (const file of MAPS) {
      const town = townLayout(mapOf(file));
      const input = { runs: town.terraces, lots: town.lots, openLots: town.openLots };
      const bare = furnitureLayout(input, ENTRIES);
      expect(bare.length, file).toBeGreaterThan(50);
      const framed = furnitureLayout({ ...input, runs: town.terraces.map((r) => ({ ...r, frame: { wall_m: WALL_EDGE_M, kerb_m: KERB_M } })) }, ENTRIES);
      expect(framed, file).toEqual(bare);
      for (const r of town.terraces) expect("frame" in r, `${file} ${r.id} has no frame`).toBe(false);
    }
  });

  it("gives dressStack exactly today's output on the three protocol maps when the frame is absent or says today's kerb, and reads a tighter kerb when it is there", () => {
    let tighter = 0;
    for (const file of MAPS) {
      const town = townLayout(mapOf(file));
      const packed = packTown({ terraces: town.terraces, lots: town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
      const blocks = runBlocks(town.terraces, packed).slice(0, 40);
      expect(blocks.length, file).toBeGreaterThan(20);
      for (const { block } of blocks) {
        const run = { id: block.lot.terrace!.run, index: 0, lowest: true };
        const base = dressStack(block.stack, block.lot, run, ENTRIES, BUILDING_FRONTS);
        expect(dressStack(block.stack, block.lot, { ...run, frame: { wall_m: WALL_EDGE_M, kerb_m: KERB_FROM_FRONT_M } }, ENTRIES, BUILDING_FRONTS), file).toEqual(base);
        expect(dressStack(block.stack, block.lot, run, ENTRIES, BUILDING_FRONTS, KERB_FROM_FRONT_M), file).toEqual(base);
        // A kerb 1 m from the front: nothing stands past it (every front prop is nearer than the road's edge), and some block loses a piece.
        const tight = dressStack(block.stack, block.lot, { ...run, frame: { wall_m: 0, kerb_m: 1 } }, ENTRIES, BUILDING_FRONTS);
        for (const p of tight) if (p.slot === "awning") expect(p.z + p.d / 2).toBeLessThanOrEqual(1 + 1e-6);
        if (tight.length < base.length) tighter++;
      }
    }
    expect(tighter).toBeGreaterThan(0);
  });

  it("stands the furniture of a tile city on its pavement, between the run's wall and kerb lines and clear of pole slots, kerb cuts and crossing landings; meters only beside bays or in lots", () => {
    const fails: string[] = [];
    let pavementPieces = 0;
    let meters = 0;
    let lotMeters = 0;
    for (const seed of SEEDS_B) {
      const c = cityAt(seed);
      const t = c.town;
      const role = gridOf(c);
      const keep = tileKeepouts(c);
      const raw = furnitureLayout({ runs: t.terraces, lots: t.lots, openLots: t.openLots, keepPoints: keep.keepPoints, keepRects: keep.keepRects }, ENTRIES);
      const pieces = bayMeters(c, raw);
      const runs = new Map(t.terraces.map((r) => [r.id, r] as const));
      for (const p of pieces) {
        if (p.kind !== "pavement") {
          if (p.kind === "parking" && METERS.length > 0 && p.key.includes("ParkingMeter")) lotMeters++;
          continue;
        }
        pavementPieces++;
        const run = runs.get(p.run)!;
        const lot0 = t.lots[run.lots[0]!]!;
        const bx = Math.sin(lot0.yaw);
        const bz = Math.cos(lot0.yaw);
        const tM = ((p.x - run.ax) * bx + (p.z - run.az) * bz) / U;
        if (tM - p.d / 2 < run.frame!.wall_m - 1e-6 || tM + p.d / 2 > run.frame!.kerb_m - FURN_KERB_M + 1e-6) fails.push(`${seed} ${p.key} at t=${tM.toFixed(2)} depth ${p.d} is off the frame`);
        // The footprint is on pavement cells (an axis-aligned box: the piece's w along the street, d across it).
        const alongX = Math.abs(run.ux) > 0.5;
        const hx = (alongX ? p.w : p.d) / 2;
        const hz = (alongX ? p.d : p.w) / 2;
        const cx = p.x / U;
        const cz = p.z / U;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const r = role(cx + sx * (hx - 1e-6), cz + sz * (hz - 1e-6));
          if (r !== "pavement") fails.push(`${seed} ${p.key} at ${cx.toFixed(1)},${cz.toFixed(1)} stands on ${r}`);
        }
        // Clear of every pole slot, kerb cut and corner (the crossings' landing) by FURN_KEEP_M, measured to the footprint.
        const gap = (x0: number, x1: number, z0: number, z1: number): number => Math.hypot(Math.max(0, x0 - (cx + hx), cx - hx - x1), Math.max(0, z0 - (cz + hz), cz - hz - z1));
        for (const s of c.poleSlots) if (gap(s.x_m, s.x_m, s.z_m, s.z_m) < FURN_KEEP_M - 1e-6) fails.push(`${seed} ${p.key} is ${gap(s.x_m, s.x_m, s.z_m, s.z_m).toFixed(2)} m from a pole slot`);
        for (const cell of c.cells) {
          if (cell.role !== "kerbCut" && cell.role !== "pavementCorner") continue;
          if (Math.abs(cell.x_m - cx) > TILE_M * 2 || Math.abs(cell.z_m - cz) > TILE_M * 2) continue;
          if (gap(cell.x_m - TILE_M / 2, cell.x_m + TILE_M / 2, cell.z_m - TILE_M / 2, cell.z_m + TILE_M / 2) < FURN_KEEP_M - 1e-6) fails.push(`${seed} ${p.key} is near a ${cell.role}`);
        }
        if (METERS.includes(p.key)) {
          meters++;
          const block = c.parts.find((q) => q.id === run.block)?.block ?? run.block;
          const beside = c.bays.some((b) => b.street === run.road && b.block === block && Math.abs((alongX ? cx - b.x_m : cz - b.z_m)) <= b.w_m / 2 + 1e-6);
          if (!beside) fails.push(`${seed} meter ${p.key} on ${run.id} is not beside a bay`);
        }
      }
      // The unfiltered layout does put meters where there is no bay (that is what `bayMeters` is for), and the filter only ever removes meters.
      expect(pieces.length).toBeLessThanOrEqual(raw.length);
      expect(raw.filter((p) => !pieces.includes(p)).every((p) => p.kind === "pavement" && METERS.includes(p.key))).toBe(true);
    }
    expect(pavementPieces).toBeGreaterThan(200);
    expect(meters).toBeGreaterThan(0);
    expect(lotMeters).toBeGreaterThan(0);
    expect(fails.slice(0, 8)).toEqual([]);
  });

  it("keeps the furniture out of a pole slot when asked, and stands on the kerb line of a 5 m pavement 4.5 m from the front", () => {
    const c = cityAt(1);
    const t = c.town;
    const keep = tileKeepouts(c);
    expect(keep.keepPoints.length).toBe(c.poleSlots.length);
    expect(keep.keepRects.length).toBe(c.cells.filter((q) => q.role === "kerbCut" || q.role === "pavementCorner").length);
    const out = furnitureLayout({ runs: t.terraces, lots: t.lots, openLots: t.openLots }, ENTRIES);
    // Without the keep-outs the kerb line (front edge 0.5 m in from the kerb, 4.5 m from the front line) puts something within FURN_KEEP_M of a slot.
    const near1 = out.filter((p) => p.kind === "pavement" && c.poleSlots.some((s) => Math.hypot(p.x / U - s.x_m, p.z / U - s.z_m) < FURN_KEEP_M));
    expect(near1.length).toBeGreaterThan(0);
    const kept = furnitureLayout({ runs: t.terraces, lots: t.lots, openLots: t.openLots, keepPoints: keep.keepPoints, keepRects: keep.keepRects }, ENTRIES);
    expect(kept.filter((p) => p.kind === "pavement" && c.poleSlots.some((s) => Math.hypot(p.x / U - s.x_m, p.z / U - s.z_m) < FURN_KEEP_M - 1e-6)).length).toBe(0);
  });
});

describe("the tile city after section B", () => {
  it("is still deterministic, frozen, and 6 x 6 builds in well under a second", () => {
    const a = JSON.stringify(cityAt(4, 6, 6));
    expect(JSON.stringify(cityAt(4, 6, 6))).toBe(a);
    const c = cityAt(4, 6, 6);
    expect(Object.isFrozen(c.town.lots)).toBe(true);
    expect(Object.isFrozen(c.town.terraces[0])).toBe(true);
    expect(Object.isFrozen(c.town.terraces[0]!.frame)).toBe(true);
    expect(Object.isFrozen(c.town.openLots)).toBe(true);
  });

  it("has no lot that overlaps another, a road or a pavement, and every lot is inside its block", () => {
    for (const seed of SEEDS_B) {
      const c = cityAt(seed);
      const t = c.town;
      const boxes = t.lots.map((l) => {
        const hx = (Math.abs(Math.cos(l.yaw)) * l.w + Math.abs(Math.sin(l.yaw)) * l.d) / 2;
        const hz = (Math.abs(Math.sin(l.yaw)) * l.w + Math.abs(Math.cos(l.yaw)) * l.d) / 2;
        return { x0: l.x - hx, x1: l.x + hx, z0: l.z - hz, z1: l.z + hz, key: l.key };
      });
      for (const o of t.openLots) boxes.push({ x0: o.x - o.w / 2, x1: o.x + o.w / 2, z0: o.z - o.d / 2, z1: o.z + o.d / 2, key: `${o.kind}:${o.run}` });
      for (const b of boxes) {
        const blk = t.blocks.find((q) => b.x0 >= q.minX - 1e-6 && b.x1 <= q.maxX + 1e-6 && b.z0 >= q.minZ - 1e-6 && b.z1 <= q.maxZ + 1e-6);
        expect(blk, `${seed} ${b.key} is inside a block`).toBeDefined();
      }
      let overlaps = 0;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!;
          const b = boxes[j]!;
          if (a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6) overlaps++;
        }
      }
      expect(overlaps, `seed ${seed}`).toBe(0);
    }
  });

  it("marks the first lot of a run that starts at its row's corner as a corner lot toward the cross street, and no other", () => {
    for (const seed of SEEDS_B) {
      const t = cityAt(seed).town;
      for (const run of t.terraces) {
        const first = t.lots[run.lots[0]!]!;
        if (run.startCorner) {
          expect(first.corner).toBe(true);
          expect(first.cornerSides).toEqual([run.startCorner]);
          expect(run.startCorner.road).not.toBe(run.road);
        } else expect(first.corner).toBe(false);
        for (const li of run.lots.slice(1)) expect(t.lots[li]!.corner).toBe(false);
      }
      expect(t.terraces.filter((r) => r.startCorner).length).toBeGreaterThanOrEqual(t.blocks.length * 3);
    }
  });
});

// =====================================================================================================================================================================
// Ticket 056 A: the parking rules in the layout (chapter 18: units, bays, lots, build-outs). The checks P1 to P6 are in parkmetrics.test.ts.
// =====================================================================================================================================================================

describe("parking constants (056 criterion 1)", () => {
  it("pins every number of chapter 18", () => {
    expect(PARK_PER_SHOP).toBeCloseTo(1 / 3, 12);
    expect(PARK_PER_HOME).toBe(0.15);
    expect(HOME_COLUMN_FLOORS).toBe(2);
    expect(UNIT_FLOORS_NOMINAL).toBe(3);
    expect(BAY_TILES_PER_BLOCK_MIN).toBe(1);
    expect(BAY_RUN_TILES_MAX).toBe(2);
    expect(KERB_GAP_MIN_M).toBe(10);
    expect(KERB_BAY_SHARE_MAX).toEqual({ avenue: 0.4, street: 0.3 });
    expect(BAYS_PER_100M_MAX).toBe(6);
    expect(LOTS_PER_BLOCK_MAX).toBe(2);
    expect(LOT_STALLS).toBe(2 * BAYS_PER_PARKING_TILE);
    expect(LOT_STALLS).toBe(6);
    expect(PARK_SUPPLY_BAND).toEqual({ lo: 0.75, hi: 1.5 });
    expect(BUILDOUT_TREE_EVERY).toBe(2);
    expect(BAYS_PER_PARKING_TILE).toBe(3);
  });

  it("no longer exports 055's block minimum and lots-per-blocks floor (18.3 and 18.4 replace them)", async () => {
    const mod = (await import("./tilecity")) as Record<string, unknown>;
    expect(mod.CITY_BAYS_PER_BLOCK_MIN).toBeUndefined();
    expect(mod.CITY_LOTS_PER_BLOCKS).toBeUndefined();
  });
});

/** The cities the parking rules are held to: the default, seeds 1 to 10 at 3 x 3, and seeds 1 to 3 at 6 x 4. */
const PARK_CITIES: TileCity[] = [tileCity(), ...SEEDS_B.map((s) => cityAt(s)), ...[1, 2, 3].map((s) => cityAt(s, 6, 4))];
const sum = (c: TileCity, f: (b: TileCity["blocks"][number]) => number): number => c.blocks.reduce((n, b) => n + f(b), 0);

describe("units (056 criteria 2 and 3)", () => {
  it("gives every block columns, shops and homes by 18.2: homes are floor(columns x 3 / 2) and a shop is a column that is not a lot's door column", () => {
    for (const c of PARK_CITIES) {
      for (const b of c.blocks) {
        if (b.park?.kind === "whole") {
          // A whole-block park has no rows and so no units (057 G, 19.6).
          expect(b.units, b.id).toEqual({ columns: 0, shops: 0, homes: 0 });
          continue;
        }
        expect(b.units.columns, b.id).toBeGreaterThan(10);
        expect(b.units.homes, b.id).toBe(Math.floor((b.units.columns * UNIT_FLOORS_NOMINAL) / HOME_COLUMN_FLOORS));
        expect(b.units.shops, b.id).toBeGreaterThan(0);
        expect(b.units.shops, b.id).toBeLessThan(b.units.columns);
      }
    }
  });

  // 057 F: the baseline moved with the block sizes. It was 273 columns, 166 shops and 405 homes on 055 E at 793bbf7 (blocks of 8 to 12 cells); the default city's blocks are 6 to 15 cells now
  // (14 x 13, 11 x 13, 6 x 13, 14 x 9, 11 x 9, 6 x 9, 14 x 15, 11 x 15 and 6 x 15), and the numbers below were measured on it on 057 F.
  it("sums on the default city within 10% of the 057 F baseline's 294 columns, 186 shops and 439 homes (measured on 057 F from the nominal layout)", () => {
    const c = tileCity();
    expect(sum(c, (b) => b.units.columns)).toBeGreaterThanOrEqual(294 * 0.9);
    expect(sum(c, (b) => b.units.columns)).toBeLessThanOrEqual(294 * 1.1);
    expect(sum(c, (b) => b.units.shops)).toBeGreaterThanOrEqual(186 * 0.9);
    expect(sum(c, (b) => b.units.shops)).toBeLessThanOrEqual(186 * 1.1);
    expect(sum(c, (b) => b.units.homes)).toBeGreaterThanOrEqual(439 * 0.9);
    expect(sum(c, (b) => b.units.homes)).toBeLessThanOrEqual(439 * 1.1);
  });

  it("matches the packed plan: the city's shop bays of groundRow kinds and its homes (column-floors / 2) are each within 10% of the layout's sums, on the default city and seeds 1 to 10 at 3 x 3", { timeout: 120000 }, () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES.slice(0, 11)) {
      const packed = packTown({ terraces: c.town.terraces, lots: c.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
      const list = runBlocks(c.town.terraces, packed);
      const m = cityMetrics(c.town, packed, [], []);
      const columnFloors = list.reduce((n, r) => n + r.block.stack.columns.length * r.block.stack.floors, 0);
      const shops = sum(c, (b) => b.units.shops);
      const homes = sum(c, (b) => b.units.homes);
      if (Math.abs(m.shopBays - shops) / shops > 0.1) fails.push(`seed ${c.seed}: ${m.shopBays} packed shops against ${shops}`);
      if (Math.abs(columnFloors / HOME_COLUMN_FLOORS - homes) / homes > 0.1) fails.push(`seed ${c.seed}: ${columnFloors / HOME_COLUMN_FLOORS} packed homes against ${homes}`);
    }
    expect(fails).toEqual([]);
  });
});

describe("the layout (056 criterion 4)", () => {
  it("lays every block's kerb quota (max(1, round(shops x PARK_PER_SHOP / 3)) tiles of 3 bays) or records the shortfall, and no bay on an edge street's outer side", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) {
      const served = new Map<string, number>();
      for (const b of c.bays) {
        served.set(b.serves, (served.get(b.serves) ?? 0) + 1);
        if (b.block === "outer") fails.push(`${c.seed}: a bay on an outer side`);
      }
      for (const b of c.blocks) {
        const quota = Math.max(BAY_TILES_PER_BLOCK_MIN, Math.round((b.units.shops * PARK_PER_SHOP) / BAYS_PER_PARKING_TILE)) * BAYS_PER_PARKING_TILE;
        if ((served.get(b.id) ?? 0) + b.parkingShort.bays !== quota) fails.push(`${c.seed} ${b.id}: ${served.get(b.id) ?? 0} bays + ${b.parkingShort.bays} short, quota ${quota}`);
        if ((served.get(b.id) ?? 0) < BAYS_PER_PARKING_TILE) fails.push(`${c.seed} ${b.id}: under one tile`);
      }
    }
    expect(fails).toEqual([]);
  });

  it("serves a block from its own sides or the band across a street, and keeps every side and the city under their caps", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) {
      const byId = new Map(c.blocks.map((b) => [b.id, b] as const));
      const len = new Map<string, number>();
      for (const b of c.bays) {
        const host = byId.get(b.block)!;
        const sv = byId.get(b.serves)!;
        if (Math.abs(host.bi - sv.bi) + Math.abs(host.bj - sv.bj) > 1) fails.push(`${c.seed}: bay at ${b.block} serves ${b.serves}`);
        len.set(`${b.street}|${b.block}`, (len.get(`${b.street}|${b.block}`) ?? 0) + b.w_m);
      }
      for (const [k, l] of len) {
        const [street, block] = k.split("|") as [string, string];
        const s = c.streets.find((q) => q.id === street)!;
        const b = byId.get(block)!;
        const kerb = (s.axis === "x" ? b.i1 - b.i0 : b.j1 - b.j0) * TILE_M;
        if (l > KERB_BAY_SHARE_MAX[s.profile] * kerb + 1e-9) fails.push(`${c.seed} ${street} at ${block}: ${l} m of ${kerb} m`);
      }
      const kerbTotal = sum(c, (b) => 2 * (b.i1 - b.i0 + b.j1 - b.j0) * TILE_M);
      if ((c.bays.length / kerbTotal) * 100 > BAYS_PER_100M_MAX) fails.push(`${c.seed}: ${c.bays.length} bays on ${kerbTotal} m`);
    }
    expect(fails).toEqual([]);
  });

  it("keeps runs to BAY_RUN_TILES_MAX tiles with KERB_GAP_MIN_M between the runs on a side", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) {
      const bands = new Map<string, number[]>();
      for (const cell of c.cells) {
        if (cell.role !== "parking") continue;
        const s = c.streets.find((q) => q.id === cell.street)!;
        const k = `${s.id}|${s.axis === "x" ? cell.j : cell.i}`;
        bands.set(k, [...(bands.get(k) ?? []), s.axis === "x" ? cell.i : cell.j]);
      }
      for (const [k, starts] of bands) {
        starts.sort((a, b) => a - b);
        let tiles = 1;
        for (let n = 1; n <= starts.length; n++) {
          if (n < starts.length && starts[n] === starts[n - 1]! + 2) {
            tiles++;
            continue;
          }
          if (tiles > BAY_RUN_TILES_MAX) fails.push(`${c.seed} ${k}: a run of ${tiles} tiles`);
          if (n < starts.length && (starts[n]! - starts[n - 1]! - 2) * TILE_M < KERB_GAP_MIN_M) fails.push(`${c.seed} ${k}: a gap of ${(starts[n]! - starts[n - 1]! - 2) * TILE_M} m`);
          tiles = 1;
        }
      }
    }
    expect(fails).toEqual([]);
    expect(PARK_CITIES.every((c) => c.cells.some((q) => q.role === "parking"))).toBe(true);
  });

  it("puts most of the bays on avenue sides when a block has one", () => {
    const avenueBays = PARK_CITIES.reduce((n, c) => n + c.bays.filter((b) => c.streets.find((s) => s.id === b.street)!.profile === "avenue").length, 0);
    const all = PARK_CITIES.reduce((n, c) => n + c.bays.length, 0);
    expect(avenueBays / all).toBeGreaterThan(0.5);
  });

  it("gives every block its lot quota (clamp(round(homes x PARK_PER_HOME / LOT_STALLS), 1, LOTS_PER_BLOCK_MAX) lots, its own or a neighbour's across one street) or records the shortfall, and never more than LOTS_PER_BLOCK_MAX in one block", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) {
      const parks = c.town.openLots.filter((o) => o.kind === "parking");
      // A run's block is its part's (057 G); an alley block's first court opens on its alley, not on a run, and counts as one of the block's lots.
      const partBlock = new Map(c.parts.map((q) => [q.id, q.block] as const));
      const runBlock = new Map(c.town.terraces.map((r) => [r.id, partBlock.get(r.block) ?? r.block] as const));
      const alleyCourts = c.courts.filter((q) => q.run === "");
      const held = new Map<string, number>();
      for (const o of parks) held.set(runBlock.get(o.run)!, (held.get(runBlock.get(o.run)!) ?? 0) + 1);
      for (const q of alleyCourts) held.set(q.block, (held.get(q.block) ?? 0) + 1);
      let wantedTotal = 0;
      for (const b of c.blocks) {
        const wanted = Math.min(LOTS_PER_BLOCK_MAX, Math.max(1, Math.round((b.units.homes * PARK_PER_HOME) / LOT_STALLS)));
        // A block at the edge of a quota can flip (057 F): one lot leaves it homes for a quota of 2, two leave it homes for 1. Where the rounds do not settle the dearer layout wins, so such a block holds one lot over
        // its final quota, and only within 10 homes of the edge (the quota rounds at (wanted + 1/2) x LOT_STALLS / PARK_PER_HOME homes: 60 for a quota of 1).
        const have = b.lots + b.parkingShort.stalls / LOT_STALLS;
        const edge = ((wanted + 0.5) * LOT_STALLS) / PARK_PER_HOME;
        const flipped = have === wanted + 1 && wanted < LOTS_PER_BLOCK_MAX && b.units.homes < edge && b.units.homes >= edge - 10;
        wantedTotal += flipped ? wanted + 1 : wanted;
        if (have !== wanted && !flipped) fails.push(`${c.seed} ${b.id}: ${b.lots} lots + ${b.parkingShort.stalls} short stalls, quota ${wanted}, homes ${b.units.homes}`);
        if ((held.get(b.id) ?? 0) > LOTS_PER_BLOCK_MAX) fails.push(`${c.seed} ${b.id} holds ${held.get(b.id)} lots`);
        if (b.lots > LOTS_PER_BLOCK_MAX) fails.push(`${c.seed} ${b.id} is served by ${b.lots} lots`);
      }
      // Every lot was asked for by demand: there are no more than the quotas total, and each has its six stalls inside its 10 m square.
      if (parks.length + alleyCourts.length > wantedTotal) fails.push(`${c.seed}: ${parks.length + alleyCourts.length} lots for ${wantedTotal} wanted`);
      if (c.lotStalls.length !== (parks.length + alleyCourts.length) * LOT_STALLS) fails.push(`${c.seed}: ${c.lotStalls.length} stalls for ${parks.length + alleyCourts.length} lots`);
      for (const o of parks) {
        const run = c.town.terraces.find((r) => r.id === o.run)!;
        // A court's stalls stand in its two rows (5 to 10 m and 15 to 20 m in from the street, 057 C); a frontage lot's inside its own 10 m square (056).
        const court = c.courts.some((q) => q.run === o.run);
        const fx = Math.sin(o.yaw);
        const fz = Math.cos(o.yaw);
        const mine = c.lotStalls.filter((q) => {
          const dx = q.x_m - o.x / U;
          const dz = q.z_m - o.z / U;
          const across = Math.abs(dx * fz - dz * fx);
          const along = dx * fx + dz * fz;
          return across <= o.w / U / 2 + 1e-6 && along <= o.d / U / 2 + 1e-6 && along >= -(court ? 3 : 1) * (o.d / U / 2) - 1e-6;
        });
        if (mine.length !== LOT_STALLS) fails.push(`${c.seed} ${o.run}: ${mine.length} stalls inside`);
        for (const q of mine) if (q.street !== run.road || q.block !== runBlock.get(o.run)) fails.push(`${c.seed} ${o.run}: a stall of ${q.street} at ${q.block}`);
      }
    }
    expect(fails).toEqual([]);
  });

  it("is deterministic per size and seed", () => {
    for (const [bx, bz, seed] of [[3, 3, 4], [6, 4, 2], [1, 1, 1]] as const) {
      expect(JSON.stringify(cityAt(seed, bx, bz))).toBe(JSON.stringify(cityAt(seed, bx, bz)));
    }
  });

  it("switches off the terrace fill's hash lot with parkByHash: false, and an unset parkByHash behaves exactly as true (the ladder's rule)", () => {
    const sides = (): [TerraceSide, TerraceSide, TerraceSide, TerraceSide] => {
      const x1 = 50 * U;
      const z1 = 60 * U;
      return [
        { road: "x:0", side: 1, ax: 0, az: 0, ux: 1, uz: 0, mx: 0, mz: 1, span: x1 },
        { road: "z:1", side: 1, ax: x1, az: 0, ux: 0, uz: 1, mx: -1, mz: 0, span: z1 },
        { road: "x:1", side: -1, ax: x1, az: z1, ux: -1, uz: 0, mx: 0, mz: -1, span: x1 },
        { road: "z:0", side: -1, ax: 0, az: z1, ux: 0, uz: -1, mx: 1, mz: 0, span: z1 },
      ];
    };
    let byHash = 0;
    for (let k = 0; k < 60; k++) {
      const id = `block:h:${k}`;
      const plain = terraceBlockRows({ id }, sides(), { frontOff: 0 });
      const on = terraceBlockRows({ id }, sides(), { frontOff: 0, parkByHash: true });
      const off = terraceBlockRows({ id }, sides(), { frontOff: 0, parkByHash: false });
      expect(JSON.stringify(on)).toBe(JSON.stringify(plain));
      expect(off.openLots.filter((o) => o.kind === "parking")).toEqual([]);
      byHash += plain.openLots.filter((o) => o.kind === "parking").length;
      // Plazas are by block hash and do not move.
      expect(off.openLots.filter((o) => o.kind === "plaza")).toEqual(plain.openLots.filter((o) => o.kind === "plaza"));
    }
    expect(byHash, "the hash lays some lots on these blocks").toBeGreaterThan(5);
    // With parkRuns asking for runs, lots are laid whatever parkByHash says.
    let asked = 0;
    for (let k = 0; k < 20; k++) {
      const id = `block:h:${k}`;
      const keys = new Set<string>();
      for (const sd of sides()) for (let n = 0; n < 3; n++) keys.add(terraceRunKey(id, sd.road, sd.side, n));
      asked += terraceBlockRows({ id }, sides(), { frontOff: 0, snap_m: TILE_M, plazaW_m: 10, parkByHash: false, parkRuns: keys }).openLots.filter((o) => o.kind === "parking").length;
    }
    expect(asked).toBeGreaterThan(5);
  });
});

describe("build-outs and trees (056 criterion 5)", () => {
  it("makes every parking-band cell exactly one of a half tile, a plain cell in front of a kerb cut or on an edge street's outer side, or a build-out; and a tile is two cells of one band", () => {
    forAll((v, _l, ok) => {
      const { W, role: r } = v;
      const halves = new Set<string>();
      for (const cell of v.c.cells) {
        if (cell.role !== "parking") continue;
        const x = v.byId.get(cell.street!)!.axis === "x";
        halves.add(`${cell.i}:${cell.j}`);
        halves.add(x ? `${cell.i + 1}:${cell.j}` : `${cell.i}:${cell.j + 1}`);
      }
      for (const s of v.c.streets) {
        const n = s.bands.length;
        const x = s.axis === "x";
        for (let k = 0; k < n; k++) {
          if (s.bands[k] !== "parking") continue;
          const across = x ? s.across0 + k : s.across0 + n - 1 - k;
          const out = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
          const outer = (s.line === 0 && out < 0) || (s.line === (x ? v.c.blocksZ : v.c.blocksX) && out > 0);
          for (let a = 0; a < (x ? v.W : v.H); a++) {
            const i = x ? a : across;
            const j = x ? across : a;
            const here = r[j * W + i] ?? null;
            if (here === "crossing" || here === "junction" || here === "pavementCorner") continue;
            const front = x ? r[(across + out) * W + a] : r[a * W + across + out];
            if (here === "parking") ok(halves.has(`${i}:${j}`), `(${i},${j}) parking but no tile`);
            else if (here === "parkingPlain") ok(outer || front === "kerbCut", `(${i},${j}) plain, not in front of a cut and not outer`);
            else ok(here === "buildout" && !halves.has(`${i}:${j}`), `(${i},${j}) is ${here}`);
          }
        }
      }
      ok(v.c.cells.filter((c) => c.role === "parking").every((c) => c.cells === 2), "a tile is two cells");
    });
  });

  it("puts one tree on every BUILDOUT_TREE_EVERY-th build-out cell of each stretch, at the cell's centre, and none on a cell next to a crossing", () => {
    forAll((v, _l, ok) => {
      const { W, role: r } = v;
      const want = new Set<string>();
      const key = (x: number, z: number): string => `${Math.round(x * 1000)},${Math.round(z * 1000)}`;
      const box = (q: TileRole | null | undefined): boolean => q === "crossing" || q === "junction" || q === "pavementCorner";
      for (const s of v.c.streets) {
        const n = s.bands.length;
        const x = s.axis === "x";
        for (let k = 0; k < n; k++) {
          if (s.bands[k] !== "parking") continue;
          const across = x ? s.across0 + k : s.across0 + n - 1 - k;
          let stretch = 0;
          const at = (q: number): TileRole | null | undefined => (x ? r[across * W + q] : r[q * W + across]);
          for (let a = 0; a < (x ? v.W : v.H); a++) {
            if (at(a) !== "buildout") {
              stretch = 0;
              continue;
            }
            stretch++;
            if (stretch % BUILDOUT_TREE_EVERY === 0 && !box(at(a - 1)) && !box(at(a + 1))) want.add(key(x ? (a + 0.5) * TILE_M : (across + 0.5) * TILE_M, x ? (across + 0.5) * TILE_M : (a + 0.5) * TILE_M));
          }
        }
      }
      const have = v.c.buildoutTrees.map((t) => key(t.x_m, t.z_m));
      ok(new Set(have).size === have.length, "a tree twice");
      ok(have.length === want.size && have.every((h) => want.has(h)), `${have.length} trees against ${want.size}`);
      for (const t of v.c.buildoutTrees) ok(v.c.streets.some((s) => s.id === t.street), "a tree names a street");
    });
  });

  it("gives a pole slot to every lattice point whose cell is pavement and to no other: build-outs lie in the parking band and move none", () => {
    forAll((v, _l, ok) => {
      const { W, role: r } = v;
      let expected = 0;
      for (const s of v.c.streets) {
        const x = s.axis === "x";
        const ivs = v.c.blocks.filter((b) => (x ? b.bj === 0 : b.bi === 0)).map((b) => (x ? [b.i0 * TILE_M, b.i1 * TILE_M] : [b.j0 * TILE_M, b.j1 * TILE_M]) as [number, number]);
        for (const e of [-1, 1]) {
          const across = e < 0 ? s.carriage.lo_m - POLE_SLOT_FROM_KERB_M : s.carriage.hi_m + POLE_SLOT_FROM_KERB_M;
          for (const [a0, a1] of ivs) {
            for (let p = a0 + POLE_SLOT_END_CLEAR_M; p <= a1 - POLE_SLOT_END_CLEAR_M + 1e-9; p += POLE_SLOT_PITCH_M) {
              const q = x ? r[Math.floor(across / TILE_M) * W + Math.floor(p / TILE_M)] : r[Math.floor(p / TILE_M) * W + Math.floor(across / TILE_M)];
              if (q !== "pavement") continue;
              expected++;
              ok(v.c.poleSlots.some((ps) => ps.street === s.id && Math.abs((x ? ps.x_m : ps.z_m) - p) < 1e-9 && Math.abs((x ? ps.z_m : ps.x_m) - across) < 1e-9), `${s.id} lacks a slot at ${p}`);
            }
          }
        }
      }
      ok(v.c.poleSlots.length === expected, `${v.c.poleSlots.length} slots against ${expected}`);
    });
  });

  it("keeps tileKeepouts as it was: a pole slot is a keep-out point, and a kerb cut and a corner are keep-out rectangles", () => {
    const c = tileCity();
    const k = tileKeepouts(c);
    expect(k.keepPoints.length).toBe(c.poleSlots.length);
    expect(k.keepRects.length).toBe(c.cells.filter((q) => q.role === "kerbCut" || q.role === "pavementCorner").length);
    expect(bayMeters(c, [])).toEqual([]);
  });
});

// ---- block interiors (ticket 057 C, criteria 7 and 8) ----

/** The ring of a cell in its block: 1 is the band the terraces stand in, 2 the strip their backs stand over. */
const ringIn = (b: TileCity["blocks"][number], i: number, j: number): number => Math.min(i - b.i0, b.i1 - 1 - i, j - b.j0, b.j1 - 1 - j) + 1;
const cellKey = (i: number, j: number): string => `${i},${j}`;
/** Whether a role is paved: a car or a walker goes over it (the green is not). */
const PAVED_INTERIOR: readonly string[] = ["apron", "court", "drive", "greenPath", "parkEdge", "alley"];
/** A block that is laid whole (no alley, no park): the 057 C tests' ring rules are about these; alleys and parks have tests of their own (057 G). */
const plainBlock = (b: TileCity["blocks"][number]): boolean => b.alley === null && b.park === null;

describe("the residents' courts (057 C, criterion 7)", () => {
  it("pins the constants: a court is 2 x 3 cells (10 x 15 m) of six stalls behind a drive, the drive is the whole 10 m opening town.ts lays (the ticket drafted 5 m), one apron ring follows the strip, and 1 block in 9 may keep a frontage lot", () => {
    expect(COURT_CELLS).toEqual({ w: 2, d: 3 });
    expect(COURT_CELLS.w * TILE_M).toBe(10);
    expect(COURT_CELLS.d * TILE_M).toBe(15);
    expect(LOT_STALLS).toBe(6);
    expect(DRIVE_CELLS).toBe(2);
    expect(APRON_CELLS).toBe(1);
    expect(GREEN_SPAN_MAX_CELLS).toBe(6);
    expect(GREEN_TREE_ONE_IN).toBe(3);
    expect(CITY_FRONT_LOT_BLOCKS_MAX).toBeCloseTo(1 / 9, 12);
    expect(BENCH_FROM_PATH_M).toBeGreaterThanOrEqual(0.5);
  });

  it("lays every parking lot as a court (drive, stalls, aisle, stalls) in its block, and a lot whose court does not fit keeps its frontage lot and its block is recorded", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) {
      const lots = c.town.openLots.filter((o) => o.kind === "parking");
      const partBlock = new Map(c.parts.map((q) => [q.id, q.block] as const));
      const runBlock = new Map(c.town.terraces.map((r) => [r.id, partBlock.get(r.block) ?? r.block] as const));
      // The courts that stand where a lot of the rows stood; an alley block's court opens on its alley (run "") and is tested with the alleys.
      const streetCourts = c.courts.filter((q) => q.run !== "");
      const asCourt = new Set(streetCourts.map((q) => q.run));
      const kept = lots.filter((o) => !asCourt.has(o.run));
      if (streetCourts.length + kept.length !== lots.length) fails.push(`${c.seed}: ${streetCourts.length} courts and ${kept.length} kept for ${lots.length} lots`);
      if (new Set(kept.map((o) => runBlock.get(o.run))).size !== c.frontLots.length) fails.push(`${c.seed}: frontLots ${c.frontLots.join(",")} for ${kept.length} kept lots`);
      for (const id of c.frontLots) if (!kept.some((o) => runBlock.get(o.run) === id)) fails.push(`${c.seed}: ${id} is recorded with no frontage lot`);
      if (c.frontLots.length > Math.ceil(c.blocks.length * CITY_FRONT_LOT_BLOCKS_MAX - 1e-9)) fails.push(`${c.seed}: ${c.frontLots.length} blocks keep a frontage lot`);
      const at = new Map(c.interior.map((q) => [cellKey(q.i, q.j), q] as const));
      for (const court of streetCourts) {
        const b = c.blocks.find((q) => q.id === court.block)!;
        if (runBlock.get(court.run) !== court.block) fails.push(`${c.seed} ${court.run}: court in ${court.block}, run in ${runBlock.get(court.run)}`);
        const rows: [string, readonly { i: number; j: number }[], number, string, number][] = [
          ["drive", court.drive, 1, "drive", 0],
          ["near", court.stallsNear, 2, "court", COURT_STALLS],
          ["aisle", court.aisle, 3, "court", COURT_AISLE],
          ["far", court.stallsFar, 4, "court", COURT_STALLS],
        ];
        for (const [name, pair, ring, role, variant] of rows) {
          if (pair.length !== COURT_CELLS.w) fails.push(`${c.seed} ${court.run}: ${name} is ${pair.length} cells`);
          for (const q of pair) {
            const cell = at.get(cellKey(q.i, q.j));
            // The ring counts from the nearest edge, so in a block only 6 cells deep the far row (4 cells in) is ring 3 from the opposite edge.
            const dim = court.drive[0]!.j === court.drive[1]!.j ? b.j1 - b.j0 : b.i1 - b.i0;
            const want = Math.min(ring, dim - ring + 1);
            if (ringIn(b, q.i, q.j) !== want) fails.push(`${c.seed} ${court.run}: ${name} cell at ring ${ringIn(b, q.i, q.j)}, want ${want}`);
            if (!cell || cell.role !== role || cell.variant !== variant) fails.push(`${c.seed} ${court.run}: ${name} cell is ${cell?.role}/${cell?.variant}`);
          }
        }
        // The drive is where 056's lot stood: its two cells in the band are lot cells, and the street's pavement across each is a kerb cut.
        for (const q of court.drive) {
          const outward = [
            [q.i - 1, q.j, q.i === b.i0],
            [q.i + 1, q.j, q.i === b.i1 - 1],
            [q.i, q.j - 1, q.j === b.j0],
            [q.i, q.j + 1, q.j === b.j1 - 1],
          ].find((e) => e[2]);
          const cut = outward && c.cells.find((k) => k.i === outward[0] && k.j === outward[1]);
          if (cut?.role !== "kerbCut") fails.push(`${c.seed} ${court.run}: drive cell outside is ${cut?.role}`);
          if (!c.cells.some((k) => k.role === "lotSurface" && k.i === q.i && k.j === q.j)) fails.push(`${c.seed} ${court.run}: drive cell is not a lot cell`);
        }
      }
    }
    expect(fails).toEqual([]);
    expect(PARK_CITIES.every((c) => c.courts.some((q) => q.run !== ""))).toBe(true);
  });

  it("lists the court stalls in lotStalls: six to a court, three in each row of stalls, serving the block 056 chose, on the court's street and block", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) {
      // The lots of the rows, and the alley blocks' own courts (057 G), which open on a lane and stand on no open lot.
      const lots = c.town.openLots.filter((o) => o.kind === "parking").length + c.courts.filter((q) => q.run === "").length;
      if (c.lotStalls.length !== lots * LOT_STALLS) fails.push(`${c.seed}: ${c.lotStalls.length} stalls for ${lots} lots`);
      for (const court of c.courts) {
        const inside = (pair: readonly { i: number; j: number }[], q: { x_m: number; z_m: number }): boolean => {
          const i0 = Math.min(...pair.map((p) => p.i)) * TILE_M;
          const i1 = (Math.max(...pair.map((p) => p.i)) + 1) * TILE_M;
          const j0 = Math.min(...pair.map((p) => p.j)) * TILE_M;
          const j1 = (Math.max(...pair.map((p) => p.j)) + 1) * TILE_M;
          return q.x_m > i0 && q.x_m < i1 && q.z_m > j0 && q.z_m < j1;
        };
        const mine = c.lotStalls.filter((q) => inside(court.stallsNear, q) || inside(court.stallsFar, q));
        if (mine.length !== LOT_STALLS) fails.push(`${c.seed} ${court.run}: ${mine.length} stalls in its rows`);
        if (mine.filter((q) => inside(court.stallsNear, q)).length !== BAYS_PER_PARKING_TILE) fails.push(`${c.seed} ${court.run}: the near row has ${mine.filter((q) => inside(court.stallsNear, q)).length} stalls`);
        for (const q of mine) {
          if (q.block !== court.block || q.street !== court.street || q.serves !== court.serves) fails.push(`${c.seed} ${court.run}: a stall of ${q.street}/${q.block} serving ${q.serves}`);
          if (!inside(court.stallsNear, q) && !inside(court.stallsFar, q)) fails.push(`${c.seed} ${court.run}: a stall outside its rows`);
        }
        // The stalls open on the aisle: the near row's yaw points into the block, the far row's toward the street.
        const near = mine.filter((q) => inside(court.stallsNear, q));
        const far = mine.filter((q) => !inside(court.stallsNear, q));
        if (!near.every((q) => (q.yaw - court.yaw + 360) % 360 === 180) || !far.every((q) => q.yaw === court.yaw)) fails.push(`${c.seed} ${court.run}: stalls do not open on the aisle`);
      }
    }
    expect(fails).toEqual([]);
  });

  it("holds 056's checks on courts: P1 to P6 pass, and a lot-per-block quota is still met or recorded", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) for (const v of evaluateParking(parkingMetrics(c))) if (!v.pass) fails.push(`${c.seed} ${v.id} ${v.value}`);
    expect(fails).toEqual([]);
  });
});

describe("the block interiors (057 C, criterion 8)", () => {
  it("partitions every block's inside into apron, court, drive, green and path cells, and nothing else: ring 1 is the terraces' except a drive, and a cell is another thing only where a plaza or a frontage lot stands", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) {
      const lotCells = new Set(c.cells.filter((q) => q.role === "lotSurface" || q.role === "plaza").map((q) => cellKey(q.i, q.j)));
      const courtCells = new Set(c.courts.flatMap((q) => [...q.drive, ...q.stallsNear, ...q.aisle, ...q.stallsFar].map((p) => cellKey(p.i, p.j))));
      const byBlock = new Map<string, Map<string, (typeof c.interior)[number]>>();
      for (const q of c.interior) {
        const m = byBlock.get(q.block) ?? new Map();
        if (m.has(cellKey(q.i, q.j))) fails.push(`${c.seed} ${q.block}: cell ${q.i},${q.j} twice`);
        m.set(cellKey(q.i, q.j), q);
        byBlock.set(q.block, m);
        if (!["apron", "court", "drive", "green", "greenPath", "alley", "parkEdge"].includes(q.role)) fails.push(`${c.seed}: role ${q.role}`);
        const owner = c.blocks.find((b) => b.id === q.block)!;
        if (q.role === "alley" && owner.alley === null) fails.push(`${c.seed} ${q.block}: an alley cell in a block with no alley`);
        if (q.role === "parkEdge" && owner.park === null) fails.push(`${c.seed} ${q.block}: a park edge cell in a block with no park`);
        if (Math.abs(q.x_m - (q.i + 0.5) * TILE_M) > 1e-9 || Math.abs(q.z_m - (q.j + 0.5) * TILE_M) > 1e-9) fails.push(`${c.seed}: ${q.i},${q.j} is not at its middle`);
      }
      for (const b of c.blocks.filter(plainBlock)) {
        const m = byBlock.get(b.id) ?? new Map();
        for (let j = b.j0; j < b.j1; j++) {
          for (let i = b.i0; i < b.i1; i++) {
            const q = m.get(cellKey(i, j));
            const ring = ringIn(b, i, j);
            const open = lotCells.has(cellKey(i, j));
            if (q === undefined) {
              if (ring >= 2 && !open) fails.push(`${c.seed} ${b.id}: ring ${ring} cell ${i},${j} is unfilled`);
              continue;
            }
            if (ring === 1 && q.role !== "drive") fails.push(`${c.seed} ${b.id}: ring 1 cell ${i},${j} is ${q.role}`);
            // A cell that is both an interior cell and a lot cell is a court's own (its drive and its first row of stalls stand on the 056 lot's cells).
            if (open && !courtCells.has(cellKey(i, j))) fails.push(`${c.seed} ${b.id}: ${i},${j} is ${q.role} and a lot or plaza cell`);
            if (q.role === "apron" && ring >= 3 + APRON_CELLS) fails.push(`${c.seed} ${b.id}: apron at ring ${ring}`);
            if ((q.role === "green" || q.role === "greenPath") && ring < 3 + APRON_CELLS) fails.push(`${c.seed} ${b.id}: ${q.role} at ring ${ring}`);
            if (q.role === "apron" && q.variant !== (ring === 2 ? APRON_STRIP : 0)) fails.push(`${c.seed} ${b.id}: apron variant ${q.variant} at ring ${ring}`);
            if (ring >= 3 + APRON_CELLS && q.role === "apron") fails.push(`${c.seed} ${b.id}: apron inside the green`);
          }
        }
      }
    }
    expect(fails).toEqual([]);
  });

  it("has an apron strip on every ring 2 cell that no plaza, lot or court took, and grass and paths and courts and drives somewhere in every city", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) {
      const roles = new Map<string, number>();
      for (const q of c.interior) roles.set(q.role, (roles.get(q.role) ?? 0) + 1);
      for (const r of ["apron", "court", "drive", "green", "greenPath"]) if ((roles.get(r) ?? 0) === 0) fails.push(`${c.seed}: no ${r}`);
      const lotCells = new Set(c.cells.filter((q) => q.role === "lotSurface" || q.role === "plaza").map((q) => cellKey(q.i, q.j)));
      for (const b of c.blocks.filter(plainBlock)) {
        let want = 0;
        for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) if (ringIn(b, i, j) === 2 && !lotCells.has(cellKey(i, j))) want++;
        const have = c.interior.filter((q) => q.block === b.id && q.role === "apron" && q.variant === APRON_STRIP).length;
        if (have !== want) fails.push(`${c.seed} ${b.id}: ${have} strip cells, ${want} ring 2 cells free`);
      }
    }
    expect(fails).toEqual([]);
  });

  it("connects the paving of every block into one piece: the apron, the courts, the drives and the paths, with a plaza's or a frontage lot's cells, so a drive and a passage reach the court over pavement", () => {
    const fails: string[] = [];
    for (const c of PARK_CITIES) {
      const open = new Set(c.cells.filter((q) => q.role === "lotSurface" || q.role === "plaza").map((q) => cellKey(q.i, q.j)));
      // A block with a park has two separate pavings, the built half's and the park's own edge (the park's is tested with the parks).
      for (const b of c.blocks.filter((q) => q.park === null)) {
        const paved = new Set(c.interior.filter((q) => q.block === b.id && PAVED_INTERIOR.includes(q.role)).map((q) => cellKey(q.i, q.j)));
        for (const k of open) {
          const [i, j] = k.split(",").map(Number) as [number, number];
          if (i >= b.i0 && i < b.i1 && j >= b.j0 && j < b.j1) paved.add(k);
        }
        const [first] = paved;
        if (first === undefined) continue;
        const seen = new Set([first]);
        const todo = [first];
        while (todo.length > 0) {
          const [i, j] = todo.pop()!.split(",").map(Number) as [number, number];
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const k = cellKey(i + di, j + dj);
            if (paved.has(k) && !seen.has(k)) {
              seen.add(k);
              todo.push(k);
            }
          }
        }
        if (seen.size !== paved.size) fails.push(`${c.seed} ${b.id}: ${paved.size - seen.size} of ${paved.size} paved cells are cut off`);
        // Every court's aisle is open to the apron or the court's own rows at its sides, so a car gets in.
        for (const court of c.courts.filter((q) => q.block === b.id)) {
          const a = court.aisle;
          const alongX = a[0].j === a[1].j;
          const ends = alongX ? [cellKey(Math.min(a[0].i, a[1].i) - 1, a[0].j), cellKey(Math.max(a[0].i, a[1].i) + 1, a[0].j)] : [cellKey(a[0].i, Math.min(a[0].j, a[1].j) - 1), cellKey(a[0].i, Math.max(a[0].j, a[1].j) + 1)];
          if (!ends.some((k) => paved.has(k))) fails.push(`${c.seed} ${court.run}: the aisle is closed at both ends`);
        }
      }
    }
    expect(fails).toEqual([]);
  });

  it("never leaves a row or column of green longer than GREEN_SPAN_MAX_CELLS, and runs a one-cell path from apron to apron across every green at least two cells wide", () => {
    const fails: string[] = [];
    let paths = 0;
    for (const c of PARK_CITIES) {
      const at = new Map(c.interior.map((q) => [cellKey(q.i, q.j), q] as const));
      for (const b of c.blocks) {
        for (const alongX of [true, false]) {
          const outer = alongX ? [b.j0, b.j1] : [b.i0, b.i1];
          const inner = alongX ? [b.i0, b.i1] : [b.j0, b.j1];
          for (let o = outer[0]!; o < outer[1]!; o++) {
            let run = 0;
            for (let n = inner[0]!; n <= inner[1]!; n++) {
              const q = n < inner[1]! ? at.get(alongX ? cellKey(n, o) : cellKey(o, n)) : undefined;
              if (q?.role === "green") run++;
              else {
                if (run > GREEN_SPAN_MAX_CELLS) fails.push(`${c.seed} ${b.id}: ${run} green cells in a row`);
                run = 0;
              }
            }
          }
        }
        const green = c.interior.filter((q) => q.block === b.id && (q.role === "green" || q.role === "greenPath"));
        if (green.length === 0) continue;
        const lo = (f: (q: (typeof green)[number]) => number): number => Math.min(...green.map(f));
        const hi = (f: (q: (typeof green)[number]) => number): number => Math.max(...green.map(f));
        const w = hi((q) => q.i) - lo((q) => q.i) + 1;
        const d = hi((q) => q.j) - lo((q) => q.j) + 1;
        const here = green.filter((q) => q.role === "greenPath");
        if (Math.min(w, d) >= 2 && here.length === 0) fails.push(`${c.seed} ${b.id}: a ${w} x ${d} green with no path`);
        paths += here.length;
        // Each path cell is reached along its own axis from pavement or another path cell on both sides: apron to apron.
        for (const q of here) {
          const [di, dj] = q.yaw === 0 ? [1, 0] : [0, 1];
          for (const s of [-1, 1]) {
            const n = at.get(cellKey(q.i + s * di, q.j + s * dj));
            if (!n || !PAVED_INTERIOR.includes(n.role)) fails.push(`${c.seed} ${b.id}: path cell ${q.i},${q.j} ends on ${n?.role}`);
          }
        }
      }
    }
    expect(fails).toEqual([]);
    expect(paths).toBeGreaterThan(50);
  });

  it("puts trees on about one green cell in GREEN_TREE_ONE_IN and a bench beside a path, all inside green cells and clear of every path by at least 0.5 m", () => {
    const fails: string[] = [];
    let trees = 0;
    let benches = 0;
    let greens = 0;
    let pathBlocks = 0;
    for (const c of PARK_CITIES) {
      const green = new Set(c.interior.filter((q) => q.role === "green").map((q) => cellKey(q.i, q.j)));
      const pathCells = c.interior.filter((q) => q.role === "greenPath");
      greens += green.size;
      pathBlocks += new Set(pathCells.map((q) => q.block)).size;
      /** How far a point is from the nearest path cell, metres. */
      const clear = (x: number, z: number): number => {
        let best = Infinity;
        for (const p of pathCells) {
          const dx = Math.max(p.i * TILE_M - x, 0, x - (p.i + 1) * TILE_M);
          const dz = Math.max(p.j * TILE_M - z, 0, z - (p.j + 1) * TILE_M);
          best = Math.min(best, Math.hypot(dx, dz));
        }
        return best;
      };
      for (const p of c.greenProps) {
        const i = Math.floor(p.x_m / TILE_M);
        const j = Math.floor(p.z_m / TILE_M);
        if (!green.has(cellKey(i, j))) fails.push(`${c.seed}: a ${p.key} outside the green at ${p.x_m},${p.z_m}`);
        if (p.key === "tree") {
          trees++;
          if (Math.abs(p.x_m - (i + 0.5) * TILE_M) > 1e-9 || Math.abs(p.z_m - (j + 0.5) * TILE_M) > 1e-9) fails.push(`${c.seed}: a tree off its cell's middle`);
          if (clear(p.x_m, p.z_m) < 0.5) fails.push(`${c.seed}: a tree ${clear(p.x_m, p.z_m)} m from a path`);
        } else {
          benches++;
          // The bench is `BENCH_FROM_PATH_M` from the path's edge; with a depth under 1 m its near edge is 0.5 m clear.
          if (Math.abs(clear(p.x_m, p.z_m) - BENCH_FROM_PATH_M) > 1e-9) fails.push(`${c.seed}: a bench ${clear(p.x_m, p.z_m)} m from a path`);
        }
      }
      const cellsWithTree = new Set(c.greenProps.filter((p) => p.key === "tree").map((p) => cellKey(Math.floor(p.x_m / TILE_M), Math.floor(p.z_m / TILE_M))));
      const cellsWithBench = new Set(c.greenProps.filter((p) => p.key === "bench").map((p) => cellKey(Math.floor(p.x_m / TILE_M), Math.floor(p.z_m / TILE_M))));
      for (const k of cellsWithBench) if (cellsWithTree.has(k)) fails.push(`${c.seed}: a tree and a bench in one cell`);
    }
    expect(fails).toEqual([]);
    expect(trees / greens).toBeGreaterThan(0.2);
    expect(trees / greens).toBeLessThan(0.45);
    expect(benches).toBeGreaterThan(pathBlocks / 2);
  });

  it("is pure data: deterministic per size and seed, and frozen all the way down", () => {
    const a = cityAt(3, 3, 3);
    expect(JSON.stringify(a.interior)).toBe(JSON.stringify(cityAt(3, 3, 3).interior));
    expect(JSON.stringify(a.courts)).toBe(JSON.stringify(cityAt(3, 3, 3).courts));
    expect(JSON.stringify(a.greenProps)).toBe(JSON.stringify(cityAt(3, 3, 3).greenProps));
    expect(Object.isFrozen(a.interior) && Object.isFrozen(a.interior[0]) && Object.isFrozen(a.courts) && Object.isFrozen(a.courts[0]!.drive) && Object.isFrozen(a.greenProps) && Object.isFrozen(a.frontLots)).toBe(true);
    expect(a.passages).toEqual([]);
  });
});

describe("nothing else moves (063 A, criterion 4; re-pinned for 063 F): the layout is the layout at ab9d01f, but for the pavement cells' variants", () => {
  /** The pavement cells 063 F marks (a return beside a kerb cut, a cell with a build-out in front), found from the roles and positions alone, not from the variants: the street's own cell list is the only input. */
  const kerbedCell = (c: TileCity, at: Map<string, string>, q: TileCity["cells"][number]): boolean => {
    const s = c.streets.find((x) => x.id === q.street)!;
    const [ai, aj] = s.axis === "x" ? [1, 0] : [0, 1];
    const inwardUp = s.axis === "x" ? s.carriage.lo_m > q.z_m : s.carriage.lo_m > q.x_m;
    const [ni, nj] = s.axis === "x" ? [0, inwardUp ? 1 : -1] : [inwardUp ? 1 : -1, 0];
    return at.get(`${q.i + ai},${q.j + aj}`) === "kerbCut" || at.get(`${q.i - ai},${q.j - aj}`) === "kerbCut" || at.get(`${q.i + ni},${q.j + nj}`) === "buildout";
  };
  /**
   * A digest of everything a city lays except which plain straight a pavement or build-out is: every cell (a pavement cell's variant reduced to "grate" or "plain", a build-out's to "plain", and the pavement cells 063 F marks, which
   * 063 F makes plain whatever the hash said, to "kerb"), the streets, bays, lot stalls, build-out trees, pole slots, interior, courts, frontage-lot blocks, parts, alley bins and blocks. The same function ran on ab9d01f's tilecity.ts (the
   * branch point, with the old grate variant 2) to give the pinned digests below, and on the 063 F city, and both gave these (a scratch run of both, 19 Nov 2026): so F changed pavement variants and nothing else. The old pins (taken without
   * the "kerb" fold) moved on purpose: a grate that the hash put on a marked cell is a plain straight now.
   */
  const digestOf = (c: TileCity, grate: number): string => {
    const at = new Map<string, string>();
    for (const q of c.cells) {
      at.set(`${q.i},${q.j}`, q.role);
      if (q.cells === 2) at.set(q.yaw === 0 || q.yaw === 180 ? `${q.i + 1},${q.j}` : `${q.i},${q.j + 1}`, q.role);
    }
    const cells = c.cells.map((q) => (q.role === "pavement" ? { ...q, variant: kerbedCell(c, at, q) ? "kerb" : q.variant === grate ? "grate" : "plain" } : q.role === "buildout" ? { ...q, variant: "plain" } : q));
    const body = { cells, streets: c.streets, bays: c.bays, lotStalls: c.lotStalls, buildoutTrees: c.buildoutTrees, poleSlots: c.poleSlots, interior: c.interior, courts: c.courts, frontLots: c.frontLots, parts: c.parts, alleyBins: c.alleyBins, blocks: c.blocks };
    return createHash("sha256").update(JSON.stringify(body)).digest("hex");
  };
  const AT_AB9D01F: readonly (readonly [number, number, number, string])[] = [
    [3, 3, 1, "cfcda6c6b13c207cfa23377e987aec61079e231c1720780c11d1f9f882ccb2ec"],
    [3, 3, 2, "62fed200a04b0d09d729c2403e0f799d530c8bf9d60b69c848bf34a6694d57f3"],
    [3, 3, 3, "e4fea02544960cfba3b3b840c056eaefb9a641910ffec3e106732539a85eef36"],
    [6, 4, 1, "3359537a63cbad44e0fa515030384390cf9e9470cf826a661a352847ff8d0d41"],
  ];

  it("lays the default city, seeds 2 and 3 at 3 x 3 and seed 1 at 6 x 4 exactly as ab9d01f did, but for the pavement cells' variants (the grates are on the same cells but the marked ones)", () => {
    for (const [bx, bz, seed, want] of AT_AB9D01F) expect(digestOf(cityAt(seed, bx, bz), PAVEMENT_GRATE), `${bx}x${bz} seed ${seed}`).toBe(want);
  });

  it("bites: a city with one build-out turned into a pavement, a court's drive dropped, or a grate moved does not match", () => {
    const c = cityAt(1);
    const want = AT_AB9D01F[0]![3];
    const buildout = c.cells.findIndex((q) => q.role === "buildout");
    expect(buildout).toBeGreaterThanOrEqual(0);
    expect(digestOf({ ...c, cells: c.cells.map((q, i) => (i === buildout ? { ...q, role: "pavement" as const } : q)) }, PAVEMENT_GRATE)).not.toBe(want);
    expect(digestOf({ ...c, courts: c.courts.map((k, i) => (i === 0 ? { ...k, drive: [k.drive[1], k.drive[0]] as typeof k.drive } : k)) }, PAVEMENT_GRATE)).not.toBe(want);
    const plain = c.cells.findIndex((q) => q.role === "pavement" && q.variant === 0);
    expect(digestOf({ ...c, cells: c.cells.map((q, i) => (i === plain ? { ...q, variant: PAVEMENT_GRATE } : q)) }, PAVEMENT_GRATE)).not.toBe(want);
    // And the digest reads the grate as the grate: the old variant number does not match on the new city.
    expect(digestOf(c, 2)).not.toBe(want);
  });
});

describe("the kerb's cells (063 F, criterion 37b; Josh, 19 Nov 2026: \"It's ok to have curbs that stretch out like this in spots but the curb structures have to follow the crub.\")", () => {
  const cities = [...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => cityAt(seed)), ...[1, 2, 3].map((seed) => cityAt(seed, 6, 4))];
  const roleMap = (c: TileCity): Map<string, TileCity["cells"][number]> => {
    const out = new Map<string, TileCity["cells"][number]>();
    for (const q of c.cells) {
      out.set(`${q.i},${q.j}`, q);
      if (q.cells === 2) out.set(q.yaw === 0 || q.yaw === 180 ? `${q.i + 1},${q.j}` : `${q.i},${q.j + 1}`, q);
    }
    return out;
  };

  it("pins the kerb bits: 1 is the grate, 2 and 4 the two returns and 8 the flush cell, and they are distinct", () => {
    expect([PAVEMENT_GRATE, PAVEMENT_RETURN_NEAR, PAVEMENT_RETURN_FAR, PAVEMENT_FLUSH]).toEqual([1, 2, 4, 8]);
  });

  it("marks the pavement cell before and the one after every kerb cut run as a return, and no other cell; a return is never a grate", () => {
    let near = 0;
    let far = 0;
    const fails: string[] = [];
    for (const c of cities) {
      const at = roleMap(c);
      for (const q of c.cells) {
        if (q.role !== "pavement") continue;
        const s = c.streets.find((x) => x.id === q.street)!;
        const [di, dj] = s.axis === "x" ? [1, 0] : [0, 1];
        const wantNear = at.get(`${q.i + di},${q.j + dj}`)?.role === "kerbCut";
        const wantFar = at.get(`${q.i - di},${q.j - dj}`)?.role === "kerbCut";
        if (wantNear) near++;
        if (wantFar) far++;
        if (((q.variant & PAVEMENT_RETURN_NEAR) !== 0) !== wantNear) fails.push(`${c.seed} ${q.i},${q.j}: near return ${wantNear} but variant ${q.variant}`);
        if (((q.variant & PAVEMENT_RETURN_FAR) !== 0) !== wantFar) fails.push(`${c.seed} ${q.i},${q.j}: far return ${wantFar} but variant ${q.variant}`);
        if ((q.variant & (PAVEMENT_RETURN_NEAR | PAVEMENT_RETURN_FAR)) !== 0 && (q.variant & PAVEMENT_GRATE) !== 0) fails.push(`${c.seed} ${q.i},${q.j}: a return that is a grate`);
      }
      // A kerb cut's own variant is 0, and so is every build-out's.
      for (const q of c.cells) if ((q.role === "kerbCut" || q.role === "buildout") && q.variant !== 0) fails.push(`${c.seed} ${q.role} ${q.i},${q.j}: variant ${q.variant}`);
    }
    expect(fails).toEqual([]);
    expect(near).toBeGreaterThan(100);
    expect(far).toBe(near);
  });

  it("marks flush every pavement cell whose carriageway side is a build-out, and no other, and never as a grate", () => {
    let flush = 0;
    const fails: string[] = [];
    for (const c of cities) {
      const at = roleMap(c);
      for (const q of c.cells) {
        if (q.role !== "pavement") continue;
        const s = c.streets.find((x) => x.id === q.street)!;
        const inward = s.axis === "x" ? (s.carriage.lo_m > q.z_m ? 1 : -1) : s.carriage.lo_m > q.x_m ? 1 : -1;
        const n = s.axis === "x" ? at.get(`${q.i},${q.j + inward}`) : at.get(`${q.i + inward},${q.j}`);
        const want = n?.role === "buildout";
        if (want) flush++;
        if (((q.variant & PAVEMENT_FLUSH) !== 0) !== want) fails.push(`${c.seed} ${q.i},${q.j}: flush ${want} but variant ${q.variant}`);
        if ((q.variant & PAVEMENT_FLUSH) !== 0 && (q.variant & PAVEMENT_GRATE) !== 0) fails.push(`${c.seed} ${q.i},${q.j}: a flush grate`);
      }
    }
    expect(fails).toEqual([]);
    expect(flush).toBeGreaterThan(100);
  });

  it("leaves a pole slot on a pavement cell, a return or a flush one included", () => {
    const c = cityAt(1);
    const marked = c.cells.filter((q) => q.role === "pavement" && (q.variant & (PAVEMENT_RETURN_NEAR | PAVEMENT_RETURN_FAR | PAVEMENT_FLUSH)) !== 0);
    expect(marked.length).toBeGreaterThan(20);
    expect(c.poleSlots.length).toBeGreaterThan(0);
    const at = roleMap(c);
    for (const p of c.poleSlots) expect(at.get(`${Math.floor(p.x_m / TILE_M)},${Math.floor(p.z_m / TILE_M)}`)?.role).toBe("pavement");
  });
});
