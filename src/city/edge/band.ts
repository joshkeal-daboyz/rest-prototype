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
  CitySide,
  CityStreet,
  CityStreetsLayer,
  CityYaw,
} from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { BAYS_PER_100M_MAX, BAYS_PER_PARKING_TILE, BAY_JUNCTION_CLEAR, BAY_RUN_TILES_MAX, BAY_TILES_PER_BLOCK_MIN, BUILDOUT_TREE_EVERY, KERB_BAY_SHARE_MAX, KERB_GAP_MIN_M, PARK_PER_SHOP, TILE_M } from "./constants";

/** A block side's cap on kerb tiles, shared by every stretch (band) on that side (Josh, 20 Nov 2026, D1b: "1. yes"). */
interface SideCap {
  cap: number;
  count: number;
}

/** One parking band of one street along one stretch of a block side (the side's `span`, or one `across` entry's span): where kerbside bays, build-outs and plain cells lie. */
interface Band {
  /** `<block>|<side>|<entry>`: the block it faces, which of its four sides, and the index of its `across` entry (0 for a side with none). */
  key: string;
  s: CityStreet;
  /** The band's row (an "x" street) or column (a "z" street). */
  across: number;
  /** The stretch's first cell along the street and one past its last: the first and last cells are next to a crossing or a junction. */
  a0: number;
  a1: number;
  yaw: CityYaw;
  /** The block the band faces. */
  block: string;
}

/** A band with its free stretch, the cap of its block side, and the runs laid so far (each tile names the block it serves). */
interface BandState {
  band: Band;
  sa: number;
  sb: number;
  side: SideCap;
  runs: string[][];
}

/** One stretch of one side of a block: its street, its side, its entry, the side's length in cells and the block across the street along it (null at the city's edge). */
interface BSide {
  road: string;
  name: CitySide;
  entry: number;
  len: number;
  neigh: string | null;
}

/**
 * The first pass's best fit (Josh, 20 Nov 2026: "yes", lever M): `candidates[b]` lists block b's band states in preference order, `stateCap[s]` is the first tiles state s can hold, `stateSide[s]` its side, `sideCap[t]` the tiles
 * the side holds in all. Blocks are taken in index order; each takes its first candidate with room, else an augmenting chain moves blocks already matched to others of their candidates, so the number matched never falls.
 * Returns each block's state, or null. A maximum matching under the capacities.
 */
export function bestFit(candidates: readonly (readonly number[])[], stateCap: readonly number[], stateSide: readonly number[], sideCap: readonly number[]): (number | null)[] {
  const B = candidates.length;
  const S = stateCap.length;
  const T = sideCap.length;
  const sink = B + S + T;
  const to: number[] = [];
  const cap: number[] = [];
  const adj: number[][] = Array.from({ length: sink + 1 }, () => []);
  const edge = (u: number, v: number, c: number): number => {
    const e = to.length;
    to.push(v, u);
    cap.push(c, 0);
    adj[u]!.push(e);
    adj[v]!.push(e + 1);
    return e;
  };
  const blockEdges: [number, number][][] = candidates.map((cs, b) => cs.map((s) => [s, edge(b, B + s, 1)] as [number, number]));
  const stateEdge = stateCap.map((c, s) => edge(B + s, B + S + stateSide[s]!, c));
  const sideEdge = sideCap.map((c, t) => edge(B + S + t, sink, c));
  const seen = new Uint8Array(sink + 1);
  const dfs = (u: number): boolean => {
    if (u === sink) return true;
    seen[u] = 1;
    for (const e of adj[u]!) {
      if (cap[e]! > 0 && !seen[to[e]!] && dfs(to[e]!)) {
        cap[e]!--;
        cap[e ^ 1]!++;
        return true;
      }
    }
    return false;
  };
  for (let b = 0; b < B; b++) {
    // the first candidate with room takes the block directly
    let done = false;
    for (const [s, e] of blockEdges[b]!) {
      if (cap[stateEdge[s]!]! > 0 && cap[sideEdge[stateSide[s]!]!]! > 0) {
        cap[e]!--;
        cap[e ^ 1]!++;
        cap[stateEdge[s]!]!--;
        cap[stateEdge[s]! ^ 1]!++;
        const se = sideEdge[stateSide[s]!]!;
        cap[se]!--;
        cap[se ^ 1]!++;
        done = true;
        break;
      }
    }
    if (done) continue;
    seen.fill(0);
    dfs(b);
  }
  return blockEdges.map((es) => es.find(([, e]) => cap[e] === 0)?.[0] ?? null);
}


const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const yawToward = (axis: "x" | "z", sign: number): CityYaw => (axis === "x" ? (sign > 0 ? 0 : 180) : sign > 0 ? 90 : 270);
const sideOf = (axis: "x" | "z", coordSign: number): 1 | -1 => ((axis === "x" ? coordSign : -coordSign) > 0 ? 1 : -1);

const SIDE_NAMES: readonly CitySide[] = ["-z", "+x", "+z", "-x"];
/** Lays the street edge from the three layers before it. Throws `CityStageError` where a mouth has no street cell to cut or a street cell has no band. */
export function buildEdge(streets: CityStreetsLayer, land: CityLandLayer, mass: CityMassLayer, _options: CityPlanOptions, rand: StageRand): CityEdgeLayer {
  const W = streets.w;
  const H = streets.h;
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

  // ---- the bands: one per (block side, `across` entry), on the parking row next to the block's pavement, only where the street has a parking band on the block's side ----
  const blocks = streets.blocks;
  const streetById = new Map(streets.streets.map((s) => [s.id, s] as const));
  const blockById = new Map(blocks.map((b) => [b.id, b] as const));
  /** A street's parking band that faces `sign` (+1 towards the higher coordinate across the street, -1 the lower), or null. */
  const parkingRow = (s: CityStreet, sign: 1 | -1): { across: number; yaw: CityYaw } | null => {
    const n = s.bands.length;
    for (let k = 0; k < n; k++) {
      if (s.bands[k] !== "parking") continue;
      const across = s.axis === "x" ? s.across0 + k : s.across0 + n - 1 - k;
      const out = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
      if (out === sign) return { across, yaw: yawToward(s.axis, s.centre_m > (across + 0.5) * TILE_M ? 1 : -1) };
    }
    return null;
  };
  const bandCell = (b: Band, a: number): number => (b.s.axis === "x" ? b.across * W + a : a * W + b.across);
  const cellOf = (b: Band, a: number): CityCell => (b.s.axis === "x" ? { i: a, j: b.across } : { i: b.across, j: a });
  const bandOfCell = new Map<number, { block: string }>();
  const bandList: Band[] = [];
  const sideCaps = new Map<string, SideCap>();
  /** The stretches of every block, in the old order of its sides, one per `across` entry (one for a side with none). */
  const stretchesOf = new Map<string, BSide[]>();
  for (const b of blocks) {
    const list: BSide[] = [];
    for (const name of SIDE_NAMES) {
      const side = b.sides[name];
      const s = streetById.get(side.street);
      if (!s) throw new CityStageError(`edge: ${b.id}'s ${name} side names street ${side.street}, which the streets layer does not have`);
      const len = side.span.hi - side.span.lo;
      const row = parkingRow(s, name[0] === "-" ? 1 : -1);
      const entries = side.across.length === 0 ? [{ block: null as string | null, span: side.span }] : side.across.map((e) => ({ block: e.block as string | null, span: e.span }));
      entries.forEach((e, k) => {
        list.push({ road: s.id, name, entry: k, len, neigh: e.block });
        if (row === null) return;
        const band: Band = { key: `${b.id}|${name}|${k}`, s, across: row.across, a0: e.span.lo, a1: e.span.hi, yaw: row.yaw, block: b.id };
        bandList.push(band);
        for (let a = band.a0; a < band.a1; a++) bandOfCell.set(bandCell(band, a), band);
      });
      if (row !== null) sideCaps.set(`${b.id}|${name}`, { cap: Math.floor((KERB_BAY_SHARE_MAX[s.profile] * len) / 2 + 1e-9), count: 0 });
    }
    stretchesOf.set(b.id, list);
  }
  // The outer side of an edge street: its parking cells stay plain and face "outer" (`CityPlanStreet.outer`); no band state.
  const OUTER = { block: "outer" };
  for (const s of streets.streets) {
    if (s.outer === null) continue;
    const row = parkingRow(s, s.outer[0] === "+" ? 1 : -1);
    if (row === null) continue;
    for (let a = s.span.lo; a < s.span.hi; a++) bandOfCell.set(s.axis === "x" ? row.across * W + a : a * W + row.across, OUTER);
  }

  // ---- sides of blocks, quotas ----
  const unitsById = new Map(mass.units.map((u) => [u.block, u] as const));
  for (const b of blocks) if (!unitsById.has(b.id)) throw new CityStageError(`edge: the mass layer has no units for ${b.id}`);
  const parkBlocks = new Set(land.parks.filter((p) => p.kind === "whole").map((p) => p.block));
  type Block = (typeof blocks)[number];
  const sidesOfBlock = (b: Block): BSide[] => stretchesOf.get(b.id)!;
  const bandKey = (id: string, name: CitySide, entry: number): string => `${id}|${name}|${entry}`;
  const longestFirst = (p: BSide, q: BSide): number => q.len - p.len || (p.road < q.road ? -1 : p.road > q.road ? 1 : 0) || p.entry - q.entry;

  // ---- kerbside bays (18.3, 18.6): short runs of `ParkingLines_01` tiles on the sides that have a parking band ----
  const pair = new Uint8Array(W * H); // 1 first cell of a ParkingLines tile, 2 its second
  const states = new Map<string, BandState>();
  /** A whole park's own bands: only the first pass uses them (PB, Josh, 20 Nov 2026: "yes, yes"). */
  const parkStates = new Map<string, BandState>();
  for (const band of bandList) {
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
    // A tile is 10 m of the side's kerb: the side may hold floor(share x length / 10 m) of them, over all its stretches.
    const [id, name] = band.key.split("|") as [string, CitySide];
    const st: BandState = { band, sa, sb, side: sideCaps.get(`${id}|${name}`)!, runs: [] };
    (parkBlocks.has(band.block) ? parkStates : states).set(band.key, st);
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
  /** How many tiles the band's free stretch holds at most, runs of at most `BAY_RUN_TILES_MAX` with `KERB_GAP_MIN_M` between them (the room `startsOf` allows), before any cap. */
  const roomTiles = (st: BandState): number => {
    let n = 0;
    for (;;) {
      const runs = Math.ceil((n + 1) / BAY_RUN_TILES_MAX);
      if (2 * (n + 1) + gapCells * (runs - 1) > st.sb - st.sa) return n;
      n++;
    }
  };
  const kerbTotal_m = blocks.reduce((n, b) => n + 2 * (b.i1 - b.i0 + b.j1 - b.j0) * TILE_M, 0);
  const bayCap = Math.floor((BAYS_PER_100M_MAX * kerbTotal_m) / 100 + 1e-9);
  let bayCount = 0;
  /** One more tile on a band for `serves`: the first run with room grows, else a new run starts; false when the side's cap, the city's cap or the room says no. */
  const tryAdd = (st: BandState, serves: string): boolean => {
    if (st.side.count + 1 > st.side.cap || bayCount + BAYS_PER_PARKING_TILE > bayCap) return false;
    const options: string[][][] = [];
    const grow = st.runs.findIndex((r) => r.length < BAY_RUN_TILES_MAX);
    if (grow >= 0) options.push(st.runs.map((r, k) => (k === grow ? [...r, serves] : r)));
    options.push([...st.runs, [serves]]);
    for (const o of options) {
      if (startsOf(st, o) === null) continue;
      st.runs = o;
      st.side.count++;
      bayCount += BAYS_PER_PARKING_TILE;
      return true;
    }
    return false;
  };
  const ownStates = (b: Block): BandState[] =>
    sidesOfBlock(b)
      .map((sd) => states.get(bandKey(b.id, sd.name, sd.entry)))
      .filter((st): st is BandState => st !== undefined);
  const sideLen = (st: BandState): number => {
    const [id, name] = st.band.key.split("|") as [string, CitySide];
    const side = blockById.get(id)!.sides[name];
    return side.span.hi - side.span.lo;
  };
  /** Own sides first: avenue sides, then longer sides, ties by key. */
  const ownSorted = (b: Block): BandState[] =>
    ownStates(b).sort((p, q) => (p.band.s.profile === "avenue" ? 0 : 1) - (q.band.s.profile === "avenue" ? 0 : 1) || sideLen(q) - sideLen(p) || (p.band.key < q.band.key ? -1 : 1));
  /** The band across the street from the stretch `sd`, when it exists and faces the neighbour: the neighbour's side on the same street that lists this block across. */
  const acrossState = (b: Block, sd: BSide): BandState | undefined => {
    if (sd.neigh === null) return undefined;
    const n = blockById.get(sd.neigh);
    if (!n) return undefined;
    for (const name of SIDE_NAMES) {
      const side = n.sides[name];
      if (side.street !== sd.road) continue;
      const k = side.across.findIndex((e) => e.block === b.id);
      if (k >= 0) return states.get(bandKey(n.id, name, k));
    }
    return undefined;
  };
  // The blocks with the fewest parking sides of their own go first; ties by id.
  const ownSides = (b: Block): number => new Set(sidesOfBlock(b).filter((sd) => states.has(bandKey(b.id, sd.name, sd.entry))).map((sd) => sd.name)).size;
  const order = blocks.map((b) => ({ b, n: ownSides(b) })).sort((p, q) => p.n - q.n || (p.b.id < q.b.id ? -1 : p.b.id > q.b.id ? 1 : 0));
  const quota = new Map(order.map(({ b }) => [b.id, Math.max(BAY_TILES_PER_BLOCK_MIN, Math.round((unitsById.get(b.id)!.shops * PARK_PER_SHOP) / BAYS_PER_PARKING_TILE))] as const));

  // The first pass (Josh, 20 Nov 2026: "yes", option B, and lever M): every block takes one tile before any takes a second, as one best fit over the city. A block's candidates are its own bands, then the bands across its
  // streets, longest first, then (a whole park only, PB: "yes, yes") its own kerb. A block no chain can serve gets none.
  const stateList: BandState[] = [];
  const stateIndex = new Map<BandState, number>();
  const sideIndex = new Map<SideCap, number>();
  const sideCapList: number[] = [];
  const stateSideList: number[] = [];
  const stateCapList: number[] = [];
  const indexOf = (st: BandState): number => {
    let n = stateIndex.get(st);
    if (n === undefined) {
      n = stateList.length;
      stateList.push(st);
      stateIndex.set(st, n);
      let t = sideIndex.get(st.side);
      if (t === undefined) {
        t = sideCapList.length;
        sideCapList.push(st.side.cap);
        sideIndex.set(st.side, t);
      }
      stateSideList.push(t);
      stateCapList.push(Math.min(roomTiles(st), st.side.cap));
    }
    return n;
  };
  const candidates = order.map(({ b }) => {
    const list: BandState[] = [...ownSorted(b)];
    for (const sd of [...sidesOfBlock(b)].sort(longestFirst)) {
      const st = acrossState(b, sd);
      if (st) list.push(st);
    }
    if (parkBlocks.has(b.id)) {
      const own = sidesOfBlock(b)
        .map((sd) => parkStates.get(bandKey(b.id, sd.name, sd.entry)))
        .filter((st): st is BandState => st !== undefined)
        .sort((p, q) => sideLen(q) - sideLen(p) || (p.band.key < q.band.key ? -1 : 1));
      list.push(...own);
    }
    return list.map(indexOf);
  });
  const matched = bestFit(candidates, stateCapList, stateSideList, sideCapList);
  const first = new Map<string, "own" | "across" | null>();
  order.forEach(({ b }, n) => {
    const s = matched[n];
    const st = s === null || s === undefined ? undefined : stateList[s];
    first.set(b.id, st && tryAdd(st, b.id) ? (st.band.block === b.id ? "own" : "across") : null);
  });

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
    for (const sd of [...sidesOfBlock(b)].sort(longestFirst)) {
      if (need <= 0) break;
      const st = acrossState(b, sd);
      if (!st) continue;
      while (need > 0 && tryAdd(st, b.id)) need--;
    }
    shortTiles.set(b.id, need);
  }

  const tiles: CityBayTile[] = [];
  const bays: CityKerbBay[] = [];
  for (const st of [...states.values(), ...parkStates.values()]) {
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
