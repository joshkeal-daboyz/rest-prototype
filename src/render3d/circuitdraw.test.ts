/**
 * Ticket 081 K3: the circuit drawn on the city. Rules on a small typed layer; one case on 6 x 6 seed 1 (the module cache) for the converted fixture.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import { GROUND_POLE_ATTACH_UP_M, GROUND_POLE_MIX, loadCityPuzzle, type CityCircuitLayer, type CityPuzzleConverted, type CityStreetsLayer } from "../core";
import { convertCityPuzzle } from "../city/circuit";
import { ROOF_MAST_ATTACH_MIN_M } from "../city/circuit/constants";
import { DEFAULT, sharedCity } from "../city/testing/namedcities";
import { COMPONENT_MODELS, SCENERY_MODELS } from "./componentmodels";
import { COMPONENT_H_M, ON_POLE_GAP_M, ROOF_ARM, WALL_FITTING, circuitDraws, circuitKeyUses, circuitGroup, componentOf, type CircuitDraws, type CircuitJob } from "./circuitdraw";
import { FEED_POLE_KEY, POWER_LINE, POWER_POLES, placePole, poleAttachModel, poleToWorld } from "./powerkit";
import { WORLD_PER_METRE as S } from "./models";

const APOC = GROUND_POLE_MIX[0];
const PALM = GROUND_POLE_MIX[1];

const streets = { streets: [{ id: "x:1", axis: "x" }] } as unknown as CityStreetsLayer;
const pole = (id: string, x: number, z: number) => ({ id, kind: "slot" as const, street: "x:1", pavement: "lo" as const, along_m: x, x_m: x, z_m: z, block: "b", side: "+z" as const, nudged_m: 0 });
const roof = (id: string, row: "corner" | "mid", x: number) => ({ id, row, building: "bld", block: "b", cell: { i: 0, j: 0 }, sides: ["+x" as const], x_m: x, z_m: 40, deck_y_m: 12.5, keep_half_m: 1.2 });
const layer: CityCircuitLayer = {
  stage: "circuit",
  poles: [pole("p1", 0, 10), pole("p2", 12, 10)],
  spans: [{ id: "span:p1~p2", kind: "along", a: "p1", b: "p2", len_m: 12, street: "x:1" }],
  drops: [{ id: "drop:bld", pole: "p2", building: "bld", cell: { i: 0, j: 0 }, x_m: 12, z_m: 16, y_m: 5.5 }],
  lights: [],
  posts: [],
  keep: [],
  poleModels: { p1: APOC, p2: PALM },
  roofs: [roof("roof:0:0", "corner", 20), roof("roof:3:0", "mid", 30)],
  roofSpans: [{ id: "span:p2~roof:3:0", kind: "roof", over: "street", a: "p2", b: "roof:3:0", len_m: 30, street: "x:1", junction: null }],
};
const job = (over: Partial<CityPuzzleConverted>, readable?: ReadonlySet<string>): CircuitJob => ({
  converted: { puzzle: { nodes: [] } as unknown as CityPuzzleConverted["puzzle"], places: {}, runs: {}, cuts: {}, ...over },
  ...(readable ? { readable } : {}),
});
const lowOf = (w: { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }): number =>
  (w.from.y + w.to.y) / 2 - 0.04 * Math.hypot(w.to.x - w.from.x, w.to.y - w.from.y, w.to.z - w.from.z);

describe("the circuit drawn (081 K3)", () => {
  it("draws every pole on its poleModels model and every span and drop as wire, ending at the attachment stage 6 judged", () => {
    const d = circuitDraws(layer, streets);
    expect(d.pieces.filter((p) => p.role === "pole").map((p) => [p.id, p.key])).toEqual([["p1", APOC], ["p2", PALM]]);
    for (const p of d.pieces.filter((x) => x.role === "pole")) expect(p.position.y).toBeCloseTo(0, 6);
    const span = d.wires.find((w) => w.id === "span:p1~p2")!;
    expect(span.from).toEqual({ x: 0, y: Math.min(...GROUND_POLE_ATTACH_UP_M[APOC]) * S, z: 10 * S });
    expect(span.to.y).toBeCloseTo(Math.min(...GROUND_POLE_ATTACH_UP_M[PALM]) * S, 9);
    expect(span.pieces[0]!.from).toEqual(span.from);
    expect(span.pieces.at(-1)!.to).toEqual(span.to);
    const drop = d.wires.find((w) => w.id === "drop:bld")!;
    expect(drop.kind).toBe("drop");
    // The drop leaves one of its pole's own insulators, no lower than stage 6's lowest attachment, and ends at the bracket's seat, not the wall point; spans end as before.
    const pm = POWER_POLES[PALM]!;
    const t = placePole(pm, { x: 12 * S, y: 0, z: 10 * S }, { x: 1, z: 0 }, pm.attach_m[0].up * S, S);
    const seats = pm.attach_m.map((a, i) => ({ own: a.ownInsulator, w: poleToWorld(t, poleAttachModel(pm, i)) }));
    expect(seats.filter((s) => s.own && Math.hypot(s.w.x - drop.from.x, s.w.y - drop.from.y, s.w.z - drop.from.z) < 1e-9)).toHaveLength(1);
    expect(drop.from.y).toBeGreaterThanOrEqual(span.to.y - 1e-9);
    expect(drop.to).not.toEqual({ x: 12 * S, y: 5.5 * S, z: 16 * S });
  });

  it("stands the City bracket at a drop's wall point, back on the wall and its arm tip the drop's end at 5.5 m, no wall lamp under it (081 L1: the pick is removed), and the bracket on 'fittings' only", () => {
    const withLamp = circuitDraws(layer, streets, job({ puzzle: { nodes: [{ id: "lamp", type: "lamp" }] } as unknown as CityPuzzleConverted["puzzle"], places: { lamp: { building: "bld" } } as unknown as CityPuzzleConverted["places"] }));
    const fit = withLamp.pieces.find((p) => p.role === "fitting")!;
    expect(fit.key).toBe(SCENERY_MODELS.wallFitting.key);
    // The pole is on the -z side of the wall point, so the bracket faces -z: origin 0.171 m out, arm tip 0.342 m out, base 0.533 m under the drop.
    expect(fit.position.z / S).toBeCloseTo(16 - WALL_FITTING.back_m, 9);
    expect(fit.position.y / S).toBeCloseTo(5.5 - WALL_FITTING.up_m, 9);
    const drop = withLamp.wires.find((w) => w.id === "drop:bld")!;
    expect(drop.to.z / S).toBeCloseTo(16 - WALL_FITTING.out_m, 9);
    expect(drop.to.y / S).toBeCloseTo(5.5, 9);
    expect(drop.key).toBe(POWER_LINE);
    // The wall lamp is removed: no piece stands for it, no key is asked for, but its place is kept for the pick proxy, centreOn and the overlay.
    expect(withLamp.pieces.find((p) => p.id === "lamp")).toBeUndefined();
    expect(withLamp.removed.map((p) => p.id)).toEqual(["lamp"]);
    expect(withLamp.pieces.filter((p) => p.component === "lampBuilding")).toEqual([]);
    expect(circuitKeyUses().map((u) => u.key)).not.toContain(COMPONENT_MODELS.lampBuilding.key);
    expect(circuitKeyUses().filter((u) => u.key === SCENERY_MODELS.wallFitting.key).map((u) => u.list)).toEqual(["fittings"]);
    expect(circuitKeyUses().filter((u) => u.list === "drops")).toEqual([{ list: "drops", key: POWER_LINE }]);
  });

  it("stands a structure on every corner roof with its arm no lower than 2.0 m over the deck, and a mid roof and a roof span only where the job uses them", () => {
    const none = circuitDraws(layer, streets);
    expect(none.pieces.filter((p) => p.role === "roofMast").map((p) => p.id)).toEqual(["roof:0:0"]);
    expect(none.wires.filter((w) => w.kind === "roofSpan")).toEqual([]);
    const used = circuitDraws(layer, streets, job({ runs: { l: { spans: ["span:p2~roof:3:0"] } } }));
    expect(used.pieces.filter((p) => p.role === "roofMast").map((p) => p.id)).toEqual(["roof:0:0", "roof:3:0"]);
    expect(used.wires.filter((w) => w.kind === "roofSpan").map((w) => w.id)).toEqual(["span:p2~roof:3:0"]);
    expect(used.arms).toHaveLength(2);
    for (const a of used.arms) expect(a.position.y - (ROOF_ARM.h_m / 2) * S).toBeGreaterThanOrEqual((12.5 + ROOF_MAST_ATTACH_MIN_M) * S - 1e-9);
    expect(used.wires.find((w) => w.kind === "roofSpan")!.to.y).toBeGreaterThanOrEqual((12.5 + ROOF_MAST_ATTACH_MIN_M) * S);
    const stacked = circuitDraws(layer, streets, job({ puzzle: { nodes: [{ id: "sw", type: "switch" }, { id: "br", type: "breaker" }] } as unknown as CityPuzzleConverted["puzzle"], places: { sw: { roof: "roof:0:0" }, br: { roof: "roof:0:0" } } as unknown as CityPuzzleConverted["places"] }));
    const armY = stacked.arms[0]!.position.y - (ROOF_ARM.h_m / 2) * S;
    for (const id of ["sw", "br"]) {
      const m = stacked.pieces.find((p) => p.id === id)!;
      expect(m.position.y + COMPONENT_H_M[id === "sw" ? "switch" : "breaker"] * S).toBeLessThanOrEqual(armY + 1e-9);
      expect(m.position.y).toBeGreaterThanOrEqual(12.5 * S - 1e-9);
    }
  });

  it("stands one model per node of the converted puzzle on 6 x 6 seed 1, and the feed's pole is the feed pick, with its spans over 4.2 m", { timeout: 60_000 }, () => {
    const run = sharedCity(DEFAULT, "facades");
    if (!run.ok) throw new Error(run.failure.reason);
    const puzzle = loadCityPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "fixtures", "city-two-ways-round.city.json"), "utf8")));
    const converted = convertCityPuzzle(puzzle, run.plan);
    const circuit = run.plan.layers.circuit!;
    const d = circuitDraws(circuit, run.plan.layers.streets, { converted });
    const nodes = converted.puzzle.nodes.filter((n) => !converted.hidden!.includes(n.id));
    const feed = nodes.find((n) => n.type === "feed")!;
    const feedAt = (converted.places[feed.id] as { pole: string }).pole;
    const standing = d.pieces.filter((p) => p.role === "component" || p.role === "feed");
    // The building lamps are removed picks (081 L1): their places are kept in `removed`, not stood.
    expect(d.removed.map((p) => p.id).sort()).toEqual(nodes.filter((n) => n.type === "lamp").map((n) => n.id).sort());
    expect(standing).toHaveLength(nodes.length - d.removed.length);
    for (const n of nodes.filter((x) => !d.removed.some((r) => r.id === x.id))) {
      const piece = standing.find((p) => p.id === (n.id === feed.id ? feedAt : n.id))!;
      expect(piece.key, n.id).toBe(COMPONENT_MODELS[componentOf(n, converted.places[n.id]!)].key);
    }
    expect(d.pieces.find((p) => p.id === feedAt)!.key).toBe(FEED_POLE_KEY);
    expect(FEED_POLE_KEY).toBe(COMPONENT_MODELS.feed.key);
    expect(d.pieces.filter((p) => p.role === "pole" && p.id === feedAt)).toEqual([]);
    for (const s of circuit.spans.filter((x) => x.a === feedAt || x.b === feedAt)) expect(lowOf(d.wires.find((w) => w.id === s.id)!)).toBeGreaterThan(4.2 * S);
  });

  const stub = (): Object3D => {
    const g = new Group();
    g.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()));
    return g;
  };
  it("draws a placeholder for a null key and for a model that did not load, and never throws", () => {
    const at = { x: 1, y: 0, z: 1 };
    const draws: CircuitDraws = {
      removed: [],
      pieces: [
        { id: "a", role: "component", key: null, component: "relay", position: at, yaw: 0, scale: S },
        { id: "b", role: "component", key: "pack:missing", component: "relay", position: at, yaw: 0, scale: S },
        { id: "c", role: "component", key: "pack:here", component: "relay", position: at, yaw: 0, scale: S },
      ],
      arms: [],
      wires: [],
    };
    const drawn = circuitGroup(draws, new Map([["pack:here", stub()]]));
    expect(drawn.placeholders).toBe(2);
    expect(drawn.perKey.get("pack:here")).toBe(1);
    expect(drawn.group.children.map((c) => c.name).sort()).toEqual(["circuit:here", "circuit:placeholder"]);
    expect(() => circuitGroup(circuitDraws(layer, streets), new Map()).dispose()).not.toThrow();
  });

  it("stands the damaged-line prop at the cut span's low point only while its fault is readable; unreadable, the span is an ordinary wire", () => {
    const cut = { cuts: { f_cut: "span:p1~p2" } };
    const readable = circuitDraws(layer, streets, job(cut, new Set(["f_cut"])));
    const prop = readable.pieces.filter((p) => p.role === "cutProp");
    expect(prop).toHaveLength(1);
    expect(prop[0]!.key).toBe(COMPONENT_MODELS.damagedLine.key);
    expect(prop[0]!.position.x).toBeCloseTo(6 * S, 9);
    expect(prop[0]!.position.y + 1.352 * S).toBeCloseTo(lowOf(readable.wires.find((w) => w.id === "span:p1~p2")!), 9);
    const hidden = circuitDraws(layer, streets, job(cut, new Set()));
    expect(hidden.pieces.filter((p) => p.role === "cutProp")).toEqual([]);
    expect(hidden.wires.find((w) => w.id === "span:p1~p2")?.kind).toBe("span");
  });
});
