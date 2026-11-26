import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createCityRig, PUZZLE_ROOM_M, puzzleFitPad, puzzleLabelRoom } from "./tilecity3d";
import { CITY_PLAY_ZOOM_OUT, playRigOptions } from "./cityview";
import { WORLD_PER_METRE as S } from "./models";

// Fixture frame: two blocks' worth of rectangle, no city built.
const FRAME = { minX: -30, maxX: 90, minY: -20, maxY: 60 };
const LIMIT = { limit: { zoomOut: 1.5 } };
// The puzzle's points (081 J): a small cluster in one corner of the frame, and a cluster as wide as the frame, at heights 0 and 2.
const CORNER = [[84, 54], [88, 54], [84, 58], [88, 58]].flatMap(([x, z]) => [0, 2].map((y) => ({ x: x!, y, z: z! })));
const WIDE = [[-30, -20], [90, -20], [-30, 60], [90, 60], [30, 20]].flatMap(([x, z]) => [0, 2].map((y) => ({ x: x!, y, z: z! })));

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
      // Every corner (ground and roofline) must land inside the free area, clear of the panels; a rig that ignored the insets would open at D0 and put the corners under them.
      const ins = { top: h * 0.05, bottom: h * 0.1, left: w * 0.05, right: w * 0.05 };
      const roomy = createCityRig(FRAME, w, h, ins, LIMIT);
      expect(roomy.getScale()).toBeLessThan(d0Scale);
      expect(roomy.getScale()).toBeGreaterThanOrEqual(d0Scale / 1.5 - 1e-6);
      for (const x of [FRAME.minX, FRAME.maxX]) for (const z of [FRAME.minY, FRAME.maxY]) for (const y of [0, 6]) {
        p.set(x, y, z).project(roomy.camera);
        const px = ((p.x + 1) / 2) * w;
        const py = ((1 - p.y) / 2) * h;
        expect(px).toBeGreaterThanOrEqual(ins.left - 1e-6);
        expect(px).toBeLessThanOrEqual(w - ins.right + 1e-6);
        expect(py).toBeGreaterThanOrEqual(ins.top - 1e-6);
        expect(py).toBeLessThanOrEqual(h - ins.bottom + 1e-6);
      }
    }
  });

  it("with the puzzle's points it fits them in the free area, centred, nearer than the district's opening (081 J)", () => {
    const p = new Vector3();
    for (const [w, h] of [[1287, 1178], [1280, 720], [800, 570], [390, 844]] as const) {
      for (const ins of [{}, { top: 60, bottom: h * 0.3 }]) {
        const rig = createCityRig(FRAME, w, h, ins, { ...LIMIT, open: CORNER });
        const bare = createCityRig(FRAME, w, h, ins, LIMIT);
        const far = createCityRig(FRAME, w, h, ins, { ...LIMIT, open: CORNER });
        for (let i = 0; i < 40; i++) far.zoomStep(-1);
        const held = Math.abs(far.getScale() - rig.getScale()) < 1e-9;
        const free = { l: 0, t: ins.top ?? 0, w, h: h - (ins.top ?? 0) - (ins.bottom ?? 0) };
        const padX = puzzleFitPad(free.w);
        const label = puzzleLabelRoom(free.w);
        const padY = puzzleFitPad(free.h);
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const q of CORNER) {
          p.set(q.x, q.y, q.z).project(rig.camera);
          const px = ((p.x + 1) / 2) * w;
          const py = ((1 - p.y) / 2) * h;
          // Held at Dmax the opening is nearer than the fit, as E5's is: the points are then centred but may stand under a panel.
          if (!held) {
            expect(px).toBeGreaterThanOrEqual(free.l + padX - 1e-3);
            expect(px).toBeLessThanOrEqual(free.l + free.w - padX - label + 1e-3);
            expect(py).toBeGreaterThanOrEqual(free.t + padY - 1e-3);
            expect(py).toBeLessThanOrEqual(free.t + free.h - padY + 1e-3);
          }
          x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        }
        expect(Math.abs((x0 + x1) / 2 - (free.l + (free.w - label) / 2))).toBeLessThan(0.02 * free.w);
        expect(Math.abs((y0 + y1) / 2 - (free.t + free.h / 2))).toBeLessThan(0.02 * free.h);
        if (held) continue;
        expect(x1 - x0 >= free.w - 2 * padX - label - 0.02 * free.w || y1 - y0 >= free.h - 2 * padY - 0.02 * free.h).toBe(true);
        expect(rig.getScale()).toBeGreaterThan(bare.getScale());
      }
    }
  });

  it("with the puzzle's points the limits, the pan clamp, the recentre and the resize follow them (081 J)", () => {
    const ROOM = PUZZLE_ROOM_M * S;
    for (const pts of [CORNER, WIDE]) {
      const rig = createCityRig(FRAME, 1280, 720, undefined, { ...LIMIT, open: pts });
      const open = rig.getScale();
      const box = { minX: Math.min(...pts.map((q) => q.x)) - ROOM, maxX: Math.max(...pts.map((q) => q.x)) + ROOM, minZ: Math.min(...pts.map((q) => q.z)) - ROOM, maxZ: Math.max(...pts.map((q) => q.z)) + ROOM };
      // Dmax: 1.5 x D0 for the wide cluster; for the small one the room's: the grown box's ground corners then just fill the canvas less the margin.
      const corners = [box.minX, box.maxX].flatMap((x) => [box.minZ, box.maxZ].map((z) => ({ x, y: 0, z })));
      for (let i = 0; i < 40; i++) rig.zoomStep(-1);
      const p = new Vector3();
      let slack = Infinity;
      for (const c of corners) {
        p.set(c.x, 0, c.z).project(rig.camera);
        const px = ((p.x + 1) / 2) * 1280;
        const py = ((1 - p.y) / 2) * 720;
        slack = Math.min(slack, px, 1280 - px - puzzleLabelRoom(1280), py, 720 - py);
      }
      expect(slack).toBeGreaterThanOrEqual(-1e-3);
      if (pts === CORNER) expect(Math.abs(slack - puzzleFitPad(720))).toBeLessThan(8);
      else expect(Math.abs(rig.getScale() - open / 1.5)).toBeLessThan(1e-6);
      for (let i = 0; i < 40; i++) rig.zoomStep(1);
      expect(Math.abs(rig.getScale() - open / 0.06)).toBeLessThan(1e-6 * open / 0.06);
      rig.setPan(1e6, 1e6);
      expect(rig.camera.position.x).toBeCloseTo(box.minX, 6);
      rig.setPan(-1e6, -1e6);
      expect(rig.camera.position.x).toBeCloseTo(box.maxX, 6);
      rig.centreOn(1e5, 1e5);
      expect(rig.camera.position.x).toBeCloseTo(box.maxX, 6);
      rig.centreOn(-1e5, -1e5);
      expect(rig.camera.position.x).toBeCloseTo(box.minX, 6);
      rig.resetView();
      expect(Math.abs(rig.getScale() - open)).toBeLessThan(1e-6);
      expect(Math.abs(rig.getPan().x) + Math.abs(rig.getPan().y)).toBeLessThan(1e-6);
      // A resize is the fit at the new size, as a fresh rig at that size gives it.
      const ins = { top: 60, bottom: 200 };
      rig.setPan(500, 300);
      rig.resize(800, 570, ins);
      const fresh = createCityRig(FRAME, 800, 570, ins, { ...LIMIT, open: pts });
      expect(Math.abs(rig.getScale() - fresh.getScale())).toBeLessThan(1e-6);
      expect(rig.camera.position.x).toBeCloseTo(fresh.camera.position.x, 6);
      expect(rig.camera.position.z).toBeCloseTo(fresh.camera.position.z, 6);
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
