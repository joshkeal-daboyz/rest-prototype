import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PerspectiveCamera, Scene, Vector3, type Camera } from "three";
import { loadPuzzle, type Puzzle } from "../core";
import { createCameraRig } from "./camera";
import type { MapRenderer3d } from "./renderer";
import { STREET_CAM_FOV_MAX_DEG, createStreetView, streetCamRequested, streetMode, streetPose, streetRows } from "./streetcam";
import { STREET_CAM_BACK_M, STREET_CAM_EYE_M, STREET_CAM_FOV_DEG, STREET_CAM_LOOK_M, WORLD_PER_METRE } from "./kitunits";
import { townLayout, type Town } from "./town";

const load = (id: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(`puzzles/${id}.json`, "utf8")));
const MAPS = ["09-shrine-circuit", "64-the-whole-chain"];
const towns: Record<string, { puzzle: Puzzle; town: Town }> = {};
const townOf = (id: string): { puzzle: Puzzle; town: Town } => (towns[id] ??= (() => {
  const puzzle = load(id);
  return { puzzle, town: townLayout(puzzle) };
})());

describe("streetCamRequested", () => {
  it("parses cam=street, run, at (clamped to 0..1) and light=day", () => {
    expect(streetCamRequested("?puzzle=09&view=3d&cam=street&run=3&at=0.25&light=day")).toEqual({ run: 3, at: 0.25, day: true });
    expect(streetCamRequested("?cam=street&at=7")).toEqual({ run: 0, at: 1, day: false });
    expect(streetCamRequested("?cam=street&at=-2")).toEqual({ run: 0, at: 0, day: false });
    expect(streetCamRequested("?cam=street&run=-1")).toEqual({ run: -1, at: 0.5, day: false });
  });

  it("is null unless cam=street, and takes the default for anything it cannot read", () => {
    expect(streetCamRequested("")).toBeNull();
    expect(streetCamRequested("?view=3d")).toBeNull();
    expect(streetCamRequested("?cam=")).toBeNull();
    expect(streetCamRequested("?cam=Street")).toBeNull();
    expect(streetCamRequested("?cam=street&run=two&at=far&light=night")).toEqual({ run: 0, at: 0.5, day: false });
    expect(streetCamRequested("?cam=street&run=1.5&at=")).toEqual({ run: 0, at: 0.5, day: false });
  });
});

describe("constants", () => {
  it("are the ticket's numbers", () => {
    expect([STREET_CAM_BACK_M, STREET_CAM_EYE_M, STREET_CAM_LOOK_M, STREET_CAM_FOV_DEG]).toEqual([26, 9, 6, 50]);
  });
});

describe("streetRows", () => {
  it("covers every lot once, longest row first, ties by id, each row on one front line", () => {
    for (const id of MAPS) {
      const { town } = townOf(id);
      const rows = streetRows(town);
      expect(rows.length, id).toBeGreaterThan(3);
      expect(rows.flatMap((r) => [...r.lots]).sort((a, b) => a - b), id).toEqual(town.lots.map((_, i) => i));
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1]!;
        const b = rows[i]!;
        expect(a.len > b.len || (a.len === b.len && a.id < b.id), `${id}: ${a.id} before ${b.id}`).toBe(true);
      }
      expect(new Set(rows.map((r) => r.id)).size, id).toBe(rows.length);
      for (const r of rows) {
        const first = town.lots[r.lots[0]!]!;
        for (const i of r.lots) {
          const l = town.lots[i]!;
          expect(l.street).toBe(first.street);
          expect(l.side).toBe(first.side);
          // The lot's front point lies on the row's front line.
          const fx = l.x + Math.sin(l.yaw) * (l.d / 2);
          const fz = l.z + Math.cos(l.yaw) * (l.d / 2);
          expect(Math.abs((fx - r.sx) * r.nx + (fz - r.sz) * r.nz), `${id} ${r.id}`).toBeLessThan(0.06);
          const t = (fx - r.sx) * r.ux + (fz - r.sz) * r.uz;
          expect(t, `${id} ${r.id}`).toBeGreaterThan(-1e-6);
          expect(t, `${id} ${r.id}`).toBeLessThan(r.len + 1e-6);
        }
      }
    }
  });

  it("is the same list every time", () => {
    const { town } = townOf("09-shrine-circuit");
    expect(streetRows(town)).toBe(streetRows(town));
  });
});

// ---- independent geometry for the pose tests ----

type P = { x: number; z: number };
/** Ray casting; any winding. */
const inPoly = (pts: readonly P[], x: number, z: number): boolean => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!;
    const b = pts[j]!;
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) c = !c;
  }
  return c;
};
/** In a box's own frame: local x along (cos yaw, -sin yaw), local z along (sin yaw, cos yaw). */
const inBox = (b: { x: number; z: number; w: number; d: number; yaw: number }, x: number, z: number): boolean => {
  const lx = (x - b.x) * Math.cos(b.yaw) - (z - b.z) * Math.sin(b.yaw);
  const lz = (x - b.x) * Math.sin(b.yaw) + (z - b.z) * Math.cos(b.yaw);
  return Math.abs(lx) <= b.w / 2 && Math.abs(lz) <= b.d / 2;
};

/**
 * The rows of four or more lots, all within the ordinary caps (a 28 m tower cannot be framed from the road; the middle of a three-lot row has only two lots ahead of the eye).
 * A terrace run (051 B) has lots of two to four bays, so its middle looks along only the lots past it: it counts only with three lots on each side of its middle.
 */
const framable = (town: Town) =>
  streetRows(town)
    .map((r, run) => ({ r, run }))
    .filter(({ r }) => {
      if (r.lots.length < 4 || !r.lots.every((i) => town.lots[i]!.hMax <= 16 * WORLD_PER_METRE + 1e-9)) return false;
      if (!town.lots[r.lots[0]!]!.terrace) return true;
      const ahead = r.lots.filter((i) => (town.lots[i]!.x - r.sx) * r.ux + (town.lots[i]!.z - r.sz) * r.uz >= r.len / 2).length;
      return ahead >= 3 && r.lots.length - ahead >= 3;
    });

function framedBy(town: Town, rowLots: readonly number[], eye: readonly number[], look: readonly number[], fov: number, aspect: number): number {
  const cam = new PerspectiveCamera(fov, aspect, 0.05, 400);
  cam.position.set(eye[0]!, eye[1]!, eye[2]!);
  cam.lookAt(look[0]!, look[1]!, look[2]!);
  cam.updateMatrixWorld(true);
  const v = new Vector3();
  let n = 0;
  for (const i of rowLots) {
    const l = town.lots[i]!;
    let ok = true;
    for (const s of [-1, 1]) {
      for (const y of [0, l.hMax]) {
        v.set(l.x + Math.sin(l.yaw) * (l.d / 2) + Math.cos(l.yaw) * s * (l.w / 2), y, l.z + Math.cos(l.yaw) * (l.d / 2) - Math.sin(l.yaw) * s * (l.w / 2));
        const depth = -v.clone().applyMatrix4(cam.matrixWorldInverse).z;
        v.project(cam);
        if (depth <= 0 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) ok = false;
      }
    }
    if (ok) n++;
  }
  return n;
}

describe("streetPose", () => {
  for (const id of MAPS) {
    describe(id, () => {
      const { town } = townOf(id);
      const rows = streetRows(town);

      it("stands the eye above ground, outside every lot and place, over a road or pavement", () => {
        for (let run = 0; run < Math.min(rows.length, 12); run++) {
          for (const at of [0, 0.5, 1]) {
            const p = streetPose(town, { run, at })!;
            const [x, y, z] = p.eye;
            const tag = `${id} run ${run} at ${at}`;
            expect(y, tag).toBeGreaterThan(0);
            expect(y, tag).toBeCloseTo(STREET_CAM_EYE_M * WORLD_PER_METRE, 6);
            for (const l of town.lots) expect(inBox(l, x, z), `${tag}: inside lot ${l.key}`).toBe(false);
            for (const pl of town.places) for (const b of pl.boxes) expect(inBox(b, x, z), `${tag}: inside place of ${pl.lamp}`).toBe(false);
            const over = [...town.roads.map((r) => r.corners), ...town.pavements.map((q) => q.pts), ...town.pads.map((q) => q.pts)].some((poly) => poly.length >= 3 && inPoly(poly, x, z));
            expect(over, `${tag}: over a road or pavement`).toBe(true);
          }
        }
      });

      it("looks at the row's front line, `at` of the way along it", () => {
        for (let run = 0; run < Math.min(rows.length, 12); run++) {
          const r = rows[run]!;
          for (const at of [0, 0.3, 0.5, 1]) {
            const p = streetPose(town, { run, at })!;
            const dx = p.look[0] - r.sx;
            const dz = p.look[2] - r.sz;
            const tag = `${id} run ${run} at ${at}`;
            expect(Math.abs(dx * r.nx + dz * r.nz), tag).toBeLessThan(1e-9);
            expect(dx * r.ux + dz * r.uz, tag).toBeCloseTo(r.len * at, 9);
            expect(p.look[1], tag).toBeGreaterThanOrEqual(STREET_CAM_LOOK_M * WORLD_PER_METRE - 1e-9);
            expect(p.row).toBe(r.id);
          }
        }
      });

      it("frames at least three whole lots (both front corners, ground and cap) of every row of four or more lots with no tower", () => {
        const list = framable(town);
        expect(list.length, id).toBeGreaterThan(2);
        for (const { r, run } of list) {
          for (const at of [0, 0.5, 1]) {
            const p = streetPose(town, { run, at, aspect: 16 / 9 })!;
            expect(p.fov, `${id} ${r.id} at ${at}`).toBeGreaterThanOrEqual(STREET_CAM_FOV_DEG);
            expect(p.fov, `${id} ${r.id} at ${at}`).toBeLessThanOrEqual(STREET_CAM_FOV_MAX_DEG);
            expect(framedBy(town, r.lots, p.eye, p.look, p.fov, 16 / 9), `${id} ${r.id} at ${at}`).toBeGreaterThanOrEqual(3);
          }
        }
      });

      it("gives the same pose for the same inputs, and wraps the run index", () => {
        const a = streetPose(town, { run: 2, at: 0.4 });
        expect(streetPose(town, { run: 2, at: 0.4 })).toEqual(a);
        expect(streetPose(town, { run: 2 + rows.length, at: 0.4 })).toEqual(a);
        expect(streetPose(town, { run: 2 - rows.length, at: 0.4 })).toEqual(a);
        expect(streetPose(town, {})).toEqual(streetPose(town, { run: 0, at: 0.5 }));
        expect(a!.of).toBe(rows.length);
        expect(a!.blocks).toBe(rows[2]!.lots.length);
      });

      it("mirrors the view past the middle of the row, so the row always lies ahead of the eye", () => {
        const r = rows[0]!;
        const early = streetPose(town, { run: 0, at: 0.1 })!;
        const late = streetPose(town, { run: 0, at: 0.9 })!;
        const along = (p: { eye: number[]; look: number[] }): number => (p.eye[0]! - p.look[0]!) * r.ux + (p.eye[2]! - p.look[2]!) * r.uz;
        expect(along(early)).toBeLessThan(0);
        expect(along(late)).toBeGreaterThan(0);
      });
    });
  }

  it("is null for a town with no rows", () => {
    expect(streetPose({ ...townOf("09-shrine-circuit").town, lots: [], terraces: [] } as Town, {})).toBeNull();
  });
});

// ---- the view ----

const fakeGl = (): { calls: Camera[]; render(scene: Scene, camera: Camera): void } => {
  const calls: Camera[] = [];
  return { calls, render: (_s, c) => void calls.push(c) };
};

describe("createStreetView", () => {
  const { town } = townOf("09-shrine-circuit");

  it("renders through its own camera and logs one line, after the models are marked ready and a frame is drawn", () => {
    const lines: string[] = [];
    const scene = new Scene();
    const view = createStreetView(town, { run: 1, at: 0.5, day: false }, scene, 1280, 720, (l) => lines.push(l))!;
    const gl = fakeGl();
    view.draw(gl, scene);
    view.draw(gl, scene);
    expect(lines).toEqual([]);
    view.markReady();
    expect(lines).toEqual([]);
    view.draw(gl, scene);
    view.draw(gl, scene);
    const rows = streetRows(town);
    expect(lines).toEqual([`street camera: run 1 of ${rows.length}, ${rows[1]!.id}, ${rows[1]!.lots.length} blocks`]);
    expect(gl.calls.every((c) => c === view.camera)).toBe(true);
    expect(gl.calls).toHaveLength(4);
  });

  it("puts the camera at the pose, and reframes for a new aspect on resize", () => {
    const scene = new Scene();
    const view = createStreetView(town, { run: 0, at: 0.5, day: false }, scene, 1280, 720, () => {})!;
    expect(view.camera.position.toArray()).toEqual(view.pose.eye);
    expect(view.camera.aspect).toBeCloseTo(16 / 9, 9);
    expect(view.camera.fov).toBe(view.pose.fov);
    view.resize(600, 900);
    expect(view.camera.aspect).toBeCloseTo(600 / 900, 9);
    expect(view.camera.position.toArray()).toEqual(view.pose.eye);
    expect(view.camera.fov).toBe(view.pose.fov);
  });

  it("adds no light of its own, with light=day or without (the light rig owns every global light: ticket 060)", () => {
    for (const dayFlag of [false, true]) {
      const scene = new Scene();
      const view = createStreetView(town, { run: 0, at: 0.5, day: dayFlag }, scene, 800, 600, () => {})!;
      expect(scene.children).toHaveLength(0);
      view.dispose();
      expect(scene.children).toHaveLength(0);
    }
  });

  it("is null for a town with no rows", () => {
    expect(createStreetView({ ...town, lots: [], terraces: [] } as Town, { run: 0, at: 0.5, day: false }, new Scene(), 800, 600)).toBeNull();
  });
});

describe("streetMode", () => {
  const { puzzle, town } = townOf("09-shrine-circuit");

  function setup() {
    const rig = createCameraRig(puzzle, 1280, 720);
    const scene = new Scene();
    const view = createStreetView(town, { run: 0, at: 0.5, day: false }, scene, 1280, 720, () => {})!;
    let disposed = 0;
    const base = {
      draw: () => {
        throw new Error("the play draw must not run");
      },
      hitTest: () => "node:A",
      resize() {},
      setInsets() {},
      notify() {},
      setBlockers() {},
      placeAt: () => null,
      getPan: () => rig.getPan(),
      setPan: (x: number, y: number) => rig.setPan(x, y),
      resetView: () => rig.resetView(),
      getScale: () => rig.getScale(),
      zoomStep: (d: 1 | -1) => rig.zoomStep(d),
      fitWhole: () => rig.fitWhole(),
      centreOn: () => rig.getPan(),
      dispose: () => void disposed++,
    } as unknown as MapRenderer3d;
    const gl = fakeGl();
    const mode = streetMode(base, view, () => view.draw(gl, scene));
    return { rig, mode, gl, view, disposedCount: () => disposed };
  }

  it("picks nothing: hitTest is null at every point", () => {
    const { mode } = setup();
    for (const x of [0, 1, 320, 640, 1279]) for (const y of [0, 5, 360, 719]) expect(mode.hitTest(x, y)).toBeNull();
  });

  it("leaves the play rig exactly where it is under draw, pan, zoom, fit and centring", () => {
    const { rig, mode, gl, view } = setup();
    const before = rig.camera.matrixWorld.toArray();
    const pan = rig.getPan();
    const scale = rig.getScale();
    mode.draw({} as never, {} as never, 1);
    mode.setPan(500, -300);
    mode.zoomStep(1);
    mode.zoomStep(-1);
    mode.resetView();
    mode.fitWhole();
    mode.centreOn("A");
    expect(rig.camera.matrixWorld.toArray()).toEqual(before);
    expect(rig.getPan()).toEqual(pan);
    expect(rig.getScale()).toBe(scale);
    expect(gl.calls).toEqual([view.camera]);
    expect(gl.calls[0]).not.toBe(rig.camera);
  });

  it("disposes the view and the base", () => {
    const { mode, disposedCount } = setup();
    mode.dispose();
    expect(disposedCount()).toBe(1);
  });
});

describe("dev only, and off by default", () => {
  const renderer = readFileSync("src/render3d/renderer.ts", "utf8");

  it("renderer.ts reads the flag only in a dev build and takes the street branch only behind import.meta.env.DEV", () => {
    expect(renderer).toMatch(/import\.meta\.env\.DEV && typeof location !== "undefined" \? streetCamRequested\(location\.search\)/);
    expect(renderer).toMatch(/if \(import\.meta\.env\.DEV && streetOpts\) street = createStreetView\(/);
    expect(renderer).toMatch(/if \(import\.meta\.env\.DEV && street\) \{\s+const view = street;\s+return streetMode\(/);
    // Every other use of the street view is behind the same flag.
    for (const line of renderer.split(/\r?\n/)) {
      if (/\bstreet\??\.\w+|streetMode\(|createStreetView\(/.test(line) && !/^import /.test(line.trim()) && !/^\/\//.test(line.trim())) {
        expect(/import\.meta\.env\.DEV/.test(line) || /^\s+(street\.resize|fov = street\.pose\.fov;|return streetMode\(|const view = street;)/.test(line), line).toBe(true);
      }
    }
    // After the gallery's early return and before the town's scene is built.
    expect(renderer.indexOf("streetCamRequested(location.search)")).toBeGreaterThan(renderer.indexOf("createGalleryRenderer3d("));
  });

  it("only renderer.ts imports it, and neither the scene, the town nor the picker names it", () => {
    for (const f of ["scene.ts", "town.ts", "models.ts", "models3d.ts", "pick.ts", "layout.ts", "camera.ts"]) {
      expect(/from "\.\/streetcam"/.test(readFileSync(`src/render3d/${f}`, "utf8")), f).toBe(false);
    }
  });

  it("the module reads no address and imports nothing outside core-free three, the town and the renderer type", () => {
    const src = readFileSync("src/render3d/streetcam.ts", "utf8");
    expect(/location\./.test(src)).toBe(false);
    const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
    for (const i of imports) expect(["three", "./renderer", "./town"], i).toContain(i);
  });
});
