/**
 * Stage 3's planner (ticket 070 C1; grammar rules 3 to 6): every cell of every block is built or a named open use. A court part has ring 1 and ring 2 built, an apron ring, then green with paths; a strip is
 * both rows built; a lane, a plaza, a walk-through and a park are the recorded openings. From C2 a chosen lot site (`sites.ts`) is laid as a drive through both rings with its court (stalls, aisle, the pads beside
 * the aisle's ends), or as a frontage lot, and a part with a drive needs no walk-through. Which sites are chosen, and the units, are `lots.ts`'s. Pure: it reads the street and land layers and its own `rand`.
 *
 * The plaza is `terraceBlockRows`'s rule (town.ts): one part in `PLAZA_ONE_IN`, by hash, takes one corner, if the rows it touches stay long enough. The green's paths are `fillGreen`'s (tilecity.ts).
 */

import type { CityBlock, CityBuiltCell, CityCell, CityLandLayer, CityMassCell, CityMassUse, CityOpening, CityPart, CitySide, CityStreetsLayer } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { stretchProblems } from "./check";
import { APRON_CELLS, BUILT_RINGS, GREEN_SPAN_MAX_CELLS, PARK_EDGE_CELLS, PLAZA_CELLS, PLAZA_ONE_IN, ROW_STRETCH_MIN_CELLS } from "./constants";
import { behindOf, cellKey, columnOfSides, keyOf, openSidesFrom, ringOf, shortSideOf } from "./geometry";
import { cellOnSide, siteCells, type LotSite } from "./sites";

/** A lot site as laid: the id of its opening and its stall and aisle cells (a court's, or a frontage lot's own cells in `stalls`). */
export interface LaidLot {
  readonly site: LotSite;
  readonly opening: string;
  readonly stalls: CityCell[];
  readonly aisle: CityCell[];
}

export interface MassPlan {
  readonly cells: CityMassCell[];
  readonly built: CityBuiltCell[];
  readonly openings: CityOpening[];
  readonly laid: LaidLot[];
}

interface Use {
  readonly use: CityMassUse;
  readonly part: string | null;
  readonly opening: string | null;
}

const byRowMajor = (a: CityCell, b: CityCell): number => a.j - b.j || a.i - b.i;

/**
 * The cells of the paths across a rectangle of green (inclusive corners), as `fillGreen` lays them: one along the longer axis through the middle, and cross paths wherever a row or column of green would run
 * past `GREEN_SPAN_MAX_CELLS`; a park's (`crossing`) also gets one across the shorter axis where the green is at least three cells each way.
 */
export function pathCells(gx0: number, gx1: number, gz0: number, gz1: number, crossing: boolean): Set<string> {
  const path = new Set<string>();
  const nx = gx1 - gx0 + 1;
  const nz = gz1 - gz0 + 1;
  if (nx < 1 || nz < 1) return path;
  const alongX = nx >= nz;
  const len = alongX ? nx : nz;
  const wid = alongX ? nz : nx;
  const cellAt = (a: number, c: number): CityCell => (alongX ? { i: gx0 + a, j: gz0 + c } : { i: gx0 + c, j: gz0 + a });
  const layLine = (kind: "long" | "cross", at: number): void => {
    const n = kind === "long" ? len : wid;
    for (let t = 0; t < n; t++) path.add(cellKey(kind === "long" ? cellAt(t, at) : cellAt(at, t)));
  };
  if (wid >= 2) {
    const mid = Math.floor((wid - 1) / 2);
    for (const c of [mid, mid + 1, mid - 1, mid + 2, mid - 2]) {
      if (c >= 0 && c < wid) {
        layLine("long", c);
        break;
      }
    }
  }
  let crossed = false;
  if (len > GREEN_SPAN_MAX_CELLS) {
    let k = 1;
    while (len - k > GREEN_SPAN_MAX_CELLS * (k + 1)) k++;
    for (let m = 1; m <= k; m++) {
      layLine("cross", Math.min(len - 1, Math.max(0, Math.round((m * (len + 1)) / (k + 1)) - 1)));
      crossed = true;
    }
  }
  if (crossing && !crossed && len >= 3 && wid >= 3) layLine("cross", Math.floor((len - 1) / 2));
  return path;
}

/** The corner cells of a plaza at one of a part's four corners (0: -x -z, 1: +x -z, 2: +x +z, 3: -x +z), and the two sides that meet there. */
function plazaAt(p: CityPart, corner: number): { cells: CityCell[]; sides: [CitySide, CitySide] } {
  const left = corner === 0 || corner === 3;
  const top = corner === 0 || corner === 1;
  const cells: CityCell[] = [];
  for (let dj = 0; dj < PLAZA_CELLS; dj++) for (let di = 0; di < PLAZA_CELLS; di++) cells.push({ i: left ? p.i0 + di : p.i1 - 1 - di, j: top ? p.j0 + dj : p.j1 - 1 - dj });
  return { cells, sides: [left ? "-x" : "+x", top ? "-z" : "+z"] };
}

/** The two cells (ring 1 then ring 2) a walk-through takes at offset `t` along `side` of a part. */
function walkAt(p: CityPart, side: CitySide, t: number): CityCell[] {
  switch (side) {
    case "-z":
      return [{ i: p.i0 + t, j: p.j0 }, { i: p.i0 + t, j: p.j0 + 1 }];
    case "+z":
      return [{ i: p.i0 + t, j: p.j1 - 1 }, { i: p.i0 + t, j: p.j1 - 2 }];
    case "-x":
      return [{ i: p.i0, j: p.j0 + t }, { i: p.i0 + 1, j: p.j0 + t }];
    case "+x":
      return [{ i: p.i1 - 1, j: p.j0 + t }, { i: p.i1 - 2, j: p.j0 + t }];
  }
}

const sideLength = (p: CityPart, side: CitySide): number => (side === "-z" || side === "+z" ? p.i1 - p.i0 : p.j1 - p.j0);

/** The corner plaza of a court part, or none: one part in `PLAZA_ONE_IN` by hash, at a corner where two street edges meet, if the rows it touches stay long enough. */
export function plazaOf(part: CityPart, rand: StageRand): CityCell[] {
  if (part.shape !== "court" || rand("plaza", part.id) % PLAZA_ONE_IN !== 0) return [];
  const cand = plazaAt(part, rand("plazacorner", part.id) % 4);
  if (!cand.sides.every((side) => part.edges[side] === "street")) return [];
  const taken = new Set(cand.cells.map(cellKey));
  return stretchProblems(part, (i, j) => (taken.has(keyOf(i, j)) ? "plaza" : null)).length === 0 ? cand.cells : [];
}

/**
 * Lays every block. Throws `CityStageError` where a rule cannot be met: a block cell no part, lane or park covers (G3), a cell with opposite open sides (M3), a lane mouth with no street beyond it, or a court
 * part with an interior and no place for a walk-through (M5). Nothing is patched.
 */
export function planMass(streets: Pick<CityStreetsLayer, "blocks" | "cells">, land: Pick<CityLandLayer, "parts" | "lanes" | "parks">, rand: StageRand, lots: readonly LotSite[] = []): MassPlan {
  const out: MassPlan = { cells: [], built: [], openings: [], laid: [] };
  const group = <T extends { block: string }>(xs: readonly T[]): Map<string, T[]> => {
    const m = new Map<string, T[]>();
    for (const x of xs) {
      const list = m.get(x.block);
      if (list) list.push(x);
      else m.set(x.block, [x]);
    }
    return m;
  };
  const lotsOf = new Map<string, LotSite[]>();
  for (const l of lots) {
    const list = lotsOf.get(l.part);
    if (list) list.push(l);
    else lotsOf.set(l.part, [l]);
  }
  const lanesOf = group(land.lanes);
  const parksOf = group(land.parks);
  const partsOf = group(land.parts);
  const partById = new Map(land.parts.map((x) => [x.id, x] as const));
  const streetAt = new Map(streets.cells.map((c) => [keyOf(c.i, c.j), c.street] as const));

  for (const b of streets.blocks) {
    const uses = new Map<string, Use>();
    const put = (i: number, j: number, use: CityMassUse, part: string | null, opening: string | null): void => {
      const k = keyOf(i, j);
      if (uses.has(k)) throw new CityStageError(`G3: cell (${i}, ${j}) of ${b.id} is laid twice`, [{ i, j }]);
      uses.set(k, { use, part, opening });
    };
    const open = (id: string, kind: CityOpening["kind"], cells: CityCell[], mouth: CityOpening["mouth"]): void => {
      out.openings.push({ id, kind, block: b.id, cells: [...cells].sort(byRowMajor), mouth });
    };

    // lanes: one cell wide from street to street; two openings each, one per mouth, so each mouth is recorded with its own street
    for (const l of (lanesOf.get(b.id) ?? [])) {
      const cells: CityCell[] = [];
      if (l.axis === "z") for (let j = b.j0; j < b.j1; j++) cells.push({ i: l.at, j });
      else for (let i = b.i0; i < b.i1; i++) cells.push({ i, j: l.at });
      if (cells.length < 2) throw new CityStageError(`M5: the lane of ${b.id} is ${cells.length} cell long`, cells);
      const first = cells[0]!;
      const last = cells[cells.length - 1]!;
      const before = l.axis === "z" ? { i: first.i, j: first.j - 1 } : { i: first.i - 1, j: first.j };
      const after = l.axis === "z" ? { i: last.i, j: last.j + 1 } : { i: last.i + 1, j: last.j };
      const streetOf = (c: CityCell): string => {
        const s = streetAt.get(cellKey(c));
        if (!s) throw new CityStageError(`M5: the lane of ${b.id} has no street beyond its mouth at (${c.i}, ${c.j})`, [c]);
        return s;
      };
      const half = Math.floor(cells.length / 2);
      const ids = [`${b.id}/lane/a`, `${b.id}/lane/b`];
      cells.forEach((c, n) => put(c.i, c.j, n === 0 || n === cells.length - 1 ? "laneMouth" : "lane", null, n < half ? ids[0]! : ids[1]!));
      open(ids[0]!, "lane", cells.slice(0, half), { street: streetOf(before), cells: [first] });
      open(ids[1]!, "lane", cells.slice(half), { street: streetOf(after), cells: [last] });
    }

    // parks: the pavement edge round the park, green with crossing paths inside it
    for (const p of (parksOf.get(b.id) ?? [])) {
      const id = `${b.id}/park`;
      const path = pathCells(p.i0 + PARK_EDGE_CELLS, p.i1 - 1 - PARK_EDGE_CELLS, p.j0 + PARK_EDGE_CELLS, p.j1 - 1 - PARK_EDGE_CELLS, true);
      const cells: CityCell[] = [];
      for (let j = p.j0; j < p.j1; j++) {
        for (let i = p.i0; i < p.i1; i++) {
          const edge = Math.min(i - p.i0, p.i1 - 1 - i, j - p.j0, p.j1 - 1 - j) < PARK_EDGE_CELLS;
          put(i, j, edge ? "parkEdge" : path.has(keyOf(i, j)) ? "greenPath" : "green", null, id);
          cells.push({ i, j });
        }
      }
      open(id, "park", cells, null);
    }

    // parts: rings 1 and 2 built, the apron, the green; a corner plaza and a walk-through are laid first
    for (const part of (partsOf.get(b.id) ?? [])) {
      const s = shortSideOf(part);
      const court = s >= 6;
      const taken = new Map<string, "plaza" | "walk">();
      const openingAt = (i: number, j: number): string | null => taken.get(keyOf(i, j)) ?? null;
      const plaza = court ? plazaOf(part, rand) : [];
      for (const c of plaza) taken.set(cellKey(c), "plaza");
      let walk: CityCell[] = [];
      // the lots chosen for this part: each is a drive (or a frontage lot) through both rings, with its court behind it
      const mine = lotsOf.get(part.id) ?? [];
      const driveAt = new Map<string, { use: "drive" | "frontLot"; opening: string }>();
      const courtAt = new Map<string, "stalls" | "aisle">();
      const padAt = new Set<string>();
      const laidHere: LaidLot[] = [];
      mine.forEach((site, n) => {
        const cells = siteCells(part, site.side, site.t, site.kind);
        const id = `${part.id}/${site.kind === "court" ? "drive" : "lot"}/${n}`;
        for (const c of cells.drive) driveAt.set(cellKey(c), { use: site.kind === "court" ? "drive" : "frontLot", opening: id });
        for (const c of cells.stalls) courtAt.set(cellKey(c), "stalls");
        for (const c of cells.aisle) courtAt.set(cellKey(c), "aisle");
        for (const c of cells.pads) padAt.add(cellKey(c));
        // a drive onto a street has that street as its mouth, on the building line; one onto a lane has none (the lane's own mouths are cut)
        let mouth: CityOpening["mouth"] = null;
        if (part.edges[site.side] === "street") {
          const beyond = cellOnSide(part, site.side, site.t, -1);
          const street = streetAt.get(cellKey(beyond));
          if (!street) throw new CityStageError(`M5: the ${site.kind} of ${part.id} has no street beyond its mouth at (${beyond.i}, ${beyond.j})`, [beyond]);
          mouth = { street, cells: cells.drive.slice(0, 2).map((c) => ({ i: c.i, j: c.j })) };
        }
        open(id, site.kind === "court" ? "drive" : "frontLot", cells.drive, mouth);
        laidHere.push({ site, opening: id, stalls: site.kind === "court" ? cells.stalls : cells.drive, aisle: cells.aisle });
      });
      out.laid.push(...laidHere);
      if (court && mine.length === 0 && !Object.values(part.edges).includes("lane")) {
        // an interior with no lane and no drive gets one walk-through, one cell wide through both rings, where every row stretch stays at least one building long (and the walk is not at a row's end)
        const options: CityCell[][] = [];
        for (const side of ["-z", "+x", "+z", "-x"] as const) {
          const len = sideLength(part, side);
          for (let t = ROW_STRETCH_MIN_CELLS; t <= len - 1 - ROW_STRETCH_MIN_CELLS; t++) {
            const cells = walkAt(part, side, t);
            for (const c of cells) taken.set(cellKey(c), "walk");
            if (stretchProblems(part, openingAt).length === 0) options.push(cells);
            for (const c of cells) taken.delete(cellKey(c));
          }
        }
        if (options.length === 0) throw new CityStageError(`M5: part ${part.id} has an interior and no place for a walk-through (every row stretch must stay 2 cells or more)`, [{ i: part.i0, j: part.j0 }]);
        walk = options[rand("walk", part.id) % options.length]!;
      }
      const plazaId = `${part.id}/plaza`;
      const walkId = `${part.id}/walk`;
      const inPlaza = new Set(plaza.map(cellKey));
      const inWalk = new Set(walk.map(cellKey));
      const path = court ? pathCells(part.i0 + BUILT_RINGS + APRON_CELLS, part.i1 - 1 - BUILT_RINGS - APRON_CELLS, part.j0 + BUILT_RINGS + APRON_CELLS, part.j1 - 1 - BUILT_RINGS - APRON_CELLS, false) : new Set<string>();
      for (let j = part.j0; j < part.j1; j++) {
        for (let i = part.i0; i < part.i1; i++) {
          const k = keyOf(i, j);
          const ring = ringOf(part, i, j);
          const drive = driveAt.get(k);
          if (inPlaza.has(k)) put(i, j, "plaza", part.id, plazaId);
          else if (inWalk.has(k)) put(i, j, "walk", part.id, walkId);
          else if (drive) put(i, j, drive.use, part.id, drive.opening);
          else if (ring < BUILT_RINGS) put(i, j, "built", part.id, null);
          else if (courtAt.has(k)) put(i, j, courtAt.get(k)!, part.id, null);
          else if (padAt.has(k)) put(i, j, "apron", part.id, null);
          else if (ring < BUILT_RINGS + APRON_CELLS) put(i, j, "apron", part.id, null);
          else put(i, j, path.has(k) ? "greenPath" : "green", part.id, null);
        }
      }
      if (plaza.length > 0) open(plazaId, "plaza", plaza, null);
      if (walk.length > 0) open(walkId, "walk", walk, null);
    }

    // every block cell has a use (G3)
    for (let j = b.j0; j < b.j1; j++) {
      for (let i = b.i0; i < b.i1; i++) if (!uses.has(keyOf(i, j))) throw new CityStageError(`G3: cell (${i}, ${j}) of ${b.id} is in no part, lane or park (a void)`, [{ i, j }]);
    }
    layBlock(b, uses, partById, out);
  }
  return out;
}

/** The block's cells and its built cells' open sides, column kind and partner. */
function layBlock(b: CityBlock, uses: ReadonlyMap<string, Use>, parts: ReadonlyMap<string, CityPart>, out: MassPlan): void {
  const useAt = (i: number, j: number): CityMassUse | undefined => uses.get(keyOf(i, j))?.use;
  const cells: CityMassCell[] = [];
  for (let j = b.j0; j < b.j1; j++) {
    for (let i = b.i0; i < b.i1; i++) {
      const u = uses.get(keyOf(i, j))!;
      cells.push({ i, j, block: b.id, part: u.part, use: u.use, opening: u.opening });
    }
  }
  out.cells.push(...cells);

  interface Raw {
    readonly cell: CityMassCell;
    readonly open: ReturnType<typeof openSidesFrom>;
    readonly column: NonNullable<ReturnType<typeof columnOfSides>>;
    readonly behind: CityCell | null;
  }
  const raws: Raw[] = [];
  for (const c of cells) {
    if (c.use !== "built") continue;
    const open = openSidesFrom(c.i, c.j, useAt);
    const sides = open.map((o) => o.side);
    const column = columnOfSides(sides);
    if (column === null) throw new CityStageError(`M3: cell (${c.i}, ${c.j}) has ${sides.length === 2 ? "opposite" : sides.length} open sides (${sides.join(", ")})`, [{ i: c.i, j: c.j }]);
    const behind = behindOf(c, sides);
    raws.push({ cell: c, open, column, behind: behind !== null && useAt(behind.i, behind.j) === "built" ? behind : null });
  }
  // A blind column backs onto the building whose back faces it: the corner column if there is one (grammar rule 4: a ring-2 corner takes its ring-1 corner's building), else the first in row order.
  const pointers = new Map<string, Raw[]>();
  for (const r of raws) {
    if (r.behind === null) continue;
    const list = pointers.get(cellKey(r.behind));
    if (list) list.push(r);
    else pointers.set(cellKey(r.behind), [r]);
  }
  for (const r of raws) {
    let partner: CityCell | null = r.behind;
    if (r.column === "blind") {
      const ps = pointers.get(cellKey(r.cell)) ?? [];
      const pick = ps.find((q) => q.column === "corner") ?? ps[0];
      partner = pick ? { i: pick.cell.i, j: pick.cell.j } : null;
    }
    out.built.push({ i: r.cell.i, j: r.cell.j, block: b.id, part: r.cell.part!, row: ringOf(parts.get(r.cell.part!)!, r.cell.i, r.cell.j) === 0 ? "outer" : "inner", open: r.open, column: r.column, partner });
  }
}
