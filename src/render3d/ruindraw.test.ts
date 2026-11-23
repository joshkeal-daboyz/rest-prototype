import { describe, expect, it } from "vitest";
import { Box3, BoxGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Texture, Vector3, type Object3D } from "three";
import type { CalibrationKey, CityEra, CityEraPiece, CityEraRun, CityPlan, CityPlanRun, CityRuinPieceKind } from "../core";
import { resolvePlan, runCity, runCityEra, stableHash } from "../city/pipeline";
import { KIT, ruinCrownBounds } from "../city/ruin/kit";
import { KIT as HOLDOUT_KIT } from "../city/holdout/kit";
import { TECH_KIT } from "../city/tech/kit";
import { isNeverUsed } from "./citymetrics";
import { WORLD_PER_METRE } from "./models";
import { HOLDOUT_DRAW_CALLS_MAX, PLAN_AUDIT_RUIN_ALLOWED, PLAN_AUDIT_RUIN_ERAS, PlanStopError, RUIN_DRAW_CALLS_MAX, TECH_DRAW_CALLS_MAX, drawnYawDeg, planAtEra, planAudit, planRuinDraws, plan3dGroups } from "./plan3d";

// Ticket 073 F1g: the ruin pass's adds, drawn. One 6 x 6 seed 1 clean run and one era run per era, shared.
const OPTS = { blocksX: 6, blocksZ: 6, seed: 1 };
let cleanRun: CityPlanRun | null = null;
function clean(): CityPlan {
  cleanRun ??= runCity(OPTS, "traffic");
  if (!cleanRun.ok) throw new Error("clean run failed");
  return cleanRun.plan;
}
const eraRuns = new Map<CityEra, CityEraRun>();
function eraRun(era: "tech" | "holdout" | "ruin"): CityEraRun {
  let r = eraRuns.get(era);
  if (!r) {
    r = runCityEra(OPTS, era);
    eraRuns.set(era, r);
  }
  return r;
}

/** One loaded root per kit key (ruin, hold-out and tech): a box of the kit's crown size, base at y = 0, with a lit, mapped material, as a GLB carries. */
function roots(): Map<CalibrationKey, Object3D> {
  const out = new Map<CalibrationKey, Object3D>();
  const lit = (w: number, h: number, d: number): Group => {
    const mat = new MeshStandardMaterial({ color: 0x888888 });
    mat.emissive = new Color(0xffffff);
    mat.emissiveMap = new Texture();
    mat.emissiveIntensity = 2;
    const geo = new BoxGeometry(w, h, d);
    geo.translate(0, h / 2, 0);
    const g = new Group();
    g.add(new Mesh(geo, mat));
    return g;
  };
  for (const e of TECH_KIT) out.set(e.key, lit(e.w, e.h, e.d));
  for (const [k, e] of Object.entries(HOLDOUT_KIT)) out.set(k as CalibrationKey, lit(e.w, e.h, e.d));
  for (const k of Object.keys(KIT) as CalibrationKey[]) {
    const b = ruinCrownBounds(k)!;
    out.set(k, lit(b.x_m, b.h_m, b.z_m));
  }
  return out;
}

const at = (era: "tech" | "holdout" | "ruin") => {
  const r = planAtEra(clean(), era, eraRun(era));
  expect(r.text).toBeNull();
  return r;
};
const draw = (era: "tech" | "holdout" | "ruin", rs: Map<CalibrationKey, Object3D> = roots()) => {
  const r = at(era);
  return plan3dGroups(r.plan!, rs, new Map(), undefined, undefined, { era, adds: r.techAdds, holdoutAdds: r.holdoutAdds, ruinAdds: r.ruinAdds });
};
const nameOf = (k: CalibrationKey): string => `dress:${k.slice(k.indexOf(":") + 1)}`;
const isTree = (kind: CityRuinPieceKind): boolean => kind === "sapling" || kind === "park-tree";

describe("F1g criterion 1: the draw places every ruin add once, through resolvePlan", () => {
  it("the ruin adds are the resolver's own at ruin, and none at clean, tech or holdout", () => {
    const run = eraRun("ruin");
    if (!run.ok) throw new Error("era run failed");
    const adds = at("ruin").ruinAdds;
    expect(adds.length).toBeGreaterThan(0);
    expect(adds).toEqual(resolvePlan(run.plan, "ruin").adds.ruin);
    for (const era of ["tech", "holdout"] as const) expect(at(era).ruinAdds).toEqual([]);
    expect(planAtEra(clean(), "clean", null).ruinAdds).toEqual([]);
    const kinds = new Set(adds.map((a) => a.kind));
    for (const k of ["patch", "clump", "sapling", "park-tree", "vine", "tree-vine"] as CityRuinPieceKind[]) expect(kinds.has(k), k).toBe(true);
  }, 240000);

  it("every add is drawn once, at its placement, in one group plan:ruin, and a tree takes its drawn yaw", () => {
    const adds = at("ruin").ruinAdds;
    const d = draw("ruin");
    const g = d.ruin!;
    expect(g.group.name).toBe("plan:ruin");
    expect(d.group.children.filter((c) => c.name === "plan:ruin")).toHaveLength(1);
    expect(g.listed).toBe(adds.length);
    expect(g.placed).toBe(adds.length);
    expect(g.drawn).toBe(adds.length);
    expect(g.leftOut).toEqual([]);
    expect(d.ruinDraws.map((x) => x.id)).toEqual(adds.map((a) => a.id));
    const want = new Map<CalibrationKey, number>();
    for (const a of adds) want.set(a.placement.key, (want.get(a.placement.key) ?? 0) + 1);
    expect(new Map(g.perKey)).toEqual(want);
    const m = new Matrix4();
    const pos = new Vector3();
    const want3 = new Map<CalibrationKey, number[][]>();
    for (const a of adds) (want3.get(a.placement.key) ?? want3.set(a.placement.key, []).get(a.placement.key)!).push([a.placement.x_m * WORLD_PER_METRE, a.placement.y_m * WORLD_PER_METRE, a.placement.z_m * WORLD_PER_METRE]);
    let seen = 0;
    for (const c of g.group.children) {
      const im = c as InstancedMesh;
      const key = [...want.keys()].find((k) => c.name === nameOf(k))!;
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        pos.setFromMatrixPosition(m);
        if (!want3.get(key)!.some((w) => Math.abs(w[0]! - pos.x) < 0.01 && Math.abs(w[1]! - pos.y) < 0.01 && Math.abs(w[2]! - pos.z) < 0.01)) throw new Error(`${key} ${pos.x} ${pos.y} ${pos.z}`);
        seen++;
      }
    }
    expect(seen).toBe(adds.length);
    d.dispose();
  }, 240000);

  it("an add whose key is not in F1's kit stops the draw, the cell named", () => {
    const [first] = at("ruin").ruinAdds;
    const bad = { ...first!, placement: { ...first!.placement, key: "nature-pack:SM_Nothing" as CalibrationKey } };
    expect(() => planRuinDraws([bad])).toThrow(PlanStopError);
    try {
      planRuinDraws([bad]);
    } catch (e) {
      expect((e as PlanStopError).cells).toEqual([first!.cell]);
    }
  }, 240000);
});

describe("F1g criterion 2: a tree is drawn from its crown, never from size", () => {
  it("a drawn sapling and park tree are at scale 1, and their world bounds are ruinCrownBounds turned by the drawn yaw", () => {
    const adds = at("ruin").ruinAdds;
    const trees = adds.filter((a) => isTree(a.kind));
    expect(trees.some((a) => a.kind === "sapling")).toBe(true);
    expect(trees.some((a) => a.kind === "park-tree")).toBe(true);
    const d = draw("ruin");
    const byId = new Map(trees.map((a) => [a.id, a] as const));
    // One instance per tree, in `adds` order within its key: match them by key and order.
    const seenByKey = new Map<CalibrationKey, number>();
    const m = new Matrix4();
    const box = new Box3();
    const size = new Vector3();
    const geo = new Map<CalibrationKey, BoxGeometry>();
    let checked = 0;
    for (const c of d.ruin!.group.children) {
      const key = (Object.keys(KIT) as CalibrationKey[]).find((k) => nameOf(k) === c.name)!;
      const im = c as InstancedMesh;
      if (!trees.some((t) => t.placement.key === key)) continue;
      const mine = adds.filter((a) => a.placement.key === key);
      for (let i = 0; i < im.count; i++) {
        const a = mine[i]!;
        expect(byId.has(a.id)).toBe(true);
        im.getMatrixAt(i, m);
        const sc = new Vector3().setFromMatrixScale(m);
        expect(sc.x).toBeCloseTo(WORLD_PER_METRE, 6);
        expect(sc.y).toBeCloseTo(WORLD_PER_METRE, 6);
        expect(sc.z).toBeCloseTo(WORLD_PER_METRE, 6);
        const g = (geo.get(key) ?? (im.geometry as BoxGeometry));
        g.computeBoundingBox();
        box.copy(g.boundingBox!).applyMatrix4(m);
        // An axis-aligned box of the turned crown: its extent is the turned footprint's.
        box.getSize(size);
        const b = ruinCrownBounds(key)!;
        const th = (drawnYawDeg(a) * Math.PI) / 180;
        const wantX = Math.abs(Math.cos(th)) * b.x_m + Math.abs(Math.sin(th)) * b.z_m;
        const wantZ = Math.abs(Math.sin(th)) * b.x_m + Math.abs(Math.cos(th)) * b.z_m;
        expect(size.x / WORLD_PER_METRE).toBeCloseTo(wantX, 4);
        expect(size.z / WORLD_PER_METRE).toBeCloseTo(wantZ, 4);
        expect(size.y / WORLD_PER_METRE).toBeCloseTo(b.h_m, 4);
        // The trunk square in `size` is not what is drawn.
        if (a.size) expect(Math.max(size.x, size.z) / WORLD_PER_METRE).toBeGreaterThan(Math.max(a.size.x_m, a.size.z_m));
        seenByKey.set(key, (seenByKey.get(key) ?? 0) + 1);
        checked++;
      }
    }
    expect(checked).toBe(trees.length);
    d.dispose();
  }, 240000);

  it("drawing does not change any placement in the plan (the layer is deep-equal before and after)", () => {
    const run = eraRun("ruin");
    if (!run.ok) throw new Error("era run failed");
    const before = JSON.parse(JSON.stringify(run.plan.layers.ruin));
    const d = draw("ruin");
    d.dispose();
    expect(JSON.parse(JSON.stringify(run.plan.layers.ruin))).toEqual(before);
    for (const a of at("ruin").ruinAdds.filter((x) => isTree(x.kind))) expect(a.placement.yaw_deg).toBe(0);
  }, 240000);
});

describe("F1g criterion 3: the drawn yaw", () => {
  it("is stableHash(id) % 360 for a sapling and a park tree, the same on every draw, and not one yaw for all", () => {
    const adds = at("ruin").ruinAdds;
    const trees = adds.filter((a) => isTree(a.kind));
    const first = planRuinDraws(adds);
    const second = planRuinDraws(adds);
    expect(second.map((x) => x.yaw_deg)).toEqual(first.map((x) => x.yaw_deg));
    for (const d of first.filter((x) => isTree(x.kind))) expect(d.yaw_deg).toBe(stableHash(d.id) % 360);
    expect(new Set(trees.map((a) => drawnYawDeg(a))).size).toBeGreaterThan(1);
  }, 240000);

  it("every other kind is drawn at its plan yaw, tree-vines included", () => {
    const adds = at("ruin").ruinAdds;
    const draws = planRuinDraws(adds);
    adds.forEach((a, i) => {
      if (!isTree(a.kind)) expect(draws[i]!.yaw_deg).toBe(a.placement.yaw_deg);
      expect(draws[i]!.placement).toBe(a.placement);
    });
    expect(draws.some((x) => x.kind === "tree-vine")).toBe(true);
  }, 240000);

  it("a tree-vine stays inside any turn of its crown: every sapling and park-tree key has its narrower side over 0.45 x its wider (a failing key is listed)", () => {
    const failing: string[] = [];
    for (const k of Object.keys(KIT) as CalibrationKey[]) {
      if (!KIT[k]!.kinds.some(isTree)) continue;
      const b = ruinCrownBounds(k)!;
      const ratio = Math.min(b.x_m, b.z_m) / Math.max(b.x_m, b.z_m);
      if (ratio <= 0.45) failing.push(`${k} (${ratio.toFixed(2)})`);
    }
    expect(failing).toEqual([]);
  });
});

describe("F1g criterion 4: clean, tech and holdout are unchanged", () => {
  it("at clean there is no ruin group, and the children are the same with or without the argument", () => {
    const plain = plan3dGroups(clean(), roots(), new Map());
    const withClean = plan3dGroups(clean(), roots(), new Map(), undefined, undefined, { era: "clean", adds: [], ruinAdds: at("ruin").ruinAdds });
    expect(plain.ruin).toBeNull();
    expect(withClean.ruin).toBeNull();
    expect(withClean.ruinDraws).toEqual([]);
    expect(withClean.group.children.map((c) => c.name)).toEqual(plain.group.children.map((c) => c.name));
    plain.dispose();
    withClean.dispose();
  }, 240000);

  it("at tech and holdout the children are the same with and without the ruin argument: no ruin group", () => {
    const ruinAdds = at("ruin").ruinAdds;
    for (const era of ["tech", "holdout"] as const) {
      const r = at(era);
      const rs = roots();
      const base = { era, adds: r.techAdds, holdoutAdds: r.holdoutAdds };
      const without = plan3dGroups(r.plan!, rs, new Map(), undefined, undefined, base);
      const withIt = plan3dGroups(r.plan!, rs, new Map(), undefined, undefined, { ...base, ruinAdds });
      expect(withIt.ruin).toBeNull();
      expect(withIt.group.children.map((c) => c.name)).toEqual(without.group.children.map((c) => c.name));
      expect(withIt.group.children.some((c) => c.name === "plan:ruin")).toBe(false);
      expect(withIt.tech!.calls).toBe(without.tech!.calls);
      expect(withIt.holdout?.calls).toBe(without.holdout?.calls);
      without.dispose();
      withIt.dispose();
    }
  }, 240000);

  it("at ruin the tech and hold-out groups are drawn beneath the ruin group", () => {
    const d = draw("ruin");
    const names = d.group.children.map((c) => c.name);
    expect(names).toContain("plan:tech");
    expect(names).toContain("plan:holdout");
    expect(names).toContain("plan:ruin");
    d.dispose();
  }, 240000);
});

describe("F1g criterion 5: dark (X-5)", () => {
  it("no material of the drawn ruin meshes is emissive or lit, though the loaded pieces' were", () => {
    const rs = roots();
    const d = draw("ruin", rs);
    let meshes = 0;
    d.ruin!.group.traverse((o) => {
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
  }, 240000);
});

describe("F1g criterion 6: R12 reads the ruin adds, era-scoped (X-9)", () => {
  const neverKey = "nature-pack:SK_Never_01" as CalibrationKey;
  const base = (): CityEraPiece<CityRuinPieceKind> => {
    const [first] = at("ruin").ruinAdds;
    return { ...first!, kind: "clump", placement: { ...first!.placement, key: neverKey } };
  };

  it("no key in F1's kit starts with a never-used stem, so the allowance table is empty", () => {
    for (const k of Object.keys(KIT)) expect(isNeverUsed(k as CalibrationKey), k).toBe(false);
    expect(PLAN_AUDIT_RUIN_ALLOWED).toEqual([]);
    expect(PLAN_AUDIT_RUIN_ERAS).toEqual(["ruin"]);
    expect(isNeverUsed(neverKey)).toBe(true);
  });

  it("today's R12 is unchanged: the clean audit is empty, and so is the audit at each era", () => {
    expect(planAudit(clean())).toEqual([]);
    for (const era of ["tech", "holdout", "ruin"] as const) {
      const r = at(era);
      expect(planAudit(clean(), { era, adds: r.techAdds, holdoutAdds: r.holdoutAdds, ruinAdds: r.ruinAdds })).toEqual([]);
    }
  }, 240000);

  it("a never-used key among the ruin adds is a finding unless the table allows it, for that kind, at ruin only", () => {
    const add = base();
    const found = [{ layer: "ruin", list: "adds", cell: add.cell, key: add.placement.key }];
    expect(planAudit(clean(), { era: "ruin", adds: [], ruinAdds: [add] })).toEqual(found);
    const table = [{ key: add.placement.key, kind: "clump" as const }];
    expect(planAudit(clean(), { era: "ruin", adds: [], ruinAdds: [add] }, undefined, undefined, table)).toEqual([]);
    expect(planAudit(clean(), { era: "ruin", adds: [], ruinAdds: [{ ...add, kind: "patch" }] }, undefined, undefined, table)).toEqual(found);
    expect(planAudit(clean(), { era: "holdout", adds: [], ruinAdds: [add] }, undefined, undefined, table)).toEqual(found);
    expect(() => plan3dGroups(clean(), roots(), new Map(), undefined, undefined, { era: "ruin", adds: [], ruinAdds: [add] })).toThrow(PlanStopError);
  });
});

describe("F1g criterion 7: the ruin group is its own draw-call cap", () => {
  it("one call per key here (a one-mesh root), under the cap; no other cap rises", () => {
    const adds = at("ruin").ruinAdds;
    const d = draw("ruin");
    expect(d.ruin!.calls).toBe(new Set(adds.map((a) => a.placement.key)).size);
    expect(d.ruin!.calls).toBeLessThanOrEqual(RUIN_DRAW_CALLS_MAX);
    expect(RUIN_DRAW_CALLS_MAX).toBeGreaterThanOrEqual(Object.keys(KIT).length);
    expect(TECH_DRAW_CALLS_MAX).toBe(100);
    expect(HOLDOUT_DRAW_CALLS_MAX).toBe(150);
    d.dispose();
  }, 240000);
});
