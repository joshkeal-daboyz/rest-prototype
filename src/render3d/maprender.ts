/**
 * The map's interfaces and the small view types, types only (no three, no canvas), so `src/play/` and `src/main.ts` can import them without loading the city view
 * (ticket 081 X1a, moved unchanged from the 2D map).
 */

import type { Events } from "../core";
import type { GridState } from "../grid";

export interface Pan {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Insets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/** One zoom level is this ratio from the next: four steps to double. */
export const ZOOM_STEP = Math.SQRT2 ** 0.5;

export interface MapOverlay {
  /** Id of the node or line the pointer is over (from hitTest). */
  hover?: string | null;
  /** Seconds since the job completed. Undefined = no Relight running. */
  relightT?: number;
  /** Lamp id whose place and lamp to pick out with a focus-coloured outline (ticket 024); null or undefined = none. */
  highlight?: string | null;
}

export interface MapRenderer {
  draw(state: GridState, overlay: MapOverlay, timeSeconds: number): void;
  /** x, y in CSS pixels relative to the canvas's top-left. */
  hitTest(x: number, y: number): string | null;
  resize(): void;
  /** Reserve CSS px at the edges for overlays (the HUD); refits the map. */
  setInsets(insets: Insets): void;
  /**
   * Forwarded events. `fuse:blown` plays the shock, then the pop; `switch:thrown` with `spring: true`
   * plays the lever twang. The renderer stays bus-free. (A spring return is also noticed from the
   * state alone, so forwarding `switch:thrown` is optional.)
   */
  notify(
    event:
      | { type: "fuse:blown"; payload: Events["fuse:blown"] }
      | { type: "switch:thrown"; payload: Events["switch:thrown"] },
  ): void;
}

/** Overlay panels that block clicks (ticket 035). Separate from MapRenderer so existing fakes still compile. */
export interface MapBlockers {
  /**
   * Screen rects (canvas CSS px) of the overlay panels. A point inside one (edges inclusive) is dead to hitTest and placeAt;
   * so is any point off the canvas. Keeps a copy and replaces the whole list on each call; the default is none.
   */
  setBlockers(rects: readonly Rect[]): void;
}

/** Place lookup for the list-to-map link (ticket 024). Separate from MapRenderer so existing fakes still compile. */
export interface MapPlaces {
  /** Lamp id whose place is under the canvas point (CSS px), via the same fit and pan as drawing; null otherwise. */
  placeAt(x: number, y: number): string | null;
}

/** View control for the pan (ticket 022). Separate from MapRenderer so existing fakes still compile. */
export interface MapPanView {
  /** Current pan in CSS px, added to the centred fit. {0,0} = centred in the free area. */
  getPan(): Pan;
  /** Pan to (x, y), clamped (clampPan); rebuilds geometry so drawing and hitTest move together. Returns the clamped pan. */
  setPan(x: number, y: number): Pan;
  /** Back to the opening view: a map that fits is centred ({0,0}); one that overflows opens with its first feed at the free area's centre. */
  resetView(): void;
  /** Current scale in px per unit (ticket 027 A4). */
  getScale(): number;
  /** One zoom level in (+1) or out (-1) about canvas point (x, y), default the free area's centre; clamped at the ends. Returns the new scale. */
  zoomStep(dir: 1 | -1, x?: number, y?: number): number;
  /** The whole map: the smallest zoom scale, map centred. */
  fitWhole(): void;
}

/** Centre the view on a node (ticket 027). Separate from MapPanView so existing fakes still compile. */
export interface MapCentre {
  /** Pan so the node sits at the free area's centre (clamped); an unknown id changes nothing. Returns the pan. */
  centreOn(nodeId: string): Pan;
}

