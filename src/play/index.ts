// TEMPORARY types-only stub from ticket 005 so the UI typechecks and builds before ticket 004 merges.
// The interaction branch replaces this file at merge. The factory only throws; it is not an implementation.
import type { EventBus, Puzzle } from "../core";
import type { Grid } from "../grid";
import type { MapRenderer } from "../render";

export interface MapPlay {
  attach(canvas: HTMLCanvasElement): () => void;
  view(): { hover: string | null; prompt: string | null; relightT: number | null };
  undo(): void;
  reset(): void;
  exportLog(): string;
  tick(dtSeconds: number): void;
}

export function createMapPlay(_puzzle: Puzzle, _grid: Grid, _renderer: MapRenderer, _bus: EventBus): MapPlay {
  throw new Error("createMapPlay is not merged yet (ticket 004)");
}
