import type { CityPicture, CityPlanStage } from "../../core";

export type LegendEntry = CityPicture["legend"][number];
type Point = CityPicture["points"][number];

/** A picture whose cell at (i, j) is `at(i, j)`, an index into `legend` (R-5: one entry per lattice cell, row-major j * w + i). */
export function makePicture(stage: CityPlanStage, w: number, h: number, legend: readonly LegendEntry[], at: (i: number, j: number) => number, points: readonly Point[] = []): CityPicture {
  const cells: number[] = new Array<number>(w * h).fill(0);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) cells[j * w + i] = at(i, j);
  return { stage, w, h, cells, points, legend };
}

/** The problems with a picture's shape (R-5), empty when it is sound: its size is the lattice's, and every index is in the legend. */
export function pictureProblems(p: CityPicture, w: number, h: number): string[] {
  const out: string[] = [];
  if (p.w !== w || p.h !== h) out.push(`size ${p.w}x${p.h} is not the lattice's ${w}x${h}`);
  if (p.cells.length !== w * h) out.push(`${p.cells.length} cells for a ${w}x${h} lattice`);
  p.cells.forEach((c, k) => {
    if (!Number.isInteger(c) || c < 0 || c >= p.legend.length) out.push(`cell ${k} has index ${c} outside the legend`);
  });
  p.points.forEach((pt, k) => {
    if (!Number.isInteger(pt.legend) || pt.legend < 0 || pt.legend >= p.legend.length) out.push(`point ${k} has index ${pt.legend} outside the legend`);
  });
  return out;
}
