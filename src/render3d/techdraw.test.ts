import { describe, expect, it } from "vitest";
import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Texture, Vector3, type Object3D } from "three";
import type { CalibrationKey, CityEra, CityEraPiece, CityEraRun, CityPlan, CityPlanRun, CityTechPieceKind } from "../core";
import { resolvePlan } from "../city/pipeline";
import { sharedCity, sharedEra } from "../city/testing/namedcities";
import { TECH_KIT } from "../city/tech/kit";
import { isNeverUsed } from "./citymetrics";
import { dressKeys } from "./dressing";
import { WORLD_PER_METRE } from "./models";
import { PLAN_AUDIT_TECH_ALLOWED, PLAN_AUDIT_TECH_ERAS, PlanStopError, TECH_DRAW_CALLS_MAX, planAudit, planAtEra, plan3dGroups, planTechDraws } from "./plan3d";

// Ticket 073 D1g: the tech pass's adds, drawn. One 6 x 6 seed 1 clean run and one tech era run, shared.
const OPTS = { blocksX: 6, blocksZ: 6, seed: 1 };
let cleanRun: CityPlanRun | null = null;
function clean(): CityPlan {
  cleanRun ??= sharedCity({ ...OPTS, way: "on" }, "clean");
  if (!cleanRun.ok) throw new Error("clean run failed");
  return cleanRun.plan;
}
const eraRuns = new Map<CityEra, CityEraRun>();
function eraRun(era: "tech" | "holdout" | "ruin"): CityEraRun {
  let r = eraRuns.get(era);
  if (!r) {
    r = sharedEra({ ...OPTS, way: "on" }, era);
    eraRuns.set(era, r);
  }
  return r;
}

/** One loaded root for every tech kit key: a box with a lit, mapped material, as a Sci-Fi City GLB may carry. */
function techRoots(): Map<CalibrationKey, Object3D> {
  const roots = new Map<CalibrationKey, Object3D>();
  for (const e of TECH_KIT) {
    const mat = new MeshStandardMaterial({ color: 0x888888 });
    mat.emissive = new Color(0xffffff);
    mat.emissiveMap = new Texture();
    mat.emissiveIntensity = 2;
    const g = new Group();
    g.add(new Mesh(new BoxGeometry(e.w, e.h, e.d), mat));
    roots.set(e.key, g);
  }
  return roots;
}

const addsAt = (era: "tech" | "holdout" | "ruin"): readonly CityEraPiece<CityTechPieceKind>[] => {
  const r = planAtEra(clean(), era, eraRun(era));
  expect(r.text).toBeNull();
  return r.techAdds;
};

describe("D1g criterion 1: the draw places every tech add once, through resolvePlan", () => {
  it("the tech era's adds are the resolver's own, and the later eras keep them", () => {
    const run = eraRun("tech");
    if (!run.ok) throw new Error("era run failed");
    const adds = addsAt("tech");
    expect(adds.length).toBeGreaterThan(0);
    expect(adds).toEqual(resolvePlan(run.plan, "tech").adds.tech);
    for (const era of ["holdout", "ruin"] as const) expect(addsAt(era).map((a) => a.id)).toEqual(adds.map((a) => a.id));
  }, 60000);

  it("every add is drawn once, at its placement, and the removed dressing is not drawn", () => {
    const adds = addsAt("tech");
    const r = planAtEra(clean(), "tech", eraRun("tech"));
    const draw = plan3dGroups(r.plan!, techRoots(), new Map(), undefined, undefined, { era: "tech", adds });
    const tech = draw.tech!;
    expect(tech.listed).toBe(adds.length);
    expect(tech.placed).toBe(adds.length);
    expect(tech.drawn).toBe(adds.length);
    expect(tech.leftOut).toEqual([]);
    expect(draw.techDraws.map((d) => d.id)).toEqual(adds.map((a) => a.id));
    // Per key: the instance counts are the adds' counts.
    const want = new Map<CalibrationKey, number>();
    for (const a of adds) want.set(a.placement.key, (want.get(a.placement.key) ?? 0) + 1);
    expect(new Map(tech.perKey)).toEqual(want);
    // Every instance is at a placement of an add of its key: position in world units and the turn about y.
    const m = new Matrix4();
    const pos = new Vector3();
    const r4 = (v: number): string => String(Math.round(v * 1e2) / 1e2 + 0);
    const wantPlaces = new Set(adds.map((a) => `${a.placement.key}|${r4(a.placement.x_m * WORLD_PER_METRE)}|${r4(a.placement.y_m * WORLD_PER_METRE)}|${r4(a.placement.z_m * WORLD_PER_METRE)}`));
    let seen = 0;
    for (const c of tech.group.children) {
      const im = c as InstancedMesh;
      const key = [...want.keys()].find((k) => c.name === `dress:${k.slice(k.indexOf(":") + 1)}`)!;
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        pos.setFromMatrixPosition(m);
        // The mesh's own matrix in its root is the identity here (a box at the origin), so the instance is the piece's pivot.
        const got = `${key}|${r4(pos.x)}|${r4(pos.y)}|${r4(pos.z)}`;
        if (!wantPlaces.has(got)) throw new Error(got + " vs " + [...wantPlaces].filter((w) => w.startsWith(key)).slice(0, 3).join(" ; "));
        seen++;
      }
    }
    expect(seen).toBe(adds.length);
    // The shopfront panels are among them.
    expect(adds.some((a) => a.kind === "shopfront")).toBe(true);
    // The removed dressing is not drawn: the drawn stage 7 list is the resolved plan's, shorter than the clean one.
    const cleanDress = clean().layers.facades!.dressing!.length;
    expect(draw.dressDraws.filter((d) => d.list === "dressing").length).toBe(r.plan!.layers.facades!.dressing!.length);
    expect(r.plan!.layers.facades!.dressing!.length).toBeLessThan(cleanDress);
    draw.dispose();
  });

  it("at clean the draw is exactly today's: no tech group, and the same children with or without the argument", () => {
    const plain = plan3dGroups(clean(), techRoots(), new Map());
    const withClean = plan3dGroups(clean(), techRoots(), new Map(), undefined, undefined, { era: "clean", adds: addsAt("tech") });
    expect(plain.tech).toBeNull();
    expect(withClean.tech).toBeNull();
    expect(withClean.techDraws).toEqual([]);
    expect(withClean.group.children.map((c) => c.name)).toEqual(plain.group.children.map((c) => c.name));
    expect(withClean.group.children.some((c) => c.name === "plan:tech")).toBe(false);
    plain.dispose();
    withClean.dispose();
  });

  it("an add whose key is not in the tech kit stops the draw, the cell named", () => {
    const [first] = addsAt("tech");
    const bad = { ...first!, placement: { ...first!.placement, key: "sci-fi-city-pack:SM_Nothing" as CalibrationKey } };
    expect(() => planTechDraws([bad])).toThrow(PlanStopError);
  });
});

describe("D1g criterion 2: dark (X-5)", () => {
  it("no material of the drawn tech meshes is emissive or lit, though the loaded pieces' were", () => {
    const adds = addsAt("tech");
    const roots = techRoots();
    const r = planAtEra(clean(), "tech", eraRun("tech"));
    const draw = plan3dGroups(r.plan!, roots, new Map(), undefined, undefined, { era: "tech", adds });
    let meshes = 0;
    draw.tech!.group.traverse((o) => {
      const mesh = o as Mesh;
      if (!(mesh as { isMesh?: boolean }).isMesh) return;
      meshes++;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const lit = m as MeshStandardMaterial;
        expect(lit.emissive.getHex()).toBe(0);
        expect(lit.emissiveMap).toBeNull();
      }
    });
    expect(meshes).toBeGreaterThan(0);
    // The loaded roots keep their own (the instancer swaps, never writes).
    for (const root of roots.values()) expect(((root.children[0] as Mesh).material as MeshStandardMaterial).emissive.getHex()).toBe(0xffffff);
    draw.dispose();
  });

  it("no kit key is emissive or untextured by its typing", () => {
    for (const e of TECH_KIT) {
      expect(e.emissive).toBe(false);
      expect(e.textured).toBe(true);
    }
  });
});

describe("D1g criterion 3: R12 gains B2's allowance, era-scoped (X-9)", () => {
  const lamp = "sci-fi-city-pack:SM_Prop_LightPole_Base_01" as CalibrationKey;
  const base = (): CityEraPiece<CityTechPieceKind> => {
    const [first] = addsAt("tech");
    return { ...first!, kind: "sign", placement: { ...first!.placement, key: lamp } };
  };

  it("today's R12 is unchanged: no tech argument, no finding; a clean plan is empty", () => {
    expect(planAudit(clean())).toEqual([]);
    expect(planAudit(clean(), { era: "tech", adds: addsAt("tech") })).toEqual([]);
    for (const e of TECH_KIT) expect(isNeverUsed(e.key), e.key).toBe(false);
  });

  it("a never-used key among the adds is a finding unless the table allows it, for that kind, in that era", () => {
    const add = base();
    const found = [{ layer: "tech", list: "adds", cell: add.cell, key: lamp }];
    expect(planAudit(clean(), { era: "tech", adds: [add] })).toEqual(found);
    const table = [{ key: lamp, kind: "sign" as const }];
    for (const era of PLAN_AUDIT_TECH_ERAS) expect(planAudit(clean(), { era, adds: [add] }, table), era).toEqual([]);
    // Its own kind only.
    expect(planAudit(clean(), { era: "tech", adds: [{ ...add, kind: "bolt-on" }] }, table)).toEqual(found);
    // Not at clean.
    expect(planAudit(clean(), { era: "clean", adds: [add] }, table)).toEqual(found);
  });

  it("the table is typed, era-scoped, and plan3dGroups stops on a finding", () => {
    expect(PLAN_AUDIT_TECH_ERAS).toEqual(["tech", "holdout", "ruin"]);
    expect(Array.isArray(PLAN_AUDIT_TECH_ALLOWED)).toBe(true);
    expect(() => plan3dGroups(clean(), techRoots(), new Map(), undefined, undefined, { era: "tech", adds: [base()] })).toThrow(PlanStopError);
  });
});

describe("D1g criterion 4: the tech group is its own draw-call cap", () => {
  it("one call per key here (a one-mesh root), under the cap", () => {
    const adds = addsAt("tech");
    const r = planAtEra(clean(), "tech", eraRun("tech"));
    const draw = plan3dGroups(r.plan!, techRoots(), new Map(), undefined, undefined, { era: "tech", adds });
    expect(draw.tech!.calls).toBe(new Set(adds.map((a) => a.placement.key)).size);
    expect(draw.tech!.calls).toBeLessThanOrEqual(TECH_DRAW_CALLS_MAX);
    draw.dispose();
  });
});

describe("D1g criterion 1: a swapped piece is drawn with its new key, a removed one not at all", () => {
  it("one swap and one remove in a synthetic tech layer show in the drawn dressing, by key, placement and identity", () => {
    const base = eraRun("tech");
    if (!base.ok) throw new Error("era run failed");
    const dressing = clean().layers.facades!.dressing!;
    const oldKey = dressing[0]!.placement.key;
    const newKey = dressKeys().find((k) => k !== oldKey)!;
    const gone = dressing[1]!;
    const layer = {
      stage: "tech" as const,
      adds: [],
      changes: [
        { ref: { list: "facades.dressing" as const, index: 0, key: oldKey }, op: "swap" as const, key: newKey },
        { ref: { list: "facades.dressing" as const, index: 1, key: gone.placement.key }, op: "remove" as const },
      ],
    };
    const run: CityEraRun = { ok: true, plan: { ...base.plan, layers: { ...base.plan.layers, tech: layer } } };
    const r = planAtEra(clean(), "tech", run);
    expect(r.text).toBeNull();
    const before = clean().layers.facades!.dressing!;
    const drawn = plan3dGroups(r.plan!, new Map(), new Map()).dressDraws.filter((d) => d.list === "dressing");
    expect(drawn.length).toBe(before.length - 1);
    const count = (list: readonly { placement: { key: CalibrationKey } }[], key: CalibrationKey): number => list.filter((p) => p.placement.key === key).length;
    // The swapped piece: same placement, the new key; the old key's count drops by one, the new key's rises by one.
    expect(drawn[0]!.placement).toEqual({ ...before[0]!.placement, key: newKey });
    expect(count(drawn, oldKey)).toBe(count(before, oldKey) - 1 - (gone.placement.key === oldKey ? 1 : 0));
    expect(count(drawn, newKey)).toBe(count(before, newKey) + 1 - (gone.placement.key === newKey ? 1 : 0));
    // The removed piece, by identity: the drawn list is the clean list without it (the swapped one in its place).
    expect(drawn.slice(1).map((d) => d.placement)).toEqual(before.slice(2).map((p) => p.placement));
  });
});
