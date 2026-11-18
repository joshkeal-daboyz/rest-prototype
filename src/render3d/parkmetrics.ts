/**
 * The parking checks of the tile city (ticket 056, section A), as pure data: no three, no DOM, no assets. `parkingMetrics(city)` measures a `TileCity` against chapter 18's rules and
 * `evaluateParking(m)` gives one verdict per check, P1 to P6, as `evaluateCity` does for the buildings. Everything is read from the city's cells, bays, lot stalls and blocks, never
 * from the code that laid them, so a city laid by another rule (today's pairing of every parking cell) fails the checks it should.
 *
 * Every verdict's `value` is the number of violations (0 passes), except P6's, which is the bays per 100 m of block kerb (it passes at `BAYS_PER_100M_MAX` or fewer).
 */

import {
  BAYS_PER_100M_MAX,
  BAYS_PER_PARKING_TILE,
  BAY_JUNCTION_CLEAR,
  BAY_RUN_TILES_MAX,
  BAY_TILES_PER_BLOCK_MIN,
  BUILDOUT_TREE_EVERY,
  KERB_BAY_SHARE_MAX,
  KERB_GAP_MIN_M,
  LOTS_PER_BLOCK_MAX,
  LOT_STALLS,
  PARK_PER_HOME,
  PARK_PER_SHOP,
  PARK_SUPPLY_BAND,
  TILE_M,
  type TileCity,
  type TileRole,
  type TileStreet,
} from "./tilecity";
import { WORLD_PER_METRE } from "./town";

export type ParkCheckId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

/** What each check allows: 0 violations, and for P6 the most bays per 100 m of block kerb. */
export const PARK_CHECK: Readonly<Record<ParkCheckId, number>> = {
  P1: 0,
  P2: 0,
  P3: 0,
  P4: 0,
  P5: 0,
  P6: BAYS_PER_100M_MAX,
};

export interface ParkingMetrics {
  blocks: number;
  kerbBays: number;
  lotStalls: number;
  /** The units of every block, summed (`TileBlock.units`). */
  shops: number;
  homes: number;
  /** Bays and stalls the units call for: shops x `PARK_PER_SHOP` and homes x `PARK_PER_HOME`. */
  bayDemand: number;
  stallDemand: number;
  /** Blocks with fewer than `BAY_TILES_PER_BLOCK_MIN` tiles of bays serving them. */
  blocksWithoutBays: number;
  /** Bays and lot stalls that serve a block that is neither the block they stand at nor next to it across one street. */
  bayServedFar: number;
  stallServedFar: number;
  /** Blocks no lot serves; blocks that hold or are served by more than `LOTS_PER_BLOCK_MAX` lots; blocks whose lot quota fell short (a block no lot serves is short, and at most ceil(blocks / 9) may be). */
  blocksWithoutLot: number;
  blocksOverLots: number;
  shortBlocks: number;
  /** Every side of a block that has bays: its street, the block, the share of its kerb that is bay and the share its profile allows. */
  sideShares: { street: string; block: string; share: number; cap: number }[];
  /** Bays on the outside of an edge street. */
  outerBays: number;
  /** The tiles of every run of bays, and the metres of kerb without bays between neighbouring runs on one side. */
  runs: number[];
  gaps: number[];
  /** Tiles with a bay in the cell next to a crossing, a junction or a corner. */
  bayNextToCrossing: number;
  /** Parking-band cells that are none of a half tile, a plain cell in front of a kerb cut or on an edge street's outer side, or a build-out. */
  badBandCells: number;
  /** Build-out trees that are missing, extra or in the wrong place against the pitch rule. */
  badTrees: number;
  /** The kerb of every block's four sides, metres, and the bays per 100 m of it. */
  kerbMetres: number;
  bays100m: number;
}

const CROSSING_ROLES: readonly (TileRole | null)[] = ["crossing", "junction", "pavementCorner"];

/** Measures a tile city against the parking rules. Pure. */
export function parkingMetrics(city: TileCity): ParkingMetrics {
  const u = WORLD_PER_METRE;
  const W = Math.round(city.town.window.maxX / u / TILE_M);
  const H = Math.round(city.town.window.maxY / u / TILE_M);
  const streets = new Map(city.streets.map((s) => [s.id, s] as const));
  const blocks = new Map(city.blocks.map((b) => [b.id, b] as const));
  const role: (TileRole | null)[] = new Array<TileRole | null>(W * H).fill(null);
  for (const c of city.cells) {
    role[c.j * W + c.i] = c.role;
    if (c.cells === 2) {
      const alongX = streets.get(c.street ?? "")?.axis === "x";
      role[(c.j + (alongX ? 0 : 1)) * W + c.i + (alongX ? 1 : 0)] = c.role;
    }
  }
  const at = (i: number, j: number): TileRole | null => (i < 0 || j < 0 || i >= W || j >= H ? null : (role[j * W + i] ?? null));

  const shops = city.blocks.reduce((n, b) => n + b.units.shops, 0);
  const homes = city.blocks.reduce((n, b) => n + b.units.homes, 0);

  // ---- who the bays and stalls serve ----
  const adjacent = (a: string, b: string): boolean => {
    if (a === b) return true;
    const p = blocks.get(a);
    const q = blocks.get(b);
    return p !== undefined && q !== undefined && Math.abs(p.bi - q.bi) + Math.abs(p.bj - q.bj) === 1;
  };
  const baysServing = new Map<string, number>();
  let bayServedFar = 0;
  let outerBays = 0;
  for (const b of city.bays) {
    baysServing.set(b.serves, (baysServing.get(b.serves) ?? 0) + 1);
    if (b.block === "outer") outerBays++;
    else if (!adjacent(b.block, b.serves)) bayServedFar++;
  }
  const lotsServing = new Map<string, number>();
  const lotsHeld = new Map<string, number>();
  let stallServedFar = 0;
  for (const s of city.lotStalls) {
    lotsServing.set(s.serves, (lotsServing.get(s.serves) ?? 0) + 1 / LOT_STALLS);
    lotsHeld.set(s.block, (lotsHeld.get(s.block) ?? 0) + 1 / LOT_STALLS);
    if (!adjacent(s.block, s.serves)) stallServedFar++;
  }
  let blocksWithoutBays = 0;
  let blocksWithoutLot = 0;
  let blocksOverLots = 0;
  let shortBlocks = 0;
  for (const b of city.blocks) {
    if ((baysServing.get(b.id) ?? 0) < BAY_TILES_PER_BLOCK_MIN * BAYS_PER_PARKING_TILE) blocksWithoutBays++;
    const served = Math.round(lotsServing.get(b.id) ?? 0);
    if (served === 0) blocksWithoutLot++;
    if (served > LOTS_PER_BLOCK_MAX || Math.round(lotsHeld.get(b.id) ?? 0) > LOTS_PER_BLOCK_MAX) blocksOverLots++;
    if (b.parkingShort.stalls > 0 || served === 0) shortBlocks++;
  }

  // ---- the share of each side's kerb that is bay ----
  const bayLen = new Map<string, number>();
  for (const b of city.bays) {
    if (b.block === "outer") continue;
    const k = `${b.street}|${b.block}`;
    bayLen.set(k, (bayLen.get(k) ?? 0) + b.w_m);
  }
  const sideShares: ParkingMetrics["sideShares"] = [];
  for (const [k, len] of bayLen) {
    const [street, block] = k.split("|") as [string, string];
    const s = streets.get(street)!;
    const b = blocks.get(block)!;
    const kerb = (s.axis === "x" ? b.i1 - b.i0 : b.j1 - b.j0) * TILE_M;
    sideShares.push({ street, block, share: len / kerb, cap: KERB_BAY_SHARE_MAX[s.profile] });
  }

  // ---- runs, gaps and the cells next to crossings, from the tiles ----
  const bands = new Map<string, number[]>();
  let bayNextToCrossing = 0;
  for (const c of city.cells) {
    if (c.role !== "parking") continue;
    const s = streets.get(c.street ?? "")!;
    const x = s.axis === "x";
    const start = x ? c.i : c.j;
    const across = x ? c.j : c.i;
    const k = `${s.id}|${across}`;
    const l = bands.get(k);
    if (l) l.push(start);
    else bands.set(k, [start]);
    const before = x ? at(start - BAY_JUNCTION_CLEAR, across) : at(across, start - BAY_JUNCTION_CLEAR);
    const after = x ? at(start + 1 + BAY_JUNCTION_CLEAR, across) : at(across, start + 1 + BAY_JUNCTION_CLEAR);
    if (CROSSING_ROLES.includes(before) || CROSSING_ROLES.includes(after)) bayNextToCrossing++;
  }
  const runs: number[] = [];
  const gaps: number[] = [];
  for (const starts of bands.values()) {
    starts.sort((p, q) => p - q);
    let tiles = 1;
    for (let n = 1; n <= starts.length; n++) {
      if (n < starts.length && starts[n] === starts[n - 1]! + 2) {
        tiles++;
        continue;
      }
      runs.push(tiles);
      if (n < starts.length) gaps.push((starts[n]! - (starts[n - 1]! + 2)) * TILE_M);
      tiles = 1;
    }
  }

  // ---- the band: every parking-band cell is a half tile, a plain cell in front of a kerb cut or on an outer side, or a build-out; and the trees ----
  let badBandCells = 0;
  const wantTrees = new Set<string>();
  const keyOf = (x: number, z: number): string => `${Math.round(x * 1000)},${Math.round(z * 1000)}`;
  for (const s of city.streets) {
    const n = s.bands.length;
    const x = s.axis === "x";
    const len = x ? W : H;
    for (let k = 0; k < n; k++) {
      if (s.bands[k] !== "parking") continue;
      const across = x ? s.across0 + k : s.across0 + n - 1 - k;
      const out = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
      const outer = outerSide(city, s, out);
      let stretch = 0;
      for (let a = 0; a < len; a++) {
        const r = x ? at(a, across) : at(across, a);
        if (r === "buildout") {
          stretch++;
          const before = x ? at(a - 1, across) : at(across, a - 1);
          const after = x ? at(a + 1, across) : at(across, a + 1);
          if (stretch % BUILDOUT_TREE_EVERY === 0 && !CROSSING_ROLES.includes(before) && !CROSSING_ROLES.includes(after)) wantTrees.add(keyOf(x ? (a + 0.5) * TILE_M : (across + 0.5) * TILE_M, x ? (across + 0.5) * TILE_M : (a + 0.5) * TILE_M));
          continue;
        }
        stretch = 0;
        if (r === null || CROSSING_ROLES.includes(r) || r === "parking") continue;
        if (r === "parkingPlain") {
          const pave = x ? at(a, across + out) : at(across + out, a);
          if (!outer && pave !== "kerbCut") badBandCells++;
          continue;
        }
        badBandCells++;
      }
    }
  }
  for (const c of city.cells) if (c.role === "parking" && c.cells !== 2) badBandCells++;
  const haveTrees = new Set(city.buildoutTrees.map((t) => keyOf(t.x_m, t.z_m)));
  let badTrees = Math.abs(city.buildoutTrees.length - haveTrees.size);
  for (const t of wantTrees) if (!haveTrees.has(t)) badTrees++;
  for (const t of haveTrees) if (!wantTrees.has(t)) badTrees++;

  const kerbMetres = city.blocks.reduce((n, b) => n + 2 * (b.i1 - b.i0 + b.j1 - b.j0) * TILE_M, 0);
  return {
    blocks: city.blocks.length,
    kerbBays: city.bays.length,
    lotStalls: city.lotStalls.length,
    shops,
    homes,
    bayDemand: shops * PARK_PER_SHOP,
    stallDemand: homes * PARK_PER_HOME,
    blocksWithoutBays,
    bayServedFar,
    stallServedFar,
    blocksWithoutLot,
    blocksOverLots,
    shortBlocks,
    sideShares,
    outerBays,
    runs,
    gaps,
    bayNextToCrossing,
    badBandCells,
    badTrees,
    kerbMetres,
    bays100m: kerbMetres > 0 ? (city.bays.length / kerbMetres) * 100 : 0,
  };
}

/** Whether the band of `s` that faces `out` (+1 or -1 across the street) faces the yard outside the city: the outer side of an edge street. */
function outerSide(city: TileCity, s: TileStreet, out: number): boolean {
  const last = (s.axis === "x" ? city.blocksZ : city.blocksX) as number;
  return (s.line === 0 && out < 0) || (s.line === last && out > 0);
}

/** One verdict per check. */
export function evaluateParking(m: ParkingMetrics): { id: ParkCheckId; value: number; pass: boolean }[] {
  const inBand = (have: number, want: number): boolean => want <= 0 || (have >= PARK_SUPPLY_BAND.lo * want - 1e-9 && have <= PARK_SUPPLY_BAND.hi * want + 1e-9);
  const p1 = (inBand(m.kerbBays, m.bayDemand) ? 0 : 1) + m.blocksWithoutBays + m.bayServedFar;
  const p2 = (inBand(m.lotStalls, m.stallDemand) ? 0 : 1) + m.blocksOverLots + m.stallServedFar + Math.max(0, m.shortBlocks - Math.ceil(m.blocks / 9));
  const p3 = m.sideShares.filter((s) => s.share > s.cap + 1e-9).length + m.outerBays;
  const p4 = m.runs.filter((t) => t > BAY_RUN_TILES_MAX).length + m.gaps.filter((g) => g < KERB_GAP_MIN_M - 1e-9).length + m.bayNextToCrossing;
  const p5 = m.badBandCells + m.badTrees;
  const item = (id: ParkCheckId, value: number, pass: boolean): { id: ParkCheckId; value: number; pass: boolean } => ({ id, value, pass });
  return [
    item("P1", p1, p1 <= PARK_CHECK.P1),
    item("P2", p2, p2 <= PARK_CHECK.P2),
    item("P3", p3, p3 <= PARK_CHECK.P3),
    item("P4", p4, p4 <= PARK_CHECK.P4),
    item("P5", p5, p5 <= PARK_CHECK.P5),
    item("P6", m.bays100m, m.bays100m <= PARK_CHECK.P6 + 1e-9),
  ];
}
