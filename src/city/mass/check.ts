/**
 * Stage 3's checks, run on the layer (ticket 070 C1): M3 (the face rule), M4b (pairs), M5 (openings), G2 (every block side's back edge), G3 (no void) and R1 (the continuous frontage share). They read
 * the layer's cells, the land layer's parts and the street layer's blocks, never the code that laid them, so a layer with a cell missing or an opening unrecorded fails here. Pure.
 *
 * G3 and R1 are ported from `interiorMetrics` (`src/render3d/frontage.ts`) and the R1 share of `cityMetrics` (`citymetrics.ts`) onto cells, with their thresholds: G3 allowed 1% of a block (and no
 * square over 1 m) left unfilled, and on 5 m cells any unused cell is a 5 m square, so none is allowed; R1's floor is `TILE_CITY_R1_MIN`.
 */

import type { CityBlock, CityCell, CityLandLayer, CityMassCell, CityMassLayer, CityMassUse, CityPart } from "../../core";
import { CITY_FRONT_LOT_BLOCKS_MAX, LOTS_PER_BLOCK_MAX, PARK_PER_HOME, PARK_SUPPLY_BAND, ROW_STRETCH_MIN_CELLS, SHORT_BLOCKS_ONE_IN, TILE_CITY_R1_MIN } from "./constants";
import { DELTA, SIDES, behindOf, cellKey, columnOfSides, keyOf, openSidesFrom, ringOf, shortSideOf } from "./geometry";

export type MassCheckId = "M3" | "M4b" | "M5" | "G2" | "G3" | "R1" | "P2";

export interface MassFailure {
  readonly id: MassCheckId;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

type LandParts = Pick<CityLandLayer, "parts" | "lanes" | "parks">;

/**
 * The row stretches of a court part's two outer rings that are shorter than `ROW_STRETCH_MIN_CELLS` (grammar rule 6: between two openings, and between an opening and a corner, a row is at least one
 * building long), as the cell at the fault. A row is one side of ring 1 (every cell along the part's edge, corners included) or of ring 2 (the cells from one ring-2 corner to the other, included).
 * An opening that starts at the row's own end (a plaza in the corner) leaves no stretch there; an empty stretch between two openings is a fault. `openingAt` gives the id of the opening a cell belongs to, or null for a built cell; the cells of one opening are one break.
 */
export function stretchProblems(p: Pick<CityPart, "i0" | "i1" | "j0" | "j1">, openingAt: (i: number, j: number) => string | null): CityCell[] {
  const out: CityCell[] = [];
  for (const r of [0, 1]) {
    const rows: CityCell[][] = [[], [], [], []];
    for (let i = p.i0 + r; i <= p.i1 - 1 - r; i++) {
      rows[0]!.push({ i, j: p.j0 + r });
      rows[1]!.push({ i, j: p.j1 - 1 - r });
    }
    for (let j = p.j0 + r; j <= p.j1 - 1 - r; j++) {
      rows[2]!.push({ i: p.i0 + r, j });
      rows[3]!.push({ i: p.i1 - 1 - r, j });
    }
    for (const row of rows) {
      let run = 0;
      let prev: string | null = null;
      for (let k = 0; k <= row.length; k++) {
        const id = k < row.length ? openingAt(row[k]!.i, row[k]!.j) : "end";
        if (id === null) {
          run++;
          prev = null;
          continue;
        }
        // an opening (or the row end) closes the run behind it
        if (run > 0 && run < ROW_STRETCH_MIN_CELLS) out.push(row[k - 1]!);
        else if (run === 0 && prev !== null && id !== "end" && id !== prev) out.push(row[k]!);
        run = 0;
        prev = id;
      }
    }
  }
  return out;
}

interface Index {
  readonly byKey: ReadonlyMap<string, CityMassCell>;
  readonly useAt: (i: number, j: number) => CityMassUse | undefined;
}

function indexOf(mass: Pick<CityMassLayer, "cells">): Index {
  const byKey = new Map<string, CityMassCell>();
  for (const c of mass.cells) byKey.set(keyOf(c.i, c.j), c);
  return { byKey, useAt: (i, j) => byKey.get(keyOf(i, j))?.use };
}

/** G3: every block cell has exactly one use, and no cell lies outside a block. Ported from `interiorMetrics` onto cells. */
function checkG3(mass: CityMassLayer, blocks: readonly CityBlock[], out: MassFailure[]): void {
  const seen = new Map<string, number>();
  for (const c of mass.cells) seen.set(keyOf(c.i, c.j), (seen.get(keyOf(c.i, c.j)) ?? 0) + 1);
  const inBlock = new Set<string>();
  for (const b of blocks) {
    for (let j = b.j0; j < b.j1; j++) {
      for (let i = b.i0; i < b.i1; i++) {
        inBlock.add(keyOf(i, j));
        const n = seen.get(keyOf(i, j)) ?? 0;
        if (n === 0) out.push({ id: "G3", reason: `G3: cell (${i}, ${j}) of ${b.id} has no use (a void)`, cells: [{ i, j }] });
        else if (n > 1) out.push({ id: "G3", reason: `G3: cell (${i}, ${j}) of ${b.id} has ${n} uses`, cells: [{ i, j }] });
      }
    }
  }
  for (const c of mass.cells) if (!inBlock.has(keyOf(c.i, c.j))) out.push({ id: "G3", reason: `G3: cell (${c.i}, ${c.j}) is not in any block`, cells: [{ i: c.i, j: c.j }] });
}

/** M3: every built cell's open sides are 0, 1 or 2 adjacent; its record (open sides, faces, column kind) is what its neighbours say. */
function checkM3(mass: CityMassLayer, ix: Index, out: MassFailure[]): void {
  const recorded = new Set<string>();
  for (const b of mass.built) {
    recorded.add(keyOf(b.i, b.j));
    if (ix.useAt(b.i, b.j) !== "built") {
      out.push({ id: "M3", reason: `M3: built record (${b.i}, ${b.j}) is not a built cell`, cells: [b] });
      continue;
    }
    const open = openSidesFrom(b.i, b.j, ix.useAt);
    const sides = open.map((o) => o.side);
    const kind = columnOfSides(sides);
    if (kind === null) {
      out.push({ id: "M3", reason: `M3: cell (${b.i}, ${b.j}) has ${sides.length === 2 ? "opposite" : sides.length} open sides (${sides.join(", ")})`, cells: [b] });
      continue;
    }
    if (JSON.stringify(open) !== JSON.stringify(b.open)) out.push({ id: "M3", reason: `M3: cell (${b.i}, ${b.j}) records open sides ${JSON.stringify(b.open)} but its neighbours give ${JSON.stringify(open)}`, cells: [b] });
    else if (b.column !== kind) out.push({ id: "M3", reason: `M3: cell (${b.i}, ${b.j}) is recorded ${b.column} but its open sides make it ${kind}`, cells: [b] });
  }
  for (const c of mass.cells) if (c.use === "built" && !recorded.has(keyOf(c.i, c.j))) out.push({ id: "M3", reason: `M3: built cell (${c.i}, ${c.j}) has no record`, cells: [c] });
}

/** M4b: every outer column has a partner, or a recorded opening, behind it; no part is 3 to 5 deep (its ring 2 would be shared by two rows). */
function checkM4b(mass: CityMassLayer, ix: Index, land: LandParts, out: MassFailure[]): void {
  const openingIds = new Set(mass.openings.map((o) => o.id));
  const partById = new Map(land.parts.map((x) => [x.id, x] as const));
  for (const p of land.parts) {
    const s = shortSideOf(p);
    if (s !== 2 && s < 6) out.push({ id: "M4b", reason: `M4b: part ${p.id} is ${s} deep: its ring 2 would be shared by two rows (2, or 6 and more)`, cells: [{ i: p.i0, j: p.j0 }] });
  }
  for (const b of mass.built) {
    const p = partById.get(b.part);
    if (!p) {
      out.push({ id: "M4b", reason: `M4b: cell (${b.i}, ${b.j}) names part ${b.part}, which the land layer does not have`, cells: [b] });
      continue;
    }
    if (b.row !== "outer") continue;
    const behind = behindOf(b, b.open.map((o) => o.side));
    if (behind === null) {
      out.push({ id: "M4b", reason: `M4b: outer cell (${b.i}, ${b.j}) has no open side to stand behind`, cells: [b] });
      continue;
    }
    const there = ix.byKey.get(cellKey(behind));
    if (there && there.use === "built") {
      if (!b.partner || b.partner.i !== behind.i || b.partner.j !== behind.j) out.push({ id: "M4b", reason: `M4b: outer cell (${b.i}, ${b.j}) has a built cell behind it at (${behind.i}, ${behind.j}) but no partner`, cells: [b] });
      else if (there.part !== b.part) out.push({ id: "M4b", reason: `M4b: outer cell (${b.i}, ${b.j}) stands back to back with a cell of another part`, cells: [b] });
    } else if (!there || there.opening === null || !openingIds.has(there.opening)) {
      out.push({ id: "M4b", reason: `M4b: outer cell (${b.i}, ${b.j}) has neither a partner nor a recorded opening behind it at (${behind.i}, ${behind.j})`, cells: [b] });
    }
  }
}

/** The kinds of cell each opening holds, and whether it has a mouth (a vehicle enters it and the kerb turns in). */
const OPENING_SHAPE: Readonly<Record<string, { uses: readonly CityMassUse[]; mouth: boolean }>> = {
  lane: { uses: ["lane", "laneMouth"], mouth: true },
  drive: { uses: ["drive"], mouth: true },
  frontLot: { uses: ["frontLot"], mouth: true },
  plaza: { uses: ["plaza"], mouth: false },
  park: { uses: ["parkEdge", "green", "greenPath"], mouth: false },
  walk: { uses: ["walk"], mouth: false },
};

/** M5: every open cell of the two outer rings is in a recorded opening of rule 6's table, shaped as the table says; no row stretch of one cell; every interior touches an opening. */
function checkM5(mass: CityMassLayer, ix: Index, land: LandParts, out: MassFailure[]): void {
  const recorded = new Map(mass.openings.map((o) => [o.id, o] as const));
  const partById = new Map(land.parts.map((x) => [x.id, x] as const));
  if (recorded.size !== mass.openings.length) out.push({ id: "M5", reason: "M5: two openings share an id", cells: [] });
  for (const o of mass.openings) {
    const shape = OPENING_SHAPE[o.kind];
    if (!shape) {
      out.push({ id: "M5", reason: `M5: opening ${o.id} has kind ${o.kind}, which rule 6's table does not have`, cells: o.cells });
      continue;
    }
    if (o.cells.length === 0) {
      out.push({ id: "M5", reason: `M5: opening ${o.id} has no cells`, cells: [] });
      continue;
    }
    for (const c of o.cells) {
      const m = ix.byKey.get(cellKey(c));
      if (!m || m.opening !== o.id || !shape.uses.includes(m.use)) out.push({ id: "M5", reason: `M5: opening ${o.id} (${o.kind}) names cell (${c.i}, ${c.j}), which is not its own ${shape.uses.join(" or ")} cell`, cells: [c] });
    }
    // a lane has two mouths (one at each end); a drive or frontage lot onto a street has that street as its one mouth; one onto a lane has none (the lane's own two mouths are cut)
    const onLane = (o.kind === "drive" || o.kind === "frontLot") && o.cells.some((c) => SIDES.some((s) => { const u = ix.useAt(c.i + DELTA[s][0], c.j + DELTA[s][1]); return u === "lane" || u === "laneMouth"; }));
    const wantsMouth = shape.mouth && !onLane;
    const mouths = o.kind === "lane" ? 2 : wantsMouth ? 1 : 0;
    if (o.mouth.length !== mouths) out.push({ id: "M5", reason: `M5: opening ${o.id} (${o.kind}) ${mouths === 0 ? "has a mouth, but the kerb runs straight past it" : o.mouth.length === 0 ? "has no mouth" : `has ${o.mouth.length} mouths, not ${mouths}`}`, cells: o.cells });
    const is = o.cells.map((c) => c.i);
    const js = o.cells.map((c) => c.j);
    const w = Math.max(...is) - Math.min(...is) + 1;
    const h = Math.max(...js) - Math.min(...js) + 1;
    if (o.kind !== "park" && w * h !== o.cells.length) out.push({ id: "M5", reason: `M5: opening ${o.id} (${o.kind}) is not a whole rectangle of cells`, cells: o.cells });
    if (o.kind === "plaza" && !(w === 2 && h === 2)) out.push({ id: "M5", reason: `M5: plaza ${o.id} is ${w} by ${h} cells, not 2 by 2`, cells: o.cells });
    if ((o.kind === "lane" || o.kind === "walk") && Math.min(w, h) !== 1) out.push({ id: "M5", reason: `M5: ${o.kind} ${o.id} is ${w} by ${h} cells, not one cell wide`, cells: o.cells });
  }
  // every open cell of the two outer rings, every lane cell and every park cell belongs to a recorded opening
  for (const c of mass.cells) {
    if (c.use === "built") continue;
    const p = c.part === null ? undefined : partById.get(c.part);
    const mustBeOpening = c.part === null || (p !== undefined && ringOf(p, c.i, c.j) < 2) || c.use === "plaza" || c.use === "walk" || c.use === "drive" || c.use === "frontLot";
    if (!mustBeOpening) continue;
    if (c.opening === null || !recorded.has(c.opening)) out.push({ id: "M5", reason: `M5: cell (${c.i}, ${c.j}) is open (${c.use}) but no recorded opening owns it`, cells: [c] });
  }
  for (const p of land.parts) {
    if (shortSideOf(p) < 6) continue;
    // no row stretch of fewer than one building
    for (const c of stretchProblems(p, (i, j) => { const m = ix.byKey.get(keyOf(i, j)); return m === undefined || m.use === "built" ? null : (m.opening ?? m.use); })) out.push({ id: "M5", reason: `M5: a row of part ${p.id} has a stretch of fewer than ${ROW_STRETCH_MIN_CELLS} cells at (${c.i}, ${c.j})`, cells: [c] });
    // every interior touches an opening: a walk-through, or a drive (a court's, which opens on a street or on the part's lane); a frontage lot is parking, not a way in
    const interior: CityCell[] = [];
    for (let j = p.j0; j < p.j1; j++) for (let i = p.i0; i < p.i1; i++) if (ringOf(p, i, j) >= 2) interior.push({ i, j });
    if (interior.length === 0) continue;
    const touches = interior.some((c) =>
      SIDES.some((s) => {
        const u = ix.useAt(c.i + DELTA[s][0], c.j + DELTA[s][1]);
        return u === "walk" || u === "drive";
      }),
    );
    if (!touches) out.push({ id: "M5", reason: `M5: the interior of part ${p.id} touches no opening`, cells: [interior[0]!] });
  }
}

/** G2: every block side's back edge (the block cells next to the street) is built or a recorded opening. */
function checkG2(mass: CityMassLayer, ix: Index, blocks: readonly CityBlock[], out: MassFailure[]): void {
  const recorded = new Set(mass.openings.map((o) => o.id));
  for (const b of blocks) {
    for (let j = b.j0; j < b.j1; j++) {
      for (let i = b.i0; i < b.i1; i++) {
        if (i !== b.i0 && i !== b.i1 - 1 && j !== b.j0 && j !== b.j1 - 1) continue;
        const c = ix.byKey.get(keyOf(i, j));
        if (!c || c.use === "built") continue; // a missing cell is G3's
        if (c.opening === null || !recorded.has(c.opening)) out.push({ id: "G2", reason: `G2: the back edge of ${b.id} at (${i}, ${j}) is neither built nor a recorded opening`, cells: [{ i, j }] });
      }
    }
  }
}

export interface ParkingNumbers {
  readonly blocks: number;
  readonly homes: number;
  /** Stalls the homes call for: homes x `PARK_PER_HOME`. */
  readonly stallDemand: number;
  /** Stalls laid, in courts and frontage lots. */
  readonly lotStalls: number;
  /** Blocks that hold, or are served by, more than `LOTS_PER_BLOCK_MAX` lots. */
  readonly blocksOverLots: number;
  /** Stalls whose host block is neither the block they serve nor next to it across one street. */
  readonly stallServedFar: number;
  /** Blocks that wanted lots and got fewer, or that no lot serves. */
  readonly shortBlocks: number;
  /** Blocks that kept a frontage lot because their court did not fit. */
  readonly frontLotBlocks: number;
}

/** The numbers P2 counts, from the layer alone (ported from `parkingMetrics` in `src/render3d/parkmetrics.ts`). */
export function parkingNumbers(mass: Pick<CityMassLayer, "courts" | "units" | "openings">, blocks: readonly CityBlock[]): ParkingNumbers {
  const at = new Map(blocks.map((b) => [b.id, b] as const));
  const adjacent = (a: string, b: string): boolean => {
    if (a === b) return true;
    const p = at.get(a);
    const q = at.get(b);
    return p !== undefined && q !== undefined && Math.abs(p.bi - q.bi) + Math.abs(p.bj - q.bj) === 1;
  };
  const kindOf = new Map(mass.openings.map((o) => [o.id, o.kind] as const));
  const serving = new Map<string, number>();
  const held = new Map<string, number>();
  const front = new Set<string>();
  let stallServedFar = 0;
  let lotStalls = 0;
  for (const c of mass.courts) {
    serving.set(c.serves, (serving.get(c.serves) ?? 0) + 1);
    held.set(c.block, (held.get(c.block) ?? 0) + 1);
    lotStalls += c.stalls;
    if (!adjacent(c.block, c.serves)) stallServedFar += c.stalls;
    if (kindOf.get(c.opening) === "frontLot") front.add(c.block);
  }
  let blocksOverLots = 0;
  let shortBlocks = 0;
  for (const b of blocks) {
    if ((serving.get(b.id) ?? 0) > LOTS_PER_BLOCK_MAX || (held.get(b.id) ?? 0) > LOTS_PER_BLOCK_MAX) blocksOverLots++;
  }
  for (const u of mass.units) if (u.stallsShort > 0 || (serving.get(u.block) ?? 0) === 0) shortBlocks++;
  const homes = mass.units.reduce((n, u) => n + u.homes, 0);
  return { blocks: blocks.length, homes, stallDemand: homes * PARK_PER_HOME, lotStalls, blocksOverLots, stallServedFar, shortBlocks, frontLotBlocks: front.size };
}

/** P2's value (0 holds): lot stalls in the band of the demand, no block over its lots, no stall served far, few blocks short, few frontage lots. Same terms and thresholds as `evaluateParking`. */
export function p2Value(m: ParkingNumbers): number {
  const inBand = m.stallDemand <= 0 || (m.lotStalls >= PARK_SUPPLY_BAND.lo * m.stallDemand - 1e-9 && m.lotStalls <= PARK_SUPPLY_BAND.hi * m.stallDemand + 1e-9);
  return (inBand ? 0 : 1) + m.blocksOverLots + m.stallServedFar + Math.max(0, m.shortBlocks - Math.ceil(m.blocks / SHORT_BLOCKS_ONE_IN)) + Math.max(0, m.frontLotBlocks - Math.ceil(m.blocks * CITY_FRONT_LOT_BLOCKS_MAX - 1e-9));
}

function checkP2(mass: CityMassLayer, blocks: readonly CityBlock[], out: MassFailure[]): void {
  const m = parkingNumbers(mass, blocks);
  const v = p2Value(m);
  if (v > 0) {
    out.push({
      id: "P2",
      reason: `P2: ${v} fault(s): ${m.lotStalls} stalls laid for ${m.stallDemand.toFixed(1)} wanted (band ${PARK_SUPPLY_BAND.lo} to ${PARK_SUPPLY_BAND.hi}), ${m.blocksOverLots} blocks over ${LOTS_PER_BLOCK_MAX} lots, ${m.stallServedFar} stalls served far, ${m.shortBlocks} blocks short, ${m.frontLotBlocks} frontage-lot blocks`,
      cells: [],
    });
  }
}

export interface FrontageShare {
  readonly built: number;
  readonly total: number;
  readonly share: number;
}

/**
 * R1 on cells: of the block cells that stand on a street (a street cell beside them) and are not a park's, the share that is built. Every other cell there is an opening (a plaza, a lane mouth, a walk-through,
 * a drive): all count as uncovered, which is stricter than the old figure (`frontageCovered`: building widths over widths plus far gaps, with plazas and lots left out of the span). 1 with nothing to count.
 */
export function frontageShare(mass: Pick<CityMassLayer, "cells">): FrontageShare {
  const inside = new Set(mass.cells.map((c) => keyOf(c.i, c.j)));
  let built = 0;
  let total = 0;
  for (const c of mass.cells) {
    if (c.use === "parkEdge" || c.use === "green" || c.use === "greenPath") continue;
    if (SIDES.every((s) => inside.has(keyOf(c.i + DELTA[s][0], c.j + DELTA[s][1])))) continue;
    total++;
    if (c.use === "built") built++;
  }
  return { built, total, share: total === 0 ? 1 : built / total };
}

function checkR1(mass: CityMassLayer, out: MassFailure[]): void {
  const f = frontageShare(mass);
  if (f.share < TILE_CITY_R1_MIN - 1e-9) out.push({ id: "R1", reason: `R1: ${f.built} of ${f.total} frontage cells are built (${f.share.toFixed(3)}), under ${TILE_CITY_R1_MIN}`, cells: [] });
}

/** Every failure of the seven checks on a mass layer, in the order M3, M4b, M5, G2, G3, R1, P2. Empty when the layer passes. */
export function massFailures(mass: CityMassLayer, blocks: readonly CityBlock[], land: LandParts): MassFailure[] {
  const ix = indexOf(mass);
  const out: MassFailure[] = [];
  checkM3(mass, ix, out);
  checkM4b(mass, ix, land, out);
  checkM5(mass, ix, land, out);
  checkG2(mass, ix, blocks, out);
  checkG3(mass, blocks, out);
  checkR1(mass, out);
  checkP2(mass, blocks, out);
  return out;
}
