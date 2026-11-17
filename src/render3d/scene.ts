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
import { FLARE_SECONDS, type RelightPlan } from "../render/relight";
import { BREAK_GAP, NODE_BODY_Y, POLE_HEIGHT, WIRE_RADIUS, blockLayout, cumulative, pointAlong, runPoints, shadowOf, wireLayout, type Block, type Vec3, type WireRun } from "./layout";
import { lampBrightness, nodeLookInto, type NodeLook } from "./look";
import { createRelightClock, lampIgnition, lineFraction, nodeArrived, placeGlowStep, type LampIgnition } from "./relight3d";
import { CAPTION_FONT_PX, FEED_FONT_PX, captionsFor, scaleForPx, type NodeCaption } from "./captions";
import { createBarSprite, createCaptionSprite, defaultTextSurface, type BarSprite, type CaptionSprite, type TextSurfaceFactory } from "./text";

export interface SceneBundle {
  scene: Scene;
  /**
   * Restyle everything from the state. `hover` is the node or line id under the pointer, or null.
   * `relightT` is the Relight clock (`overlay.relightT`): while it runs, power travels out from the feed and lamps ignite in order.
   */
  update(state: GridState, hover: string | null, timeSeconds: number, relightT?: number): void;
  /** Every wire's parts, by line id. */
  wires: ReadonlyMap<string, WireParts>;
  /** Each lamp's place material by lamp id: its glow is `emissiveIntensity / 0.5`, eased like 2D's. */
  places: ReadonlyMap<string, MeshStandardMaterial>;
  /** The intermediate poles and their cross-arms, one instance per intermediate attachment point, run by run. */
  poles: { poles: InstancedMesh; arms: InstancedMesh };
  /** Every caption sprite: the node it words (`userData.caption`) and its anchor. None carries a pick tag. */
  captions: readonly Sprite[];
  /** Parts tests and the renderer look at. */
  parts: ReadonlyMap<string, NodeParts>;
  /** What the converted models (ticket 039) replace; `applyModels` in models3d.ts reads it. */
  slots: ModelSlots;
  /** The canvas size in css px and the camera's vertical field of view, so captions keep a fixed pixel size. */
  setViewport(width: number, height: number, fovDeg: number): void;
  dispose(): void;
}

/** Where an intermediate pole stands and the yaw of its cross-arm (map x, map y as world z). */
export interface PoleSpot {
  x: number;
  z: number;
  yaw: number;
}

/**
 * The placeholders a converted model can replace (ticket 039). Nothing here changes how the scene looks until models are applied:
 * the placeholders stay visible, and `applyModels` hides them and adds clones to `models` (or a lamp's group).
 */
export interface ModelSlots {
  /** The intermediate poles, one spot per instance, and the instanced meshes that draw them now. */
  poles: { spots: readonly PoleSpot[]; placeholders: readonly Object3D[] };
  /** Each lamp's post (the head, light, pool and halo are separate and stay). */
  lamps: readonly { id: string; group: Group; post: Mesh }[];
  /** The footprint and city blocks (never a lamp's place), in the order of `placeholder`'s instances. */
  blocks: { list: readonly Block[]; placeholder: Object3D };
  /** Pole and building clones go here. Anything marked `userData.sharedModel` is not disposed with the scene. */
  models: Object3D;
}

const GROUND = 0x0e131d;
const STREET = 0x1a2331;
const BUILDING = 0x161d2b;
const PLACE = 0x3a4a68;
/** Weathered wood for poles, posts and cross-arms: at least 3:1 luminance contrast against the street, so it reads by brightness. */
export const POLE_WOOD = 0x8b6b4a;
const FOOT = 0x080b11;
const METAL = 0x5d6b84;
export const DEAD_WIRE = 0x2a3445;
export const LIVE_WIRE = 0x4fd1ff;
const LIVE_GLOW = 0x2aa9d8;
/** A cable that was damaged and is mended but not live: 2D's LINE_REPAIRED ("new cable"). */
export const REPAIRED_WIRE = 0x5a6f92;
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

/** What the scene holds for one line, for the update and for tests. */
export interface WireParts {
  /** The whole wire. Hidden while a damaged cable sparks (its halves show instead). */
  whole: Mesh;
  wholeMat: MeshStandardMaterial;
  /** A broken run's two halves (half 0 from the `from` node) and their materials; null for a run with no fault in the file. */
  halves: [Mesh, Mesh] | null;
  halfMats: [MeshStandardMaterial, MeshStandardMaterial] | null;
  /** The live look drawn over the whole wire: full when the line is live, growing from its flow-from end in a Relight. Its draw range is the lit part. */
  overlay: Mesh;
  /** The warm head of the Relight, visible only while the line is part-lit. */
  front: Mesh;
  /** The bead that carries the direction of flow. */
  bead: Mesh;
  /** The spark at the live half's tip. */
  spark: Mesh;
  /** The whole wire's shadow, then each half's (a broken run only). */
  shadows: Mesh[];
  /** A broken run's pick targets (an invisible box over the gap and a line along each hanging end); `userData.pickOff` is true unless the break shows. */
  breakTargets: Object3D[];
}

export interface NodeParts {
  /** A lamp's flare ring on the ground, visible only for FLARE_SECONDS after it ignites in a Relight. */
  flare?: Mesh;
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
  /** Index in `puzzle.nodes`: the Relight plan is indexed by it. */
  index: number;
  group: Group;
  update(look: NodeLook, state: GridState, t: number, cap: NodeCaption): void;
}
interface WireView {
  run: WireRun;
  /** Index in `puzzle.lines`: the Relight plan is indexed by it. */
  index: number;
  /** The file gave this line a fault, so once it is mended it takes the "new cable" look. */
  hadFault: boolean;
  parts: WireParts;
  overlayMat: MeshStandardMaterial;
  /** Index count of the overlay tube. */
  total: number;
  pts: Vec3[];
  cum: number[];
  hPts: [Vec3[], Vec3[]] | null;
  hCum: [number[], number[]] | null;
  phase: number;
}

export interface SceneOptions {
  /** Makes the canvas captions are drawn on. Default: the browser's, or a no-op surface in Node. */
  text?: TextSurfaceFactory;
  /** Device pixel ratio for caption textures (the renderer passes it, capped at 2). */
  dpr?: number;
}

const BREAKER_LEVER = 0.55;
/** OFF: the lever drops forward and down past flat (2.2 rad from upright), so it reads from above as a change of pose. */
const BREAKER_OFF_ANGLE = 2.2;
/** The breaker's box, w x h x d: as big as the fuse box (0.6 x 0.5 x 0.4) or bigger. */
const BREAKER_BODY: readonly [number, number, number] = [0.7, 0.55, 0.45];
const SWITCH_LEVER = 0.65;
const CHEVRON_AT = 0.9;
const FUSE_CAPTION_Y = POLE_HEIGHT + 0.4;
const LAMP_HEAD_Y = POLE_HEIGHT + 0.1;
const WIRE_RADIAL = 6;
/** The gap's pick box is a little wider than the gap, so a click near either tip lands. */
const BREAK_GAP_PICK = BREAK_GAP + 0.2;
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
    // The street's top (0.02) sits under the wires' shadows (SHADOW_Y).
    const m = box(len + l.w, 0.02, l.w, streetMat, (l.ax + l.bx) / 2, 0.01, (l.ay + l.by) / 2);
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
  const blockMesh = instanced(blocks.blocks, new MeshStandardMaterial({ color: BUILDING, roughness: 0.95 }));
  scene.add(blockMesh);
  // Not a Group: the scene-level tests find a node's group as the scene child of type Group at its position, and this sits at the origin.
  const modelGroup = new Object3D();
  modelGroup.name = "models";
  scene.add(modelGroup);
  const placeMats = new Map<string, MeshStandardMaterial>();
  for (const p of blocks.places) {
    const mat = new MeshStandardMaterial({ color: PLACE, roughness: 0.9, emissive: WARM, emissiveIntensity: 0 });
    placeMats.set(p.lamp, mat);
    for (const b of p.boxes) scene.add(box(b.w, b.h, b.d, mat, b.x, b.h / 2, b.z));
  }

  // Poles: one per intermediate attachment point.
  // Each pole carries a cross-arm turned across its run, so it reads from above. A dark foot disc marks every pole and node post.
  const poleList: Vec3[] = [];
  const poleYaw: number[] = [];
  for (const r of runs) {
    const a = r.attach[0]!;
    const b = r.attach[r.attach.length - 1]!;
    // The arm's long axis (local x) turned to the run's perpendicular in the ground plane.
    const yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z));
    for (let i = 1; i < r.attach.length - 1; i++) {
      poleList.push(r.attach[i]!);
      poleYaw.push(yaw);
    }
  }
  const woodMat = new MeshStandardMaterial({ color: POLE_WOOD, roughness: 1 });
  const poles = new InstancedMesh(new CylinderGeometry(0.07, 0.09, POLE_HEIGHT, 8), woodMat, Math.max(poleList.length, 1));
  const arms = new InstancedMesh(new BoxGeometry(0.7, 0.08, 0.08), woodMat, Math.max(poleList.length, 1));
  poleList.forEach((p, i) => {
    mat4.makeTranslation(p.x, POLE_HEIGHT / 2, p.z);
    poles.setMatrixAt(i, mat4);
    mat4.makeRotationY(poleYaw[i]!).setPosition(p.x, POLE_HEIGHT - 0.08, p.z);
    arms.setMatrixAt(i, mat4);
  });
  poles.count = poleList.length;
  arms.count = poleList.length;
  const poleSpots: PoleSpot[] = poleList.map((p, i) => ({ x: p.x, z: p.z, yaw: poleYaw[i]! }));
  const lampSlots: { id: string; group: Group; post: Mesh }[] = [];
  scene.add(poles, arms);
  const footSpots = [...poleList.map((p) => [p.x, p.z] as const), ...puzzle.nodes.filter((n) => n.type !== "feed").map((n) => [n.pos[0], n.pos[1]] as const)];
  const feet = new InstancedMesh(new CircleGeometry(0.15, 12).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: FOOT }), Math.max(footSpots.length, 1));
  footSpots.forEach((p, i) => {
    mat4.makeTranslation(p[0], 0.022, p[1]);
    feet.setMatrixAt(i, mat4);
  });
  feet.count = footSpots.length;
  scene.add(feet);

  // Wires: a tube, an invisible pick line, a flat shadow on the street, a bead that carries the direction of flow, and a spark for a break.
  // A line with a damaged cable in the file also has two hanging halves and their shadows, shown instead of the whole while it sparks.
  const beadGeo = new SphereGeometry(0.075, 8, 6);
  const sparkGeo = new SphereGeometry(0.11, 8, 6);
  const frontGeo = new SphereGeometry(0.13, 8, 6);
  const wires: WireView[] = [];
  const wireById = new Map<string, WireView>();
  const wireParts = new Map<string, WireParts>();
  const pickMat = new LineBasicMaterial({ visible: false });
  const pickBoxMat = new MeshBasicMaterial({ visible: false });
  const shadowMat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false });
  const lineIndex = new Map(puzzle.lines.map((l, i) => [l.id, i] as const));
  const V = (p: Vec3): Vector3 => new Vector3(p.x, p.y, p.z);
  const tube = (pts: readonly Vec3[], radius: number, mat: Material): Mesh => {
    const curve = new CatmullRomCurve3(pts.map(V), false, "catmullrom", 0.1);
    return new Mesh(new TubeGeometry(curve, pts.length * 2, radius, WIRE_RADIAL, false), mat);
  };
  /** A flat strip on the street under a polyline: its x and z, at SHADOW_Y. */
  const shadowStrip = (pts: readonly Vec3[], id: string): Mesh => {
    const sh = shadowOf(pts);
    const pos: number[] = [];
    const idx: number[] = [];
    sh.forEach((p, i) => {
      const a = sh[Math.max(i - 1, 0)]!;
      const b = sh[Math.min(i + 1, sh.length - 1)]!;
      let tx = b.x - a.x;
      let tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;
      pos.push(p.x - tz * 0.05, p.y, p.z + tx * 0.05, p.x + tz * 0.05, p.y, p.z - tx * 0.05);
      if (i > 0) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const m = new Mesh(g, shadowMat);
    m.userData["shadowOf"] = id;
    return m;
  };
  runs.forEach((run, i) => {
    const pts = runPoints(run);
    const hadFault = puzzle.faults.some((f) => f.at === run.id);
    const wholeMat = new MeshStandardMaterial({ color: DEAD_WIRE, roughness: 0.6, emissive: LIVE_GLOW, emissiveIntensity: 0 });
    const whole = tube(pts, WIRE_RADIUS, wholeMat);
    const overlayMat = new MeshStandardMaterial({ color: LIVE_WIRE, roughness: 0.6, emissive: LIVE_GLOW, emissiveIntensity: 0 });
    const overlay = tube(pts, WIRE_RADIUS * 1.12, overlayMat);
    overlay.visible = false;
    overlay.geometry.setDrawRange(0, 0);
    scene.add(whole, overlay);
    const shadows = [shadowStrip(pts, run.id)];
    const pick = new Line(new BufferGeometry().setFromPoints(pts.map(V)), pickMat);
    pick.userData["pickKind"] = "wire";
    pick.userData["pickId"] = run.id;
    scene.add(pick);

    let halves: [Mesh, Mesh] | null = null;
    let halfMats: [MeshStandardMaterial, MeshStandardMaterial] | null = null;
    let hPts: [Vec3[], Vec3[]] | null = null;
    const breakTargets: Object3D[] = [];
    const brk = run.brk;
    if (brk) {
      hPts = brk.halves;
      halfMats = [0, 1].map(() => new MeshStandardMaterial({ color: DEAD_WIRE, roughness: 0.6, emissive: LIVE_GLOW, emissiveIntensity: 0 })) as [MeshStandardMaterial, MeshStandardMaterial];
      halves = [tube(brk.halves[0], WIRE_RADIUS, halfMats[0]), tube(brk.halves[1], WIRE_RADIUS, halfMats[1])];
      for (const h of halves) {
        h.visible = false;
        scene.add(h);
      }
      for (const half of brk.halves) {
        const sh = shadowStrip(half, run.id);
        sh.visible = false;
        shadows.push(sh);
      }
      // Pick targets: a line along each hanging end and a box over the gap. All answer to the line, but only while the break shows.
      for (const end of brk.ends) {
        const l = new Line(new BufferGeometry().setFromPoints(end.map(V)), pickMat);
        breakTargets.push(l);
      }
      const a = brk.ends[0][0]!;
      const b = brk.ends[1][0]!;
      const box3 = new Mesh(new BoxGeometry(BREAK_GAP_PICK, POLE_HEIGHT - brk.gap.y, 0.3), pickBoxMat);
      box3.position.set(brk.gap.x, (POLE_HEIGHT + brk.gap.y) / 2, brk.gap.z);
      box3.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      breakTargets.push(box3);
      for (const t of breakTargets) {
        t.userData["pickKind"] = "wire";
        t.userData["pickId"] = run.id;
        t.userData["pickOff"] = true;
        scene.add(t);
      }
    }
    for (const sh of shadows) scene.add(sh);
    const bead = new Mesh(beadGeo, new MeshBasicMaterial({ color: 0xe6fbff }));
    bead.visible = false;
    const front = new Mesh(frontGeo, new MeshBasicMaterial({ color: WARM }));
    front.visible = false;
    const spark = new Mesh(sparkGeo, new MeshBasicMaterial({ color: 0xffd9a0 }));
    spark.visible = false;
    scene.add(bead, front, spark);
    const parts: WireParts = { whole, wholeMat, halves, halfMats, overlay, front, bead, spark, shadows, breakTargets };
    wireParts.set(run.id, parts);
    const w: WireView = {
      run,
      index: lineIndex.get(run.id) ?? i,
      hadFault,
      parts,
      overlayMat,
      total: overlay.geometry.index!.count,
      pts,
      cum: cumulative(pts),
      hPts,
      hCum: hPts ? [cumulative(hPts[0]), cumulative(hPts[1])] : null,
      phase: hash01(i + 1),
    };
    wires.push(w);
    wireById.set(run.id, w);
  });

  // Nodes.
  const poolTex = poolTexture();
  // Covers the node's body and the wire's attachment point above it.
  const pickGeo = new BoxGeometry(0.6, 0.9, 0.6);
  // Relight state the lamps read: the plan while one runs (else null), its clock, and the ignition scratch.
  let plan: RelightPlan | null = null;
  let relT = 0;
  const ign: LampIgnition = { on: false, flareAge: -1 };
  const flareGeo = new RingGeometry(0.85, 1, 40);
  const nodeIndexOf = new Map(puzzle.nodes.map((n, i) => [n.id, i] as const));
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
    pick.position.set(n.pos[0], NODE_BODY_Y, n.pos[1]);
    pick.userData["pickKind"] = "node";
    pick.userData["pickId"] = n.id;
    scene.add(pick);

    const body = metal();
    const post = cyl(0.07, POLE_HEIGHT, woodMat, 0, POLE_HEIGHT / 2, 0);
    let update: NodeView["update"];
    const parts: NodeParts = {};
    parts_.set(n.id, parts);

    switch (n.type) {
      case "feed": {
        const bodyMat = metal(0x3b475f);
        const base = box(1.1, 0.6, 1.1, bodyMat, 0, 0.3, 0);
        parts.body = base;
        g.add(base);
        g.add(box(0.7, 0.5, 0.7, bodyMat, 0, 0.85, 0));
        // The roof bushings reach the wires' height.
        const bushH = POLE_HEIGHT - 1.1;
        g.add(cyl(0.05, bushH, bodyMat, -0.2, 1.1 + bushH / 2, 0), cyl(0.05, bushH, bodyMat, 0.2, 1.1 + bushH / 2, 0));
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
        const bodyMesh = box(BREAKER_BODY[0], BREAKER_BODY[1], BREAKER_BODY[2], body, 0, NODE_BODY_Y, 0);
        g.add(post, bodyMesh);
        g.add(ribbonTag(0, NODE_BODY_Y, BREAKER_BODY[2] / 2 + 0.02));
        parts.body = bodyMesh;
        // The lever stands up for ON and lies flat toward the camera for OFF.
        const pivot = new Group();
        pivot.position.set(0, NODE_BODY_Y + BREAKER_BODY[1] / 2, 0);
        const lever = new Mesh(new BoxGeometry(0.09, BREAKER_LEVER, 0.09).translate(0, BREAKER_LEVER / 2, 0), new MeshStandardMaterial({ color: 0xf2f5fb, emissive: 0xf2f5fb, emissiveIntensity: 0.35 }));
        lever.userData["length"] = BREAKER_LEVER;
        pivot.add(lever);
        g.add(pivot);
        parts.lever = lever;
        update = (look, _s, t) => {
          pivot.rotation.x = look.closed === false ? BREAKER_OFF_ANGLE : 0;
          body.emissiveIntensity = look.closed !== false && look.live ? 0.4 + 0.2 * Math.sin(t * 2) : 0;
        };
        break;
      }
      case "switch": {
        const drumMat = metal();
        const drum = new Mesh(new CylinderGeometry(0.32, 0.32, 0.4, 16), drumMat);
        drum.position.y = POLE_HEIGHT - 0.25;
        g.add(post, drum);
        g.add(ribbonTag(0, POLE_HEIGHT - 0.2, 0.33));
        const pivot = new Group();
        pivot.position.set(0, POLE_HEIGHT, 0);
        const lever = new Mesh(new BoxGeometry(0.1, 0.1, SWITCH_LEVER).translate(0, 0, SWITCH_LEVER / 2), new MeshStandardMaterial({ color: 0xf2f5fb, emissive: 0xf2f5fb, emissiveIntensity: 0.35 }));
        lever.userData["length"] = SWITCH_LEVER;
        pivot.add(lever);
        // A dim stub toward the other output.
        const stubPivot = new Group();
        stubPivot.position.set(0, POLE_HEIGHT, 0);
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
        const fuseBody = box(0.6, 0.5, 0.4, body, 0, NODE_BODY_Y, 0);
        parts.body = fuseBody;
        g.add(post, fuseBody);
        const fuseMat = new MeshStandardMaterial({ color: 0xe8e2c8, emissive: WARM, emissiveIntensity: 0 });
        const fuse = cyl(0.07, 0.3, fuseMat, 0, NODE_BODY_Y, 0.24);
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
        // The ignition flare of a Relight: a ring that grows on the ground and fades.
        const flareMat = new MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
        const flare = new Mesh(flareGeo, flareMat);
        flare.rotation.x = -Math.PI / 2;
        flare.position.y = 0.06;
        flare.visible = false;
        parts.flare = flare;
        g.add(post, head, light, pool, halo, flare);
        lampSlots.push({ id: n.id, group: g, post });
        const nodeIdx = nodeIndexOf.get(n.id) ?? 0;
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
        update = (_look, state, t) => {
          // In a Relight the lamp is dark until the power reaches it, then snaps fully lit (no brownout on a win) and flares.
          let b: number;
          let flareAge = -1;
          if (plan) {
            lampIgnition(plan, state, n.id, nodeIdx, relT, ign);
            b = ign.on ? 1 : 0;
            flareAge = ign.flareAge;
          } else {
            b = lampBrightness(state, n.id, idx, t);
          }
          const flaring = flareAge >= 0 && flareAge < FLARE_SECONDS;
          const f = flaring ? flareAge / FLARE_SECONDS : 1;
          headMat.emissiveIntensity = 2.2 * b;
          headMat.color.setHex(b > 0 ? 0xfff3c9 : 0x3a4152);
          light.intensity = 5 * b;
          poolMat.opacity = 0.9 * b;
          haloMat.opacity = 0.8 * b;
          halo.visible = b > 0;
          const haloSize = 1.3 * (flaring ? 1 + (1 - f) : 1);
          halo.scale.set(haloSize, haloSize, 1);
          flare.visible = flaring;
          if (flaring) {
            flare.scale.setScalar(0.3 + 1.2 * f);
            flareMat.opacity = 1 - f;
          }
          if (starFill) starFill.visible = b > 0;
        };
        break;
      }
      default: {
        // A battery: a plain box on a post.
        g.add(post, box(0.5, 0.4, 0.4, body, 0, NODE_BODY_Y, 0));
        update = (look) => {
          body.emissiveIntensity = look.live ? 0.4 : 0;
        };
      }
    }
    views.push({ id: n.id, index: nodeIndexOf.get(n.id) ?? 0, group: g, update });
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
    if (n.type === "feed") addCaption(n.id, x, POLE_HEIGHT + 0.15, z, FEED_FONT_PX, true, 0, false);
    else if (n.type === "breaker") addCaption(n.id, x, NODE_BODY_Y + BREAKER_BODY[1] / 2 + BREAKER_LEVER + 0.12, z, CAPTION_FONT_PX, false, 0, false);
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
  let lastT = NaN;
  const clock = createRelightClock(puzzle);
  const placeViews = blocks.places.map((p) => ({ lamp: p.lamp, mat: placeMats.get(p.lamp)!, index: nodeIndexOf.get(p.lamp) ?? 0, glow: 0 }));

  /** The dead look: dull, or "new cable" blue if it was damaged and is mended. `boost` is the hover lift. */
  const deadLook = (mat: MeshStandardMaterial, repaired: boolean, boost: number): void => {
    mat.color.setHex(repaired ? REPAIRED_WIRE : DEAD_WIRE);
    mat.emissive.setHex(LIVE_GLOW);
    mat.emissiveIntensity = boost;
  };
  /** The live look: bright and breathing, so it reads by motion as well as colour. */
  const liveLook = (mat: MeshStandardMaterial, w: WireView, t: number, boost: number): void => {
    mat.color.setHex(LIVE_WIRE);
    mat.emissive.setHex(LIVE_GLOW);
    mat.emissiveIntensity = 0.9 + 0.45 * Math.sin(t * 1.8 + w.phase * 6) + boost;
  };
  const hasFaultAt = (state: GridState, id: string): boolean => {
    for (const f of state.faults) if (f.at === id) return true;
    return false;
  };
  const setBreakShown = (p: WireParts, shown: boolean): void => {
    p.whole.visible = !shown;
    if (p.halves) {
      p.halves[0].visible = shown;
      p.halves[1].visible = shown;
    }
    for (let i = 0; i < p.shadows.length; i++) p.shadows[i]!.visible = i === 0 ? !shown : shown;
    for (const o of p.breakTargets) o.userData["pickOff"] = !shown;
  };

  function updateWire(w: WireView, state: GridState, hover: string | null, t: number): void {
    const p = w.parts;
    const id = w.run.id;
    const boost = hover === id ? 0.5 : 0;
    const repaired = w.hadFault && !hasFaultAt(state, id);
    // Within a Relight, how much of the line is lit; 1 outside one.
    const frac = plan ? lineFraction(plan, w.index, relT) : 1;
    const sparking = p.halves !== null && w.hPts !== null && w.hCum !== null && state.sparking.has(id);
    setBreakShown(p, sparking);

    if (sparking) {
      // A cut cable: live up to the break from the end the current enters, dead beyond, and a spark in the gap.
      const live = state.flowFrom.get(id) === w.run.to ? 1 : 0;
      const lit = frac > 0;
      const mats = p.halfMats!;
      if (lit && live === 0) liveLook(mats[0], w, t, boost);
      else deadLook(mats[0], false, boost);
      if (lit && live === 1) liveLook(mats[1], w, t, boost);
      else deadLook(mats[1], false, boost);
      const tip = w.hPts![live][w.hPts![live].length - 1]!;
      p.spark.visible = lit;
      p.spark.position.set(tip.x, tip.y, tip.z);
      p.spark.scale.setScalar(0.6 + hash01(Math.floor(t * 18) + 3));
      p.overlay.visible = false;
      p.overlay.geometry.setDrawRange(0, 0);
      p.front.visible = false;
      p.bead.visible = lit;
      if (lit) {
        pointAlong(w.hPts![live], w.hCum![live], (t * 0.4 + w.phase) % 1, beadAt);
        p.bead.position.set(beadAt.x, beadAt.y, beadAt.z);
      }
      return;
    }

    p.spark.visible = false;
    if (!state.powered.has(id)) {
      deadLook(p.wholeMat, repaired, boost);
      p.overlay.visible = false;
      p.overlay.geometry.setDrawRange(0, 0);
      p.bead.visible = false;
      p.front.visible = false;
      return;
    }
    // The bead leaves the node the current enters from, so direction reads without colour.
    const forward = state.flowFrom.get(id) !== w.run.to;
    const f = (t * 0.4 + w.phase) % 1;
    if (!plan) {
      liveLook(p.wholeMat, w, t, boost);
      liveLook(w.overlayMat, w, t, boost);
      p.overlay.visible = true;
      p.overlay.geometry.setDrawRange(0, w.total);
      p.front.visible = false;
      p.bead.visible = true;
      pointAlong(w.pts, w.cum, forward ? f : 1 - f, beadAt);
      p.bead.position.set(beadAt.x, beadAt.y, beadAt.z);
      return;
    }
    // A Relight: the whole wire stays dull while the live look grows from the flow-from end, with a warm head at its front.
    deadLook(p.wholeMat, repaired, boost);
    const count = Math.floor((frac * w.total) / 3) * 3;
    p.overlay.visible = count > 0;
    if (count > 0) {
      liveLook(w.overlayMat, w, t, boost);
      p.overlay.geometry.setDrawRange(forward ? 0 : w.total - count, count);
    } else {
      p.overlay.geometry.setDrawRange(0, 0);
    }
    const head = frac > 0 && frac < 1;
    p.front.visible = head;
    if (head) {
      pointAlong(w.pts, w.cum, forward ? frac : 1 - frac, beadAt);
      p.front.position.set(beadAt.x, beadAt.y, beadAt.z);
    }
    // The travelling bead runs only inside the lit part.
    p.bead.visible = frac > 0;
    if (frac > 0) {
      const g = f * frac;
      pointAlong(w.pts, w.cum, forward ? g : 1 - g, beadAt);
      p.bead.position.set(beadAt.x, beadAt.y, beadAt.z);
    }
  }

  return {
    scene,
    captions: captionSprites,
    parts: parts_,
    slots: { poles: { spots: poleSpots, placeholders: [poles, arms] }, lamps: lampSlots, blocks: { list: blocks.blocks, placeholder: blockMesh }, models: modelGroup },
    setViewport(_width, height, fovDeg) {
      unit = scaleForPx(1, height, fovDeg);
      for (const c of capViews) c.cs.setUnit(unit);
      for (const b of barViews) b.bar.setUnit(unit);
    },
    wires: wireParts,
    places: placeMats,
    poles: { poles, arms },
    update(state, hover, t, relightT) {
      plan = clock.update(state, relightT);
      relT = relightT ?? 0;
      if (hover !== lastHover) {
        const prev = lastHover ? hoverable.get(lastHover) : undefined;
        if (prev) prev.scale.setScalar(1);
        const next = hover ? hoverable.get(hover) : undefined;
        if (next) next.scale.setScalar(1.12);
        lastHover = hover;
      }
      const recs = captionSet.update(state);
      for (const v of views) {
        nodeLookInto(state, v.id, look);
        // In a Relight a node looks live only once the power has reached it.
        if (plan && look.live && !nodeArrived(plan, v.index, relT)) look.live = false;
        v.update(look, state, t, recs.get(v.id)!);
      }
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
      for (const w of wires) updateWire(w, state, hover, t);
      // A place's glow eases toward 2D's target: dark in a brownout and before the Relight reaches its lamp.
      const dt = lastT === lastT ? t - lastT : -1;
      lastT = t;
      for (const p of placeViews) {
        p.glow = placeGlowStep(p.glow, p.lamp, state, plan, p.index, relT, dt);
        p.mat.emissiveIntensity = 0.5 * p.glow;
      }
    },
    dispose() {
      const mats = new Set<Material>();
      // A model clone shares its geometry and textures with the page's cache, so its subtree is left alone.
      const visit = (o: Object3D): void => {
        if (o.userData["sharedModel"] === true) return;
        const m = o as Mesh;
        m.geometry?.dispose();
        const mm = m.material as Material | Material[] | undefined;
        if (Array.isArray(mm)) mm.forEach((x) => mats.add(x));
        else if (mm) mats.add(mm);
        // A caption's texture belongs to its sprite material.
        const map = (mm as SpriteMaterial | undefined)?.map;
        if (map && o instanceof Sprite) map.dispose();
        for (const c of o.children) visit(c);
      };
      visit(scene);
      mats.forEach((m) => m.dispose());
      poolTex.dispose();
    },
  };
}
