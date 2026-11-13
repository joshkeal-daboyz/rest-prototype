/**
 * Picking over a three scene (ticket 037). Objects carry `userData.pickId` and `userData.pickKind` ("node" | "wire").
 * Pure three math: runs in Node with no WebGL context.
 */

import { Raycaster, Vector2, type Camera, type Object3D } from "three";
import type { Rect } from "../render/geometry";
import { WIRE_PICK_RADIUS } from "./layout";

export interface PickSize {
  width: number;
  height: number;
}

export interface Picker {
  /** x, y in canvas CSS px. A node id, a line id, or null. A node's target beats a wire passing in front of it. */
  hitTest(x: number, y: number): string | null;
  /** Panels that block clicks (edges inclusive); replaces the list. */
  setBlockers(rects: readonly Rect[]): void;
}

export function createPicker(scene: Object3D, camera: Camera, size: PickSize): Picker {
  scene.updateMatrixWorld(true);
  const nodes: Object3D[] = [];
  const wires: Object3D[] = [];
  scene.traverse((o) => {
    if (o.userData["pickKind"] === "node") nodes.push(o);
    else if (o.userData["pickKind"] === "wire") wires.push(o);
  });
  const ray = new Raycaster();
  ray.params.Line = { threshold: WIRE_PICK_RADIUS };
  const ndc = new Vector2();
  let blockers: Rect[] = [];

  return {
    setBlockers(rects) {
      blockers = rects.map((r) => ({ ...r }));
    },
    hitTest(x, y) {
      if (x < 0 || y < 0 || x > size.width || y > size.height) return null;
      for (const r of blockers) if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return null;
      ndc.set((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1);
      camera.updateMatrixWorld();
      ray.setFromCamera(ndc, camera);
      const n = ray.intersectObjects(nodes, false)[0];
      if (n) return n.object.userData["pickId"] as string;
      const w = ray.intersectObjects(wires, false)[0];
      return w ? (w.object.userData["pickId"] as string) : null;
    },
  };
}
