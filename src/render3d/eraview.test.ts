import { describe, expect, it, vi } from "vitest";
import type { Scene, WebGLRenderer } from "three";
import type { CityEra, CityEraRun, CityPlan, CityPlanRun } from "../core";
import { ERA_STAGES, runCity, runCityEra } from "../city/pipeline";
import { NO_MODELS } from "./models3d";
import { createPlanAssembleRenderer3d, nextEra, planAssembleRequested, planAtEra } from "./plan3d";
import { eraRequested, planHidesHud, planShown, planViewRequested } from "./planview";

// Ticket 073 C2: the era switch, drawn. One 6 x 6 seed 1 clean run, shared.
const OPTS = { blocksX: 6, blocksZ: 6, seed: 1 };
let cleanRun: CityPlanRun | null = null;
function clean(): CityPlan {
  cleanRun ??= runCity(OPTS, "traffic");
  if (!cleanRun.ok) throw new Error(`clean run failed at ${cleanRun.failure.stage}`);
  return cleanRun.plan;
}
const eraRunOf = (era: "tech" | "holdout" | "ruin"): CityEraRun => runCityEra(OPTS, era);
/** The era stages with no pass built: history only. */
const HISTORY_ONLY = ERA_STAGES.filter((s) => s.name === "history");
const noPassRunOf = (era: "tech" | "holdout" | "ruin"): CityEraRun => runCityEra(OPTS, era, HISTORY_ONLY);

/** A fake tech layer that removes the first piece of the first of these lists that has one. The drawing must read the resolved plan, not these raw layers. */
function removingRun(): { run: CityEraRun; list: string } {
  const base = eraRunOf("tech");
  if (!base.ok) throw new Error("era run failed");
  const plan = clean();
  const lists = [
    ["facades.novelty", plan.layers.facades?.novelty],
    ["facades.dressing", plan.layers.facades?.dressing],
    ["traffic.pieces", plan.layers.traffic?.pieces],
    ["ground.props", plan.layers.ground?.props],
  ] as const;
  for (const [name, items] of lists) {
    const first = (items as readonly unknown[] | undefined)?.[0] as { placement: { key: string } } | undefined;
    if (first) {
      const layer = { stage: "tech" as const, adds: [], changes: [{ ref: { list: name, index: 0, key: first.placement.key as never }, op: "remove" as const }] };
      return { run: { ok: true, plan: { ...base.plan, layers: { ...base.plan.layers, tech: layer } } }, list: name };
    }
  }
  throw new Error("no list to remove from");
}
const count = (p: CityPlan, list: string): number => {
  if (list === "facades.novelty") return p.layers.facades!.novelty!.length;
  if (list === "facades.dressing") return p.layers.facades!.dressing!.length;
  if (list === "traffic.pieces") return p.layers.traffic!.pieces.length;
  return p.layers.ground!.props.length;
};

describe("the era in the address (criterion 1)", () => {
  it("planViewRequested and planAssembleRequested read era, and an unknown one is clean", () => {
    expect(planViewRequested("?city=plan")?.era).toBe("clean");
    expect(planViewRequested("?city=plan&era=tech")?.era).toBe("tech");
    expect(planViewRequested("?city=plan&era=HoldOut")?.era).toBe("holdout");
    expect(planViewRequested("?city=plan&era=ruin")?.era).toBe("ruin");
    for (const bad of ["", "stone", "3", "history"]) expect(planViewRequested(`?city=plan&era=${bad}`)?.era).toBe("clean");
    expect(eraRequested("?era=ruin")).toBe("ruin");
    expect(eraRequested("")).toBe("clean");
    expect(planAssembleRequested("?city=plan&stage=assemble&era=holdout")?.era).toBe("holdout");
    expect(planAssembleRequested("?city=plan&stage=assemble&era=nope")?.era).toBe("clean");
    expect(planAssembleRequested("?city=plan&stage=assemble")?.era).toBe("clean");
  });

  it("nextEra steps clean, tech, holdout, ruin and round", () => {
    expect(nextEra("clean")).toBe("tech");
    expect(nextEra("tech")).toBe("holdout");
    expect(nextEra("holdout")).toBe("ruin");
    expect(nextEra("ruin")).toBe("clean");
  });
});

describe("the draw reads the resolved plan (criterion 2)", () => {
  it("clean is the clean plan itself, and runs no era stage", () => {
    const p = clean();
    expect(planAtEra(p, "clean", null).plan).toBe(p);
  });

  it("with no pass built, every era above clean draws the clean city", () => {
    const p = clean();
    for (const era of ["tech", "holdout", "ruin"] as const) {
      const r = planAtEra(p, era, noPassRunOf(era));
      expect(r.text).toBeNull();
      expect(r.plan).toEqual(p);
    }
  });

  it("with the registered ERA_STAGES (tech built), the tech era differs from clean only through the resolver", () => {
    const p = clean();
    const run = eraRunOf("tech");
    if (!run.ok) throw new Error("era run failed");
    // techStage removes shopfront glass from facades.dressing; the layer says so, and only the resolved plan shows it.
    const removed = (run.plan.layers.tech?.changes ?? []).filter((c) => c.op === "remove" && "list" in c.ref && c.ref.list === "facades.dressing").length;
    expect(removed).toBeGreaterThan(0);
    const before = p.layers.facades!.dressing!.length;
    const tech = planAtEra(p, "tech", run);
    expect(tech.text).toBeNull();
    expect(tech.plan!.layers.facades!.dressing!.length).toBe(before - removed);
    expect(planAtEra(p, "clean", null).plan).toBe(p);
    expect(p.layers.facades!.dressing!.length).toBe(before);
  });

  it("a change in a pass's layer shows only through the resolver: the removed piece is gone from the drawn plan", () => {
    const { run, list } = removingRun();
    const drawn = planAtEra(clean(), "tech", run).plan!;
    expect(count(drawn, list)).toBe(count(clean(), list) - 1);
  });

  it("a failed era run, or a reference that finds nothing, draws nothing and says why", () => {
    const failed: CityEraRun = { ok: false, plan: { plan: clean(), layers: {}, digests: {} }, failure: { stage: "history", seed: 1, blocksX: 6, blocksZ: 6, reason: "boom", cells: [] } };
    const r = planAtEra(clean(), "tech", failed);
    expect(r.plan).toBeNull();
    expect(r.text).toContain("history");
    expect(r.text).toContain("boom");
    const base = eraRunOf("tech");
    if (!base.ok) throw new Error("era run failed");
    const bad: CityEraRun = { ok: true, plan: { ...base.plan, layers: { ...base.plan.layers, tech: { stage: "tech", adds: [], changes: [{ ref: { id: "tech:nothing" }, op: "remove" }] } } } };
    const m = planAtEra(clean(), "tech", bad);
    expect(m.plan).toBeNull();
    expect(m.text).toContain("missing");
  });
});

describe("the renderer takes the era", () => {
  const canvas = { clientWidth: 1280, clientHeight: 720, style: { touchAction: "" }, addEventListener() {}, removeEventListener() {}, setPointerCapture() {} } as unknown as HTMLCanvasElement;
  const make = (search: string, eraRun: (e: CityEra) => CityEraRun) => {
    const scenes: Scene[] = [];
    const gl = { setPixelRatio() {}, setSize() {}, render: (s: Scene) => scenes.push(s) } as unknown as WebGLRenderer;
    const r = createPlanAssembleRenderer3d(gl, canvas, planAssembleRequested(search)!, { dpr: 1, search, load: async () => ({ ...NO_MODELS }), run: { ok: true, plan: clean() }, eraRun });
    return { r, scenes };
  };

  it("a clean request runs no era stage; an era request runs it once and draws the resolved plan", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const spy = vi.fn((e: "tech") => eraRunOf(e));
    const a = make("?city=plan&stage=assemble", spy as never);
    await new Promise<void>((done) => setTimeout(done, 0));
    a.r.draw(undefined as never, undefined as never, 0);
    expect(spy).not.toHaveBeenCalled();
    expect(a.scenes[a.scenes.length - 1]!.getObjectByName("plan3d")).toBeDefined();
    a.r.dispose();
    const b = make("?city=plan&stage=assemble&era=tech", spy as never);
    await new Promise<void>((done) => setTimeout(done, 0));
    b.r.draw(undefined as never, undefined as never, 0);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("tech");
    expect(b.scenes[b.scenes.length - 1]!.getObjectByName("plan3d")).toBeDefined();
    b.r.dispose();
    info.mockRestore();
  });
});

describe("stage=history is the flat district picture (B criterion 7, moved to C2)", () => {
  it("planViewRequested names it, the HUD hides, and planShown draws the history picture on 6 x 6 seed 1", () => {
    const req = planViewRequested("?view=3d&city=plan&stage=history")!;
    expect(req.stage).toBe("history");
    expect(planHidesHud("?view=3d&city=plan&stage=history", true)).toBe(true);
    expect(planAssembleRequested("?view=3d&city=plan&stage=history")).toBeNull();
    const shown = planShown(req);
    expect(shown.banner).toBeNull();
    expect(shown.picture?.stage).toBe("history");
    const streets = clean().layers.streets!;
    expect(shown.picture!.w).toBe(streets.w);
    expect(shown.picture!.h).toBe(streets.h);
    expect(shown.picture!.legend.length).toBeGreaterThan(1);
    expect(shown.title).toContain("history");
    expect(ERA_STAGES.some((s) => s.name === "history")).toBe(true);
  });
});
