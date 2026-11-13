/**
 * The Three.js view of a map (ticket 037): the same interfaces as the Canvas 2D renderer, so play and ui are unchanged.
 * Needs WebGL; everything it draws with is built and tested without it (layout, look, camera, scene, pick).
 */

import { WebGLRenderer } from "three";
import type { Puzzle } from "../core";
import type { MapBlockers, MapCentre, MapPanView, MapPlaces, MapRenderer } from "../render";
import type { Insets } from "../render/geometry";
import { createCameraRig } from "./camera";
import { createPicker } from "./pick";
import { buildScene } from "./scene";

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
  let insets: Insets = { ...(opts?.insets ?? {}) };
  const rig = createCameraRig(puzzle, Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), insets);
  const bundle = buildScene(puzzle);
  const picker = createPicker(bundle.scene, rig.camera, rig.size);
  const nodePos = new Map(puzzle.nodes.map((n) => [n.id, n.pos] as const));

  function resize(): void {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2));
    renderer.setSize(w, h, false);
    rig.resize(w, h, insets);
  }
  resize();

  return {
    draw(state, overlay, timeSeconds) {
      bundle.update(state, overlay.hover ?? null, timeSeconds);
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
      bundle.dispose();
    },
  };
}
