import { describe, expect, it } from "vitest";
import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Texture, Vector3, type Object3D } from "three";
import type { CalibrationKey, CityEra, CityEraPiece, CityEraRun, CityHoldoutPieceKind, CityPlan, CityPlanRun } from "../core";
import { resolvePlan } from "../city/pipeline";
import { sharedCity, sharedEra } from "../city/testing/namedcities";
import { KIT } from "../city/holdout/kit";
import { TECH_KIT } from "../city/tech/kit";
import { isNeverUsed } from "./citymetrics";
import { WORLD_PER_METRE } from "./models";
import { HOLDOUT_DRAW_CALLS_MAX, PLAN_AUDIT_HOLDOUT_ALLOWED, PLAN_AUDIT_HOLDOUT_ERAS, PlanStopError, TECH_DRAW_CALLS_MAX, planAtEra, planAudit, planHoldoutDraws, plan3dGroups } from "./plan3d";

// Ticket 073 E2g: the hold-out pass's adds, drawn. One 6 x 6 seed 1 clean run and one era run per era, shared.
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

/** One loaded root per kit key (hold-out and tech): a box of the kit's size with a lit, mapped material, as a Sci-Fi GLB carries. */
function roots(): Map<CalibrationKey, Object3D> {
  const out = new Map<CalibrationKey, Object3D>();
  const lit = (w: number, h: number, d: number): Group => {
    const mat = new MeshStandardMaterial({ color: 0x888888 });
    mat.emissive = new Color(0xffffff);
    mat.emissiveMap = new Texture();
    mat.emissiveIntensity = 2;
    const g = new Group();
    g.add(new Mesh(new BoxGeometry(w, h, d), mat));
    return g;
  };
  for (const e of TECH_KIT) out.set(e.key, lit(e.w, e.h, e.d));
  for (const [k, e] of Object.entries(KIT)) out.set(k as CalibrationKey, lit(e.w, e.h, e.d));
  return out;
}

const at = (era: "tech" | "holdout" | "ruin") => {
  const r = planAtEra(clean(), era, eraRun(era));
  expect(r.text).toBeNull();
  return r;
};
const draw = (era: "tech" | "holdout" | "ruin", rs: Map<CalibrationKey, Object3D> = roots()) => {
  const r = at(era);
  return plan3dGroups(r.plan!, rs, new Map(), undefined, undefined, { era, adds: r.techAdds, holdoutAdds: r.holdoutAdds });
};

describe("E2g criterion 2: the draw places every hold-out add once, through resolvePlan, with removes applied", () => {
  it("the hold-out adds are the resolver's own at holdout and ruin, and none at clean or tech", () => {
    const run = eraRun("holdout");
    if (!run.ok) throw new Error("era run failed");
    const adds = at("holdout").holdoutAdds;
    expect(adds.length).toBeGreaterThan(0);
    expect(adds).toEqual(resolvePlan(run.plan, "holdout").adds.holdout);
    expect(at("ruin").holdoutAdds.map((a) => a.id)).toEqual(adds.map((a) => a.id));
    expect(at("tech").holdoutAdds).toEqual([]);
    expect(planAtEra(clean(), "clean", null).holdoutAdds).toEqual([]);
    // Every kind E2 writes at seed 1 is among them.
    const kinds = new Set(adds.map((a) => a.kind));
    for (const k of ["camp", "farm", "stall", "barricade", "roof"] as CityHoldoutPieceKind[]) expect(kinds.has(k), k).toBe(true);
  }, 120000);

  it("every add is drawn once, at its placement, in one group plan:holdout", () => {
    for (const era of ["holdout", "ruin"] as const) {
      const adds = at(era).holdoutAdds;
      const d = draw(era);
      const h = d.holdout!;
      expect(h.group.name).toBe("plan:holdout");
      expect(d.group.children.filter((c) => c.name === "plan:holdout")).toHaveLength(1);
      expect(h.listed).toBe(adds.length);
      expect(h.placed).toBe(adds.length);
      expect(h.drawn).toBe(adds.length);
      expect(h.leftOut).toEqual([]);
      expect(d.holdoutDraws.map((x) => x.id)).toEqual(adds.map((a) => a.id));
      const want = new Map<CalibrationKey, number>();
      for (const a of adds) want.set(a.placement.key, (want.get(a.placement.key) ?? 0) + 1);
      expect(new Map(h.perKey)).toEqual(want);
      // Every instance is at a placement of an add of its key: position in world units (a roof item's y is the deck's).
      const m = new Matrix4();
      const pos = new Vector3();
      const r4 = (v: number): string => String(Math.round(v * 1e2) / 1e2 + 0);
      const places = new Set(adds.map((a) => `${a.placement.key}|${r4(a.placement.x_m * WORLD_PER_METRE)}|${r4(a.placement.y_m * WORLD_PER_METRE)}|${r4(a.placement.z_m * WORLD_PER_METRE)}`));
      let seen = 0;
      for (const c of h.group.children) {
        const im = c as InstancedMesh;
        const key = [...want.keys()].find((k) => c.name === `dress:${k.slice(k.indexOf(":") + 1)}`)!;
        for (let i = 0; i < im.count; i++) {
          im.getMatrixAt(i, m);
          pos.setFromMatrixPosition(m);
          const got = `${key}|${r4(pos.x)}|${r4(pos.y)}|${r4(pos.z)}`;
          if (!places.has(got)) throw new Error(got);
          seen++;
        }
      }
      expect(seen).toBe(adds.length);
      // The roof items stand on a deck above the ground; the turn is the add's.
      for (const a of adds.filter((x) => x.kind === "roof")) expect(a.placement.y_m).toBeGreaterThan(1);
      d.dispose();
    }
  }, 120000);

  it("the pieces E2 removes are not drawn: the park props of a farm, the place props of a stall, the stage 9 pieces of a barricade", () => {
    const d = draw("holdout");
    expect(d.propDraws.length).toBeLessThan(clean().layers.ground!.props!.length);
    expect(d.trafficDraws.length).toBeLessThan(clean().layers.traffic!.pieces.length);
    // The resolved plan is what is drawn: its lists are the drawn lists.
    const r = at("holdout");
    expect(d.propDraws.length).toBe(r.plan!.layers.ground!.props!.length);
    expect(d.trafficDraws.length).toBe(r.plan!.layers.traffic!.pieces.length);
    d.dispose();
  }, 120000);

  it("an add whose key is not in E2's kit stops the draw, the cell named", () => {
    const [first] = at("holdout").holdoutAdds;
    const bad = { ...first!, placement: { ...first!.placement, key: "sci-fi-frontier-pack:SM_Nothing" as CalibrationKey } };
    expect(() => planHoldoutDraws([bad])).toThrow(PlanStopError);
    try {
      planHoldoutDraws([bad]);
    } catch (e) {
      expect((e as PlanStopError).cells).toEqual([first!.cell]);
    }
  }, 120000);
});

describe("E2g criterion 3: clean and tech are unchanged", () => {
  it("at clean there is no hold-out group, and the children are the same with or without the argument", () => {
    const plain = plan3dGroups(clean(), roots(), new Map());
    const r = at("holdout");
    const withClean = plan3dGroups(clean(), roots(), new Map(), undefined, undefined, { era: "clean", adds: [], holdoutAdds: r.holdoutAdds });
    expect(plain.holdout).toBeNull();
    expect(withClean.holdout).toBeNull();
    expect(withClean.holdoutDraws).toEqual([]);
    expect(withClean.group.children.map((c) => c.name)).toEqual(plain.group.children.map((c) => c.name));
    plain.dispose();
    withClean.dispose();
  }, 120000);

  it("at tech the children are the same with and without the hold-out argument: no hold-out group, D1g's tech group as it is", () => {
    const r = at("tech");
    const rs = roots();
    const without = plan3dGroups(r.plan!, rs, new Map(), undefined, undefined, { era: "tech", adds: r.techAdds });
    const withIt = plan3dGroups(r.plan!, rs, new Map(), undefined, undefined, { era: "tech", adds: r.techAdds, holdoutAdds: at("holdout").holdoutAdds });
    expect(withIt.holdout).toBeNull();
    expect(withIt.group.children.map((c) => c.name)).toEqual(without.group.children.map((c) => c.name));
    expect(withIt.group.children.some((c) => c.name === "plan:tech")).toBe(true);
    expect(withIt.group.children.some((c) => c.name === "plan:holdout")).toBe(false);
    expect(withIt.tech!.calls).toBe(without.tech!.calls);
    without.dispose();
    withIt.dispose();
  }, 120000);

  it("at holdout and ruin the tech group is drawn beside the hold-out group", () => {
    for (const era of ["holdout", "ruin"] as const) {
      const d = draw(era);
      const names = d.group.children.map((c) => c.name);
      expect(names).toContain("plan:tech");
      expect(names).toContain("plan:holdout");
      d.dispose();
    }
  }, 120000);
});

describe("E2g criterion 4: dark (X-5)", () => {
  it("no material of the drawn hold-out meshes is emissive or lit, though the loaded pieces' were", () => {
    const rs = roots();
    const d = draw("holdout", rs);
    let meshes = 0;
    d.holdout!.group.traverse((o) => {
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
    for (const k of Object.keys(KIT)) expect(((rs.get(k as CalibrationKey)!.children[0] as Mesh).material as MeshStandardMaterial).emissive.getHex()).toBe(0xffffff);
    d.dispose();
  }, 120000);
});

describe("E2g criterion 5: R12 reads the hold-out adds, era-scoped (X-9)", () => {
  const neverKey = "sci-fi-frontier-pack:SK_Never_01" as CalibrationKey;
  const base = (): CityEraPiece<CityHoldoutPieceKind> => {
    const [first] = at("holdout").holdoutAdds;
    return { ...first!, kind: "clutter", placement: { ...first!.placement, key: neverKey } };
  };

  it("no key in E2's kit starts with a never-used stem, so the allowance table is empty", () => {
    for (const k of Object.keys(KIT)) expect(isNeverUsed(k as CalibrationKey), k).toBe(false);
    expect(PLAN_AUDIT_HOLDOUT_ALLOWED).toEqual([]);
    expect(PLAN_AUDIT_HOLDOUT_ERAS).toEqual(["holdout", "ruin"]);
    expect(isNeverUsed(neverKey)).toBe(true);
  });

  it("today's R12 is unchanged: the clean audit is empty, and so is the audit at each era", () => {
    expect(planAudit(clean())).toEqual([]);
    for (const era of ["tech", "holdout", "ruin"] as const) {
      const r = at(era);
      expect(planAudit(clean(), { era, adds: r.techAdds, holdoutAdds: r.holdoutAdds })).toEqual([]);
    }
  }, 120000);

  it("a never-used key among the hold-out adds is a finding unless the table allows it, for that kind, at holdout or ruin", () => {
    const add = base();
    const found = [{ layer: "holdout", list: "adds", cell: add.cell, key: add.placement.key }];
    expect(planAudit(clean(), { era: "holdout", adds: [], holdoutAdds: [add] })).toEqual(found);
    const table = [{ key: add.placement.key, kind: "clutter" as const }];
    for (const era of PLAN_AUDIT_HOLDOUT_ERAS) expect(planAudit(clean(), { era, adds: [], holdoutAdds: [add] }, undefined, table), era).toEqual([]);
    expect(planAudit(clean(), { era: "holdout", adds: [], holdoutAdds: [{ ...add, kind: "camp" }] }, undefined, table)).toEqual(found);
    expect(planAudit(clean(), { era: "clean", adds: [], holdoutAdds: [add] }, undefined, table)).toEqual(found);
    expect(() => plan3dGroups(clean(), roots(), new Map(), undefined, undefined, { era: "holdout", adds: [], holdoutAdds: [add] })).toThrow(PlanStopError);
  });
});

describe("E2g criterion 6: the hold-out group is its own draw-call cap", () => {
  it("one call per key here (a one-mesh root), under the cap; no other cap rises", () => {
    const adds = at("holdout").holdoutAdds;
    const d = draw("holdout");
    expect(d.holdout!.calls).toBe(new Set(adds.map((a) => a.placement.key)).size);
    expect(d.holdout!.calls).toBeLessThanOrEqual(HOLDOUT_DRAW_CALLS_MAX);
    expect(HOLDOUT_DRAW_CALLS_MAX).toBeGreaterThanOrEqual(Object.keys(KIT).length);
    expect(TECH_DRAW_CALLS_MAX).toBe(100);
    d.dispose();
  }, 120000);

  it("draw calls per era on 6 x 6 seed 1 (synthetic one-mesh roots; the page's report line gives the real figure)", () => {
    const rows: string[] = [];
    for (const era of ["tech", "holdout", "ruin"] as const) {
      const d = draw(era);
      rows.push(`${era}: tiles ${d.tiles.calls}, interior ${d.interior.calls}, dress ${d.dress.calls}, furniture ${d.furniture.calls}, tech ${d.tech?.calls ?? 0}, holdout ${d.holdout?.calls ?? 0}`);
      d.dispose();
    }
    console.info(rows.join("\n"));
    expect(rows).toHaveLength(3);
  }, 120000);
});
