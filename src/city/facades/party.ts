/**
 * Stage 7, H2b: the party-wall kit placed (ticket 070 H2b; grammar rule 8; readings PW1 to PW6). Where a building stands taller than the building beside or behind it, every storey face of its party wall above the lower roof
 * carries a painted board, two windows or a pipe run. Pure: it reads `mass`, `buildings` and the stage's `rand`; the kit is `partykit.ts`.
 * - **PW1** `partyFaces`: for a built cell C and a side s that is not open, the cell across N is built; a blind column's own front is not a party wall (U1: its windowed front above a lower roof counts as dressed). If N's building has
 *   fewer storeys, C's side s shows storeys N.storeys to C.storeys - 1.
 * - **PW2** a piece's back stands on C's cell edge on side s (C's body plane), with no nudge; its own front is the side's.
 * - **PW3** a face runs from y 3 k to 3 k + 3; the lowest exposed face starts at the top of N's roof piece (3 N.storeys plus its bounds' height). A piece is centred in the room of the faces it covers (so its base is over the lower roof and its top
 *   under C's roof piece's base), and across, centred on the face (two windows at the quarter points, `PARTY_WINDOW_X_M`).
 * - **PW5** the faces are taken in `buildings.buildings` order, each building's columns along the row, the sides in the order "+x", "-x", "+z", "-z", bottom up; by `rand("party", ...)` a kind (board, windows, pipe) among
 *   those with a key that fits and is not the key on the face just before it, then a key of the kind. A pipe covers one face or the two faces of a two-storey step. A face with nothing left fails the stage.
 */

import type { CalibrationKey, CityBuildingsLayer, CityCell, CityMassLayer, CityPlacement, CitySide, CityWallPiece } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { CELL_M } from "./constants";
import { type Ctx, makeCtx } from "./facts";
import { indexOf } from "./hash";
import { PARTY_BOARDS, PARTY_PIPES, PARTY_WINDOW, PARTY_WINDOW_X_M, partyBounds, partyKindOf, roofHeight } from "./partykit";
import { SIDE_VEC, centreOf, keyOf, rotate } from "./place";

const EPS = 1e-9;
const norm = (n: number): number => (n === 0 ? 0 : n);

/** The sides in the order the layer lists them. */
export const PARTY_SIDES: readonly CitySide[] = ["+x", "-x", "+z", "-z"];
/** The turn that brings a piece's own +z onto a side. */
export const YAW_OF_SIDE: Readonly<Record<CitySide, 0 | 90 | 180 | 270>> = { "+z": 0, "+x": 90, "-z": 180, "-x": 270 };

/** Where a wall is: on or against a blind cell ("blind"), across a joint to a cell of another row, an L's leg ("leg"), or across a row joint ("row"). */
export type PartyWhere = "row" | "leg" | "blind";

/** One exposed storey face of a party wall (PW1). */
export interface PartyFace {
  /** The taller building (C's). */
  readonly building: string;
  readonly cell: CityCell;
  readonly side: CitySide;
  /** The storey of the face: 3 k to 3 k + 3. */
  readonly storey: number;
  /** C's building's storeys. */
  readonly storeys: number;
  readonly lowerBuilding: string;
  readonly lowerCell: CityCell;
  readonly lowerStoreys: number;
  /** The key of the lower building's roof piece over N. */
  readonly lowerRoof: CalibrationKey;
  readonly where: PartyWhere;
  /** The bottom of the room on the face: its floor, or the top of the lower roof on the lowest face. */
  readonly lo_m: number;
  /** The top of the face. */
  readonly hi_m: number;
}

/** The faces of a city, and the blind fronts left undressed (U1), each in the layer's order. */
export interface PartyScan {
  readonly faces: readonly PartyFace[];
  readonly u1: readonly PartyFace[];
}

/** PW1 on every built cell. Order: `buildings.buildings`, a building's cells along the row, the sides in `PARTY_SIDES`' order, bottom up. */
export function scanParty(mass: Pick<CityMassLayer, "cells" | "built">, buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">): PartyScan {
  const ctx: Ctx = makeCtx(mass, buildings);
  const faces: PartyFace[] = [];
  const u1: PartyFace[] = [];
  for (const b of buildings.buildings) {
    for (const cell of b.cells) {
      const col = ctx.col.get(keyOf(cell))!;
      const built = ctx.built.get(keyOf(cell));
      if (!built) continue;
      for (const side of PARTY_SIDES) {
        if (built.open.some((o) => o.side === side)) continue;
        const v = SIDE_VEC[side];
        const nCol = ctx.col.get(keyOf({ i: cell.i + v.x, j: cell.j + v.z }));
        if (!nCol) continue;
        const nb = ctx.buildingOf.get(nCol.building);
        if (!nb || nb.storeys >= b.storeys) continue;
        const roof = nCol.pieces[nCol.pieces.length - 1];
        if (!roof || roof.role !== "roof") throw new CityStageError(`PW1: the column (${nCol.i}, ${nCol.j}) has no roof piece`, [nCol]);
        const roofH = roofHeight(roof.placement.key);
        const where: PartyWhere = col.kind === "blind" || nCol.kind === "blind" ? "blind" : nCol.rowId === col.rowId ? "row" : "leg";
        for (let k = nb.storeys; k < b.storeys; k++) {
          const f: PartyFace = {
            building: b.id,
            cell: { i: cell.i, j: cell.j },
            side,
            storey: k,
            storeys: b.storeys,
            lowerBuilding: nb.id,
            lowerCell: { i: nCol.i, j: nCol.j },
            lowerStoreys: nb.storeys,
            lowerRoof: roof.placement.key,
            where,
            lo_m: norm(k === nb.storeys ? 3 * k + roofH : 3 * k),
            hi_m: 3 * (k + 1),
          };
          (col.kind === "blind" && side === col.front ? u1 : faces).push(f);
        }
      }
    }
  }
  return { faces, u1 };
}

/** PW1: every exposed storey face once (a blind column's own front is not one: U1). */
export const partyFaces = (mass: Pick<CityMassLayer, "cells" | "built">, buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">): PartyFace[] => [...scanParty(mass, buildings).faces];

/** True when a kit key fits a room of `room_m` metres in height. */
export const fitsRoom = (key: CalibrationKey, room_m: number): boolean => partyBounds(key).h <= room_m + EPS;

/** PW2 and PW3: the placement of a kit piece on `side` of `cell`: its back on the cell edge, its own front the side's, `across_m` along the face from its centre (in the piece's own x), its base at `y_m`. */
export function placeParty(cell: CityCell, side: CitySide, key: CalibrationKey, across_m: number, y_m: number): CityPlacement {
  const e = partyBounds(key);
  const v = SIDE_VEC[side];
  const yaw = YAW_OF_SIDE[side];
  const c = centreOf(cell);
  const along = rotate(yaw, across_m, 0);
  return {
    key,
    x_m: norm(c.x + v.x * (CELL_M / 2 + e.d / 2) + along.x),
    y_m: norm(y_m),
    z_m: norm(c.z + v.z * (CELL_M / 2 + e.d / 2) + along.z),
    yaw_deg: yaw,
  };
}

/** What the stage counted while it picked. */
export interface PartyStats {
  readonly faces: number;
  readonly boards: number;
  readonly windowPairs: number;
  readonly pipes: number;
  /** Faces where "no key twice running" took a whole kind away (every fitting key of a kind was the key just before: the window, or a pipe). */
  readonly runningRemoved: number;
  /** Faces where it took a fitting key away (a board of seven, as well as the window and the pipes). */
  readonly keyRemoved: number;
}

type Kind = "board" | "window" | "pipe";
const KINDS: readonly Kind[] = ["board", "window", "pipe"];
const KEYS: Readonly<Record<Kind, readonly CalibrationKey[]>> = { board: PARTY_BOARDS, window: [PARTY_WINDOW], pipe: PARTY_PIPES };

/**
 * The party-wall pieces of every building, by building id, each list in the layer's order (column along the row, then side, then bottom up). The faces are taken in `scanParty`'s order and the running rule (PW5) reads the key on the
 * face just before.
 */
export function buildParty(
  mass: Pick<CityMassLayer, "cells" | "built">,
  buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">,
  rand: StageRand,
): { pieces: Map<string, CityWallPiece[]>; stats: PartyStats } {
  const { faces } = scanParty(mass, buildings);
  const pieces = new Map<string, CityWallPiece[]>();
  let boards = 0;
  let windowPairs = 0;
  let pipes = 0;
  let runningRemoved = 0;
  let keyRemoved = 0;
  let prev: CalibrationKey | null = null;
  let n = 0;
  while (n < faces.length) {
    const face = faces[n]!;
    const nx = faces[n + 1];
    const group = nx !== undefined && nx.building === face.building && nx.side === face.side && keyOf(nx.cell) === keyOf(face.cell) && nx.storey === face.storey + 1 ? nx : undefined;
    /** How many faces a key covers here: a pipe two where it fits both faces of a two-storey step, else one where it fits; 0 when it does not fit. */
    const spanOf = (key: CalibrationKey): 0 | 1 | 2 => {
      if (PARTY_PIPES.includes(key) && group && fitsRoom(key, group.hi_m - face.lo_m)) return 2;
      return fitsRoom(key, face.hi_m - face.lo_m) ? 1 : 0;
    };
    let removed = false;
    const options = KINDS.map((kind) => {
      const ok: { key: CalibrationKey; span: 1 | 2 }[] = [];
      for (const key of KEYS[kind]) {
        const span = spanOf(key);
        if (span === 0) continue;
        if (key === prev) removed = true;
        else ok.push({ key, span });
      }
      return { kind, ok };
    }).filter((o) => o.ok.length > 0);
    if (removed) keyRemoved++;
    if (KINDS.some((k) => KEYS[k].some((key) => spanOf(key) !== 0) && !options.some((o) => o.kind === k))) runningRemoved++;
    if (options.length === 0) throw new CityStageError(`PW5: no kit piece is left for the party wall at (${face.cell.i}, ${face.cell.j}) side ${face.side} storey ${face.storey} of building ${face.building}`, [face.cell]);
    const salt = [face.building, keyOf(face.cell), face.side, face.storey] as const;
    const kind = options[indexOf(rand("party", ...salt, "kind"), options.length)]!;
    const { key, span } = kind.ok[indexOf(rand("party", ...salt, "key"), kind.ok.length)]!;
    const hi = span === 2 ? group!.hi_m : face.hi_m;
    const y = face.lo_m + (hi - face.lo_m - partyBounds(key).h) / 2;
    const list = pieces.get(face.building) ?? pieces.set(face.building, []).get(face.building)!;
    const make = (across: number): CityWallPiece => ({
      kind: partyKindOf(key)!,
      building: face.building,
      cell: { i: face.cell.i, j: face.cell.j },
      face: face.side,
      storey: face.storey,
      span,
      placement: placeParty(face.cell, face.side, key, across, y),
      scaleY: 1,
      boxes: [],
    });
    if (kind.kind === "window") {
      list.push(make(-PARTY_WINDOW_X_M), make(PARTY_WINDOW_X_M));
      windowPairs++;
    } else {
      list.push(make(0));
      if (kind.kind === "board") boards++;
      else pipes++;
    }
    prev = key;
    n += span;
  }
  return { pieces, stats: { faces: faces.length, boards, windowPairs, pipes, runningRemoved, keyRemoved } };
}

/** `cityplan.ts`' order: building by building, in a building H2's pieces and then its party-wall pieces. `h2` must be in `buildings.buildings` order. */
export function mergeWalls(buildings: Pick<CityBuildingsLayer, "buildings">, h2: readonly CityWallPiece[], party: ReadonlyMap<string, readonly CityWallPiece[]>): CityWallPiece[] {
  const out: CityWallPiece[] = [];
  let at = 0;
  for (const b of buildings.buildings) {
    while (at < h2.length && h2[at]!.building === b.id) out.push(h2[at++]!);
    out.push(...(party.get(b.id) ?? []));
  }
  if (at !== h2.length) throw new CityStageError(`H2b: the walls of ${h2[at]!.building} are out of building order`, [h2[at]!.cell]);
  return out;
}
