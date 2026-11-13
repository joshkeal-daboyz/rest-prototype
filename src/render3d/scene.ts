/**
 * Builds the three scene of the town section from the pure layout (ticket 037) and updates it from GridState.
 * No WebGL context is needed to build it (the picking tests do), and nothing here reads input or the grid.
 * Light never depends on colour alone: live wires also breathe and carry a bead that moves away from the feed,
 * a faulted cable sparks and flickers, a lit lamp has a light and a pool on the ground, a switch's lever points down its output.
 */

import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  RGBAFormat,
  RingGeometry,
  Scene,
  SphereGeometry,
  TubeGeometry,
  UnsignedByteType,
  Vector3,
  CatmullRomCurve3,
  type Material,
} from "three";
import type { GridNode, Puzzle } from "../core";
import type { GridState } from "../grid";
import { circuitStreets, feedLanes, type Lane } from "../render/city";
import { hash01 } from "../render/motion";
import { POLE_HEIGHT, blockLayout, cumulative, pointAlong, runPoints, wireLayout, type Block, type Vec3, type WireRun } from "./layout";
import { lampBrightness, nodeLookInto, wireLook, type NodeLook } from "./look";

export interface SceneBundle {
  scene: Scene;
  /** Restyle everything from the state. `hover` is the node or line id under the pointer, or null. */
  update(state: GridState, hover: string | null, timeSeconds: number): void;
  dispose(): void;
}

const GROUND = 0x0e131d;
const STREET = 0x1a2331;
const BUILDING = 0x161d2b;
const PLACE = 0x3a4a68;
const WOOD = 0x3b3128;
const METAL = 0x5d6b84;
const DEAD_WIRE = 0x2a3445;
const LIVE_WIRE = 0x4fd1ff;
const LIVE_GLOW = 0x2aa9d8;
const FAULT_GLOW = 0xff8a3d;
const WARM = 0xffd37a;
const TARGET = 0xffe9a8;
const SCORCH = 0x1a0f0c;

function box(w: number, h: number, d: number, mat: Material, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(new BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function cyl(r: number, h: number, mat: Material, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(new CylinderGeometry(r, r, h, 10), mat);
  m.position.set(x, y, z);
  return m;
}
function metal(color = METAL): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.3, emissive: LIVE_GLOW, emissiveIntensity: 0 });
}

/** A radial falloff, white with alpha, built without a canvas. */
function poolTexture(): DataTexture {
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const r = Math.hypot((i + 0.5) / n - 0.5, (j + 0.5) / n - 0.5) * 2;
      const a = Math.max(0, 1 - r);
      const k = (j * n + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255;
      data[k + 3] = Math.round(255 * a * a);
    }
  }
  const t = new DataTexture(data, n, n, RGBAFormat, UnsignedByteType);
  t.magFilter = LinearFilter;
  t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

interface NodeView {
  id: string;
  group: Group;
  update(look: NodeLook, state: GridState, t: number): void;
}
interface WireView {
  run: WireRun;
  mat: MeshStandardMaterial;
  bead: Mesh;
  spark: Mesh;
  pts: Vec3[];
  cum: number[];
  phase: number;
}

export function buildScene(puzzle: Puzzle): SceneBundle {
  const scene = new Scene();
  scene.background = new Color(0x0b0f17);
  scene.add(new AmbientLight(0x4a5a7a, 1.1));
  const moon = new DirectionalLight(0x8fa6d0, 0.7);
  moon.position.set(-6, 12, 4);
  scene.add(moon);

  const blocks = blockLayout(puzzle);
  const runs = wireLayout(puzzle);
  const streets = circuitStreets(puzzle);
  const win = blocks.window;

  // Ground and streets.
  const ground = new Mesh(new BoxGeometry(win.maxX - win.minX + 12, 0.1, win.maxY - win.minY + 12), new MeshStandardMaterial({ color: GROUND, roughness: 1 }));
  ground.position.set((win.minX + win.maxX) / 2, -0.05, (win.minY + win.maxY) / 2);
  scene.add(ground);
  const streetMat = new MeshStandardMaterial({ color: STREET, roughness: 1 });
  const addLane = (l: Lane): void => {
    const len = Math.hypot(l.bx - l.ax, l.by - l.ay);
    const m = box(len + l.w, 0.03, l.w, streetMat, (l.ax + l.bx) / 2, 0.015, (l.ay + l.by) / 2);
    m.rotation.y = -Math.atan2(l.by - l.ay, l.bx - l.ax);
    scene.add(m);
  };
  streets.lanes.forEach(addLane);
  feedLanes(puzzle).forEach(addLane);

  // City blocks, instanced; a lamp's place is its own mesh so it can warm when lit.
  const mat4 = new Matrix4();
  const instanced = (list: Block[], mat: Material): InstancedMesh => {
    const im = new InstancedMesh(new BoxGeometry(1, 1, 1), mat, Math.max(list.length, 1));
    list.forEach((b, i) => {
      mat4.makeScale(b.w, b.h, b.d).setPosition(b.x, b.h / 2, b.z);
      im.setMatrixAt(i, mat4);
    });
    im.count = list.length;
    im.instanceMatrix.needsUpdate = true;
    return im;
  };
  scene.add(instanced(blocks.blocks, new MeshStandardMaterial({ color: BUILDING, roughness: 0.95 })));
  const placeMats = new Map<string, MeshStandardMaterial>();
  for (const p of blocks.places) {
    const mat = new MeshStandardMaterial({ color: PLACE, roughness: 0.9, emissive: WARM, emissiveIntensity: 0 });
    placeMats.set(p.lamp, mat);
    for (const b of p.boxes) scene.add(box(b.w, b.h, b.d, mat, b.x, b.h / 2, b.z));
  }

  // Poles: one per intermediate attachment point.
  const poleList: Vec3[] = [];
  for (const r of runs) for (let i = 1; i < r.attach.length - 1; i++) poleList.push(r.attach[i]!);
  const poles = new InstancedMesh(new CylinderGeometry(0.045, 0.06, POLE_HEIGHT, 8), new MeshStandardMaterial({ color: WOOD, roughness: 1 }), Math.max(poleList.length, 1));
  poleList.forEach((p, i) => {
    mat4.makeTranslation(p.x, POLE_HEIGHT / 2, p.z);
    poles.setMatrixAt(i, mat4);
  });
  poles.count = poleList.length;
  scene.add(poles);
  const arms = new InstancedMesh(new BoxGeometry(0.3, 0.05, 0.06), new MeshStandardMaterial({ color: WOOD, roughness: 1 }), Math.max(poleList.length, 1));
  poleList.forEach((p, i) => {
    mat4.makeTranslation(p.x, POLE_HEIGHT - 0.04, p.z);
    arms.setMatrixAt(i, mat4);
  });
  arms.count = poleList.length;
  scene.add(arms);

  // Wires: a visible tube, an invisible pick line, a bead that carries the direction of flow, and a spark for a break.
  const beadGeo = new SphereGeometry(0.075, 8, 6);
  const sparkGeo = new SphereGeometry(0.11, 8, 6);
  const wires: WireView[] = [];
  const wireById = new Map<string, WireView>();
  const pickMat = new LineBasicMaterial({ visible: false });
  runs.forEach((run, i) => {
    const pts = runPoints(run);
    const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(p.x, p.y, p.z)), false, "catmullrom", 0.1);
    const mat = new MeshStandardMaterial({ color: DEAD_WIRE, roughness: 0.6, emissive: LIVE_GLOW, emissiveIntensity: 0 });
    scene.add(new Mesh(new TubeGeometry(curve, pts.length * 2, 0.035, 5, false), mat));
    const pick = new Line(new BufferGeometry().setFromPoints(pts.map((p) => new Vector3(p.x, p.y, p.z))), pickMat);
    pick.userData["pickKind"] = "wire";
    pick.userData["pickId"] = run.id;
    scene.add(pick);
    const bead = new Mesh(beadGeo, new MeshBasicMaterial({ color: 0xe6fbff }));
    bead.visible = false;
    scene.add(bead);
    const spark = new Mesh(sparkGeo, new MeshBasicMaterial({ color: 0xffd9a0 }));
    spark.position.set(run.mid.x, run.mid.y, run.mid.z);
    spark.visible = false;
    scene.add(spark);
    const w: WireView = { run, mat, bead, spark, pts, cum: cumulative(pts), phase: hash01(i + 1) };
    wires.push(w);
    wireById.set(run.id, w);
  });

  // Nodes.
  const poolTex = poolTexture();
  const pickGeo = new BoxGeometry(0.6, 0.7, 0.6);
  const pickMat3 = new MeshBasicMaterial({ visible: false });
  const posOf = new Map<string, readonly [number, number]>(puzzle.nodes.map((n) => [n.id, n.pos]));
  const lineById = new Map(puzzle.lines.map((l) => [l.id, l]));
  const targets = new Set(puzzle.target ?? []);
  const allTargets = !puzzle.target || puzzle.target.length === 0;
  const views: NodeView[] = [];
  const hoverable = new Map<string, Group>();
  let lampIndex = 0;

  const leverAngle = (n: GridNode & { type: "switch" }, which: 0 | 1): number => {
    const l = lineById.get(n.outputs[which]);
    const other = l ? posOf.get(l.from === n.id ? l.to : l.from) : undefined;
    return other ? Math.atan2(other[0] - n.pos[0], other[1] - n.pos[1]) : 0;
  };

  for (const n of puzzle.nodes) {
    const g = new Group();
    g.position.set(n.pos[0], 0, n.pos[1]);
    scene.add(g);
    hoverable.set(n.id, g);
    const pick = new Mesh(pickGeo, pickMat3);
    pick.position.set(n.pos[0], 1.0, n.pos[1]);
    pick.userData["pickKind"] = "node";
    pick.userData["pickId"] = n.id;
    scene.add(pick);

    const body = metal();
    const post = cyl(0.05, POLE_HEIGHT, new MeshStandardMaterial({ color: WOOD, roughness: 1 }), 0, POLE_HEIGHT / 2, 0);
    let update: NodeView["update"];

    switch (n.type) {
      case "feed": {
        g.add(box(1, 0.6, 1, body, 0, 0.3, 0));
        g.add(box(0.6, 0.45, 0.6, body, 0, 0.82, 0));
        g.add(cyl(0.05, 0.3, body, -0.2, 1.2, 0), cyl(0.05, 0.3, body, 0.2, 1.2, 0));
        update = (look, _s, t) => {
          body.emissiveIntensity = look.live ? 0.5 + 0.25 * Math.sin(t * 2) : 0;
        };
        break;
      }
      case "breaker": {
        g.add(post, box(0.5, 0.4, 0.3, body, 0, 0.95, 0));
        const pivot = new Group();
        pivot.position.set(0, 0.95, 0.17);
        pivot.add(box(0.07, 0.36, 0.07, new MeshStandardMaterial({ color: 0xd8dde8 }), 0, 0.18, 0));
        g.add(pivot);
        update = (look, _s, t) => {
          // Closed: the lever stands up. Open: it lies forward and the box stays dull.
          pivot.rotation.x = look.closed === false ? 1.3 : 0;
          body.emissiveIntensity = look.closed !== false && look.live ? 0.4 + 0.2 * Math.sin(t * 2) : 0;
        };
        break;
      }
      case "switch": {
        g.add(post, box(0.6, 0.4, 0.6, body, 0, 0.95, 0));
        const pivot = new Group();
        pivot.position.set(0, 1.2, 0);
        pivot.add(box(0.08, 0.08, 0.55, new MeshStandardMaterial({ color: 0xd8dde8 }), 0, 0, 0.27));
        g.add(pivot);
        const angles: [number, number] = [leverAngle(n, 0), leverAngle(n, 1)];
        update = (look, _s, t) => {
          pivot.rotation.y = angles[look.selected === 1 ? 1 : 0];
          body.emissiveIntensity = look.live ? 0.4 + 0.2 * Math.sin(t * 2) : 0;
        };
        break;
      }
      case "fusebox": {
        g.add(post, box(0.6, 0.5, 0.4, body, 0, 0.95, 0));
        const fuseMat = new MeshStandardMaterial({ color: 0xe8e2c8, emissive: WARM, emissiveIntensity: 0 });
        const fuse = cyl(0.07, 0.3, fuseMat, 0, 0.95, 0.24);
        fuse.rotation.z = Math.PI / 2;
        g.add(fuse);
        update = (look, _s, t) => {
          body.emissiveIntensity = look.live ? 0.4 + 0.2 * Math.sin(t * 2) : 0;
          fuseMat.emissiveIntensity = look.live ? 0.7 : 0;
          fuseMat.color.setHex(look.faulted ? SCORCH : 0xe8e2c8);
        };
        break;
      }
      case "junction": {
        const arm = box(0.6, 0.07, 0.09, body, 0, POLE_HEIGHT - 0.04, 0);
        g.add(post, arm);
        update = (look, _s, t) => {
          // A dead junction hangs its cross-arm crooked and scorched; a live one glows.
          arm.rotation.z = look.faulted ? 0.55 : 0;
          body.color.setHex(look.faulted ? SCORCH : METAL);
          body.emissiveIntensity = look.live && !look.faulted ? 0.5 + 0.25 * Math.sin(t * 2) : 0;
        };
        break;
      }
      case "lamp": {
        const idx = lampIndex++;
        const headMat = new MeshStandardMaterial({ color: 0x3a4152, emissive: WARM, emissiveIntensity: 0 });
        const head = new Mesh(new SphereGeometry(0.16, 12, 8), headMat);
        head.position.set(0, POLE_HEIGHT + 0.05, 0);
        const light = new PointLight(WARM, 0, 6, 1.6);
        light.position.set(0, POLE_HEIGHT, 0);
        const poolMat = new MeshBasicMaterial({ map: poolTex, color: WARM, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
        const pool = new Mesh(new CircleGeometry(1.4, 24), poolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.y = 0.04;
        g.add(post, head, light, pool);
        if (allTargets || targets.has(n.id)) {
          const mark = new Mesh(new RingGeometry(0.42, 0.5, 24), new MeshBasicMaterial({ color: TARGET, side: DoubleSide, transparent: true, opacity: 0.8 }));
          mark.rotation.x = -Math.PI / 2;
          mark.position.y = 0.05;
          g.add(mark);
        }
        const placeMat = placeMats.get(n.id);
        update = (_look, state, t) => {
          const b = lampBrightness(state, n.id, idx, t);
          headMat.emissiveIntensity = 2.2 * b;
          headMat.color.setHex(b > 0 ? 0xfff3c9 : 0x3a4152);
          light.intensity = 5 * b;
          poolMat.opacity = 0.9 * b;
          if (placeMat) placeMat.emissiveIntensity = 0.5 * b;
        };
        break;
      }
      default: {
        // A battery: a plain box on a post.
        g.add(post, box(0.5, 0.4, 0.4, body, 0, 0.95, 0));
        update = (look) => {
          body.emissiveIntensity = look.live ? 0.4 : 0;
        };
      }
    }
    views.push({ id: n.id, group: g, update });
  }

  scene.updateMatrixWorld(true);

  const look: NodeLook = { live: false, faulted: false, lit: false, closed: null, selected: null };
  const beadAt: Vec3 = { x: 0, y: 0, z: 0 };
  let lastHover: string | null = null;

  return {
    scene,
    update(state, hover, t) {
      if (hover !== lastHover) {
        const prev = lastHover ? hoverable.get(lastHover) : undefined;
        if (prev) prev.scale.setScalar(1);
        const next = hover ? hoverable.get(hover) : undefined;
        if (next) next.scale.setScalar(1.12);
        lastHover = hover;
      }
      for (const v of views) v.update(nodeLookInto(state, v.id, look), state, t);
      for (const w of wires) {
        const k = wireLook(state, w.run.id);
        const boost = hover === w.run.id ? 0.5 : 0;
        if (k === "dead") {
          w.mat.color.setHex(DEAD_WIRE);
          w.mat.emissiveIntensity = boost;
          w.bead.visible = false;
          w.spark.visible = false;
          continue;
        }
        const entry = state.flowFrom.get(w.run.id);
        const forward = entry !== w.run.to;
        // The bead leaves the node the current enters from, so direction reads without colour.
        let f = (t * 0.4 + w.phase) % 1;
        if (k === "faulted") {
          // It runs only up to the break, then the spark flickers there.
          f *= 0.5;
          w.mat.color.setHex(FAULT_GLOW);
          w.mat.emissive.setHex(FAULT_GLOW);
          w.mat.emissiveIntensity = 0.5 + 0.8 * hash01(Math.floor(t * 14) + w.phase * 9) + boost;
          w.spark.visible = true;
          w.spark.scale.setScalar(0.6 + hash01(Math.floor(t * 18) + 3));
        } else {
          w.mat.color.setHex(LIVE_WIRE);
          w.mat.emissive.setHex(LIVE_GLOW);
          w.mat.emissiveIntensity = 0.9 + 0.45 * Math.sin(t * 1.8 + w.phase * 6) + boost;
          w.spark.visible = false;
        }
        pointAlong(w.pts, w.cum, forward ? f : 1 - f, beadAt);
        w.bead.position.set(beadAt.x, beadAt.y, beadAt.z);
        w.bead.visible = true;
      }
    },
    dispose() {
      const mats = new Set<Material>();
      scene.traverse((o: Object3D) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mm = m.material as Material | Material[] | undefined;
        if (Array.isArray(mm)) mm.forEach((x) => mats.add(x));
        else if (mm) mats.add(mm);
      });
      mats.forEach((m) => m.dispose());
      poolTex.dispose();
    },
  };
}
