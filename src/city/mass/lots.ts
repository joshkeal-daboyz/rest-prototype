/**
 * Stage 3's lots and units (ticket 070 C2; style guide 18.2, 18.4, 18.6 and 19.4, grammar rules 5 and 6): the parking demand of record, and the residents' courts and frontage lots that answer it.
 * `unitsOf`, `lotQuota` and `planLots` are moved from `tilecity.ts` (their quota rounds and the dearer-layout rule are kept) and run on cells, not on terrace runs:
 * - **Units** are counted from the built cells (a column is one cell): shops are the street-frontage outer columns less one door column per street run of up to `TERRACE_BAYS_MAX`; homes are
 *   `floor(columns x UNIT_FLOORS_NOMINAL / HOME_COLUMN_FLOORS)`. A lot takes frontage, so the units of a laid city are a little under the nominal ones: the quotas are asked again of them, until they stand still.
 * - **Lots**: a block wants `clamp(round(homes x PARK_PER_HOME / LOT_STALLS), 1, LOTS_PER_BLOCK_MAX)`. Each is a court behind a 2-cell drive through both rings, a yard court (a part whose yard is 2 deep: a drive and six stalls on the far side), or, where its parts have no room for a court,
 *   a 2 by 2 frontage lot (at most `CITY_FRONT_LOT_BLOCKS_MAX` of the blocks). A part with a lane edge opens its court on the lane where one fits, as 057 G's did. A block that has no room asks the neighbour across its longest street.
 * Pure: it reads the street and land layers and the stage's own `rand`, and keeps nothing between calls.
 */

import type { CityBuiltCell, CityCourt, CityBlockUnits, CityCell, CityLandLayer, CityPlanBlock, CitySide, CityStreetsLayer } from "../../core";

import type { StageRand } from "../pipeline/seeds";
import { CITY_FRONT_LOT_BLOCKS_MAX, HOME_COLUMN_FLOORS, LOTS_PER_BLOCK_MAX, LOT_STALLS, PARK_PER_HOME, TERRACE_BAYS_MAX, UNIT_FLOORS_NOMINAL } from "./constants";
import { cellKey, keyOf } from "./geometry";
import { planMass, plazaOf, type MassPlan } from "./plan";
import { mouthFacesJunction } from "./reach";
import { SIDE_ORDER, cellOnSide, lengthOf, offsetsOf, type LotKind, type LotSite } from "./sites";

type StreetsIn = Pick<CityStreetsLayer, "blocks" | "cells">;
type LandIn = Pick<CityLandLayer, "parts" | "lanes" | "parks">;

export interface Counted {
  readonly columns: number;
  readonly shops: number;
  readonly homes: number;
}

/**
 * What each block holds, counted from its built cells (18.2 on 5 m cells). A shop is a street-frontage outer ground column that is not its run's door column: a run is the cells in one straight row facing
 * the street (or a plaza or park edge) on one side, and it has one door column per `TERRACE_BAYS_MAX` columns, rounded up. A column that is on two runs (a corner) counts once.
 */
export function unitsOf(plan: { readonly built: readonly CityBuiltCell[] }, blocks: readonly Pick<CityPlanBlock, "id">[]): Map<string, Counted> {
  const byBlock = new Map<string, CityBuiltCell[]>();
  for (const b of plan.built) {
    const list = byBlock.get(b.block);
    if (list) list.push(b);
    else byBlock.set(b.block, [b]);
  }
  const out = new Map<string, Counted>();
  for (const blk of blocks) {
    const built = byBlock.get(blk.id) ?? [];
    const runs = new Map<string, number[]>();
    const eligible = new Set<string>();
    for (const b of built) {
      if (b.row !== "outer") continue;
      for (const o of b.open) {
        if (o.frontage !== "street") continue;
        eligible.add(cellKey(b));
        const key = `${o.side}|${o.side === "-z" || o.side === "+z" ? b.j : b.i}`;
        const along = o.side === "-z" || o.side === "+z" ? b.i : b.j;
        const list = runs.get(key);
        if (list) list.push(along);
        else runs.set(key, [along]);
      }
    }
    let doors = 0;
    for (const alongs of runs.values()) {
      alongs.sort((p, q) => p - q);
      let start = 0;
      for (let k = 1; k <= alongs.length; k++) {
        if (k === alongs.length || alongs[k] !== alongs[k - 1]! + 1) {
          doors += Math.ceil((k - start) / TERRACE_BAYS_MAX);
          start = k;
        }
      }
    }
    out.set(blk.id, { columns: built.length, shops: Math.max(0, eligible.size - doors), homes: Math.floor((built.length * UNIT_FLOORS_NOMINAL) / HOME_COLUMN_FLOORS) });
  }
  return out;
}

/** A block wants clamp(round(homes x PARK_PER_HOME / LOT_STALLS), 1, LOTS_PER_BLOCK_MAX) lots (18.4). */
export const lotQuota = (homes: number): number => Math.min(LOTS_PER_BLOCK_MAX, Math.max(1, Math.round((homes * PARK_PER_HOME) / LOT_STALLS)));

export interface MassBuild {
  readonly plan: MassPlan;
  readonly courts: CityCourt[];
  readonly units: CityBlockUnits[];
}

const sideLen = (b: CityPlanBlock, side: CitySide): number => (side === "-z" || side === "+z" ? b.i1 - b.i0 : b.j1 - b.j0);
/** The blocks across `side` of `b`, the longest shared stretch first, ties by id (a block shares a street with each; none at the city's edge). */
const acrossOrder = (b: CityPlanBlock, side: CitySide): string[] =>
  [...b.sides[side].across].sort((p, q) => q.span.hi - q.span.lo - (p.span.hi - p.span.lo) || (p.block < q.block ? -1 : p.block > q.block ? 1 : 0)).map((a) => a.block);
/** Runs within 5 cells of each other in length are as good as each other; among them the first by id (a plain rule: no tuned number). */
const bucket = (len: number): number => Math.floor(len / 5);

/**
 * Lays the whole mass: the rings, the openings, the lots and the units. The lot sites are chosen by quota (`planLots` below) and the layout is asked again of the units it leaves, as 056 did, until the quotas stand still.
 * Throws `CityStageError` where a rule cannot be met (`planMass`'s own failures). `s6` is true except in the report test, which lays the city without S6 to count the mouths S6 moved.
 */
export function buildMass(streets: StreetsIn, land: LandIn, rand: StageRand, s6 = true): MassBuild {
  const blocks = streets.blocks;
  const blockById = new Map(blocks.map((b) => [b.id, b] as const));
  const partsOf = new Map<string, CityLandLayer["parts"][number][]>();
  for (const p of land.parts) {
    if (p.shape !== "court") continue;
    const list = partsOf.get(p.block);
    if (list) list.push(p);
    else partsOf.set(p.block, [p]);
  }
  const plazas = new Map(land.parts.map((p) => [p.id, plazaOf(p, rand)] as const));
  const roleAt = new Map<string, string>(streets.cells.map((c) => [keyOf(c.i, c.j), c.role] as const));
  const frontMax = Math.ceil(blocks.length * CITY_FRONT_LOT_BLOCKS_MAX - 1e-9);

  /** Whether the cell two out from a drive's mouth is a parking band: a lot's kerb cut takes two cells of the band, so a side without one is preferred (18.4). */
  const parkedAt = (p: CityLandLayer["parts"][number], side: CitySide, t: number): number => (roleAt.get(cellKey(cellOnSide(p, side, t, -2))) === "parkingPlain" ? 1 : 0);

  function planLots(wanted: ReadonlyMap<string, number>): LotSite[] {
    const sites: LotSite[] = [];
    const chosen = new Map<string, LotSite[]>();
    const hosted = new Map<string, number>();
    const served = new Map<string, number>();
    const frontBlocks = new Set<string>();
    const add = (s: LotSite): void => {
      sites.push(s);
      const list = chosen.get(s.part);
      if (list) list.push(s);
      else chosen.set(s.part, [s]);
      hosted.set(s.block, (hosted.get(s.block) ?? 0) + 1);
      served.set(s.serves, (served.get(s.serves) ?? 0) + 1);
      if (s.kind === "frontLot") frontBlocks.add(s.block);
    };

    // A part with a lane edge opens its court on the lane where one fits (057 G; the drive costs no street frontage). Where none fits it is planned like any other part, and never throws for want of one.
    for (const p of land.parts) {
      if (p.shape !== "court" || !SIDE_ORDER.some((s) => p.edges[s] === "lane")) continue;
      let site: LotSite | null = null;
      for (const kind of ["court", "yard"] as const) {
        for (const side of SIDE_ORDER) {
          if (p.edges[side] !== "lane") continue;
          const opts = offsetsOf(p, plazas.get(p.id)!, [], side, kind);
          if (opts.length > 0) site = { part: p.id, block: p.block, serves: p.block, kind, side, t: opts[rand("lot", p.id, side, kind) % opts.length]! };
          if (site) break;
        }
        if (site) break;
      }
      if (site) add(site);
    }

    const mouthFaces = (host: CityPlanBlock, p: CityLandLayer["parts"][number], side: CitySide, t: number): boolean => s6 && [0, 1].some((k) => mouthFacesJunction(host, side, cellOnSide(p, side, t + k, 0)));
    /** The best site in `host` for a lot that counts toward `serves`: a court first, a frontage lot only where no court fits and the city's share of them allows. */
    const pick = (host: CityPlanBlock, serves: string): LotSite | null => {
      for (const kind of ["court", "yard", "frontLot"] as LotKind[]) {
        if (kind === "frontLot" && !frontBlocks.has(host.id) && frontBlocks.size >= frontMax) break;
        let best: { rank: readonly [number, number]; site: LotSite } | null = null;
        for (const p of partsOf.get(host.id) ?? []) {
          const existing = chosen.get(p.id) ?? [];
          for (const side of SIDE_ORDER) {
            if (p.edges[side] !== "street") continue;
            // S6: a drive or frontage lot onto a street keeps both mouth cells off the junction-facing stretches of the side, widened (a lane-side drive is not offered here, so not judged)
            const opts = offsetsOf(p, plazas.get(p.id)!, existing, side, kind).filter((o) => !mouthFaces(host, p, side, o));
            if (opts.length === 0) continue;
            const t = opts[rand("lot", p.id, side, kind, existing.length) % opts.length]!;
            const rank = [parkedAt(p, side, t), -bucket(lengthOf(p, side))] as const;
            if (best === null || rank[0] < best.rank[0] || (rank[0] === best.rank[0] && rank[1] < best.rank[1])) best = { rank, site: { part: p.id, block: host.id, serves, kind, side, t } };
          }
        }
        if (best) return best.site;
      }
      return null;
    };

    for (let guard = 0; guard < 16; guard++) {
      let moved = false;
      for (const b of blocks) {
        if ((served.get(b.id) ?? 0) >= (wanted.get(b.id) ?? 0) || (hosted.get(b.id) ?? 0) >= LOTS_PER_BLOCK_MAX) continue;
        const s = pick(b, b.id);
        if (s) {
          add(s);
          moved = true;
        }
      }
      if (!moved) break;
    }
    // a block with no room, or too few lots, asks the neighbour across its longest street, up to that neighbour's `LOTS_PER_BLOCK_MAX`
    for (let guard = 0; guard < 16; guard++) {
      let moved = false;
      for (const b of blocks) {
        if ((served.get(b.id) ?? 0) >= (wanted.get(b.id) ?? 0)) continue;
        const sides = [...SIDE_ORDER].sort((p, q) => sideLen(b, q) - sideLen(b, p));
        search: for (const side of sides) {
          for (const id of acrossOrder(b, side)) {
            const n = blockById.get(id);
            if (!n || (hosted.get(n.id) ?? 0) >= LOTS_PER_BLOCK_MAX) continue;
            const s = pick(n, b.id);
            if (!s) continue;
            add(s);
            moved = true;
            break search;
          }
        }
      }
      if (!moved) break;
    }
    return sites;
  }

  const lay = (sites: readonly LotSite[]): MassPlan => planMass(streets, land, rand, sites);
  const quotas = (plan: MassPlan): { units: Map<string, Counted>; wanted: Map<string, number> } => {
    const units = unitsOf(plan, blocks);
    return { units, wanted: new Map(blocks.map((b) => [b.id, lotQuota(units.get(b.id)!.homes)] as const)) };
  };

  // The rows start without a lot, and a lot takes frontage, so the units of the finished layout are a little under the nominal ones: the quotas are asked again of those until they stand still (at most a few times).
  let { wanted } = quotas(lay([]));
  let sites = planLots(wanted);
  let plan = lay(sites);
  let now = quotas(plan);
  for (let round = 0; round < 3; round++) {
    if (blocks.every((b) => now.wanted.get(b.id) === wanted.get(b.id))) break;
    wanted = now.wanted;
    sites = planLots(wanted);
    plan = lay(sites);
    now = quotas(plan);
  }
  // A block at the edge of a quota can flip: one lot leaves it 61 homes (a quota of 2), two leave it 55 (a quota of 1). Where the quotas have not stood still, the dearer layout wins: each block is asked for the larger of its last ask and its quota now.
  if (blocks.some((b) => now.wanted.get(b.id) !== wanted.get(b.id))) {
    wanted = new Map(blocks.map((b) => [b.id, Math.max(wanted.get(b.id)!, now.wanted.get(b.id)!)] as const));
    sites = planLots(wanted);
    plan = lay(sites);
    now = quotas(plan);
  }
  // the quotas the finished layout's units call for: where a round did not settle, the shortfall is measured against these
  const finalWanted = now.wanted;

  const cellsOf = (cs: readonly CityCell[]): CityCell[] => cs.map((c) => ({ i: c.i, j: c.j })).sort((p, q) => p.j - q.j || p.i - q.i);
  const courts: CityCourt[] = plan.laid.map((l) => ({ block: l.site.block, serves: l.site.serves, opening: l.opening, stallCells: cellsOf(l.stalls), aisleCells: cellsOf(l.aisle), stalls: LOT_STALLS }));
  const servedBy = new Map<string, number>();
  for (const c of courts) servedBy.set(c.serves, (servedBy.get(c.serves) ?? 0) + 1);
  const units: CityBlockUnits[] = blocks.map((b) => {
    const u = now.units.get(b.id)!;
    const lots = servedBy.get(b.id) ?? 0;
    return { block: b.id, columns: u.columns, shops: u.shops, homes: u.homes, lotsWanted: finalWanted.get(b.id)!, lots, stallsShort: Math.max(0, finalWanted.get(b.id)! - lots) * LOT_STALLS };
  });
  return { plan, courts, units };
}
