/**
 * Ticket 081 L1: the lit building's windows. The mask's texels, a building's level through the Relight (on P0's file, 6 x 6 seed 1, the module cache) and in a brownout, and the material swap on a fixture.
 */
import { readFileSync } from "node:fs";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from "three";
import { describe, expect, it } from "vitest";
import { EventBus, loadCityPuzzle } from "../core";
import { convertCityPuzzle } from "../city/circuit";
import { DEFAULT, sharedCity } from "../city/testing/namedcities";
import { createGrid } from "../grid";
import type { GridState } from "../grid";
import { createRelightClock } from "./relight3d";
import { PANE_COLOURS, WINDOW_LIT, WINDOW_UV, buildingGlow, lampBuildings, litBuilding, windowMask, type BuildingGlow } from "./windows";

const texel = (x: number, y: number): number[] => {
  const d = windowMask().image.data as Uint8Array;
  const o = (y * WINDOW_UV.size + x) * 4;
  return [d[o]!, d[o + 1]!, d[o + 2]!];
};
const rgb = (c: number): number[] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

describe("the lit building's windows (081 L1)", () => {
  it("the mask is each pane's colour inside the glass rectangle and black just outside it", () => {
    const m = windowMask();
    expect([m.flipY, m.image.width, m.image.height]).toEqual([false, 1024, 1024]);
    const y = (WINDOW_UV.y0 + WINDOW_UV.y1) >> 1;
    expect(texel(WINDOW_UV.x0, y)).toEqual(rgb(PANE_COLOURS[0]));
    expect(texel(WINDOW_UV.splits[0] - 1, y)).toEqual(rgb(PANE_COLOURS[0]));
    expect(texel(WINDOW_UV.splits[0], y)).toEqual(rgb(PANE_COLOURS[1]));
    expect(texel(WINDOW_UV.splits[1], y)).toEqual(rgb(PANE_COLOURS[2]));
    expect(texel(WINDOW_UV.x1 - 1, WINDOW_UV.y1 - 1)).toEqual(rgb(PANE_COLOURS[2]));
    for (const [x, yy] of [[WINDOW_UV.x0 - 1, y], [WINDOW_UV.x1, y], [WINDOW_UV.x0 + 5, WINDOW_UV.y0 - 1], [0, 0]] as const) expect(texel(x, yy)).toEqual([0, 0, 0]);
  });

  it("on P0's file each lamp building is dark before its lamp's arrival and lit after it, in the order the Relight lights the lamps", { timeout: 60_000 }, () => {
    const run = sharedCity(DEFAULT, "facades");
    if (!run.ok) throw new Error(run.failure.reason);
    const city = loadCityPuzzle(JSON.parse(readFileSync("puzzles/city/city-two-ways-round.city.json", "utf8")));
    const converted = convertCityPuzzle(city, run.plan);
    const puzzle = converted.puzzle;
    const g = createGrid(puzzle, new EventBus());
    g.throwSwitch("sw");
    g.repairAt("l_e2");
    const won = g.state();
    const byBuilding = lampBuildings(puzzle.nodes, converted.places, run.plan.layers.circuit!.roofs ?? []);
    expect([...byBuilding.values()].flat().map((l) => l.id).sort()).toEqual(["homes", "infirmary", "shrine"]);
    const clock = createRelightClock(puzzle);
    const out: BuildingGlow = { level: 0, flare: 0 };
    let planned: ReturnType<typeof clock.update> = null;
    const first = new Map<string, number>();
    const before = new Map<string, number>();
    for (let t = 0.05; t < 8; t += 0.05) {
      const plan = clock.update(won, t);
      planned ??= plan;
      for (const [b, lamps] of byBuilding) {
        const was = first.has(b);
        buildingGlow(plan, won, lamps, t, t, out);
        if (out.level > 0 && !was) first.set(b, t);
        if (!was && out.level === 0) before.set(b, t);
      }
    }
    const lit = [...byBuilding].filter(([, lamps]) => lamps.some((l) => won.lit.has(l.id))).map(([b]) => b);
    expect(lit.length).toBeGreaterThan(0);
    for (const b of lit) {
      expect(first.get(b), b).toBeGreaterThan(0.05);
      expect(before.get(b), b).toBeLessThan(first.get(b)!);
    }
    // The order matches the lamps' arrivals in the plan.
    const plan = planned!;
    const arrival = (b: string): number => Math.min(...byBuilding.get(b)!.map((l) => plan.nodeArrive[l.index]!));
    const byFirst = [...lit].sort((a, b) => first.get(a)! - first.get(b)!);
    const byArrival = [...lit].sort((a, b) => arrival(a) - arrival(b));
    expect(arrival(byFirst[0]!)).toBeCloseTo(arrival(byArrival[0]!), 6);
    byFirst.forEach((b, i) => i > 0 && expect(arrival(b)).toBeGreaterThanOrEqual(arrival(byFirst[i - 1]!) - 0.06));
  });

  it("a brownout dips a lit building below 1, a dark one stays 0, and with two lamps the brighter one counts", () => {
    const state = (lit: string[], brownout: boolean): GridState => ({ lit: new Set(lit), brownout }) as unknown as GridState;
    const out: BuildingGlow = { level: 0, flare: 0 };
    const a = [{ id: "a", index: 0 }];
    const ab = [{ id: "a", index: 0 }, { id: "b", index: 1 }];
    expect(buildingGlow(null, state(["a"], false), a, 0, 0.3, out).level).toBe(1);
    expect(buildingGlow(null, state([], true), a, 0, 0.3, out).level).toBe(0);
    let dipped = -1;
    for (let t = 0; t < 4 && dipped < 0; t += 0.05) if (buildingGlow(null, state(["a"], true), a, 0, t, out).level < 1) dipped = t;
    expect(dipped).toBeGreaterThanOrEqual(0);
    const both = buildingGlow(null, state(["a", "b"], true), ab, 0, dipped, { level: 0, flare: 0 }).level;
    const one = (id: string, index: number): number => buildingGlow(null, state([id], true), [{ id, index }], 0, dipped, { level: 0, flare: 0 }).level;
    expect(both).toBeCloseTo(Math.max(one("a", 0), one("b", 1)), 9);
    expect(both).toBeLessThan(1);
  });

  it("the swap gives the lit building's pieces clones with the mask and its level, and leaves the other building's shared material untouched", () => {
    const shared = new MeshStandardMaterial({ map: new Texture() });
    const piece = (): Mesh => new Mesh(new BoxGeometry(1, 1, 1), shared);
    const lit = new Group().add(piece(), piece());
    const other = new Group().add(piece());
    const l = litBuilding(lit);
    const [p, q] = lit.children as Mesh[];
    expect(p!.material).toBe(q!.material);
    expect(p!.material).not.toBe(shared);
    const m = p!.material as MeshStandardMaterial;
    expect([m.emissiveMap, m.emissiveIntensity]).toEqual([windowMask(), 0]);
    l.set({ level: 1, flare: 0 });
    expect(m.emissiveIntensity).toBeCloseTo(WINDOW_LIT, 9);
    l.set({ level: 0.5, flare: 1 });
    expect(m.emissiveIntensity).toBeGreaterThan(WINDOW_LIT * 0.5);
    expect((other.children[0] as Mesh).material).toBe(shared);
    expect([shared.emissiveMap, shared.emissiveIntensity]).toEqual([null, 1]);
  });
});
