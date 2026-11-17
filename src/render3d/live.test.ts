// Scene-level tests: build the scene, apply a state, run bundle.update (the call the renderer's draw makes), and read what the
// sprites, levers and lights now carry. These catch a scene that does not follow the state, which the pure layers cannot.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PointLight, SpriteMaterial, Vector3, type Mesh, type MeshStandardMaterial, type Object3D, type Sprite } from "three";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid } from "../grid";
import { FLARE_SECONDS, planRelight } from "../render/relight";
import { FOV_DEG, createCameraRig } from "./camera";
import { BREAK_GAP, HANG_SEGMENTS, wireLayout } from "./layout";
import { createPicker } from "./pick";
import { lineFraction } from "./relight3d";
import { DEAD_WIRE, LIVE_WIRE, REPAIRED_WIRE, buildScene } from "./scene";
import { stubTextSurface } from "./text";

const load = (id: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(`puzzles/${id}.json`, "utf8")));
const shrine = load("09-shrine-circuit");

function rig(puzzle: Puzzle = shrine) {
  const grid = createGrid(puzzle, new EventBus());
  const b = buildScene(puzzle, { text: stubTextSurface });
  b.setViewport(1280, 720, FOV_DEG);
  b.update(grid.state(), null, 0);
  const caption = (id: string): Sprite => b.captions.find((s) => s.userData["caption"] === id && !s.userData["place"])!;
  const mapOf = (s: Sprite) => (s.material as SpriteMaterial).map;
  return { grid, b, caption, mapOf, tick: () => b.update(grid.state(), null, 0.5) };
}
const leverTipY = (b: ReturnType<typeof rig>["b"], id: string): number => {
  b.scene.updateMatrixWorld(true);
  const lever = b.parts.get(id)!.lever!;
  return lever.localToWorld(new Vector3(0, lever.userData["length"] as number, 0)).y;
};
const lights = (b: ReturnType<typeof rig>["b"]): number[] => {
  const out: number[] = [];
  b.scene.traverse((o) => {
    if (o instanceof PointLight) out.push(o.intensity);
  });
  return out;
};

describe("the scene follows the state", () => {
  it("breaker: the caption sprite reads OFF (dim) and gets a new texture, and the lever drops, after br_street is thrown", () => {
    const r = rig();
    const cap = r.caption("br_street");
    expect(cap.userData["text"]).toBe("ON");
    const mapBefore = r.mapOf(cap);
    const tipBefore = leverTipY(r.b, "br_street");
    r.grid.throwBreaker("br_street");
    r.tick();
    expect(cap.userData["text"]).toBe("OFF");
    expect(cap.userData["tone"]).toBe("dim");
    // OFF is wider than ON: a GPU texture cannot change size, so the sprite must hold a new texture.
    expect(r.mapOf(cap)).not.toBe(mapBefore);
    expect(leverTipY(r.b, "br_street")).toBeLessThan(tipBefore - 0.5);
    expect(r.caption("br_main").userData["text"]).toBe("ON");
    r.grid.throwBreaker("br_street");
    r.tick();
    expect(cap.userData["text"]).toBe("ON");
    expect(leverTipY(r.b, "br_street")).toBeCloseTo(tipBefore, 6);
  });

  it("a caption that changes size always gets a fresh texture; one that does not keeps its own", () => {
    const r = rig();
    const feed = r.caption("feed");
    const before = r.mapOf(feed);
    r.tick();
    expect(r.mapOf(feed)).toBe(before);
    const w0 = feed.userData["cssW"];
    r.grid.throwSwitch("sw_1");
    r.grid.repairAt("l_b");
    r.tick();
    expect(feed.userData["text"]).toBe("Lv4 Powersource\n! using 6 of 4 !");
    expect(feed.userData["tone"]).toBe("alarm");
    expect(feed.userData["cssW"]).not.toBe(w0);
    expect(r.mapOf(feed)).not.toBe(before);
    r.grid.throwBreaker("br_street");
    r.tick();
    expect(feed.userData["text"]).toBe("Lv4 Powersource\nusing 3 of 4");
    expect(feed.userData["tone"]).toBe("text");
  });

  it("switch: the lever and chevron turn to the other line after sw_1", () => {
    const r = rig();
    const yaw = () => r.b.parts.get("sw_1")!.lever!.parent!.rotation.y;
    const chev = () => r.b.parts.get("sw_1")!.chevron!.position.clone();
    const y0 = yaw();
    const c0 = chev();
    r.grid.throwSwitch("sw_1");
    r.tick();
    expect(yaw()).not.toBeCloseTo(y0, 3);
    expect(chev().distanceTo(c0)).toBeGreaterThan(0.1);
    r.grid.throwSwitch("sw_1");
    r.tick();
    expect(yaw()).toBeCloseTo(y0, 6);
  });

  it("lamps: lit ones carry light, the rest none, through start, brownout and win", () => {
    const r = rig();
    // Lamp order: street_1..3, flood, shrine.
    const on = (): boolean[] => lights(r.b).map((v) => v > 0);
    expect(on()).toEqual([true, true, true, false, false]);
    r.grid.throwSwitch("sw_1");
    r.grid.repairAt("l_b");
    r.tick();
    expect(on()).toEqual([true, true, true, true, true]);
    r.grid.throwBreaker("br_street");
    r.tick();
    expect(on()).toEqual([false, false, false, true, true]);
  });

  it("fuse: at the limit versus blown, in caption tone and bar", () => {
    const r = rig();
    const bar = r.b.parts.get("fb_A")!.fuseBar!;
    expect(r.caption("fb_A").userData["tone"]).toBe("text");
    expect(bar.userData["blown"]).toBe(false);
    expect(bar.userData["step"]).toBe(2);
    const p7 = load("07-past-the-fuse");
    const r7 = rig(p7);
    expect(r7.caption("fb_A").userData["tone"]).toBe("alarm");
    expect(r7.b.parts.get("fb_A")!.fuseBar!.userData["blown"]).toBe(true);
    expect(r7.b.parts.get("fb_A")!.fuseBar!.userData["fill"]).toBe(0);
    // Repair the fuse: the box is no longer blown and its bar fills.
    expect(r7.grid.repairAt("fb_A").ok).toBe(true);
    r7.tick();
    expect(r7.caption("fb_A").userData["tone"]).toBe("text");
    expect(r7.b.parts.get("fb_A")!.fuseBar!.userData["blown"]).toBe(false);
    expect(r7.b.parts.get("fb_A")!.fuseBar!.userData["fill"] as number).toBeGreaterThan(0);
  });
});

// ---- Section C2: the damaged cable shows a visible break ----
const distToPolyline = (p: Vector3, pts: readonly { x: number; y: number; z: number }[]): number => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = new Vector3(pts[i - 1]!.x, pts[i - 1]!.y, pts[i - 1]!.z);
    const b = new Vector3(pts[i]!.x, pts[i]!.y, pts[i]!.z);
    const ab = b.clone().sub(a);
    const t = Math.min(Math.max(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0), 1);
    best = Math.min(best, a.add(ab.multiplyScalar(t)).distanceTo(p));
  }
  return best;
};

describe("the damaged cable (C2), through bundle.update", () => {
  const W = 1280;
  const H = 720;
  const run = wireLayout(shrine).find((r) => r.id === "l_b")!;
  const brk = run.brk!;

  it("start: the whole tube shows, looks like any dead wire, and the break's targets are off", () => {
    const r = rig();
    const lb = r.b.wires.get("l_b")!;
    const dead = r.b.wires.get("l_a2")!;
    expect(lb.whole.visible).toBe(true);
    expect(lb.halves!.every((h) => !h.visible)).toBe(true);
    expect(lb.spark.visible).toBe(false);
    expect(lb.wholeMat.color.getHex()).toBe(dead.wholeMat.color.getHex());
    expect(lb.wholeMat.emissive.getHex()).toBe(dead.wholeMat.emissive.getHex());
    expect(lb.wholeMat.emissiveIntensity).toBe(dead.wholeMat.emissiveIntensity);
    expect(lb.breakTargets).toHaveLength(3);
    for (const t of lb.breakTargets) expect(t.userData["pickOff"]).toBe(true);
  });

  it("after sw_1: two halves, sw_1's side live and the far side dead, a spark at tip 0, the bead on half 0, and a click on either end or the gap returns l_b", () => {
    const r = rig();
    const rigC = createCameraRig(shrine, W, H, { top: 120, bottom: 90 });
    const picker = createPicker(r.b.scene, rigC.camera, rigC.size);
    r.grid.throwSwitch("sw_1");
    r.tick();
    const lb = r.b.wires.get("l_b")!;
    expect(lb.whole.visible).toBe(false);
    expect(lb.halves!.every((h) => h.visible)).toBe(true);
    expect(lb.shadows.map((s) => s.visible)).toEqual([false, true, true]);
    const [h0, h1] = lb.halfMats!;
    expect(h0.color.getHex()).toBe(LIVE_WIRE);
    expect(h0.emissiveIntensity).toBeGreaterThan(0);
    expect(h1.color.getHex()).toBe(DEAD_WIRE);
    expect(h1.emissiveIntensity).toBe(0);
    expect(lb.spark.visible).toBe(true);
    const tip0 = brk.ends[0][HANG_SEGMENTS]!;
    expect(lb.spark.position.distanceTo(new Vector3(tip0.x, tip0.y, tip0.z))).toBeLessThan(0.05);
    for (const t of [0, 0.3, 0.6, 0.9]) {
      r.b.update(r.grid.state(), null, t);
      expect(lb.bead.visible).toBe(true);
      expect(distToPolyline(lb.bead.position, brk.halves[0]), `t=${t}`).toBeLessThan(1e-6);
    }
    for (const t of lb.breakTargets) expect(t.userData["pickOff"]).toBe(false);
    const px = (p: Vector3): { x: number; y: number } => {
      const v = p.clone().project(rigC.camera);
      return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
    };
    for (const end of brk.ends) {
      const a = end[4]!;
      const b = end[5]!;
      const s = px(new Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2));
      expect(picker.hitTest(s.x, s.y)).toBe("l_b");
    }
    const g = px(new Vector3(brk.gap.x, brk.gap.y, brk.gap.z));
    expect(picker.hitTest(g.x, g.y)).toBe("l_b");
    expect(BREAK_GAP).toBeGreaterThan(0);
  });

  it("after repair: one whole live wire again, the targets off, and a click at its middle returns l_b", () => {
    const r = rig();
    const rigC = createCameraRig(shrine, W, H, { top: 120, bottom: 90 });
    const picker = createPicker(r.b.scene, rigC.camera, rigC.size);
    r.grid.throwSwitch("sw_1");
    r.tick();
    r.grid.repairAt("l_b");
    r.tick();
    const lb = r.b.wires.get("l_b")!;
    expect(lb.whole.visible).toBe(true);
    expect(lb.wholeMat.color.getHex()).toBe(LIVE_WIRE);
    expect(lb.wholeMat.emissiveIntensity).toBeGreaterThan(0);
    expect(lb.halves!.every((h) => !h.visible)).toBe(true);
    expect(lb.spark.visible).toBe(false);
    for (const t of lb.breakTargets) expect(t.userData["pickOff"]).toBe(true);
    const v = new Vector3(run.mid.x, run.mid.y, run.mid.z).project(rigC.camera);
    expect(picker.hitTest(((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H)).toBe("l_b");
  });

  it("repaired and not live: whole, in the new-cable colour with no glow, while another dead wire stays dull", () => {
    const r = rig();
    r.grid.throwSwitch("sw_1");
    r.grid.repairAt("l_b");
    r.grid.throwSwitch("sw_1");
    r.tick();
    const lb = r.b.wires.get("l_b")!;
    expect(lb.whole.visible).toBe(true);
    expect(lb.wholeMat.color.getHex()).toBe(REPAIRED_WIRE);
    expect(lb.wholeMat.emissiveIntensity).toBe(0);
    expect(r.b.wires.get("l_a2")!.wholeMat.color.getHex()).toBe(DEAD_WIRE);
  });

  it("drift guard: 2D's repaired-cable colour is still the one used here", () => {
    expect(readFileSync("src/render/map-renderer.ts", "utf8")).toContain('const LINE_REPAIRED = "#5a6f92";');
    expect(REPAIRED_WIRE).toBe(0x5a6f92);
  });
});

// ---- Section C3: the Relight in 3D ----
function wonRig() {
  const r = rig();
  r.grid.throwSwitch("sw_1");
  r.grid.repairAt("l_b");
  r.grid.throwBreaker("br_street");
  return r;
}
function lampLight(b: ReturnType<typeof rig>["b"], id: string): PointLight {
  const at = shrine.nodes.find((n) => n.id === id)!.pos;
  let found: PointLight | null = null;
  b.scene.traverse((o: Object3D) => {
    if (o instanceof PointLight && o.parent && o.parent.position.x === at[0] && o.parent.position.z === at[1]) found = o;
  });
  return found!;
}
const LAMPS = ["street_1", "street_2", "street_3", "flood", "shrine"];

describe("the Relight (C3), through bundle.update", () => {
  const lampIdx = (id: string): number => shrine.nodes.findIndex((n) => n.id === id);

  it("relT = 0: every lamp dark, no flare, every overlay empty, the feed not yet live", () => {
    const r = wonRig();
    r.b.update(r.grid.state(), null, 0, 0);
    for (const v of lights(r.b)) expect(v).toBe(0);
    for (const id of LAMPS) expect(r.b.parts.get(id)!.flare!.visible).toBe(false);
    for (const w of r.b.wires.values()) expect(w.overlay.geometry.drawRange.count).toBe(0);
    expect((r.b.parts.get("feed")!.body!.material as MeshStandardMaterial).emissiveIntensity).toBe(0);
  });

  it("a little after the flood lamp's arrival: it is lit and flaring, the shrine is dark, and a warm front rides exactly the part-lit runs", () => {
    const r = wonRig();
    const state = r.grid.state();
    const plan = planRelight(shrine, state);
    const at = plan.nodeArrive[lampIdx("flood")]! + 0.1;
    r.b.update(state, null, 0, at);
    expect(lampLight(r.b, "flood").intensity).toBeGreaterThan(0);
    expect(lampLight(r.b, "shrine").intensity).toBe(0);
    const flare = r.b.parts.get("flood")!.flare!;
    expect(flare.visible).toBe(true);
    expect((flare.material as MeshStandardMaterial).opacity).toBeCloseTo(1 - 0.1 / FLARE_SECONDS, 6);
    expect(r.b.parts.get("shrine")!.flare!.visible).toBe(false);
    let fronts = 0;
    shrine.lines.forEach((l, i) => {
      const f = lineFraction(plan, i, at);
      const w = r.b.wires.get(l.id)!;
      expect(w.front.visible, l.id).toBe(f > 0 && f < 1);
      if (f > 0 && f < 1) fronts++;
      // The lit part of the overlay follows the fraction; a run not reached yet has none.
      const total = w.overlay.geometry.index!.count;
      expect(w.overlay.geometry.drawRange.count / total, l.id).toBeCloseTo(f, 1);
    });
    expect(fronts).toBeGreaterThan(0);
  });

  it("along the schedule the lit part only grows and lamps ignite in order (flood, then shrine)", () => {
    const r = wonRig();
    const state = r.grid.state();
    const plan = planRelight(shrine, state);
    let prev = 0;
    let floodOn = -1;
    let shrineOn = -1;
    for (let t = 0; t < plan.duration; t += 0.05) {
      r.b.update(state, null, t, t);
      const lit = [...r.b.wires.values()].reduce((n, w) => n + w.overlay.geometry.drawRange.count, 0);
      expect(lit).toBeGreaterThanOrEqual(prev);
      prev = lit;
      if (floodOn < 0 && lampLight(r.b, "flood").intensity > 0) floodOn = t;
      if (shrineOn < 0 && lampLight(r.b, "shrine").intensity > 0) shrineOn = t;
    }
    expect(floodOn).toBeGreaterThan(0.25);
    expect(shrineOn).toBeGreaterThan(floodOn);
    expect(Math.abs(shrineOn - plan.nodeArrive[lampIdx("shrine")]!)).toBeLessThan(0.06);
  });

  it("relT = duration: the Relight is over and the view is ordinary: the two lamps lit, no flare, every powered run full", () => {
    const r = wonRig();
    const state = r.grid.state();
    const plan = planRelight(shrine, state);
    r.b.update(state, null, 0, 0);
    r.b.update(state, null, 0, plan.duration);
    for (const id of LAMPS) {
      const lit = id === "flood" || id === "shrine";
      expect(lampLight(r.b, id).intensity > 0, id).toBe(lit);
      expect(r.b.parts.get(id)!.flare!.visible).toBe(false);
    }
    for (const l of shrine.lines) {
      const w = r.b.wires.get(l.id)!;
      const full = w.overlay.geometry.index!.count;
      expect(w.overlay.geometry.drawRange.count, l.id).toBe(state.powered.has(l.id) ? full : 0);
    }
  });

  it("a reset and a second win replan: the plan of an earlier Relight is not reused", () => {
    const r = rig();
    // A Relight planned from the start state would light only the street lamps.
    r.b.update(r.grid.state(), null, 0, 0);
    r.b.update(r.grid.state(), null, 0, undefined);
    r.grid.throwSwitch("sw_1");
    r.grid.repairAt("l_b");
    r.grid.throwBreaker("br_street");
    const plan = planRelight(shrine, r.grid.state());
    const at = plan.nodeArrive[lampIdx("flood")]! + 0.1;
    r.b.update(r.grid.state(), null, 0, 0);
    for (const v of lights(r.b)) expect(v).toBe(0);
    r.b.update(r.grid.state(), null, 0, undefined);
    r.grid.reset();
    r.grid.throwSwitch("sw_1");
    r.grid.repairAt("l_b");
    r.grid.throwBreaker("br_street");
    r.b.update(r.grid.state(), null, 0, 0);
    for (const v of lights(r.b)) expect(v).toBe(0);
    r.b.update(r.grid.state(), null, 0, at);
    expect(lampLight(r.b, "flood").intensity).toBeGreaterThan(0);
  });

  it("ordinary play: in the brownout the shrine's place is dark while its bulb is lit; after the win its place warms over a quarter-second", () => {
    const r = rig();
    const glow = (): number => r.b.places.get("shrine")!.emissiveIntensity / 0.5;
    r.grid.throwSwitch("sw_1");
    r.grid.repairAt("l_b");
    r.b.update(r.grid.state(), null, 1);
    expect(glow()).toBe(0);
    expect(lampLight(r.b, "shrine").intensity).toBeGreaterThan(0);
    r.grid.throwBreaker("br_street");
    r.b.update(r.grid.state(), null, 1);
    expect(glow()).toBe(0);
    expect(lampLight(r.b, "shrine").intensity).toBeCloseTo(5, 9);
    r.b.update(r.grid.state(), null, 1.1);
    expect(glow()).toBeCloseTo(0.4, 6);
    r.b.update(r.grid.state(), null, 1.3);
    expect(glow()).toBe(1);
  });
});

// ---- 041 C: three conductors to a line ----
describe("three conductors to a line (041 C), through bundle.update", () => {
  const W = 1280;
  const H = 720;
  const vertices = (m: Mesh): number => m.geometry.getAttribute("position").count;
  /** Which of a run's tubes each index in `[start, start + count)` of `m` belongs to. */
  const tubesIn = (m: Mesh, perTube: number, start: number, count: number): Set<number> => {
    const out = new Set<number>();
    const idx = m.geometry.index!;
    for (let i = start; i < start + count; i++) out.add(Math.floor(idx.getX(i) / perTube));
    return out;
  };

  it("holds every conductor of a run in one mesh and one material per part: three on a run with a pole, one on a short one", () => {
    const r = rig();
    const runs = wireLayout(shrine);
    let three = 0;
    let one = 0;
    for (const run of runs) {
      const p = r.b.wires.get(run.id)!;
      expect(p.conductors, run.id).toBe(run.conductors.length);
      const pts = run.conductors[0]!.length;
      // A tube round `pts` points has (2 * pts + 1) rings of 7 vertices (WIRE_RADIAL 6 + the seam).
      expect(vertices(p.whole), run.id).toBe(run.conductors.length * (2 * pts + 1) * 7);
      expect(vertices(p.overlay)).toBe(vertices(p.whole));
      // The conductors' shadows: one strip each, two vertices per point.
      expect(vertices(p.shadows[0]!), run.id).toBe(run.conductors.length * pts * 2);
      if (run.conductors.length === 3) three++;
      else one++;
    }
    expect(three).toBeGreaterThan(2);
    expect(one).toBeGreaterThan(2);
  });

  it("gives all three conductors the line's look: start, after sw_1, after repair:l_b and after br_street", () => {
    const r = rig();
    const check = (label: string): void => {
      r.b.update(r.grid.state(), null, 0.5);
      for (const run of wireLayout(shrine)) {
        const p = r.b.wires.get(run.id)!;
        // One whole mesh and one overlay mesh draw every conductor, so no conductor can differ from its line.
        expect(p.conductors, `${label} ${run.id}`).toBe(run.conductors.length);
        expect(p.whole.geometry.getAttribute("position").count / p.conductors, `${label} ${run.id} whole`).toBe((2 * run.conductors[0]!.length + 1) * 7);
        const powered = r.grid.state().powered.has(run.id);
        // Live differs from dead by more than colour (the GDD's accessibility rule): the live line also moves (a bead) and breathes.
        if (powered && !p.halves?.[0].visible && !p.halves?.[1].visible) {
          expect(p.bead.visible, `${label} ${run.id} bead`).toBe(true);
          expect(p.overlay.visible).toBe(true);
          expect(p.overlay.geometry.drawRange.count).toBe(p.overlay.geometry.index!.count);
        }
      }
    };
    check("start");
    expect(r.b.wires.get("l_feed")!.bead.visible).toBe(true);
    r.grid.throwSwitch("sw_1");
    check("after sw_1");
    r.grid.repairAt("l_b");
    check("after repair");
    r.grid.throwBreaker("br_street");
    check("after br_street");
    // A dead line is flat: no bead, no live overlay (the live ones moved above).
    const deadIds = shrine.lines.map((l) => l.id).filter((id) => !r.grid.state().powered.has(id));
    expect(deadIds.length).toBeGreaterThan(0);
    for (const id of deadIds) {
      expect(r.b.wires.get(id)!.bead.visible, id).toBe(false);
      expect(r.b.wires.get(id)!.overlay.visible, id).toBe(false);
    }
  });

  it("the break: after sw_1 all three conductors of l_b show their halves, three shadow strips each, and there is exactly one spark in the whole scene", () => {
    const r = rig();
    r.grid.throwSwitch("sw_1");
    r.tick();
    const run = wireLayout(shrine).find((x) => x.id === "l_b")!;
    const lb = r.b.wires.get("l_b")!;
    expect(lb.whole.visible).toBe(false);
    expect(lb.halves!.every((h) => h.visible)).toBe(true);
    run.brk!.cuts.forEach((cut) => expect(cut.halves[0].length).toBe(run.brk!.cuts[0]!.halves[0].length));
    lb.halves!.forEach((h, k) => {
      const per = (2 * run.brk!.cuts[0]!.halves[k]!.length + 1) * 7;
      expect(vertices(h), `half ${k}`).toBe(3 * per);
      // Each half's shadow shows only while it sparks, with one strip per conductor.
      expect(vertices(lb.shadows[1 + k]!), `half ${k} shadow`).toBe(3 * run.brk!.cuts[0]!.halves[k]!.length * 2);
      expect(lb.shadows[1 + k]!.visible).toBe(true);
    });
    expect(lb.shadows[0]!.visible).toBe(false);
    const sparks = [...r.b.wires.values()].filter((w) => w.spark.visible);
    expect(sparks).toEqual([lb]);
    // After the repair the halves, their shadows and the spark are gone.
    r.grid.repairAt("l_b");
    r.tick();
    expect(lb.halves!.some((h) => h.visible)).toBe(false);
    expect(lb.shadows.map((s) => s.visible)).toEqual([true, false, false]);
    expect([...r.b.wires.values()].some((w) => w.spark.visible)).toBe(false);
  });

  it("a click on a gap's outer conductor ends returns l_b: the gap box covers all three conductors", () => {
    const r = rig();
    const rigC = createCameraRig(shrine, W, H, { top: 120, bottom: 90 });
    const picker = createPicker(r.b.scene, rigC.camera, rigC.size);
    r.grid.throwSwitch("sw_1");
    r.tick();
    const run = wireLayout(shrine).find((x) => x.id === "l_b")!;
    const px = (p: { x: number; y: number; z: number }): { x: number; y: number } => {
      const v = new Vector3(p.x, p.y, p.z).project(rigC.camera);
      return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
    };
    for (const cut of run.brk!.cuts) {
      for (const tipOf of [cut.ends[0], cut.ends[1]]) {
        const a = tipOf[4]!;
        const b = tipOf[5]!;
        const s = px({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
        expect(picker.hitTest(s.x, s.y)).toBe("l_b");
      }
      const g = px(cut.gap);
      expect(picker.hitTest(g.x, g.y)).toBe("l_b");
    }
  });

  it("the Relight runs along all three conductors: a part-lit run's draw range reaches every tube, and grows in whole steps of every conductor", () => {
    const r = wonRig();
    const state = r.grid.state();
    const plan = planRelight(shrine, state);
    const at = plan.nodeArrive[shrine.nodes.findIndex((n) => n.id === "flood")]! + 0.1;
    r.b.update(state, null, 0, at);
    let checked = 0;
    shrine.lines.forEach((l, i) => {
      const f = lineFraction(plan, i, at);
      const w = r.b.wires.get(l.id)!;
      if (!(f > 0 && f < 1) || w.conductors < 3) return;
      const dr = w.overlay.geometry.drawRange;
      expect(dr.count % (6 * w.conductors), l.id).toBe(0);
      const perTube = vertices(w.overlay) / w.conductors;
      expect(tubesIn(w.overlay, perTube, dr.start, dr.count).size, `${l.id} lights every conductor`).toBe(w.conductors);
      checked++;
    });
    expect(checked).toBeGreaterThan(0);
  });
});
