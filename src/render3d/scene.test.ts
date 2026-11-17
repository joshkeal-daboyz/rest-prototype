import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Box3, BoxGeometry, Matrix4, MeshStandardMaterial, PointLight, Raycaster, TubeGeometry, Vector3, type Mesh, type Object3D } from "three";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid } from "../grid";
import { ELEVATION, FOV_DEG, createCameraRig } from "./camera";
import { captionTextPx } from "./captions";
import { stubTextSurface } from "./text";
import { NODE_BODY_Y, POLE_HEIGHT, SHADOW_Y, runPoints, shadowOf, wireLayout } from "./layout";
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
  it("opens with the circuit filling about 80% of the free area's limiting dimension, and fitWhole shows the whole footprint", () => {
    const rig = createCameraRig(puzzle, 1280, 720, { top: 120, bottom: 90 });
    // The circuit's bounds plus the frame margin: 0..14 by -4..3, grown by 1.
    const corners = [[-1, -5], [15, -5], [-1, 4], [15, 4]] as const;
    const project = (x: number, y: number, z: number): { x: number; y: number } => {
      const v = new Vector3(x, y, z).project(rig.camera);
      return { x: ((v.x + 1) / 2) * 1280, y: ((1 - v.y) / 2) * 720 };
    };
    const pts = corners.flatMap(([x, z]) => [project(x, 0, z), project(x, POLE_HEIGHT, z)]);
    const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    const h = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    const limiting = Math.max(w / 1280, h / (720 - 120 - 90));
    expect(limiting).toBeGreaterThan(0.72);
    expect(limiting).toBeLessThan(0.85);
    expect(Math.min(...pts.map((p) => p.y))).toBeGreaterThanOrEqual(120);
    expect(Math.max(...pts.map((p) => p.y))).toBeLessThanOrEqual(720 - 90);
    rig.fitWhole();
    for (const [x, z] of [[-2, -6], [16, -6], [-2, 5], [16, 5]] as const) {
      const p = project(x, 0, z);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1280);
      expect(p.y).toBeGreaterThanOrEqual(120);
      expect(p.y).toBeLessThanOrEqual(720 - 90);
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

describe("captions in the scene", () => {
  const W = 1280;
  const H = 720;
  const insets = { top: 120, bottom: 90 };
  const start = () => createGrid(puzzle, new EventBus());
  const make = () => {
    const b = buildScene(puzzle, { text: stubTextSurface });
    b.setViewport(W, H, FOV_DEG);
    return b;
  };

  it("adds one sprite per node with words plus the shrine's place name, none tagged for picking", () => {
    const b = make();
    const ids = b.captions.map((s) => `${s.userData["caption"]}${s.userData["place"] ? ":place" : ""}`).sort();
    expect(ids).toEqual(["br_main", "br_street", "fb_A", "feed", "flood", "shrine", "shrine:place", "street_1", "street_2", "street_3"].sort());
    for (const s of b.captions) expect(s.userData["pickKind"]).toBeUndefined();
  });

  it("is legible at the opening pose: anchors inside the free area, text at least 12 px (15 for the feed), at any viewport", () => {
    const b = make();
    b.update(start().state(), null, 0);
    const rig = createCameraRig(puzzle, W, H, insets);
    for (const s of b.captions) {
      const v = s.position.clone().project(rig.camera);
      const px = ((v.x + 1) / 2) * W;
      const py = ((1 - v.y) / 2) * H;
      expect(px, String(s.userData["caption"])).toBeGreaterThan(0);
      expect(px).toBeLessThan(W);
      expect(py).toBeGreaterThanOrEqual(insets.top);
      expect(py).toBeLessThanOrEqual(H - insets.bottom);
    }
    for (const [vw, vh] of [[W, H], [1920, 1080], [800, 500]] as const) {
      b.setViewport(vw, vh, FOV_DEG);
      for (const s of b.captions) {
        const fontPx = s.userData["fontPx"] as number;
        const text = captionTextPx(s.scale.y, s.userData["cssH"] as number, fontPx, vh, FOV_DEG);
        expect(text, String(s.userData["caption"])).toBeGreaterThanOrEqual(s.userData["caption"] === "feed" ? 15 : 12);
      }
    }
  });

  it("breaker lever: up when closed, flat when open, at least 0.5 long", () => {
    const b = make();
    const g = start();
    const tip = (): { tip: number; pivot: number; len: number } => {
      b.scene.updateMatrixWorld(true);
      const lever = b.parts.get("br_street")!.lever!;
      const len = lever.userData["length"] as number;
      return { tip: lever.localToWorld(new Vector3(0, len, 0)).y, pivot: lever.getWorldPosition(new Vector3()).y, len };
    };
    b.update(g.state(), null, 0);
    const closed = tip();
    expect(closed.len).toBeGreaterThanOrEqual(0.5);
    expect(closed.tip).toBeGreaterThan(closed.pivot + 0.4);
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    g.throwBreaker("br_street");
    b.update(g.state(), null, 0);
    const open = tip();
    expect(open.tip).toBeLessThanOrEqual(open.pivot + 0.1);
  });

  it("switch lever points down the selected line and the chevron lies on its first segment, before and after sw_1", () => {
    const b = make();
    const g = start();
    const sw = puzzle.nodes.find((n) => n.id === "sw_1")!;
    const check = (line: string, far: string): void => {
      b.update(g.state(), null, 0);
      b.scene.updateMatrixWorld(true);
      const parts = b.parts.get("sw_1")!;
      const len = parts.lever!.userData["length"] as number;
      expect(len).toBeGreaterThanOrEqual(0.6);
      const dir = parts.lever!.localToWorld(new Vector3(0, 0, len)).sub(parts.lever!.getWorldPosition(new Vector3()));
      const farPos = puzzle.nodes.find((n) => n.id === far)!.pos;
      const want = new Vector3(farPos[0] - sw.pos[0], 0, farPos[1] - sw.pos[1]);
      dir.y = 0;
      expect((dir.angleTo(want) * 180) / Math.PI, line).toBeLessThan(5);
      const c = parts.chevron!.getWorldPosition(new Vector3());
      const rel = new Vector3(c.x - sw.pos[0], 0, c.z - sw.pos[1]);
      expect(rel.length()).toBeLessThan(want.length());
      expect((rel.angleTo(want) * 180) / Math.PI).toBeLessThan(1);
    };
    check("l_a", "j_dead");
    g.throwSwitch("sw_1");
    check("l_b", "j4");
  });

  it("fuse bar: a camera-facing bar under the caption, full at start and empty after the win, wide enough to count its segments", () => {
    const b = make();
    const g = start();
    b.update(g.state(), null, 0);
    const bar = b.parts.get("fb_A")!.fuseBar!;
    expect(bar.userData["fill"]).toBe(1);
    expect(bar.userData["ticks"]).toBe(2);
    expect((bar.userData["cssW"] as number) / ((bar.userData["ticks"] as number) + 1)).toBeGreaterThanOrEqual(15);
    expect(bar.userData["cssW"]).toBeGreaterThanOrEqual(60);
    // Fixed pixel size, like the captions.
    for (const vh of [480, 1080]) {
      b.setViewport(W, vh, FOV_DEG);
      expect(captionTextPx(bar.scale.y, bar.userData["cssH"] as number, bar.userData["cssH"] as number, vh, FOV_DEG)).toBeCloseTo(bar.userData["cssH"] as number, 6);
    }
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    g.throwBreaker("br_street");
    b.update(g.state(), null, 0);
    expect(bar.userData["fill"]).toBe(0);
  });

  it("breaker has a box body as big as the fuse box, not a mark on the wire", () => {
    const b = make();
    const size = (id: string): Vector3 => {
      const m = b.parts.get(id)!.body!;
      m.geometry.computeBoundingBox();
      return m.geometry.boundingBox!.getSize(new Vector3());
    };
    const br = size("br_street");
    const fuse = size("fb_A");
    expect(br.x).toBeGreaterThanOrEqual(fuse.x);
    expect(br.y).toBeGreaterThanOrEqual(fuse.y);
    expect(br.z).toBeGreaterThanOrEqual(fuse.z);
  });

  it("no two captions or fuse bars overlap, and none covers a node, at the opening camera 1280x720", () => {
    const b = make();
    b.update(start().state(), null, 0);
    const rig = createCameraRig(puzzle, W, H, insets);
    const toPx = (p: Vector3): { x: number; y: number } => {
      const v = p.clone().project(rig.camera);
      return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
    };
    interface R {
      name: string;
      l: number;
      t: number;
      r: number;
      bt: number;
    }
    const rects: R[] = [...b.captions, ...[...b.parts.values()].flatMap((p) => (p.fuseBar ? [p.fuseBar] : []))].map((s) => {
      const c = toPx(s.position);
      const w = s.userData["cssW"] as number;
      const h = s.userData["cssH"] as number;
      const l = c.x - w * s.center.x;
      const t = c.y - h * (1 - s.center.y);
      return { name: String(s.userData["caption"] ?? "bar"), l, t, r: l + w, bt: t + h };
    });
    expect(rects.length).toBe(b.captions.length + 1);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const p = rects[i]!;
        const q = rects[j]!;
        const hit = p.l < q.r && q.l < p.r && p.t < q.bt && q.t < p.bt;
        expect(hit, p.name + " vs " + q.name).toBe(false);
      }
    }
    for (const n of puzzle.nodes) {
      for (const y of [NODE_BODY_Y, POLE_HEIGHT]) {
        const c = toPx(new Vector3(n.pos[0], y, n.pos[1]));
        for (const r of rects) expect(c.x >= r.l && c.x <= r.r && c.y >= r.t && c.y <= r.bt, n.id + " under " + r.name).toBe(false);
      }
    }
  });
});

// ---- Section C1: wires and poles read as strung in the air ----
describe("wires and poles (C1)", () => {
  const W = 1280;
  const H = 720;
  const rigC = createCameraRig(puzzle, W, H, { top: 120, bottom: 90 });
  const runs = wireLayout(puzzle);
  const project = (x: number, y: number, z: number): { x: number; y: number } => {
    const v = new Vector3(x, y, z).project(rigC.camera);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  };
  const bundle = buildScene(puzzle, { text: stubTextSurface });
  const lum = (hex: number): number => {
    const ch = (c: number): number => (c / 255 <= 0.03928 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4));
    return 0.2126 * ch((hex >> 16) & 255) + 0.7152 * ch((hex >> 8) & 255) + 0.0722 * ch(hex & 255);
  };

  it("lifts the poles and tilts the camera lower", () => {
    expect(POLE_HEIGHT).toBeGreaterThanOrEqual(1.6);
    expect(ELEVATION).toBeCloseTo((45 * Math.PI) / 180, 12);
  });

  it("makes a pole and a cross-arm for every intermediate attachment point, the arm turned across its run and at least 0.6 long", () => {
    const inter = runs.reduce((n, r) => n + r.attach.length - 2, 0);
    expect(inter).toBe(9);
    const { poles, arms } = bundle.poles;
    expect(poles.count).toBe(inter);
    expect(arms.count).toBe(inter);
    expect((arms.geometry as BoxGeometry).parameters.width).toBeGreaterThanOrEqual(0.6);
    const m = new Matrix4();
    let k = 0;
    for (const r of runs) {
      const a = r.attach[0]!;
      const b = r.attach[r.attach.length - 1]!;
      const dir = new Vector3(b.x - a.x, 0, b.z - a.z).normalize();
      for (let i = 1; i < r.attach.length - 1; i++, k++) {
        arms.getMatrixAt(k, m);
        const axis = new Vector3(1, 0, 0).transformDirection(m);
        axis.y = 0;
        expect((axis.angleTo(dir) * 180) / Math.PI, r.id).toBeGreaterThan(85);
        expect((axis.angleTo(dir) * 180) / Math.PI, r.id).toBeLessThan(95);
        const at = new Vector3().setFromMatrixPosition(m);
        expect(at.x).toBeCloseTo(r.attach[i]!.x, 9);
        expect(at.z).toBeCloseTo(r.attach[i]!.z, 9);
      }
    }
  });

  it("paints the poles at least 3:1 in luminance against the street", () => {
    const hex = (bundle.poles.poles.material as MeshStandardMaterial).color.getHex();
    const street = 0x1a2331;
    const c = (lum(hex) + 0.05) / (lum(street) + 0.05);
    expect(c).toBeGreaterThanOrEqual(3);
  });

  it("hangs every wire at least 30 px above its shadow at the opening pose, and shows l_feed's sag", () => {
    for (const r of runs) {
      const sh = bundle.wires.get(r.id)!.shadows[0]!;
      expect(sh.userData["shadowOf"]).toBe(r.id);
      const pts = runPoints(r);
      const smid = shadowOf(pts)[Math.floor(pts.length / 2)]!;
      // The wire's own middle against the point of the shadow right below it.
      const below = shadowOf([r.mid])[0]!;
      expect(smid.y).toBe(SHADOW_Y);
      const wp = project(r.mid.x, r.mid.y, r.mid.z);
      const sp = project(below.x, below.y, below.z);
      expect(Math.hypot(wp.x - sp.x, wp.y - sp.y), r.id).toBeGreaterThanOrEqual(30);
    }
    const lf = runs.find((r) => r.id === "l_feed")!;
    const a = lf.attach[0]!;
    const b = lf.attach[1]!;
    const chord = project((a.x + b.x) / 2, POLE_HEIGHT, (a.z + b.z) / 2);
    const sag = project(lf.mid.x, lf.mid.y, lf.mid.z);
    expect(Math.hypot(chord.x - sag.x, chord.y - sag.y)).toBeGreaterThanOrEqual(6);
    for (const r of runs) {
      const g = bundle.wires.get(r.id)!.whole.geometry as TubeGeometry;
      expect(g.parameters.radius).toBeGreaterThanOrEqual(0.05);
    }
  });

  it("lets no building or place stand between the camera and a wire's middle or a node's pick point", () => {
    bundle.scene.updateMatrixWorld(true);
    const eye = rigC.camera.position;
    const solids: Object3D[] = [bundle.slots.blocks.placeholder];
    bundle.scene.traverse((o) => {
      const m = (o as Mesh).material;
      if (m && [...bundle.places.values()].includes(m as MeshStandardMaterial)) solids.push(o);
    });
    expect(solids.length).toBeGreaterThan(1);
    const targets: { name: string; p: Vector3 }[] = [
      ...runs.map((r) => ({ name: r.id, p: new Vector3(r.mid.x, r.mid.y, r.mid.z) })),
      ...puzzle.nodes.map((n) => ({ name: n.id, p: new Vector3(n.pos[0], NODE_BODY_Y, n.pos[1]) })),
    ];
    const caster = new Raycaster();
    for (const t of targets) {
      const dir = t.p.clone().sub(eye);
      const dist = dir.length();
      caster.set(eye, dir.normalize());
      caster.far = dist - 1e-6;
      const hits = caster.intersectObjects(solids, true);
      expect(hits.length, `${t.name} behind ${hits[0]?.object.name ?? "a place"} at ${hits[0]?.distance}`).toBe(0);
    }
  });

  it("brings every wire end within 0.15 of its node's body", () => {
    const groups = new Map<string, Box3>();
    bundle.scene.updateMatrixWorld(true);
    for (const n of puzzle.nodes) {
      // The node's group is the one parented to the scene at its position (it holds its post, body and sprites).
      const g = bundle.scene.children.find((o) => o.type === "Group" && Math.abs(o.position.x - n.pos[0]) < 1e-9 && Math.abs(o.position.z - n.pos[1]) < 1e-9);
      expect(g, n.id).toBeDefined();
      groups.set(n.id, new Box3().setFromObject(g!));
    }
    for (const r of runs) {
      for (const [node, p] of [[r.from, r.attach[0]!], [r.to, r.attach[r.attach.length - 1]!]] as const) {
        expect(groups.get(node)!.distanceToPoint(new Vector3(p.x, p.y, p.z)), `${r.id} at ${node}`).toBeLessThanOrEqual(0.15);
      }
    }
  });
});
