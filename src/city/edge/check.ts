/**
 * Stage 4's parking checks P1, P3, P4, P5 and P6 (ticket 070 D1), ported from `src/render3d/parkmetrics.ts` onto the edge layer with every threshold unchanged. They are read from the layer's cells, tiles and bays,
 * never from the code that laid them. P2 is stage 3's (lots). Every verdict's `value` is the number of violations (0 passes), except P6's, which is the bays per 100 m of block kerb (it passes at `BAYS_PER_100M_MAX` or fewer).
 */

import type { CityEdgeLayer, CityEdgeRole, CityLandLayer, CityMassLayer, CityPlanOptions, CityStreetsLayer } from "../../core";
import type { EdgeFailure } from "./kerbcheck";
import { BAYS_PER_100M_MAX, BAYS_PER_PARKING_TILE, BAY_JUNCTION_CLEAR, BAY_RUN_TILES_MAX, BAY_TILES_PER_BLOCK_MIN, BUILDOUT_TREE_EVERY, KERB_BAY_SHARE_MAX, KERB_GAP_MIN_M, PARK_PER_SHOP, PARK_SUPPLY_BAND, TILE_M } from "./constants";

export type EdgeCheckId = "P1" | "P3" | "P4" | "P5" | "P6";

/** What each check allows: 0 violations, and for P6 the most bays per 100 m of block kerb. */
export const EDGE_CHECK: Readonly<Record<EdgeCheckId, number>> = { P1: 0, P3: 0, P4: 0, P5: 0, P6: BAYS_PER_100M_MAX };

export interface EdgeMetrics {
  blocks: number;
  kerbBays: number;
  /** The shops of every block (`mass.units`) and the bays they call for: shops x `PARK_PER_SHOP`. */
  shops: number;
  bayDemand: number;
  /** Blocks with fewer than `BAY_TILES_PER_BLOCK_MIN` tiles of bays serving them. */
  blocksWithoutBays: number;
  /** Bays that serve a block that is neither the block they stand at nor next to it across one street. */
  bayServedFar: number;
  sideShares: { street: string; block: string; share: number; cap: number }[];
  /** Bays on the outside of an edge street. */
  outerBays: number;
  runs: number[];
  gaps: number[];
  bayNextToCrossing: number;
  badBandCells: number;
  badTrees: number;
  kerbMetres: number;
  bays100m: number;
}

const CROSSING_ROLES: readonly (CityEdgeRole | null)[] = ["crossing", "junction", "pavementCorner"];

/** Measures an edge layer against the parking rules. Pure. */
export function edgeMetrics(edge: CityEdgeLayer, streets: CityStreetsLayer, mass: CityMassLayer, options: Pick<CityPlanOptions, "blocksX" | "blocksZ">): EdgeMetrics {
  const W = streets.w;
  const H = streets.h;
  const role: (CityEdgeRole | null)[] = new Array<CityEdgeRole | null>(W * H).fill(null);
  for (const c of edge.cells) role[c.j * W + c.i] = c.role;
  const at = (i: number, j: number): CityEdgeRole | null => (i < 0 || j < 0 || i >= W || j >= H ? null : (role[j * W + i] ?? null));
  const streetOf = new Map(streets.streets.map((s) => [s.id, s] as const));
  const blockOf = new Map(streets.blocks.map((b) => [b.id, b] as const));

  const shops = mass.units.reduce((n, u) => n + u.shops, 0);

  // ---- who the bays serve ----
  const adjacent = (a: string, b: string): boolean => {
    if (a === b) return true;
    // two blocks are adjacent when one lists the other across a street, in any side's `across` (D1b)
    const lists = (x: string, y: string): boolean => Object.values(blockOf.get(x)?.sides ?? {}).some((side) => side.across.some((e) => e.block === y));
    return lists(a, b) || lists(b, a);
  };
  const baysServing = new Map<string, number>();
  let bayServedFar = 0;
  let outerBays = 0;
  for (const b of edge.bays) {
    baysServing.set(b.serves, (baysServing.get(b.serves) ?? 0) + 1);
    if (b.block === "outer") outerBays++;
    else if (!adjacent(b.block, b.serves)) bayServedFar++;
  }
  let blocksWithoutBays = 0;
  for (const b of streets.blocks) if ((baysServing.get(b.id) ?? 0) < BAY_TILES_PER_BLOCK_MIN * BAYS_PER_PARKING_TILE) blocksWithoutBays++;

  // ---- the share of each side's kerb that is bay ----
  const bayLen = new Map<string, number>();
  for (const b of edge.bays) {
    if (b.block === "outer") continue;
    const k = `${b.street}|${b.block}`;
    bayLen.set(k, (bayLen.get(k) ?? 0) + b.w_m);
  }
  const sideShares: EdgeMetrics["sideShares"] = [];
  for (const [k, len] of bayLen) {
    const [street, block] = k.split("|") as [string, string];
    const s = streetOf.get(street)!;
    const b = blockOf.get(block)!;
    // the block side's own length along the street: one cap for the whole side, shared by its stretches (D1b)
    const side = Object.values(b.sides).find((sd) => sd.street === street);
    const kerb = (side ? side.span.hi - side.span.lo : s.axis === "x" ? b.i1 - b.i0 : b.j1 - b.j0) * TILE_M;
    sideShares.push({ street, block, share: len / kerb, cap: KERB_BAY_SHARE_MAX[s.profile] });
  }

  // ---- runs, gaps and the cells next to crossings, from the tiles ----
  const bands = new Map<string, number[]>();
  let bayNextToCrossing = 0;
  for (const t of edge.tiles) {
    const s = streetOf.get(t.street)!;
    const x = s.axis === "x";
    const c = t.cells[0];
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

  // ---- the band: every parking-band cell is half a tile, a plain cell in front of a kerb cut or on an outer side, or a build-out; and the trees ----
  let badBandCells = 0;
  const wantTrees = new Set<string>();
  const keyOf = (x: number, z: number): string => `${Math.round(x * 1000)},${Math.round(z * 1000)}`;
  // The scan runs only over each street's own span and its own cells (D1b): a street that ends in a T has a lattice line that runs on past the junction, into other streets' pavements and lanes.
  const ownBand = new Map<number, { street: string; band: number }>();
  for (const c of streets.cells) if (c.street !== null && c.band >= 0) ownBand.set(c.j * W + c.i, { street: c.street, band: c.band });
  for (const s of streets.streets) {
    const n = s.bands.length;
    const x = s.axis === "x";
    for (let k = 0; k < n; k++) {
      if (s.bands[k] !== "parking") continue;
      const across = x ? s.across0 + k : s.across0 + n - 1 - k;
      const out = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
      const outer = s.outer !== null && (s.outer[0] === "+" ? 1 : -1) === out;
      const own = (a: number): boolean => {
        const o = ownBand.get(x ? across * W + a : a * W + across);
        return o !== undefined && o.street === s.id && o.band === k;
      };
      const nextToCrossing = (a: number): boolean => {
        const r = x ? at(a, across) : at(across, a);
        return !own(a) || CROSSING_ROLES.includes(r);
      };
      let stretch = 0;
      for (let a = s.span.lo; a < s.span.hi; a++) {
        if (!own(a)) {
          stretch = 0;
          continue;
        }
        const r = x ? at(a, across) : at(across, a);
        if (r === "buildout") {
          stretch++;
          if (stretch % BUILDOUT_TREE_EVERY === 0 && !nextToCrossing(a - 1) && !nextToCrossing(a + 1)) wantTrees.add(keyOf(x ? (a + 0.5) * TILE_M : (across + 0.5) * TILE_M, x ? (across + 0.5) * TILE_M : (a + 0.5) * TILE_M));
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
  // A parking cell belongs to exactly one tile, and every tile's two cells are parking cells.
  const tileCells = new Set<string>();
  for (const t of edge.tiles) {
    for (const c of t.cells) {
      tileCells.add(`${c.i},${c.j}`);
      if (at(c.i, c.j) !== "parking") badBandCells++;
    }
  }
  for (const c of edge.cells) if (c.role === "parking" && !tileCells.has(`${c.i},${c.j}`)) badBandCells++;
  const haveTrees = new Set(edge.buildoutTrees.map((t) => keyOf(t.x_m, t.z_m)));
  let badTrees = Math.abs(edge.buildoutTrees.length - haveTrees.size);
  for (const t of wantTrees) if (!haveTrees.has(t)) badTrees++;
  for (const t of haveTrees) if (!wantTrees.has(t)) badTrees++;

  const kerbMetres = streets.blocks.reduce((n, b) => n + 2 * (b.i1 - b.i0 + b.j1 - b.j0) * TILE_M, 0);
  return {
    blocks: streets.blocks.length,
    kerbBays: edge.bays.length,
    shops,
    bayDemand: shops * PARK_PER_SHOP,
    blocksWithoutBays,
    bayServedFar,
    sideShares,
    outerBays,
    runs,
    gaps,
    bayNextToCrossing,
    badBandCells,
    badTrees,
    kerbMetres,
    bays100m: kerbMetres > 0 ? (edge.bays.length / kerbMetres) * 100 : 0,
  };
}

/** Whether the city's kerb bays lie in the supply band of the demand (P1's city-wide term). */
export function supplyInBand(m: Pick<EdgeMetrics, "kerbBays" | "bayDemand">): boolean {
  return m.bayDemand <= 0 || (m.kerbBays >= PARK_SUPPLY_BAND.lo * m.bayDemand - 1e-9 && m.kerbBays <= PARK_SUPPLY_BAND.hi * m.bayDemand + 1e-9);
}

/** Bays over the demand, the figure the supply band holds between `PARK_SUPPLY_BAND.lo` and `.hi`. */
export function supplyOverDemand(m: Pick<EdgeMetrics, "kerbBays" | "bayDemand">): number {
  return m.bayDemand > 0 ? m.kerbBays / m.bayDemand : 1;
}

/** One verdict per check. */
export function edgeVerdicts(m: EdgeMetrics): { id: EdgeCheckId; value: number; pass: boolean }[] {
  const p1 = (supplyInBand(m) ? 0 : 1) + m.blocksWithoutBays + m.bayServedFar;
  const p3 = m.sideShares.filter((s) => s.share > s.cap + 1e-9).length + m.outerBays;
  const p4 = m.runs.filter((t) => t > BAY_RUN_TILES_MAX).length + m.gaps.filter((g) => g < KERB_GAP_MIN_M - 1e-9).length + m.bayNextToCrossing;
  const p5 = m.badBandCells + m.badTrees;
  const item = (id: EdgeCheckId, value: number, pass: boolean): { id: EdgeCheckId; value: number; pass: boolean } => ({ id, value, pass });
  return [
    item("P1", p1, p1 <= EDGE_CHECK.P1),
    item("P3", p3, p3 <= EDGE_CHECK.P3),
    item("P4", p4, p4 <= EDGE_CHECK.P4),
    item("P5", p5, p5 <= EDGE_CHECK.P5),
    item("P6", m.bays100m, m.bays100m <= EDGE_CHECK.P6 + 1e-9),
  ];
}

/** The failing checks of a layer, each naming the rule, for the stage to throw on (R-2). Empty when every check holds. */
export function edgeFailures(edge: CityEdgeLayer, streets: CityStreetsLayer, mass: CityMassLayer, options: Pick<CityPlanOptions, "blocksX" | "blocksZ">, shortBlocksOk = false): { id: EdgeCheckId; reason: string }[] {
  const m = edgeMetrics(edge, streets, mass, options);
  const out: { id: EdgeCheckId; reason: string }[] = [];
  for (const v of edgeVerdicts(m)) {
    if (v.pass) continue;
    // D1 criterion 2: a block left with too few tiles is recorded in the layer, not thrown on; P1's other terms (supply band, far-served bays) still fail the stage.
    // The supply-band term is let go only when supply is under the band AND a block is recorded short: that shortfall is the same one, seen city-wide. Over the band, or under it with nothing recorded short, still throws.
    if (v.id === "P1" && shortBlocksOk) {
      const recordedShort = edge.blocks.some((b) => b.shortTiles > 0);
      const lowBecauseShort = recordedShort && !supplyInBand(m) && m.kerbBays < PARK_SUPPLY_BAND.lo * m.bayDemand;
      if (v.value - m.blocksWithoutBays - (lowBecauseShort ? 1 : 0) <= EDGE_CHECK.P1) continue;
    }
    const why =
      v.id === "P1"
        ? `${m.blocksWithoutBays} blocks with no kerb tile, ${m.bayServedFar} bays serving a far block, supply ${m.kerbBays} bays against a demand of ${m.bayDemand.toFixed(1)}`
        : v.id === "P6"
          ? `${v.value.toFixed(2)} bays per 100 m of block kerb, at most ${BAYS_PER_100M_MAX}`
          : `${v.value} violations`;
    out.push({ id: v.id, reason: `${v.id}: ${why}` });
  }
  return out;
}

/**
 * G4 on the layer (ticket 070 D2, criterion 6): every court touches its opening (the opening's cells are the court's stall or aisle cells, or share an edge with one); every mouth cell of every vehicle opening has its kerb cut
 * (a cut in front of it, naming the opening); each of a lane's two ends has its cut, and every lane of the land layer has its opening. Empty when it holds.
 */
export function g4Failures(edge: CityEdgeLayer, mass: CityMassLayer, land: CityLandLayer): EdgeFailure[] {
  const out: EdgeFailure[] = [];
  const fail = (reason: string): void => {
    if (out.length < 40) out.push({ id: "G4", reason: `G4: ${reason}` });
  };
  const key = (c: { i: number; j: number }): string => `${c.i},${c.j}`;
  const openings = new Map(mass.openings.map((o) => [o.id, o] as const));
  for (const court of mass.courts) {
    const o = openings.get(court.opening);
    if (o === undefined) {
      fail(`the court of ${court.block} names the opening ${court.opening}, which the mass layer does not have`);
      continue;
    }
    const mine = new Set([...court.stallCells, ...court.aisleCells].map(key));
    const touches = o.cells.some((c) => mine.has(key(c)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => mine.has(key({ i: c.i + di!, j: c.j + dj! }))));
    if (!touches) fail(`the court of ${court.block} does not touch its opening ${court.opening}`);
  }
  const cutsOf = new Map<string, Set<string>>();
  for (const k of edge.kerbCuts) {
    const s = cutsOf.get(k.opening) ?? new Set<string>();
    s.add(`${key(k.cell)}|${k.street}`);
    cutsOf.set(k.opening, s);
  }
  for (const o of mass.openings) {
    for (const m of o.mouth) {
      for (const c of m.cells) {
        const cuts = cutsOf.get(o.id) ?? new Set<string>();
        const has = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => cuts.has(`${c.i + di!},${c.j + dj!}|${m.street}`));
        if (!has) fail(`the mouth cell (${c.i}, ${c.j}) of ${o.id} has no kerb cut`);
      }
    }
    if (o.kind === "lane" && o.mouth.length !== 2) fail(`the lane ${o.id} has ${o.mouth.length} ends with a cut, not two`);
  }
  const laneOpenings = new Map<string, number>();
  for (const o of mass.openings) if (o.kind === "lane") laneOpenings.set(o.block, (laneOpenings.get(o.block) ?? 0) + 1);
  const lanes = new Map<string, number>();
  for (const l of land.lanes) lanes.set(l.block, (lanes.get(l.block) ?? 0) + 1);
  for (const [block, n] of lanes) if ((laneOpenings.get(block) ?? 0) !== n) fail(`${block} has ${n} lanes in the land layer and ${laneOpenings.get(block) ?? 0} lane openings`);
  return out;
}
