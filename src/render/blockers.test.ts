import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle } from "../core";
import { PADDING, buildGeometry, computeFit, puzzleBounds } from "./geometry";
import { createMapRenderer } from "./map-renderer";

// Ticket 035 A: a click is live anywhere on the canvas except under a blocker rect (the overlay panels).

const W = 1100;
const H = 650;
const INS = { top: 220, bottom: 140 };

function fakeCanvas(w: number, h: number): HTMLCanvasElement {
  const store: Record<string, unknown> = {};
  const ctx = new Proxy(store, {
    get: (t, p: string) => (p === "measureText" ? (s: string) => ({ width: s.length * 6 }) : p in t ? t[p] : () => {}),
    set: (t, p: string, v) => {
      t[p] = v;
      return true;
    },
  });
  return { clientWidth: w, clientHeight: h, width: w, height: h, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

const puzzle = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "64-the-whole-chain.json"), "utf8")));

function zoomedRenderer() {
  const r = createMapRenderer(fakeCanvas(W, H), puzzle, { insets: INS });
  r.zoomStep(1, 650, 275);
  r.zoomStep(1, 650, 275);
  return r;
}

function screenOf(r: ReturnType<typeof createMapRenderer>, id: string): [number, number] {
  const n = puzzle.nodes.find((q) => q.id === id)!;
  const f = computeFit(puzzleBounds(puzzle), W, H, PADDING, INS, r.getPan(), r.getScale());
  return [n.pos[0] * f.scale + f.offsetX, n.pos[1] * f.scale + f.offsetY];
}

describe("blockers (ticket 035)", () => {
  it("the report: a node drawn in the empty bottom band is clickable", () => {
    const r = zoomedRenderer();
    const [x, y] = screenOf(r, "sw_x");
    expect(y).toBeGreaterThan(H - INS.bottom);
    expect(y).toBeLessThan(H);
    expect(r.hitTest(x, y)).toBe("sw_x");
  });

  it("a node drawn in the empty top band is clickable after a pan", () => {
    const r = zoomedRenderer();
    const g0 = buildGeometry(puzzle, W, H, PADDING, INS, r.getPan(), r.getScale());
    // pan so the node nearest the top band's middle row lands inside it
    const i = 0;
    const want = 100;
    const p = r.getPan();
    r.setPan(p.x, p.y + (want - g0.ny[i]!));
    const g = buildGeometry(puzzle, W, H, PADDING, INS, r.getPan(), r.getScale());
    let hit = 0;
    for (let k = 0; k < g.nodeIds.length; k++) {
      const x = g.nx[k]!;
      const y = g.ny[k]!;
      if (x < 0 || x > W || y <= 0 || y >= INS.top) continue;
      expect(r.hitTest(x, y), g.nodeIds[k]).toBe(g.nodeIds[k]);
      hit++;
    }
    expect(hit).toBeGreaterThan(0);
  });

  it("a blocker kills hitTest and placeAt inside it, edges included; outside it hits; setBlockers([]) revives", () => {
    const r = zoomedRenderer();
    const [x, y] = screenOf(r, "sw_x");
    const rect = { left: x - 30, top: y - 30, right: x + 30, bottom: y + 30 };
    r.setBlockers([rect]);
    expect(r.hitTest(x, y)).toBeNull();
    expect(r.placeAt(x, y)).toBeNull();
    r.setBlockers([{ left: x, top: y, right: x + 5, bottom: y + 5 }]);
    expect(r.hitTest(x, y)).toBeNull(); // edge inclusive
    r.setBlockers([{ left: x + 1, top: y - 30, right: x + 60, bottom: y + 30 }]);
    expect(r.hitTest(x, y)).toBe("sw_x"); // just outside
    r.setBlockers([rect]);
    r.setBlockers([]);
    expect(r.hitTest(x, y)).toBe("sw_x");
  });

  it("placeAt is blocked inside a blocker and live outside it", () => {
    const r = createMapRenderer(fakeCanvas(W, H), puzzle, { insets: INS });
    const g = buildGeometry(puzzle, W, H, PADDING, INS, r.getPan(), r.getScale());
    let found: [number, number, string] | null = null;
    for (let y = 0; y <= H && !found; y += 4) {
      for (let x = 0; x <= W && !found; x += 4) {
        const id = r.placeAt(x, y);
        if (id) found = [x, y, id];
      }
    }
    expect(found, `a place on the opening view (${g.nodeIds.length} nodes)`).not.toBeNull();
    const [x, y, id] = found!;
    r.setBlockers([{ left: x - 1, top: y - 1, right: x + 1, bottom: y + 1 }]);
    expect(r.placeAt(x, y)).toBeNull();
    r.setBlockers([{ left: x + 1000, top: y + 1000, right: x + 1001, bottom: y + 1001 }]);
    expect(r.placeAt(x, y)).toBe(id);
  });

  it("keeps a copy: mutating the array or a rect afterwards changes nothing", () => {
    const r = zoomedRenderer();
    const [x, y] = screenOf(r, "sw_x");
    const rect = { left: x - 5, top: y - 5, right: x + 5, bottom: y + 5 };
    const list = [rect];
    r.setBlockers(list);
    rect.left = 9999;
    rect.right = 9999;
    list.length = 0;
    expect(r.hitTest(x, y)).toBeNull();
  });

  it("points off the canvas are dead for hitTest and placeAt", () => {
    const r = createMapRenderer(fakeCanvas(W, H), puzzle, { insets: INS });
    r.fitWhole();
    for (const [x, y] of [[-1, 300], [W + 1, 300], [500, -1], [500, H + 1], [-200, -200]] as const) {
      expect(r.hitTest(x, y)).toBeNull();
      expect(r.placeAt(x, y)).toBeNull();
    }
    // a node pulled to the canvas edge is live on it
    const g = buildGeometry(puzzle, W, H, PADDING, INS, r.getPan(), r.getScale());
    expect(r.hitTest(g.nx[0]!, g.ny[0]!)).toBe(g.nodeIds[0]);
  });
});
