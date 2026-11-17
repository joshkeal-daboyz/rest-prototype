/**
 * The words the 3D view puts beside its objects (ticket 037 B), from the Puzzle and GridState only. Pure: no three, no DOM.
 * The level words come from the 2D view's own helpers, so the two views read the same.
 */

import type { Puzzle } from "../core";
import type { GridState } from "../grid";
import { cityPlaces } from "../render/city";
import { createFeedCaptions } from "../render/feedcaps";
import { fuseFill, fuseStep, fuseTickOffsets, type FuseBarStep } from "../render/fusebar";
import { fuseCaption, lampCaption } from "../render/labels";

/**
 * The breaker's words. 2D draws them inline (`closed ? "ON" : "OFF"` in src/render/map-renderer.ts) with no helper to import,
 * so they are copied here and a test reads that file to fail if 2D's change.
 */
export const BREAKER_ON = "ON";
export const BREAKER_OFF = "OFF";

export type CaptionTone = "text" | "dim" | "alarm";

export interface NodeCaption {
  /** Top line first. Empty when the node carries no words. The same array reference while the words are unchanged. */
  lines: string[];
  tone: CaptionTone;
  /** Fuse box: the load bar's fill (0..1), colour step, tick count, and whether the fuse is blown (readable). */
  fill?: number;
  step?: FuseBarStep;
  ticks?: number;
  blown?: boolean;
  /** Lamp: a target, lit now, and the place name it lights (null unless a target). */
  target?: boolean;
  lit?: boolean;
  place?: string | null;
  /** Switch: the line id its lever feeds. */
  selectedLine?: string;
}

export interface CaptionSet {
  /** Refresh every node's record from the state, in place, and return the map (one record per node id). */
  update(state: GridState): ReadonlyMap<string, NodeCaption>;
}

/** Font sizes in css px, as in 2D (12px body, bold 15px for the feed). */
export const CAPTION_FONT_PX = 12;
export const FEED_FONT_PX = 15;

/** On-screen height in css px of text of `fontPx` in a sprite of `spriteCssHeight` whose scale.y is `scaleY`, with sizeAttenuation off. */
export function captionTextPx(scaleY: number, spriteCssHeight: number, fontPx: number, viewportHeight: number, fovDeg: number): number {
  const pxPerScale = viewportHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
  return (scaleY * pxPerScale * fontPx) / spriteCssHeight;
}

/** The sprite scale.y that makes a sprite `cssHeight` px tall on screen (sizeAttenuation off). */
export function scaleForPx(cssPx: number, viewportHeight: number, fovDeg: number): number {
  return (cssPx * 2 * Math.tan((fovDeg * Math.PI) / 360)) / viewportHeight;
}

export function captionsFor(puzzle: Puzzle): CaptionSet {
  const feeds = createFeedCaptions(puzzle);
  const feedOfNode = new Map<string, number>();
  for (let k = 0; k < feeds.nodeIdx.length; k++) feedOfNode.set(puzzle.nodes[feeds.nodeIdx[k]!]!.id, k);
  const places = new Map(cityPlaces(puzzle).map((p) => [p.lamp, p.label] as const));
  const allTargets = !puzzle.target || puzzle.target.length === 0;
  const targets = new Set(puzzle.target ?? []);

  const records = new Map<string, NodeCaption>();
  for (const n of puzzle.nodes) records.set(n.id, { lines: [], tone: "text" });

  /** Keep the old array when the words are the same, so unchanged state makes no new strings. */
  const settle = (rec: NodeCaption, next: readonly string[]): void => {
    const same = rec.lines.length === next.length && rec.lines.every((s, i) => s === next[i]);
    if (!same) rec.lines = [...next];
  };

  return {
    update(state) {
      feeds.update(state);
      for (const n of puzzle.nodes) {
        const rec = records.get(n.id)!;
        switch (n.type) {
          case "feed": {
            const k = feedOfNode.get(n.id) ?? 0;
            const over = feeds.isOver(k, state);
            const head = feeds.heading[k] ?? "";
            settle(rec, [...(head ? [head] : []), feeds.name[k] ?? "", over ? (feeds.alarm[k] ?? "") : (feeds.using[k] ?? "")]);
            rec.tone = over ? "alarm" : "text";
            break;
          }
          case "breaker": {
            const closed = state.breakers.get(n.id) ?? n.closed;
            settle(rec, [closed ? BREAKER_ON : BREAKER_OFF]);
            rec.tone = closed ? "text" : "dim";
            break;
          }
          case "fusebox": {
            const caption = fuseCaption(n.rating);
            settle(rec, caption ? [caption] : []);
            let blown = false;
            for (const f of state.faults) if (f.at === n.id && f.kind === "blown-fuse" && state.readableFaults.has(f.id)) blown = true;
            const fill = blown ? 0 : fuseFill(state.fuseLoad.get(n.id) ?? 0, n.rating);
            rec.fill = fill;
            rec.step = fuseStep(fill);
            rec.ticks = n.rating === undefined ? 0 : fuseTickOffsets(n.rating).length;
            rec.blown = blown;
            rec.tone = blown ? "alarm" : "text";
            break;
          }
          case "lamp": {
            settle(rec, [lampCaption(n.load ?? 1)]);
            rec.target = allTargets || targets.has(n.id);
            rec.lit = state.lit.has(n.id);
            rec.place = places.get(n.id) ?? null;
            rec.tone = "text";
            break;
          }
          case "switch": {
            rec.selectedLine = n.outputs[state.switches.get(n.id) ?? n.selected];
            break;
          }
          default:
            break;
        }
      }
      return records;
    },
  };
}
