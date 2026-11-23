import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { EventBus, loadPuzzle } from "../core";
import type { CityCircuitLayer } from "../core/cityplan";
import type { CityPuzzleConverted } from "../core/citycircuit";
import { drawNodeGlyph, type GlyphContext } from "../render/glyphs";
import { createGrid } from "../grid";
import { nodeLook } from "./look";
import { OVERLAY_HIT_PX, OVERLAY_NUDGE, overlayIcons, overlayLines, type OverlayContext, type Project } from "./overlay";

const puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));

/** A synthetic city: one pole per node, 10 m apart on x, one span per line; line l_feed runs through an extra carrier pole. */
function fixture(): { converted: CityPuzzleConverted; layer: CityCircuitLayer } {
  const poles: { id: string; x_m: number; z_m: number }[] = [];
  const places: Record<string, { pole: string }> = {};
  puzzle.nodes.forEach((n, i) => {
    poles.push({ id: `p_${n.id}`, x_m: 10 + i * 10, z_m: 0 });
    places[n.id] = { pole: `p_${n.id}` };
  });
  const spans: { id: string; a: string; b: string }[] = [];
  const runs: Record<string, { spans: string[] }> = {};
  const at = (id: string) => poles.find((p) => p.id === `p_${id}`)!;
  for (const l of puzzle.lines) {
    if (l.id === "l_feed") {
      const a = at(l.from);
      const b = at(l.to);
      poles.push({ id: "carrier", x_m: (a.x_m + b.x_m) / 2, z_m: 5 });
      spans.push({ id: "s_l_feed_1", a: a.id, b: "carrier" }, { id: "s_l_feed_2", a: "carrier", b: b.id });
      runs[l.id] = { spans: ["s_l_feed_1", "s_l_feed_2"] };
    } else {
      spans.push({ id: `s_${l.id}`, a: `p_${l.from}`, b: `p_${l.to}` });
      runs[l.id] = { spans: [`s_${l.id}`] };
    }
  }
  const layer = { stage: "circuit", poles, spans, drops: [], lights: [], posts: [], keep: [], poleModels: {} } as unknown as CityCircuitLayer;
  const cuts: Record<string, string> = {};
  for (const f of puzzle.faults) if (f.kind === "damaged-cable") cuts[f.id] = runs[f.at]!.spans[0]!;
  const converted = { puzzle, places, runs, cuts, origin_m: { x_m: 0, z_m: 0 } } as unknown as CityPuzzleConverted;
  return { converted, layer };
}

/** Looking down: 10 px per metre; a point with x_m below behindX is behind the camera. */
function projector(behindX = -1): Project {
  return (x, _y, z, out) => {
    if (x < behindX) return false;
    out.x = x * 10;
    out.y = 300 + z * 10;
    return true;
  };
}

const ctxOf = (layer: CityCircuitLayer, extra: Partial<OverlayContext> = {}): OverlayContext => ({ layer, width: 2000, height: 600, time: 0.4, ...extra });

describe("overlay icons (ticket 081 E1)", () => {
  it("one icon per component, carrying the state look.ts gives", () => {
    const { converted, layer } = fixture();
    const g = createGrid(puzzle, new EventBus());
    g.throwSwitch("sw_1");
    const s = g.state();
    const icons = overlayIcons(converted, s, projector(), ctxOf(layer));
    expect(icons.map((i) => i.id)).toEqual(puzzle.nodes.map((n) => n.id));
    for (const i of icons) expect(i.look).toEqual(nodeLook(s, i.id));
    expect(icons.find((i) => i.id === "sw_1")!.spec.selected).toBe(1);
  });

  it("omits icons behind the camera or off screen", () => {
    const { converted, layer } = fixture();
    const s = createGrid(puzzle, new EventBus()).state();
    const all = overlayIcons(converted, s, projector(), ctxOf(layer));
    const behind = overlayIcons(converted, s, projector(55), ctxOf(layer));
    expect(behind.length).toBeGreaterThan(0);
    expect(behind.length).toBeLessThan(all.length);
    const narrow = overlayIcons(converted, s, projector(), ctxOf(layer, { width: 120 }));
    expect(narrow.every((i) => i.x <= 120)).toBe(true);
    expect(narrow.length).toBeLessThan(all.length);
  });

  it("nudges a near pair by OVERLAY_NUDGE and drops neither", () => {
    const { converted, layer } = fixture();
    const s = createGrid(puzzle, new EventBus()).state();
    const squeeze: Project = (x, _y, z, out) => ((out.x = x * 0.2), (out.y = 300 + z), true);
    const icons = overlayIcons(converted, s, squeeze, ctxOf(layer));
    expect(icons).toHaveLength(puzzle.nodes.length);
    const first = icons[0]!;
    const second = icons[1]!;
    // The second sits 2 px right of the first before the nudge; the nudge moves it OVERLAY_NUDGE further along that line.
    expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeCloseTo(2 + OVERLAY_NUDGE, 5);
  });

  it("shows state by shape: the draw calls change in more than colour", () => {
    const draw = (spec: Parameters<typeof drawNodeGlyph>[1]): string => {
      const log: string[] = [];
      const store: Record<string, unknown> = {};
      const c = new Proxy(store, {
        get: (t, p: string) => (p in t ? t[p] : (...a: unknown[]) => void log.push(`${p}(${a.join(",")})`)),
        set: (t, p: string, v) => ((t[p] = v), true),
      }) as unknown as GlyphContext;
      drawNodeGlyph(c, spec, 0, 0, 30);
      return log.join("|");
    };
    const base = { type: "breaker", live: false, closed: true, selected: 0, broken: false, lit: false, target: false, charge: 0, faulted: false } as const;
    expect(draw(base)).not.toBe(draw({ ...base, closed: false }));
    expect(draw({ ...base, type: "switch" })).not.toBe(draw({ ...base, type: "switch", selected: 1 }));
    expect(draw({ ...base, type: "fusebox" })).not.toBe(draw({ ...base, type: "fusebox", broken: true }));
    expect(draw({ ...base, type: "lamp" })).not.toBe(draw({ ...base, type: "lamp", lit: true }));
    expect(draw({ ...base, type: "lamp" })).not.toBe(draw({ ...base, type: "lamp", target: true }));
  });

  it("a hit circle is at least OVERLAY_HIT_PX across at every zoom", () => {
    const { converted, layer } = fixture();
    const s = createGrid(puzzle, new EventBus()).state();
    for (const pxPerMetre of [0, 1, 5, 20, 400]) {
      for (const i of overlayIcons(converted, s, projector(), ctxOf(layer, { pxPerMetre }))) expect(i.hit).toBeGreaterThanOrEqual(OVERLAY_HIT_PX);
    }
  });
});

describe("overlay lines (ticket 081 E1)", () => {
  it("a polyline runs through its span ends, carriers included, away from the feed while live", () => {
    const { converted, layer } = fixture();
    const s = createGrid(puzzle, new EventBus()).state();
    const lines = overlayLines(converted, s, projector(), ctxOf(layer));
    const feed = lines.find((l) => l.id === "l_feed")!;
    expect(feed.live).toBe(true);
    expect(feed.look).toBe("live");
    expect(feed.points).toHaveLength(6); // feed pole, carrier, far pole
    expect(feed.points[0]).toBeLessThan(feed.points[4]!); // starts at the feed
    expect(feed.phase).toBeGreaterThanOrEqual(0);
    expect(feed.phase).toBeLessThan(1);
    expect(feed.flicker).toBe(1);
    expect(feed.visible.every(Boolean)).toBe(true);
    const dead = lines.find((l) => !l.live)!;
    expect(dead.look).not.toBe("live");
  });

  it("a damaged span's cut sparks only while live; a brownout flickers every line", () => {
    const { converted, layer } = fixture();
    const g = createGrid(puzzle, new EventBus());
    const idle = overlayLines(converted, g.state(), projector(), ctxOf(layer));
    expect(idle.find((l) => l.id === "l_b")!.cut).toMatchObject({ sparking: false });
    g.throwSwitch("sw_1");
    const live = overlayLines(converted, g.state(), projector(), ctxOf(layer));
    expect(live.find((l) => l.id === "l_b")!.cut).toMatchObject({ sparking: true });
    const brown = { ...g.state(), brownout: true };
    const out = overlayLines(converted, brown, projector(), ctxOf(layer));
    expect(out.every((l) => l.flicker >= 0.15 && l.flicker <= 1)).toBe(true);
    expect(out.some((l) => l.flicker < 1)).toBe(true);
  });
});
