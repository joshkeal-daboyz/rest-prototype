/**
 * The overlay's icons and break icons for a city puzzle (ticket 081 E1, E4). Pure: no three, no DOM. It lays out one icon per component, and a break icon at each readable cut, from the converted puzzle, the grid state and a projection the caller passes in. No lines: the 3D wires show live and dead (E4). The glyphs the icons are drawn with are `src/render/glyphs.ts`'s
 * (`glyphSpec` gives each icon's drawing). The state reads by shape (guide chapter 12): a breaker's
 * lever, a switch's chevron, a fuse box's snapped bar, a lamp's bulb and rays, a target's star and a cut's sparks.
 */

import type { CityCircuitLayer } from "../core/cityplan";
import type { CityNodePlace, CityPuzzleConverted } from "../core/citycircuit";
import type { GridNode } from "../core";
import type { GridState } from "../grid";
import type { GlyphSpec, GlyphType } from "../render/glyphs";
import { GROUND_POLE_ATTACH_UP_M, type GroundPoleKey } from "../core/powerpoles";
import { nodeLook, type NodeLook } from "./look";

/** An icon's nudge, in CSS px, when it sits closer than its own size to an earlier one. */
export const OVERLAY_NUDGE = 14;
/** The least a hit circle is across, in CSS px (the touch-target floor), at every zoom. */
export const OVERLAY_HIT_PX = 44;
/** An icon's size range in CSS px; it grows with the zoom between them. */
export const OVERLAY_ICON_MIN_PX = 24;
export const OVERLAY_ICON_MAX_PX = 40;
/**
 * 081 W3: where a node on a ground pole stands, in metres: the top of its pole model's wire attachments (`GROUND_POLE_ATTACH_UP_M`), where the wire meets the pole. A pole whose model is not a ground pole (the feed's
 * pick) or not in the layer's `poleModels` has no such height here and gets `OVERLAY_POLE_Y_M`.
 */
export function poleTopM(layer: Pick<CityCircuitLayer, "poleModels">, poleId: string): number {
  const up = GROUND_POLE_ATTACH_UP_M[layer.poleModels[poleId] as GroundPoleKey];
  return up ? Math.max(up[0], up[1], up[2]) : OVERLAY_POLE_Y_M;
}

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

/** A break icon over a damaged cable's cut span (E4). */
export interface OverlayBreak {
  readonly faultId: string;
  readonly lineId: string;
  readonly x: number;
  readonly y: number;
  /** Hit circle diameter, px: at least `OVERLAY_HIT_PX`. */
  readonly hit: number;
  /** Sparks only while current reaches the break. */
  readonly sparking: boolean;
}

export interface World {
  x: number;
  y: number;
  z: number;
}

function iconSize(ctx: OverlayContext): number {
  const s = (ctx.pxPerMetre ?? 0) * 2.5;
  return s < OVERLAY_ICON_MIN_PX ? OVERLAY_ICON_MIN_PX : s > OVERLAY_ICON_MAX_PX ? OVERLAY_ICON_MAX_PX : s;
}

/** The world point of a node's place, or null if the layer does not hold it. */
export function placePoint(place: CityNodePlace, layer: CityCircuitLayer, out: World): boolean {
  if ("pole" in place) {
    for (const p of layer.poles) if (p.id === place.pole) return (out.x = p.x_m), (out.y = poleTopM(layer, p.id)), (out.z = p.z_m), true;
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

/** The break whose hit circle holds (x, y), nearest first, giving its line id, or null (E4). The caller tests icons first. */
export function overlayBreakHit(breaks: readonly OverlayBreak[], x: number, y: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const b of breaks) {
    const d = Math.hypot(x - b.x, y - b.y);
    if (d <= b.hit / 2 && d < bestD) {
      best = b.lineId;
      bestD = d;
    }
  }
  return best;
}

/**
 * One break icon per damaged-cable fault whose fault is readable ("Only when readable"), at the projection of the cut span's point (`cutAt`, metres, null if unknown).
 * Omitted behind the camera or off screen; sparks only while the line is live and sparking. A repaired fault is gone from `state.faults`, so it has none.
 */
export function overlayBreaks(converted: CityPuzzleConverted, state: GridState, cutAt: (spanId: string) => World | null, project: Project, ctx: OverlayContext): OverlayBreak[] {
  const s = { x: 0, y: 0 };
  const hit = Math.max(iconSize(ctx), OVERLAY_HIT_PX);
  const out: OverlayBreak[] = [];
  for (const f of state.faults) {
    if (f.kind !== "damaged-cable" || !state.readableFaults.has(f.id)) continue;
    const span = converted.cuts[f.id];
    const at = span === undefined ? null : cutAt(span);
    if (!at || !project(at.x, at.y, at.z, s)) continue;
    if (s.x < 0 || s.y < 0 || s.x > ctx.width || s.y > ctx.height) continue;
    out.push({ faultId: f.id, lineId: f.at, x: s.x, y: s.y, hit, sparking: state.powered.has(f.at) && state.sparking.has(f.at) });
  }
  return out;
}
