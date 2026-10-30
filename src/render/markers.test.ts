import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, type Puzzle } from "../core";
import { PADDING, buildGeometry, freeArea, type Insets } from "./geometry";
import { MARKER_GAP, MARKER_INSET, offscreenMarkers } from "./markers";
import { createMapRenderer } from "./map-renderer";

// Ticket 027 A3: edge stars for off-screen targets.

const AREA = { left: 0, top: 100, right: 1000, bottom: 700 }; // centre (500, 400); inset rect x 14..986, y 114..686

/** A puzzle whose lamps sit at the given map positions (1 unit = 1 px at the scale used below). */
function lamps(pos: [number, number][]): Puzzle {
  return loadPuzzle({
    id: "42-markers",
    name: "Markers",
    version: 4,
    scope: "map",
    capacity: 20,
    startingParts: [],
    target: pos.map((_, i) => `l${i}`),
    nodes: [{ id: "feed", type: "feed", pos: [0, 0] }, ...pos.map((p, i) => ({ id: `l${i}`, type: "lamp", pos: p, load: 1 }))],
    lines: pos.map((_, i) => ({ id: `w${i}`, from: "feed", to: `l${i}` })),
    faults: [],
  });
}
/** Geometry with node (x, y) drawn at screen (x, y): scale 1, offset 0. */
function geoAt(p: Puzzle) {
  const g = buildGeometry(p, 1000, 800, 0, undefined, undefined, 1);
  const b = { minX: 0, minY: 0 };
  void b;
  // buildGeometry centres the box; shift every node back so screen == map units
  const dx = g.nx[0]! - 0;
  const dy = g.ny[0]! - 0;
  for (let i = 0; i < g.nx.length; i++) {
    g.nx[i] = g.nx[i]! - dx;
    g.ny[i] = g.ny[i]! - dy;
  }
  return g;
}
const NONE = new Set<string>();

describe("offscreenMarkers", () => {
  it("gives one marker per off-screen target and none for on-screen ones", () => {
    const p = lamps([[500, 400], [2000, 400], [-300, 300], [600, 650], [500, 900]]);
    const g = geoAt(p);
    const m = offscreenMarkers(g, AREA, ["l0", "l1", "l2", "l3", "l4"], NONE);
    expect(m.map((x) => x.lamp).sort()).toEqual(["l1", "l2", "l4"]);
    expect(offscreenMarkers(g, AREA, ["l0", "l3"], NONE)).toEqual([]);
    expect(offscreenMarkers(g, AREA, ["nope"], NONE)).toEqual([]);
  });

  it("sits on the edge of the area inset by 14 px", () => {
    const p = lamps([[2000, 400], [-300, 400], [500, 2000], [500, -900], [1700, 1500]]);
    const g = geoAt(p);
    for (const mk of offscreenMarkers(g, AREA, ["l0", "l1", "l2", "l3", "l4"], NONE)) {
      const onX = Math.abs(mk.x - (AREA.left + MARKER_INSET)) < 1e-6 || Math.abs(mk.x - (AREA.right - MARKER_INSET)) < 1e-6;
      const onY = Math.abs(mk.y - (AREA.top + MARKER_INSET)) < 1e-6 || Math.abs(mk.y - (AREA.bottom - MARKER_INSET)) < 1e-6;
      expect(onX || onY, mk.lamp).toBe(true);
      expect(mk.x).toBeGreaterThanOrEqual(AREA.left + MARKER_INSET - 1e-6);
      expect(mk.x).toBeLessThanOrEqual(AREA.right - MARKER_INSET + 1e-6);
      expect(mk.y).toBeGreaterThanOrEqual(AREA.top + MARKER_INSET - 1e-6);
      expect(mk.y).toBeLessThanOrEqual(AREA.bottom - MARKER_INSET + 1e-6);
    }
  });

  it("lies on the ray from the area's centre to the lamp (within 1 px)", () => {
    const spots: [number, number][] = [[2000, 400], [-300, 250], [520, 2000], [480, -900], [1700, 1500], [-800, -500]];
    const p = lamps(spots);
    const g = geoAt(p);
    const cx = 500;
    const cy = 400;
    spots.forEach((s, i) => {
      const [mk] = offscreenMarkers(g, AREA, [`l${i}`], NONE);
      expect(mk).toBeDefined();
      const dx = s[0] - cx;
      const dy = s[1] - cy;
      const len = Math.hypot(dx, dy);
      // perpendicular distance from the marker to the ray, and the marker is on the lamp's side
      const perp = Math.abs((mk!.x - cx) * dy - (mk!.y - cy) * dx) / len;
      const along = ((mk!.x - cx) * dx + (mk!.y - cy) * dy) / len;
      expect(perp, `l${i}`).toBeLessThanOrEqual(1);
      expect(along, `l${i}`).toBeGreaterThan(0);
      expect(mk!.angle).toBeCloseTo(Math.atan2(dy, dx), 9);
    });
  });

  it("keeps markers at least 14 px apart (5 targets in one direction)", () => {
    const spots: [number, number][] = [[3000, 400], [3000, 404], [3000, 398], [3000, 410], [3000, 392]];
    const p = lamps(spots);
    const g = geoAt(p);
    const ids = spots.map((_, i) => `l${i}`);
    const m = offscreenMarkers(g, AREA, ids, NONE);
    expect(m).toHaveLength(5);
    for (let i = 0; i < m.length; i++) {
      for (let j = i + 1; j < m.length; j++) {
        expect(Math.hypot(m[i]!.x - m[j]!.x, m[i]!.y - m[j]!.y), `${m[i]!.lamp} ${m[j]!.lamp}`).toBeGreaterThanOrEqual(MARKER_GAP);
      }
    }
    for (const mk of m) {
      expect(mk.x).toBeGreaterThanOrEqual(AREA.left + MARKER_INSET - 1e-6);
      expect(mk.x).toBeLessThanOrEqual(AREA.right - MARKER_INSET + 1e-6);
      expect(mk.y).toBeGreaterThanOrEqual(AREA.top + MARKER_INSET - 1e-6);
      expect(mk.y).toBeLessThanOrEqual(AREA.bottom - MARKER_INSET + 1e-6);
    }
  });

  it("keeps markers apart round a corner, too", () => {
    const spots: [number, number][] = [[3000, -2000], [3000, -2010], [2990, -2000], [3010, -2000], [3005, -2005], [2995, -2005]];
    const p = lamps(spots);
    const g = geoAt(p);
    const m = offscreenMarkers(g, AREA, spots.map((_, i) => `l${i}`), NONE);
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) expect(Math.hypot(m[i]!.x - m[j]!.x, m[i]!.y - m[j]!.y)).toBeGreaterThanOrEqual(MARKER_GAP);
  });

  it("fills the marker of a lit lamp only", () => {
    const p = lamps([[2000, 400], [-500, 400]]);
    const g = geoAt(p);
    const m = offscreenMarkers(g, AREA, ["l0", "l1"], new Set(["l1"]));
    expect(m.find((x) => x.lamp === "l0")!.filled).toBe(false);
    expect(m.find((x) => x.lamp === "l1")!.filled).toBe(true);
  });
});

describe("edge stars on 56-whole-ward in a small window", () => {
  const f = join(__dirname, "..", "..", "puzzles", "56-whole-ward.json");
  const file = existsSync(f) ? f : join(__dirname, "..", "..", "puzzles", "locked", "56-whole-ward.json");
  const ward = loadPuzzle(JSON.parse(readFileSync(file, "utf8")));
  const ins: Insets = { top: 220, bottom: 140 };
  it("has some off-screen targets in a 1100 x 650 window, and every one is a target lamp", () => {
    const g = buildGeometry(ward, 1100, 650, PADDING, ins);
    const m = offscreenMarkers(g, freeArea(1100, 650, ins), ward.target ?? [], NONE);
    expect(m.length).toBeGreaterThan(0);
    for (const mk of m) expect(ward.target).toContain(mk.lamp);
  });
  it("has none when the whole map is on screen", () => {
    const g = buildGeometry(ward, 1920, 1080, PADDING, ins);
    expect(offscreenMarkers(g, freeArea(1920, 1080, ins), ward.target ?? [], NONE)).toEqual([]);
  });
  it("the renderer draws a filled star for a lit off-screen target and a hollow one for a dark one", () => {
    const store: Record<string, unknown> = {};
    let fills = 0;
    let closed = 0;
    const ctx = new Proxy(store, {
      get: (t, p: string) => {
        if (p === "measureText") return (s: string) => ({ width: s.length * 6 });
        if (p === "closePath") return () => void closed++;
        if (p === "fill") return () => void (t.fillStyle === "#ffe9a8" && fills++);
        return p in t ? t[p] : () => {};
      },
      set: (t, p: string, v) => ((t[p] = v), true),
    });
    const canvas = { clientWidth: 1100, clientHeight: 650, width: 1100, height: 650, getContext: () => ctx } as unknown as HTMLCanvasElement;
    const r = createMapRenderer(canvas, ward, { insets: ins });
    for (let k = 0; k < 3; k++) r.zoomStep(1);
    const g = buildGeometry(ward, 1100, 650, PADDING, ins, r.getPan(), r.getScale());
    const off = offscreenMarkers(g, freeArea(1100, 650, ins), ward.target ?? [], NONE, { left: -24, top: -24, right: 1100 + 24, bottom: 650 + 24 }).map((m) => m.lamp);
    expect(off.length).toBeGreaterThan(1);
    const state = {
      powered: new Set<string>(), flowFrom: new Map(), lit: new Set([off[0]!]), readableFaults: new Set<string>(), sparking: new Set<string>(),
      fuseLoad: new Map(), wouldBlow: new Map(), faults: [], breakers: new Map(), switches: new Map(), batteries: new Map(), parts: [],
      targets: ward.target ?? [], feeds: new Map(), feedOf: new Map(), load: 0, capacity: 4, brownout: false, complete: false, actions: 0,
    } as unknown as Parameters<typeof r.draw>[0];
    r.draw(state, {}, 1);
    const litFills = fills;
    expect(closed).toBeGreaterThanOrEqual(off.length);
    expect(litFills).toBeGreaterThanOrEqual(1);
    fills = 0;
    r.draw({ ...state, lit: new Set<string>() }, {}, 1);
    expect(fills).toBeLessThan(litFills);
  });
});
