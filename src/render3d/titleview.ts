/**
 * The title backdrop's types (ticket 081 T1), types only, as `maprender.ts` is for the map: `src/ui/` and `src/main.ts` code against these, and `title3d.ts` makes the view.
 * The page's words (the splash's name, the title, start, exit) are DOM over this canvas; the view draws only the night sky, the moon and one lit building.
 */

import type { WebGLRenderer } from "three";
import type { ModelSet } from "./models3d";

/** `splash`: the turning night sky alone. `title`: the moon over the city and one lit building on the right of the screen. */
export type TitleMode = "splash" | "title";

export interface TitleViewOptions {
  /** The device pixel ratio (the view caps it at 2). */
  dpr: number;
  /** The page's query string (`perf=1` in a dev build logs the title's frame cost). */
  search: string;
  /** The models to load once the view is up (default: the page's shared tile load). A test passes its own so nothing is fetched. */
  load?: () => Promise<ModelSet>;
  /** The canvas's WebGL renderer (default: the page's one for that canvas, which every view on it shares). */
  gl?: WebGLRenderer;
}

export interface TitleView {
  /** Splash to title eases the camera down over `TITLE_SETTLE_S`; a mode set before the first `draw` takes effect at once. */
  setMode(mode: TitleMode): void;
  /** Draw one frame at page time `timeSeconds`. Allocates nothing. Draws the sky alone until the models are in. */
  draw(timeSeconds: number): void;
  /** True once the backdrop's models are in (or failed to load and the grey boxes stand in). The splash needs only the sky, so it never waits for this. */
  ready(): boolean;
  /** Match the canvas's CSS size. `draw` also does it when the size changed. */
  resize(): void;
  /** Free the scene, the sky and the city. The WebGL renderer stays (the canvas keeps it for good). */
  dispose(): void;
}
