/**
 * What a place looks like and where its label goes (tickets 024 A2, A3), as pure data. No DOM, no canvas.
 * Shapes are in map units; label boxes and obstacles are in CSS px. Boxes use x,y as the CENTRE unless a
 * name says `PxRect` (top-left).
 */

import { placeBase, type GridNode, type Puzzle } from "../core";
import { circuitStreets, feedLanes, nodeClearPx, placeParts, type Building, type Place } from "./city";
import { lampCaption } from "./labels";
import { clusterRadius } from "./load";

/**
 * One drawn piece of a place. rect and disc: x,y centre, w,h size (a disc's or ring's diameter is w).
 * line: (x,y) to (w,h). ring: a hollow circle, stroke only. role body: filled with the place fill and
 * edged; edge: a thin dark accent; outline: stroke only.
 */
export interface Prim {
  s: "rect" | "disc" | "ring" | "line";
  role: "body" | "edge" | "outline";
  x: number;
  y: number;
  w: number;
  h: number;
  /** True if the piece takes the warm tint when the lamp is lit. */
  glow: boolean;
  dashed?: boolean;
}

const rect = (role: Prim["role"], x: number, y: number, w: number, h: number, glow: boolean, dashed?: boolean): Prim =>
  dashed ? { s: "rect", role, x, y, w, h, glow, dashed } : { s: "rect", role, x, y, w, h, glow };
const disc = (role: Prim["role"], x: number, y: number, d: number, glow: boolean): Prim => ({ s: "disc", role, x, y, w: d, h: d, glow });
const ring = (x: number, y: number, d: number): Prim => ({ s: "ring", role: "outline", x, y, w: d, h: d, glow: false });
const line = (x1: number, y1: number, x2: number, y2: number): Prim => ({ s: "line", role: "edge", x: x1, y: y1, w: x2, h: y2, glow: false });

function home(b: Building): Prim[] {
  const wide = b.w >= b.h;
  const a = 0.35;
  return [rect("body", b.x, b.y, b.w, b.h, true), wide ? line(b.x - b.w * a, b.y, b.x + b.w * a, b.y) : line(b.x, b.y - b.h * a, b.x, b.y + b.h * a)];
}

/**
 * The pieces of a place, one plain top-down plan per kind, from its kind and box. A street light, and any
 * pool, has none: its light is drawn per frame and nothing is drawn while it is dark.
 */
export function placeShapes(p: Place): Prim[] {
  if (p.pool) return [];
  const { x, y, w, h } = p;
  switch (p.kind) {
    case "sacred": {
      // A cross plan; bell and tower are the same, smaller, with a dome in the middle.
      const b = placeBase(p.lamp);
      const small = b === "bell" || b === "tower";
      const long = Math.min(w, h) * 0.9;
      const bar = long * 0.4;
      return [rect("body", x, y, long, bar, true), rect("body", x, y, bar, long, true), disc("edge", x, y, bar * (small ? 0.55 : 0.5), false)];
    }
    case "water":
      return [ring(x, y, Math.min(w, h))];
    case "mill": {
      const r = 0.3;
      const e = Math.min(w, h) / 2;
      const k = r * Math.SQRT1_2;
      return [
        disc("body", x, y, 2 * r, true),
        line(x - k, y - k, x - e, y - e),
        line(x + k, y - k, x + e, y - e),
        line(x - k, y + k, x - e, y + e),
        line(x + k, y + k, x + e, y + e),
      ];
    }
    case "gate":
      return placeParts(p).map((q) => rect("body", q.x, q.y, q.w, q.h, true));
    case "work": {
      const bar = 0.6;
      const l = w;
      const top = y - h / 2;
      return [
        rect("body", x, top + bar / 2, l, bar, true),
        rect("body", x - l / 2 + bar / 2, top + bar + bar / 2, bar, bar, true),
        rect("edge", x + l / 2 - 0.2, top + 0.2, 0.15, 0.15, false),
      ];
    }
    case "market": {
      const s = 0.25;
      const o = Math.min(w, h) / 4;
      return [
        rect("outline", x, y, w, h, false, true),
        rect("body", x - o, y - o, s, s, true),
        rect("body", x + o, y - o, s, s, true),
        rect("body", x - o, y + o, s, s, true),
        rect("body", x + o, y + o, s, s, true),
      ];
    }
    case "hall": {
      const bh = Math.min(h, 1.0);
      return [
        rect("body", x, y, w, bh, true),
        line(x - w * 0.4, y, x + w * 0.4, y),
        rect("edge", x, y + bh / 2 + (h - bh) / 4, 0.3, (h - bh) / 2, false),
      ];
    }
    case "homes": {
      const out: Prim[] = [];
      for (const q of placeParts(p)) for (const s of home(q)) out.push(s);
      return out;
    }
    case "home":
      return home(p);
    case "streetlight":
      return [];
  }
}

/** A stable description of a place's pieces: how many of each shape, for telling the kinds apart. */
export function shapeSignature(shapes: readonly Prim[]): string {
  const n = { rect: 0, disc: 0, ring: 0, line: 0 };
  for (const s of shapes) n[s.s]++;
  return `rect${n.rect} disc${n.disc} ring${n.ring} line${n.line}`;
}

// ---- labels (ticket 024 A3: they never clip) ----

export const LABEL_FONT_PX = 11;
/** Rough glyph width of the 11 px label font, for tests and for a first guess (the renderer measures). */
export const LABEL_GLYPH_PX = 6.2;
/** Gap in px between a place and its label. */
export const LABEL_GAP_PX = 4;
export const LABEL_H_PX = 14;
/** Px kept between a label and the edge of the free area. */
export const LABEL_EDGE_PX = 4;
/** A label keeps this far (px) from a wire. */
export const LABEL_WIRE_CLEAR_PX = 10;

/** A px box with its top-left corner. */
export interface PxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface PxSeg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}
export interface PxDisc {
  x: number;
  y: number;
  r: number;
}
/** What a label must stay clear of, all in px: boxes (Lv captions, stars, places, other labels), wires, node discs. */
export interface LabelObstacles {
  rects: readonly PxRect[];
  /** Wires, each kept `LABEL_WIRE_CLEAR_PX` away. */
  segs: readonly PxSeg[];
  /** Node centres with their `nodeClearPx`. */
  discs: readonly PxDisc[];
}

/** Distance from a segment to a px box (0 if they touch). */
export function segRectDistance(s: PxSeg, r: PxRect): number {
  const x0 = r.x;
  const x1 = r.x + r.w;
  const y0 = r.y;
  const y1 = r.y + r.h;
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  let t0 = 0;
  let t1 = 1;
  let crosses = true;
  for (let i = 0; i < 4; i++) {
    const p = i === 0 ? -dx : i === 1 ? dx : i === 2 ? -dy : dy;
    const q = i === 0 ? s.ax - x0 : i === 1 ? x1 - s.ax : i === 2 ? s.ay - y0 : y1 - s.ay;
    if (p === 0) {
      if (q < 0) crosses = false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  if (crosses && t0 <= t1) return 0;
  let best = Infinity;
  for (let e = 0; e < 2; e++) {
    const px = e === 0 ? s.ax : s.bx;
    const py = e === 0 ? s.ay : s.by;
    best = Math.min(best, Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(y0 - py, 0, py - y1)));
  }
  const len2 = dx * dx + dy * dy;
  for (let k = 0; k < 4; k++) {
    const px = k & 1 ? x1 : x0;
    const py = k & 2 ? y1 : y0;
    let t = len2 > 0 ? ((px - s.ax) * dx + (py - s.ay) * dy) / len2 : 0;
    t = Math.min(Math.max(t, 0), 1);
    best = Math.min(best, Math.hypot(px - (s.ax + t * dx), py - (s.ay + t * dy)));
  }
  return best;
}

function insideArea(b: PxRect, area: PxRect): boolean {
  return b.x >= area.x && b.y >= area.y && b.x + b.w <= area.x + area.w && b.y + b.h <= area.y + area.h;
}

/** True if the box overlaps no obstacle box, keeps `LABEL_WIRE_CLEAR_PX` from every wire and the disc radius from every node. */
export function labelClear(b: PxRect, obs: LabelObstacles): boolean {
  for (let i = 0; i < obs.rects.length; i++) {
    const r = obs.rects[i]!;
    if (b.x < r.x + r.w && r.x < b.x + b.w && b.y < r.y + r.h && r.y < b.y + b.h) return false;
  }
  for (let i = 0; i < obs.segs.length; i++) {
    const s = obs.segs[i]!;
    if (Math.max(s.ax, s.bx) < b.x - LABEL_WIRE_CLEAR_PX || Math.min(s.ax, s.bx) > b.x + b.w + LABEL_WIRE_CLEAR_PX) continue;
    if (Math.max(s.ay, s.by) < b.y - LABEL_WIRE_CLEAR_PX || Math.min(s.ay, s.by) > b.y + b.h + LABEL_WIRE_CLEAR_PX) continue;
    if (segRectDistance(s, b) < LABEL_WIRE_CLEAR_PX - 1e-9) return false;
  }
  for (let i = 0; i < obs.discs.length; i++) {
    const d = obs.discs[i]!;
    const nx = Math.max(b.x, Math.min(d.x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(d.y, b.y + b.h));
    if (Math.hypot(d.x - nx, d.y - ny) < d.r - 1e-9) return false;
  }
  return true;
}

/** The free area a label must lie wholly inside: the canvas minus the insets, minus `LABEL_EDGE_PX` on every side. */
export function labelArea(free: { left: number; top: number; right: number; bottom: number }): PxRect {
  return { x: free.left + LABEL_EDGE_PX, y: free.top + LABEL_EDGE_PX, w: Math.max(free.right - free.left - 2 * LABEL_EDGE_PX, 0), h: Math.max(free.bottom - free.top - 2 * LABEL_EDGE_PX, 0) };
}

/**
 * Where a target's label goes, in px (top-left box), or null to hide it. It tries the four sides of the
 * place in order: the side away from the lamp, the two sides across, then the near side. The first box
 * fully inside `area` and clear of every obstacle wins. If none does, the far-side box is shifted (clamped)
 * into `area` and checked again; if it is still blocked the label is hidden.
 * `lamp` and `place` are in map units; `fit` maps them to px.
 */
export function placeLabel(
  place: Place,
  lamp: { x: number; y: number },
  area: PxRect,
  obstacles: LabelObstacles,
  textW: number,
  textH: number,
  fit: { scale: number; offsetX: number; offsetY: number },
): PxRect | null {
  const l = (place.x - place.w / 2) * fit.scale + fit.offsetX;
  const t = (place.y - place.h / 2) * fit.scale + fit.offsetY;
  const r = l + place.w * fit.scale;
  const b = t + place.h * fit.scale;
  const cx = (l + r) / 2;
  const cy = (t + b) / 2;
  const dx = place.x - lamp.x;
  const dy = place.y - lamp.y;
  // Side codes: 0 right, 1 left, 2 below, 3 above.
  const far = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 1) : dy >= 0 ? 2 : 3;
  const near = far ^ 1;
  const across = far < 2 ? [2, 3] : [0, 1];
  const order = [far, across[0]!, across[1]!, near];
  const box = (side: number): PxRect =>
    side === 0
      ? { x: r + LABEL_GAP_PX, y: cy - textH / 2, w: textW, h: textH }
      : side === 1
        ? { x: l - LABEL_GAP_PX - textW, y: cy - textH / 2, w: textW, h: textH }
        : side === 2
          ? { x: cx - textW / 2, y: b + LABEL_GAP_PX, w: textW, h: textH }
          : { x: cx - textW / 2, y: t - LABEL_GAP_PX - textH, w: textW, h: textH };
  for (const side of order) {
    const c = box(side);
    if (insideArea(c, area) && labelClear(c, obstacles)) return c;
  }
  const s = box(far);
  s.x = Math.min(Math.max(s.x, area.x), area.x + area.w - s.w);
  s.y = Math.min(Math.max(s.y, area.y), area.y + area.h - s.h);
  if (insideArea(s, area) && labelClear(s, obstacles)) return s;
  return null;
}

// ---- lamp captions and stars (ticket 026) ----

/** Lamp caption: 10 px font, 6 px per glyph + 4 wide, 14 tall, centred at y + cr + 10. */
export const CAPTION_DY = 10;
/** Target star: a 14 x 14 box centred at y - cr - 13. */
export const STAR_DY = 13;
export const CAPTION_H_PX = 14;
export const STAR_BOX_PX = 14;

/** The Lv caption box and the target star box of a lamp at px (x, y), top-left boxes. Allocates; not for the draw loop. */
export function lampMarks(node: GridNode, x: number, y: number): PxRect[] {
  const load = node.type === "lamp" ? (node.load ?? 1) : 1;
  const cr = clusterRadius(load);
  const capW = lampCaption(load).length * 6 + 4;
  return [
    { x: x - capW / 2, y: y + cr + CAPTION_DY - CAPTION_H_PX / 2, w: capW, h: CAPTION_H_PX },
    { x: x - STAR_BOX_PX / 2, y: y - cr - STAR_DY - STAR_BOX_PX / 2, w: STAR_BOX_PX, h: STAR_BOX_PX },
  ];
}

// ---- picking ----

/** Lamp id whose place holds the canvas point, under the fit that draws the map (pan included); null otherwise. */
export function placeAtPoint(places: readonly Place[], fit: { scale: number; offsetX: number; offsetY: number }, x: number, y: number): string | null {
  const mx = (x - fit.offsetX) / fit.scale;
  const my = (y - fit.offsetY) / fit.scale;
  // A building wins over a street light's pool box where they overlap.
  for (let i = 0; i < places.length; i++) {
    const p = places[i]!;
    if (p.pool) continue;
    const parts = placeParts(p);
    for (let k = 0; k < parts.length; k++) {
      const q = parts[k]!;
      if (Math.abs(mx - q.x) <= q.w / 2 && Math.abs(my - q.y) <= q.h / 2) return p.lamp;
    }
  }
  for (let i = 0; i < places.length; i++) {
    const p = places[i]!;
    if (p.pool && Math.abs(mx - p.x) <= p.w / 2 && Math.abs(my - p.y) <= p.h / 2) return p.lamp;
  }
  return null;
}

// ---- all the target labels of a map ----

/**
 * Every place's label box (px, top-left) for a fit and a free area, or null where there is none or it is
 * hidden. Obstacles are the wires, every node's `nodeClearPx` disc, each lamp's Lv caption and target star,
 * every place and each label already placed. `measure` gives a text's width in px.
 */
export function targetLabels(
  puzzle: Puzzle,
  places: readonly Place[],
  fit: { scale: number; offsetX: number; offsetY: number },
  free: { left: number; top: number; right: number; bottom: number },
  measure: (text: string) => number,
): (PxRect | null)[] {
  const sc = fit.scale;
  const area = labelArea(free);
  const segs: PxSeg[] = [];
  for (const l of circuitStreets(puzzle).lanes.concat(feedLanes(puzzle))) {
    segs.push({ ax: l.ax * sc + fit.offsetX, ay: l.ay * sc + fit.offsetY, bx: l.bx * sc + fit.offsetX, by: l.by * sc + fit.offsetY });
  }
  const discs: PxDisc[] = [];
  const rects: PxRect[] = [];
  const lamp = new Map<string, { x: number; y: number }>();
  for (const n of puzzle.nodes) {
    const x = n.pos[0] * sc + fit.offsetX;
    const y = n.pos[1] * sc + fit.offsetY;
    discs.push({ x, y, r: nodeClearPx(n) });
    if (n.type === "lamp") {
      lamp.set(n.id, { x: n.pos[0], y: n.pos[1] });
      // The Lv caption under the lamp and the target star above it.
      for (const m of lampMarks(n, x, y)) rects.push(m);
    }
  }
  for (const p of places) {
    if (p.pool) continue;
    for (const q of placeParts(p)) rects.push({ x: (q.x - q.w / 2) * sc + fit.offsetX, y: (q.y - q.h / 2) * sc + fit.offsetY, w: q.w * sc, h: q.h * sc });
  }
  const obs: LabelObstacles = { rects, segs, discs };
  const out: (PxRect | null)[] = [];
  for (const p of places) {
    const at = lamp.get(p.lamp);
    if (p.label === null || !at) {
      out.push(null);
      continue;
    }
    const box = placeLabel(p, at, area, obs, measure(p.label), LABEL_H_PX, fit);
    if (box) rects.push(box);
    out.push(box);
  }
  return out;
}
