import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Matrix4, Vector3, type BufferGeometry, type InstancedMesh } from "three";
import { loadPuzzle, type Puzzle } from "../core";
import { DASH_GAP, DASH_LEN, DASH_W, KERB_W, PAD_Y, ROAD_H, buildScene, dashLayout } from "./scene";
import { PAVEMENT_Y, YARD_H, KERB_H, ROAD_W } from "./kitunits";
import { townLayout } from "./town";
import { stubTextSurface } from "./text";

const load = (f: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(f, "utf8")));
const shrine = load("puzzles/09-shrine-circuit.json");

describe("the streets are drawn from the town layout", () => {
  const files = ["puzzles/09-shrine-circuit.json", "puzzles/56-whole-ward.json", "puzzles/49-two-cells.json", "puzzles/01-first-light.json"].filter(existsSync);

  it.each(files)("has one instance per road, kerb segment and yard, and one mesh per pad that has an area, on %s", (f) => {
    const pz = load(f);
    const town = townLayout(pz);
    const b = buildScene(pz, { text: stubTextSurface });
    expect(b.streets.roads.count).toBe(town.roads.length);
    expect(b.streets.kerbs.count).toBe(town.kerbs.length);
    expect(b.streets.yards.count).toBe(town.blocks.length);
    expect(b.streets.dashes.count).toBe(dashLayout(town).length);
    expect(b.streets.pads).toHaveLength(town.pads.filter((p) => p.pts.length >= 3).length);
    expect(town.roads.length).toBeGreaterThan(5);
    expect(town.kerbs.length).toBeGreaterThan(10);
    expect(b.scene.children).toContain(b.streets.roads);
    for (const m of b.streets.pads) expect(b.scene.children).toContain(m);
    // The pavements are one mesh: a fan of (points - 2) triangles per band.
    const tris = town.pavements.filter((p) => p.pts.length >= 3).reduce((n, p) => n + p.pts.length - 2, 0);
    expect((b.streets.pavements.geometry as BufferGeometry).index!.count).toBe(tris * 3);
    b.dispose();
  });

  it("lays each road along its centreline at its own width, and each kerb along its own segment", () => {
    const town = townLayout(shrine);
    const b = buildScene(shrine, { text: stubTextSurface });
    const m = new Matrix4();
    const pos = new Vector3();
    const sx = new Vector3();
    const get = (im: InstancedMesh, i: number): { c: Vector3; len: number; h: number; w: number; yaw: number } => {
      im.getMatrixAt(i, m);
      pos.setFromMatrixPosition(m);
      const e = m.elements;
      sx.set(Math.hypot(e[0]!, e[1]!, e[2]!), Math.hypot(e[4]!, e[5]!, e[6]!), Math.hypot(e[8]!, e[9]!, e[10]!));
      return { c: pos.clone(), len: sx.x, h: sx.y, w: sx.z, yaw: Math.atan2(e[8]! / sx.z, e[10]! / sx.z) };
    };
    town.roads.forEach((r, i) => {
      const g = get(b.streets.roads, i);
      expect(g.c.x).toBeCloseTo((r.ax + r.bx) / 2, 4);
      expect(g.c.z).toBeCloseTo((r.az + r.bz) / 2, 4);
      expect(g.len).toBeCloseTo(Math.hypot(r.bx - r.ax, r.bz - r.az), 4);
      expect(g.w).toBeCloseTo(r.w, 4);
      expect(g.h).toBeCloseTo(ROAD_H, 5);
      // The box's x axis points from a to b.
      const ux = Math.cos(g.yaw);
      const uz = -Math.sin(g.yaw);
      expect(ux * (r.bx - r.ax) + uz * (r.bz - r.az)).toBeCloseTo(Math.hypot(r.bx - r.ax, r.bz - r.az), 3);
    });
    town.kerbs.forEach((k, i) => {
      const g = get(b.streets.kerbs, i);
      expect(g.c.x).toBeCloseTo((k.ax + k.bx) / 2, 4);
      expect(g.c.z).toBeCloseTo((k.az + k.bz) / 2, 4);
      expect(g.len).toBeCloseTo(Math.hypot(k.bx - k.ax, k.bz - k.az), 4);
      expect(g.h).toBeCloseTo(KERB_H, 5);
      expect(g.w).toBeCloseTo(KERB_W, 5);
    });
    b.dispose();
  });

  it("stacks the ground layers: yard under pavement under road under pad under centre lines, and a kerb tops the road", () => {
    expect(YARD_H).toBeLessThan(PAVEMENT_Y);
    expect(PAVEMENT_Y).toBeLessThan(ROAD_H);
    expect(ROAD_H).toBeLessThan(PAD_Y);
    expect(KERB_H).toBeGreaterThan(ROAD_H);
    expect(PAD_Y).toBeLessThan(0.02);
    expect(KERB_W).toBeLessThan(0.1);
  });

  it("faces every pavement and pad triangle up", () => {
    const b = buildScene(shrine, { text: stubTextSurface });
    const up = (g: BufferGeometry): void => {
      const p = g.getAttribute("position");
      const idx = g.index!;
      expect(idx.count).toBeGreaterThan(0);
      const a = new Vector3();
      const c = new Vector3();
      const d = new Vector3();
      for (let i = 0; i < idx.count; i += 3) {
        a.fromBufferAttribute(p, idx.getX(i));
        c.fromBufferAttribute(p, idx.getX(i + 1));
        d.fromBufferAttribute(p, idx.getX(i + 2));
        const n = c.sub(a).cross(d.sub(a));
        expect(n.y).toBeGreaterThanOrEqual(0);
      }
    };
    up(b.streets.pavements.geometry);
    for (const m of b.streets.pads) up(m.geometry);
    b.dispose();
  });

  it("draws the yards over the outer blocks' open ground, inside their pavements", () => {
    const town = townLayout(shrine);
    expect(town.blocks.length).toBeGreaterThan(5);
    const b = buildScene(shrine, { text: stubTextSurface });
    const m = new Matrix4();
    town.blocks.forEach((blk, i) => {
      b.streets.yards.getMatrixAt(i, m);
      const e = m.elements;
      expect(e[12]).toBeCloseTo((blk.minX + blk.maxX) / 2, 4);
      expect(e[14]).toBeCloseTo((blk.minZ + blk.maxZ) / 2, 4);
      expect(e[0]).toBeCloseTo(blk.maxX - blk.minX, 4);
      expect(e[10]).toBeCloseTo(blk.maxZ - blk.minZ, 4);
    });
    b.dispose();
  });

  it("draws no 2D lanes: the scene's source imports nothing from the 2D city but the hash and its plain data", () => {
    const src = readFileSync("src/render3d/scene.ts", "utf8");
    const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((x) => x[1]!);
    expect(imports).not.toContain("../render/city");
    expect(src).not.toMatch(/circuitStreets|feedLanes|footprintLayout|cityForMap|blockLayout/);
  });
});

describe("centre lines", () => {
  const files = readdirSync("puzzles").filter((f) => f.endsWith(".json")).map((f) => join("puzzles", f));

  it("dashes only the ring and grid roads, DASH_LEN long, spaced DASH_GAP, inside the road's ends", () => {
    const town = townLayout(shrine);
    const dashes = dashLayout(town);
    expect(dashes.length).toBeGreaterThan(20);
    for (const d of dashes) {
      const near = town.roads.filter((r) => (r.kind === "ring" || r.kind === "grid") && r.w > 1).some((r) => {
        const len = Math.hypot(r.bx - r.ax, r.bz - r.az);
        const ux = (r.bx - r.ax) / len;
        const uz = (r.bz - r.az) / len;
        const t = (d.x - r.ax) * ux + (d.z - r.az) * uz;
        const off = Math.abs(-(d.x - r.ax) * uz + (d.z - r.az) * ux);
        return off < 1e-6 && t > 0 && t < len;
      });
      expect(near).toBe(true);
    }
    expect(DASH_LEN).toBeGreaterThan(DASH_W);
    expect(DASH_GAP).toBeGreaterThan(0);
    expect(ROAD_W).toBeGreaterThan(1);
  });

  it("leaves a dash out where another road or a pad lies under it, so none sits on a crossing", () => {
    const town = townLayout(shrine);
    const dashes = dashLayout(town);
    expect(dashes.length).toBeGreaterThan(0);
    for (const d of dashes) {
      for (const r of town.roads) {
        if (r.kind === "ring" || r.kind === "grid") continue;
        // A circuit street's own box does not contain the dash's middle.
        const len = Math.hypot(r.bx - r.ax, r.bz - r.az);
        const ux = (r.bx - r.ax) / len;
        const uz = (r.bz - r.az) / len;
        const t = (d.x - r.ax) * ux + (d.z - r.az) * uz;
        const off = Math.abs(-(d.x - r.ax) * uz + (d.z - r.az) * ux);
        expect(t > 0 && t < len && off < r.w / 2, `dash at ${d.x},${d.z} on ${r.id}`).toBe(false);
      }
    }
  });

  // The 30 s timeout only catches a runaway loop, not speed.
  it("is pure and deterministic on every map", () => {
    for (const f of files) {
      const town = townLayout(load(f));
      const a = dashLayout(town);
      expect(dashLayout(town), f).toEqual(a);
    }
  }, 30_000);
});
