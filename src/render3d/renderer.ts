/**
 * The Three.js view of a map (ticket 037): the same interfaces as the Canvas 2D renderer, so play and ui are unchanged.
 * Needs WebGL; everything it draws with is built and tested without it (layout, look, camera, scene, pick).
 */

import { WebGLRenderer } from "three";
import type { Puzzle } from "../core";
import type { MapBlockers, MapCentre, MapPanView, MapPlaces, MapRenderer } from "../render";
import type { Insets } from "../render/geometry";
import { FOV_DEG, createCameraRig } from "./camera";
import { createPicker } from "./pick";
import { frontsOverlay, frontsRequested, type FrontsOverlay } from "./debug3d";
import { createGalleryRenderer3d, galleryRequested } from "./gallery";
import { applyModels, sharedModels, type AppliedModels } from "./models3d";
import { buildScene } from "./scene";
import { createCityRenderer3d } from "./tilecity3d";
import { cityTilesRequested } from "./tileslots";
import { createStreetView, streetCamRequested, streetMode, type StreetView } from "./streetcam";
import { townLayout } from "./town";

export interface MapRenderer3dOptions {
  insets?: Insets;
}

export type MapRenderer3d = MapRenderer & MapPanView & MapPlaces & MapCentre & MapBlockers & { dispose(): void };

/**
 * One WebGLRenderer per canvas, kept for the page's life. A canvas has one context for good: a second session on it
 * reuses this renderer (the old session's scene is freed by its dispose), so contexts never stack and none is force-lost.
 */
const glByCanvas = new WeakMap<HTMLCanvasElement, WebGLRenderer>();

export function createMapRenderer3d(canvas: HTMLCanvasElement, puzzle: Puzzle, opts?: MapRenderer3dOptions): MapRenderer3d {
  let gl = glByCanvas.get(canvas);
  if (!gl) {
    gl = new WebGLRenderer({ canvas, antialias: true });
    glByCanvas.set(canvas, gl);
  }
  const renderer = gl;
  // `?gallery=<pack-id>` (debug, ticket 043 B) shows every building of one pack instead of the town; this is the one place the address is read.
  // Dev builds only (ticket 045 C): `import.meta.env.DEV` is false in `npm run build`, so the gallery and its save code are dropped from the bundle.
  const galleryPack = import.meta.env.DEV && typeof location !== "undefined" ? galleryRequested(location.search) : null;
  if (galleryPack !== null) {
    const ratio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    return createGalleryRenderer3d(renderer, canvas, galleryPack, { insets: opts?.insets, dpr: ratio, search: location.search });
  }
  // `?city=tiles` (debug, ticket 055 C) shows a puzzle-free city of City Pack road tiles instead of the puzzle's map (the puzzle passed in is ignored); dev builds only, like the gallery.
  const cityTiles = import.meta.env.DEV && typeof location !== "undefined" ? cityTilesRequested(location.search) : null;
  if (cityTiles !== null) {
    const ratio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    return createCityRenderer3d(renderer, canvas, cityTiles, { insets: opts?.insets, dpr: ratio, search: location.search });
  }
  // `?cam=street` (debug, ticket 051 A) looks along one row of buildings from the road; this is the one place the address is read. Dev builds only, like the gallery.
  const streetOpts = import.meta.env.DEV && typeof location !== "undefined" ? streetCamRequested(location.search) : null;
  let insets: Insets = { ...(opts?.insets ?? {}) };
  const rig = createCameraRig(puzzle, Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), insets);
  const ratio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  const bundle = buildScene(puzzle, { dpr: ratio });
  let street: StreetView | null = null;
  if (import.meta.env.DEV && streetOpts) street = createStreetView(townLayout(puzzle), streetOpts, bundle.scene, rig.size.width, rig.size.height);
  const picker = createPicker(bundle.scene, rig.camera, rig.size);
  const nodePos = new Map(puzzle.nodes.map((n) => [n.id, n.pos] as const));

  function resize(): void {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    rig.resize(w, h, insets);
    let fov = FOV_DEG;
    if (import.meta.env.DEV && street) {
      street.resize(w, h);
      fov = street.pose.fov;
    }
    bundle.setViewport(w, h, fov);
    fronts?.setViewport(w, h, fov);
  }
  let fronts: FrontsOverlay | null = null;
  resize();

  // The converted models swap in when they arrive; until then (and if they never do) the placeholder shapes are what shows.
  // `?fronts=1` (debug, ticket 042 A) adds an arrow along each building's declared front and its model name; this is the one place the query string is read.
  const wantFronts = typeof location !== "undefined" && frontsRequested(location.search);
  let disposed = false;
  let applied: AppliedModels | null = null;
  void sharedModels()
    .then((set) => {
      if (disposed) return;
      applied = applyModels(bundle, set);
      if (import.meta.env.DEV) street?.markReady();
      if (wantFronts && applied.buildings.length > 0) {
        fronts = frontsOverlay(bundle, applied, { dpr: ratio });
        bundle.scene.add(fronts);
        fronts.setViewport(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), FOV_DEG);
      }
    })
    .catch((e: unknown) => {
      console.info(`3D models: not applied (${e instanceof Error ? e.message : String(e)}).`);
      if (import.meta.env.DEV) street?.markReady();
    });

  const play: MapRenderer3d = {
    draw(state, overlay, timeSeconds) {
      bundle.update(state, overlay.hover ?? null, timeSeconds, overlay.relightT);
      renderer.render(bundle.scene, rig.camera);
    },
    hitTest: (x, y) => picker.hitTest(x, y),
    resize,
    setInsets(next) {
      insets = { ...next };
      rig.resize(rig.size.width, rig.size.height, insets);
    },
    // The spike has no pulses or pop to forward.
    notify() {},
    setBlockers: (rects) => picker.setBlockers(rects),
    placeAt: () => null,
    getPan: () => rig.getPan(),
    setPan: (x, y) => rig.setPan(x, y),
    resetView: () => rig.resetView(),
    getScale: () => rig.getScale(),
    zoomStep: (dir) => rig.zoomStep(dir),
    fitWhole: () => rig.fitWhole(),
    centreOn(nodeId) {
      const p = nodePos.get(nodeId);
      return p ? rig.centreOn(p[0], p[1]) : rig.getPan();
    },
    dispose() {
      disposed = true;
      if (fronts) {
        bundle.scene.remove(fronts);
        fronts.dispose();
        fronts = null;
      }
      applied?.remove();
      bundle.dispose();
    },
  };
  // The street camera (dev only): the same renderer, drawn through its own camera, with nothing to pick and no pan or zoom.
  if (import.meta.env.DEV && street) {
    const view = street;
    return streetMode(play, view, (state, overlay, timeSeconds) => {
      bundle.update(state, overlay.hover ?? null, timeSeconds, overlay.relightT);
      view.draw(renderer, bundle.scene);
    });
  }
  return play;
}
