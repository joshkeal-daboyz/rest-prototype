/**
 * Ticket 071 B: the power kit, pure. Typed-in tables, the fit of a wire piece to any span, the poles' placement, the mix rule, the failing fixtures.
 * The GLBs under assets/private/out are read only inside the `it.skipIf(!have)` cases below, lazily, to re-measure the tables (Linux CI has none).
 * No WebGL, no timers.
 */

import { describe, expect, it } from "vitest";
import { closeSync, existsSync, openSync, readFileSync, readdirSync, readSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle } from "../core";
import { PHASE_OFFSET, SAG_RATIO, sagSpan, wireLayout } from "./layout";
import { POLE_HEIGHT, type Vec3 } from "./kitunits";
import { LADDER_LINE_SCALE, LADDER_STRAND_RADIUS, LINE_STRETCH_MAX, LINE_STRETCH_MIN, PALM_ACROSS_STRETCH, POWER_LINE, POWER_LINES, POWER_MIX, POWER_POLES, PowerKitError, anchorAcross, fitLine, ladderAcross, lineOf, lineOfKey, placePole, poleAt, poleAttachModel, poleOf, poleScaleFor, poleToWorld, transformPoint, type PowerLine, type PowerPole, } from "./powerkit";

const line = POWER_LINES[POWER_LINE]!;
const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const modelEnds = (p: PowerLine): [Vec3, Vec3] => [V(p.ends_m[0].across, p.ends_m[0].up, p.ends_m[0].along), V(p.ends_m[1].across, p.ends_m[1].up, p.ends_m[1].along)];
/** The centre line's lowest point in the piece's own frame (its mid, where the two lowest rings meet). */
const lowModel = (p: PowerLine): Vec3 => V(0, p.ends_m[0].up - p.sag * p.length_m, 0);
/** The centre line's rings, measured from the GLB (z, y), for the profile check. */
const RINGS: [number, number][] = [
  [-6.7437, 0.5798],
  [-5.0578, 0.319],
  [-3.3719, 0.162],
  [-0.8248, 0.0318],
  [0.8248, 0.0318],
  [3.3719, 0.162],
  [5.0578, 0.319],
  [6.7437, 0.5798],
];

// ---------------------------------------------------------------------------------------------------------------------------------------------------
describe("measured tables", () => {
  it("holds exactly the three picked poles and the one wire piece, keyed pack:name", () => {
    expect(Object.keys(POWER_POLES).sort()).toEqual([...POWER_MIX].sort());
    expect(POWER_MIX).toEqual([
      "apocalypse-power:SM_Prop_Powerpole_01",
      "palm-city-pack:SM_Prop_Powerpole_01",
      "palm-city-pack:SM_Prop_Powerpole_02",
    ]);
    expect(Object.keys(POWER_LINES)).toEqual(["city-pack:SM_Prop_Power_Cables_03"]);
    expect(POWER_LINE).toBe("city-pack:SM_Prop_Power_Cables_03");
    for (const [k, p] of Object.entries(POWER_POLES)) expect(p.key).toBe(k);
  });

  it("each pole carries three attachments, centre first, with the arm axis and insulators the pre-check found", () => {
    for (const p of Object.values(POWER_POLES)) {
      expect(p.attach_m).toHaveLength(3);
      expect(p.attach_m[1].across).toBeLessThan(p.attach_m[2].across);
      for (const a of p.attach_m) expect(a.up).toBeLessThanOrEqual(p.height_m);
    }
    const own = (k: string): boolean[] => POWER_POLES[k]!.attach_m.map((a) => a.ownInsulator);
    expect(own("apocalypse-power:SM_Prop_Powerpole_01")).toEqual([false, true, true]);
    expect(own("palm-city-pack:SM_Prop_Powerpole_01")).toEqual([true, true, true]);
    expect(own("palm-city-pack:SM_Prop_Powerpole_02")).toEqual([true, true, true]);
    expect(POWER_POLES["apocalypse-power:SM_Prop_Powerpole_01"]!.armAxis).toBe("z");
    for (const k of POWER_MIX.slice(1)) expect(POWER_POLES[k]!.armAxis).toBe("x");
    for (const p of Object.values(POWER_POLES)) {
      expect(p.along_m).toBeGreaterThanOrEqual(0.005);
      expect(p.along_m).toBeLessThanOrEqual(0.25);
    }
  });

  it("the wire piece is a single level strand whose ends run with its axis", () => {
    expect(line.conductors).toBe(1);
    expect(line.ends_m[1].along - line.ends_m[0].along).toBeCloseTo(line.length_m, 2);
    expect(line.ends_m[0].up).toBe(line.ends_m[1].up);
    expect(line.sag).toBeCloseTo(SAG_RATIO, 2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// The GLB re-measure: lazy, and skipped when the GLBs are absent.
const OUT = join("assets", "private", "out");
const have = ["apocalypse-power", "palm-city-pack", "city-pack"].every((f) => existsSync(join(OUT, `${f}.glb`)));

interface GNode {
  name?: string;
  children?: number[];
  mesh?: number;
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}
interface GJson {
  nodes: GNode[];
  meshes: { primitives: { attributes: { POSITION: number }; indices?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
}

function mat(n: GNode): number[] {
  if (n.matrix) return n.matrix;
  const t = n.translation ?? [0, 0, 0];
  const [x, y, z, w] = (n.rotation ?? [0, 0, 0, 1]) as [number, number, number, number];
  const s = n.scale ?? [1, 1, 1];
  const m = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1];
  for (let i = 0; i < 3; i++) {
    m[i] = m[i]! * s[0]!;
    m[4 + i] = m[4 + i]! * s[1]!;
    m[8 + i] = m[8 + i]! * s[2]!;
  }
  m[12] = t[0]!;
  m[13] = t[1]!;
  m[14] = t[2]!;
  return m;
}
function mul(a: number[], b: number[]): number[] {
  const o = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r]! += a[k * 4 + r]! * b[c * 4 + k]!;
  return o;
}

/** The world-space vertices (metres) and triangles of the node with this name and its children, read from a GLB's JSON and binary chunks. Closes the file. */
function glbMesh(path: string, name: string): { v: Vec3[]; tri: [number, number, number][] } {
  const fd = openSync(path, "r");
  try {
    const head = Buffer.alloc(8);
    readSync(fd, head, 0, 8, 12);
    const jlen = head.readUInt32LE(0);
    const jb = Buffer.alloc(jlen);
    readSync(fd, jb, 0, jlen, 20);
    const json = JSON.parse(jb.toString("utf8")) as GJson;
    const bin = 20 + jlen + 8;
    const nodes = json.nodes;
    const parent = new Array<number>(nodes.length).fill(-1);
    nodes.forEach((n, i) => (n.children ?? []).forEach((c) => (parent[c] = i)));
    const world: (number[] | undefined)[] = [];
    const wm = (i: number): number[] => {
      const have = world[i];
      if (have) return have;
      const m = parent[i]! < 0 ? mat(nodes[i]!) : mul(wm(parent[i]!), mat(nodes[i]!));
      world[i] = m;
      return m;
    };
    const root = nodes.findIndex((n) => n.name === name);
    if (root < 0) throw new Error(`no node named ${name} in ${path}`);
    const out: Vec3[] = [];
    const tri: [number, number, number][] = [];
    const stack = [root];
    while (stack.length) {
      const i = stack.pop()!;
      const n = nodes[i]!;
      for (const c of n.children ?? []) stack.push(c);
      if (n.mesh === undefined) continue;
      const m = wm(i);
      for (const prim of json.meshes[n.mesh]!.primitives) {
        const base = out.length;
        const acc = json.accessors[prim.attributes.POSITION]!;
        const bv = json.bufferViews[acc.bufferView]!;
        const stride = bv.byteStride ?? 12;
        const buf = Buffer.alloc(stride * (acc.count - 1) + 12);
        readSync(fd, buf, 0, buf.length, bin + (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0));
        for (let k = 0; k < acc.count; k++) {
          const x = buf.readFloatLE(k * stride);
          const y = buf.readFloatLE(k * stride + 4);
          const z = buf.readFloatLE(k * stride + 8);
          out.push(V(m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, m[1]! * x + m[5]! * y + m[9]! * z + m[13]!, m[2]! * x + m[6]! * y + m[10]! * z + m[14]!));
        }
        if (prim.indices === undefined) throw new Error(`${name}: no indices`);
        const ia = json.accessors[prim.indices]!;
        const ib = json.bufferViews[ia.bufferView]!;
        const isz = ia.componentType === 5125 ? 4 : 2;
        const ibuf = Buffer.alloc(ia.count * isz);
        readSync(fd, ibuf, 0, ibuf.length, bin + (ib.byteOffset ?? 0) + (ia.byteOffset ?? 0));
        const at = (k: number): number => base + (isz === 4 ? ibuf.readUInt32LE(k * 4) : ibuf.readUInt16LE(k * 2));
        for (let k = 0; k + 2 < ia.count; k += 3) tri.push([at(k), at(k + 1), at(k + 2)]);
      }
    }
    return { v: out, tri };
  } finally {
    closeSync(fd);
  }
}

/** The highest the model's surface is at (x, z): the top of every triangle that covers the point (undefined where none does). */
function topAt(mesh: { v: Vec3[]; tri: [number, number, number][] }, x: number, z: number): number | undefined {
  let best: number | undefined;
  for (const [i, j, k] of mesh.tri) {
    const a = mesh.v[i]!;
    const b = mesh.v[j]!;
    const c = mesh.v[k]!;
    const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
    if (Math.abs(d) < 1e-9) continue;
    const l1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d;
    const l2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d;
    const l3 = 1 - l1 - l2;
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
    const y = l1 * a.y + l2 * b.y + l3 * c.y;
    if (best === undefined || y > best) best = y;
  }
  return best;
}

const glbOf = (key: string): { path: string; name: string } => {
  const [pack, name] = key.split(":") as [string, string];
  return { path: join(OUT, `${pack}.glb`), name };
};

describe("measured tables against the GLBs", () => {
  for (const key of POWER_MIX) {
    it.skipIf(!have)(`${key} re-measures within 0.02 m`, () => {
      const pole = POWER_POLES[key]!;
      const { path, name } = glbOf(key);
      const mesh = glbMesh(path, name);
      const v = mesh.v;
      expect(Math.max(...v.map((p) => p.y))).toBeCloseTo(pole.height_m, 1);
      expect(Math.abs(Math.max(...v.map((p) => p.y)) - pole.height_m)).toBeLessThan(0.02);
      const foot = v.filter((p) => p.y < 0.05);
      const fx = (Math.min(...foot.map((p) => p.x)) + Math.max(...foot.map((p) => p.x))) / 2;
      const fz = (Math.min(...foot.map((p) => p.z)) + Math.max(...foot.map((p) => p.z))) / 2;
      expect(Math.abs(fx - pole.foot_m.x)).toBeLessThan(0.02);
      expect(Math.abs(fz - pole.foot_m.z)).toBeLessThan(0.02);
      for (let i = 0; i < 3; i++) {
        const a = poleAttachModel(pole, i);
        const top = topAt(mesh, a.x, a.z);
        expect(top, `${key} attachment ${i} has surface under it`).toBeDefined();
        expect(Math.abs(top! - pole.attach_m[i]!.surface_m), `${key} attachment ${i}: model top ${top}`).toBeLessThan(0.02);
        if (pole.attach_m[i]!.ownInsulator) expect(Math.abs(top! - pole.attach_m[i]!.up)).toBeLessThan(0.02);
      }
    });
  }

  it.skipIf(!have)("the wire piece re-measures within 0.02 m, its radius within 0.005 m", () => {
    const { path, name } = glbOf(POWER_LINE);
    const v = glbMesh(path, name).v;
    const z0 = Math.min(...v.map((p) => p.z));
    const z1 = Math.max(...v.map((p) => p.z));
    expect(Math.abs(z1 - z0 - line.length_m)).toBeLessThan(0.02);
    const ring = (z: number): { cx: number; cy: number; w: number } => {
      const r = v.filter((p) => Math.abs(p.z - z) < 0.01);
      const xs = r.map((p) => p.x);
      const ys = r.map((p) => p.y);
      return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, w: Math.max(...xs) - Math.min(...xs) };
    };
    const e0 = ring(z0);
    expect(Math.abs(z0 - line.ends_m[0].along)).toBeLessThan(0.02);
    expect(Math.abs(e0.cy - line.ends_m[0].up)).toBeLessThan(0.02);
    expect(Math.abs(e0.cx - line.ends_m[0].across)).toBeLessThan(0.02);
    expect(Math.abs(e0.w / 2 - line.radius_m)).toBeLessThan(0.005);
    const low = Math.min(...[...new Set(v.map((p) => p.z.toFixed(3)))].map((z) => ring(Number(z)).cy));
    expect(Math.abs(e0.cy - low - line.sag * line.length_m)).toBeLessThan(0.02);
    for (const [z, y] of RINGS) expect(Math.abs(ring(z).cy - y)).toBeLessThan(0.02);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
describe("fitLine", () => {
  const L = line.length_m;
  /** The fitted whole's ring points in the world, against the parabola of `sagSpan` at the same fraction of the span. */
  function profileError(a: Vec3, b: Vec3, scale: number): number {
    const len = dist(a, b);
    const out = fitLine(line, a, b, SAG_RATIO, scale);
    expect(out).toHaveLength(1);
    let worst = 0;
    for (const [z, y] of RINGS) {
      const t = (z - line.ends_m[0].along) / L;
      const w = transformPoint(out[0]!.matrix, V(0, y, z));
      const want = a.y + (b.y - a.y) * t - SAG_RATIO * len * 4 * t * (1 - t);
      worst = Math.max(worst, Math.abs(w.y - want));
    }
    return worst;
  }
  function expectFitted(a: Vec3, b: Vec3, scale: number, radius?: number): void {
    const out = fitLine(line, a, b, SAG_RATIO, scale, radius);
    expect(out).toHaveLength(1);
    const m = out[0]!.matrix;
    const [e0, e1] = modelEnds(line);
    expect(dist(transformPoint(m, e0), a)).toBeLessThan(0.01);
    expect(dist(transformPoint(m, e1), b)).toBeLessThan(0.01);
    const mid = sagSpan(a, b)[4]!;
    expect(dist(transformPoint(m, lowModel(line)), mid)).toBeLessThan(line.residual_m + 0.01);
    expect(out[0]!.stretch).toBeCloseTo(dist(a, b) / (L * scale), 6);
  }

  it("level spans of 0.25x, 1x and 1.25x the piece's length", () => {
    for (const k of [LINE_STRETCH_MIN, 1, LINE_STRETCH_MAX]) expectFitted(V(2, 6, -3), V(2 + k * L, 6, -3), 1);
  });

  it("ends 1 m, 2 m, 2.7 m and 3.5 m higher", () => {
    for (const h of [1, 2, 2.7, 3.5]) {
      expectFitted(V(0, 5, 0), V(L, 5 + h, 0), 1);
      expectFitted(V(0, 5 + h, 0), V(0.8 * L, 5, 0), 1);
    }
  });

  it("along each axis and on a diagonal", () => {
    expectFitted(V(0, 6, 0), V(L, 6, 0), 1);
    expectFitted(V(0, 6, 0), V(0, 6, -L), 1);
    expectFitted(V(1, 6, 1), V(1 + 0.7 * L, 6.5, 1 + 0.6 * L), 1);
    expectFitted(V(-3, 7, 2), V(-3 - 0.5 * L, 5, 2 + 0.2 * L), 1);
    // A vertical span has no side to turn to, and is still fitted.
    expectFitted(V(0, 9, 0), V(0, 5, 0), 1);
  });

  it("the whole profile follows sagSpan within the piece's own residual", () => {
    const tol = line.residual_m + 0.01;
    expect(profileError(V(0, 6, 0), V(L, 6, 0), 1)).toBeLessThan(tol);
    expect(profileError(V(0, 6, 0), V(L, 9.5, 0), 1)).toBeLessThan(tol);
    expect(profileError(V(0, 6, 0), V(1.25 * L, 6, 0), 1)).toBeLessThan(tol * 1.25);
    expect(profileError(V(0, 1.6, 0), V(2.15, 1.6, 0.3), LADDER_LINE_SCALE)).toBeLessThan(tol);
  });

  it("the cross-section follows the radius: given (the ladder) or true size times the scale (the city)", () => {
    const widthRadius = (m: readonly number[]): number => Math.hypot(m[0]!, m[1]!, m[2]!) * line.radius_m;
    const a = V(0, 1.6, 0);
    const b = V(2.1, 1.6, 0.9);
    const ladder = fitLine(line, a, b, SAG_RATIO, LADDER_LINE_SCALE, LADDER_STRAND_RADIUS)[0]!;
    expect(Math.abs(ladder.radius - 0.0286)).toBeLessThan(0.0005);
    expect(Math.abs(widthRadius(ladder.matrix) - 0.0286)).toBeLessThan(0.0005);
    const city = fitLine(line, V(0, 6, 0), V(12.5, 6, 0), SAG_RATIO, 0.18)[0]!;
    expect(Math.abs(city.radius - line.radius_m * 0.18)).toBeLessThan(0.0005);
    expect(Math.abs(widthRadius(city.matrix) - line.radius_m * 0.18)).toBeLessThan(0.0005);
    expect(city.radius).toBeLessThan(LADDER_STRAND_RADIUS);
  });

  it("the matrix is right-handed: no mirrored triangles", () => {
    for (const [a, b] of [
      [V(0, 6, 0), V(9, 6, 0)],
      [V(0, 6, 0), V(0, 7, -9)],
      [V(0, 6, 0), V(-6, 8, 5)],
    ] as [Vec3, Vec3][]) {
      const m = fitLine(line, a, b, SAG_RATIO, 1)[0]!.matrix;
      const c0 = [m[0]!, m[1]!, m[2]!];
      const c1 = [m[4]!, m[5]!, m[6]!];
      const c2 = [m[8]!, m[9]!, m[10]!];
      const det = c0[0]! * (c1[1]! * c2[2]! - c1[2]! * c2[1]!) - c0[1]! * (c1[0]! * c2[2]! - c1[2]! * c2[0]!) + c0[2]! * (c1[0]! * c2[1]! - c1[1]! * c2[0]!);
      expect(det).toBeGreaterThan(0);
    }
  });

  it("every ladder span, at LADDER_LINE_SCALE, is one piece stretched 0.29x to 0.88x and never chains", () => {
    let lo = Infinity;
    let hi = 0;
    let spans = 0;
    // The ladder maps only (NN-*.json, as the playtest harness reads them): puzzles/city-two-ways-round.json is an off-ladder city map (pos = metres / 5, not ladder units), so its spans are not the ladder's.
    for (const f of readdirSync("puzzles").filter((n) => /^\d\d-.*\.json$/.test(n))) {
      const puzzle = loadPuzzle(JSON.parse(readFileSync(join("puzzles", f), "utf8")));
      for (const run of wireLayout(puzzle)) {
        for (let i = 0; i + 1 < run.attach.length; i++) {
          const out = fitLine(line, run.attach[i]!, run.attach[i + 1]!, SAG_RATIO, LADDER_LINE_SCALE, LADDER_STRAND_RADIUS);
          expect(out).toHaveLength(1);
          lo = Math.min(lo, out[0]!.stretch);
          hi = Math.max(hi, out[0]!.stretch);
          spans++;
        }
      }
    }
    expect(spans).toBeGreaterThan(1000);
    expect(lo).toBeGreaterThanOrEqual(LINE_STRETCH_MIN);
    expect(lo).toBeGreaterThan(0.28);
    expect(hi).toBeLessThan(0.9);
    expect(LADDER_LINE_SCALE).toBe(0.254);
  });
});

describe("long and short spans", () => {
  const L = line.length_m;
  it("a 40 m span is the fewest pieces that each fit, joined within 0.01 m on one sagSpan parabola", () => {
    const a = V(0, 8, 0);
    const b = V(30, 11, 26.5);
    const len = dist(a, b);
    const out = fitLine(line, a, b, SAG_RATIO, 1);
    const n = Math.ceil(len / (LINE_STRETCH_MAX * L));
    expect(len).toBeGreaterThan(39);
    expect(out).toHaveLength(n);
    expect(out.length).toBeGreaterThan(1);
    for (const p of out) expect(p.stretch).toBeLessThanOrEqual(LINE_STRETCH_MAX + 1e-9);
    // One fewer would not fit.
    expect(len / (n - 1) / L).toBeGreaterThan(LINE_STRETCH_MAX - 0.02);
    expect(dist(out[0]!.from, a)).toBeLessThan(0.01);
    expect(dist(out[n - 1]!.to, b)).toBeLessThan(0.01);
    const [e0, e1] = modelEnds(line);
    for (let i = 0; i < n; i++) {
      expect(dist(transformPoint(out[i]!.matrix, e0), out[i]!.from)).toBeLessThan(0.01);
      expect(dist(transformPoint(out[i]!.matrix, e1), out[i]!.to)).toBeLessThan(0.01);
      if (i + 1 < n) expect(dist(out[i]!.to, out[i + 1]!.from)).toBeLessThan(0.01);
      // Each join, and each piece's lowest point, is on the whole's parabola.
      for (const t of [(i + 1) / n, (i + 0.5) / n]) {
        const want = a.y + (b.y - a.y) * t - SAG_RATIO * len * 4 * t * (1 - t);
        const got = t === (i + 1) / n ? out[i]!.to.y : transformPoint(out[i]!.matrix, lowModel(line)).y;
        expect(Math.abs(got - want)).toBeLessThan(line.residual_m + 0.01);
      }
    }
  });

  it("a span just over 1.25x chains as two, just under is one", () => {
    expect(fitLine(line, V(0, 5, 0), V(LINE_STRETCH_MAX * L * 0.999, 5, 0), SAG_RATIO, 1)).toHaveLength(1);
    expect(fitLine(line, V(0, 5, 0), V(LINE_STRETCH_MAX * L * 1.01, 5, 0), SAG_RATIO, 1)).toHaveLength(2);
  });

  it("a span shorter than 0.25x is still one piece, compressed, with its ends and lowest point right", () => {
    const a = V(0, 6, 0);
    const b = V(0.1 * L, 6.2, 0);
    const out = fitLine(line, a, b, SAG_RATIO, 1);
    expect(out).toHaveLength(1);
    expect(out[0]!.stretch).toBeLessThan(LINE_STRETCH_MIN);
    const [e0, e1] = modelEnds(line);
    expect(dist(transformPoint(out[0]!.matrix, e0), a)).toBeLessThan(0.01);
    expect(dist(transformPoint(out[0]!.matrix, e1), b)).toBeLessThan(0.01);
    expect(dist(transformPoint(out[0]!.matrix, lowModel(line)), sagSpan(a, b)[4]!)).toBeLessThan(line.residual_m + 0.01);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
describe("placePole", () => {
  const spot = V(4.2, 0, -1.7);
  const dirs = [V(1, 0, 0), V(0, 0, 1), V(-1, 0, 0), V(0.6, 0, 0.8), V(-0.3, 0, -0.95), V(2.4, 0, -1.1)];
  /** The tolerance on the outer wires' distance from the run's line, units. The ticket says 0.01; A's own figure for the Apocalypse arm is 0.015. */
  const TOL: Record<string, number> = { "apocalypse-power:SM_Prop_Powerpole_01": 0.015 };
  const tolOf = (k: string): number => TOL[k] ?? 0.01;

  /** For a pole placed on the ladder: the signed offsets of its two outer attachments from the run's line, and the arm's angle to the run. */
  function ladder(pole: PowerPole, dir: Vec3, across = ladderAcross(pole.key)) {
    const scale = poleScaleFor(pole, POLE_HEIGHT);
    const t = placePole(pole, spot, dir, POLE_HEIGHT, scale, across);
    const len = Math.hypot(dir.x, dir.z);
    const dx = dir.x / len;
    const dz = dir.z / len;
    const side = (p: Vec3): number => (p.x - spot.x) * -dz + (p.z - spot.z) * dx;
    const along = (p: Vec3): number => (p.x - spot.x) * dx + (p.z - spot.z) * dz;
    const anchor = poleToWorld(t, poleAttachModel(pole, -1));
    const centre = poleToWorld(t, poleAttachModel(pole, 0));
    const lo = poleToWorld(t, poleAttachModel(pole, 1));
    const hi = poleToWorld(t, poleAttachModel(pole, 2));
    // The arm: the model's arm-axis unit vector, turned and scaled.
    const o = poleToWorld(t, V(0, 0, 0));
    const arm = poleToWorld(t, pole.armAxis === "x" ? V(1, 0, 0) : V(0, 0, 1));
    const ax = arm.x - o.x;
    const az = arm.z - o.z;
    const armAngle = (Math.acos(Math.min(1, Math.abs(ax * dx + az * dz) / Math.hypot(ax, az))) * 180) / Math.PI;
    return { t, anchor, centre, sideLo: side(lo), sideHi: side(hi), along: along(anchor), anchorSide: side(anchor), armAngle, scale };
  }

  for (const key of POWER_MIX) {
    const pole = POWER_POLES[key]!;
    it(`${key}: its wires' line is at the spot and at the height, its arm square to the run`, () => {
      for (const d of dirs) {
        const r = ladder(pole, d);
        expect(Math.abs(r.anchor.x - spot.x)).toBeLessThan(0.01);
        expect(Math.abs(r.anchor.z - spot.z)).toBeLessThan(0.01);
        expect(Math.abs(r.anchor.y - POLE_HEIGHT)).toBeLessThan(0.01);
        expect(Math.abs(r.centre.y - POLE_HEIGHT)).toBeLessThan(0.01);
        // The arm runs across the run: its angle to the run's direction is 90 degrees.
        const arm = r.armAngle;
        expect(Math.abs(90 - arm)).toBeLessThan(0.5);
      }
    });
  }

  it("on the ladder the outer attachments of each pole are at +-PHASE_OFFSET (Palm stretched across by PALM_ACROSS_STRETCH)", () => {
    for (const key of POWER_MIX) {
      const pole = POWER_POLES[key]!;
      for (const d of dirs) {
        const r = ladder(pole, d);
        expect(r.sideLo * r.sideHi, key).toBeLessThan(0);
        expect(Math.abs(Math.abs(r.sideLo) - PHASE_OFFSET), `${key} low outer ${r.sideLo}`).toBeLessThan(tolOf(key));
        expect(Math.abs(Math.abs(r.sideHi) - PHASE_OFFSET), `${key} high outer ${r.sideHi}`).toBeLessThan(tolOf(key));
      }
    }
    expect(ladderAcross("palm-city-pack:SM_Prop_Powerpole_01")).toBe(PALM_ACROSS_STRETCH);
    expect(ladderAcross("palm-city-pack:SM_Prop_Powerpole_02")).toBe(PALM_ACROSS_STRETCH);
    expect(ladderAcross("apocalypse-power:SM_Prop_Powerpole_01")).toBe(1);
    // Without the stretch, Palm's outer wires would miss by the pre-check's 0.06 u.
    const bare = ladder(POWER_POLES["palm-city-pack:SM_Prop_Powerpole_01"]!, dirs[0]!, 1);
    expect(PHASE_OFFSET - Math.abs(bare.sideHi)).toBeGreaterThan(0.05);
  });

  it("Palm _02's crooked arm: its ends differ by 0.06 u in height on the ladder, from the table", () => {
    const pole = POWER_POLES["palm-city-pack:SM_Prop_Powerpole_02"]!;
    const t = placePole(pole, spot, dirs[0]!, POLE_HEIGHT, poleScaleFor(pole, POLE_HEIGHT), PALM_ACROSS_STRETCH);
    const dy = poleToWorld(t, poleAttachModel(pole, 2)).y - poleToWorld(t, poleAttachModel(pole, 1)).y;
    expect(Math.abs(dy - 0.06)).toBeLessThan(0.005);
  });

  it("in the city every pole stands at true size: the scale is the city's, across 1, the attachments at the span's height", () => {
    for (const key of POWER_MIX) {
      const pole = POWER_POLES[key]!;
      const t = placePole(pole, V(3, 0, 3), V(0, 0, 1), 6, 0.18);
      expect(t.scale.y).toBe(0.18);
      expect(Math.abs(poleToWorld(t, poleAttachModel(pole, 0)).y - 6)).toBeLessThan(0.01);
      expect(t.scale.x === 0.18 && t.scale.z === 0.18).toBe(true);
    }
  });

  it("the across factor stretches the arm axis only", () => {
    const apo = placePole(POWER_POLES["apocalypse-power:SM_Prop_Powerpole_01"]!, spot, dirs[0]!, 1.6, 0.27, 2);
    expect(apo.scale).toEqual({ x: 0.27, y: 0.27, z: 0.54 });
    const palm = placePole(POWER_POLES["palm-city-pack:SM_Prop_Powerpole_01"]!, spot, dirs[0]!, 1.6, 0.19, 1.37);
    expect(palm.scale.x).toBeCloseTo(0.19 * 1.37, 9);
    expect(palm.scale.y).toBe(0.19);
    expect(palm.scale.z).toBe(0.19);
  });

  it("anchorAcross is the outer pair's midpoint", () => {
    const palm = POWER_POLES["palm-city-pack:SM_Prop_Powerpole_01"]!;
    expect(anchorAcross(palm)).toBeCloseTo((palm.attach_m[1].across + palm.attach_m[2].across) / 2, 9);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
describe("the mix", () => {
  const share = (ids: string[]): number[] => {
    const c = POWER_MIX.map(() => 0);
    for (const id of ids) c[POWER_MIX.indexOf(poleAt(POWER_MIX, id))]!++;
    return c.map((n) => n / ids.length);
  };
  it("is a pure function of the list and the id", () => {
    for (const id of ["a", "run-3#4", "zz#0", "05-x#11"]) {
      expect(poleAt(POWER_MIX, id)).toBe(poleAt(POWER_MIX, id));
      expect(POWER_MIX).toContain(poleAt(POWER_MIX, id));
    }
    expect(poleAt(POWER_MIX, "run-3#4")).toBe(poleAt([...POWER_MIX], "run-3#4"));
  });
  it("over 1,000 ids each listed pole's share is within 0.05 of an even share", () => {
    const plain = Array.from({ length: 1000 }, (_, i) => `spot-${i}`);
    const runs = Array.from({ length: 1000 }, (_, i) => `run-${Math.floor(i / 5)}#${(i % 5) + 1}`);
    for (const ids of [plain, runs]) for (const s of share(ids)) expect(Math.abs(s - 1 / POWER_MIX.length)).toBeLessThan(0.05);
  });
  it("gives neighbouring spots on a run different poles, over every ladder map", () => {
    let pairs = 0;
    for (const f of readdirSync("puzzles").filter((n) => n.endsWith(".json"))) {
      const puzzle = loadPuzzle(JSON.parse(readFileSync(join("puzzles", f), "utf8")));
      for (const run of wireLayout(puzzle)) {
        for (let i = 1; i + 1 < run.attach.length - 1; i++) {
          expect(poleAt(POWER_MIX, `${run.id}#${i}`), `${f} ${run.id} ${i}`).not.toBe(poleAt(POWER_MIX, `${run.id}#${i + 1}`));
          pairs++;
        }
      }
    }
    expect(pairs).toBeGreaterThan(100);
  });
  it("with two or more poles, neighbours differ for any list length", () => {
    for (const n of [2, 3, 4, 5, 6, 8, 9]) {
      const list = Array.from({ length: n }, (_, i) => `p${i}`);
      for (let r = 0; r < 40; r++) for (let i = 0; i < 9; i++) expect(poleAt(list, `r${r}#${i}`)).not.toBe(poleAt(list, `r${r}#${i + 1}`));
    }
  });
  it("with a one-pole list returns that pole everywhere", () => {
    for (const id of ["a", "b#1", "c#2", "x-9"]) expect(poleAt(["only"], id)).toBe("only");
  });
  it("lineOf gives one piece for a whole line", () => {
    for (const id of ["l1", "l2", "9-x"]) expect(lineOf([POWER_LINE], id)).toBe(POWER_LINE);
    expect(lineOf(["a", "b", "c"], "line-7")).toBe(lineOf(["a", "b", "c"], "line-7"));
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
describe("failing fixtures", () => {
  const a = V(0, 6, 0);
  const b = V(8, 6, 0);
  const expectKit = (fn: () => unknown, code: string): void => {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(PowerKitError);
      expect((e as PowerKitError).name).toBe("PowerKitError");
      expect((e as PowerKitError).code).toBe(code);
      return;
    }
    throw new Error(`expected a PowerKitError ${code}`);
  };

  it("a piece fitted backwards throws", () => {
    const back: PowerLine = { ...line, ends_m: [line.ends_m[1], line.ends_m[0]] };
    expectKit(() => fitLine(back, a, b, SAG_RATIO, 1), "backwards");
  });
  it("a piece whose length does not match its ends throws", () => {
    expectKit(() => fitLine({ ...line, length_m: 9 }, a, b, SAG_RATIO, 1), "length");
  });
  it("a span of length 0 throws", () => {
    expectKit(() => fitLine(line, a, { ...a }, SAG_RATIO, 1), "zero-span");
  });
  it("a pole with no yaw for its arm axis throws", () => {
    const bad = { ...POWER_POLES["apocalypse-power:SM_Prop_Powerpole_01"]!, armAxis: "y" } as unknown as PowerPole;
    expectKit(() => placePole(bad, a, V(1, 0, 0), 1.6, 0.27), "no-yaw");
  });
  it("a run with no direction throws", () => {
    expectKit(() => placePole(POWER_POLES[POWER_MIX[0]!]!, a, V(0, 0, 0), 1.6, 0.27), "zero-run");
  });
  it("an empty pole list throws", () => {
    expectKit(() => poleAt([], "a#1"), "empty-list");
    expectKit(() => lineOf([], "l1"), "empty-list");
  });
  it("a pole whose attachment is off by 0.1 m misses the wire by more than the tolerance", () => {
    const good = POWER_POLES["apocalypse-power:SM_Prop_Powerpole_01"]!;
    const bad: PowerPole = { ...good, attach_m: [good.attach_m[0], good.attach_m[1], { ...good.attach_m[2], across: good.attach_m[2].across + 0.1 }] };
    const outer = (pole: PowerPole): number => {
      const scale = poleScaleFor(pole, POLE_HEIGHT);
      const t = placePole(pole, V(0, 0, 0), V(1, 0, 0), POLE_HEIGHT, scale, 1);
      // The run is along x, so a wire's distance from the line is its |z|.
      return Math.max(...[1, 2].map((i) => Math.abs(Math.abs(poleToWorld(t, poleAttachModel(pole, i)).z) - PHASE_OFFSET)));
    };
    expect(outer(good)).toBeLessThan(0.015);
    expect(outer(bad)).toBeGreaterThan(0.015);
    // And a table whose outer pair is reversed fails its own order.
    expect(good.attach_m[1].across).toBeLessThan(good.attach_m[2].across);
    expect(bad.attach_m[1].across).toBeLessThan(bad.attach_m[2].across);
  });
  it("a key that is not in the tables throws", () => {
    expectKit(() => poleOf("palm-city-pack:SM_Prop_Powerpole_03"), "unknown-key");
    expectKit(() => lineOfKey("city-pack:SM_Prop_Power_Cables_01"), "unknown-key");
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
describe("purity", () => {
  it("powerkit.ts imports only ./layout and stableHash from ../render/city", () => {
    const src = readFileSync(join("src", "render3d", "powerkit.ts"), "utf8");
    const imports = [...src.matchAll(/^import\s+(?:type\s+)?(.*?)\s+from\s+"([^"]+)";/gm)].map((m) => ({ what: m[1]!, from: m[2]! }));
    expect(imports.map((i) => i.from).sort()).toEqual(["../render/city", "./layout"]);
    expect(imports.find((i) => i.from === "../render/city")!.what).toBe("{ stableHash }");
    expect(imports.find((i) => i.from === "./layout")!.what).toBe("{ Vec3 }");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(/\bthree\b|\bTHREE\b|\bdocument\b|\bwindow\b|\brequire\(/.test(code)).toBe(false);
  });
});
