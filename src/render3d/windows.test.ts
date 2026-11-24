/**
 * Ticket 081 L1: the lit building's windows. The mask's texels, a building's level through the Relight (on P0's file, 6 x 6 seed 1, the module cache) and in a brownout, and the window level written per instance on a fixture.
 */
import { readFileSync } from "node:fs";
import { BoxGeometry, InstancedBufferAttribute, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Texture } from "three";
import { describe, expect, it } from "vitest";
import { EventBus, loadCityPuzzle } from "../core";
import { convertCityPuzzle } from "../city/circuit";
import { DEFAULT, sharedCity } from "../city/testing/namedcities";
import { createGrid } from "../grid";
import type { GridState } from "../grid";
import { createRelightClock } from "./relight3d";
import { Scene } from "three";
import { PANE_COLOURS, STREET_LIGHTS_MAX, STREET_LIGHT_INTENSITY, WINDOW_FLARE_GAIN, WINDOW_LEVEL, WINDOW_LIT, WINDOW_UV, buildingGlow, lampBuildings, lightPlaces, setBuildingGlow, setStreetLights, streetLights, windowLit, windowMask, type BuildingGlow } from "./windows";

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

  it("a lamp lights its building and the building backed onto it; on P0's file each is dark before its lamp's arrival and lit after it, in the order the Relight lights the lamps", { timeout: 60_000 }, () => {
    const run = sharedCity(DEFAULT, "facades");
    if (!run.ok) throw new Error(run.failure.reason);
    const city = loadCityPuzzle(JSON.parse(readFileSync("puzzles/city/city-two-ways-round.city.json", "utf8")));
    const converted = convertCityPuzzle(city, run.plan);
    const puzzle = converted.puzzle;
    const g = createGrid(puzzle, new EventBus());
    g.throwSwitch("sw");
    g.repairAt("l_e2");
    const won = g.state();
    const byBuilding = lampBuildings(puzzle.nodes, converted.places, run.plan.layers.circuit!.roofs ?? [], run.plan.layers.buildings!.buildings);
    expect([...new Set([...byBuilding.values()].flat().map((l) => l.id))].sort()).toEqual(["homes", "infirmary", "shrine"]);
    // Grammar rule 4: the follower backed onto each leader lights with it, whichever way the lamp's own building is named.
    const homes = (id: string): string[] => (byBuilding.get(id) ?? []).map((l) => l.id);
    expect(homes("block:6:6/a|outer|-x|54,52")).toEqual(["homes"]);
    expect(homes("block:6:6/a|inner|+x|55,52")).toEqual(["homes"]);
    expect(homes("block:6:6/a|outer|-x|54,48")).toEqual([]);
    expect(homes("block:6:6/a|inner|-x|66,54")).toEqual(["shrine"]);
    expect(homes("block:6:6/b|outer|-z|58,61")).toEqual(["infirmary"]);
    const lead = (id: string): string => run.plan.layers.buildings!.buildings.find((b) => b.id === id)!.partner ?? id;
    for (const id of byBuilding.keys()) expect(byBuilding.has(lead(id)), id).toBe(true);
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

  it("lighting a building writes only its instances' window level, through the same material, and the twin carries the mask, leaving the source untouched", () => {
    const source = new MeshStandardMaterial({ map: new Texture() });
    const twin = windowLit(source) as MeshStandardMaterial;
    expect(twin).not.toBe(source);
    expect(windowLit(new MeshBasicMaterial({ map: new Texture() }))).toBeInstanceOf(MeshBasicMaterial);
    expect([twin.emissiveMap, twin.emissiveIntensity]).toEqual([windowMask(), WINDOW_LIT]);
    expect([source.emissiveMap, source.emissiveIntensity]).toEqual([null, 1]);
    // Buildings a and b share an instancer, c is alone in another; each instancer's geometry carries a level per instance.
    const instancer = (n: number): InstancedMesh => {
      const geo = new BoxGeometry(1, 1, 1);
      geo.setAttribute(WINDOW_LEVEL, new InstancedBufferAttribute(new Float32Array(n), 1));
      return new InstancedMesh(geo, twin, n);
    };
    const shared = instancer(3);
    const alone = instancer(1);
    const draw = { instances: new Map([["a", [{ mesh: shared, index: 0 }, { mesh: shared, index: 2 }]], ["b", [{ mesh: shared, index: 1 }]], ["c", [{ mesh: alone, index: 0 }]]]) };
    const level = (m: InstancedMesh): number[] => [...(m.geometry.getAttribute(WINDOW_LEVEL).array as Float32Array)];
    expect([...level(shared), ...level(alone)]).toEqual([0, 0, 0, 0]);
    const before = (alone.geometry.getAttribute(WINDOW_LEVEL) as InstancedBufferAttribute).version;
    setBuildingGlow(draw, "a", { level: 1, flare: 0 });
    expect(level(shared)).toEqual([1, 0, 1]);
    expect(level(alone)).toEqual([0]);
    expect((alone.geometry.getAttribute(WINDOW_LEVEL) as InstancedBufferAttribute).version).toBe(before);
    setBuildingGlow(draw, "a", { level: 0.5, flare: 1 });
    expect(level(shared)[0]).toBeCloseTo(0.5 * (1 + WINDOW_FLARE_GAIN), 5);
    setBuildingGlow(draw, "nobody", { level: 1, flare: 0 });
    expect(shared.material).toBe(twin);
    expect(alone.material).toBe(twin);
  });

  const open = (i: number, j: number, ...sides: [string, string][]) => ({ i, j, open: sides.map(([side, faces]) => ({ side, faces, frontage: "street" })) });
  const fixture = (n: number) => {
    const built = [open(0, 0, ["+z", "street"]), open(1, 0, ["+z", "street"]), open(0, 5, ["+z", "street"], ["+x", "street"]), open(0, 9, ["+z", "park"]), open(0, 12)];
    const buildings = [{ id: "mid", cells: [built[0], built[1]] }, { id: "corner", cells: [built[2]] }, { id: "yard", cells: [built[3]] }, { id: "backed", cells: [built[4]] }];
    for (let k = 0; k < n; k++) {
      const c = open(20 + k, 0, ["+z", "street"]);
      built.push(c);
      buildings.push({ id: "b" + k, cells: [c] });
    }
    return { layers: { mass: { built }, buildings: { buildings } } } as never;
  };

  it("a light stands in front of the middle of its street face or over its corner; a building with no street face gets none and does not count; 33 buildings at max 32 give the first 32", () => {
    const [mid, corner, none] = [lightPlaces(fixture(0), ["mid"], 5)[0]!, lightPlaces(fixture(0), ["corner"], 5)[0]!, lightPlaces(fixture(0), ["yard", "backed"], 5)];
    expect([mid.x, mid.y, mid.z]).toEqual([5, 3, 7]);
    expect([corner.x, corner.z]).toEqual([7, 32]);
    expect(none).toEqual([]);
    const ids = ["yard", "backed", "mid", ...Array.from({ length: 33 }, (_, k) => "b" + k)];
    expect(lightPlaces(fixture(33), ids, 32).map((p) => p.building)).toEqual(["mid", ...Array.from({ length: 31 }, (_, k) => "b" + k)]);
    expect(STREET_LIGHTS_MAX).toBe(32);
  });

  it("the pool is made once and only intensities change: a lit and a dark building leave the scene the same lights, all visible, none shadowed", () => {
    const places = lightPlaces(fixture(0), ["mid", "corner"], 5);
    const pool = streetLights(places, 0.18);
    const scene = new Scene();
    scene.add(...pool.lights);
    setStreetLights(pool, new Map([["mid", { level: 0.6, flare: 0 }], ["corner", { level: 0, flare: 0 }]]));
    expect(scene.children.length).toBe(2);
    expect(pool.lights.every((l) => l.visible && !l.castShadow)).toBe(true);
    expect(pool.lights.map((l) => l.intensity)).toEqual([STREET_LIGHT_INTENSITY * 0.6, 0]);
    expect(streetLights(places, 0.18, 3).lights.length).toBe(5);
  });
});
