/**
 * Builds the three scene of the town section from the pure layout (ticket 037) and updates it from GridState.
 * No WebGL context is needed to build it (the picking tests do), and nothing here reads input or the grid.
 * Light never depends on colour alone: live wires also breathe and carry a bead that moves away from the feed,
 * a faulted cable sparks and flickers, a lit lamp has a light and a pool on the ground, a switch's lever points down its output.
 */

import {
  AdditiveBlending,
  AmbientLight,
  LineDashedMaterial,
  LineLoop,
  Shape,
  ShapeGeometry,
  Sprite,
  SpriteMaterial,
  Float32BufferAttribute,
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
import { CAPTION_FONT_PX, FEED_FONT_PX, captionsFor, scaleForPx, type NodeCaption } from "./captions";
import { createBarSprite, createCaptionSprite, defaultTextSurface, type BarSprite, type CaptionSprite, type TextSurfaceFactory } from "./text";

export interface SceneBundle {
  scene: Scene;
  /** Restyle everything from the state. `hover` is the node or line id under the pointer, or null. */
  update(state: GridState, hover: string | null, timeSeconds: number): void;
  /** Every caption sprite: the node it words (`userData.caption`) and its anchor. None carries a pick tag. */
  captions: readonly Sprite[];
  /** Parts tests and the renderer look at. */
  parts: ReadonlyMap<string, NodeParts>;
  /** The canvas size in css px and the camera's vertical field of view, so captions keep a fixed pixel size. */
  setViewport(width: number, height: number, fovDeg: number): void;
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

export interface NodeParts {
  /** A breaker or switch lever: its geometry runs from its pivot (the mesh origin) to its tip, `userData.length` long. */
  lever?: Mesh;
  /** A breaker's or fuse box's box. */
  body?: Mesh;
  /** A switch's ground chevron. */
  chevron?: Mesh;
  /** A fuse box's load bar sprite; `userData` holds the fill, step, ticks and blown it was drawn with. */
  fuseBar?: Sprite;
}

interface NodeView {
  id: string;
  group: Group;
  update(look: NodeLook, state: GridState, t: number, cap: NodeCaption): void;
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

export interface SceneOptions {
  /** Makes the canvas captions are drawn on. Default: the browser's, or a no-op surface in Node. */
  text?: TextSurfaceFactory;
  /** Device pixel ratio for caption textures (the renderer passes it, capped at 2). */
  dpr?: number;
}

const BREAKER_LEVER = 0.55;
/** The breaker's box, w x h x d: as big as the fuse box (0.6 x 0.5 x 0.4) or bigger. */
const BREAKER_BODY: readonly [number, number, number] = [0.7, 0.55, 0.45];
const SWITCH_LEVER = 0.65;
const CHEVRON_AT = 0.9;
const FUSE_CAPTION_Y = 1.7;
const LAMP_HEAD_Y = 1.3;
/** How far (world units) a lamp's caption sits beyond it, away from its wire. */
const LAMP_CAPTION_OFFSET = 1.0;
const RIBBON = 0xff3df0;

export function buildScene(puzzle: Puzzle, opts: SceneOptions = {}): SceneBundle {
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
  const parts_ = new Map<string, NodeParts>();
  const ribbonTag = (x: number, y: number, z: number): Mesh => box(0.16, 0.16, 0.05, new MeshBasicMaterial({ color: RIBBON }), x, y, z);
  const boltGeo = new ShapeGeometry(
    (() => {
      const sh = new Shape();
      sh.moveTo(0.12, 0.4);
      sh.lineTo(-0.2, -0.05);
      sh.lineTo(-0.02, -0.05);
      sh.lineTo(-0.12, -0.4);
      sh.lineTo(0.2, 0.05);
      sh.lineTo(0.02, 0.05);
      sh.closePath();
      return sh;
    })(),
  );
  // A flat triangle on the ground pointing along +z (yawed to the selected line).
  const chevronGeo = new BufferGeometry();
  chevronGeo.setAttribute("position", new Float32BufferAttribute([0, 0, 0.28, -0.2, 0, -0.14, 0.2, 0, -0.14], 3));
  chevronGeo.setIndex([0, 2, 1]);
  const starPts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.22 : 0.09;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    starPts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const starShape = new Shape();
  starPts.forEach((p, i) => (i === 0 ? starShape.moveTo(p[0], p[1]) : starShape.lineTo(p[0], p[1])));
  starShape.closePath();
  const starGeo = new ShapeGeometry(starShape);
  const starOutlineGeo = new BufferGeometry().setFromPoints(starPts.map((p) => new Vector3(p[0], p[1], 0)));
  const circleGeo = new BufferGeometry().setFromPoints(Array.from({ length: 33 }, (_, i) => new Vector3(Math.cos((i / 32) * Math.PI * 2) * 0.46, Math.sin((i / 32) * Math.PI * 2) * 0.46, 0)));
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
    const parts: NodeParts = {};
    parts_.set(n.id, parts);

    switch (n.type) {
      case "feed": {
        const bodyMat = metal(0x3b475f);
        g.add(box(1.1, 0.6, 1.1, bodyMat, 0, 0.3, 0));
        g.add(box(0.7, 0.5, 0.7, bodyMat, 0, 0.85, 0));
        g.add(cyl(0.05, 0.3, bodyMat, -0.2, 1.25, 0), cyl(0.05, 0.3, bodyMat, 0.2, 1.25, 0));
        // The power-source sign: a lightning bolt lying on the roof, bright so it reads from above.
        const bolt = new Mesh(boltGeo, new MeshBasicMaterial({ color: 0xffe066, side: DoubleSide }));
        bolt.rotation.x = -Math.PI / 2;
        bolt.position.set(0, 1.12, 0);
        g.add(bolt);
        update = (look, _s, t) => {
          bodyMat.emissiveIntensity = look.live ? 0.5 + 0.25 * Math.sin(t * 2) : 0;
        };
        break;
      }
      case "breaker": {
        // A clear box on its post, about the fuse box's size, with the lever on top and the tribe's ribbon on its face.
        const bodyMesh = box(BREAKER_BODY[0], BREAKER_BODY[1], BREAKER_BODY[2], body, 0, 0.95, 0);
        g.add(post, bodyMesh);
        g.add(ribbonTag(0, 0.95, BREAKER_BODY[2] / 2 + 0.02));
        parts.body = bodyMesh;
        // The lever stands up for ON and lies flat toward the camera for OFF.
        const pivot = new Group();
        pivot.position.set(0, 0.95 + BREAKER_BODY[1] / 2, 0);
        const lever = new Mesh(new BoxGeometry(0.09, BREAKER_LEVER, 0.09).translate(0, BREAKER_LEVER / 2, 0), new MeshStandardMaterial({ color: 0xf2f5fb, emissive: 0xf2f5fb, emissiveIntensity: 0.35 }));
        lever.userData["length"] = BREAKER_LEVER;
        pivot.add(lever);
        g.add(pivot);
        parts.lever = lever;
        update = (look, _s, t) => {
          pivot.rotation.x = look.closed === false ? Math.PI / 2 : 0;
          body.emissiveIntensity = look.closed !== false && look.live ? 0.4 + 0.2 * Math.sin(t * 2) : 0;
        };
        break;
      }
      case "switch": {
        const drumMat = metal();
        const drum = new Mesh(new CylinderGeometry(0.32, 0.32, 0.4, 16), drumMat);
        drum.position.y = 0.95;
        g.add(post, drum);
        g.add(ribbonTag(0, 1.0, 0.33));
        const pivot = new Group();
        pivot.position.set(0, 1.2, 0);
        const lever = new Mesh(new BoxGeometry(0.1, 0.1, SWITCH_LEVER).translate(0, 0, SWITCH_LEVER / 2), new MeshStandardMaterial({ color: 0xf2f5fb, emissive: 0xf2f5fb, emissiveIntensity: 0.35 }));
        lever.userData["length"] = SWITCH_LEVER;
        pivot.add(lever);
        // A dim stub toward the other output.
        const stubPivot = new Group();
        stubPivot.position.set(0, 1.2, 0);
        stubPivot.add(new Mesh(new BoxGeometry(0.07, 0.07, 0.35).translate(0, 0, 0.175), new MeshStandardMaterial({ color: 0x4a586f })));
        const chevron = new Mesh(chevronGeo, new MeshBasicMaterial({ color: 0xf2f5fb, side: DoubleSide, transparent: true, opacity: 0.9 }));
        chevron.position.y = 0.07;
        g.add(pivot, stubPivot, chevron);
        parts.lever = lever;
        parts.chevron = chevron;
        const angles: [number, number] = [leverAngle(n, 0), leverAngle(n, 1)];
        update = (look, _s, t) => {
          const sel = look.selected === 1 ? 1 : 0;
          pivot.rotation.y = angles[sel];
          stubPivot.rotation.y = angles[sel === 0 ? 1 : 0];
          chevron.rotation.y = angles[sel];
          chevron.position.x = Math.sin(angles[sel]) * CHEVRON_AT;
          chevron.position.z = Math.cos(angles[sel]) * CHEVRON_AT;
          drumMat.emissiveIntensity = look.live ? 0.4 + 0.2 * Math.sin(t * 2) : 0;
        };
        break;
      }
      case "fusebox": {
        const fuseBody = box(0.6, 0.5, 0.4, body, 0, 0.95, 0);
        parts.body = fuseBody;
        g.add(post, fuseBody);
        const fuseMat = new MeshStandardMaterial({ color: 0xe8e2c8, emissive: WARM, emissiveIntensity: 0 });
        const fuse = cyl(0.07, 0.3, fuseMat, 0, 0.95, 0.24);
        fuse.rotation.z = Math.PI / 2;
        g.add(fuse);
        // The load bar is a camera-facing sprite under the caption (see below), so it keeps a fixed pixel size like 2D's.
        update = (look, _s, t, cap) => {
          body.emissiveIntensity = look.live ? 0.4 + 0.2 * Math.sin(t * 2) : 0;
          fuseMat.emissiveIntensity = look.live ? 0.7 : 0;
          fuseMat.color.setHex(cap.blown ? SCORCH : 0xe8e2c8);
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
        // A halo round the head, only while lit: a lit lamp differs from a dark one by shape and light, not just colour.
        const haloMat = new SpriteMaterial({ map: poolTex, color: WARM, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
        const halo = new Sprite(haloMat);
        halo.scale.set(1.3, 1.3, 1);
        halo.position.set(0, POLE_HEIGHT + 0.05, 0);
        g.add(post, head, light, pool, halo);
        let starFill: Mesh | null = null;
        if (allTargets || targets.has(n.id)) {
          const ring = new Line(circleGeo, new LineDashedMaterial({ color: TARGET, dashSize: 0.1, gapSize: 0.08 }));
          ring.computeLineDistances();
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.05;
          // The star: outline always, filled while lit.
          const star = new Group();
          star.add(new LineLoop(starOutlineGeo, new LineBasicMaterial({ color: TARGET })));
          starFill = new Mesh(starGeo, new MeshBasicMaterial({ color: TARGET, side: DoubleSide }));
          starFill.visible = false;
          star.add(starFill);
          star.rotation.x = -Math.PI / 2;
          star.position.set(0, POLE_HEIGHT + 0.5, 0);
          g.add(ring, star);
        }
        const placeMat = placeMats.get(n.id);
        update = (_look, state, t) => {
          const b = lampBrightness(state, n.id, idx, t);
          headMat.emissiveIntensity = 2.2 * b;
          headMat.color.setHex(b > 0 ? 0xfff3c9 : 0x3a4152);
          light.intensity = 5 * b;
          poolMat.opacity = 0.9 * b;
          haloMat.opacity = 0.8 * b;
          halo.visible = b > 0;
          if (starFill) starFill.visible = b > 0;
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

  // Captions: camera-facing sprites in the scene, a fixed pixel size. They carry no pick tag, so they never take a click.
  const captionSet = captionsFor(puzzle);
  const surface = opts.text ?? defaultTextSurface;
  const dpr = opts.dpr ?? 1;
  interface CaptionView {
    id: string;
    cs: CaptionSprite;
    place: boolean;
    lines: readonly string[] | null;
    tone: string;
  }
  const capViews: CaptionView[] = [];
  const barViews: { id: string; bar: BarSprite }[] = [];
  const awayFromWire = (id: string, pos: readonly [number, number]): [number, number] => {
    const l = puzzle.lines.find((q) => q.from === id || q.to === id);
    const other = l ? posOf.get(l.from === id ? l.to : l.from) : undefined;
    let dx = other ? pos[0] - other[0] : 1;
    let dz = other ? pos[1] - other[1] : 0;
    const len = Math.hypot(dx, dz);
    if (len < 1e-9) return [1, 0];
    dx /= len;
    dz /= len;
    return [dx, dz];
  };
  const captionSprites: Sprite[] = [];
  let unit = scaleForPx(1, 720, 40);
  const addCaption = (id: string, x: number, y: number, z: number, fontPx: number, bold: boolean, anchorY: number, place: boolean): void => {
    const cs = createCaptionSprite(surface, fontPx, dpr, bold, anchorY);
    cs.sprite.position.set(x, y, z);
    cs.sprite.userData["caption"] = id;
    if (place) cs.sprite.userData["place"] = true;
    cs.setUnit(unit);
    scene.add(cs.sprite);
    captionSprites.push(cs.sprite);
    capViews.push({ id, cs, place, lines: null, tone: "" });
  };
  for (const n of puzzle.nodes) {
    const [x, z] = n.pos;
    if (n.type === "feed") addCaption(n.id, x, 1.75, z, FEED_FONT_PX, true, 0, false);
    else if (n.type === "breaker") addCaption(n.id, x, 0.95 + BREAKER_BODY[1] / 2 + BREAKER_LEVER + 0.12, z, CAPTION_FONT_PX, false, 0, false);
    else if (n.type === "fusebox" && n.rating !== undefined) {
      addCaption(n.id, x, FUSE_CAPTION_Y, z, CAPTION_FONT_PX, false, 0, false);
      // The load bar hangs from the same anchor, just under the caption.
      const bar = createBarSprite(surface, dpr);
      bar.sprite.position.set(x, FUSE_CAPTION_Y, z);
      bar.setUnit(unit);
      scene.add(bar.sprite);
      barViews.push({ id: n.id, bar });
      const part = parts_.get(n.id);
      if (part) part.fuseBar = bar.sprite;
    } else if (n.type === "lamp") {
      // Beside the lamp, on the side away from its wire, so the words never sit on the bulb or the line coming in.
      const [ax, az] = awayFromWire(n.id, n.pos);
      addCaption(n.id, x + ax * LAMP_CAPTION_OFFSET, LAMP_HEAD_Y, z + az * LAMP_CAPTION_OFFSET, CAPTION_FONT_PX, false, 0.5, false);
    }
  }
  const placeNames = new Map<string, string>();
  for (const p of blocks.places) {
    if (!p.label) continue;
    const lamp = puzzle.nodes.find((q) => q.id === p.lamp);
    const b = p.boxes[0];
    if (b) addCaption(p.lamp, b.x, b.h + 0.1, b.z, CAPTION_FONT_PX, false, 0, true);
    else if (lamp) addCaption(p.lamp, lamp.pos[0], 0.3, lamp.pos[1] + 0.8, CAPTION_FONT_PX, false, 0, true);
    placeNames.set(p.lamp, p.label);
  }

  scene.updateMatrixWorld(true);

  const look: NodeLook = { live: false, faulted: false, lit: false, closed: null, selected: null };
  const beadAt: Vec3 = { x: 0, y: 0, z: 0 };
  let lastHover: string | null = null;

  return {
    scene,
    captions: captionSprites,
    parts: parts_,
    setViewport(_width, height, fovDeg) {
      unit = scaleForPx(1, height, fovDeg);
      for (const c of capViews) c.cs.setUnit(unit);
      for (const b of barViews) b.bar.setUnit(unit);
    },
    update(state, hover, t) {
      if (hover !== lastHover) {
        const prev = lastHover ? hoverable.get(lastHover) : undefined;
        if (prev) prev.scale.setScalar(1);
        const next = hover ? hoverable.get(hover) : undefined;
        if (next) next.scale.setScalar(1.12);
        lastHover = hover;
      }
      const recs = captionSet.update(state);
      for (const v of views) v.update(nodeLookInto(state, v.id, look), state, t, recs.get(v.id)!);
      for (const b of barViews) {
        const rec = recs.get(b.id)!;
        b.bar.draw(rec.fill ?? 0, rec.step ?? 0, rec.ticks ?? 0, rec.blown === true);
      }
      for (const c of capViews) {
        if (c.place) {
          if (!c.lines) {
            c.lines = [placeNames.get(c.id) ?? ""];
            c.cs.draw(c.lines, "text");
          }
          continue;
        }
        const rec = recs.get(c.id)!;
        // The record keeps the same lines array while the words are unchanged, so this redraws only on a change.
        if (rec.lines !== c.lines || rec.tone !== c.tone) {
          c.lines = rec.lines;
          c.tone = rec.tone;
          c.cs.draw(rec.lines, rec.tone);
        }
      }
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
        // A caption's texture belongs to its sprite material.
        const map = (mm as SpriteMaterial | undefined)?.map;
        if (map && o instanceof Sprite) map.dispose();
      });
      mats.forEach((m) => m.dispose());
      poolTex.dispose();
    },
  };
}
