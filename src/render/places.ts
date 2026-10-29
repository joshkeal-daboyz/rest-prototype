/**
 * What a place looks like and where its label goes (ticket 024 A2), as pure data. No DOM, no canvas.
 * Everything is in map units unless a name says `Px`. Boxes use x,y as the CENTRE.
 */

import { placeBase } from "../core";
import { clusterRadius } from "./load";
import { PLACE_SIDES, type Place } from "./city";

/** One drawn piece of a place. rect and circle: x,y centre, w,h size (a circle's diameter is w). line: (x,y) to (w,h). */
export interface Prim {
  s: "rect" | "circle" | "line";
  /** body: filled with the place colour; cut: a darker inset; edge: a thin line or dot in the edge colour. */
  role: "body" | "cut" | "edge";
  x: number;
  y: number;
  w: number;
  h: number;
  /** True if the piece warms up when the lamp is lit. */
  glow: boolean;
}

const rect = (role: Prim["role"], x: number, y: number, w: number, h: number, glow: boolean): Prim => ({ s: "rect", role, x, y, w, h, glow });
const circle = (role: Prim["role"], x: number, y: number, d: number, glow: boolean): Prim => ({ s: "circle", role, x, y, w: d, h: d, glow });
const line = (x1: number, y1: number, x2: number, y2: number): Prim => ({ s: "line", role: "edge", x: x1, y: y1, w: x2, h: y2, glow: false });

/** Radius of a street-light's pool of light on the lane, in map units. */
export const POOL_RADIUS = 0.5;

/** The pieces of a place, from its kind and box. Plain top-down shapes: rects, circles and lines. */
export function placeShapes(p: Place): Prim[] {
  const { x, y, w, h } = p;
  const wide = w >= h;
  const long = wide ? w : h;
  const short = wide ? h : w;
  if (p.pool) return [circle("edge", x, y, 0.2, false)];
  switch (p.kind) {
    case "sacred": {
      const b = placeBase(p.lamp);
      if (b === "bell" || b === "tower") return [rect("body", x, y, w, h, true), circle("edge", x, y, w * 0.4, false)];
      return [rect("body", x, y, w, h, true), rect("cut", x, y, w * 0.5, h * 0.5, false)];
    }
    case "water":
      return [circle("body", x, y, w, true), circle("cut", x, y, w * 0.4, false)];
    case "mill":
      return [
        rect("body", x, y, w, h, true),
        line(x - w / 2, y - h / 2, x + w / 2, y + h / 2),
        line(x + w / 2, y - h / 2, x - w / 2, y + h / 2),
        circle("edge", x, y, w * 0.18, false),
      ];
    case "gate": {
      // Two posts at the ends of a bar; the lamp's lane runs between them.
      const post = short;
      const o = long / 2 - post / 2;
      return wide
        ? [line(x - o, y, x + o, y), rect("body", x - o, y, post, post, true), rect("body", x + o, y, post, post, true)]
        : [line(x, y - o, x, y + o), rect("body", x, y - o, post, post, true), rect("body", x, y + o, post, post, true)];
    }
    case "work": {
      const c = short * 0.3;
      const o = long / 2 - c / 2 - short * 0.08;
      return [rect("body", x, y, w, h, true), wide ? rect("edge", x + o, y, c, c, false) : rect("edge", x, y + o, c, c, false)];
    }
    case "market": {
      const d = Math.min(w, h) * 0.12;
      const dx = w / 4;
      const dy = h / 4;
      return [
        rect("cut", x, y, w, h, true),
        line(x - w / 2, y - h / 2, x + w / 2, y - h / 2),
        line(x + w / 2, y - h / 2, x + w / 2, y + h / 2),
        line(x + w / 2, y + h / 2, x - w / 2, y + h / 2),
        line(x - w / 2, y + h / 2, x - w / 2, y - h / 2),
        circle("edge", x - dx, y - dy, d * 2, false),
        circle("edge", x + dx, y - dy, d * 2, false),
        circle("edge", x - dx, y + dy, d * 2, false),
        circle("edge", x + dx, y + dy, d * 2, false),
      ];
    }
    case "hall":
      return [rect("body", x, y, w, h, true), wide ? line(x - w * 0.4, y, x + w * 0.4, y) : line(x, y - h * 0.4, x, y + h * 0.4)];
    case "homes": {
      // A row of three small houses along the long side.
      const gap = long * 0.04;
      const each = (long - 2 * gap) / 3;
      const out: Prim[] = [];
      for (let i = -1; i <= 1; i++) {
        const o = i * (each + gap);
        out.push(wide ? rect("body", x + o, y, each, short, true) : rect("body", x, y + o, short, each, true));
      }
      return out;
    }
    case "home":
      return [rect("body", x, y, w, h, true), wide ? line(x - w * 0.35, y, x + w * 0.35, y) : line(x, y - h * 0.35, x, y + h * 0.35)];
    case "streetlight":
      return [circle("edge", x, y, 0.2, false)];
  }
}

// ---- labels ----

export const LABEL_FONT_PX = 11;
/** Rough glyph width of the 11 px label font, for placing the box (no measuring in the draw loop). */
export const LABEL_GLYPH_PX = 6.2;
/** Gap in px between a place's far edge and its label. */
export const LABEL_GAP_PX = 4;
export const LABEL_H_PX = 14;

/** Pixel box of a label, relative to its lamp's centre. x,y is the top-left. */
export interface PxBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How far from the lamp's centre (px) a label's near edge must stay so it clears the ring, the Lv caption and the star. */
export function labelKeepOutPx(load: number, vertical: boolean): number {
  const cr = clusterRadius(load);
  return vertical ? cr + 28 : cr + 14;
}

export interface LabelBox extends PxBox {
  /** 0 = text starts at x (left aligned), 1 = ends at x + w (right aligned), 2 = centred on the box. */
  align: 0 | 1 | 2;
}

/**
 * Where a target's label sits: on the place's far side from the lamp (the side `place.side` points
 * away from the lamp), just past its far edge, but never nearer the lamp than the keep-out distance.
 * `lamp` is the lamp's map position; `scale` is px per map unit. Offsets are px from the lamp's centre.
 */
export function placeLabelBox(place: Place, lampX: number, lampY: number, load: number, scale: number, textLength: number): LabelBox {
  const [sx, sy] = PLACE_SIDES[place.side]!;
  const horizontal = sx !== 0;
  const extent = horizontal ? place.w : place.h;
  const textW = Math.max(textLength, 1) * LABEL_GLYPH_PX;
  const far = ((place.x - lampX) * sx + (place.y - lampY) * sy + extent / 2) * scale + LABEL_GAP_PX;
  const dist = Math.max(far, labelKeepOutPx(load, !horizontal));
  const across = horizontal ? (place.y - lampY) * scale : (place.x - lampX) * scale;
  if (horizontal) {
    return { x: sx > 0 ? sx * dist : sx * dist - textW, y: across - LABEL_H_PX / 2, w: textW, h: LABEL_H_PX, align: sx > 0 ? 0 : 1 };
  }
  return { x: across - textW / 2, y: sy > 0 ? dist : -dist - LABEL_H_PX, w: textW, h: LABEL_H_PX, align: 2 };
}

// ---- picking ----

/** Lamp id whose place box holds the canvas point, under the fit that draws the map (pan included); null otherwise. */
export function placeAtPoint(places: readonly Place[], fit: { scale: number; offsetX: number; offsetY: number }, x: number, y: number): string | null {
  const mx = (x - fit.offsetX) / fit.scale;
  const my = (y - fit.offsetY) / fit.scale;
  for (let i = 0; i < places.length; i++) {
    const p = places[i]!;
    if (Math.abs(mx - p.x) <= p.w / 2 && Math.abs(my - p.y) <= p.h / 2) return p.lamp;
  }
  return null;
}
