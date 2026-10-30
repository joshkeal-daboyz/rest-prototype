/**
 * Target labels that survive a pan (ticket 027 A2). `targetLabels` is the truth, but it looks at the
 * whole map; at a fixed scale a pan only slides every box, so the cached boxes are slid instead, unless
 * the pan could change a decision:
 *   - a labelled place crossed the free area's edge (it is hidden outside, shown inside), or
 *   - a labelled place sits so near an edge that one of its four candidate boxes could be rejected for
 *     sticking out of the area (or the shifted far-side box be needed).
 * In either case the labels are recomputed from scratch, exactly as before. Pure: no DOM.
 */

import type { Puzzle } from "../core";
import type { Place } from "./city";
import { LABEL_EDGE_PX, LABEL_GAP_PX, LABEL_H_PX, targetLabels } from "./places";

type Fit = { scale: number; offsetX: number; offsetY: number };
type Free = { left: number; top: number; right: number; bottom: number };

/** A labelled place outside the free area: its label is hidden. */
export const LABEL_OUT = 0;
/** Inside the free area with every candidate box inside it too: its label is the same wherever the pan puts it. */
export const LABEL_SAFE = 1;
/** Inside the free area but near its edge: the label depends on the edge. */
export const LABEL_EDGE = 2;

/** Class of each place (a place with no label is LABEL_OUT: it never matters). `reach` is how far (px) a label can lie from its place's box. */
export function labelClasses(places: readonly Place[], fit: Fit, free: Free, reach: number, out: Uint8Array): void {
  const sc = fit.scale;
  for (let i = 0; i < places.length; i++) {
    const p = places[i]!;
    if (p.label === null) {
      out[i] = LABEL_OUT;
      continue;
    }
    const px = p.x * sc + fit.offsetX;
    const py = p.y * sc + fit.offsetY;
    if (px < free.left || px > free.right || py < free.top || py > free.bottom) {
      out[i] = LABEL_OUT;
      continue;
    }
    const hw = (p.w * sc) / 2 + reach;
    const hh = (p.h * sc) / 2 + reach;
    out[i] = px - hw >= free.left && px + hw <= free.right && py - hh >= free.top && py + hh <= free.bottom ? LABEL_SAFE : LABEL_EDGE;
  }
}

export interface LabelCache {
  /**
   * Fill `centres` (x, y of each place's label box centre, px) and `shown` (1/0) for the fit. Reuses the
   * last result, slid by the pan, when that is provably what a recompute would give. Returns true if it recomputed.
   */
  update(places: readonly Place[], fit: Fit, free: Free, measure: (text: string) => number, centres: Float64Array, shown: Uint8Array, floor?: number): boolean;
  /** How many times the labels were recomputed from scratch. */
  readonly recomputes: number;
  /** Forget everything (a new puzzle, a new set of places). */
  clear(): void;
}

export function createLabelCache(puzzle: Puzzle): LabelCache {
  let places: readonly Place[] | null = null;
  let scale = NaN;
  let capFloor: number | undefined;
  let offX = 0;
  let offY = 0;
  let fl = NaN;
  let ft = NaN;
  let fr = NaN;
  let fb = NaN;
  let reach = 0;
  let classes = new Uint8Array(0);
  let scratch = new Uint8Array(0);
  let cx = new Float64Array(0);
  let cy = new Float64Array(0);
  let sh = new Uint8Array(0);
  const cache: Omit<LabelCache, "recomputes"> & { recomputes: number } = {
    recomputes: 0,
    clear() {
      places = null;
    },
    update(ps, fit, free, measure, centres, shown, floor) {
      const sameFrame = places === ps && floor === capFloor && fit.scale === scale && free.left === fl && free.top === ft && free.right === fr && free.bottom === fb;
      if (sameFrame) {
        if (scratch.length !== ps.length) scratch = new Uint8Array(ps.length);
        labelClasses(ps, fit, free, reach, scratch);
        let ok = true;
        for (let i = 0; i < ps.length; i++) {
          if (scratch[i] === LABEL_EDGE || scratch[i] !== classes[i]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          const dx = fit.offsetX - offX;
          const dy = fit.offsetY - offY;
          for (let i = 0; i < ps.length; i++) {
            shown[i] = sh[i]!;
            if (sh[i] === 1) {
              centres[i * 2] = cx[i]! + dx;
              centres[i * 2 + 1] = cy[i]! + dy;
            }
          }
          return false;
        }
      }
      const boxes = targetLabels(puzzle, ps, fit, free, measure, floor);
      let widest = 0;
      ps.forEach((p, i) => {
        if (p.label !== null) widest = Math.max(widest, measure(p.label));
        const box = boxes[i];
        shown[i] = box ? 1 : 0;
        if (box) {
          centres[i * 2] = box.x + box.w / 2;
          centres[i * 2 + 1] = box.y + box.h / 2;
        }
      });
      // Any candidate box lies within the place's box grown by the gap and the label's width (or height), plus the edge margin.
      reach = LABEL_GAP_PX + Math.max(widest, LABEL_H_PX) + LABEL_EDGE_PX;
      places = ps;
      scale = fit.scale;
      capFloor = floor;
      offX = fit.offsetX;
      offY = fit.offsetY;
      fl = free.left;
      ft = free.top;
      fr = free.right;
      fb = free.bottom;
      if (classes.length !== ps.length) {
        classes = new Uint8Array(ps.length);
        cx = new Float64Array(ps.length);
        cy = new Float64Array(ps.length);
        sh = new Uint8Array(ps.length);
      }
      labelClasses(ps, fit, free, reach, classes);
      for (let i = 0; i < ps.length; i++) {
        sh[i] = shown[i]!;
        cx[i] = centres[i * 2]!;
        cy[i] = centres[i * 2 + 1]!;
      }
      cache.recomputes++;
      return true;
    },
  };
  return cache;
}
