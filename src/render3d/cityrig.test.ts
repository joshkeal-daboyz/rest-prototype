import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createCityRig } from "./tilecity3d";
import { CITY_PLAY_ZOOM_OUT, playRigOptions } from "./cityview";

// Fixture frame: two blocks' worth of rectangle, no city built.
const FRAME = { minX: -30, maxX: 90, minY: -20, maxY: 60 };
const LIMIT = { limit: { zoomOut: 1.5 } };

describe("the limited city rig (081 E5)", () => {
  it("stops zoom-out at Dmax, keeps the target in the frame, and resets to the opening", () => {
    const rig = createCityRig(FRAME, 1280, 720, undefined, LIMIT);
    const open = rig.getScale();
    for (let i = 0; i < 40; i++) rig.zoomStep(-1);
    expect(Math.abs(rig.getScale() - open / 1.5)).toBeLessThan(1e-6);
    rig.setPan(1e6, 1e6);
    expect(rig.camera.position.x).toBeCloseTo(FRAME.minX, 6);
    rig.setPan(-1e6, -1e6);
    expect(rig.camera.position.x).toBeCloseTo(FRAME.maxX, 6);
    rig.centreOn(1e5, 1e5);
    expect(rig.camera.position.x).toBeCloseTo(FRAME.maxX, 6);
    rig.centreOn(-1e5, -1e5);
    expect(rig.camera.position.x).toBeCloseTo(FRAME.minX, 6);
    rig.resetView();
    expect(Math.abs(rig.getScale() - open)).toBeLessThan(1e-6);
    expect(Math.abs(rig.getPan().x) + Math.abs(rig.getPan().y)).toBeLessThan(1e-6);
  });

  it("opens on the district at any window shape, never above the limit", () => {
    const p = new Vector3();
    for (const [w, h] of [[1280, 720], [800, 570], [600, 900], [390, 844]] as const) {
      const bare = createCityRig(FRAME, w, h, undefined, LIMIT);
      for (const x of [FRAME.minX, FRAME.maxX]) for (const z of [FRAME.minY, FRAME.maxY]) for (const y of [0, 6]) {
        p.set(x, y, z).project(bare.camera);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(1 + 1e-6);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(1 + 1e-6);
      }
      const d0Scale = bare.getScale();
      for (const ins of [{ top: h * 0.35, bottom: h * 0.35 }, { top: h, bottom: h }]) {
        const rig = createCityRig(FRAME, w, h, ins, LIMIT);
        expect(Number.isFinite(rig.getScale())).toBe(true);
        expect(rig.getScale()).toBeGreaterThanOrEqual(d0Scale / 1.5 - 1e-6);
      }
      // Panels that leave the district room: the opening is the fit in the free area, closer than Dmax.
      const roomy = createCityRig(FRAME, w, h, { bottom: h * 0.1 }, LIMIT);
      expect(roomy.getScale()).toBeLessThanOrEqual(d0Scale + 1e-6);
      expect(roomy.getScale()).toBeGreaterThanOrEqual(d0Scale / 1.5 - 1e-6);
    }
  });

  it("playRigOptions limits by default; only cam=free in dev lifts it", () => {
    const limited = { limit: { zoomOut: CITY_PLAY_ZOOM_OUT } };
    expect(playRigOptions("", true)).toEqual(limited);
    expect(playRigOptions("?cam=street", true)).toEqual(limited);
    expect(playRigOptions("?cam=free", false)).toEqual(limited);
    expect(playRigOptions("?cam=free", true)).toEqual({});
  });
});
