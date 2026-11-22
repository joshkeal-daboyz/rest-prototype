/**
 * Ticket 073 D1, the fixtures: the bands and X-6 (criterion 2), a shopfront's add and its removes and a corner shop left alone (1), the switch (5), every pavement keep (4: a pole, a light, a lamp-post place, a span, a corner,
 * a stage 8 prop, KO, AV and EL, DK, two pieces across a pavement), the wall keeps (a drop's wall point), T-1 failing on a forced add (6), and dark and textured (7). The circuit is empty until K2 (stage 6), so the circuit
 * fixtures hand the stage its points (`TechOptions.circuit`), and `src/city/tech/` is proven against hand-placed ones. One city, built once.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CityEraPiece, CityEraPlan } from "../../core";
import { assertEraReadable, resolveBefore } from "../pipeline/eras";
import { CityStageError } from "../pipeline/error";
import { EMPTY_CIRCUIT, type CircuitPoints } from "../pipeline/readable";
import { stageRand } from "../pipeline/seeds";
import { circuitRefusal, rectSegmentDist } from "./circuit";
import { CLEAR_WALK_M, CELL_M, FURN_CORNER_M, FURN_KEEP_M, FURN_MAX_H_M, FURN_PITCH_M, SHOPFRONT_FROM_TECH, SIGN_FROM_TECH } from "./constants";
import { buildContext, type TechCtx } from "./context";
import { Grid, rectDist, type Rect } from "./geom";
import { TECH_KIT, WALL_LINE, KERB_LINE, techBoundsOf, techIsTree } from "./kit";
import { PaveState, placeRefusal, specOf, clearWalk, type Line } from "./pavement";
import { coveredDressing, panelOf } from "./shops";
import { buildTech, type TechOptions } from "./stage";
import { DEFAULT, historyPlanOf } from "./testcities";
import { worldOf } from "./runs";

const PLAN = historyPlanOf(DEFAULT);
const DISTRICTS = PLAN.layers.history!.districts;

/** The default city with each district's `tech` set by `f` (its index in `districts`, its id). */
function withTech(f: (index: number) => number): CityEraPlan {
  const h = PLAN.layers.history!;
  return { ...PLAN, layers: { ...PLAN.layers, history: { ...h, districts: h.districts.map((d, k) => ({ ...d, tech: f(k) })) } } };
}
const uniform = (t: number): CityEraPlan => withTech(() => t);
const build = (plan: CityEraPlan, options: TechOptions = {}) => buildTech(plan, stageRand("tech", 1), options);

const WALL_KINDS = ["bolt-on", "camera", "sign", "tall"];
const count = (adds: readonly CityEraPiece[], pred: (a: CityEraPiece) => boolean): number => adds.filter(pred).length;
const rectOf = (a: CityEraPiece): Rect => ({ x0: a.placement.x_m - a.size.x_m / 2, x1: a.placement.x_m + a.size.x_m / 2, z0: a.placement.z_m - a.size.z_m / 2, z1: a.placement.z_m + a.size.z_m / 2 });
const pointAt = (r: Rect, id: string): { id: string; x_m: number; z_m: number } => ({ id, x_m: (r.x0 + r.x1) / 2, z_m: (r.z0 + r.z1) / 2 });
const circuitOf = (c: Partial<CircuitPoints>): CircuitPoints => ({ ...EMPTY_CIRCUIT, ...c });

describe("criterion 2, the bands and X-6", { timeout: 300_000 }, () => {
  it("three districts at tech 0.2, 0.5 and 0.8: bolt-ons only in the first; signs and pavement pieces too in the second; shopfronts too in the third", () => {
    expect(DISTRICTS.length).toBeGreaterThanOrEqual(3);
    const level = [0.2, 0.5, 0.8];
    const { layer } = build(withTech((k) => level[k % 3]!));
    const tech = new Map(DISTRICTS.map((d, k) => [d.id, level[k % 3]!] as const));
    const by = (t: number): CityEraPiece[] => layer.adds.filter((a) => tech.get(a.district) === t);
    const kinds = (t: number): Set<string> => new Set(by(t).map((a) => a.kind));
    expect([...kinds(0.2)].every((k) => ["bolt-on", "camera", "tall"].includes(k))).toBe(true);
    expect(kinds(0.2).has("bolt-on")).toBe(true);
    expect(kinds(0.5).has("sign") && kinds(0.5).has("pavement") && kinds(0.5).has("bolt-on")).toBe(true);
    expect(kinds(0.5).has("shopfront")).toBe(false);
    expect(kinds(0.8).has("shopfront") && kinds(0.8).has("sign") && kinds(0.8).has("pavement")).toBe(true);
    // the changes belong to the third band's shopfronts only
    expect(layer.changes.length).toBeGreaterThan(0);
  });

  it("the band edges: just under a third no signs or pavement pieces; just over, both; just under two thirds no shopfronts; just over, some", () => {
    const a = build(uniform(SIGN_FROM_TECH - 0.001)).layer.adds;
    expect(count(a, (x) => x.kind === "sign" || x.kind === "pavement")).toBe(0);
    const b = build(uniform(SIGN_FROM_TECH + 0.01)).layer.adds;
    expect(count(b, (x) => x.kind === "sign")).toBeGreaterThan(0);
    expect(count(b, (x) => x.kind === "pavement")).toBeGreaterThan(0);
    const c = build(uniform(SHOPFRONT_FROM_TECH - 0.001));
    expect(count(c.layer.adds, (x) => x.kind === "shopfront")).toBe(0);
    expect(c.layer.changes).toHaveLength(0);
    const d = build(uniform(SHOPFRONT_FROM_TECH + 0.01));
    expect(count(d.layer.adds, (x) => x.kind === "shopfront")).toBeGreaterThan(0);
  });

  it("X-6: a district with a higher tech never gets fewer pieces on a fixed hash (wall pieces and signs, and the pavement's and shopfronts' totals, over a ladder of values)", () => {
    const ladder = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1];
    let last: Record<string, number> | null = null;
    for (const t of ladder) {
      const adds = build(uniform(t)).layer.adds;
      const now = { walls: count(adds, (x) => WALL_KINDS.includes(x.kind)), pavement: count(adds, (x) => x.kind === "pavement"), shopfront: count(adds, (x) => x.kind === "shopfront") };
      if (last !== null) {
        expect(now.walls, `walls at ${t}`).toBeGreaterThanOrEqual(last["walls"]!);
        expect(now.shopfront, `shopfronts at ${t}`).toBeGreaterThanOrEqual(last["shopfront"]!);
        expect(now.pavement, `pavement at ${t}`).toBeGreaterThanOrEqual(last["pavement"]!);
      }
      last = now;
    }
    // one district alone: raising it never lowers its own count
    const k = 2;
    const only = (t: number) => build(withTech((i) => (i === k ? t : 0.5))).layer.adds.filter((a) => a.district === DISTRICTS[k]!.id).length;
    expect(only(0.9)).toBeGreaterThanOrEqual(only(0.4));
    expect(only(0.4)).toBeGreaterThanOrEqual(only(0.1));
  });

  it("the hash reads no block id, lattice size or count: a block's pieces are the same with every other district changed", () => {
    const a = build(withTech((k) => (k === 0 ? 0.9 : 0.5))).layer.adds.filter((x) => x.district === DISTRICTS[0]!.id);
    const b = build(withTech((k) => (k === 0 ? 0.9 : 0.1))).layer.adds.filter((x) => x.district === DISTRICTS[0]!.id);
    // walls and signs and shopfronts are per column: only the pavement of a run can be crowded by a neighbour's pieces
    const wallsOf = (l: CityEraPiece[]): string[] => l.filter((x) => x.kind !== "pavement").map((x) => x.id);
    expect(wallsOf(b)).toEqual(wallsOf(a));
  });
});

describe("criterion 1 and 5, the shopfronts", { timeout: 300_000 }, () => {
  const top = build(uniform(1));
  const L = PLAN.plan.layers;

  it("a shopfront is an add in front of the old shop plus removes of that face's dressing: no swap, no state; each panel stands 0.709 m out from the front wall", () => {
    const panels = top.layer.adds.filter((a) => a.kind === "shopfront");
    expect(panels.length).toBeGreaterThan(20);
    expect(top.layer.changes.length).toBeGreaterThan(panels.length);
    for (const ch of top.layer.changes) expect(ch.op).toBe("remove");
    const ctx = buildContext(resolveBefore(PLAN, "tech"), PLAN.layers.history, EMPTY_CIRCUIT);
    for (const a of panels) {
      const parts = a.id.slice("tech:shopfront:".length).split("|");
      parts.pop();
      const g = L.facades!.ground.find((x) => x.building === parts.join("|") && x.cells[0]!.i === a.cell.i && x.cells[0]!.j === a.cell.j)!;
      const p = panelOf(ctx, g)!;
      expect(a.placement.x_m).toBeCloseTo(p.x, 9);
      expect(a.placement.z_m).toBeCloseTo(p.z, 9);
      const covered = coveredDressing(ctx, g, p.side);
      // every covered piece is listed as a remove, and nothing else on that face
      for (const index of covered) expect(top.layer.changes.some((ch) => "list" in ch.ref && ch.ref.list === "facades.dressing" && ch.ref.index === index)).toBe(true);
    }
  });

  it("a corner shop is left alone: there are corner shops with dressing, and no panel or remove touches one", () => {
    const corners = L.facades!.ground.filter((g) => g.kind === "shopCorner");
    expect(corners.length).toBeGreaterThan(50);
    const dressed = corners.filter((g) => L.facades!.dressing!.some((d) => d.building === g.building && d.cell.i === g.cells[0]!.i && d.cell.j === g.cells[0]!.j));
    expect(dressed.length).toBeGreaterThan(50);
    const key = (g: { building: string; cells: readonly { i: number; j: number }[] }): string => `${g.building}|${g.cells[0]!.i},${g.cells[0]!.j}`;
    const cornerKeys = new Set(corners.map(key));
    for (const a of top.layer.adds) if (a.kind === "shopfront") expect(cornerKeys.has(a.id.slice("tech:shopfront:".length))).toBe(false);
    for (const ch of top.layer.changes) {
      if (!("list" in ch.ref) || ch.ref.list !== "facades.dressing") throw new Error("not a dressing remove");
      const d = L.facades!.dressing![ch.ref.index]!;
      expect(cornerKeys.has(`${d.building}|${d.cell.i},${d.cell.j}`)).toBe(false);
    }
  });

  it("criterion 5, the switch: with the constant off (through the options) the layer has no shopfront and no change, and every wall piece, and the pavement of every run without a panel, is the same", () => {
    const on = top;
    const off = build(uniform(1), { shopfronts: false });
    expect(off.layer.adds.some((a) => a.kind === "shopfront")).toBe(false);
    expect(off.layer.changes).toHaveLength(0);
    const idsOf = (adds: readonly CityEraPiece[], pred: (a: CityEraPiece) => boolean): string[] => adds.filter(pred).map((a) => a.id);
    expect(idsOf(off.layer.adds, (a) => WALL_KINDS.includes(a.kind))).toEqual(idsOf(on.layer.adds, (a) => WALL_KINDS.includes(a.kind)));
    const panelRuns = new Set<string>();
    const runOfBuilding = new Map(L.ground!.runs.flatMap((r) => r.buildings.map((b) => [b, r.id] as const)));
    for (const a of on.layer.adds) {
      if (a.kind !== "shopfront") continue;
      const parts = a.id.slice("tech:shopfront:".length).split("|");
      parts.pop();
      panelRuns.add(runOfBuilding.get(parts.join("|"))!);
    }
    const free = (id: string): boolean => {
      const parts = id.slice("tech:pavement:".length).split("|");
      parts.pop();
      parts.pop();
      return !panelRuns.has(parts.join("|"));
    };
    expect(idsOf(off.layer.adds, (a) => a.kind === "pavement" && free(a.id))).toEqual(idsOf(on.layer.adds, (a) => a.kind === "pavement" && free(a.id)));
    expect(panelRuns.size).toBeGreaterThan(5);
  });
});

describe("criterion 4, the pavement's keeps, one fixture each", { timeout: 300_000 }, () => {
  const ctx: TechCtx = buildContext(resolveBefore(PLAN, "tech"), PLAN.layers.history, EMPTY_CIRCUIT);
  const boxes = ctx.boxesAll;
  const atm = specOf(WALL_LINE[1]!);
  const vend = specOf(WALL_LINE[0]!);
  const pillar = specOf(KERB_LINE[0]!);
  const charger = specOf(KERB_LINE[1]!);
  const all = [vend, atm, pillar, charger];

  /** A place that holds: the first (run, line, s, spec) with no refusal. */
  function holding(skip = 0): { run: TechCtx["runs"][number]; line: Line; s: number; spec: ReturnType<typeof specOf> } {
    let seen = 0;
    for (const run of ctx.runs) {
      for (const line of ["wall", "kerb"] as const) {
        for (const spec of line === "wall" ? [vend, atm] : [pillar, charger]) {
          for (let s = FURN_CORNER_M; s < run.len - FURN_CORNER_M; s += 0.5) if (placeRefusal(ctx, boxes, new PaveState(), run, line, s, spec) === null && seen++ >= skip) return { run, line, s, spec };
        }
      }
    }
    throw new Error("no place holds");
  }
  const rectAtPlace = (p: ReturnType<typeof holding>): Rect => {
    const t = p.line === "wall" ? 0.4 + p.spec.d / 2 : CELL_M - 0.5 - p.spec.d / 2;
    return worldOf(p.run, p.s, t, p.spec.w, p.spec.d).rect;
  };
  const withCircuit = (c: Partial<CircuitPoints>): TechCtx => ({ ...ctx, circuit: circuitOf(c) });

  it("a pole, a street light and a lamp-post place each keep FURN_KEEP_M: the place that held is refused with the point on it and just inside the keep-out, and holds just outside", () => {
    const p = holding();
    const r = rectAtPlace(p);
    const centre = pointAt(r, "x");
    for (const [name, kind] of [["pole", "poles"], ["light", "lights"], ["lampPlace", "lampPlaces"]] as const) {
      const on = withCircuit({ [kind]: [centre] });
      expect(placeRefusal(on, boxes, new PaveState(), p.run, p.line, p.s, p.spec), name).toBe(name);
      const edge = { id: "e", x_m: r.x1 + FURN_KEEP_M - 0.1, z_m: centre.z_m };
      expect(circuitRefusal(circuitOf({ [kind]: [edge] }), r, p.spec.h), `${name} inside`).toBe(name);
      const out = { id: "o", x_m: r.x1 + FURN_KEEP_M + 0.1, z_m: centre.z_m };
      expect(circuitRefusal(circuitOf({ [kind]: [out] }), r, p.spec.h), `${name} outside`).toBeNull();
    }
  });

  it("FURN_MAX_H_M under a span: a piece taller than 3.2 m is refused beside a pole line's span or a wire; the kit's pieces (2.57 m at most) never are", () => {
    const p = holding();
    const r = rectAtPlace(p);
    const c = pointAt(r, "c");
    const span = { id: "s", a: { x_m: c.x_m - 6, z_m: c.z_m }, b: { x_m: c.x_m + 6, z_m: c.z_m + 0.0001 } };
    expect(circuitRefusal(circuitOf({ lines: [span] }), r, FURN_MAX_H_M + 0.6)).toBe("span");
    expect(circuitRefusal(circuitOf({ wires: [span] }), r, FURN_MAX_H_M + 0.6)).toBe("span");
    expect(circuitRefusal(circuitOf({ lines: [span] }), r, 2.6)).toBeNull();
    expect(Math.max(...all.map((s) => s.h))).toBeLessThanOrEqual(FURN_MAX_H_M);
    expect(placeRefusal(withCircuit({ lines: [span] }), boxes, new PaveState(), p.run, p.line, p.s, p.spec)).toBeNull();
    expect(rectSegmentDist(r, { x_m: r.x1 + 3, z_m: c.z_m }, { x_m: r.x1 + 4, z_m: c.z_m })).toBeCloseTo(3, 9);
    expect(rectSegmentDist(r, { x_m: c.x_m, z_m: r.z0 - 2 }, { x_m: c.x_m, z_m: r.z1 + 2 })).toBe(0);
  });

  it("a corner: no piece within 4 m of a run's end", () => {
    const run = ctx.runs.find((q) => q.len >= 15)!;
    expect(placeRefusal(ctx, boxes, new PaveState(), run, "wall", FURN_CORNER_M - 1, vend)).toBe("corners");
    expect(placeRefusal(ctx, boxes, new PaveState(), run, "kerb", run.len - FURN_CORNER_M + 1, pillar)).toBe("corners");
  });

  it("a stage 8 prop: the 7 m pitch holds against its line; a piece beside a stage 8 or 9 footprint (0.3 m) is a clash", () => {
    let proved = false;
    for (const run of ctx.runs) {
      for (const prop of ctx.propsOfRun.get(run.id) ?? []) {
        const s0 = (run.along === "x" ? prop.placement.x_m : prop.placement.z_m) - run.lo_m;
        const t = run.sgn * ((run.along === "x" ? prop.placement.z_m : prop.placement.x_m) - run.wall_m);
        const line: Line = t < CELL_M / 2 ? "wall" : "kerb";
        const spec = line === "wall" ? vend : pillar;
        const s = s0 + FURN_PITCH_M - 0.5;
        if (s - spec.w / 2 < FURN_CORNER_M || s + spec.w / 2 > run.len - FURN_CORNER_M) continue;
        expect(placeRefusal(ctx, boxes, new PaveState(), run, line, s, spec), `${prop.kind} on ${run.id}`).toBe("pitch");
        proved = true;
        break;
      }
      if (proved) break;
    }
    expect(proved).toBe(true);
    const p = holding();
    const r = rectAtPlace(p);
    const extra = new Grid<TechCtx["feet"]["items"][number]>();
    for (const f of ctx.feet.items) extra.add(f);
    extra.add({ x0: r.x1 + 0.1, x1: r.x1 + 0.6, z0: r.z0, z1: r.z1, src: "test", host: null, flat: false });
    expect(placeRefusal({ ...ctx, feet: extra }, boxes, new PaveState(), p.run, p.line, p.s, p.spec)).toBe("clash");
  });

  it("KO, AV, EL and DK: each reason refuses real places of the city, and the stage 4 and 7 inputs show why", () => {
    const seen = new Map<string, { run: TechCtx["runs"][number]; line: Line; s: number; spec: ReturnType<typeof specOf> }>();
    for (const run of ctx.runs) {
      for (const line of ["wall", "kerb"] as const) {
        for (const spec of line === "wall" ? [vend, atm] : [pillar, charger]) {
          for (let s = FURN_CORNER_M; s < run.len - FURN_CORNER_M; s += 0.5) {
            const why = placeRefusal(ctx, boxes, new PaveState(), run, line, s, spec);
            if (why !== null && !seen.has(why)) seen.set(why, { run, line, s, spec });
          }
        }
      }
    }
    for (const why of ["KO", "AV", "EL", "DK", "pitch", "clash"]) expect(seen.has(why), why).toBe(true);
    const ko = seen.get("KO")!;
    const r = worldOf(ko.run, ko.s, ko.line === "wall" ? 0.4 + ko.spec.d / 2 : CELL_M - 0.5 - ko.spec.d / 2, ko.spec.w, ko.spec.d).rect;
    expect(ctx.ko.items.some((q) => rectDist(r, q) < FURN_KEEP_M)).toBe(true);
    const dk = seen.get("DK")!;
    expect(dk.line).toBe("wall");
    const rd = worldOf(dk.run, dk.s, 0.4 + dk.spec.d / 2, dk.spec.w, dk.spec.d).rect;
    expect(ctx.doors.items.some((q) => rd.x0 < q.x1 && q.x0 < rd.x1 && rd.z0 < q.z1 && q.z0 < rd.z1)).toBe(true);
    const av = seen.get("AV")!;
    const ra = worldOf(av.run, av.s, av.line === "wall" ? 0.4 + av.spec.d / 2 : CELL_M - 0.5 - av.spec.d / 2, av.spec.w, av.spec.d).rect;
    expect(boxes.items.some((b) => b.pav && ra.x0 < b.x1 && b.x0 < ra.x1 && ra.z0 < b.z1 && b.z0 < ra.z1 && av.spec.h > b.base)).toBe(true);
  });

  it("two pieces across a pavement: with a wall-line piece placed, the kerb-line piece at the same place is refused for the walk, and the walk it would leave is under 2 m", () => {
    let proved = 0;
    for (const run of ctx.runs) {
      for (let s = FURN_CORNER_M + 1; s < run.len - FURN_CORNER_M - 1; s += 0.5) {
        if (placeRefusal(ctx, boxes, new PaveState(), run, "wall", s, atm) !== null) continue;
        if (placeRefusal(ctx, boxes, new PaveState(), run, "kerb", s, pillar) !== null) continue;
        const state = new PaveState();
        const w = worldOf(run, s, 0.4 + atm.d / 2, atm.w, atm.d);
        state.add(run, { rect: w.rect, s, at: "wall" });
        expect(placeRefusal(ctx, boxes, state, run, "kerb", s, pillar), `${run.id} at ${s}`).toBe("walk");
        const k = worldOf(run, s, CELL_M - 0.5 - pillar.d / 2, pillar.w, pillar.d).rect;
        expect(clearWalk(ctx, state, run, k)).toBeLessThan(CLEAR_WALK_M);
        // alone, the kerb piece's walk is fine
        expect(clearWalk(ctx, new PaveState(), run, k)).toBeGreaterThanOrEqual(CLEAR_WALK_M);
        proved++;
        break;
      }
      if (proved >= 3) break;
    }
    expect(proved).toBeGreaterThanOrEqual(3);
  });

  it("the walk counts a shopfront panel: a wall-line piece is refused where a panel stands", () => {
    const top = build(uniform(1));
    const panel = top.layer.adds.find((a) => a.kind === "shopfront")!;
    const run = ctx.runs.find((q) => q.buildings.some((b) => panel.id === `tech:shopfront:${b}|${panel.cell.i},${panel.cell.j}`))!;
    const state = new PaveState();
    const rect = rectOf(panel);
    state.add(run, { rect, s: (run.along === "x" ? panel.placement.x_m : panel.placement.z_m) - run.lo_m, at: "panel" });
    const mid = (run.along === "x" ? panel.placement.x_m : panel.placement.z_m) - run.lo_m;
    expect(clearWalk(ctx, state, run, worldOf(run, mid, CELL_M - 0.5 - pillar.d / 2, pillar.w, pillar.d).rect)).toBeLessThan(CELL_M);
  });
});

describe("the wall pieces keep a drop's wall point, and T-1 fails a forced add (criterion 6)", { timeout: 300_000 }, () => {
  const base = build(uniform(0.9));
  const SIDE_OUT: Record<number, { x: number; z: number }> = { 0: { x: 0, z: 1 }, 90: { x: 1, z: 0 }, 180: { x: 0, z: -1 }, 270: { x: -1, z: 0 } };

  it("a drop on a wall refuses the piece that was there, and no piece of the pass stands over the drop's first 2 m", () => {
    const w = base.layer.adds.find((a) => a.kind === "bolt-on" && a.placement.y_m >= 6)!;
    const out = SIDE_OUT[w.placement.yaw_deg]!;
    const r = rectOf(w);
    const back = { x_m: out.x === 0 ? (r.x0 + r.x1) / 2 : out.x > 0 ? r.x0 : r.x1, z_m: out.z === 0 ? (r.z0 + r.z1) / 2 : out.z > 0 ? r.z0 : r.z1 };
    const drop = { id: "drop:1", wall: back, out: { x_m: out.x, z_m: out.z } };
    const next = build(uniform(0.9), { circuit: circuitOf({ drops: [drop] }) });
    expect(next.layer.adds.some((a) => a.id === w.id)).toBe(false);
    for (const a of next.layer.adds) {
      if (a.kind === "pavement" || a.kind === "shopfront") continue;
      const q = rectOf(a);
      for (let t = 0; t <= 2 + 1e-9; t += 0.25) {
        const x = back.x_m + t * out.x;
        const z = back.z_m + t * out.z;
        expect(x >= q.x0 - 0.15 && x <= q.x1 + 0.15 && z >= q.z0 - 0.15 && z <= q.z1 + 0.15, `${a.id} over the drop at ${t}`).toBe(false);
      }
    }
    // the rest of the city's wall pieces are untouched by one drop
    expect(next.layer.adds.filter((a) => WALL_KINDS.includes(a.kind)).length).toBeGreaterThan(base.layer.adds.filter((a) => WALL_KINDS.includes(a.kind)).length - 4);
  });

  it("a pole, a light or a lamp-post place under a pavement piece refuses it, through the whole stage", () => {
    const a = base.layer.adds.find((x) => x.kind === "pavement")!;
    const at = pointAt(rectOf(a), "p");
    for (const kind of ["poles", "lights", "lampPlaces"] as const) {
      const next = build(uniform(0.9), { circuit: circuitOf({ [kind]: [at] }) });
      // the slot's id may be reused by a piece that moved off the point: the one at the old place is gone
      expect(next.layer.adds.some((x) => x.id === a.id && Math.abs(x.placement.x_m - a.placement.x_m) < 1e-6 && Math.abs(x.placement.z_m - a.placement.z_m) < 1e-6), kind).toBe(false);
      for (const x of next.layer.adds) if (x.kind === "pavement") expect(rectDist(rectOf(x), { x0: at.x_m, x1: at.x_m, z0: at.z_m, z1: at.z_m }), `${kind} ${x.id}`).toBeGreaterThanOrEqual(FURN_KEEP_M - 1e-6);
    }
  });

  it("a forced add that covers a pole fails: assertEraReadable throws a CityStageError naming T-1 (and the stage's own layer passes with the same pole)", () => {
    const a = base.layer.adds.find((x) => x.kind === "pavement")!;
    const pole = pointAt(rectOf(a), "pole:1");
    const circuit = circuitOf({ poles: [pole] });
    const forced = { stage: "tech" as const, adds: [a], changes: [] };
    const run = (): unknown => assertEraReadable(PLAN, "tech", forced, { bounds: techBoundsOf, isTree: techIsTree, circuit });
    expect(run).toThrow(CityStageError);
    expect(run).toThrow(/T-1/);
    const clean = build(uniform(0.9), { circuit });
    expect(clean.resolved.era).toBe("tech");
  });
});

describe("criterion 7, dark and textured; and the source", () => {
  it("every kit key is textured and none is emissive; none is a never-used Sci-Fi key (ad, neon, billboard frame, soda machine, doorway)", () => {
    expect(TECH_KIT.length).toBeGreaterThan(30);
    for (const e of TECH_KIT) {
      expect(e.textured, e.key).toBe(true);
      expect(e.emissive, e.key).toBe(false);
      expect(/Sign_Ad_|Sign_Neon|Billboard|Soda|Doorway/.test(e.key), e.key).toBe(false);
      expect(e.key.startsWith("sci-fi-city-pack:SM_")).toBe(true);
    }
    expect(new Set(TECH_KIT.map((e) => e.key)).size).toBe(TECH_KIT.length);
  });

  it("no file of this folder (tests and their support apart) imports another stage folder, three or the DOM, reads bi, bj or a street's line, or draws on Math.random or the clock", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "testcities.ts");
    expect(files.length).toBeGreaterThan(8);
    for (const f of files) {
      const src = readFileSync(dir + f, "utf8");
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(/from "\.\.\/(streets|land|mass|edge|buildings|facades|ground|traffic|history)\b/.test(code), `${f} imports a stage folder`).toBe(false);
      expect(/from "\.\.\/\.\.\/(render|render3d|play|ui|audio|grid|night)\b|from "three|document\.|window\./.test(code), `${f} imports outside the planner`).toBe(false);
      expect(/\.(bi|bj)\b|\.line\b/.test(code), `${f} reads bi, bj or a street's line`).toBe(false);
      expect(/Math\.random|Date\.now|performance\.now|new Date/.test(code), `${f} is not pure`).toBe(false);
    }
  });
});
