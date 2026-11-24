/**
 * Ticket 081 K2a: stage 6's poles and spans (CK1 to CK6, CK8). The rules fail on a real 6 x 6 seed 1 layer (one-way on) with one thing changed, so a fixture is the layer plus its tamper (test policy rule 2).
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { CityCircuitLayer, CityPlan, CityPole, CityResolvedPlan, CityRoofMast, CityRoofSpan, CityWireSpan } from "../../core";
import { poleAt, POWER_MIX } from "../../render3d/powerkit";
import { digestOf } from "../pipeline/digest";
import { pictureProblems } from "../pipeline/picture";
import { circuitPoints } from "../pipeline/readable";
import { runCity } from "../stages";
import { stagesOfProfile } from "../testing/namedcities";
import { circuitProblems, type CircuitInput, type CircuitProblem } from "./check";
import { nodePlaceProblems } from "./checkplaces";
import { poleModelFor } from "./polemodel";
import { DROP_CROSS_MAX_M, DROP_MAX_M, WALK_FLOOR_M } from "./constants";
import { hangAt, judgeSpan, len3, lowestOver, roofContext, type End } from "./roofgeom";
import { roofEnd } from "./roofplaces";
import { circuitStage } from "./stage";

let plan: CityPlan;
let input: CircuitInput;
let layer: CityCircuitLayer;

beforeAll(() => {
  const upto = stagesOfProfile("facades", "on");
  const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "circuit", upto.slice(0, upto.findIndex((d) => d.name === "circuit") + 1));
  if (!r.ok) throw new Error(r.failure.reason);
  plan = r.plan;
  input = { streets: plan.layers.streets!, edge: plan.layers.edge!, mass: plan.layers.mass!, buildings: plan.layers.buildings! };
  layer = plan.layers.circuit!;
}, 60_000);

const rules = (problems: CircuitProblem[]): string[] => [...new Set(problems.map((p) => p.rule))].sort();
const withPoles = (poles: readonly CityPole[]): CityCircuitLayer => ({ ...layer, poles });
const withSpans = (spans: readonly CityWireSpan[]): CityCircuitLayer => ({ ...layer, spans });
const span = (kind: CityWireSpan["kind"], a: CityPole, b: CityPole): CityWireSpan => ({ id: `span:${a.id}~${b.id}`, kind, a: a.id, b: b.id, len_m: 5, street: a.street });

describe("stage 6, poles and spans (081 K2a) and places (081 K2b)", () => {
  it("R-1 to R-7: the stage's layer is frozen, its picture is the lattice's, its digest is pinned, every pole is named, and nothing on seed 1 fails CK1 to CK8, CK7 or CK17a to d", () => {
    expect(Object.isFrozen(layer.poles[0])).toBe(true);
    expect(Object.isFrozen(layer.spans)).toBe(true);
    expect(pictureProblems(circuitStage.picture(plan), plan.layers.streets!.w, plan.layers.streets!.h)).toEqual([]);
    expect(plan.digests.circuit).toBe(digestOf(layer));
    expect(plan.digests.circuit).toBe("b5cf46ef");
    expect(Object.keys(layer.poleModels).sort()).toEqual(layer.poles.map((p) => p.id).sort());
    expect(circuitProblems(layer, input)).toEqual([]);
  });

  it("CK1: poles on the wrong pavement of their street fail", () => {
    const street = layer.poles.find((p) => p.kind === "slot")!.street;
    const moved = layer.poles.map((p) => (p.street === street && p.kind !== "crossing" ? { ...p, pavement: p.pavement === "lo" ? ("hi" as const) : ("lo" as const) } : p));
    expect(rules(circuitProblems(withPoles(moved), input))).toContain("CK1");
  });

  it("CK2: a line's last slot 9 m from its block's end fails", () => {
    const end = layer.poles.find((p) => p.kind === "end" && p.side === "+z")!;
    const inward = end.along_m - 6.5;
    const moved = layer.poles.map((p) => (p.id === end.id ? { ...p, along_m: inward, x_m: p.x_m - 6.5 } : p));
    const found = circuitProblems(withPoles(moved), input);
    expect(found.some((p) => p.rule === "CK2" && p.id === `${end.block} ${end.side}`)).toBe(true);
  });

  it("CK3: a pole on a pavementDip cell fails", () => {
    const g = input.edge.ground!.find((c) => c.role === "pavement" && c.variant === 16)!;
    const st = input.streets.streets.find((s) => s.id === g.street)!;
    const lo = (st.axis === "x" ? g.j : g.i) === st.across0;
    const onDip: CityPole = { ...layer.poles[0]!, id: "pole:fixture", street: st.id, pavement: lo ? "lo" : "hi", along_m: st.axis === "x" ? g.x_m : g.z_m, x_m: g.x_m, z_m: g.z_m };
    expect(circuitProblems(withPoles([...layer.poles, onDip]), input).some((p) => p.rule === "CK3" && p.id === "pole:fixture")).toBe(true);
  });

  it("CK4: an along span that skips a pole fails", () => {
    const line = layer.poles.filter((p) => p.block === layer.poles[5]!.block && p.side === layer.poles[5]!.side && p.kind !== "crossing").sort((x, y) => x.along_m - y.along_m);
    const skip = span("along", line[0]!, line[2]!);
    expect(circuitProblems(withSpans([...layer.spans, skip]), input).some((p) => p.rule === "CK4" && p.id === skip.id)).toBe(true);
  });

  it("CK5: a corner span between two different blocks' end slots fails", () => {
    const corner = layer.spans.find((s) => s.kind === "corner")!;
    const a = layer.poles.find((p) => p.id === corner.a)!;
    const far = layer.poles.find((p) => p.kind === "end" && p.block !== a.block)!;
    const bad = span("corner", a, far);
    expect(circuitProblems(withSpans([...layer.spans, bad]), input).some((p) => p.rule === "CK5" && p.id === bad.id)).toBe(true);
  });

  it("CK6: a crossing straight on over a junction, from one block's end slot to the next block's on the same street, fails", () => {
    const end = layer.poles.find((p) => p.kind === "end")!;
    const next = layer.poles.find((p) => p.kind === "end" && p.street === end.street && p.pavement === end.pavement && p.block !== end.block)!;
    const bad = span("cross", end, next);
    expect(circuitProblems(withSpans([...layer.spans, bad]), input).some((p) => p.rule === "CK6" && p.id === bad.id)).toBe(true);
  });

  it("CK8: seed 1's poles are one network, and with its crossings left out they are not", () => {
    expect(circuitProblems(layer, input).filter((p) => p.rule === "CK8")).toEqual([]);
    const cut = circuitProblems(withSpans(layer.spans.filter((s) => s.kind !== "cross")), input).filter((p) => p.rule === "CK8");
    expect(cut.some((p) => p.id === "city")).toBe(true);
  });

  it("CK9 as changed: a far-side building takes an own crossing pole within 7.5 m, else a drop across its street that sets street, and every building with a street front has one", () => {
    const pole = new Map(layer.poles.map((p) => [p.id, p] as const));
    const plan = (d: (typeof layer.drops)[number]): number => Math.hypot(pole.get(d.pole)!.x_m - d.x_m, pole.get(d.pole)!.z_m - d.z_m);
    const viaCrossing = layer.drops.filter((d) => pole.get(d.pole)!.kind === "crossing");
    const across = layer.drops.filter((d) => d.street !== undefined);
    expect(viaCrossing.length).toBeGreaterThan(0);
    expect(across.length).toBeGreaterThan(0);
    for (const d of viaCrossing) expect(plan(d) <= DROP_MAX_M + 0.01 && d.street === undefined).toBe(true);
    for (const d of across) expect(pole.get(d.pole)!.kind !== "crossing" && pole.get(d.pole)!.street === d.street && plan(d) > DROP_MAX_M && plan(d) <= DROP_CROSS_MAX_M).toBe(true);
    const walled = input.buildings.buildings.filter((b) => input.mass.built.some((c) => b.cells.some((q) => q.i === c.i && q.j === c.j) && c.open.some((o) => o.side === b.front && o.faces === "street")));
    expect(walled.every((b) => layer.drops.some((d) => d.building === b.id))).toBe(true);
  });

  it("CK9's check: a building with a street front and no drop fails, as does a far-side drop across when an own crossing pole was in reach, and a drop longer than its reach", () => {
    const pole = new Map(layer.poles.map((p) => [p.id, p] as const));
    const own = layer.drops.find((d) => d.street === undefined && pole.get(d.pole)!.kind !== "crossing")!;
    const crossing = layer.drops.find((d) => pole.get(d.pole)!.kind === "crossing")!;
    const far = layer.poles.find((p) => p.kind !== "crossing" && p.street === layer.drops.find((d) => d.street !== undefined)!.street)!;
    const missing = circuitProblems({ ...layer, drops: layer.drops.filter((d) => d !== own) }, input);
    expect(missing.some((p) => p.rule === "CK9" && p.id === own.building && p.reason.includes("no drop"))).toBe(true);
    const across = circuitProblems({ ...layer, drops: layer.drops.map((d) => (d === crossing ? { ...d, pole: far.id, street: far.street } : d)) }, input);
    expect(across.some((p) => p.rule === "CK9" && p.id === crossing.id)).toBe(true);
    const long = circuitProblems({ ...layer, drops: layer.drops.map((d) => (d === own ? { ...d, x_m: d.x_m + 20 } : d)) }, input);
    expect(long.some((p) => p.rule === "CK9" && p.id === own.id && p.reason.includes("longer"))).toBe(true);
  }, 20_000);

  it("CK7 on drops: every drop's lowest point is 4.2 m or more, one over a carriageway may be under 5.5 m, and a drop hung from 2 m fails as CK7", () => {
    const z = roofContext(layer, input);
    const low = (d: (typeof layer.drops)[number], y = d.y_m): number => {
      const a = z.poleEnd.get(d.pole)!;
      const b: End = { id: d.id, x: d.x_m, z: d.z_m, y };
      return lowestOver(a.y, b.y, len3(a, b), 0, 1);
    };
    const lows = layer.drops.map((d) => low(d));
    expect(Math.min(...lows)).toBeGreaterThanOrEqual(WALK_FLOOR_M);
    expect(Math.min(...lows)).toBeLessThan(5.5);
    const d = layer.drops.find((x) => x.street !== undefined)!;
    expect(circuitProblems({ ...layer, drops: layer.drops.map((x) => (x === d ? { ...x, y_m: 2 } : x)) }, input).some((p) => p.rule === "CK7" && p.id === d.id)).toBe(true);
  }, 20_000);

  it("CK10: a light at a crossing pole's spot fails, and so does one on the pole pavement", () => {
    const l = layer.lights[0]!;
    const c = layer.poles.find((p) => p.kind === "crossing")!;
    const onPole = circuitProblems({ ...layer, lights: [{ ...l, x_m: c.x_m, z_m: c.z_m }] }, input);
    expect(onPole.some((p) => p.rule === "CK10" && p.id === l.id && p.reason.includes("within"))).toBe(true);
    const flipped = circuitProblems({ ...layer, lights: [{ ...l, pavement: l.pavement === "lo" ? "hi" : "lo" }] }, input);
    expect(flipped.some((p) => p.rule === "CK10" && p.reason.includes("pole pavement"))).toBe(true);
  });

  it("CK11: a lamp post stands at an along span's midpoint on the span's own line; one moved off it, or on a short span, fails", () => {
    expect(circuitProblems(layer, input).filter((p) => p.rule === "CK11")).toEqual([]);
    const q = layer.posts[0]!;
    const moved = circuitProblems({ ...layer, posts: [{ ...q, x_m: q.x_m + 1 }, ...layer.posts.slice(1)] }, input);
    expect(moved.some((p) => p.rule === "CK11" && p.id === q.span)).toBe(true);
    const corner = layer.spans.find((s) => s.kind === "corner")!;
    expect(circuitProblems({ ...layer, posts: [...layer.posts, { span: corner.id, x_m: 0, z_m: 0 }] }, input).some((p) => p.rule === "CK11" && p.id === corner.id)).toBe(true);
  });

  describe("CK12, node places", () => {
    const attach = (id: string): number => layer.spans.filter((s) => s.a === id || s.b === id).length + layer.drops.filter((d) => d.pole === id).length;
    it("CK12: a switch on a pole with 2 attachments fails, and on one with 3 passes", () => {
      const two = layer.poles.find((p) => attach(p.id) === 2)!;
      const three = layer.poles.find((p) => attach(p.id) >= 3)!;
      expect(nodePlaceProblems(layer, [{ id: "s", type: "switch", place: { pole: two.id } }]).map((p) => p.rule)).toEqual(["CK12"]);
      expect(nodePlaceProblems(layer, [{ id: "s", type: "switch", place: { pole: three.id } }])).toEqual([]);
    });

    it("CK12: a breaker on a building fails, and a lamp on a building with a drop passes", () => {
      const d = layer.drops[0]!;
      expect(nodePlaceProblems(layer, [{ id: "b", type: "breaker", place: { building: d.building } }]).map((p) => p.id)).toEqual(["b"]);
      expect(nodePlaceProblems(layer, [{ id: "l", type: "lamp", place: { building: d.building } }, { id: "p", type: "lamp", place: { post: layer.posts[0]!.span } }])).toEqual([]);
    });

    it("CK12: two nodes on one place fail", () => {
      const pole = layer.poles.find((p) => attach(p.id) >= 2)!;
      const found = nodePlaceProblems(layer, [{ id: "a", type: "junction", place: { pole: pole.id } }, { id: "b", type: "breaker", place: { pole: pole.id } }]);
      expect(found.map((p) => p.id)).toEqual(["b"]);
    });
  });

  it("keep holds every pole and every street light, for stages 8 and 9", () => {
    const kept = new Set(layer.keep.map((k) => `${k.x_m},${k.z_m}`));
    expect(layer.keep).toHaveLength(layer.poles.length + layer.lights.length);
    expect([...layer.poles, ...layer.lights].every((p) => kept.has(`${p.x_m},${p.z_m}`))).toBe(true);
  });

  it("circuitPoints reads the layer: every pole, and every span as a segment between its poles", () => {
    const c = circuitPoints({ era: "clean", plan, history: null, adds: {}, pieces: [] } as unknown as CityResolvedPlan);
    expect(c.poles).toHaveLength(layer.poles.length);
    expect(c.lines).toHaveLength(layer.spans.length);
    const first = layer.spans[0]!;
    const a = layer.poles.find((p) => p.id === first.a)!;
    expect(c.lines[0]).toEqual({ id: first.id, a: { x_m: a.x_m, z_m: a.z_m }, b: expect.any(Object) });
  });

  describe("K2d1: the pole pick, CK7 and the roof places (081)", () => {
    const roofs = (): readonly CityRoofMast[] => layer.roofs!;
    const ctx = (): ReturnType<typeof roofContext> => roofContext(layer, input);
    const endOf = (id: string): End => {
      const r = roofs().find((x) => x.id === id);
      return r !== undefined ? roofEnd(r) : ctx().poleEnd.get(id)!;
    };
    /** A roof span place for two ends, its fields as they pass, so that only the rule under test can fail it. */
    const placeOf = (a: End, b: End): CityRoofSpan => {
      const j = judgeSpan(ctx(), a, b);
      const [x, y] = a.id < b.id ? [a, b] : [b, a];
      return { id: `span:${x.id}~${y.id}`, kind: "roof", over: j.over, a: x.id, b: y.id, len_m: j.len_m, street: j.street, junction: j.junction };
    };
    const withSpan = (s: CityRoofSpan): CircuitProblem[] => circuitProblems({ ...layer, roofSpans: [...layer.roofSpans!, s] }, input).filter((p) => p.id === s.id);
    const swap = (r: CityRoofMast, patch: Partial<CityRoofMast>): CityCircuitLayer => ({ ...layer, roofs: layer.roofs!.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) });

    it("PK2 criterion 2: the circuit's pole pick is poleAt's, on pole ids and on run#n ids", () => {
      const ids = [...layer.poles.slice(0, 10).map((p) => p.id), ...Array.from({ length: 10 }, (_, n) => `x:${n % 3}#${n}`)];
      expect(ids).toHaveLength(20);
      for (const id of ids) expect(poleModelFor(id)).toBe(poleAt(POWER_MIX, id));
    });

    it("CK7: every pole span on seed 1 hangs at 4.2 m or more, and a crossing stretched to 50 m on Apocalypse poles hangs under it", () => {
      const low = layer.spans.filter((s) => s.kind === "cross").map((s) => [s, ctx().spanEnds.get(s.id)!] as const).sort((x, y) => x[1][0].y + x[1][1].y - y[1][0].y - y[1][1].y)[0]!;
      expect(circuitProblems(layer, input).filter((p) => p.rule === "CK7")).toEqual([]);
      const stretched = layer.poles.map((p) => (p.id === low[0].b ? { ...p, x_m: p.x_m + 50 } : p));
      expect(circuitProblems(withPoles(stretched), input).some((p) => p.rule === "CK7" && p.id === low[0].id)).toBe(true);
    });

    it("CK17a corner places: one on every street corner roof, 0.6 m in from both walls, with its keep square; a corner with a lane or park side has none", () => {
      const corners = roofs().filter((r) => r.row === "corner");
      const streetCorners = input.mass.built.filter((c) => c.column === "corner" && c.open.length === 2 && c.open.every((o) => o.faces === "street"));
      expect(corners.map((r) => r.id).sort()).toEqual(streetCorners.map((c) => `roof:${c.i}:${c.j}`).sort());
      expect(layer.roofKeep!.map((k) => k.roof).sort()).toEqual(corners.map((r) => r.id).sort());
      expect(roofs().find((r) => r.id === "roof:54:47")).toMatchObject({ x_m: 270.6, z_m: 235.6, deck_y_m: 12.5, sides: ["-x", "-z"], keep_half_m: 1.2 });
      const gone = corners[0]!;
      expect(circuitProblems({ ...layer, roofs: roofs().filter((r) => r !== gone), roofKeep: layer.roofKeep!.filter((k) => k.roof !== gone.id) }, input).some((p) => p.rule === "CK17a" && p.id === gone.id)).toBe(true);
      const off = circuitProblems(swap(corners[1]!, { x_m: corners[1]!.x_m + 0.3 }), input);
      expect(off.some((p) => p.rule === "CK17a" && p.id === corners[1]!.id)).toBe(true);
      const quiet = input.mass.built.find((c) => c.column === "corner" && !c.open.every((o) => o.faces === "street"))!;
      const bogus: CityRoofMast = { ...corners[0]!, id: `roof:${quiet.i}:${quiet.j}`, cell: { i: quiet.i, j: quiet.j } };
      expect(circuitProblems({ ...layer, roofs: [...roofs(), bogus] }, input).some((p) => p.rule === "CK17a" && p.id === bogus.id)).toBe(true);
    });

    it("CK17a mid-row places: one on every mid column whose front is on a street, 0.6 m in, mid-front; none on a mid column facing a lane or park", () => {
      const mids = roofs().filter((r) => r.row === "mid");
      const onStreet = input.mass.built.filter((c) => c.column === "mid" && c.open.length === 1 && c.open[0]!.faces === "street");
      expect(mids.map((r) => r.id).sort()).toEqual(onStreet.map((c) => `roof:${c.i}:${c.j}`).sort());
      const m = mids.find((r) => r.sides[0] === "+z")!;
      expect(m.x_m).toBeCloseTo(m.cell.i * 5 + 2.5, 6);
      expect(m.z_m).toBeCloseTo(m.cell.j * 5 + 4.4, 6);
      expect(layer.roofKeep!.some((k) => k.roof === m.id)).toBe(false);
      const quiet = input.mass.built.find((c) => c.column === "mid" && c.open[0]?.faces !== "street")!;
      const bogus: CityRoofMast = { ...m, id: `roof:${quiet.i}:${quiet.j}`, cell: { i: quiet.i, j: quiet.j } };
      expect(circuitProblems({ ...layer, roofs: [...roofs(), bogus] }, input).some((p) => p.rule === "CK17a" && p.id === bogus.id)).toBe(true);
    });

    it("CK17b ends and kind: a roof span has a roof end, sorted ids, an over that matches what it passes; two pole ends or a listing in spans fail", () => {
      for (const s of layer.roofSpans!) {
        expect(s.id).toBe(`span:${s.a}~${s.b}`);
        expect(s.a < s.b && (s.a.startsWith("roof:") || s.b.startsWith("roof:"))).toBe(true);
        expect(s.over === "street" ? s.street !== null : s.over === "junction" ? s.junction !== null : s.street === null && s.junction === null).toBe(true);
      }
      const [pa, pb] = [layer.poles[0]!, layer.poles[1]!];
      const diagonal: CityRoofSpan = { id: `span:${pa.id}~${pb.id}`, kind: "roof", over: "street", a: pa.id, b: pb.id, len_m: 10, street: pa.street, junction: null };
      expect(withSpan(diagonal).some((p) => p.rule === "CK17b")).toBe(true);
      const listed = layer.roofSpans![0]! as unknown as CityWireSpan;
      expect(circuitProblems(withSpans([...layer.spans, listed]), input).some((p) => p.rule === "CK17b" && p.id === listed.id)).toBe(true);
    });

    it("CK17b where it passes: a 45 m span, a span over two streets and a span over a block each fail", () => {
      const corners = roofs().filter((r) => r.row === "corner");
      const pairs: [CityRoofMast, CityRoofMast][] = [];
      for (const a of corners) for (const b of roofs()) if (a.id < b.id && Math.hypot(a.x_m - b.x_m, a.z_m - b.z_m) < 60) pairs.push([a, b]);
      const reasons = (a: CityRoofMast, b: CityRoofMast): string => judgeSpan(ctx(), roofEnd(a), roofEnd(b)).problems.map((p) => p.reason).join("; ");
      const long = pairs.find(([a, b]) => Math.hypot(a.x_m - b.x_m, a.z_m - b.z_m) > 45)!;
      expect(reasons(...long)).toContain("longer than 40 m");
      const twoStreets = pairs.find(([a, b]) => reasons(a, b).includes("crosses 2 streets"))!;
      expect(withSpan(placeOf(roofEnd(twoStreets[0]), roofEnd(twoStreets[1]))).some((p) => p.rule === "CK17b" && p.reason.includes("2 streets"))).toBe(true);
      const overBlock = pairs.find(([a, b]) => reasons(a, b).includes("over a block"))!;
      expect(reasons(...overBlock)).toContain("over a block");
    });

    it("CK17c offered places: a corner place's pavement set is exactly its 4 nearest poles, and a mid-row place has no junction place", () => {
      const r = roofs().find((x) => x.id === "roof:54:47")!;
      const mine = layer.roofSpans!.filter((s) => (s.a === r.id || s.b === r.id) && s.over === "pavement");
      const nearest = r.sides.flatMap((side) => layer.poles.filter((p) => p.block === r.block && p.side === side && p.kind !== "crossing").sort((x, y) => Math.hypot(x.x_m - r.x_m, x.z_m - r.z_m) - Math.hypot(y.x_m - r.x_m, y.z_m - r.z_m)).slice(0, 2));
      expect(mine.map((s) => (s.a === r.id ? s.b : s.a)).sort()).toEqual(nearest.map((p) => p.id).sort());
      expect(mine).toHaveLength(4);
      const mid = new Set(roofs().filter((x) => x.row === "mid").map((x) => x.id));
      expect(layer.roofSpans!.filter((s) => s.over === "junction").length).toBeGreaterThan(0);
      expect(layer.roofSpans!.some((s) => s.over === "junction" && (mid.has(s.a) || mid.has(s.b)))).toBe(false);
      expect(circuitProblems({ ...layer, roofSpans: layer.roofSpans!.filter((s) => s.id !== mine[0]!.id) }, input).some((p) => p.rule === "CK17c" && p.id === mine[0]!.id)).toBe(true);
    });

    it("CK17d heights: over a junction a roof-to-pole span on an Apocalypse pole (5.86 m) fails and on its Palm pole passes; the zone holds no pavement cell", () => {
      const z = ctx();
      for (const k of z.zone) expect(["junction", "lane", "parking", "parkingPlain", "buildout", "crossing"]).toContain(z.ix.role.get(k));
      const s = layer.roofSpans!.find((x) => x.over === "junction" && (x.a.startsWith("pole:") || x.b.startsWith("pole:")))!;
      const pole = s.a.startsWith("pole:") ? s.a : s.b;
      expect(circuitProblems(layer, input).filter((p) => p.id === s.id)).toEqual([]);
      const apoc = circuitProblems({ ...layer, poleModels: { ...layer.poleModels, [pole]: "apocalypse-power:SM_Prop_Powerpole_01" } }, input);
      expect(apoc.some((p) => p.rule === "CK17d" && p.id === s.id && p.reason.includes("junction zone"))).toBe(true);
    });

    it("CK17d in plan: a roof span passing over a pole span at 8.5 m, or within 1 m of a street light, fails", () => {
      const s = layer.roofSpans!.find((x) => x.over === "pavement")!;
      const [a, b] = [endOf(s.a), endOf(s.b)];
      const at = (t: number): { x: number; z: number } => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      const c = at(a.y < b.y ? 0.1 : 0.9);
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const n = { x: -(b.z - a.z) / len, z: (b.x - a.x) / len };
      const palm = "palm-city-pack:SM_Prop_Powerpole_01";
      const q1: CityPole = { ...layer.poles[0]!, id: "pole:q1", x_m: c.x + 5 * n.x, z_m: c.z + 5 * n.z };
      const q2: CityPole = { ...layer.poles[0]!, id: "pole:q2", x_m: c.x - 5 * n.x, z_m: c.z - 5 * n.z };
      const crossed: CityCircuitLayer = { ...layer, poles: [...layer.poles, q1, q2], spans: [...layer.spans, span("along", q1, q2)], poleModels: { ...layer.poleModels, [q1.id]: palm, [q2.id]: palm } };
      expect(circuitProblems(crossed, input).some((p) => p.rule === "CK17d" && p.id === s.id && p.reason.includes("passes over"))).toBe(true);
      const m = at(0.5);
      const light = { ...layer.lights[0]!, x_m: m.x + 0.4, z_m: m.z };
      expect(circuitProblems({ ...layer, lights: [...layer.lights, light] }, input).some((p) => p.rule === "CK17d" && p.id === s.id && p.reason.includes(light.id))).toBe(true);
    });

    it("CK17d keeps a roof span 1 m from a drop's curve, except a drop from one of the span's own end poles", () => {
      const s = layer.roofSpans!.find((x) => x.over === "pavement")!;
      const [a, b] = [endOf(s.a), endOf(s.b)];
      const pole = a.id.startsWith("roof:") ? b : a;
      const midY = hangAt(a.y, b.y, len3(a, b), 0.5);
      const drop = (from: string): CityCircuitLayer["drops"][number] => ({ id: "drop:fixture", pole: from, building: "fixture", cell: { i: 0, j: 0 }, x_m: (a.x + b.x) / 2, z_m: (a.z + b.z) / 2, y_m: midY });
      const stranger = layer.poles.find((p) => p.id !== pole.id)!;
      const hit = judgeSpan(roofContext({ ...layer, drops: [drop(stranger.id)] }, input), a, b).problems;
      expect(hit.some((p) => p.rule === "CK17d" && p.reason.includes("drop:fixture"))).toBe(true);
      expect(circuitProblems({ ...layer, drops: [...layer.drops, drop(stranger.id)] }, input).some((p) => p.rule === "CK17d" && p.id === s.id)).toBe(true);
      expect(judgeSpan(roofContext({ ...layer, drops: [drop(pole.id)] }, input), a, b).problems).toEqual([]);
    }, 20_000);
  });
});
