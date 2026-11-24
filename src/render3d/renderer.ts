/**
 * The Three.js view of a map (ticket 037): the same interfaces as the Canvas 2D renderer, so play and ui are unchanged.
 * Needs WebGL. Only the pipeline city (`city=tiles`, `city=plan`) and the tile sheet remain: the ladder town was deleted in ticket 081 A2c.
 */

import { WebGLRenderer } from "three";
import type { Puzzle } from "../core";
import type { MapBlockers, MapCentre, MapPanView, MapPlaces, MapRenderer } from "../render";
import type { Insets } from "../render/geometry";
import { createPlanAssembleRenderer3d, planAssembleRequested, tilesPlanRequested } from "./plan3d";
import { createPlanRenderer3d, planViewRequested } from "./planview";
import { createCityRenderer3d } from "./tilecity3d";
import { cityTilesRequested } from "./tileslots";

export interface MapRenderer3dOptions {
  insets?: Insets;
}

export type MapRenderer3d = MapRenderer & MapPanView & MapPlaces & MapCentre & MapBlockers & { dispose(): void };

/** The message `createMapRenderer3d` throws when the address carries no `city=` route. The ui (ticket 081 A2d) never reaches it. */
export const NO_CITY_ROUTE = "createMapRenderer3d: no city= route (the ladder town is gone, ticket 081 A2c)";

/**
 * One WebGLRenderer per canvas, kept for the page's life. A canvas has one context for good: a second session on it
 * reuses this renderer (the old session's scene is freed by its dispose), so contexts never stack and none is force-lost.
 */
const glByCanvas = new WeakMap<HTMLCanvasElement, WebGLRenderer>();

export function createMapRenderer3d(canvas: HTMLCanvasElement, _puzzle: Puzzle, opts?: MapRenderer3dOptions): MapRenderer3d {
  // `?city=plan` (debug, ticket 070 A2) draws a stage of the city plan as a flat picture on a 2D canvas; a canvas keeps one kind of context for good, so this is decided before any WebGL one is made. Dev builds only.
  // `stage=assemble` (or 9, ticket 070 E) is the plan drawn in 3D: decided ahead of the flat picture, and routed below once the WebGL renderer is made.
  // `?city=tiles` (without `sheet=1`, ticket 070 L1) is the same view: the pipeline's city.
  const assemble = import.meta.env.DEV && typeof location !== "undefined" ? planAssembleRequested(location.search) ?? tilesPlanRequested(location.search) : null;
  const planView = assemble === null && import.meta.env.DEV && typeof location !== "undefined" ? planViewRequested(location.search) : null;
  if (planView !== null) return createPlanRenderer3d(canvas, planView, { dpr: Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2) });
  // `?city=tiles&sheet=1` (debug, ticket 055 E) is the tile sheet, instead of the puzzle's map (the puzzle passed in is ignored). Dev builds only. Plain `city=tiles` never reaches here (the pipeline's city took it above).
  const cityTiles = import.meta.env.DEV && typeof location !== "undefined" ? cityTilesRequested(location.search) : null;
  // The ladder town was deleted (ticket 081 A2c): with no `city=` route there is nothing to draw in 3D. The ui asks for this view only with a `city=` route (A2d). This is decided before any WebGL context is made.
  if (assemble === null && cityTiles === null) throw new Error(NO_CITY_ROUTE);
  let gl = glByCanvas.get(canvas);
  if (!gl) {
    gl = new WebGLRenderer({ canvas, antialias: true });
    glByCanvas.set(canvas, gl);
  }
  const renderer = gl;
  const ratio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  if (assemble !== null) {
    return createPlanAssembleRenderer3d(renderer, canvas, assemble, { insets: opts?.insets, dpr: ratio, search: location.search });
  }
  if (cityTiles !== null) {
    return createCityRenderer3d(renderer, canvas, cityTiles, { insets: opts?.insets, dpr: ratio, search: location.search });
  }
  throw new Error(NO_CITY_ROUTE);
}
