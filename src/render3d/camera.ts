/**
 * The tilted camera over the town section (ticket 037). Three's math only; runs in Node with no WebGL.
 * The camera looks from the south at a fixed elevation, so screen right is world +x and screen down is world +z (as in 2D).
 * Pan slides the look-at point, zoom dollies, the opening fit frames the footprint inside the HUD insets.
 */

import { PerspectiveCamera, Vector3 } from "three";
import type { Puzzle } from "../core";
import { circuitStreets, type CityRect } from "../render/city";
import { ZOOM_STEP, puzzleBounds, type Insets, type Pan } from "../render/geometry";
import { POLE_HEIGHT } from "./layout";
import type { PickSize } from "./pick";

export const FOV_DEG = 40;
export const ELEVATION = (55 * Math.PI) / 180;
const SIN_E = Math.sin(ELEVATION);
const COS_E = Math.cos(ELEVATION);
/** Px kept clear between the whole footprint and the free area's edge (fitWhole). */
const FIT_PAD = 24;
/** The opening pose frames the circuit's own bounds, grown by this many units, to fill about 80% of the free area: 10% kept clear on each side. */
const FRAME_MARGIN = 1;
const OPEN_PAD_FRACTION = 0.1;
/** Closest dolly, as a fraction of the fitting distance. */
const MIN_DIST_FRACTION = 0.3;

export interface CameraRig {
  camera: PerspectiveCamera;
  /** Shared with the picker; updated by `resize`. */
  size: PickSize;
  /** Set the canvas size (CSS px) and the HUD insets, and reframe the whole footprint. */
  resize(width: number, height: number, insets?: Insets): void;
  getPan(): Pan;
  setPan(x: number, y: number): Pan;
  resetView(): void;
  fitWhole(): void;
  getScale(): number;
  zoomStep(dir: 1 | -1): number;
  centreOn(x: number, z: number): Pan;
}

export function createCameraRig(puzzle: Puzzle, width = 1280, height = 720, initial?: Insets): CameraRig {
  const camera = new PerspectiveCamera(FOV_DEG, width / height, 0.1, 1000);
  const size: PickSize = { width, height };
  let insets: Insets = { ...(initial ?? {}) };
  const fp = circuitStreets(puzzle).footprint;
  const bounds = puzzleBounds(puzzle);
  const frame: CityRect = { minX: bounds.minX - FRAME_MARGIN, minY: bounds.minY - FRAME_MARGIN, maxX: bounds.maxX + FRAME_MARGIN, maxY: bounds.maxY + FRAME_MARGIN };
  const baseX = (frame.minX + frame.maxX) / 2;
  const baseZ = (frame.minY + frame.maxY) / 2;
  let tx = baseX;
  let tz = baseZ;
  let dist = 20;
  let openDist = 20;
  let wholeDist = 20;
  const target = new Vector3();
  const probe = new Vector3();
  const tanHalf = Math.tan((FOV_DEG * Math.PI) / 360);

  const scale = (): number => size.height / 2 / (tanHalf * dist);

  function apply(): void {
    target.set(tx, 0, tz);
    camera.position.set(tx, dist * SIN_E, tz + dist * COS_E);
    camera.lookAt(target);
    camera.aspect = size.width / size.height;
    // Shift the picture so the town centres in the free area between the insets, not the whole canvas.
    const shift = ((insets.top ?? 0) - (insets.bottom ?? 0)) / 2;
    const side = ((insets.left ?? 0) - (insets.right ?? 0)) / 2;
    camera.setViewOffset(size.width, size.height, -side, -shift, size.width, size.height);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  function fits(r: CityRect, padX: number, padY: number): boolean {
    const left = (insets.left ?? 0) + padX;
    const right = size.width - (insets.right ?? 0) - padX;
    const top = (insets.top ?? 0) + padY;
    const bottom = size.height - (insets.bottom ?? 0) - padY;
    for (const x of [r.minX, r.maxX]) {
      for (const z of [r.minY, r.maxY]) {
        for (const y of [0, POLE_HEIGHT]) {
          probe.set(x, y, z).project(camera);
          const px = ((probe.x + 1) / 2) * size.width;
          const py = ((1 - probe.y) / 2) * size.height;
          if (px < left || px > right || py < top || py > bottom) return false;
        }
      }
    }
    return true;
  }

  /** Centre on the region and dolly to the closest distance at which its corners sit inside the free area less the pads. Returns the distance. */
  function fitTo(r: CityRect, padX: number, padY: number): number {
    tx = (r.minX + r.maxX) / 2;
    tz = (r.minY + r.maxY) / 2;
    let lo = 3;
    let hi = 600;
    for (let i = 0; i < 30; i++) {
      dist = (lo + hi) / 2;
      apply();
      if (fits(r, padX, padY)) hi = dist;
      else lo = dist;
    }
    dist = hi;
    apply();
    return hi;
  }

  function fit(): void {
    const freeW = size.width - (insets.left ?? 0) - (insets.right ?? 0);
    const freeH = size.height - (insets.top ?? 0) - (insets.bottom ?? 0);
    wholeDist = fitTo(fp, FIT_PAD, FIT_PAD);
    openDist = fitTo(frame, freeW * OPEN_PAD_FRACTION, freeH * OPEN_PAD_FRACTION);
    wholeDist = Math.max(wholeDist, openDist);
  }

  function fitWhole(): void {
    fit();
    tx = (fp.minX + fp.maxX) / 2;
    tz = (fp.minY + fp.maxY) / 2;
    dist = wholeDist;
    apply();
  }

  const clampT = (): void => {
    tx = Math.min(Math.max(tx, fp.minX), fp.maxX);
    tz = Math.min(Math.max(tz, fp.minY), fp.maxY);
  };
  const getPan = (): Pan => ({ x: -(tx - baseX) * scale(), y: -(tz - baseZ) * scale() * SIN_E });

  fit();

  return {
    camera,
    size,
    resize(w, h, next) {
      size.width = Math.max(w, 1);
      size.height = Math.max(h, 1);
      if (next) insets = { ...next };
      fit();
    },
    getPan,
    setPan(x, y) {
      const s = scale();
      tx = baseX - x / s;
      tz = baseZ - y / (s * SIN_E);
      clampT();
      apply();
      return getPan();
    },
    resetView: fit,
    fitWhole,
    getScale: scale,
    zoomStep(dir) {
      const next = dir === 1 ? dist / ZOOM_STEP : dist * ZOOM_STEP;
      dist = Math.min(Math.max(next, openDist * MIN_DIST_FRACTION), wholeDist);
      apply();
      return scale();
    },
    centreOn(x, z) {
      tx = x;
      tz = z;
      clampT();
      apply();
      return getPan();
    },
  };
}
