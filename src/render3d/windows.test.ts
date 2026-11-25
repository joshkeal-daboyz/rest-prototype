/**
 * Ticket 081 L1: the lit building's windows. The mask's texels, a building's level through the Relight (on P0's file, 6 x 6 seed 1, the module cache) and in a brownout, and the window level written per instance on a fixture.
 */
import { readFileSync } from "node:fs";
import { BoxGeometry, Color, InstancedBufferAttribute, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Texture } from "three";
import { describe, expect, it } from "vitest";
import { EventBus, loadCityPuzzle } from "../core";
import { convertCityPuzzle } from "../city/circuit";
import { DEFAULT, sharedCity } from "../city/testing/namedcities";
import { createGrid } from "../grid";
import type { GridState } from "../grid";
import { circuitDraws } from "./circuitdraw";
import { jobWires, lineFlow, linesAround, sceneryDropWires, wholeFraction } from "./cityview";
import { overlayIcons, type Project } from "./overlay";
import { createRelightClock } from "./relight3d";
import { Scene } from "three";
import { DIM_LEVEL, DIM_SHARE, PANE_COLOURS, STREET_LIGHTS_MAX, STREET_LIGHT_INTENSITY, STREET_LIGHT_REACH_M, STOREY_REACH_DIV, WINDOW_FLARE_GAIN, WINDOW_LEVEL, WINDOW_LIT, WINDOW_UV, TARGET_PANE, buildingGlow, dimPieces, roofOffsets, glowCardMesh, glowCards, lampBuildings, lightPlaces, paneColour, sceneryLamps, setBuildingGlow, setDimWindows, setStreetLights, streetLights, targetBuildings, windowLit, windowMask, type BuildingGlow } from "./windows";

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

  const city = (n: number) => Array.from({ length: n }, (_, b) => ({ id: `b${b}`, pieces: [{ role: "floor", parts: 1 }, { role: "floor", parts: 2 }, { role: "floor3", parts: 1 }, { role: "roof", parts: 1 }] }));

  it("dim pieces (081 L3): the same pick every load, about DIM_SHARE of floors, never a roof or an excluded building", () => {
    const buildings = city(50); // 150 floor pieces, 50 roofs
    const exclude = new Set(["b0", "b1", "b2"]);
    const pick = dimPieces(buildings, DIM_SHARE, 7, exclude);
    expect([...dimPieces(buildings, DIM_SHARE, 7, exclude)]).toEqual([...pick]);
    expect([...pick.keys()].some((id) => exclude.has(id))).toBe(false);
    // Offsets 0..3 are the floors (parts 1, 2, 1) and 4 is the roof; a roof is never picked.
    expect([...pick.values()].flat().every((o) => o < 4)).toBe(true);
    // 1/25 of 141 floor pieces is about 6; across 3 seeds' worth the share stays within a factor of 3 either way.
    const many = dimPieces(city(1000), DIM_SHARE, 3, new Set()); // 3000 floor pieces
    const pieces = [...many.values()].reduce((a, l) => a + l.filter((o) => o !== 2).length, 0); // the middle piece's 2nd part is not a piece
    expect(pieces / 3000).toBeGreaterThan(DIM_SHARE * 0.7);
    expect(pieces / 3000).toBeLessThan(DIM_SHARE * 1.3);
  });

  it("dim windows (081 L3): the picked instances carry DIM_LEVEL, every other carries 0, and no material changes", () => {
    const twin = windowLit(new MeshStandardMaterial({ map: new Texture() }));
    const geo = new BoxGeometry(1, 1, 1);
    geo.setAttribute(WINDOW_LEVEL, new InstancedBufferAttribute(new Float32Array(4), 1));
    const mesh = new InstancedMesh(geo, twin, 4);
    const draw = { instances: new Map([["a", [0, 1, 2].map((index) => ({ mesh, index }))], ["lamp", [{ mesh, index: 3 }]]]) };
    setDimWindows(draw, new Map([["a", [1]]]));
    expect([...(geo.getAttribute(WINDOW_LEVEL).array as Float32Array)]).toEqual([0, Math.fround(DIM_LEVEL), 0, 0]);
    expect(mesh.material).toBe(twin);
  });
});

describe("scenery drawn live (081 S4)", () => {
  const p0 = () => {
    const run = sharedCity(DEFAULT, "facades");
    if (!run.ok) throw new Error(run.failure.reason);
    const city = loadCityPuzzle(JSON.parse(readFileSync("puzzles/city/city-two-ways-round.city.json", "utf8")));
    const converted = convertCityPuzzle(city, run.plan);
    const layer = run.plan.layers.circuit!;
    return { converted, layer, buildings: run.plan.layers.buildings!.buildings, draws: circuitDraws(layer, undefined, { converted }) };
  };

  it("a scenery building maps to its hidden lamp, dark while that lamp is dark and lit once current reaches it", { timeout: 60_000 }, () => {
    const { converted, buildings } = p0();
    const map = sceneryLamps(converted, buildings);
    const scenery = converted.scenery!;
    for (const [b, id] of Object.entries(scenery)) expect(map.get(b)).toContainEqual({ id, index: converted.puzzle.nodes.findIndex((n) => n.id === id) });
    const g = createGrid(converted.puzzle, new EventBus());
    const out: BuildingGlow = { level: 0, flare: 0 };
    const levels = (state: GridState): { dark: number; lit: number } => {
      let dark = 0;
      let lit = 0;
      for (const [b, id] of Object.entries(scenery)) {
        buildingGlow(null, state, map.get(b)!, 0, 0.3, out);
        if (state.lit.has(id)) expect(out.level, b).toBeGreaterThan(0), lit++;
        else expect(out.level, b).toBe(0), dark++;
      }
      return { dark, lit };
    };
    const start = levels(g.state());
    g.throwSwitch("sw");
    g.repairAt("l_e2");
    const won = levels(g.state());
    expect(start.dark).toBeGreaterThan(0);
    expect(won.lit).toBeGreaterThan(start.lit);
  });

  it("the live layer holds one drop wire per scenery building, lit by its hidden lamp's line, and the Relight's run is paced over the whole of a split line", { timeout: 60_000 }, () => {
    const { converted, layer, draws } = p0();
    const wires = sceneryDropWires(layer, draws, converted);
    const scenery = converted.scenery!;
    expect(wires.map((w) => w.id).sort()).toEqual(Object.keys(scenery).map((b) => `drop:${b}`).sort());
    expect(layer.drops.length).toBeGreaterThan(wires.length);
    for (const w of wires) {
      const b = w.id.slice("drop:".length);
      const line = converted.puzzle.lines[w.lineIndex]!;
      expect([line.id, line.to]).toEqual([`${scenery[b]}~l`, scenery[b]]);
      expect(converted.runs[line.id]).toBeUndefined();
    }
    // A split line's drawn run lights from the start of `L~a` to the end of `L~b`, not over `L`'s middle third.
    const g = createGrid(converted.puzzle, new EventBus());
    g.throwSwitch("sw");
    g.repairAt("l_e2");
    const won = g.state();
    const plan = createRelightClock(converted.puzzle).update(won, 0.01)!;
    const around = linesAround(converted.puzzle.lines).get("l_n")!;
    const index = converted.puzzle.lines.findIndex((l) => l.id === "l_n");
    const reversed = won.flowFrom.get("l_n") === converted.puzzle.lines[index]!.to;
    const first = reversed ? around.b : around.a;
    const last = reversed ? around.a : around.b;
    expect(wholeFraction(plan, index, around, reversed, plan.lineStart[first]! - 0.001)).toBe(0);
    expect(wholeFraction(plan, index, around, reversed, plan.lineEnd[last]!)).toBe(1);
    const mid = (plan.lineStart[first]! + plan.lineEnd[last]!) / 2;
    expect(wholeFraction(plan, index, around, reversed, mid)).toBeCloseTo(0.5, 6);
  });

  it("hidden nodes stay hidden: the overlay's icons and the job's wires (what picks are built from) name the file's nodes and lines only", { timeout: 60_000 }, () => {
    const { converted, layer, draws } = p0();
    const hidden = new Set(converted.hidden ?? []);
    expect(hidden.size).toBeGreaterThan(0);
    const g = createGrid(converted.puzzle, new EventBus());
    const project: Project = (x, _y, z, out) => ((out.x = x), (out.y = z), true);
    const icons = overlayIcons(converted, g.state(), project, { layer, width: 1e6, height: 1e6, time: 0.4 });
    expect(icons.length).toBeGreaterThan(0);
    for (const i of icons) expect(hidden.has(i.id), i.id).toBe(false);
    for (const w of jobWires(layer, draws, converted)) expect(hidden.has(w.line), w.line).toBe(false);
  });
});

describe("a lit building reads as lit (081 W2)", () => {
  const door = (side: string, faces: string) => ({ side, faces, frontage: "street" });
  // One building of one column: a ground storey (0 to 3), floor pieces at 3 and 6 and a roof at 9 (three storeys up), its +z face on a street and its -z face on a yard.
  const column = { i: 0, j: 0, building: "tower", ground: { y_m: 0, top_m: 3 }, pieces: [{ role: "floor", storey: 1, span: 1, placement: { y_m: 3 } }, { role: "floor", storey: 2, span: 1, placement: { y_m: 6 } }, { role: "roof", storey: 3, span: 0, placement: { y_m: 9 } }] };
  const plan = { layers: { mass: { built: [{ i: 0, j: 0, open: [door("+z", "street"), door("-z", "yard")] }] }, buildings: { buildings: [{ id: "tower", cells: [{ i: 0, j: 0 }] }], columns: [column] } } } as never;

  it("every glass-bearing storey of a lit building has a glow card on each open face (street and inner), the roof has none, and its light stands at half its height", () => {
    const all = glowCards(plan, ["tower"]);
    const cards = all.filter((c) => !c.flat);
    expect(all.filter((c) => c.flat).length).toBe(1); // one ground glow for the building, from its yard face only
    expect(cards.map((c) => [c.y, c.nz])).toEqual([[1.5, 1], [4.5, 1], [7.5, 1], [1.5, -1], [4.5, -1], [7.5, -1]]);
    expect(glowCards(plan, ["other"])).toEqual([]);
    const light = lightPlaces(plan, ["tower"], 5)[0]!;
    expect(light.y).toBe(4.5);
    expect(streetLights([light], 1).lights[0]!.distance).toBeCloseTo(STREET_LIGHT_REACH_M * (1 + 3 / STOREY_REACH_DIV), 9);
  });

  it("a building whose lamp is dead, its line powered, has its drop lit and its windows, glow cards and light at 0", { timeout: 60_000 }, () => {
    const run = sharedCity(DEFAULT, "facades");
    if (!run.ok) throw new Error(run.failure.reason);
    const file = JSON.parse(readFileSync("puzzles/city/city-two-ways-round.city.json", "utf8"));
    file.faults = [{ id: "bulb", at: "homes", kind: "dead-lamp" }];
    const converted = convertCityPuzzle(loadCityPuzzle(file), run.plan);
    const g = createGrid(converted.puzzle, new EventBus());
    g.throwSwitch("sw");
    const state = g.state();
    const index = converted.puzzle.lines.findIndex((l) => l.to === "homes");
    const line = converted.puzzle.lines[index]!;
    const wires = jobWires(run.plan.layers.circuit!, circuitDraws(run.plan.layers.circuit!, undefined, { converted }), converted).filter((w) => w.line === line.id);
    const flow = { fraction: 0, reversed: false };
    expect(lineFlow(state, line, index, wires, null, 0, flow).fraction).toBe(1);
    const lamps = lampBuildings(converted.puzzle.nodes, converted.places, run.plan.layers.circuit!.roofs ?? [], run.plan.layers.buildings!.buildings);
    const [building, list] = [...lamps].find(([, l]) => l.some((x) => x.id === "homes"))!;
    const glow = buildingGlow(null, state, list, 0, 0.3, { level: 1, flare: 0 });
    expect(glow.level).toBe(0);
    const cards = glowCardMesh(glowCards(run.plan, [building]), 0.18);
    cards.set(building, glow);
    cards.commit();
    expect(cards.mesh!.count).toBe(0);
    const pool = streetLights(lightPlaces(run.plan, [building], 5), 0.18);
    setStreetLights(pool, new Map([[building, glow]]));
    expect(pool.lights.map((l) => l.intensity)).toEqual([0]);
  });

  it("a lit building's ground storey, shopfront and every floor carry its window level and its roof none", () => {
    // Instances in the order plan3d lists them: floor, floor (two parts), roof, then the ground piece.
    const pieces = [{ role: "floor", parts: 1 }, { role: "floor", parts: 2 }, { role: "roof", parts: 1 }];
    const geo = new BoxGeometry(1, 1, 1);
    geo.setAttribute(WINDOW_LEVEL, new InstancedBufferAttribute(new Float32Array(5), 1));
    const mesh = new InstancedMesh(geo, windowLit(new MeshStandardMaterial({ map: new Texture() })), 5);
    const draw = { instances: new Map([["tower", [0, 1, 2, 3, 4].map((index) => ({ mesh, index }))]]) };
    setBuildingGlow(draw, "tower", { level: 1, flare: 0 }, roofOffsets([{ id: "tower", pieces }]).get("tower"));
    expect([...(geo.getAttribute(WINDOW_LEVEL).array as Float32Array)]).toEqual([1, 1, 1, 0, 1]);
  });

  it("a target building's window, light and glow card are TARGET_PANE gold and a scenery building's the amber (081 W3)", () => {
    const amber = new Color(PANE_COLOURS[0]);
    const gold = new Color(TARGET_PANE);
    expect(paneColour({ target: true }).getHex()).toBe(gold.getHex());
    expect(paneColour({}).getHex()).toBe(amber.getHex());
    const geo = new BoxGeometry(1, 1, 1);
    geo.setAttribute(WINDOW_LEVEL, new InstancedBufferAttribute(new Float32Array(2), 1));
    const mesh = new InstancedMesh(geo, new MeshBasicMaterial(), 2);
    const draw = { instances: new Map([["t", [{ mesh, index: 0 }]], ["s", [{ mesh, index: 1 }]]]) };
    setBuildingGlow(draw, "t", { level: 1, flare: 0, target: true });
    setBuildingGlow(draw, "s", { level: 1, flare: 0 });
    expect([...(geo.getAttribute(WINDOW_LEVEL).array as Float32Array)]).toEqual([-1, 1]);
    const pool = streetLights([{ building: "mid", x: 0, y: 3, z: 0 }, { building: "corner", x: 5, y: 3, z: 0 }], 0.18);
    setStreetLights(pool, new Map([["mid", { level: 1, flare: 0, target: true }], ["corner", { level: 1, flare: 0 }]]));
    expect(pool.lights.map((l) => l.color.getHex())).toEqual([gold.getHex(), amber.getHex()]);
    const lamps = new Map([["a", [{ id: "l1", index: 0 }]], ["b", [{ id: "l2", index: 1 }]]]);
    expect([...targetBuildings(lamps, ["l2"])]).toEqual(["b"]);
  });
});
