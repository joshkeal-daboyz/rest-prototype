import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, placeBase, placeName, type Puzzle } from "../core";
import { computeFit, freeArea, puzzleBounds } from "./geometry";
import * as city from "./city";
import { circuitStreets, cityPlaces, footprintLayout, mapOrigin, placeParts } from "./city";
import { LABEL_H_PX, lampMarks, placeAtPoint, targetLabels } from "./places";

// Ticket 024 A2 (picking, labels), reworked for A3: places live in lots, labels never clip.

const ROOT = join(__dirname, "..", "..", "puzzles");
function loadAll(): { key: string; puzzle: Puzzle }[] {
  const out: { key: string; puzzle: Puzzle }[] = [];
  if (!existsSync(ROOT)) return out;
  for (const f of readdirSync(ROOT)) {
    if (!f.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(ROOT, f), "utf8")) as { scope?: string };
    if (raw.scope !== "map") continue;
    const puzzle = loadPuzzle(raw);
    out.push({ key: puzzle.id, puzzle });
  }
  return out;
}
const OPEN = loadAll();

describe("cityPlaces", () => {
  it("labels only the target lamps, with the list's own words", () => {
    let labelled = 0;
    let unlabelled = 0;
    for (const { key: k, puzzle } of OPEN) {
      const targets = puzzle.target && puzzle.target.length ? new Set(puzzle.target) : null;
      for (const p of cityPlaces(puzzle)) {
        const isTarget = targets === null || targets.has(p.lamp);
        if (isTarget) {
          expect(p.label, `${k} ${p.lamp}`).toBe(placeName(p.lamp));
          labelled++;
        } else {
          expect(p.label, `${k} ${p.lamp}`).toBeNull();
          unlabelled++;
        }
      }
    }
    expect(labelled).toBeGreaterThan(0);
    expect(unlabelled).toBeGreaterThan(0);
  });
  it("is cached per puzzle and scale", () => {
    const p = OPEN[0]!.puzzle;
    const o = mapOrigin(p.id, puzzleBounds(p));
    expect(footprintLayout(p, o, 50)).toBe(footprintLayout(p, o, 50));
    expect(cityPlaces(p, 50)).toBe(cityPlaces(p, 50));
  });
  it("gives one place per lamp in nodes order, with no linked-building glow", () => {
    for (const { key: k, puzzle } of OPEN) {
      expect(cityPlaces(puzzle).map((p) => p.lamp), k).toEqual(puzzle.nodes.filter((n) => n.type === "lamp").map((n) => n.id));
    }
    expect("linkBuildings" in city).toBe(false);
    expect("CITY_LINK_R" in city).toBe(false);
  });
  it("every open lamp has a base name", () => {
    for (const { puzzle } of OPEN) for (const n of puzzle.nodes) if (n.type === "lamp") expect(placeBase(n.id).length).toBeGreaterThan(0);
  });
});

describe("placeAtPoint", () => {
  it("returns the lamp for a point inside its place, also after a pan, and null on a wire or empty ground", () => {
    for (const { key: k, puzzle } of OPEN.slice(0, 25)) {
      const b = puzzleBounds(puzzle);
      const cs = circuitStreets(puzzle);
      for (const pan of [{ x: 0, y: 0 }, { x: 137, y: -61 }]) {
        const fit = computeFit(b, 1000, 800, 64, { top: 90 }, pan);
        const places = cityPlaces(puzzle, fit.scale);
        const px = (mx: number): number => mx * fit.scale + fit.offsetX;
        const py = (my: number): number => my * fit.scale + fit.offsetY;
        for (const p of places) {
          if (p.pool) continue;
          for (const q of placeParts(p)) {
            expect(placeAtPoint(places, fit, px(q.x), py(q.y)), `${k} ${p.lamp}`).toBe(p.lamp);
            expect(placeAtPoint(places, fit, px(q.x + q.w / 2 - 0.02), py(q.y - q.h / 2 + 0.02)), `${k} ${p.lamp} corner`).toBe(p.lamp);
          }
        }
        for (const l of cs.lanes.slice(0, 60)) {
          const mx = (l.ax + l.bx) / 2;
          const my = (l.ay + l.by) / 2;
          expect(placeAtPoint(places, fit, px(mx), py(my)), `${k} wire`).toBeNull(); // places keep clear of every wire
        }
        expect(placeAtPoint(places, fit, -5000, -5000), k).toBeNull();
      }
    }
  });
  it("moves with the pan: the same screen point is a different map point", () => {
    const puzzle = OPEN.find((o) => o.key === "09-shrine-circuit")!.puzzle;
    const b = puzzleBounds(puzzle);
    const f0 = computeFit(b, 1000, 800, 64);
    const f1 = computeFit(b, 1000, 800, 64, undefined, { x: 200, y: 0 });
    const places = cityPlaces(puzzle, f0.scale);
    const shrine = places.find((p) => p.lamp === "shrine")!;
    const sx = shrine.x * f0.scale + f0.offsetX;
    const sy = shrine.y * f0.scale + f0.offsetY;
    expect(placeAtPoint(places, f0, sx, sy)).toBe("shrine");
    expect(placeAtPoint(places, f1, sx, sy)).not.toBe("shrine");
    expect(placeAtPoint(places, f1, sx + 200, sy)).toBe("shrine");
  });
});

describe("labels", () => {
  it("never cover the lamp, its Lv caption, the target star, or any place", () => {
    for (const { key: k, puzzle } of OPEN) {
      const b = puzzleBounds(puzzle);
      const fit = computeFit(b, 1920, 1080, 64, { top: 90, right: 300, bottom: 40 });
      const places = cityPlaces(puzzle, fit.scale);
      const boxes = targetLabels(puzzle, places, fit, freeArea(1920, 1080, { top: 90, right: 300, bottom: 40 }), (t) => t.length * 6.2);
      boxes.forEach((r, i) => {
        if (!r) return;
        const p = places[i]!;
        expect(r.h, k).toBe(LABEL_H_PX);
        const n = puzzle.nodes.find((q) => q.id === p.lamp)!;
        const lx = n.pos[0] * fit.scale + fit.offsetX;
        const ly = n.pos[1] * fit.scale + fit.offsetY;
        expect(lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h, `${k} ${p.lamp} label over its lamp`).toBe(false);
        for (const q of places) {
          if (q.pool) continue;
          for (const part of placeParts(q)) {
            const l = (part.x - part.w / 2) * fit.scale + fit.offsetX;
            const t = (part.y - part.h / 2) * fit.scale + fit.offsetY;
            const hit = r.x < l + part.w * fit.scale && l < r.x + r.w && r.y < t + part.h * fit.scale && t < r.y + r.h;
            expect(hit, `${k} label ${p.lamp} over place ${q.lamp}`).toBe(false);
          }
        }
      });
    }
  });
  it("never cover a lamp's Lv caption or target star, at five scales", { timeout: 60000 }, () => {
    const hit = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    let checked = 0;
    for (const scale of [15, 30, 45, 70, 120]) {
      for (const { key: k, puzzle } of OPEN) {
        const b = puzzleBounds(puzzle);
        const fit = { scale, offsetX: 900 - ((b.minX + b.maxX) / 2) * scale, offsetY: 540 - ((b.minY + b.maxY) / 2) * scale };
        const places = cityPlaces(puzzle, scale);
        const boxes = targetLabels(puzzle, places, fit, freeArea(1800, 1080), (t) => t.length * 6.2);
        boxes.forEach((r, i) => {
          if (!r) return;
          checked++;
          // Every lamp's marks, not only the label's own (ticket 026: could-improve 11).
          for (const n of puzzle.nodes) {
            if (n.type !== "lamp") continue;
            const [caption, star] = lampMarks(n, n.pos[0] * scale + fit.offsetX, n.pos[1] * scale + fit.offsetY);
            expect(hit(r, caption!), `${k} ${places[i]!.lamp} label over ${n.id} caption @${scale}`).toBe(false);
            expect(hit(r, star!), `${k} ${places[i]!.lamp} label over ${n.id} star @${scale}`).toBe(false);
          }
        });
      }
    }
    expect(checked).toBeGreaterThan(300);
  });
  it("labels the shrine on map 09 and puts it beside its place", () => {
    const puzzle = OPEN.find((o) => o.key === "09-shrine-circuit")!.puzzle;
    const fit = computeFit(puzzleBounds(puzzle), 1920, 1080, 64);
    const places = cityPlaces(puzzle, fit.scale);
    const i = places.findIndex((p) => p.lamp === "shrine");
    const box = targetLabels(puzzle, places, fit, freeArea(1920, 1080), (t) => t.length * 6.2)[i];
    expect(box).not.toBeNull();
    const p = places[i]!;
    const cx = p.x * fit.scale + fit.offsetX;
    const cy = p.y * fit.scale + fit.offsetY;
    expect(Math.hypot(box!.x + box!.w / 2 - cx, box!.y + box!.h / 2 - cy)).toBeLessThan(150);
  });
});
