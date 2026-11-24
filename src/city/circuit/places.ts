/**
 * Stage 6, drops, street lights and lamp-post places (ticket 081 K2b; CK9 to CK11 of `docs/design/070-K1-circuit.md`). Pure: reads the poles and spans laid by `layPoles`, the streets, the edge, the mass and the buildings.
 *
 * - **CK9** (081 K2e) A building with a front column on a street takes one drop, the closest pair of a front column and a pole in plan: from its own pole line; else from a crossing pole on its own block side within 7.5 m; else across the street from
 *   that street's pole pavement, up to 23.5 m (the drop sets `street`). The wall point is the centre of that column's front edge at 5.5 m.
 * - **CK10** Street lights stand on the non-pole pavement of each block side, on every second slot of CK2's layout (1, 3, 5 ...), never the end positions, a forbidden cell, or within 3 m of a pole.
 * - **CK11** A lamp-post place is the midpoint of every along span of 7.5 m or more.
 */

import type { CityDrop, CityLampPostPlace, CityPole, CitySide, CityStreetLight, CityWireSpan } from "../../core";
import type { CircuitInput } from "./check";
import { CELL_M, DROP_CROSS_MAX_M, DROP_MAX_M, DROP_WALL_Y_M, LIGHT_POLE_MIN_M, POLE_END_CLEAR_M, POLE_PITCH_M, POST_MIN_SPAN_M, TOL } from "./constants";
import { allowedCell, cellAt, indexCells, pointOf, polePavement, sidePavement, spanM, streetsById } from "./geometry";

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export const dropId = (building: string): string => `drop:${building}`;
export const lightId = (street: string, pavement: "lo" | "hi", along: number): string => `light:${street}:${pavement}:${along.toFixed(2)}`;

/** The centre of a cell's edge on `side`, on the lattice (cell (i, j) spans x from i x 5 m and z from j x 5 m). */
export const edgeCentre = (i: number, j: number, side: CitySide): { readonly x_m: number; readonly z_m: number } => {
  const x = i * CELL_M;
  const z = j * CELL_M;
  const h = CELL_M / 2;
  return side === "+z" ? { x_m: x + h, z_m: z + CELL_M } : side === "-z" ? { x_m: x + h, z_m: z } : side === "+x" ? { x_m: x + CELL_M, z_m: z + h } : { x_m: x, z_m: z + h };
};

/** The front columns of a building (CK9): its cells whose built cell has the building's front side open onto a street. */
export function frontColumns(input: CircuitInput, building: { readonly front: CitySide; readonly cells: readonly { readonly i: number; readonly j: number }[] }): { readonly i: number; readonly j: number }[] {
  const built = new Map(input.mass.built.map((c) => [`${c.i},${c.j}`, c] as const));
  return building.cells.filter((c) => built.get(`${c.i},${c.j}`)?.open.some((o) => o.side === building.front && o.faces === "street") === true);
}

type Col = { readonly i: number; readonly j: number };
type Pair = { d: number; pole: CityPole; col: Col; at: { x_m: number; z_m: number } };

/** The closest pair of a front column's wall point and a pole within `max` in plan (ties go to the first column, then the first pole). */
function closestPair(cols: readonly Col[], front: CitySide, poles: readonly CityPole[], max: number): Pair | undefined {
  let best: Pair | undefined;
  for (const col of cols) {
    const at = edgeCentre(col.i, col.j, front);
    for (const pole of poles) {
      const d = Math.hypot(pole.x_m - at.x_m, pole.z_m - at.z_m);
      if (d > max + TOL) continue;
      if (best === undefined || d < best.d - 1e-9) best = { d, pole, col, at };
    }
  }
  return best;
}

const byAlong = (x: CityPole, y: CityPole): number => x.along_m - y.along_m || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);

/** CK9 (081 K2e): the crossing poles on a building's own block side, in order. */
const ownCrossingPoles = (poles: readonly CityPole[], b: { readonly block: string; readonly front: CitySide }): CityPole[] => poles.filter((p) => p.kind === "crossing" && p.block === b.block && p.side === b.front).sort(byAlong);

/** CK9 (081 K2e): whether an own crossing pole is within `DROP_MAX_M` of one of a building's front columns. */
export const crossingInReach = (poles: readonly CityPole[], b: { readonly block: string; readonly front: CitySide }, cols: readonly Col[]): boolean => closestPair(cols, b.front, ownCrossingPoles(poles, b), DROP_MAX_M) !== undefined;

export function layDrops(input: CircuitInput, poles: readonly CityPole[]): CityDrop[] {
  const byStreet = streetsById(input.streets);
  const ix = indexCells(input.edge);
  const blocks = new Map(input.streets.blocks.map((b) => [b.id, b] as const));
  const out: CityDrop[] = [];
  for (const b of input.buildings.buildings) {
    const block = blocks.get(b.block);
    if (block === undefined) continue;
    const street = byStreet.get(block.sides[b.front].street);
    if (street === undefined) continue;
    const cols = frontColumns(input, b);
    if (cols.length === 0) continue;
    const polePave = polePavement(street, ix);
    let best: Pair | undefined;
    let across = false;
    if (polePave === sidePavement(b.front)) {
      best = closestPair(cols, b.front, poles.filter((p) => p.block === b.block && p.side === b.front && p.kind !== "crossing").sort(byAlong), Infinity);
    } else {
      best = closestPair(cols, b.front, ownCrossingPoles(poles, b), DROP_MAX_M);
      if (best === undefined) {
        best = closestPair(cols, b.front, poles.filter((p) => p.street === street.id && p.pavement === polePave && p.kind !== "crossing").sort(byAlong), DROP_CROSS_MAX_M);
        across = true;
      }
    }
    if (best === undefined) continue;
    const drop: CityDrop = { id: dropId(b.id), pole: best.pole.id, building: b.id, cell: { i: best.col.i, j: best.col.j }, x_m: best.at.x_m, z_m: best.at.z_m, y_m: DROP_WALL_Y_M };
    out.push(across ? { ...drop, street: street.id } : drop);
  }
  return out;
}

export function layLights(input: CircuitInput, poles: readonly CityPole[]): CityStreetLight[] {
  const byStreet = streetsById(input.streets);
  const ix = indexCells(input.edge);
  const out = new Map<string, CityStreetLight>();
  for (const b of input.streets.blocks) {
    for (const side of ["+x", "-x", "+z", "-z"] as const) {
      const info = b.sides[side];
      const st = byStreet.get(info.street)!;
      const pavement = sidePavement(side);
      if (polePavement(st, ix) === pavement) continue;
      const m = spanM(info);
      const first = m.lo + POLE_END_CLEAR_M;
      const gap = m.hi - POLE_END_CLEAR_M - first;
      const n = Math.max(1, Math.ceil(gap / POLE_PITCH_M - 1e-9));
      for (let k = 1; k < n; k += 2) {
        const along = round4(first + (gap * k) / n);
        const p = pointOf(st, pavement, along);
        if (!allowedCell(ix, cellAt(st, pavement, along))) continue;
        if (poles.some((q) => Math.hypot(q.x_m - p.x_m, q.z_m - p.z_m) < LIGHT_POLE_MIN_M)) continue;
        const id = lightId(st.id, pavement, along);
        out.set(id, { id, street: st.id, pavement, along_m: along, x_m: p.x_m, z_m: p.z_m, block: b.id, side });
      }
    }
  }
  return [...out.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

export function layPosts(poles: readonly CityPole[], spans: readonly CityWireSpan[]): CityLampPostPlace[] {
  const at = new Map(poles.map((p) => [p.id, p] as const));
  const out: CityLampPostPlace[] = [];
  for (const s of spans) {
    if (s.kind !== "along" || s.len_m < POST_MIN_SPAN_M) continue;
    const a = at.get(s.a)!;
    const b = at.get(s.b)!;
    out.push({ span: s.id, x_m: round4((a.x_m + b.x_m) / 2), z_m: round4((a.z_m + b.z_m) / 2) });
  }
  return out;
}
