/**
 * Ticket 057 G (19.6): alleys and parks of the tile city, as pure data (`tilecity.ts`, `frontage.ts`), and the 057 F review's could-improves for `blockLens`. Josh, 18 Nov 2026: "Keep in mind, 90 degrees does not
 * mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc". No three, no WebGL, no assets: the cities are built by `tileCity` and, where a check needs the buildings, packed by
 * `packTown` on fixture entries typed in from the converted City Pack manifest (18 Nov 2026), on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4 and no more.
 */

import { describe, expect, it } from "vitest";
import type { AssetEntry, CalibrationKey } from "../core";
import { BUILDING_FRONTS } from "./models";
import { STACK_STYLES } from "./stacks";
import { packTown, type PackResult } from "./terrace";
import { blockVariety, evaluateFrontage, evaluateVariety, frontageMetrics, tilePassages } from "./frontage";
import { evaluateParking, parkingMetrics } from "./parkmetrics";
import { WORLD_PER_METRE as U } from "./town";
import {
  ALLEY_BIN_EVERY_M,
  ALLEY_BIN_OFFSET_M,
  ALLEY_CELLS,
  ALLEY_ONE_IN_BLOCKS,
  ALLEY_SIDE_LONG_M,
  ALLEY_SIDE_MIN_CELLS,
  BLOCK_DRAWS_MAX,
  BLOCK_FALLBACK_DEPTHS,
  BLOCK_FALLBACK_WIDTHS,
  BLOCK_MEAN_MIN_CELLS,
  BLOCK_STEP_MIN_CELLS,
  BLOCK_TILES,
  CITY_BLOCKS_MAX,
  PARK_EDGE_CELLS,
  PARK_ONE_IN_BLOCKS,
  TILE_M,
  TILE_STACK_ALIGN,
  blockSizes,
  blockType,
  planBlocks,
  tileCity,
  withPassages,
  type PlanBlock,
  type TileBlock,
  type TileCity,
} from "./tilecity";

// [name, width, height, depth] in metres (the converted City Pack manifest, 18 Nov 2026); bounds are centred.
const SIZES: [string, number, number, number][] = [
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
];
const ENTRIES: ReadonlyMap<CalibrationKey, AssetEntry> = new Map(
  SIZES.map(
    ([name, w, h, d]) =>
      [
        `city-pack:${name}` as CalibrationKey,
        { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles: 100, textures: [], missingTextures: [], warnings: [] } as AssetEntry,
      ] as const,
  ),
);

/** The cities the ticket names for the layout (no packing): the default (3 x 3, seed 1), seeds 1 to 10 at 3 x 3 and at 6 x 4. */
const LAYOUTS: { label: string; blocksX: number; blocksZ: number; seed: number }[] = [
  { label: "default", blocksX: 3, blocksZ: 3, seed: 1 },
  ...Array.from({ length: 10 }, (_, k) => ({ label: `3x3 seed ${k + 1}`, blocksX: 3, blocksZ: 3, seed: k + 1 })),
  ...Array.from({ length: 10 }, (_, k) => ({ label: `6x4 seed ${k + 1}`, blocksX: 6, blocksZ: 4, seed: k + 1 })),
];
/** The cities that are packed: the default, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4. */
const PACKED = LAYOUTS.filter((c) => c.blocksX === 3 || c.seed <= 3);

const cities = new Map<string, TileCity>();
const cityOf = (c: (typeof LAYOUTS)[number]): TileCity => {
  let city = cities.get(c.label);
  if (!city) {
    city = tileCity({ blocksX: c.blocksX, blocksZ: c.blocksZ, seed: c.seed });
    cities.set(c.label, city);
  }
  return city;
};
const packs = new Map<string, { city: TileCity; packed: Map<string, PackResult> }>();
const packedOf = (c: (typeof LAYOUTS)[number]): { city: TileCity; packed: Map<string, PackResult> } => {
  let p = packs.get(c.label);
  if (!p) {
    const city = cityOf(c);
    const packed = packTown({ terraces: city.town.terraces, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS, { align: TILE_STACK_ALIGN });
    p = { city: withPassages(city, tilePassages(city, packed)), packed };
    packs.set(c.label, p);
  }
  return p;
};

const key = (i: number, j: number): string => `${i},${j}`;
const w = (b: Pick<TileBlock, "i0" | "i1">): number => b.i1 - b.i0;
const d = (b: Pick<TileBlock, "j0" | "j1">): number => b.j1 - b.j0;

describe("the constants of 19.6", () => {
  it("pins the rates: one alley in 4 blocks, one park in 6, a bin every 10 m, a lane one cell wide, a long side of 70 m, and a split needs 9 cells", () => {
    expect(ALLEY_ONE_IN_BLOCKS).toBe(4);
    expect(PARK_ONE_IN_BLOCKS).toBe(6);
    expect(ALLEY_BIN_EVERY_M).toBe(10);
    expect(ALLEY_CELLS).toBe(1);
    expect(ALLEY_SIDE_LONG_M).toBe(70);
    expect(ALLEY_SIDE_MIN_CELLS).toBe(9);
    expect(PARK_EDGE_CELLS).toBe(1);
    // A bin stands clear of the lane (its half width is 2.5 m) by at least 0.3 m, so beside it and never in it.
    expect(ALLEY_BIN_OFFSET_M - (ALLEY_CELLS * TILE_M) / 2).toBeGreaterThanOrEqual(0.3);
  });
});

describe("which blocks get an alley and which a park (planBlocks)", () => {
  const blockOf = (id: string, wc: number, dc: number): PlanBlock => ({ id, type: blockType(wc, dc), w: wc, d: dc });
  /** Nine blocks with every type: two small, two long (one with a side of 70 m), a medium or two, and large ones. */
  const nine = [blockOf("a", 14, 9), blockOf("b", 12, 9), blockOf("c", 9, 9), blockOf("d", 8, 8), blockOf("e", 7, 7), blockOf("f", 11, 11), blockOf("g", 12, 12), blockOf("h", 10, 10), blockOf("i", 16, 16)];

  it("gives a park to small blocks first (whole), then to large ones (half), and at least one per PARK_ONE_IN_BLOCKS blocks", () => {
    const p = planBlocks(nine, 1);
    expect(p.parks.size).toBe(Math.ceil(nine.length / PARK_ONE_IN_BLOCKS));
    expect([...p.parks]).toEqual(expect.arrayContaining([["d", "whole"], ["e", "whole"]]));
    expect(p.parks.size).toBe(2);
    // With no small block the large ones take them, by half, and one that has no claim to an alley before one that has.
    const larges = [blockOf("a", 12, 12), blockOf("b", 16, 16), blockOf("c", 11, 11), blockOf("d", 10, 10), blockOf("e", 10, 10), blockOf("f", 10, 10), blockOf("g", 10, 10)];
    const q = planBlocks(larges, 1);
    expect(q.parks.size).toBe(Math.ceil(larges.length / PARK_ONE_IN_BLOCKS));
    expect([...q.parks.values()].every((k) => k === "half")).toBe(true);
    expect([...q.parks.keys()].every((id) => id === "a" || id === "c")).toBe(true);
  });

  it("gives an alley to every long block and every block with a side of 70 m, never one that is a park, and tops up to one in ALLEY_ONE_IN_BLOCKS with the longest blocks in id order", () => {
    const p = planBlocks(nine, 1);
    expect(p.alleys.has("a")).toBe(true);
    expect(p.alleys.has("b")).toBe(true);
    expect(p.alleys.has("i")).toBe(true);
    for (const id of p.parks.keys()) expect(p.alleys.has(id), id).toBe(false);
    expect(p.alleys.size).toBeGreaterThanOrEqual(Math.ceil(nine.length / ALLEY_ONE_IN_BLOCKS));
    // No block qualifies and none is small enough for a park: 8 mediums of 10 x 9 to 11 x 9 take the two longest.
    const mediums = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id, k) => blockOf(id, 10 + (k % 3 === 2 ? 1 : 0), 9));
    const r = planBlocks(mediums, 1);
    expect(r.parks.size).toBe(0);
    expect(r.alleys.size).toBe(2);
    expect([...r.alleys].sort()).toEqual(["c", "f"]);
    // A block with no side of ALLEY_SIDE_MIN_CELLS is never split, even to make the rate: four 8 x 7 blocks have no alley.
    const small = ["a", "b", "c", "d"].map((id) => blockOf(id, 8, 7));
    expect(planBlocks(small, 1).alleys.size).toBe(0);
  });

  it("is one plan per blocks and seed", () => {
    expect(JSON.stringify([...planBlocks(nine, 3).alleys])).toBe(JSON.stringify([...planBlocks(nine, 3).alleys]));
    expect(JSON.stringify([...planBlocks(nine, 3).parks])).toBe(JSON.stringify([...planBlocks(nine, 3).parks]));
  });
});

describe("alleys (criterion 18)", () => {
  it("runs each alley one cell wide, parallel to the block's short side, edge to edge at the middle of its long side, and splits the block into two parts of its own", () => {
    const bad: string[] = [];
    let alleys = 0;
    for (const c of LAYOUTS) {
      const city = cityOf(c);
      for (const b of city.blocks) {
        if (b.alley === null) continue;
        alleys++;
        const lane = city.interior.filter((q) => q.block === b.id && q.role === "alley");
        const alongZ = w(b) >= d(b);
        if (b.alley.axis !== (alongZ ? "z" : "x")) bad.push(`${c.label} ${b.id}: axis ${b.alley.axis} for ${w(b)} x ${d(b)}`);
        const at = alongZ ? b.i0 + Math.floor((w(b) - 1) / 2) : b.j0 + Math.floor((d(b) - 1) / 2);
        if (b.alley.at !== at) bad.push(`${c.label} ${b.id}: at ${b.alley.at}, middle ${at}`);
        // One cell wide and the whole way across: every cell of its line in the block, and no other.
        const want = alongZ ? d(b) : w(b);
        if (lane.length !== want) bad.push(`${c.label} ${b.id}: ${lane.length} lane cells, want ${want}`);
        if (!lane.every((q) => (alongZ ? q.i === at : q.j === at))) bad.push(`${c.label} ${b.id}: lane off its line`);
        if (!lane.every((q) => q.yaw === (alongZ ? 90 : 0))) bad.push(`${c.label} ${b.id}: lane yaw`);
        // Its two parts: the block less the lane, each a block of its own.
        const parts = city.parts.filter((q) => q.block === b.id);
        if (parts.length !== 2) bad.push(`${c.label} ${b.id}: ${parts.length} parts`);
        const area = parts.reduce((n, q) => n + (q.i1 - q.i0) * (q.j1 - q.j0), 0);
        if (area !== w(b) * d(b) - want * ALLEY_CELLS) bad.push(`${c.label} ${b.id}: parts cover ${area} cells`);
        for (const q of parts) {
          if (q.alleySide === null || q.parkSide !== null) bad.push(`${c.label} ${q.id}: part flags ${q.alleySide} ${q.parkSide}`);
          if (Math.min(q.i1 - q.i0, q.j1 - q.j0) < 4) bad.push(`${c.label} ${q.id}: a part under 4 cells`);
        }
        if (b.park !== null) bad.push(`${c.label} ${b.id}: an alley and a park`);
        if (b.type === "small" || Math.max(w(b), d(b)) < ALLEY_SIDE_MIN_CELLS) bad.push(`${c.label} ${b.id}: split though ${b.type} ${w(b)} x ${d(b)}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(alleys).toBeGreaterThan(100);
  });

  it("ends the lane at a kerb cut on the street's pavement at each end, with plain parking cells (never bays or build-outs) in front of it, and no row crosses it", () => {
    const bad: string[] = [];
    for (const c of LAYOUTS) {
      const city = cityOf(c);
      const role = new Map(city.cells.map((q) => [key(q.i, q.j), q.role] as const));
      for (const b of city.blocks) {
        if (b.alley === null) continue;
        const alongZ = b.alley.axis === "z";
        const ends: [number, number, number, number][] = alongZ
          ? [[b.alley.at, b.j0 - 1, 0, -1], [b.alley.at, b.j1, 0, 1]]
          : [[b.i0 - 1, b.alley.at, -1, 0], [b.i1, b.alley.at, 1, 0]];
        for (const [i, j, di, dj] of ends) {
          if (role.get(key(i, j)) !== "kerbCut") bad.push(`${c.label} ${b.id}: no kerb cut at ${i},${j} (${role.get(key(i, j))})`);
          const beyond = role.get(key(i + di, j + dj));
          if (beyond === "parking" || beyond === "buildout" || beyond === "pavement") bad.push(`${c.label} ${b.id}: ${beyond} in front of the cut`);
          // The cut is one cell, an alley's mouth (a lot's is two): the cells beside it on the pavement stay pavement.
          for (const s of alongZ ? [[i - 1, j], [i + 1, j]] : [[i, j - 1], [i, j + 1]]) if (role.get(key(s[0]!, s[1]!)) === "kerbCut") bad.push(`${c.label} ${b.id}: a cut wider than one cell`);
        }
      }
      // No row stands on the lane's side of a part, and no lot or building faces it.
      for (const run of city.town.terraces) if (run.road.startsWith("alley:")) bad.push(`${c.label} ${run.id}: a row on an alley side`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("closes the rows an alley crosses flush on it: the row before the alley side runs to the lane's edge, and the part's other rows start and end at their own corners", () => {
    const bad: string[] = [];
    let rows = 0;
    for (const c of LAYOUTS) {
      const city = cityOf(c);
      for (const part of city.parts) {
        if (part.alleySide === null) continue;
        const k = (part.alleySide + 3) % 4;
        // The row on side k runs to the alley's edge: its run's far end is that edge (a run that ends at a lot or a plaza is not the row's last).
        const side = k === 0 ? { ux: 1, uz: 0 } : k === 1 ? { ux: 0, uz: 1 } : k === 2 ? { ux: -1, uz: 0 } : { ux: 0, uz: -1 };
        const runs = city.town.terraces.filter((r) => r.block === part.id && Math.abs(r.ux - side.ux) < 1e-9 && Math.abs(r.uz - side.uz) < 1e-9);
        if (runs.length === 0) {
          bad.push(`${c.label} ${part.id}: no row on side ${k}`);
          continue;
        }
        const last = runs[runs.length - 1]!;
        if (last.endAbuts !== "corner") continue;
        rows++;
        const ex = (last.ax + last.ux * last.len) / U;
        const ez = (last.az + last.uz * last.len) / U;
        const edge = k === 0 ? part.i1 * TILE_M : k === 1 ? part.j1 * TILE_M : k === 2 ? part.i0 * TILE_M : part.j0 * TILE_M;
        const got = k % 2 === 0 ? ex : ez;
        if (Math.abs(got - edge) > 1e-6) bad.push(`${c.label} ${last.id}: ends at ${got.toFixed(3)}, the alley's edge is ${edge}`);
        // And the lot boxes of the part never face the lane.
        const lane = [[0, -1], [1, 0], [0, 1], [-1, 0]][part.alleySide]!;
        for (const r of city.town.terraces.filter((q) => q.block === part.id)) {
          const first = city.town.lots[r.lots[0]!]!;
          if (Math.abs(Math.sin(first.yaw) - lane[0]!) < 1e-6 && Math.abs(Math.cos(first.yaw) - lane[1]!) < 1e-6) bad.push(`${c.label} ${r.id}: a row facing the lane`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(rows).toBeGreaterThan(80);
  });

  it("has an apron on both sides of the lane (apron, court or drive: never grass), and a part under 6 cells wide is the only one with no alley court", () => {
    const bad: string[] = [];
    for (const c of LAYOUTS) {
      const city = cityOf(c);
      const at = new Map<string, string>(city.interior.map((q) => [key(q.i, q.j), q.role] as const));
      // A plaza or a lot of the rows may stand beside the lane at its ends (they are cells of the rows, not interior cells).
      for (const q of city.cells) if (q.role === "plaza" || q.role === "lotSurface") at.set(key(q.i, q.j), "apron");
      for (const b of city.blocks) {
        if (b.alley === null) continue;
        const alongZ = b.alley.axis === "z";
        const len = alongZ ? d(b) : w(b);
        // The end cells of the lane are the band's (a row's last building or its passage floor stands beside them).
        for (let t = 1; t < len - 1; t++) {
          for (const s of [-1, 1]) {
            const i = alongZ ? b.alley.at + s : b.i0 + t;
            const j = alongZ ? b.j0 + t : b.alley.at + s;
            const r = at.get(key(i, j));
            if (r !== "apron" && r !== "court" && r !== "drive") bad.push(`${c.label} ${b.id}: ${r} beside the lane at ${i},${j}`);
          }
        }
        const widest = Math.max(alongZ ? b.alley.at - b.i0 : b.alley.at - b.j0, alongZ ? b.i1 - b.alley.at - ALLEY_CELLS : b.j1 - b.alley.at - ALLEY_CELLS);
        const court = city.courts.find((q) => q.block === b.id && q.run === "");
        if (widest >= 6 && len >= 6 && court === undefined) bad.push(`${c.label} ${b.id}: no alley court though a part is ${widest} wide`);
        if (court !== undefined) {
          // The drive is two cells beside the lane, and the court's six stalls are in lotStalls on the alley's street.
          for (const q of court.drive) {
            const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => at.get(key(q.i + di!, q.j + dj!)) === "alley");
            if (!near) bad.push(`${c.label} ${b.id}: the drive at ${q.i},${q.j} is not beside the lane`);
          }
          const stalls = city.lotStalls.filter((q) => q.street === `alley:${b.id}`);
          if (stalls.length !== 6 || !stalls.every((q) => q.block === b.id && q.serves === b.id)) bad.push(`${c.label} ${b.id}: ${stalls.length} alley stalls`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("stands the bins every ALLEY_BIN_EVERY_M along the lane on its apron, on alternate sides: clear of the lane, never in an end cell, never on a court, their fronts toward the lane", () => {
    const bad: string[] = [];
    let bins = 0;
    for (const c of LAYOUTS) {
      const city = cityOf(c);
      const at = new Map(city.interior.map((q) => [key(q.i, q.j), q.role] as const));
      const alleyIds = new Set(city.blocks.filter((b) => b.alley !== null).map((b) => b.id));
      for (const bin of city.alleyBins) if (!alleyIds.has(bin.block) || bin.key !== "bin") bad.push(`${c.label}: a bin in ${bin.block}`);
      for (const b of city.blocks) {
        if (b.alley === null) continue;
        const alongZ = b.alley.axis === "z";
        const mine = city.alleyBins.filter((q) => q.block === b.id);
        bins += mine.length;
        const len = (alongZ ? d(b) : w(b)) * TILE_M;
        const start = (alongZ ? b.j0 : b.i0) * TILE_M;
        const centre = (b.alley.at + 0.5) * TILE_M;
        const along = mine.map((q) => (alongZ ? q.z_m : q.x_m) - start).sort((p, q) => p - q);
        for (let k = 1; k < along.length; k++) if (Math.abs(along[k]! - along[k - 1]! - ALLEY_BIN_EVERY_M) > 1e-9 && along[k]! - along[k - 1]! < ALLEY_BIN_EVERY_M - 1e-9) bad.push(`${c.label} ${b.id}: bins ${along[k]! - along[k - 1]!} m apart`);
        for (const q of mine) {
          const across = (alongZ ? q.x_m : q.z_m) - centre;
          const s = (alongZ ? q.z_m : q.x_m) - start;
          if (Math.abs(Math.abs(across) - ALLEY_BIN_OFFSET_M) > 1e-9) bad.push(`${c.label} ${b.id}: a bin ${across} m from the lane's middle`);
          if (Math.abs(across) <= TILE_M / 2) bad.push(`${c.label} ${b.id}: a bin in the lane`);
          if (s < TILE_M || s > len - TILE_M) bad.push(`${c.label} ${b.id}: a bin in an end cell at ${s}`);
          const role = at.get(key(Math.floor(q.x_m / TILE_M), Math.floor(q.z_m / TILE_M)));
          if (role !== "apron") bad.push(`${c.label} ${b.id}: a bin on ${role}`);
          const toLane = alongZ ? (across > 0 ? 270 : 90) : across > 0 ? 180 : 0;
          if (q.yaw !== toLane) bad.push(`${c.label} ${b.id}: a bin facing ${q.yaw}`);
        }
        // A lane of 30 m or more has bins (the court may take the place of one or two).
        if (len >= 6 * TILE_M && mine.length < Math.floor((len - 3 * TILE_M) / ALLEY_BIN_EVERY_M) - 2) bad.push(`${c.label} ${b.id}: ${mine.length} bins on ${len} m`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(bins).toBeGreaterThan(150);
  });

  it("holds the checks on the packed cities (G1 to G4, with the alley's mouths accepted by G2 and the alley courts by G4) and the parking checks, on the default city, seeds 1 to 10 at 3 x 3 and 1 to 3 at 6 x 4", { timeout: 120000 }, () => {
    const bad: string[] = [];
    for (const c of PACKED) {
      const { city, packed } = packedOf(c);
      const m = frontageMetrics(city, packed);
      for (const v of evaluateFrontage(m)) if (!v.pass) bad.push(`${c.label}: ${v.id} ${v.value}`);
      // Every far end is closed (a seam, an overshoot or a gated passage), the alley's too.
      if (m.farEnds.slit + m.farEnds.wide !== 0) bad.push(`${c.label}: ${m.farEnds.slit} slits and ${m.farEnds.wide} wide`);
      if (m.interior.alleyCells !== city.blocks.reduce((n, b) => n + (b.alley === null ? 0 : b.alley.axis === "z" ? d(b) : w(b)), 0)) bad.push(`${c.label}: alley cells ${m.interior.alleyCells}`);
      if (m.interior.alleyEndsNoKerbCut !== 0) bad.push(`${c.label}: ${m.interior.alleyEndsNoKerbCut} alley ends with no kerb cut`);
    }
    // 063 B (no avenues): the parking checks hold on every city the ticket names (the default, seeds 1 to 10 at 3 x 3, seeds 1 to 3 at 6 x 4: this loop's PACKED set), and fail P1 by one block on two more cities
    // this loop also covered, 6 x 4 seeds 5 and 7. Their one block has no tile of bays serving it: with one parking band to a street (the avenue's second band is gone) and a cap of one tile on a side of up to 12 cells,
    // the neighbours across the street took the only tile. This is not a looser band: the two are named, pinned exactly (a third failure, or either one mending, fails here), and reported to the main session as a re-cut
    // (the bay allocator in tilecity.ts, 056's, would need a first tile for every block by matching; B did not touch it).
    const P1_ONE_SHORT = new Set(["6x4 seed 5", "6x4 seed 7"]);
    const seen = new Set<string>();
    for (const c of LAYOUTS) {
      for (const v of evaluateParking(parkingMetrics(cityOf(c)))) {
        if (v.pass) continue;
        if (v.id === "P1" && v.value === 1 && P1_ONE_SHORT.has(c.label)) seen.add(c.label);
        else bad.push(`${c.label}: ${v.id} ${v.value}`);
      }
    }
    expect([...seen].sort()).toEqual([...P1_ONE_SHORT].sort());
    for (const label of P1_ONE_SHORT) expect(PACKED.some((p) => p.label === label), `${label} is a city the ticket names`).toBe(false);
    expect(bad).toEqual([]);
  });
});

describe("parks (criterion 19)", () => {
  it("lays a whole-block park with no terrace lot, no unit and no kerb bay, and nothing inside it but green, paths and a pavement edge round all four streets, with every cell filled", () => {
    const bad: string[] = [];
    let whole = 0;
    for (const c of LAYOUTS) {
      const city = cityOf(c);
      for (const b of city.blocks) {
        if (b.park?.kind !== "whole") continue;
        whole++;
        if (city.parts.some((q) => q.block === b.id)) bad.push(`${c.label} ${b.id}: a part`);
        if (city.town.terraces.some((r) => r.block === b.id || r.block.startsWith(`${b.id}/`)) || city.town.lots.some((l) => l.street === `park:${b.id}`)) bad.push(`${c.label} ${b.id}: a row`);
        if (b.units.columns + b.units.shops + b.units.homes !== 0) bad.push(`${c.label} ${b.id}: units`);
        if (city.courts.some((q) => q.block === b.id) || city.lotStalls.some((q) => q.block === b.id)) bad.push(`${c.label} ${b.id}: a court or stall`);
        if (city.bays.some((q) => q.block === b.id)) bad.push(`${c.label} ${b.id}: a kerb bay`);
        if (city.town.openLots.some((o) => o.x / U > b.i0 * TILE_M && o.x / U < b.i1 * TILE_M && o.z / U > b.j0 * TILE_M && o.z / U < b.j1 * TILE_M)) bad.push(`${c.label} ${b.id}: an open lot`);
        const mine = city.interior.filter((q) => q.block === b.id);
        if (!mine.every((q) => q.role === "green" || q.role === "greenPath" || q.role === "parkEdge")) bad.push(`${c.label} ${b.id}: other roles ${[...new Set(mine.map((q) => q.role))].join(",")}`);
        const cells = new Set(mine.map((q) => key(q.i, q.j)));
        if (cells.size !== mine.length || mine.length !== w(b) * d(b)) bad.push(`${c.label} ${b.id}: ${mine.length} cells for ${w(b) * d(b)}`);
        const edge = mine.filter((q) => q.role === "parkEdge");
        const ring = (q: { i: number; j: number }): number => Math.min(q.i - b.i0, b.i1 - 1 - q.i, q.j - b.j0, b.j1 - 1 - q.j);
        if (edge.length !== mine.filter((q) => ring(q) < PARK_EDGE_CELLS).length || edge.some((q) => ring(q) >= PARK_EDGE_CELLS)) bad.push(`${c.label} ${b.id}: the pavement edge is not the outer ring`);
        // Its paths cross: one along each axis, from edge to edge.
        const paths = mine.filter((q) => q.role === "greenPath");
        if (!paths.some((q) => q.yaw === 0) || !paths.some((q) => q.yaw === 90)) bad.push(`${c.label} ${b.id}: paths do not cross`);
        for (const q of paths) {
          const [di, dj] = q.yaw === 0 ? [1, 0] : [0, 1];
          for (const s of [-1, 1]) {
            const n = mine.find((o) => o.i === q.i + s * di && o.j === q.j + s * dj);
            if (!n || (n.role !== "parkEdge" && n.role !== "greenPath")) bad.push(`${c.label} ${b.id}: a path ends on ${n?.role}`);
          }
        }
        // Its kerbside band is build-outs (no bay of its own, and nothing laid for a lot): the cell after the pavement on each side, where the street has a parking band there.
        const role = new Map(city.cells.map((q) => [key(q.i, q.j), q.role] as const));
        const band: [number, number][] = [];
        for (let i = b.i0; i < b.i1; i++) band.push([i, b.j0 - 2], [i, b.j1 + 1]);
        for (let j = b.j0; j < b.j1; j++) band.push([b.i0 - 2, j], [b.i1 + 1, j]);
        for (const [i, j] of band) {
          const r = role.get(key(i, j));
          if (r === "parking" || r === "parkingPlain" || r === "kerbCut") bad.push(`${c.label} ${b.id}: ${r} on its band at ${i},${j}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(whole).toBeGreaterThan(5);
  });

  it("lays a half-block park along one long side of a large block, the built half as a block of its own whose park-facing row fronts the park's pavement edge", () => {
    const bad: string[] = [];
    let half = 0;
    for (const c of LAYOUTS) {
      const city = cityOf(c);
      for (const b of city.blocks) {
        if (b.park?.kind !== "half") continue;
        half++;
        const pk = b.park;
        const built = city.parts.filter((q) => q.block === b.id);
        if (built.length !== 1) {
          bad.push(`${c.label} ${b.id}: ${built.length} built parts`);
          continue;
        }
        const part = built[0]!;
        if (b.type !== "large") bad.push(`${c.label} ${b.id}: a ${b.type} block gave a half`);
        // The park and the built half tile the block, and the park is along a long side: its length is the block's long side, its depth half the short one (rounded down).
        const parkCells = (pk.i1 - pk.i0) * (pk.j1 - pk.j0);
        const partCells = (part.i1 - part.i0) * (part.j1 - part.j0);
        if (parkCells + partCells !== w(b) * d(b)) bad.push(`${c.label} ${b.id}: ${parkCells} + ${partCells} cells for ${w(b) * d(b)}`);
        const longSide = Math.max(w(b), d(b));
        const parkLong = Math.max(pk.i1 - pk.i0, pk.j1 - pk.j0);
        const parkDepth = Math.min(pk.i1 - pk.i0, pk.j1 - pk.j0);
        if (parkLong !== longSide || parkDepth !== Math.floor(Math.min(w(b), d(b)) / 2)) bad.push(`${c.label} ${b.id}: park ${pk.i1 - pk.i0} x ${pk.j1 - pk.j0} in ${w(b)} x ${d(b)}`);
        if (part.parkSide !== pk.side || part.alleySide !== null) bad.push(`${c.label} ${part.id}: park side ${part.parkSide}, park's ${pk.side}`);
        // The park-facing row stands on the park's edge: its front line is the built half's edge toward the park, and every cell of the pavement edge in front of it (inside the park) is a park edge.
        const parkRoad = `park:${b.id}`;
        const runs = city.town.terraces.filter((r) => r.block === part.id && r.road === parkRoad);
        if (runs.length === 0) bad.push(`${c.label} ${part.id}: no row on the park`);
        const edgeAt = new Map(city.interior.filter((q) => q.block === b.id && q.role === "parkEdge").map((q) => [key(q.i, q.j), q] as const));
        for (const r of runs) {
          const alongX = Math.abs(r.uz) < 1e-9;
          const x0 = Math.min(r.ax, r.ax + r.ux * r.len) / U;
          const x1 = Math.max(r.ax, r.ax + r.ux * r.len) / U;
          const z0 = Math.min(r.az, r.az + r.uz * r.len) / U;
          const z1 = Math.max(r.az, r.az + r.uz * r.len) / U;
          // The line the front stands on, in cells; the edge cell in front of it is on the park's side.
          const lineCell = alongX ? Math.round(r.az / U / TILE_M) : Math.round(r.ax / U / TILE_M);
          // The boundary between the park and the built half: the part's edge on the park's side.
          const boundary = alongX ? (pk.j1 === part.j0 ? part.j0 : part.j1) : pk.i1 === part.i0 ? part.i0 : part.i1;
          if (lineCell !== boundary) bad.push(`${c.label} ${r.id}: front line at cell ${lineCell}, the park's boundary is ${boundary}`);
          const parkSideCell = alongX ? (pk.j1 === part.j0 ? part.j0 - 1 : part.j1) : pk.i1 === part.i0 ? part.i0 - 1 : part.i1;
          for (let t = Math.floor((alongX ? x0 : z0) / TILE_M + 1e-9); t < Math.ceil((alongX ? x1 : z1) / TILE_M - 1e-9); t++) {
            const cell = edgeAt.get(alongX ? key(t, parkSideCell) : key(parkSideCell, t));
            if (cell === undefined) bad.push(`${c.label} ${r.id}: no park edge in front of cell ${t}`);
          }
        }
        // The built half is laid like a block (its other rows face the streets) and holds its own units.
        if (b.units.columns <= 0) bad.push(`${c.label} ${b.id}: the built half has no units`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(half).toBeGreaterThan(10);
  });

  it("holds the checks on the packed cities, parks and all: G1 to G4 and the parking checks pass, a park edge counted as a frontage where buildings face it", { timeout: 120000 }, () => {
    const bad: string[] = [];
    let facing = 0;
    for (const c of PACKED) {
      const { city, packed } = packedOf(c);
      const m = frontageMetrics(city, packed);
      for (const v of evaluateFrontage(m)) if (!v.pass) bad.push(`${c.label}: ${v.id} ${v.value}`);
      // G2 measured the park-facing rows as sides (a row on a park edge is a frontage), and G3 filled every park cell.
      for (const part of city.parts) if (part.parkSide !== null) facing++;
      expect(m.interior.blocks, c.label).toBe(city.blocks.length);
      for (const v of evaluateVariety(blockVariety(city))) if (!v.pass) bad.push(`${c.label}: ${v.id} ${v.value}`);
    }
    expect(bad).toEqual([]);
    expect(facing).toBeGreaterThan(5);
  });
});

describe("the plan across the cities (V3 and V4's rates, and no block both)", () => {
  it("has at least ceil(blocks / 4) alleys and ceil(blocks / 6) parks in every city, and no block with both", () => {
    const bad: string[] = [];
    for (const c of LAYOUTS) {
      const city = cityOf(c);
      const n = city.blocks.length;
      const alleys = city.blocks.filter((b) => b.alley !== null).length;
      const parks = city.blocks.filter((b) => b.park !== null).length;
      if (alleys < Math.ceil(n / ALLEY_ONE_IN_BLOCKS)) bad.push(`${c.label}: ${alleys} alleys in ${n}`);
      if (parks < Math.ceil(n / PARK_ONE_IN_BLOCKS)) bad.push(`${c.label}: ${parks} parks in ${n}`);
      if (city.blocks.some((b) => b.alley !== null && b.park !== null)) bad.push(`${c.label}: both`);
    }
    expect(bad).toEqual([]);
  });

  it("is frozen all the way down and one city per size and seed", () => {
    const a = tileCity({ blocksX: 3, blocksZ: 3, seed: 3 });
    expect(JSON.stringify(a.parts)).toBe(JSON.stringify(tileCity({ blocksX: 3, blocksZ: 3, seed: 3 }).parts));
    expect(JSON.stringify(a.alleyBins)).toBe(JSON.stringify(tileCity({ blocksX: 3, blocksZ: 3, seed: 3 }).alleyBins));
    expect(Object.isFrozen(a.parts) && Object.isFrozen(a.parts[0]) && Object.isFrozen(a.alleyBins) && Object.isFrozen(a.blocks[0]!.park === null ? a.blocks[0] : a.blocks[0]!.park)).toBe(true);
  });
});

describe("block sizes: the 057 F review's could-improves", () => {
  it("falls back to a known-good layout when every draw misses: forced by a test that never accepts, it returns the fixed lists cut to the city's size, and they hold every rule at every size up to 6 x 6", () => {
    const missed = blockSizes(1, 4, 5, () => false);
    expect(missed.draw).toBeNull();
    expect(missed.widths).toEqual(BLOCK_FALLBACK_WIDTHS.slice(0, 4));
    expect(missed.depths).toEqual(BLOCK_FALLBACK_DEPTHS.slice(0, 5));
    // The draws tried are BLOCK_DRAWS_MAX and the first: a rule that accepts only the last draw is still a draw, not the fallback.
    let calls = 0;
    const last = blockSizes(2, 3, 3, () => ++calls === BLOCK_DRAWS_MAX + 1);
    expect(calls).toBe(BLOCK_DRAWS_MAX + 1);
    expect(last.draw).toBe(BLOCK_DRAWS_MAX);
    // A normal city draws by hash and does not fall back (no seed 1 to 20 at any size of the ticket needs it).
    for (let s = 1; s <= 20; s++) expect(blockSizes(s, 6, 4).draw, `seed ${s}`).not.toBeNull();
    // The fallback holds V1 and V2's rules, the mean, the neighbour step, the repeat rule and the bay-side rule, for every prefix pair (every city size up to CITY_BLOCKS_MAX).
    const bad: string[] = [];
    const mean = (a: readonly number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
    for (const axis of [BLOCK_FALLBACK_WIDTHS, BLOCK_FALLBACK_DEPTHS]) {
      expect(axis.length).toBeGreaterThanOrEqual(CITY_BLOCKS_MAX);
      expect(new Set(axis).size).toBe(axis.length);
      for (let k = 1; k < axis.length; k++) expect(Math.abs(axis[k]! - axis[k - 1]!)).toBeGreaterThanOrEqual(BLOCK_STEP_MIN_CELLS);
      for (const n of axis) expect(n >= BLOCK_TILES.min && n <= BLOCK_TILES.max).toBe(true);
    }
    for (let a = 1; a <= CITY_BLOCKS_MAX; a++) {
      for (let b = 1; b <= CITY_BLOCKS_MAX; b++) {
        const ws = BLOCK_FALLBACK_WIDTHS.slice(0, a);
        const ds = BLOCK_FALLBACK_DEPTHS.slice(0, b);
        const blocks: { bi: number; bj: number; i0: number; i1: number; j0: number; j1: number }[] = [];
        ds.forEach((dd, bj) => ws.forEach((ww, bi) => blocks.push({ bi, bj, i0: 0, i1: ww, j0: 0, j1: dd })));
        const v = evaluateVariety(blockVariety({ blocks }));
        // A single block has no neighbour to differ from but is not a square (V1's footprints need only one).
        const ok = v.slice(0, 2).every((x) => x.pass) || (a === 1 && b === 1 && ws[0] !== ds[0]);
        if (!ok) bad.push(`${a} x ${b}: ${JSON.stringify(v)}`);
        if (mean(ws) < BLOCK_MEAN_MIN_CELLS || mean(ds) < BLOCK_MEAN_MIN_CELLS) bad.push(`${a} x ${b}: means ${mean(ws)} and ${mean(ds)}`);
        for (const x of ws) for (const y of ds) if (Math.max(x, y) < 7) bad.push(`${a} x ${b}: a ${x} x ${y} block has no side of 7 cells`);
      }
    }
    expect(bad).toEqual([]);
    // And the whole city built on it is a city: a tile city whose draws all missed would be laid on these lists.
    for (const [bx, bz] of [[1, 1], [3, 3], [6, 4], [6, 6]] as const) {
      const sizes = blockSizes(1, bx, bz, () => false);
      expect(sizes.widths.length).toBe(bx);
      expect(sizes.depths.length).toBe(bz);
    }
  });

  it("draws sizes near both ends of the 6 to 16 range over seeds 1 to 20: some block side within 1 cell of BLOCK_TILES.min and some within 1 of BLOCK_TILES.max, at 6 x 4 and at 3 x 3", () => {
    for (const [bx, bz] of [[6, 4], [3, 3]] as const) {
      const sides: number[] = [];
      for (let s = 1; s <= 20; s++) {
        const c = tileCity({ blocksX: bx, blocksZ: bz, seed: s });
        for (const b of c.blocks) sides.push(w(b), d(b));
      }
      expect(Math.min(...sides), `${bx}x${bz}`).toBeLessThanOrEqual(BLOCK_TILES.min + 1);
      expect(Math.max(...sides), `${bx}x${bz}`).toBeGreaterThanOrEqual(BLOCK_TILES.max - 1);
      // Not just the extremes: every size of the range turns up at 6 x 4 (a drawn width or depth), so the range is used end to end.
      if (bx === 6) {
        const seen = new Set(sides);
        for (let n = BLOCK_TILES.min; n <= BLOCK_TILES.max; n++) expect(seen.has(n), `size ${n}`).toBe(true);
      }
    }
  });
});
