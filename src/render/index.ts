// TEMPORARY types-only stub from ticket 005 so the UI typechecks and builds before ticket 003 merges.
// The renderer branch replaces this file at merge. The factory only throws; it is not an implementation.
import type { Puzzle } from "../core";
import type { GridState } from "../grid";

export interface MapRenderer {
  draw(state: GridState, overlay: { hover?: string | null; relightT?: number }, timeSeconds: number): void;
  hitTest(x: number, y: number): string | null;
  resize(): void;
}

export function createMapRenderer(_canvas: HTMLCanvasElement, _puzzle: Puzzle): MapRenderer {
  throw new Error("createMapRenderer is not merged yet (ticket 003)");
}
