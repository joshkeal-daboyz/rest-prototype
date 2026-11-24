/**
 * The overlay's icons and lines for a city puzzle (ticket 081 E1, from 071 E). Pure: no three, no DOM. It lays out one icon per component and one polyline per line,
 * live or dead, from the converted puzzle, the grid state and a projection the caller passes in. The glyphs the icons are drawn with are `src/render/glyphs.ts`'s
 * (`glyphSpec` gives each icon's drawing); the 2D map's pulse phase and flicker are `src/render/motion.ts`'s. The state reads by shape (guide chapter 12): a breaker's
 * lever, a switch's chevron, a fuse box's snapped bar, a lamp's bulb and rays, a target's star, a line's moving chevrons and a cut's sparks.
 */

import type { CityCircuitLayer } from "../core/cityplan";
import type { CityNodePlace, CityPuzzleConverted } from "../core/citycircuit";
import type { GridNode } from "../core";
import type { GridState } from "../grid";
import type { GlyphSpec, GlyphType } from "../render/glyphs";
import { PULSE_SPACING, flicker, pulsePhase } from "../render/motion";
import { nodeLook, wireLook, type NodeLook, type WireLook } from "./look";

/** An icon's nudge, in CSS px, when it sits closer than its own size to an earlier one. */
export const OVERLAY_NUDGE = 14;
/** The least a hit circle is across, in CSS px (the touch-target floor), at every zoom. */
export const OVERLAY_HIT_PX = 44;
/** An icon's size range in CSS px; it grows with the zoom between them. */
export const OVERLAY_ICON_MIN_PX = 24;
export const OVERLAY_ICON_MAX_PX = 40;
/** Where a node on a pole, a lamp post or a roof stands above the ground, in metres, when its place has no height of its own. */
export const OVERLAY_POLE_Y_M = 7;
export const OVERLAY_POST_Y_M = 3;

/** Fills `out` with the screen point (CSS px) of a world point in metres and returns true; returns false when the point is behind the camera. */
export type Project = (x_m: number, y_m: number, z_m: number, out: { x: number; y: number }) => boolean;

export interface OverlayContext {
  /** The city's circuit layer (stage 6): where every pole, span, drop and post is. */
  readonly layer: CityCircuitLayer;
  /** The canvas size, CSS px. A point outside it is off screen. */
  readonly width: number;
  readonly height: number;
  /** Seconds, for the pulse phase and the brownout flicker. */
  readonly time: number;
  /** CSS px per metre at the camera's focus; sizes the icons. Default: the minimum size. */
  readonly pxPerMetre?: number;
}

export interface OverlayIcon {
  readonly id: string;
  readonly type: GlyphType;
  readonly x: number;
  readonly y: number;
  /** Drawn size, px across. */
  readonly size: number;
  /** Hit circle diameter, px: at least `OVERLAY_HIT_PX`. */
  readonly hit: number;
  /** The state `look.ts` gives the 3D view. */
  readonly look: NodeLook;
  /** What `drawNodeGlyph` draws. */
  readonly spec: GlyphSpec;
}

export interface OverlayCut {
  readonly x: number;
  readonly y: number;
  /** Sparks only while current reaches the break. */
  readonly sparking: boolean;
}

export interface OverlayLine {
  readonly id: string;
  readonly look: WireLook;
  /** Current is on it. */
  readonly live: boolean;
  /** Screen points x0, y0, x1, y1: one straight segment, ordered away from the source when live. */
  readonly points: readonly number[];
  /** Per point: it projected in front of the camera. A segment is drawn only between two visible points. */
  readonly visible: readonly boolean[];
  /** The 2D map's pulse phase as a fraction 0..1 of the spacing between chevrons; the first chevron sits at phase, then every 1. */
  readonly phase: number;
  /** 1 outside a brownout; in one, the 2D flicker 0.15..1, per line. */
  readonly flicker: number;
  /** The break icon at the segment's midpoint of a damaged cable whose fault is readable, or null. */
  readonly cut: OverlayCut | null;
}

interface World {
  x: number;
  y: number;
  z: number;
}

function iconSize(ctx: OverlayContext): number {
  const s = (ctx.pxPerMetre ?? 0) * 2.5;
  return s < OVERLAY_ICON_MIN_PX ? OVERLAY_ICON_MIN_PX : s > OVERLAY_ICON_MAX_PX ? OVERLAY_ICON_MAX_PX : s;
}

/** The world point of a node's place, or null if the layer does not hold it. */
function placePoint(place: CityNodePlace, layer: CityCircuitLayer, out: World): boolean {
  if ("pole" in place) {
    for (const p of layer.poles) if (p.id === place.pole) return (out.x = p.x_m), (out.y = OVERLAY_POLE_Y_M), (out.z = p.z_m), true;
    return false;
  }
  if ("building" in place) {
    for (const d of layer.drops) if (d.building === place.building) return (out.x = d.x_m), (out.y = d.y_m), (out.z = d.z_m), true;
    return false;
  }
  if ("roof" in place) {
    for (const r of layer.roofs ?? []) if (r.id === place.roof) return (out.x = r.x_m), (out.y = r.deck_y_m), (out.z = r.z_m), true;
    return false;
  }
  for (const p of layer.posts) if (p.span === place.post) return (out.x = p.x_m), (out.y = OVERLAY_POST_Y_M), (out.z = p.z_m), true;
  return false;
}

function specOf(n: GridNode, state: GridState, look: NodeLook, targets: ReadonlySet<string>): GlyphSpec {
  const bs = n.type === "battery" ? state.batteries.get(n.id) : undefined;
  return {
    type: n.type,
    live: look.live,
    closed: look.closed ?? false,
    selected: look.selected ?? 0,
    broken: look.faulted && (n.type === "fusebox" || n.type === "junction"),
    lit: look.lit,
    target: n.type === "lamp" && targets.has(n.id),
    charge: bs && bs.capacity > 0 ? bs.charge / bs.capacity : 0,
    faulted: look.faulted && n.type !== "fusebox" && n.type !== "junction",
  };
}

/**
 * One icon per component of the puzzle, in the file's order. An icon whose point is behind the camera or off screen is omitted; the rest keep their place, and a later
 * icon closer than the icon size to an earlier one is nudged by `OVERLAY_NUDGE` away from it (neither is dropped).
 */
export function overlayIcons(converted: CityPuzzleConverted, state: GridState, project: Project, ctx: OverlayContext): OverlayIcon[] {
  const puzzle = converted.puzzle;
  const targets = new Set<string>(puzzle.target ?? []);
  const size = iconSize(ctx);
  const hit = size < OVERLAY_HIT_PX ? OVERLAY_HIT_PX : size;
  const w: World = { x: 0, y: 0, z: 0 };
  const s = { x: 0, y: 0 };
  const out: OverlayIcon[] = [];
  for (const n of puzzle.nodes) {
    const place = converted.places[n.id];
    if (!place || !placePoint(place, ctx.layer, w)) continue;
    if (!project(w.x, w.y, w.z, s)) continue;
    if (s.x < 0 || s.y < 0 || s.x > ctx.width || s.y > ctx.height) continue;
    let x = s.x;
    let y = s.y;
    for (const o of out) {
      const dx = x - o.x;
      const dy = y - o.y;
      const d = Math.hypot(dx, dy);
      if (d >= size) continue;
      if (d === 0) x += OVERLAY_NUDGE;
      else {
        x += (dx / d) * OVERLAY_NUDGE;
        y += (dy / d) * OVERLAY_NUDGE;
      }
      break;
    }
    const look = nodeLook(state, n.id);
    out.push({ id: n.id, type: n.type, x, y, size, hit, look, spec: specOf(n, state, look, targets) });
  }
  return out;
}

/** The icon whose hit circle holds (x, y), nearest first, or null. */
export function overlayHit(icons: readonly OverlayIcon[], x: number, y: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const o of icons) {
    const d = Math.hypot(x - o.x, y - o.y);
    if (d <= o.hit / 2 && d < bestD) {
      best = o.id;
      bestD = d;
    }
  }
  return best;
}

/**
 * One straight segment per puzzle line, from its from-node's place to its to-node's (Josh, 23 Nov 2026: "Straight, piece to piece"); carriers and spans play no part.
 * Ordered away from the source when live (so pulses move away from the feed); `phase` is the 2D map's pulse phase as a fraction of the chevron spacing; `flicker`
 * dips in a brownout for every line. A damaged cable's `cut` is the segment's midpoint and shows only when the fault is readable ("Only when readable"); it sparks only while live.
 */
export function overlayLines(converted: CityPuzzleConverted, state: GridState, project: Project, ctx: OverlayContext): OverlayLine[] {
  const puzzle = converted.puzzle;
  const phase = pulsePhase(ctx.time) / PULSE_SPACING;
  const s = { x: 0, y: 0 };
  const out: OverlayLine[] = [];
  let index = 0;
  for (const line of puzzle.lines) {
    const i = index++;
    const pa = converted.places[line.from];
    const pb = converted.places[line.to];
    const a: World = { x: 0, y: 0, z: 0 };
    const b: World = { x: 0, y: 0, z: 0 };
    if (!pa || !pb || !placePoint(pa, ctx.layer, a) || !placePoint(pb, ctx.layer, b)) continue;
    const live = state.powered.has(line.id);
    if (live && state.flowFrom.get(line.id) === line.to) {
      const t = { ...a };
      Object.assign(a, b);
      Object.assign(b, t);
    }
    const points: number[] = [];
    const visible: boolean[] = [];
    for (const p of [a, b]) {
      const ok = project(p.x, p.y, p.z, s);
      points.push(ok ? s.x : 0, ok ? s.y : 0);
      visible.push(ok);
    }
    let cut: OverlayCut | null = null;
    for (const f of state.faults) {
      if (f.kind !== "damaged-cable" || f.at !== line.id || !state.readableFaults.has(f.id)) continue;
      if (project((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, s)) cut = { x: s.x, y: s.y, sparking: live && state.sparking.has(line.id) };
      break;
    }
    out.push({ id: line.id, look: wireLook(state, line.id), live, points, visible, phase, flicker: state.brownout ? flicker(ctx.time, i) : 1, cut });
  }
  return out;
}
