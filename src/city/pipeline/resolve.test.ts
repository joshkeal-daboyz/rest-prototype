import { describe, expect, it } from "vitest";
import { CITY_KEYLESS_PIECE_LISTS, CITY_PIECE_LISTS, type CityChange, type CityEraLayers, type CityPieceList, type CityPieceRef } from "../../core";
import { add, eraPlan, fixturePlan, history, k } from "./erafixtures";
import { CityResolveError, resolvePlan, swappedOf } from "./resolve";

const plan = fixturePlan();
const keyless = (l: CityPieceList): boolean => (CITY_KEYLESS_PIECE_LISTS as readonly string[]).includes(l);
const listOf = (p: typeof plan, l: CityPieceList): readonly unknown[] => {
  const [a, b] = l.split(".") as [string, string];
  if (l === "buildings.pieces") return p.layers.buildings!.columns!.flatMap((c) => c.pieces);
  return (p.layers as unknown as Record<string, Record<string, readonly unknown[]>>)[a]![b]!;
};
/** A ref to the second piece of a list (column 1's first, for the building pieces, which is the third of the four). */
const refTo = (l: CityPieceList): CityPieceRef => {
  if (l === "buildings.pieces") return { list: l, column: 1, index: 0, key: k("bp_1_0") };
  const item = listOf(plan, l)[1] as { placement?: { key: `${string}:${string}` } };
  return { list: l, index: 1, key: keyless(l) ? null : item.placement!.key } as CityPieceRef;
};
const layers = (tech: CityChange[], holdout: CityChange[] = [], ruin: CityChange[] = []): Partial<CityEraLayers> => ({
  tech: { stage: "tech", adds: [], changes: tech },
  holdout: { stage: "holdout", adds: [], changes: holdout },
  ruin: { stage: "ruin", adds: [], changes: ruin },
});
const fails = (fn: () => unknown): CityResolveError => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(CityResolveError);
    return e as CityResolveError;
  }
  throw new Error("did not throw");
};

describe("resolvePlan: clean", () => {
  it("is the plan itself, with no history, adds or states, whatever the era layers hold", () => {
    const r = resolvePlan(eraPlan(plan, { ...layers([{ ref: refTo("ground.props"), op: "remove" }]), history: history([]) }), "clean");
    expect(r.plan).toBe(plan);
    expect(r.history).toBeNull();
    expect(r.adds).toEqual({});
    expect(r.states).toEqual([]);
  });
});

describe("resolvePlan: each change kind on each list", () => {
  for (const list of CITY_PIECE_LISTS) {
    it(`${list}: remove`, () => {
      const r = resolvePlan(eraPlan(plan, layers([{ ref: refTo(list), op: "remove" }])), "tech");
      expect(listOf(r.plan, list)).toHaveLength(listOf(plan, list).length - 1);
      expect(listOf(plan, list)).toHaveLength(list === "buildings.pieces" ? 4 : 3);
      if (list === "buildings.pieces") expect(r.plan.layers.buildings!.columns![1]!.pieces.map((p) => p.placement.key)).toEqual([k("bp_1_1")]);
      else expect(listOf(r.plan, list)[1]).toBe(listOf(plan, list)[2]);
      expect(r.plan.layers.streets).toBe(plan.layers.streets);
    });
    it(`${list}: state`, () => {
      const ref = refTo(list);
      const r = resolvePlan(eraPlan(plan, layers([{ ref, op: "state", state: "broken" }])), "tech");
      expect(r.states).toEqual([{ target: ref, state: "broken", stage: "tech" }]);
      expect(listOf(r.plan, list)).toHaveLength(listOf(plan, list).length);
    });
    if (keyless(list)) {
      it(`${list}: swap fails as keyless, naming the stage and the change`, () => {
        const e = fails(() => resolvePlan(eraPlan(plan, layers([{ ref: refTo("ground.props"), op: "state", state: "dark" }], [{ ref: refTo(list), op: "swap", key: k("x") }])), "holdout"));
        expect(e.failure).toMatchObject({ stage: "holdout", change: 0, kind: "keyless" });
      });
    } else {
      it(`${list}: swap keeps the placement and takes the new key`, () => {
        const r = resolvePlan(eraPlan(plan, layers([{ ref: refTo(list), op: "swap", key: k("new") }])), "tech");
        const at = list === "buildings.pieces" ? 2 : 1;
        const before = listOf(plan, list)[at] as { placement: { key: string; x_m: number; z_m: number } };
        const after = listOf(r.plan, list)[at] as { placement: { key: string; x_m: number; z_m: number } };
        expect(after.placement.key).toBe(k("new"));
        expect(after.placement.x_m).toBe(before.placement.x_m);
        expect(after.placement.z_m).toBe(before.placement.z_m);
        expect(before.placement.key).not.toBe(k("new"));
        expect(swappedOf(r)).toHaveLength(1);
      });
    }
  }
});

describe("resolvePlan: order, replacement and adds", () => {
  it("a later era's state replaces an earlier one's", () => {
    const ref = refTo("facades.walls");
    const r = resolvePlan(eraPlan(plan, layers([{ ref, op: "state", state: "dark" }], [{ ref, op: "state", state: "broken" }])), "holdout");
    expect(r.states).toEqual([{ target: ref, state: "broken", stage: "holdout" }]);
  });
  it("a later era's guard is checked against the key as it stands after an earlier swap", () => {
    const ref = refTo("facades.walls");
    const swap: CityChange = { ref, op: "swap", key: k("new") };
    expect(() => resolvePlan(eraPlan(plan, layers([swap], [{ ref, op: "state", state: "dark" }])), "holdout")).toThrow(CityResolveError);
    const guarded = { ...(ref as object), key: k("new") } as CityPieceRef;
    const r = resolvePlan(eraPlan(plan, layers([swap], [{ ref: guarded, op: "state", state: "dark" }])), "holdout");
    expect(r.states[0]!.target).toMatchObject({ key: k("new") });
  });
  it("lists are read as their stages wrote them: two removes in one layer use original indexes", () => {
    const a = { list: "ground.props", index: 0, key: k("gp_0") } as const;
    const b = { list: "ground.props", index: 2, key: k("gp_2") } as const;
    const r = resolvePlan(eraPlan(plan, layers([{ ref: a, op: "remove" }, { ref: b, op: "remove" }])), "tech");
    expect(r.plan.layers.ground!.props.map((p) => p.placement.key)).toEqual([k("gp_1")]);
  });
  it("a state's target index is its place after removals", () => {
    const r = resolvePlan(
      eraPlan(plan, layers([{ ref: { list: "ground.props", index: 0, key: k("gp_0") }, op: "remove" }, { ref: { list: "ground.props", index: 2, key: k("gp_2") }, op: "state", state: "boarded" }])),
      "tech",
    );
    expect(r.states).toEqual([{ target: { list: "ground.props", index: 1, key: k("gp_2") }, state: "boarded", stage: "tech" }]);
  });
  it("adds appear up to the era only, and a later era may change an earlier era's add by id", () => {
    const a = add("tech:a:1", k("a"), 5, 5);
    const b = add("tech:a:2", k("b"), 6, 6);
    const ep = eraPlan(plan, {
      history: history([{ id: "district:a", blocks: ["block:0:0"] }]),
      tech: { stage: "tech", adds: [a, b], changes: [] },
      holdout: { stage: "holdout", adds: [], changes: [{ ref: { id: "tech:a:1" }, op: "swap", key: k("c") }, { ref: { id: "tech:a:2" }, op: "state", state: "cut" }] },
      ruin: { stage: "ruin", adds: [], changes: [{ ref: { id: "tech:a:1" }, op: "remove" }] },
    });
    const t = resolvePlan(ep, "tech");
    expect(t.adds.tech).toEqual([a, b]);
    expect(t.adds.holdout).toBeUndefined();
    expect(t.history).toBe(ep.layers.history);
    const h = resolvePlan(ep, "holdout");
    expect(h.adds.tech!.map((p) => p.placement.key)).toEqual([k("c"), k("b")]);
    expect(h.states).toEqual([{ target: { id: "tech:a:2" }, state: "cut", stage: "holdout" }]);
    expect(swappedOf(h)).toEqual([{ id: "tech:a:1" }]);
    const r = resolvePlan(ep, "ruin");
    expect(r.adds.tech!.map((p) => p.id)).toEqual(["tech:a:2"]);
  });
  it("never mutates a frozen layer, and shares what no change touched", () => {
    const ep = eraPlan(plan, layers([{ ref: refTo("ground.props"), op: "remove" }]));
    const r = resolvePlan(ep, "ruin");
    expect(r.plan).not.toBe(plan);
    expect(r.plan.layers.edge).toBe(plan.layers.edge);
    expect(r.plan.layers.facades).toBe(plan.layers.facades);
    expect(Object.isFrozen(r.plan.layers.ground!.props)).toBe(true);
    expect(plan.layers.ground!.props).toHaveLength(3);
    expect(resolvePlan(ep, "ruin")).toEqual(r);
  });
  it("an era with no layer written adds and changes nothing", () => {
    const r = resolvePlan(eraPlan(plan, {}), "ruin");
    expect(r.plan).toBe(plan);
    expect(r.adds).toEqual({});
  });
});

describe("resolvePlan: every failure names the stage and the change's index", () => {
  const ref = refTo("ground.props");
  const state = (r: CityPieceRef): CityChange => ({ ref: r, op: "state", state: "dark" });
  it("missing: an index past the list, a column past the columns, an unknown id, an id added by the same layer", () => {
    expect(fails(() => resolvePlan(eraPlan(plan, layers([state(ref), state({ list: "ground.props", index: 9, key: k("gp_1") })])), "tech")).failure).toMatchObject({ stage: "tech", change: 1, kind: "missing" });
    expect(fails(() => resolvePlan(eraPlan(plan, layers([state({ list: "buildings.pieces", column: 7, index: 0, key: k("x") })])), "tech")).failure.kind).toBe("missing");
    expect(fails(() => resolvePlan(eraPlan(plan, layers([], [state({ id: "tech:none" })])), "holdout")).failure).toMatchObject({ stage: "holdout", change: 0, kind: "missing" });
    const own = { stage: "tech" as const, adds: [add("tech:x:1", k("a"), 1, 1)], changes: [state({ id: "tech:x:1" })] };
    expect(fails(() => resolvePlan(eraPlan(plan, { tech: own }), "tech")).failure.kind).toBe("missing");
  });
  it("key: a guard that does not match, and a keyless list guarded with a key", () => {
    const e = fails(() => resolvePlan(eraPlan(plan, layers([], [], [state({ list: "ground.props", index: 1, key: k("wrong") })])), "ruin"));
    expect(e.failure).toMatchObject({ stage: "ruin", change: 0, kind: "key" });
    expect(fails(() => resolvePlan(eraPlan(plan, layers([state({ list: "edge.ground", index: 0, key: k("x") })])), "tech")).failure.kind).toBe("key");
  });
  it("twice: one layer changes a piece twice", () => {
    const e = fails(() => resolvePlan(eraPlan(plan, layers([], [state(ref), { ref, op: "remove" }])), "holdout"));
    expect(e.failure).toMatchObject({ stage: "holdout", change: 1, kind: "twice" });
  });
  it("removed: a change to a piece an earlier era removed", () => {
    const e = fails(() => resolvePlan(eraPlan(plan, layers([{ ref, op: "remove" }], [], [state(ref)])), "ruin"));
    expect(e.failure).toMatchObject({ stage: "ruin", change: 0, kind: "removed" });
    const a = add("tech:a:1", k("a"), 1, 1);
    const e2 = fails(() =>
      resolvePlan(
        eraPlan(plan, {
          tech: { stage: "tech", adds: [a], changes: [] },
          holdout: { stage: "holdout", adds: [], changes: [{ ref: { id: a.id }, op: "remove" }] },
          ruin: { stage: "ruin", adds: [], changes: [state({ id: a.id })] },
        }),
        "ruin",
      ),
    );
    expect(e2.failure).toMatchObject({ stage: "ruin", kind: "removed" });
  });
  it("keyless: a swap on a keyless list's record", () => {
    const e = fails(() => resolvePlan(eraPlan(plan, layers([{ ref: refTo("edge.buildoutTrees"), op: "swap", key: k("t") }])), "tech"));
    expect(e.failure).toMatchObject({ stage: "tech", change: 0, kind: "keyless" });
  });
  it("a change in a pass past the era is never read", () => {
    expect(() => resolvePlan(eraPlan(plan, layers([], [], [state({ id: "nope" })])), "holdout")).not.toThrow();
  });
});
