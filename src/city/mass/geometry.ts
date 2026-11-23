/** Small lattice helpers shared by the mass stage's planner and its checks. Pure. */

import type { CityCell, CityFaceKind, CityFrontage, CityMassUse, CityColumnKind, CityPart, CitySide } from "../../core";

export const SIDES: readonly CitySide[] = ["+x", "-x", "+z", "-z"];
export const DELTA: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };
export const OPPOSITE: Readonly<Record<CitySide, CitySide>> = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" };

export const keyOf = (i: number, j: number): string => `${i},${j}`;
export const cellKey = (c: CityCell): string => keyOf(c.i, c.j);

/** How many cells a cell is in from its part's edge (0 is ring 1, 1 is ring 2). */
export const ringOf = (p: Pick<CityPart, "i0" | "i1" | "j0" | "j1">, i: number, j: number): number => Math.min(i - p.i0, p.i1 - 1 - i, j - p.j0, p.j1 - 1 - j);

export const shortSideOf = (p: Pick<CityPart, "i0" | "i1" | "j0" | "j1">): number => Math.min(p.i1 - p.i0, p.j1 - p.j0);

/** Two sides are adjacent when one is on the x axis and the other on the z axis. */
export const adjacentSides = (a: CitySide, b: CitySide): boolean => a[1] !== b[1];

/** What an open side faces, from the use of the cell beyond it; null for a built cell. */
export function faceOfUse(use: CityMassUse): CityFaceKind | null {
  switch (use) {
    case "built":
      return null;
    case "lane":
    case "laneMouth":
      return "lane";
    case "drive":
      return "drive";
    case "frontLot":
      return "frontLot";
    case "plaza":
      return "plaza";
    case "walk":
      return "walk";
    case "parkEdge":
      return "parkEdge";
    case "apron":
    case "stalls":
    case "aisle":
    case "green":
    case "greenPath":
      return "court";
  }
}

/** Grammar rule 9: street, park edge and plaza are street frontage; the rest is quiet. */
export const frontageOfFace = (f: CityFaceKind): CityFrontage => (f === "street" || f === "parkEdge" || f === "plaza" ? "street" : "quiet");

/** Grammar rule 3: no open side is blind, one is mid, two adjacent are a corner; opposite sides, three or four are not allowed (null). */
export function columnOfSides(open: readonly CitySide[]): CityColumnKind | null {
  if (open.length === 0) return "blind";
  if (open.length === 1) return "mid";
  if (open.length === 2 && adjacentSides(open[0]!, open[1]!)) return "corner";
  return null;
}

/** The cell behind a built cell, from its open sides: opposite the open side of a mid column, diagonally opposite a corner. Null for a blind column or an impossible set. */
export function behindOf(c: CityCell, open: readonly CitySide[]): CityCell | null {
  if (open.length === 1) {
    const [di, dj] = DELTA[OPPOSITE[open[0]!]];
    return { i: c.i + di, j: c.j + dj };
  }
  if (open.length === 2 && adjacentSides(open[0]!, open[1]!)) {
    const [a, b] = [DELTA[OPPOSITE[open[0]!]], DELTA[OPPOSITE[open[1]!]]];
    return { i: c.i + a[0] + b[0], j: c.j + a[1] + b[1] };
  }
  return null;
}

/**
 * The open sides of the built cell at (i, j): each side whose neighbour is not built, in `SIDES` order, with what it faces and its frontage. `useAt` gives the use of a block cell, or undefined for a
 * cell outside every block (a street cell), which a built cell faces as "street".
 */
export function openSidesFrom(i: number, j: number, useAt: (i: number, j: number) => CityMassUse | undefined): { side: CitySide; faces: CityFaceKind; frontage: CityFrontage }[] {
  const out: { side: CitySide; faces: CityFaceKind; frontage: CityFrontage }[] = [];
  for (const side of SIDES) {
    const [di, dj] = DELTA[side];
    const use = useAt(i + di, j + dj);
    const faces: CityFaceKind | null = use === undefined ? "street" : faceOfUse(use);
    if (faces !== null) out.push({ side, faces, frontage: frontageOfFace(faces) });
  }
  return out;
}
