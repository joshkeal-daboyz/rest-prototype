/**
 * Stage 4, section D1: the kerb cuts at vehicle openings, the parking band (056's greedy allocator, moved from `src/render3d/tilecity.ts` at 2edac93, plus one first pass: every block's first kerb tile, Josh,
 * 20 Nov 2026, "yes", option B of `docs/design/070-D1-precheck.md`), the build-outs and their trees. Pure. Demand is read from `mass.units`, never from buildings.
 */

import type {
  CityBayTile,
  CityBuildoutTree,
  CityCell,
  CityEdgeBlock,
  CityEdgeCell,
  CityEdgeLayer,
  CityEdgeRole,
  CityKerbBay,
  CityKerbCut,
  CityLandLayer,
  CityMassLayer,
  CityPlanOptions,
  CityStreet,
  CityStreetsLayer,
  CityYaw,
} from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { BAYS_PER_100M_MAX, BAYS_PER_PARKING_TILE, BAY_JUNCTION_CLEAR, BAY_RUN_TILES_MAX, BAY_TILES_PER_BLOCK_MIN, BUILDOUT_TREE_EVERY, KERB_BAY_SHARE_MAX, KERB_GAP_MIN_M, PARK_PER_SHOP, TILE_M } from "./constants";

/** One parking band of one street along one block interval (056): where kerbside bays, build-outs and plain cells lie. */
interface Band {
  /** `<street>|<side>|<alongIdx>`: side is which side of the street the block lies on, alongIdx the block's index along the street. */
  key: string;
  s: CityStreet;
  /** The band's row (an "x" street) or column (a "z" street). */
  across: number;
  /** The interval's first cell along the street and one past its last: the first and last cells are next to the crossings. */
  a0: number;
  a1: number;
  yaw: CityYaw;
  /** The block the band faces, or "outer" on the outside of an edge street. */
  block: string;
}

/** A band with its free stretch, its cap in tiles, and the runs laid so far (each tile names the block it serves). */
interface BandState {
  band: Band;
  sa: number;
  sb: number;
  cap: number;
  runs: string[][];
}

/** One side of a block: its street, which side of it the block lies on, its length in cells and the block across the street (null at the city's edge). */
interface BSide {
  road: string;
  side: 1 | -1;
  len: number;
  neigh: string | null;
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const yawToward = (axis: "x" | "z", sign: number): CityYaw => (axis === "x" ? (sign > 0 ? 0 : 180) : sign > 0 ? 90 : 270);
const sideOf = (axis: "x" | "z", coordSign: number): 1 | -1 => ((axis === "x" ? coordSign : -coordSign) > 0 ? 1 : -1);

/** Lays the street edge from the three layers before it. Throws `CityStageError` where a mouth has no street cell to cut or a street cell has no band. */
export function buildEdge(streets: CityStreetsLayer, land: CityLandLayer, mass: CityMassLayer, options: CityPlanOptions, rand: StageRand): CityEdgeLayer {
  const W = streets.w;
  const H = streets.h;
  const { blocksX, blocksZ } = options;
  const base: (string | null)[] = new Array<string | null>(W * H).fill(null);
  const owner: (string | null)[] = new Array<string | null>(W * H).fill(null);
  for (const c of streets.cells) {
    base[c.j * W + c.i] = c.role;
    owner[c.j * W + c.i] = c.street;
  }
  /** The refined role of every street cell, starting as stage 1's. */
  const er: (CityEdgeRole | null)[] = base.map((r) => r as CityEdgeRole | null);
  const inLattice = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < W && j < H;

  // ---- kerb cuts: the pavement cell in front of every mouth cell, and the parking cell in front of it stays plain ----
  const blocked = new Set<number>();
  const kerbCuts: CityKerbCut[] = [];
  for (const o of mass.openings) {
    for (const m of o.mouth) {
      for (const c of m.cells) {
        const near = DIRS.map(([di, dj]) => ({ i: c.i + di, j: c.j + dj, di, dj })).filter((n) => inLattice(n.i, n.j) && base[n.j * W + n.i] === "pavement" && owner[n.j * W + n.i] === m.street);
        if (near.length !== 1) throw new CityStageError(`kerb cut: mouth cell (${c.i}, ${c.j}) of ${o.id} has ${near.length} pavement cells of ${m.street} beside it, not one`, [c]);
        const n = near[0]!;
        if (er[n.j * W + n.i] === "kerbCut") throw new CityStageError(`kerb cut: the pavement cell (${n.i}, ${n.j}) is the front of two mouth cells`, [c]);
        er[n.j * W + n.i] = "kerbCut";
        const pi = n.i + n.di;
        const pj = n.j + n.dj;
        const pIdx = pj * W + pi;
        let plain: CityCell | null = null;
        if (inLattice(pi, pj) && base[pIdx] === "parkingPlain" && owner[pIdx] === m.street) {
          plain = { i: pi, j: pj };
          blocked.add(pIdx);
        }
        kerbCuts.push({ cell: { i: n.i, j: n.j }, street: m.street, opening: o.id, plain });
      }
    }
  }

  // ---- the bands ----
  const blocks = streets.blocks;
  const colsOf = blocks.filter((b) => b.bj === 0).sort((p, q) => p.bi - q.bi).map((b) => ({ first: b.i0, len: b.i1 - b.i0 }));
  const rowsOf = blocks.filter((b) => b.bi === 0).sort((p, q) => p.bj - q.bj).map((b) => ({ first: b.j0, len: b.j1 - b.j0 }));
  const blockIdAt = (s: CityStreet, coordSign: number, alongIdx: number): string => {
    let bi: number;
    let bj: number;
    if (s.axis === "x") {
      bi = alongIdx;
      bj = coordSign < 0 ? s.line - 1 : s.line;
    } else {
      bi = coordSign > 0 ? s.line : s.line - 1;
      bj = alongIdx;
    }
    return bi < 0 || bi >= blocksX || bj < 0 || bj >= blocksZ ? "outer" : `block:${bi}:${bj}`;
  };
  const bandList: Band[] = [];
  const bandCell = (b: Band, a: number): number => (b.s.axis === "x" ? b.across * W + a : a * W + b.across);
  const cellOf = (b: Band, a: number): CityCell => (b.s.axis === "x" ? { i: a, j: b.across } : { i: b.across, j: a });
  const bandOfCell = new Map<number, Band>();
  for (const s of streets.streets) {
    const n = s.bands.length;
    const intervals = s.axis === "x" ? colsOf : rowsOf;
    for (let k = 0; k < n; k++) {
      if (s.bands[k] !== "parking") continue;
      const across = s.axis === "x" ? s.across0 + k : s.across0 + n - 1 - k;
      const coordSign = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
      intervals.forEach((iv, alongIdx) => {
        const band: Band = {
          key: `${s.id}|${sideOf(s.axis, coordSign)}|${alongIdx}`,
          s,
          across,
          a0: iv.first,
          a1: iv.first + iv.len,
          yaw: yawToward(s.axis, s.centre_m > (across + 0.5) * TILE_M ? 1 : -1),
          block: blockIdAt(s, coordSign, alongIdx),
        };
        bandList.push(band);
        for (let a = band.a0; a < band.a1; a++) bandOfCell.set(bandCell(band, a), band);
      });
    }
  }

  // ---- sides of blocks, quotas ----
  const unitsById = new Map(mass.units.map((u) => [u.block, u] as const));
  for (const b of blocks) if (!unitsById.has(b.id)) throw new CityStageError(`edge: the mass layer has no units for ${b.id}`);
  const parkBlocks = new Set(land.parks.filter((p) => p.kind === "whole").map((p) => p.block));
  type Block = (typeof blocks)[number];
  const sidesOfBlock = (b: Block): BSide[] => [
    { road: `x:${b.bj}`, side: 1, len: b.i1 - b.i0, neigh: b.bj > 0 ? `block:${b.bi}:${b.bj - 1}` : null },
    { road: `z:${b.bi + 1}`, side: 1, len: b.j1 - b.j0, neigh: b.bi + 1 < blocksX ? `block:${b.bi + 1}:${b.bj}` : null },
    { road: `x:${b.bj + 1}`, side: -1, len: b.i1 - b.i0, neigh: b.bj + 1 < blocksZ ? `block:${b.bi}:${b.bj + 1}` : null },
    { road: `z:${b.bi}`, side: -1, len: b.j1 - b.j0, neigh: b.bi > 0 ? `block:${b.bi - 1}:${b.bj}` : null },
  ];
  const alongOf = (b: Block, road: string): number => (road.startsWith("x:") ? b.bi : b.bj);
  const bandKey = (road: string, side: number, alongIdx: number): string => `${road}|${side}|${alongIdx}`;
  const longestFirst = (p: BSide, q: BSide): number => q.len - p.len || (p.road < q.road ? -1 : p.road > q.road ? 1 : 0);

  // ---- kerbside bays (18.3, 18.6): short runs of `ParkingLines_01` tiles on the sides that have a parking band ----
  const pair = new Uint8Array(W * H); // 1 first cell of a ParkingLines tile, 2 its second
  const states = new Map<string, BandState>();
  for (const band of bandList) {
    if (band.block === "outer" || parkBlocks.has(band.block)) continue; // a whole-block park has no kerb bays of its own (19.6): its band is build-outs
    let sa = 0;
    let sb = 0;
    let a = band.a0 + BAY_JUNCTION_CLEAR;
    const end = band.a1 - BAY_JUNCTION_CLEAR;
    while (a < end) {
      if (blocked.has(bandCell(band, a))) {
        a++;
        continue;
      }
      let e = a;
      while (e < end && !blocked.has(bandCell(band, e))) e++;
      if (e - a > sb - sa) {
        sa = a;
        sb = e;
      }
      a = e;
    }
    // A tile is 10 m of the side's kerb: the side may hold floor(share x length / 10 m) of them.
    states.set(band.key, { band, sa, sb, cap: Math.floor((KERB_BAY_SHARE_MAX[band.s.profile] * (band.a1 - band.a0)) / 2 + 1e-9), runs: [] });
  }
  const gapCells = Math.ceil(KERB_GAP_MIN_M / TILE_M);
  /** Where each run starts (a cell along the street) if the band holds `runs`, or null when they do not fit with `KERB_GAP_MIN_M` between them. One run is centred on the free stretch, offset by hash; several are spread evenly. */
  const startsOf = (st: BandState, runs: readonly (readonly string[])[]): number[] | null => {
    const R = runs.length;
    const need = runs.reduce((n, r) => n + 2 * r.length, 0);
    const slack = st.sb - st.sa - need - gapCells * (R - 1);
    if (slack < 0) return null;
    let lead: number;
    let inner = gapCells;
    if (R === 1) {
      const m = Math.floor(slack / 4);
      lead = Math.floor(slack / 2) + (rand("bay", st.band.key) % (2 * m + 1)) - m;
    } else {
      const g = Math.floor(slack / (R + 1));
      inner += g;
      lead = Math.floor((slack - g * (R - 1)) / 2);
    }
    const out: number[] = [];
    let at = st.sa + lead;
    for (const r of runs) {
      out.push(at);
      at += 2 * r.length + inner;
    }
    return out;
  };
  const kerbTotal_m = blocks.reduce((n, b) => n + 2 * (b.i1 - b.i0 + b.j1 - b.j0) * TILE_M, 0);
  const bayCap = Math.floor((BAYS_PER_100M_MAX * kerbTotal_m) / 100 + 1e-9);
  let bayCount = 0;
  /** One more tile on a band for `serves`: the first run with room grows, else a new run starts; false when the side's cap, the city's cap or the room says no. */
  const tryAdd = (st: BandState, serves: string): boolean => {
    if (st.runs.reduce((n, r) => n + r.length, 0) + 1 > st.cap || bayCount + BAYS_PER_PARKING_TILE > bayCap) return false;
    const options: string[][][] = [];
    const grow = st.runs.findIndex((r) => r.length < BAY_RUN_TILES_MAX);
    if (grow >= 0) options.push(st.runs.map((r, k) => (k === grow ? [...r, serves] : r)));
    options.push([...st.runs, [serves]]);
    for (const o of options) {
      if (startsOf(st, o) === null) continue;
      st.runs = o;
      bayCount += BAYS_PER_PARKING_TILE;
      return true;
    }
    return false;
  };
  const ownStates = (b: Block): BandState[] =>
    sidesOfBlock(b)
      .map((sd) => states.get(bandKey(sd.road, sd.side, alongOf(b, sd.road))))
      .filter((st): st is BandState => st !== undefined);
  /** Own sides first: avenue sides, then longer sides, ties by key. */
  const ownSorted = (b: Block): BandState[] =>
    ownStates(b).sort((p, q) => (p.band.s.profile === "avenue" ? 0 : 1) - (q.band.s.profile === "avenue" ? 0 : 1) || q.band.a1 - q.band.a0 - (p.band.a1 - p.band.a0) || (p.band.key < q.band.key ? -1 : 1));
  /** The band across the street from the side `sd`, when it exists and faces the neighbour. */
  const acrossState = (b: Block, sd: BSide): BandState | undefined => {
    const st = sd.neigh === null ? undefined : states.get(bandKey(sd.road, -sd.side, alongOf(b, sd.road)));
    return st && st.band.block === sd.neigh ? st : undefined;
  };
  // The blocks with the fewest parking sides of their own go first; ties by id.
  const order = blocks.map((b) => ({ b, n: ownStates(b).length })).sort((p, q) => p.n - q.n || (p.b.id < q.b.id ? -1 : p.b.id > q.b.id ? 1 : 0));
  const quota = new Map(order.map(({ b }) => [b.id, Math.max(BAY_TILES_PER_BLOCK_MIN, Math.round((unitsById.get(b.id)!.shops * PARK_PER_SHOP) / BAYS_PER_PARKING_TILE))] as const));

  // The first pass (Josh, 20 Nov 2026, "yes"; option B): every block takes one tile before any takes a second, on its own band, else across its longest street.
  const first = new Map<string, "own" | "across" | null>();
  for (const { b } of order) {
    let f: "own" | "across" | null = null;
    for (const st of ownSorted(b)) {
      if (tryAdd(st, b.id)) {
        f = "own";
        break;
      }
    }
    if (f === null) {
      for (const sd of sidesOfBlock(b).sort(longestFirst)) {
        const st = acrossState(b, sd);
        if (st && tryAdd(st, b.id)) {
          f = "across";
          break;
        }
      }
    }
    first.set(b.id, f);
  }

  // The greedy pass, as 056 laid it, with each block's quota less the tile the first pass gave it.
  const shortTiles = new Map<string, number>();
  for (const { b } of order) {
    const own = ownSorted(b);
    let need = quota.get(b.id)! - (first.get(b.id) === null ? 0 : 1);
    for (let progress = true; need > 0 && progress; ) {
      progress = false;
      for (const st of own) {
        if (need > 0 && tryAdd(st, b.id)) {
          need--;
          progress = true;
        }
      }
    }
    // Still short: the band across its longest street serves it (that band faces the neighbour, and each tile there says whom it serves).
    for (const sd of sidesOfBlock(b).sort(longestFirst)) {
      if (need <= 0) break;
      const st = acrossState(b, sd);
      if (!st) continue;
      while (need > 0 && tryAdd(st, b.id)) need--;
    }
    shortTiles.set(b.id, need);
  }

  const tiles: CityBayTile[] = [];
  const bays: CityKerbBay[] = [];
  for (const st of states.values()) {
    if (st.runs.length === 0) continue;
    const starts = startsOf(st, st.runs)!;
    const s = st.band.s;
    st.runs.forEach((run, ri) => {
      run.forEach((serves, t) => {
        const c0 = starts[ri]! + 2 * t;
        pair[bandCell(st.band, c0)] = 1;
        pair[bandCell(st.band, c0 + 1)] = 2;
        er[bandCell(st.band, c0)] = "parking";
        er[bandCell(st.band, c0 + 1)] = "parking";
        tiles.push({ cells: [cellOf(st.band, c0), cellOf(st.band, c0 + 1)], street: s.id, block: st.band.block, serves });
        for (let k = 0; k < BAYS_PER_PARKING_TILE; k++) {
          const along = (c0 + (k + 0.5) * (2 / BAYS_PER_PARKING_TILE)) * TILE_M;
          const acr = (st.band.across + 0.5) * TILE_M;
          bays.push({
            x_m: s.axis === "x" ? along : acr,
            z_m: s.axis === "x" ? acr : along,
            yaw: st.band.yaw,
            w_m: (2 * TILE_M) / BAYS_PER_PARKING_TILE,
            d_m: TILE_M,
            street: s.id,
            block: st.band.block,
            serves,
          });
        }
      });
    });
  }

  // ---- the rest of the band (18.5): a build-out, pavement level, with a tree on every BUILDOUT_TREE_EVERY-th cell of a stretch (never next to a crossing); the cells in front of a kerb cut and on an edge street's outer side stay plain ----
  const buildoutTrees: CityBuildoutTree[] = [];
  for (const band of bandList) {
    if (band.block === "outer") continue;
    let stretch = 0;
    for (let a = band.a0; a < band.a1; a++) {
      const idx = bandCell(band, a);
      if (pair[idx] !== 0 || blocked.has(idx)) {
        stretch = 0;
        continue;
      }
      er[idx] = "buildout";
      stretch++;
      if (stretch % BUILDOUT_TREE_EVERY === 0 && a >= band.a0 + BAY_JUNCTION_CLEAR && a < band.a1 - BAY_JUNCTION_CLEAR) {
        const along = (a + 0.5) * TILE_M;
        const acr = (band.across + 0.5) * TILE_M;
        buildoutTrees.push({ cell: cellOf(band, a), x_m: band.s.axis === "x" ? along : acr, z_m: band.s.axis === "x" ? acr : along, street: band.s.id });
      }
    }
  }

  // ---- the layer ----
  const cells: CityEdgeCell[] = streets.cells.map((c) => {
    const idx = c.j * W + c.i;
    let faces: string | null = null;
    if (c.role === "parkingPlain") {
      const band = bandOfCell.get(idx);
      if (!band) throw new CityStageError(`edge: the parking-band cell (${c.i}, ${c.j}) of ${c.street ?? "no street"} lies in no block interval`, [{ i: c.i, j: c.j }]);
      faces = band.block;
    }
    return { i: c.i, j: c.j, role: er[idx]!, street: c.street, band: c.band, faces };
  });
  const edgeBlocks: CityEdgeBlock[] = blocks.map((b) => ({ block: b.id, wanted: quota.get(b.id)!, first: first.get(b.id) ?? null, shortTiles: shortTiles.get(b.id) ?? 0 }));
  return { stage: "edge", cells, kerbCuts, tiles, bays, buildoutTrees, blocks: edgeBlocks };
}
