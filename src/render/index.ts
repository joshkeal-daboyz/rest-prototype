// TEMPORARY: only the MapRenderer interface from ticket 003, so src/play typechecks.
// The main session replaces this file with the real renderer at merge.
import type { GridState } from "../grid";

export interface MapRenderer {
  draw(state: GridState, overlay: { hover?: string | null; relightT?: number }, timeSeconds: number): void;
  hitTest(x: number, y: number): string | null;
  resize(): void;
}
