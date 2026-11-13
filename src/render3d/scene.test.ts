import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PointLight, Vector3 } from "three";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid } from "../grid";
import { createCameraRig } from "./camera";
import { buildScene } from "./scene";

const puzzle: Puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));

function lampIntensities(scene: ReturnType<typeof buildScene>["scene"]): number[] {
  const out: number[] = [];
  scene.traverse((o) => {
    if (o instanceof PointLight) out.push(o.intensity);
  });
  return out;
}

describe("scene", () => {
  it("lights only the lit lamps, and every lit lamp flickers in a brownout", () => {
    const g = createGrid(puzzle, new EventBus());
    const b = buildScene(puzzle);
    b.update(g.state(), null, 1);
    const start = lampIntensities(b.scene);
    expect(start).toHaveLength(5);
    expect(start.filter((v) => v > 0)).toHaveLength(3);
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    const seen = new Set<string>();
    for (let t = 0; t < 4; t += 0.1) {
      b.update(g.state(), null, t);
      const v = lampIntensities(b.scene);
      expect(v.every((x) => x > 0)).toBe(true);
      seen.add(v.join(","));
    }
    expect(seen.size).toBeGreaterThan(3);
    b.dispose();
  });
});

describe("camera", () => {
  it("opens with the whole footprint inside the free area between the insets", () => {
    const rig = createCameraRig(puzzle, 1280, 720, { top: 120, bottom: 90 });
    for (const [x, z] of [[-2, -6], [16, -6], [-2, 5], [16, 5]] as const) {
      const v = new Vector3(x, 0, z).project(rig.camera);
      const px = ((v.x + 1) / 2) * 1280;
      const py = ((1 - v.y) / 2) * 720;
      expect(px).toBeGreaterThan(0);
      expect(px).toBeLessThan(1280);
      expect(py).toBeGreaterThanOrEqual(120);
      expect(py).toBeLessThanOrEqual(720 - 90);
    }
  });

  it("pans, zooms and resets without throwing, and reset restores the opening scale", () => {
    const rig = createCameraRig(puzzle, 1280, 720);
    const open = rig.getScale();
    rig.zoomStep(1);
    expect(rig.getScale()).toBeGreaterThan(open);
    rig.setPan(80, -40);
    rig.centreOn(10, 0);
    rig.zoomStep(-1);
    rig.zoomStep(-1);
    expect(rig.getScale()).toBeCloseTo(open, 6);
    rig.resetView();
    expect(rig.getPan()).toEqual({ x: -0, y: -0 });
  });
});
