import { describe, expect, it } from "vitest";
import { drawNodeGlyph, type GlyphContext } from "./glyphs";

/** A context that records every call as a string, in order. */
function recorder(): { ctx: GlyphContext; log: string[] } {
  const log: string[] = [];
  const store: Record<string, unknown> = {};
  const ctx = new Proxy(store, {
    get: (t, p: string) => (p === "measureText" ? (s: string) => ({ width: s.length * 6 }) : p in t ? t[p] : (...a: unknown[]) => void log.push(`${p}(${a.join(",")})`)),
    set: (t, p: string, v) => {
      t[p] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as GlyphContext, log };
}

describe("glyphs (ticket 081 X1c)", () => {
  it("an icon draw is balanced (save and restore) and scales with its size", () => {
    const a = recorder();
    drawNodeGlyph(a.ctx, { type: "breaker", live: true, closed: true, selected: 0, broken: false, lit: false, target: false, charge: 0, faulted: false }, 50, 60, 60);
    expect(a.log.filter((s) => s === "save()")).toHaveLength(1);
    expect(a.log.filter((s) => s === "restore()")).toHaveLength(1);
    expect(a.log).toContain("scale(2,2)");
    expect(a.log).toContain("translate(50,60)");
  });
});
