/**
 * Builds the three scene of the town section from the pure layout (ticket 037) and updates it from GridState.
 * No WebGL context is needed to build it (the picking tests do), and nothing here reads input or the grid.
 * Light never depends on colour alone: live wires also breathe and carry a bead that moves away from the feed,
 * a faulted cable sparks and flickers, a lit lamp has a light and a pool on the ground, a switch's lever points down its output.
 */

import { AdditiveBlending, LineDashedMaterial, LineLoop, Shape, ShapeGeometry, Sprite, SpriteMaterial, Float32BufferAttribute, BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, CylinderGeometry, DataTexture, DoubleSide, Group, InstancedMesh, Line, LineBasicMaterial, LinearFilter, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PointLight, Quaternion, RGBAFormat, RingGeometry, Scene, SphereGeometry, TubeGeometry, UnsignedByteType, Vector3, CatmullRomCurve3, type Material, } from "three";
import type { GridNode, Puzzle } from "../core";
import type { GridState } from "../grid";
import { hash01 } from "../render/motion";
import { FLARE_SECONDS, type RelightPlan } from "../render/relight";
import { BREAK_GAP, NODE_BODY_Y, PHASE_OFFSET, SAG_SEGMENTS, WIRE_RADIUS, canLayout, cumulative, dropLayout, pointAlong, runPoints, shadowOf, wireLayout, type Can, type Drop, type WireRun } from "./layout";
import { POLE_HEIGHT, type Vec3, KERB_H, LOT_TYPE_NAMES, ROAD_W, STOREY_M, type Lot, type LotType, type Pt, type TerraceRun } from "./kitunits";
import { townLayout, type Town } from "./town";
import { WORLD_PER_METRE, atFront } from "./models";
import { ROOF_SHADE, TINTS, pickPlaceholders } from "./placeholders";
import { lampBrightness, nodeLookInto, type NodeLook } from "./look";
import { applyLightMode, addSurface, newLightOwners, nightLightsOn, type LightOwners } from "./lightrig";
import { createRelightClock, lampIgnition, lineFraction, nodeArrived, placeGlowStep, type LampIgnition } from "./relight3d";
import { CAPTION_FONT_PX, FEED_FONT_PX, captionsFor, scaleForPx, type NodeCaption } from "./captions";
import { createBarSprite, createCaptionSprite, defaultTextSurface, type BarSprite, type CaptionSprite, type TextSurfaceFactory } from "./text";
import { GROUND, YARD, STREET, PAVEMENT, KERB, YARD_H, PAVEMENT_Y } from "./kitunits";

export interface SceneBundle {
  scene: Scene;
  /** The code-drawn materials and night-only parts the light rig puts in a mode (ticket 060). */
  lightOwners: LightOwners;
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
  /** The streets, drawn from the town layout (ticket 041 B): one mesh or instance per road, kerb and pad. */
  streets: StreetParts;
  /** What hangs on the poles (ticket 041 C): insulators, transformer cans and the service drops. All scenery: none can be picked. */
  hardware: PoleHardware;
  /** The canvas size in css px and the camera's vertical field of view, so captions keep a fixed pixel size. */
  setViewport(width: number, height: number, fovDeg: number): void;
  dispose(): void;
}

/** The pole hardware drawn in code (ticket 041 C). Every mesh here has its raycast turned off. */
export interface PoleHardware {
  /** Three per intermediate pole, under each conductor's attachment point, run by run, pole by pole, conductor by conductor. */
  insulators: InstancedMesh;
  /** One per pole that carries a drop. */
  cans: InstancedMesh;
  /** One thin wire per service drop. */
  drops: InstancedMesh;
  canList: readonly Can[];
  dropList: readonly Drop[];
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
  /**
   * The town's lots (never a lamp's place), and the placeholder buildings that stand on them (ticket 041 B): `placeholder` holds
   * one group per lot type (`byType`), so a type with models can hide its placeholders and a type without keeps them.
   */
  blocks: { list: readonly Lot[]; placeholder: Object3D; byType: Readonly<Record<LotType, Object3D>>; /** The terrace runs of the town's outer blocks (051 B; absent in a hand-made bundle): what 051 D packs into stacks. */ terraces?: readonly TerraceRun[] };
  /** Pole and building clones go here. Anything marked `userData.sharedModel` is not disposed with the scene. */
  models: Object3D;
}

/** A road's dashed centre line. */
export const CENTRE_LINE = 0x7a7863;
export const PLACE = 0x3a4a68;
/** Weathered wood for poles, posts and cross-arms: at least 3:1 luminance contrast against the street, so it reads by brightness. */
export const POLE_WOOD = 0x8b6b4a;
export const FOOT = 0x080b11;
export const METAL = 0x5d6b84;
export const DEAD_WIRE = 0x2a3445;
export const LIVE_WIRE = 0x4fd1ff;
export const LIVE_GLOW = 0x2aa9d8;
/** A cable that was damaged and is mended but not live: 2D's LINE_REPAIRED ("new cable"). */
export const REPAIRED_WIRE = 0x5a6f92;
export const WARM = 0xffd37a;
export const TARGET = 0xffe9a8;
export const SCORCH = 0x1a0f0c;

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
  /** How many conductors the run has: three on a run with an intermediate pole, one without. Each mesh below holds all of them. */
  conductors: number;
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
  /** The whole wire's shadow, then each half's (a broken run only). Each has one strip per conductor. */
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
  /** Index count of the overlay tubes (all conductors), and the step its draw range grows by: one quad of every conductor. */
  total: number;
  quantum: number;
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
  /** Test only (ticket 051 B): lay the town out without terrace rows (`townLayout(puzzle, { terraces: false })`), to compare with the terrace town. Default true. */
  terraces?: boolean;
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
export const RIBBON = 0xff3df0;

// ---- the town: streets and placeholder buildings (ticket 041 B) ----

export const ROAD_H = 0.014;
export const PAD_Y = 0.0145;
export const DASH_Y = 0.0155;
/** A kerb's width, and a centre line's dashes: length, gap, width, and how far they keep from a road's ends. */
export const KERB_W = 0.07;
export const DASH_LEN = 0.4;
export const DASH_GAP = 0.4;
export const DASH_W = 0.05;
export const DASH_INSET = ROAD_W / 2 + 0.35;
/** A band round a placeholder at each storey line: its height (metres) and how far it stands out of the wall (a factor on the footprint). */
const BAND_M = 0.5;
const BAND_OUT = 1.03;
const ROOF_OUT = 1.04;
const BAND_LIGHT = 1.6;

/** What the scene holds of the streets, for tests and the renderer. */
export interface StreetParts {
  /** One instance per outer city block: the open ground inside its pavements. */
  yards: InstancedMesh;
  /** One instance per road. */
  roads: InstancedMesh;
  /** One instance per kerb segment. */
  kerbs: InstancedMesh;
  /** One instance per dash of a ring or grid road's centre line (a road wider than 1). */
  dashes: InstancedMesh;
  /** Every pavement band in one mesh (a fan of triangles per band). */
  pavements: Mesh;
  /** One mesh per junction pad that has an area (three or more points). */
  pads: readonly Mesh[];
}

export interface Dash {
  x: number;
  z: number;
  /** The rotation about y that lays the dash along its road. */
  yaw: number;
}

/** Is (x, z) inside the convex polygon `poly`, or within `margin` outside it? Either winding. */
function inConvex(poly: readonly Pt[], x: number, z: number, margin: number): boolean {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    area += a.x * b.z - b.x * a.z;
  }
  const sign = area >= 0 ? 1 : -1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const d = (sign * ((b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x))) / len;
    if (d < -margin) return false;
  }
  return true;
}

/**
 * The dashes of the ring and grid roads' centre lines, DASH_LEN long with DASH_GAP between, centred along the road and kept DASH_INSET
 * from its ends. A dash that would lie on another road or a pad (where streets cross) is left out. Pure.
 */
export function dashLayout(town: Town): Dash[] {
  const out: Dash[] = [];
  const pads = town.pads.filter((p) => p.pts.length >= 3);
  for (const r of town.roads) {
    if ((r.kind !== "ring" && r.kind !== "grid") || r.w <= 1) continue;
    const len = Math.hypot(r.bx - r.ax, r.bz - r.az);
    const room = len - 2 * DASH_INSET;
    if (room < DASH_LEN) continue;
    const n = Math.floor((room + DASH_GAP) / (DASH_LEN + DASH_GAP));
    const span = n * DASH_LEN + (n - 1) * DASH_GAP;
    const ux = (r.bx - r.ax) / len;
    const uz = (r.bz - r.az) / len;
    const yaw = -Math.atan2(uz, ux);
    for (let i = 0; i < n; i++) {
      const c = (len - span) / 2 + i * (DASH_LEN + DASH_GAP) + DASH_LEN / 2;
      const cx = r.ax + ux * c;
      const cz = r.az + uz * c;
      const probes: readonly (readonly [number, number])[] = [
        [cx, cz],
        [cx - (ux * DASH_LEN) / 2, cz - (uz * DASH_LEN) / 2],
        [cx + (ux * DASH_LEN) / 2, cz + (uz * DASH_LEN) / 2],
      ];
      const onOther = town.roads.some((o) => o !== r && probes.some(([x, z]) => inConvex(o.corners, x, z, 0.12))) || pads.some((p) => probes.some(([x, z]) => inConvex(p.pts, x, z, 0.12)));
      if (!onOther) out.push({ x: cx, z: cz, yaw });
    }
  }
  return out;
}

/** Triangulate a convex polygon as a fan lying flat at height `y`, facing up (+y), whatever the polygon's winding. */
function fanInto(pts: readonly Pt[], y: number, pos: number[], idx: number[]): void {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    area += a.x * b.z - b.x * a.z;
  }
  // A triangle faces up when (z1 - z0)(x2 - x0) - (x1 - x0)(z2 - z0) > 0: that is a polygon of negative shoelace area in (x, z).
  const ordered = area > 0 ? [...pts].reverse() : pts;
  const base = pos.length / 3;
  for (const p of ordered) pos.push(p.x, y, p.z);
  for (let i = 1; i + 1 < ordered.length; i++) idx.push(base, base + i, base + i + 1);
}

/** A box with its base on y = 0 and its size 1 x 1 x 1, for instancing. */
const unitBox = (): BoxGeometry => new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

/** A gable roof: base 1 x 1 on y = 0, ridge along x at y = 1, flat-shaded. */
function pitchedRoofGeometry(): BufferGeometry {
  type V = [number, number, number];
  const A: V = [-0.5, 0, -0.5];
  const B: V = [0.5, 0, -0.5];
  const C: V = [0.5, 0, 0.5];
  const D: V = [-0.5, 0, 0.5];
  const R1: V = [-0.5, 1, 0];
  const R2: V = [0.5, 1, 0];
  const tris: V[] = [D, C, R2, D, R2, R1, B, A, R1, B, R1, R2, A, D, R1, C, B, R2];
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}

/** Place instance `i` of `im`: at (x, y, z), turned `yaw` about y, scaled (sx, sy, sz). */
function setInstance(im: InstancedMesh, scratch: Object3D, i: number, x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number): void {
  scratch.position.set(x, y, z);
  scratch.rotation.set(0, yaw, 0);
  scratch.scale.set(sx, sy, sz);
  scratch.updateMatrix();
  im.setMatrixAt(i, scratch.matrix);
}

function buildStreets(town: Town, scene: Scene): StreetParts {
  const o = new Object3D();
  const flat = (hex: number): MeshStandardMaterial => new MeshStandardMaterial({ color: hex, roughness: 1 });

  // Yards: the open ground in each outer block.
  const yards = new InstancedMesh(unitBox(), flat(YARD), Math.max(town.blocks.length, 1));
  town.blocks.forEach((b, i) => setInstance(yards, o, i, (b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2, 0, b.maxX - b.minX, YARD_H, b.maxZ - b.minZ));
  yards.count = town.blocks.length;

  // Roads: one instance each, its own length and width, laid along its centreline. The top (ROAD_H) is under the wires' shadows.
  const roads = new InstancedMesh(unitBox(), flat(STREET), Math.max(town.roads.length, 1));
  town.roads.forEach((r, i) => setInstance(roads, o, i, (r.ax + r.bx) / 2, 0, (r.az + r.bz) / 2, -Math.atan2(r.bz - r.az, r.bx - r.ax), Math.hypot(r.bx - r.ax, r.bz - r.az), ROAD_H, r.w));
  roads.count = town.roads.length;

  // Kerbs: a pale lip along an edge of a road, KERB_H high.
  const kerbs = new InstancedMesh(unitBox(), flat(KERB), Math.max(town.kerbs.length, 1));
  town.kerbs.forEach((k, i) => setInstance(kerbs, o, i, (k.ax + k.bx) / 2, 0, (k.az + k.bz) / 2, -Math.atan2(k.bz - k.az, k.bx - k.ax), Math.hypot(k.bx - k.ax, k.bz - k.az), KERB_H, KERB_W));
  kerbs.count = town.kerbs.length;

  // Centre lines.
  const dashList = dashLayout(town);
  const dashes = new InstancedMesh(unitBox(), flat(CENTRE_LINE), Math.max(dashList.length, 1));
  dashList.forEach((d, i) => setInstance(dashes, o, i, d.x, DASH_Y - 0.002, d.z, d.yaw, DASH_LEN, 0.002, DASH_W));
  dashes.count = dashList.length;

  // Pavements, all in one mesh.
  const pos: number[] = [];
  const idx: number[] = [];
  for (const p of town.pavements) if (p.pts.length >= 3) fanInto(p.pts, PAVEMENT_Y, pos, idx);
  const pg = new BufferGeometry();
  pg.setAttribute("position", new Float32BufferAttribute(pos, 3));
  pg.setIndex(idx);
  pg.computeVertexNormals();
  const pavements = new Mesh(pg, flat(PAVEMENT));

  // Junction pads, one mesh each, in the asphalt's colour.
  const padMat = flat(STREET);
  const pads: Mesh[] = [];
  for (const p of town.pads) {
    if (p.pts.length < 3) continue;
    const ppos: number[] = [];
    const pidx: number[] = [];
    fanInto(p.pts, PAD_Y, ppos, pidx);
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(ppos, 3));
    g.setIndex(pidx);
    g.computeVertexNormals();
    const m = new Mesh(g, padMat);
    m.userData["pad"] = p.id;
    pads.push(m);
  }

  for (const im of [yards, roads, kerbs, dashes]) {
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
  }
  scene.add(pavements, ...pads);
  return { yards, roads, kerbs, dashes, pavements, pads };
}

/** The placeholder buildings: per lot type, one group of instanced meshes (bodies, a band at each storey line, flat roofs, pitched roofs). */
function buildPlaceholders(lots: readonly Lot[]): { root: Object3D; byType: Record<LotType, Object3D> } {
  const specs = pickPlaceholders(lots);
  const root = new Object3D();
  root.name = "placeholders";
  const byType = {} as Record<LotType, Object3D>;
  const pitched = pitchedRoofGeometry();
  const wall = (): MeshStandardMaterial => new MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  const colour = new Color();
  const o = new Object3D();
  const put = (im: InstancedMesh, i: number, x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number, hex: number, k: number): void => {
    setInstance(im, o, i, x, y, z, yaw, sx, sy, sz);
    im.setColorAt(i, colour.setHex(hex).multiplyScalar(k));
  };
  const storeyH = STOREY_M * WORLD_PER_METRE;
  const bandH = BAND_M * WORLD_PER_METRE;
  // Terrace lots (051 B) have a group of their own, never hidden by a type's models: no model or stack stands on a terrace lot until 051 D.
  for (const type of [...LOT_TYPE_NAMES, "terrace"] as const) {
    const group = new Object3D();
    group.name = `placeholders:${type}`;
    const mine: number[] = [];
    lots.forEach((l, i) => {
      if (type === "terrace" ? l.terrace !== undefined : l.type === type && l.terrace === undefined) mine.push(i);
    });
    const bands = mine.reduce((n, i) => n + specs[i]!.storeys - 1, 0);
    const flats = mine.filter((i) => specs[i]!.roof === "flat");
    const slopes = mine.filter((i) => specs[i]!.roof === "pitched");
    const bodies = new InstancedMesh(unitBox(), wall(), Math.max(mine.length, 1));
    const bandMesh = new InstancedMesh(unitBox(), wall(), Math.max(bands, 1));
    const flatRoofs = new InstancedMesh(unitBox(), wall(), Math.max(flats.length, 1));
    const pitchedRoofs = new InstancedMesh(pitched, wall(), Math.max(slopes.length, 1));
    let b = 0;
    mine.forEach((li, k) => {
      const l = lots[li]!;
      const s = specs[li]!;
      const hex = TINTS[s.tint]!;
      // The body stands against its lot's front edge (one setback for every building), not centred on the lot.
      const at = atFront(l, s.d);
      put(bodies, k, at.x, 0, at.z, l.yaw, s.w, s.bodyH, s.d, hex, 1);
      for (let j = 1; j < s.storeys; j++) put(bandMesh, b++, at.x, j * storeyH - bandH / 2, at.z, l.yaw, s.w * BAND_OUT, bandH, s.d * BAND_OUT, hex, BAND_LIGHT);
    });
    flats.forEach((li, k) => {
      const l = lots[li]!;
      const s = specs[li]!;
      const at = atFront(l, s.d);
      put(flatRoofs, k, at.x, s.bodyH, at.z, l.yaw, s.w * ROOF_OUT, s.roofH, s.d * ROOF_OUT, TINTS[s.tint]!, ROOF_SHADE);
    });
    slopes.forEach((li, k) => {
      const l = lots[li]!;
      const s = specs[li]!;
      const at = atFront(l, s.d);
      put(pitchedRoofs, k, at.x, s.bodyH, at.z, l.yaw, s.w * ROOF_OUT, s.roofH, s.d * ROOF_OUT, TINTS[s.tint]!, ROOF_SHADE);
    });
    bodies.count = mine.length;
    bandMesh.count = bands;
    flatRoofs.count = flats.length;
    pitchedRoofs.count = slopes.length;
    for (const im of [bodies, bandMesh, flatRoofs, pitchedRoofs]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      group.add(im);
    }
    if (type !== "terrace") byType[type] = group;
    root.add(group);
  }
  return { root, byType };
}

// ---- poles, conductors and drops (ticket 041 C) ----

/** The placeholder cross-arm: at least 2 x PHASE_OFFSET + 0.1 long. */
export const ARM_LEN = 0.7;
/** The arm's centre sits this far under the wire's height, so its top meets the insulators' feet (INSULATOR_H + half the arm's 0.08 height). */
const ARM_DROP = 0.16;
/** An insulator: a pale glazed grey-green post, this tall, standing on the arm under the conductor's attachment point. */
export const INSULATOR_H = 0.12;
export const INSULATOR = 0x8fa99a;
export const CAN = 0x7d8794;
const CAN_R = 0.06;
const CAN_H = 0.2;
export const DROP_COLOR = 0x39414f;
export const DROP_RADIUS = 0.012;

/** Indices in one radial quad of a tube (two triangles). */
const QUAD = 6;

/**
 * One geometry for every conductor of a run: a tube round each polyline, merged, with the index interleaved quad by quad across
 * the tubes (quad 0 of each, then quad 1 of each, ...). A draw range that grows by `QUAD * lines.length` indices then lights all
 * the conductors the same distance along, from either end. The polylines must have the same number of points.
 */
export function strandGeometry(lines: readonly (readonly Vec3[])[], radius: number): BufferGeometry {
  const tubes = lines.map((pts) => {
    const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(p.x, p.y, p.z)), false, "catmullrom", 0.1);
    return new TubeGeometry(curve, pts.length * 2, radius, WIRE_RADIAL, false);
  });
  if (tubes.length === 1) return tubes[0]!;
  const first = tubes[0]!;
  const vertices = first.getAttribute("position").count;
  const g = new BufferGeometry();
  for (const [name, size] of [["position", 3], ["normal", 3], ["uv", 2]] as const) {
    const data = new Float32Array(vertices * size * tubes.length);
    tubes.forEach((t, k) => data.set(t.getAttribute(name).array as Float32Array, k * vertices * size));
    g.setAttribute(name, new Float32BufferAttribute(data, size));
  }
  const quads = first.index!.count / QUAD;
  const index = new Uint32Array(quads * QUAD * tubes.length);
  let w = 0;
  for (let q = 0; q < quads; q++) {
    tubes.forEach((t, k) => {
      for (let e = 0; e < QUAD; e++) index[w++] = t.index!.getX(q * QUAD + e) + k * vertices;
    });
  }
  g.setIndex(new BufferAttribute(index, 1));
  for (const t of tubes) t.dispose();
  return g;
}

/** A flat strip on the street under each polyline: its x and z, at SHADOW_Y, in one geometry. */
export function shadowGeometry(lines: readonly (readonly Vec3[])[]): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (const line of lines) {
    const sh = shadowOf(line);
    const base = pos.length / 3;
    sh.forEach((p, i) => {
      const a = sh[Math.max(i - 1, 0)]!;
      const b = sh[Math.min(i + 1, sh.length - 1)]!;
      let tx = b.x - a.x;
      let tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;
      pos.push(p.x - tz * 0.03, p.y, p.z + tx * 0.03, p.x + tz * 0.03, p.y, p.z - tx * 0.03);
      if (i > 0) {
        const k = base + 2 * i;
        idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
      }
    });
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export function buildScene(puzzle: Puzzle, opts: SceneOptions = {}): SceneBundle {
  const scene = new Scene();
  // The scene's global lights, background and tone mapping are the light rig's (ticket 060): night here, as the game is; a dev view may put the scene in day afterwards.
  const lightOwners = newLightOwners();
  applyLightMode(scene, null, "night", lightOwners);

  const town = townLayout(puzzle, { terraces: opts.terraces !== false });
  const runs = wireLayout(puzzle);
  const win = town.window;
  const mat4 = new Matrix4();

  // Ground, streets (roads, kerbs, pavements, junction pads, centre lines) and the yards of the outer blocks, all from the town layout.
  const ground = new Mesh(new BoxGeometry(win.maxX - win.minX + 12, 0.1, win.maxY - win.minY + 12), new MeshStandardMaterial({ color: GROUND, roughness: 1 }));
  ground.position.set((win.minX + win.maxX) / 2, -0.05, (win.minY + win.maxY) / 2);
  scene.add(ground);
  const streets = buildStreets(town, scene);
  addSurface(lightOwners, "ground", ground.material as Material);
  addSurface(lightOwners, "yard", streets.yards.material as Material);
  addSurface(lightOwners, "street", streets.roads.material as Material);
  addSurface(lightOwners, "kerb", streets.kerbs.material as Material);
  addSurface(lightOwners, "pavement", streets.pavements.material as Material);
  if (streets.pads[0]) addSurface(lightOwners, "street", streets.pads[0].material as Material);

  // Placeholder buildings on every lot, at one scale; a lamp's place is its own mesh so it can warm when lit.
  const placeholders = buildPlaceholders(town.lots);
  scene.add(placeholders.root);
  // Not a Group: the scene-level tests find a node's group as the scene child of type Group at its position, and this sits at the origin.
  const modelGroup = new Object3D();
  modelGroup.name = "models";
  scene.add(modelGroup);
  const placeMats = new Map<string, MeshStandardMaterial>();
  for (const p of town.places) {
    const mat = new MeshStandardMaterial({ color: PLACE, roughness: 0.9, emissive: WARM, emissiveIntensity: 0 });
    placeMats.set(p.lamp, mat);
    for (const bx of p.boxes) {
      const m = box(bx.w, bx.h, bx.d, mat, bx.x, bx.h / 2, bx.z);
      m.rotation.y = bx.yaw;
      scene.add(m);
    }
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
  const poles = new InstancedMesh(new CylinderGeometry(0.07, 0.09, POLE_HEIGHT - INSULATOR_H, 8), woodMat, Math.max(poleList.length, 1));
  const arms = new InstancedMesh(new BoxGeometry(ARM_LEN, 0.08, 0.08), woodMat, Math.max(poleList.length, 1));
  poleList.forEach((p, i) => {
    // The placeholder pole stops where the insulators start, so the centre conductor's insulator stands on it in plain view.
    mat4.makeTranslation(p.x, (POLE_HEIGHT - INSULATOR_H) / 2, p.z);
    poles.setMatrixAt(i, mat4);
    mat4.makeRotationY(poleYaw[i]!).setPosition(p.x, POLE_HEIGHT - ARM_DROP, p.z);
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

  // Hardware drawn in code: an insulator under each conductor's attachment on every intermediate pole, a transformer can on each pole
  // that feeds a building, and a thin service drop to each building. Scenery: nothing here is a pick target and nothing follows the state.
  const noRaycast = (o: Object3D): void => {
    o.raycast = () => {};
  };
  let insulatorCount = 0;
  for (const r of runs) if (r.attach.length > 2) insulatorCount += (r.attach.length - 2) * r.conductors.length;
  const insulators = new InstancedMesh(new CylinderGeometry(0.03, 0.045, INSULATOR_H, 8), new MeshStandardMaterial({ color: INSULATOR, roughness: 0.35 }), Math.max(insulatorCount, 1));
  let ii = 0;
  for (const r of runs) {
    for (let i = 1; i < r.attach.length - 1; i++) {
      for (const c of r.conductors) {
        const p = c[i * SAG_SEGMENTS]!;
        mat4.makeTranslation(p.x, p.y - INSULATOR_H / 2, p.z);
        insulators.setMatrixAt(ii++, mat4);
      }
    }
  }
  insulators.count = insulatorCount;
  const dropList = dropLayout(town, runs);
  const canList = canLayout(dropList, runs);
  const cans = new InstancedMesh(new CylinderGeometry(CAN_R, CAN_R, CAN_H, 10), new MeshStandardMaterial({ color: CAN, roughness: 0.6, metalness: 0.2 }), Math.max(canList.length, 1));
  canList.forEach((c, i) => {
    mat4.makeTranslation(c.x, c.y, c.z);
    cans.setMatrixAt(i, mat4);
  });
  cans.count = canList.length;
  const drops = new InstancedMesh(new CylinderGeometry(DROP_RADIUS, DROP_RADIUS, 1, 4).translate(0, 0.5, 0), new MeshStandardMaterial({ color: DROP_COLOR, roughness: 0.8 }), Math.max(dropList.length, 1));
  const up = new Vector3(0, 1, 0);
  const along = new Vector3();
  const turn = new Quaternion();
  const dropScale = new Vector3();
  const dropAt = new Vector3();
  dropList.forEach((d, i) => {
    along.set(d.to.x - d.from.x, d.to.y - d.from.y, d.to.z - d.from.z);
    const len = along.length();
    turn.setFromUnitVectors(up, along.divideScalar(len || 1));
    mat4.compose(dropAt.set(d.from.x, d.from.y, d.from.z), turn, dropScale.set(1, len, 1));
    drops.setMatrixAt(i, mat4);
  });
  drops.count = dropList.length;
  for (const im of [insulators, cans, drops]) {
    im.instanceMatrix.needsUpdate = true;
    noRaycast(im);
    scene.add(im);
  }
  const hardware: PoleHardware = { insulators, cans, drops, canList, dropList };

  // Wires: three conductors to a run (one when it has no intermediate pole), each a tube, with one invisible pick line along the centre
  // conductor, a flat shadow on the street, a bead that carries the direction of flow, and a spark for a break. A line with a damaged
  // cable in the file also has two hanging halves (every conductor cut in the same span) and their shadows, shown instead of the whole
  // while it sparks. The conductors of a run share one geometry and one material per part, so they always show the same look.
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
  const strands = (lines: readonly (readonly Vec3[])[], radius: number, mat: Material): Mesh => new Mesh(strandGeometry(lines, radius), mat);
  const shadowStrips = (lines: readonly (readonly Vec3[])[], id: string): Mesh => {
    const m = new Mesh(shadowGeometry(lines), shadowMat);
    m.userData["shadowOf"] = id;
    return m;
  };
  runs.forEach((run, i) => {
    const pts = runPoints(run);
    const hadFault = puzzle.faults.some((f) => f.at === run.id);
    const wholeMat = new MeshStandardMaterial({ color: DEAD_WIRE, roughness: 0.6, emissive: LIVE_GLOW, emissiveIntensity: 0 });
    const whole = strands(run.conductors, WIRE_RADIUS, wholeMat);
    const overlayMat = new MeshStandardMaterial({ color: LIVE_WIRE, roughness: 0.6, emissive: LIVE_GLOW, emissiveIntensity: 0 });
    const overlay = strands(run.conductors, WIRE_RADIUS * 1.12, overlayMat);
    overlay.visible = false;
    overlay.geometry.setDrawRange(0, 0);
    scene.add(whole, overlay);
    const shadows = [shadowStrips(run.conductors, run.id)];
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
      halves = [0, 1].map((h) => strands(brk.cuts.map((c) => c.halves[h]!), WIRE_RADIUS, halfMats![h]!)) as [Mesh, Mesh];
      for (const h of halves) {
        h.visible = false;
        scene.add(h);
      }
      for (const h of [0, 1]) {
        const sh = shadowStrips(brk.cuts.map((c) => c.halves[h]!), run.id);
        sh.visible = false;
        shadows.push(sh);
      }
      // Pick targets: a line along each hanging end (the centre conductor's) and a box over the gap, wide enough to hold every
      // conductor's gap. All answer to the line, but only while the break shows.
      for (const end of brk.ends) {
        const l = new Line(new BufferGeometry().setFromPoints(end.map(V)), pickMat);
        breakTargets.push(l);
      }
      const a = brk.ends[0][0]!;
      const b = brk.ends[1][0]!;
      const box3 = new Mesh(new BoxGeometry(BREAK_GAP_PICK, POLE_HEIGHT - brk.gap.y, 2 * (PHASE_OFFSET + 0.1)), pickBoxMat);
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
    const parts: WireParts = { conductors: run.conductors.length, whole, wholeMat, halves, halfMats, overlay, front, bead, spark, shadows, breakTargets };
    wireParts.set(run.id, parts);
    const w: WireView = {
      run,
      index: lineIndex.get(run.id) ?? i,
      hadFault,
      parts,
      overlayMat,
      total: overlay.geometry.index!.count,
      quantum: QUAD * run.conductors.length,
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
        // Night-only: a testing daylight (ticket 060) hides these and puts the light at 0.
        lightOwners.nightOnly.push(light, pool, halo, flare);
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
          // In a testing daylight (ticket 060) the lamp's light, pool, halo and flare are off; the head still warms.
          const nb = nightLightsOn(scene) ? b : 0;
          const nightFlaring = flaring && nb > 0;
          light.intensity = 5 * nb;
          poolMat.opacity = 0.9 * nb;
          haloMat.opacity = 0.8 * nb;
          halo.visible = nb > 0;
          const haloSize = 1.3 * (flaring ? 1 + (1 - f) : 1);
          halo.scale.set(haloSize, haloSize, 1);
          flare.visible = nightFlaring;
          if (nightFlaring) {
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
  for (const p of town.places) {
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
  const placeViews = town.places.map((p) => ({ lamp: p.lamp, mat: placeMats.get(p.lamp)!, index: nodeIndexOf.get(p.lamp) ?? 0, glow: 0 }));

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
    const count = Math.floor((frac * w.total) / w.quantum) * w.quantum;
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
    lightOwners,
    captions: captionSprites,
    parts: parts_,
    slots: { poles: { spots: poleSpots, placeholders: [poles, arms] }, lamps: lampSlots, blocks: { list: town.lots, placeholder: placeholders.root, byType: placeholders.byType, terraces: town.terraces }, models: modelGroup },
    streets,
    hardware,
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
