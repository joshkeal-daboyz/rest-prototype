import { describe, expect, it } from "vitest";
import type { CityEraLayers, CityPlan, CityStreetCell } from "../../core";
import { add, eraPlan, fixturePlan, history, k } from "./erafixtures";
import { EMPTY_CIRCUIT, t1CleanClashes, t1Failures, t1RuinTreeCovers, t1WireCrossings, t2Failures, type CircuitPoints, type KitBounds } from "./readable";
import { resolvePlan } from "./resolve";

const base = fixturePlan();
const circuit = (c: Partial<CircuitPoints>): CircuitPoints => ({ ...EMPTY_CIRCUIT, ...c });
const era = (adds: ReturnType<typeof add>[], extra: Partial<CityEraLayers> = {}) => resolvePlan(eraPlan(base, { holdout: { stage: "holdout", adds, changes: [] }, ...extra }), "holdout");
const POLE = { id: "pole:1", x_m: 20, z_m: 20 };

describe("T-1 (B-Q3, Q13)", () => {
  it("fails an era add on a pole, a light, a lamp-post place, and passes the same add moved clear (the footprint is widened 0.15 m)", () => {
    const c = circuit({ poles: [POLE], lights: [{ id: "light:1", x_m: 30, z_m: 20 }], lampPlaces: [{ id: "lamp:1", x_m: 40, z_m: 20 }] });
    const onPole = era([add("holdout:b:1", k("box"), 20, 20, { x_m: 1, z_m: 1, h_m: 1 })]);
    expect(t1Failures(onPole, { circuit: c })).toMatchObject([{ rule: "T-1", what: "pole", piece: "holdout:b:1", source: "add", at: "pole:1" }]);
    expect(t1Failures(era([add("holdout:b:2", k("box"), 30.3, 20)]), { circuit: c })).toMatchObject([{ what: "light", at: "light:1" }]);
    expect(t1Failures(era([add("holdout:b:3", k("box"), 40, 20.5)]), { circuit: c })).toMatchObject([{ what: "lampPlace", at: "lamp:1" }]);
    // half a metre wide, centre 0.7 m off the pole: 0.25 + 0.15 < 0.7, clear.
    expect(t1Failures(era([add("holdout:b:4", k("box"), 20.7, 20, { x_m: 0.5, z_m: 0.5, h_m: 1 })]), { circuit: c })).toEqual([]);
    // 0.35 m off: inside 0.25 + 0.15.
    expect(t1Failures(era([add("holdout:b:5", k("box"), 20.35, 20, { x_m: 0.5, z_m: 0.5, h_m: 1 })]), { circuit: c })).toHaveLength(1);
  });
  it("a piece's height does not matter, and its turn does: a swapped long key turned 90 degrees reaches a pole 2 m to its side", () => {
    const c = circuit({ poles: [POLE] });
    expect(t1Failures(era([add("holdout:b:1", k("box"), 20, 20, { x_m: 1, z_m: 1, h_m: 9 }, 12)]), { circuit: c })).toHaveLength(1);
    const long: KitBounds = { x_m: 6, z_m: 1, h_m: 1 };
    const lay = (yaw: number) =>
      resolvePlan(
        eraPlan(base, {
          tech: { stage: "tech", adds: [add("tech:l:1", k("short"), 20, 22, { x_m: 1, z_m: 1, h_m: 1 }, 0, "district:a", yaw)], changes: [] },
          holdout: { stage: "holdout", adds: [], changes: [{ ref: { id: "tech:l:1" }, op: "swap", key: k("long") }] },
        }),
        "holdout",
      );
    expect(t1Failures(lay(0), { circuit: c, bounds: () => long })).toEqual([]);
    expect(t1Failures(lay(90), { circuit: c, bounds: () => long })).toMatchObject([{ what: "pole", source: "add" }]);
  });
  it("fails a piece over 5.5 m standing over a drop's first 2 m, and passes a low one or one past 2 m", () => {
    const c = circuit({ drops: [{ id: "drop:1", wall: { x_m: 10, z_m: 10 }, out: { x_m: 1, z_m: 0 } }] });
    const tall = (x: number, h: number) => era([add("holdout:t:1", k("tall"), x, 10, { x_m: 1, z_m: 1, h_m: h }, 0)]);
    expect(t1Failures(tall(11, 6), { circuit: c })).toMatchObject([{ what: "dropEnd", at: "drop:1" }]);
    expect(t1Failures(tall(11, 5), { circuit: c })).toEqual([]);
    expect(t1Failures(tall(13, 6), { circuit: c })).toEqual([]);
  });
  it("fails a canopy within its radius of a pole and one meeting a pole-line span; passes a tree beside a line", () => {
    const tree = { x_m: 4, z_m: 4, h_m: 4 };
    const line = { id: "span:1", a: { x_m: 0, z_m: 20 }, b: { x_m: 40, z_m: 20 } };
    const c = circuit({ poles: [POLE], lines: [line] });
    const on = (x: number, z: number) => era([add("holdout:tree:1", k("SM_Env_Tree_01"), x, z, tree)]);
    // radius 2: a tree 2.1 m from the pole is within 2 + 0.15 (and 1 m off the line, so over it too).
    expect(t1Failures(on(21.9, 21), { circuit: c }).map((f) => f.what)).toEqual(["pole", "canopyOverLine"]);
    // 1.5 m beside the line, far from the pole: the disc meets the line.
    expect(t1Failures(on(5, 21.5), { circuit: c }).map((f) => f.what)).toEqual(["canopyOverLine"]);
    // 2.5 m beside the line: beside it, not over it.
    expect(t1Failures(on(5, 22.5), { circuit: c })).toEqual([]);
    // a solid box of the same size over the line is not a canopy.
    expect(t1Failures(era([add("holdout:b:9", k("box"), 5, 20, tree)]), { circuit: c })).toEqual([]);
  });
  it("never fails a wire over a pole line; reports it", () => {
    const c = circuit({ poles: [POLE], lines: [{ id: "span:1", a: { x_m: 0, z_m: 20 }, b: { x_m: 40, z_m: 20 } }], wires: [{ id: "wire:1", a: { x_m: 10, z_m: 10 }, b: { x_m: 10, z_m: 30 } }, { id: "wire:2", a: { x_m: 0, z_m: 25 }, b: { x_m: 40, z_m: 25 } }] });
    expect(t1Failures(era([]), { circuit: c })).toEqual([]);
    expect(t1WireCrossings(c)).toEqual([{ wire: "wire:1", line: "span:1" }]);
  });
  it("judges what an era swaps at the new key's bounds, and reports the same clean piece as a clean clash only", () => {
    const c = circuit({ poles: [POLE] });
    const wide: KitBounds = { x_m: 4, z_m: 4, h_m: 1 };
    // a clean prop 1.5 m from the pole: clear at its own 1 m size.
    const prop = { kind: "bin", placement: { key: k("gp"), x_m: 21.5, y_m: 0, z_m: 20, yaw_deg: 0 }, size: { x_m: 1, z_m: 1, h_m: 1 } };
    const plan = { ...base, layers: { ...base.layers, ground: { ...base.layers.ground!, props: [prop] } } } as unknown as CityPlan;
    const swapped = resolvePlan(eraPlan(plan, { tech: { stage: "tech", adds: [], changes: [{ ref: { list: "ground.props", index: 0, key: k("gp") }, op: "swap", key: k("wide") }] } }), "tech");
    expect(t1Failures(swapped, { circuit: c, bounds: () => wide })).toMatchObject([{ what: "pole", source: "swap", piece: "ground.props[0]" }]);
    expect(t1CleanClashes(swapped, { circuit: c, bounds: () => wide })).toEqual([]);
    // the same spot, never swapped: a clean clash, not a failure.
    const same = { ...base, layers: { ...base.layers, ground: { ...base.layers.ground!, props: [{ ...prop, placement: { ...prop.placement, x_m: 20.1 } }] } } } as unknown as CityPlan;
    const r = resolvePlan(eraPlan(same, { tech: { stage: "tech", adds: [], changes: [] } }), "tech");
    expect(t1Failures(r, { circuit: c })).toEqual([]);
    expect(t1CleanClashes(r, { circuit: c })).toMatchObject([{ what: "pole", source: "clean", piece: "ground.props[0]" }]);
  });
  it("finds no point to judge on a plan with no circuit (until K2)", () => {
    expect(t1Failures(era([add("holdout:b:1", k("box"), 20, 20)]))).toEqual([]);
    expect(t1CleanClashes(era([]))).toEqual([]);
    expect(t2Failures(era([]))).toEqual([]);
  });
});

// ---- T-2 ----

const cellsOf = (rows: readonly number[], w: number): CityStreetCell[] => rows.flatMap((j) => Array.from({ length: w }, (_, i) => ({ i, j, role: "pavement" as const, street: "x:0", band: 0 })));
const grid = (rows: readonly number[]): CityPlan => ({ ...base, layers: { ...base.layers, streets: { ...base.layers.streets!, w: 8, h: 5, cells: cellsOf(rows, 8), blocks: [] } } }) as unknown as CityPlan;
const poleAt = (id: string, i: number, j: number, block?: string) => ({ id, x_m: (i + 0.5) * 5, z_m: (j + 0.5) * 5, ...(block ? { block } : {}) });
const barricade = (i: number, j: number) => add("holdout:barricade:1", k("barrier"), (i + 0.5) * 5, (j + 0.5) * 5, { x_m: 5, z_m: 5, h_m: 2 });
const withAdds = (plan: CityPlan, adds: ReturnType<typeof add>[], h?: CityEraLayers["history"]) => resolvePlan(eraPlan(plan, { ...(h ? { history: h } : {}), holdout: { stage: "holdout", adds, changes: [] } }), "holdout");

describe("T-2 (B-Q5)", () => {
  const poles = [poleAt("pole:a", 0, 2), poleAt("pole:b", 7, 2)];
  it("fails a ground piece that seals a one-cell street between two poles", () => {
    const r = withAdds(grid([2]), [barricade(3, 2)]);
    expect(t2Failures(r, { circuit: circuit({ poles }) })).toMatchObject([{ rule: "T-2", district: "city", pole: "pole:b", from: "pole:a" }]);
  });
  it("passes the same piece on a street with a way round, and a clear street", () => {
    expect(t2Failures(withAdds(grid([1, 2, 3]), [barricade(3, 2)]), { circuit: circuit({ poles }) })).toEqual([]);
    expect(t2Failures(withAdds(grid([2]), []), { circuit: circuit({ poles }) })).toEqual([]);
  });
  it("a piece standing 2 m or more up (a roof item, a span fitting) closes nothing", () => {
    const high = add("holdout:rack:1", k("rack"), 17.5, 12.5, { x_m: 5, z_m: 5, h_m: 2 }, 3);
    expect(t2Failures(withAdds(grid([2]), [high]), { circuit: circuit({ poles }) })).toEqual([]);
  });
  it("a clean piece closes a cell too, and a pole's own cell is its start whether it is closed or not", () => {
    const prop = { kind: "bin", placement: { key: k("gp"), x_m: 17.5, y_m: 0, z_m: 12.5, yaw_deg: 0 }, size: { x_m: 5, z_m: 5, h_m: 1 } };
    const plan = { ...grid([2]), layers: { ...grid([2]).layers, ground: { ...base.layers.ground!, props: [prop] } } } as unknown as CityPlan;
    expect(t2Failures(withAdds(plan, []), { circuit: circuit({ poles }) })).toHaveLength(1);
    const own = [poleAt("pole:a", 3, 2), poleAt("pole:b", 5, 2)];
    expect(t2Failures(withAdds(plan, []), { circuit: circuit({ poles: own }) })).toEqual([]);
    expect(t2Failures(withAdds(grid([2]), [barricade(0, 2)]), { circuit: circuit({ poles: [poleAt("pole:a", 0, 2), poleAt("pole:b", 5, 2)] }) })).toEqual([]);
  });
  it("judges each district's poles against each other, never across districts", () => {
    const sealed = [barricade(3, 2)];
    const h = history([{ id: "district:b1", blocks: ["b1"] }, { id: "district:b2", blocks: ["b2"] }]);
    const apart = circuit({ poles: [poleAt("pole:a", 0, 2, "b1"), poleAt("pole:b", 7, 2, "b2")] });
    expect(t2Failures(withAdds(grid([2]), sealed, h), { circuit: apart })).toEqual([]);
    const together = circuit({ poles: [poleAt("pole:a", 0, 2, "b1"), poleAt("pole:b", 7, 2, "b1"), poleAt("pole:c", 6, 2, "b2")] });
    expect(t2Failures(withAdds(grid([2]), sealed, h), { circuit: together })).toMatchObject([{ district: "district:b1", pole: "pole:b" }]);
  });
  it("a pole with no block takes its nearest block's district", () => {
    const plan = { ...grid([2]), layers: { ...grid([2]).layers, streets: { ...grid([2]).layers.streets!, blocks: [{ id: "b1", i0: 0, i1: 4, j0: 3, j1: 5 }, { id: "b2", i0: 4, i1: 8, j0: 3, j1: 5 }] } } } as unknown as CityPlan;
    const h = history([{ id: "district:b1", blocks: ["b1"] }, { id: "district:b2", blocks: ["b2"] }]);
    const c = circuit({ poles: [poleAt("pole:a", 0, 2), poleAt("pole:b", 7, 2)] });
    expect(t2Failures(withAdds(plan, [barricade(3, 2)], h), { circuit: c })).toEqual([]);
  });
});

describe("a piece that cannot be footprinted fails loudly", () => {
  const c = circuit({ poles: [POLE] });
  it("an era add with no size and no bounds throws, naming it", () => {
    const noSize = { ...add("holdout:n:1", k("box"), 1, 1), size: undefined } as never;
    expect(() => t1Failures(era([noSize]), { circuit: c })).toThrow(/holdout:n:1/);
  });
  it("a swapped piece with no bounds entry throws, and is never judged at the old key's size", () => {
    const prop = { kind: "bin", placement: { key: k("gp"), x_m: 50, y_m: 0, z_m: 50, yaw_deg: 0 }, size: { x_m: 1, z_m: 1, h_m: 1 } };
    const plan = { ...base, layers: { ...base.layers, ground: { ...base.layers.ground!, props: [prop] } } } as unknown as CityPlan;
    const r = resolvePlan(eraPlan(plan, { tech: { stage: "tech", adds: [], changes: [{ ref: { list: "ground.props", index: 0, key: k("gp") }, op: "swap", key: k("wide") }] } }), "tech");
    expect(() => t1Failures(r, { circuit: c })).toThrow(/ground\.props\[0\]/);
    expect(() => t1Failures(r, { circuit: c, bounds: () => undefined })).toThrow();
  });
});

describe("T-1 at the ruin era: trees exempt (F1b1; Josh, 22 Nov 2026: \"Through any dead line\", \"Poles too\")", () => {
  const TREE = { x_m: 4, z_m: 4, h_m: 6 };
  const ruinPlan = (adds: ReturnType<typeof add>[]) => resolvePlan(eraPlan(base, { ruin: { stage: "ruin", adds, changes: [], steps: [] } as unknown as CityEraLayers["ruin"] }), "ruin");
  const c = circuit({
    poles: [POLE],
    lights: [{ id: "light:1", x_m: 60, z_m: 60 }],
    lampPlaces: [{ id: "lamp:1", x_m: 80, z_m: 80 }],
    drops: [{ id: "drop:1", wall: { x_m: 100, z_m: 100 }, out: { x_m: 1, z_m: 0 } }],
    lines: [{ id: "span:1", a: { x_m: 0, z_m: 40 }, b: { x_m: 40, z_m: 40 } }],
  });
  const treeAt = (id: string, x: number, z: number) => add(id, k("SM_Env_Tree_01"), x, z, TREE);
  const covering = [treeAt("ruin:t:pole", 20, 20), treeAt("ruin:t:light", 60, 60), treeAt("ruin:t:lamp", 80, 80), treeAt("ruin:t:drop", 101, 100), treeAt("ruin:t:span", 20, 40)];
  const WHAT = ["pole", "light", "lampPlace", "dropEnd", "canopyOverLine"];

  it("a ruin tree over a pole, light, lamp-post place, drop end or span is no failure at the ruin era, and is each failure with no era or at another era", () => {
    const r = ruinPlan(covering);
    expect(t1Failures(r, { circuit: c, era: "ruin" })).toEqual([]);
    expect(t1Failures(r, { circuit: c }).map((f) => f.what).sort()).toEqual([...WHAT].sort());
    for (const era of ["tech", "holdout"] as const) expect(t1Failures(r, { circuit: c, era }).map((f) => f.what).sort()).toEqual([...WHAT].sort());
  });
  it("a tree the tech or hold-out era adds is still judged when the plan is judged at the ruin era", () => {
    const r = resolvePlan(eraPlan(base, { holdout: { stage: "holdout", adds: [treeAt("holdout:t:1", 20, 20)], changes: [] }, ruin: { stage: "ruin", adds: [], changes: [], steps: [] } as unknown as CityEraLayers["ruin"] }), "ruin");
    expect(t1Failures(r, { circuit: c, era: "ruin" }).map((f) => f.what)).toEqual(["pole"]);
  });
  it("only trees: a solid ruin add over the same points fails, and so does a key that is not a tree under options.isTree", () => {
    const solid = [add("ruin:b:pole", k("box"), 20, 20, TREE), add("ruin:b:light", k("box"), 60, 60, TREE), add("ruin:b:lamp", k("box"), 80, 80, TREE), add("ruin:b:drop", k("box"), 101, 100, TREE)];
    expect(t1Failures(ruinPlan(solid), { circuit: c, era: "ruin" }).map((f) => f.what)).toEqual(["pole", "light", "lampPlace", "dropEnd"]);
    const dead = ruinPlan([add("ruin:d:1", k("Tree_Dead_01"), 20, 20, TREE)]);
    expect(t1Failures(dead, { circuit: c, era: "ruin", isTree: (key) => /Tree_Generic/.test(key) }).map((f) => f.what)).toEqual(["pole"]);
  });
  it("T-2 still holds: a ruin tree's trunk that seals a one-cell street between two poles fails, exempt crown or not", () => {
    const poles = [poleAt("pole:a", 0, 2), poleAt("pole:b", 7, 2), poleAt("pole:c", 3, 2)]; // pole:c stands under the crown
    const trunk = add("ruin:tree:1", k("SM_Env_Tree_01"), 17.5, 12.5, { x_m: 5, z_m: 5, h_m: 6 });
    const r = resolvePlan(eraPlan(grid([2]), { ruin: { stage: "ruin", adds: [trunk], changes: [], steps: [] } as unknown as CityEraLayers["ruin"] }), "ruin");
    expect(t1Failures(r, { circuit: circuit({ poles }) }).map((x) => x.what)).toEqual(["pole"]); // judged with no era, the crown over pole:c fails
    expect(t1Failures(r, { circuit: circuit({ poles }), era: "ruin" })).toEqual([]);
    expect(t2Failures(r, { circuit: circuit({ poles }), era: "ruin" })).toMatchObject([{ rule: "T-2", pole: "pole:b" }]);
  });
  it("t1RuinTreeCovers lists what each ruin tree's crown covers, never throws, and lists nothing for solid pieces or other eras' trees", () => {
    const r = ruinPlan([...covering, add("ruin:b:1", k("box"), 20, 20, TREE)]);
    const got = t1RuinTreeCovers(r, { circuit: c });
    expect(got.map((f) => f.what).sort()).toEqual([...WHAT].sort());
    expect(got.every((f) => f.source === "add" && f.piece.startsWith("ruin:t:"))).toBe(true);
    expect(t1RuinTreeCovers(ruinPlan([treeAt("ruin:t:clear", 150, 150)]), { circuit: c })).toEqual([]);
    expect(t1RuinTreeCovers(ruinPlan([]), { circuit: EMPTY_CIRCUIT })).toEqual([]);
  });
});
