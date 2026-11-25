import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EventBus, loadPuzzle } from "../core";
import { createGrid } from "../grid";
import { PADDING, buildGeometry } from "./geometry";
import { NODE_DEAD, NODE_LIVE, drawBreakerGlyph, drawFeedGlyph, drawFuseBoxGlyph, drawJunctionGlyph, drawNodeGlyph, drawSwitchGlyph, type GlyphContext } from "../render3d/glyphs";
import { createMapRenderer } from "./map-renderer";

const W = 1800;
const H = 1300;
const puzzle = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "64-the-whole-chain.json"), "utf8")));

/** A context that records every call and every property set as a string, in order. */
function recorder(): { ctx: GlyphContext; log: string[] } {
  const log: string[] = [];
  const store: Record<string, unknown> = {};
  const ctx = new Proxy(store, {
    get: (t, p: string) => (p === "measureText" ? (s: string) => ({ width: s.length * 6 }) : p in t ? t[p] : (...a: unknown[]) => void log.push(`${p}(${a.join(",")})`)),
    set: (t, p: string, v) => {
      t[p] = v;
      log.push(`${p}=${String(v)}`);
      return true;
    },
  });
  return { ctx: ctx as unknown as GlyphContext, log };
}

function fakeCanvas(ctx: GlyphContext): HTMLCanvasElement {
  return { clientWidth: W, clientHeight: H, width: W, height: H, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

function contains(hay: string[], needle: string[]): boolean {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let k = 0; k < needle.length; k++) if (hay[i + k] !== needle[k]) continue outer;
    return true;
  }
  return false;
}

describe("glyphs (ticket 081 E1)", () => {
  it("the map renderer's frame holds each glyph's calls, in the same order", () => {
    const { ctx, log } = recorder();
    const r = createMapRenderer(fakeCanvas(ctx), puzzle);
    const state = createGrid(puzzle, new EventBus()).state();
    r.draw(state, {}, 1.2);
    const g = buildGeometry(puzzle, W, H, PADDING, undefined, r.getPan(), r.getScale());
    const seen = new Set<string>();
    for (let i = 0; i < g.nodeIds.length; i++) {
      const n = puzzle.nodes.find((q) => q.id === g.nodeIds[i])!;
      const x = g.nx[i]!;
      const y = g.ny[i]!;
      if (x < 0 || y < 0 || x > W || y > H) continue;
      const one = recorder();
      if (n.type === "feed") drawFeedGlyph(one.ctx, x, y, state.powered.has(n.id));
      else if (n.type === "breaker") drawBreakerGlyph(one.ctx, x, y, state.breakers.get(n.id) ?? n.closed, state.powered.has(n.id));
      else if (n.type === "junction" && !state.readableFaults.size) drawJunctionGlyph(one.ctx, x, y);
      else if (n.type === "fusebox") drawFuseBoxGlyph(one.ctx, x, y, false, state.powered.has(n.id) ? NODE_LIVE : NODE_DEAD);
      else if (n.type === "switch") {
        const sel = state.switches.get(n.id) ?? n.selected;
        const dir = (s: number) => {
          const li = g.lineIndex.get(n.outputs[s]!)!;
          const o = g.fromIdx[li] === i ? g.toIdx[li]! : g.fromIdx[li]!;
          const l = Math.hypot(g.nx[o]! - x, g.ny[o]! - y) || 1;
          return [(g.nx[o]! - x) / l, (g.ny[o]! - y) / l] as const;
        };
        const [lx, ly] = dir(sel);
        const [ox, oy] = dir(sel === 0 ? 1 : 0);
        const live = state.powered.has(n.id);
        drawSwitchGlyph(one.ctx, x, y, live, n.relay === true && !live, n.relay === true, n.spring === true, ox, oy, lx, ly);
        if (n.relay === true) seen.add("relay");
        if (n.spring === true) seen.add("spring");
      } else continue;
      expect(contains(log, one.log), `${n.type} ${n.id}`).toBe(true);
      seen.add(n.type);
    }
    for (const t of ["feed", "breaker", "switch", "relay", "spring", "fusebox", "junction"]) expect(seen.has(t), t).toBe(true);
  });

  it("an icon draw is balanced (save and restore) and scales with its size", () => {
    const a = recorder();
    drawNodeGlyph(a.ctx, { type: "breaker", live: true, closed: true, selected: 0, broken: false, lit: false, target: false, charge: 0, faulted: false }, 50, 60, 60);
    expect(a.log.filter((s) => s === "save()")).toHaveLength(1);
    expect(a.log.filter((s) => s === "restore()")).toHaveLength(1);
    expect(a.log).toContain("scale(2,2)");
    expect(a.log).toContain("translate(50,60)");
  });
});
