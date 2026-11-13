// Scene-level tests: build the scene, apply a state, run bundle.update (the call the renderer's draw makes), and read what the
// sprites, levers and lights now carry. These catch a scene that does not follow the state, which the pure layers cannot.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PointLight, SpriteMaterial, Vector3, type Sprite } from "three";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid } from "../grid";
import { FOV_DEG } from "./camera";
import { buildScene } from "./scene";
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
