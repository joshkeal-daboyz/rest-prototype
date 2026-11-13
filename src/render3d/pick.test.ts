import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BoxGeometry, BufferGeometry, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, Scene, Vector3, type Object3D } from "three";
import { loadPuzzle, type Puzzle } from "../core";
import { createCameraRig } from "./camera";
import { WIRE_PICK_RADIUS, wireLayout } from "./layout";
import { createPicker } from "./pick";
import { buildScene } from "./scene";

const puzzle: Puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));
const W = 1280;
const H = 720;
const rig = createCameraRig(puzzle, W, H, { top: 120, bottom: 90 });
const bundle = buildScene(puzzle);
const picker = createPicker(bundle.scene, rig.camera, rig.size);

function px(p: Vector3, camera = rig.camera): { x: number; y: number } {
  const v = p.clone().project(camera);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
}
function targets(kind: string): Object3D[] {
  const out: Object3D[] = [];
  bundle.scene.traverse((o) => {
    if (o.userData["pickKind"] === kind) out.push(o);
  });
  return out;
}

describe("picking at the opening pose", () => {
  it("returns each node's id at the point its object projects to (every breaker, switch, fuse box, junction, feed, lamp)", () => {
    const nodes = targets("node");
    expect(nodes).toHaveLength(puzzle.nodes.length);
    const kinds = new Set(puzzle.nodes.map((n) => n.type));
    for (const k of ["feed", "breaker", "switch", "fusebox", "junction", "lamp"]) expect(kinds.has(k as never)).toBe(true);
    for (const o of nodes) {
      const p = px(o.getWorldPosition(new Vector3()));
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(W);
      expect(picker.hitTest(p.x, p.y)).toBe(o.userData["pickId"]);
    }
  });

  it("returns l_b at the projected midpoint of its wire, and every wire at its own midpoint", () => {
    for (const r of wireLayout(puzzle)) {
      const p = px(new Vector3(r.mid.x, r.mid.y, r.mid.z));
      expect(picker.hitTest(p.x, p.y), r.id).toBe(r.id);
    }
    expect(WIRE_PICK_RADIUS).toBeGreaterThan(0.035);
  });

  it("returns null on bare ground, off the canvas, and inside a blocker", () => {
    const g = px(new Vector3(2, 0, 3.5));
    expect(picker.hitTest(g.x, g.y)).toBeNull();
    expect(picker.hitTest(-5, 100)).toBeNull();
    expect(picker.hitTest(W + 5, 100)).toBeNull();
    const o = targets("node")[0]!;
    const p = px(o.getWorldPosition(new Vector3()));
    expect(picker.hitTest(p.x, p.y)).not.toBeNull();
    picker.setBlockers([{ left: p.x - 10, top: p.y - 10, right: p.x + 10, bottom: p.y + 10 }]);
    expect(picker.hitTest(p.x, p.y)).toBeNull();
    picker.setBlockers([]);
    expect(picker.hitTest(p.x, p.y)).not.toBeNull();
  });

  it("lets a node win over a wire passing in front of it", () => {
    const scene = new Scene();
    const node = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ visible: false }));
    node.position.set(5, 0.5, 0);
    node.userData = { pickKind: "node", pickId: "n" };
    // A wire across the node's centre line, nearer the camera than the node.
    const wire = new Line(new BufferGeometry().setFromPoints([new Vector3(3, 1.4, 1.5), new Vector3(7, 1.4, 1.5)]), new LineBasicMaterial());
    wire.userData = { pickKind: "wire", pickId: "w" };
    const rig2 = createCameraRig(puzzle, W, H);
    rig2.centreOn(5, 0);
    // The point where the ray through the node's centre passes the wire's height.
    const ray = new Vector3(5, 0.5, 0);
    const c = rig2.camera.position;
    const t = (c.y - 1.4) / (c.y - 0.5);
    const onWire = new Vector3().lerpVectors(c, ray, t);
    wire.geometry = new BufferGeometry().setFromPoints([new Vector3(onWire.x - 2, onWire.y, onWire.z), new Vector3(onWire.x + 2, onWire.y, onWire.z)]);
    const { x, y } = px(ray, rig2.camera);
    scene.add(wire);
    expect(createPicker(scene, rig2.camera, rig2.size).hitTest(x, y)).toBe("w");
    scene.add(node);
    expect(createPicker(scene, rig2.camera, rig2.size).hitTest(x, y)).toBe("n");
  });
});
