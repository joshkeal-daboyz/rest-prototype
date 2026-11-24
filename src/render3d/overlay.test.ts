import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PerspectiveCamera } from "three";
import { EventBus, loadCityPuzzle, loadPuzzle } from "../core";
import { CityPuzzleError } from "../city/circuit";
import { DEFAULT, sharedCity } from "../city/testing/namedcities";
import { circuitDraws } from "./circuitdraw";
import { cameraProject, cityHit, createOverlayLayer, jobWires, lineFlow, loadCityView, overlayRequested, relightFrame, renderRoute, wireLit, type LineFlow, type WireLit } from "./cityview";
import { WORLD_PER_METRE } from "./models";
import { createRelightClock } from "./relight3d";
import type { CityCircuitLayer } from "../core/cityplan";
import type { CityPuzzleConverted } from "../core/citycircuit";
import { drawNodeGlyph, type GlyphContext } from "../render/glyphs";
import { createGrid } from "../grid";
import { nodeLook } from "./look";
import { OVERLAY_HIT_PX, OVERLAY_NUDGE, overlayIcons, overlayLineHit, overlayLines, placePoint, type OverlayContext, type OverlayIcon, type OverlayLine, type Project } from "./overlay";

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
  it("one straight segment per line, from piece to piece, away from the feed while live", () => {
    const { converted, layer } = fixture();
    const s = createGrid(puzzle, new EventBus()).state();
    const lines = overlayLines(converted, s, projector(), ctxOf(layer));
    const feed = lines.find((l) => l.id === "l_feed")!;
    expect(feed.live).toBe(true);
    expect(feed.look).toBe("live");
    expect(feed.points).toHaveLength(4); // the carrier plays no part
    expect(feed.points[0]).toBeLessThan(feed.points[2]!); // starts at the feed
    expect(feed.phase).toBeGreaterThanOrEqual(0);
    expect(feed.phase).toBeLessThan(1);
    expect(feed.flicker).toBe(1);
    expect(feed.visible.every(Boolean)).toBe(true);
    const dead = lines.find((l) => !l.live)!;
    expect(dead.look).not.toBe("live");
  });

  it("a damaged cable's break icon sits at the midpoint, only when readable, sparking only while live; a brownout flickers every line", () => {
    const { converted, layer } = fixture();
    const g = createGrid(puzzle, new EventBus());
    const idle = overlayLines(converted, g.state(), projector(), ctxOf(layer));
    expect(idle.find((l) => l.id === "l_b")!.cut).toBeNull();
    g.throwSwitch("sw_1");
    const live = overlayLines(converted, g.state(), projector(), ctxOf(layer));
    const lb = live.find((l) => l.id === "l_b")!;
    expect(lb.cut).toMatchObject({ sparking: true });
    expect(lb.cut!.x).toBeCloseTo((lb.points[0]! + lb.points[2]!) / 2, 5);
    expect(lb.cut!.y).toBeCloseTo((lb.points[1]! + lb.points[3]!) / 2, 5);
    const brown = { ...g.state(), brownout: true };
    const out = overlayLines(converted, brown, projector(), ctxOf(layer));
    expect(out.every((l) => l.flicker >= 0.15 && l.flicker <= 1)).toBe(true);
    expect(out.some((l) => l.flicker < 1)).toBe(true);
  });
});

describe("a city puzzle played on the city (ticket 081 E2)", () => {
  const S = WORLD_PER_METRE;
  const wiresOf = () => {
    const { converted, layer } = fixture();
    const draws = circuitDraws(layer, undefined, { converted });
    return { converted, layer, wires: jobWires(layer, draws, converted) };
  };
  const flowOf = (state: ReturnType<ReturnType<typeof createGrid>["state"]>, id: string, to: string, index: number): LineFlow => lineFlow(state, { id, to }, index, [], null, 0, { fraction: 0, reversed: false });
  const litOf = (w: Parameters<typeof wireLit>[0], reversed: boolean, fraction: number): WireLit => wireLit(w, reversed, fraction, { forward: true, frac: 0 });

  it("loadCityView runs one pipeline per city, shares the plan between puzzles on it, and throws on a puzzle that does not hold", () => {
    const city = loadCityPuzzle(JSON.parse(readFileSync("puzzles/city/city-two-ways-round.city.json", "utf8")));
    const run = sharedCity(DEFAULT, "clean");
    let builds = 0;
    const build = () => (builds++, run);
    const a = loadCityView(city, build);
    const b = loadCityView({ ...city, id: "another" }, build);
    expect(builds).toBe(1);
    expect(a.plan).toBe(b.plan);
    expect(a.converted.puzzle.nodes.map((n) => n.id)).toEqual(city.nodes.map((n) => n.id));
    expect(() => loadCityView({ ...city, district: ["block:99:99"] }, build)).toThrow(CityPuzzleError);
  });

  it("a city view given is the play route, ahead of every address route and in dev only; without one the routes are as before", () => {
    const none = { city: false, dev: true, assemble: false, plan: false, sheet: false };
    expect(renderRoute({ ...none, city: true, assemble: true, plan: true })).toBe("play");
    expect(renderRoute({ ...none, city: true, dev: false })).toBe("none");
    expect(renderRoute(none)).toBe("none");
    expect(renderRoute({ ...none, assemble: true })).toBe("assemble");
    expect(renderRoute({ ...none, plan: true })).toBe("plan");
    expect(renderRoute({ ...none, sheet: true })).toBe("sheet");
  });

  it("a live line's spans glow in order, away from the feed; a dead line and scenery do not", () => {
    const { converted, wires } = wiresOf();
    const state = createGrid(puzzle, new EventBus()).state();
    expect(new Set(wires.map((w) => w.line))).toEqual(new Set(puzzle.lines.map((l) => l.id)));
    const feed = wires.filter((w) => w.line === "l_feed");
    expect(feed).toHaveLength(2);
    const li = (id: string) => puzzle.lines.findIndex((l) => l.id === id);
    const fl = flowOf(state, "l_feed", converted.puzzle.lines[li("l_feed")]!.to, li("l_feed"));
    expect(fl).toEqual({ fraction: 1, reversed: false });
    for (const w of feed) expect(litOf(w, fl.reversed, fl.fraction)).toEqual({ forward: true, frac: 1 });
    // Part of the line lit: the first span is whole, the second not yet; reversed, it is the other way round and travel runs against the wire.
    expect(litOf(feed[0]!, false, 0.4).frac).toBeGreaterThan(0.5);
    expect(litOf(feed[1]!, false, 0.4).frac).toBe(0);
    expect(litOf(feed[1]!, true, 0.4).forward).toBe(false);
    expect(litOf(feed[1]!, true, 0.4).frac).toBeGreaterThan(0.5);
    expect(litOf(feed[0]!, true, 0.4).frac).toBe(0);
    const dead = puzzle.lines.find((l) => !state.powered.has(l.id))!;
    expect(flowOf(state, dead.id, dead.to, li(dead.id)).fraction).toBe(0);
    for (const w of wires.filter((x) => x.line === dead.id)) expect(litOf(w, false, 0).frac).toBe(0);
  });

  it("current stops at a cut that is still there: the span past the break stays dark with current from either end", () => {
    const { converted, layer } = fixture();
    const base = createGrid(puzzle, new EventBus()).state();
    const feedLine = puzzle.lines.find((l) => l.id === "l_feed")!;
    const li = puzzle.lines.findIndex((l) => l.id === "l_feed");
    for (const cutIdx of [0, 1]) {
      const spanId = converted.runs["l_feed"]!.spans[cutIdx]!;
      const cutConverted = { ...converted, cuts: { fx: spanId } };
      const feed = jobWires(layer, circuitDraws(layer, undefined, { converted: cutConverted }), cutConverted).filter((w) => w.line === "l_feed");
      expect(feed.map((w) => w.cutFault)).toEqual(cutIdx === 0 ? ["fx", null] : [null, "fx"]);
      for (const reversed of [false, true]) {
        const standing = { ...base, faults: [{ id: "fx", at: "l_feed", kind: "damaged-cable" as const }], flowFrom: new Map([["l_feed", reversed ? feedLine.to : feedLine.from]]) };
        const fl = lineFlow(standing, feedLine, li, feed, null, 0, { fraction: 0, reversed: false });
        expect(fl.reversed).toBe(reversed);
        const order = reversed ? [1, 0] : [0, 1];
        const k = order.indexOf(cutIdx);
        order.forEach((wi, pos) => expect(litOf(feed[wi]!, fl.reversed, fl.fraction).frac).toBeCloseTo(pos < k ? 1 : pos === k ? 0.5 : 0, 5));
        // Repaired: the fault is gone and the whole line carries current.
        const repaired = lineFlow({ ...standing, faults: [] }, feedLine, li, feed, null, 0, { fraction: 0, reversed: false });
        expect(repaired.fraction).toBe(1);
      }
    }
  });

  it("projects with the camera's own projection: a line's points are its pieces' projected places", () => {
    const { converted, layer } = fixture();
    const camera = new PerspectiveCamera(50, 2, 0.1, 1000);
    camera.position.set(50 * S, 60 * S, 40 * S);
    camera.lookAt(50 * S, 0, 0);
    camera.updateMatrixWorld(true);
    const project = cameraProject(camera, { width: 800, height: 400 });
    const state = createGrid(puzzle, new EventBus()).state();
    const lines = overlayLines(converted, state, project, ctxOf(layer));
    const l = lines.find((x) => x.id === "l_b")!;
    const src = puzzle.lines.find((x) => x.id === "l_b")!;
    const a = { x: 0, y: 0, z: 0 };
    const out = { x: 0, y: 0 };
    expect(placePoint(converted.places[src.from]!, layer, a)).toBe(true);
    expect(project(a.x, a.y, a.z, out)).toBe(true);
    const first = l.live && state.flowFrom.get("l_b") === src.to ? [l.points[2], l.points[3]] : [l.points[0], l.points[1]];
    expect(first[0]).toBeCloseTo(out.x, 5);
    expect(first[1]).toBeCloseTo(out.y, 5);
    expect(project(50, 0, 1e6, out)).toBe(false);
  });

  it("a line is hit within half the hit size of its segment, nearest first, and never from behind the camera", () => {
    const mk = (id: string, y: number, visible = true): OverlayLine => ({ id, look: "dead", live: false, points: [0, y, 100, y], visible: [visible, visible], phase: 0, flicker: 1, cut: null });
    const lines = [mk("a", 0), mk("b", 30), mk("c", 5, false)];
    expect(overlayLineHit(lines, 50, OVERLAY_HIT_PX / 2 - 12)).toBe("a");
    expect(overlayLineHit(lines, 50, 18)).toBe("b");
    expect(overlayLineHit(lines, 50, 70)).toBeNull();
    expect(overlayLineHit(lines, 130, 0)).toBeNull();
    expect(overlayLineHit(lines, 50, 4)).toBe("a");
  });

  it("hits the overlay first (an icon, then a line), then the 3D pick; scenery, panels and off-canvas points give null", () => {
    const icon = { id: "i", x: 50, y: 0, hit: 44 } as unknown as OverlayIcon;
    const line: OverlayLine = { id: "a", look: "dead", live: false, points: [0, 0, 100, 0], visible: [true, true], phase: 0, flicker: 1, cut: null };
    const base = { width: 200, height: 200, blockers: [], icons: [icon], lines: [line], pick: () => "p" as string | null };
    expect(cityHit(52, 2, base)).toBe("i");
    expect(cityHit(85, 0, base)).toBe("a");
    expect(cityHit(50, 100, base)).toBe("p");
    expect(cityHit(50, 100, { ...base, pick: () => null })).toBeNull();
    expect(cityHit(52, 2, { ...base, blockers: [{ left: 40, top: -5, right: 60, bottom: 5 }] })).toBeNull();
    expect(cityHit(-1, 2, base)).toBeNull();
  });

  it("overlay=0 hides the overlay, and the 3D pick still plays", () => {
    expect(overlayRequested("?view=3d&overlay=0")).toBe(false);
    expect(overlayRequested("?view=3d")).toBe(true);
    expect(overlayRequested("?overlay=1")).toBe(true);
    expect(cityHit(50, 2, { width: 200, height: 200, blockers: [], icons: [], lines: [], pick: () => "node" })).toBe("node");
  });

  it("the Relight runs from its own plan: nothing lit at first, lamps lit by the end, and the plan is fixed when it starts, so a changed state mid-way does not re-plan", () => {
    const g = createGrid(puzzle, new EventBus());
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    g.throwBreaker("br_street");
    const won = g.state();
    const fresh = createGrid(puzzle, new EventBus()).state();
    const f = relightFrame(puzzle, [won, won, won, won], [0.05, 1.5, 1.5, 10]);
    const clock = createRelightClock(puzzle);
    const started = clock.update(won, 0.05);
    expect(started).not.toBeNull();
    expect(clock.update(fresh, 1.5)).toBe(started);
    expect(f[0]!.lit).toEqual([]);
    expect(f[0]!.fractions.every((x) => x === 0)).toBe(true);
    expect(f[2]).toEqual(f[1]);
    expect(f[1]!.fractions.some((x) => x > 0)).toBe(true);
    expect([...f[3]!.lit].sort()).toEqual(["flood", "shrine"]);
    f[1]!.fractions.forEach((x, i) => expect(x).toBeLessThanOrEqual(f[3]!.fractions[i]!));
  });

  it("the overlay canvas sits over the WebGL one at its CSS size and the pixel ratio capped at 2, resizes with it, and goes on dispose", () => {
    const el = { width: 0, height: 0, style: { cssText: "", left: "", top: "", width: "", height: "" }, setAttribute() {}, getContext: () => null, remove: vi.fn() };
    const parent = { insertBefore: vi.fn() };
    const source = { parentElement: parent, nextSibling: null, clientWidth: 300, clientHeight: 200, offsetLeft: 5, offsetTop: 7 };
    const layer = createOverlayLayer(source as never, { createElement: () => el } as never, 3)!;
    expect(parent.insertBefore).toHaveBeenCalledWith(el, null);
    expect(el.style.cssText).toContain("pointer-events:none");
    expect([el.width, el.height, el.style.width, el.style.height, el.style.left, el.style.top]).toEqual([600, 400, "300px", "200px", "5px", "7px"]);
    source.clientWidth = 400;
    layer.resize();
    expect([el.width, el.style.width]).toEqual([800, "400px"]);
    layer.remove();
    expect(el.remove).toHaveBeenCalled();
    expect(createOverlayLayer({ parentElement: null } as never, { createElement: () => el } as never, 1)).toBeNull();
  });
});
