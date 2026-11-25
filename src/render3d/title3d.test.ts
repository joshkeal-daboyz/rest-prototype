import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadCityPuzzle } from "../core";
import { DEFAULT, sharedCity } from "../city/testing/namedcities";
import { loadCityView } from "./cityview";
import { plan3dGroups } from "./plan3d";
import { TILE_M } from "./tilecity";
import { buildingHeights } from "./windows";
import { TITLE_VIEW, moonAt, nearTurn, projectPoint, skyOnly, splashTurn, titlePoses, titleTarget, titleTurn, titleWindow, windowedPlan } from "./title3d";

// Stage 01 on the default city (6 x 6 seed 1, one-way on): the one whole-city fixture of this file.
const view = loadCityView(loadCityPuzzle(JSON.parse(readFileSync("puzzles/city/01-first-light.city.json", "utf8"))), () => sharedCity(DEFAULT, "clean"));
const target = titleTarget(view);
const win = titleWindow(view.plan, target.building);
const wplan = windowedPlan(view.plan, win);

describe("the title backdrop (081 T1)", () => {
  it("title pose: the building on the right third, the moon in the upper half, the left third's top and bottom fifths clear of the drawn blocks; splash pose: no ground in view", () => {
    const poses = titlePoses(view.plan, target.building);
    const heights = buildingHeights(view.plan);
    const roofY = heights.get(target.building)!.height_m;
    for (const aspect of [1287 / 1178, 16 / 9]) {
      const b = projectPoint(poses.title, aspect, { x: poses.centre.x_m, y: roofY / 2, z: poses.centre.z_m })!;
      expect(b.x, `building x at aspect ${aspect}`).toBeGreaterThan(1 / 3);
      expect(b.x).toBeLessThan(1);
      // The moon over a whole sway of the title's sky.
      for (let t = 0; t < TITLE_VIEW.sway_period_s; t += 2) {
        const m = projectPoint(poses.title, aspect, moonAt(titleTurn(t)), true)!;
        expect(m.y, `moon y at t=${t}`).toBeGreaterThan(0);
        expect(m.y).toBeLessThan(1);
        expect(Math.abs(m.x)).toBeLessThan(1);
      }
      // Every drawn column's faces, a point a metre: none in the left third's top or bottom fifth.
      for (const c of wplan.layers.buildings!.columns!) {
        const top = heights.get(c.building)?.height_m ?? 10;
        for (let a = 0; a <= TILE_M; a++) {
          for (let y = 0; y <= top; y++) {
            for (const [dx, dz] of [[0, a], [TILE_M, a], [a, 0], [a, TILE_M]] as const) {
              const q = projectPoint(poses.title, aspect, { x: c.i * TILE_M + dx, y, z: c.j * TILE_M + dz });
              if (q && q.x < -1 / 3 && q.x >= -1 && Math.abs(q.y) <= 1) expect(Math.abs(q.y) > 0.6, `column ${c.i},${c.j} at y ${y}`).toBe(false);
            }
          }
        }
      }
    }
    // A long splash's accumulated turn eases the short way into the title's, never through more than half a turn.
    for (const t of [0, 3, 100, 250, 1000]) expect(Math.abs(nearTurn(splashTurn(t), titleTurn(0)) - titleTurn(0))).toBeLessThanOrEqual(180);
    expect(skyOnly(poses.splash)).toBe(true);
    expect(skyOnly(poses.title)).toBe(false);
  });

  it("only the window is built: no piece outside the 3 x 3 blocks is in any group", () => {
    const full = view.plan.layers;
    const draw = plan3dGroups(wplan, new Map(), new Map());
    const blocksOf = new Map(full.buildings!.buildings.map((b) => [b.id, b.block] as const));
    const inRect = (c: { i: number; j: number }): boolean => c.i >= win.i0 && c.i < win.i1 && c.j >= win.j0 && c.j < win.j1;
    expect(win.blocks.size).toBeGreaterThan(1);
    expect(draw.circuit).toBeNull();
    expect(draw.buildings.draws.length).toBeGreaterThan(0);
    for (const d of draw.buildings.draws) expect(win.blocks.has(blocksOf.get(d.building)!)).toBe(true);
    for (const d of [...draw.dressDraws, ...draw.propDraws, ...draw.trafficDraws]) expect(inRect(d.cell)).toBe(true);
    for (const c of [...draw.cells, ...draw.items]) expect(inRect(c)).toBe(true);
    // And it is a window: most of the city's columns and ground cells are not drawn.
    expect(draw.buildings.draws.length).toBeLessThan(full.buildings!.columns!.flatMap((c) => c.pieces).length / 3);
    expect(draw.cells.length).toBeLessThan(full.edge!.ground!.length / 3);
    expect(target.lit.has(target.building)).toBe(true);
  });
});
