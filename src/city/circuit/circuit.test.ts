/**
 * Ticket 081 K2a: stage 6's poles and spans (CK1 to CK6, CK8). The rules fail on a real 6 x 6 seed 1 layer (one-way on) with one thing changed, so a fixture is the layer plus its tamper (test policy rule 2).
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { CityCircuitLayer, CityPlan, CityPole, CityResolvedPlan, CityWireSpan } from "../../core";
import { digestOf } from "../pipeline/digest";
import { pictureProblems } from "../pipeline/picture";
import { circuitPoints } from "../pipeline/readable";
import { runCity } from "../stages";
import { stagesOfProfile } from "../testing/namedcities";
import { circuitProblems, type CircuitInput, type CircuitProblem } from "./check";
import { nodePlaceProblems } from "./checkplaces";
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
  it("R-1 to R-7: the stage's layer is frozen, its picture is the lattice's, its digest is pinned, and nothing on seed 1 fails CK1 to CK8", () => {
    expect(Object.isFrozen(layer.poles[0])).toBe(true);
    expect(Object.isFrozen(layer.spans)).toBe(true);
    expect(pictureProblems(circuitStage.picture(plan), plan.layers.streets!.w, plan.layers.streets!.h)).toEqual([]);
    expect(plan.digests.circuit).toBe(digestOf(layer));
    expect(plan.digests.circuit).toBe("a6b0af56");
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

  it("CK9: a drop from a pole across the street fails, and so does a drop too long or a building on a pole line with none", () => {
    const d = layer.drops[0]!;
    const across = layer.poles.find((p) => p.kind === "crossing")!;
    const from = circuitProblems({ ...layer, drops: [{ ...d, pole: across.id }, ...layer.drops.slice(1)] }, input);
    expect(from.some((p) => p.rule === "CK9" && p.id === d.id)).toBe(true);
    const long = circuitProblems({ ...layer, drops: [{ ...layer.drops[1]!, x_m: layer.drops[1]!.x_m + 20 }, ...layer.drops.slice(2)] }, input);
    expect(long.some((p) => p.rule === "CK9" && p.id === layer.drops[1]!.id && p.reason.includes("longer"))).toBe(true);
    expect(long.some((p) => p.rule === "CK9" && p.id === d.building && p.reason.includes("no drop"))).toBe(true);
  });

  it("CK9: every drop is pole-side, short, 5.5 m up, and meets a front column; seed 1's pass", () => {
    expect(layer.drops.length).toBeGreaterThan(0);
    expect(circuitProblems(layer, input).filter((p) => p.rule === "CK9")).toEqual([]);
    expect(layer.drops.every((d) => d.y_m === 5.5 && d.id === `drop:${d.building}`)).toBe(true);
  });

  it("CK10: a light at a crossing pole's spot fails, and so does one on the pole pavement", () => {
    const l = layer.lights[0]!;
    const c = layer.poles.find((p) => p.kind === "crossing")!;
    const onPole = circuitProblems({ ...layer, lights: [{ ...l, x_m: c.x_m, z_m: c.z_m }] }, input);
    expect(onPole.some((p) => p.rule === "CK10" && p.id === l.id && p.reason.includes("within"))).toBe(true);
    const flipped = circuitProblems({ ...layer, lights: [{ ...l, pavement: l.pavement === "lo" ? "hi" : "lo" }] }, input);
    expect(flipped.some((p) => p.rule === "CK10" && p.reason.includes("pole pavement"))).toBe(true);
  });

  it("CK10: seed 1's lights keep 3 m from every pole and stand on allowed cells", () => {
    expect(layer.lights.length).toBeGreaterThan(0);
    expect(circuitProblems(layer, input).filter((p) => p.rule === "CK10")).toEqual([]);
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
});
